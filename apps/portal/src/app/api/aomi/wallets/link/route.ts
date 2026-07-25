import { json } from "@portal/lib/aomi-account/session";
import {
  createWalletLinkNonce,
  upsertVerifiedWallet,
  verifyWalletLinkNonce,
  verifyWalletLinkSignature,
  walletLinkMessageMatches,
} from "@aomi-labs/account/account";
import type { WalletFamily } from "@aomi-labs/account";
import { readAccountAuthEnv } from "@aomi-labs/account/better-auth";
import { recoverMessageAddress } from "viem";
import {
  accountResponseForPrincipal,
  requirePortalPrincipal,
} from "@portal/lib/widget-auth/principal";
import { widgetPreflight, widgetRoute } from "@portal/lib/widget-auth/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = widgetRoute(async (req: Request) => {
  const current = await requirePortalPrincipal(req);
  const url = new URL(req.url);
  const address = url.searchParams.get("address");
  const rawChainId = url.searchParams.get("chainId");
  const chainId = Number(rawChainId);
  if (!address || !rawChainId || !Number.isInteger(chainId) || chainId <= 0) {
    return json(400, { error: "address_and_chain_id_required" });
  }
  const env = readAccountAuthEnv();
  return Response.json({
    nonce: createWalletLinkNonce({
      userId: current.userId,
      address,
      chainId,
      domain: env.siweDomain,
      secret: env.betterAuthSecret,
    }),
    domain: env.siweDomain,
    uri: env.betterAuthUrl,
  });
}, "wallet link nonce");

export const POST = widgetRoute(async (req: Request) => {
  const current = await requirePortalPrincipal(req);
  const body = (await req.json().catch(() => null)) as {
    family?: WalletFamily;
    address?: string;
    chainId?: number;
    nonce?: string;
    message?: string;
    signature?: string;
    label?: string | null;
  } | null;
  if (!body?.family || !body.address) {
    return json(400, { error: "family_and_address_required" });
  }
  if (body.family !== "evm") {
    return json(400, { error: "unsupported_wallet_family" });
  }
  if (!body.message || !body.signature || !body.chainId) {
    return json(400, { error: "wallet_signature_required" });
  }
  const env = readAccountAuthEnv();
  if (
    !body.nonce ||
    !verifyWalletLinkNonce({
      nonce: body.nonce,
      userId: current.userId,
      address: body.address,
      chainId: body.chainId,
      domain: env.siweDomain,
      secret: env.betterAuthSecret,
    })
  ) {
    return json(401, { error: "invalid_wallet_link_nonce" });
  }
  const signatureOk = await verifyWalletLinkSignature({
    address: body.address,
    message: body.message,
    signature: body.signature,
    chainId: body.chainId,
    nonce: body.nonce,
    domain: env.siweDomain,
  });
  if (!signatureOk) {
    const recoveredAddress = await recoverWalletLinkSigner({
      message: body.message,
      signature: body.signature,
    });
    console.warn("[aomi][wallet-link] invalid wallet signature", {
      expectedAddress: shortAddress(body.address),
      recoveredAddress: recoveredAddress
        ? shortAddress(recoveredAddress)
        : null,
      chainId: body.chainId,
      messageMatches: walletLinkMessageMatches({
        message: body.message,
        address: body.address,
        chainId: body.chainId,
        nonce: body.nonce,
        domain: env.siweDomain,
      }),
      messageShape: describeWalletLinkMessage({
        message: body.message,
        address: body.address,
        chainId: body.chainId,
        nonce: body.nonce,
        domain: env.siweDomain,
      }),
    });
    return json(401, { error: "invalid_wallet_signature" });
  }

  const resolution = await upsertVerifiedWallet({
    userId: current.userId,
    family: body.family,
    address: body.address,
    chainId: body.chainId,
    chainScope: null,
    kind: "external",
    provider: "siwe",
    linkedVia: body.family === "evm" ? "siwe" : "siws",
    label: body.label ?? null,
  });
  if (resolution.status === "conflict") {
    return json(409, {
      ...resolution,
      error: "already_linked_to_another_account",
    });
  }
  return Response.json({
    status: resolution.status,
    account: await accountResponseForPrincipal(req, current),
  });
}, "wallet link");

export const OPTIONS = widgetPreflight(["GET", "POST", "OPTIONS"]);

async function recoverWalletLinkSigner(input: {
  message: string;
  signature: string;
}): Promise<string | null> {
  try {
    return await recoverMessageAddress({
      message: input.message,
      signature: input.signature as `0x${string}`,
    });
  } catch {
    return null;
  }
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function describeWalletLinkMessage(input: {
  message: string;
  address: string;
  chainId: number;
  nonce: string;
  domain: string;
}) {
  const lines = input.message.split(/\r?\n/);
  const domainPrefix = `${input.domain} wants to link this wallet`;
  return {
    lineCount: lines.length,
    firstLinePrefix: lines[0]?.slice(0, 80) ?? null,
    expectedDomainPrefix: domainPrefix,
    firstLineMatchesDomain: lines[0]?.startsWith(domainPrefix) ?? false,
    addressLine: lines[1] ? shortAddress(lines[1]) : null,
    addressMatches: lines[1]?.toLowerCase() === input.address.toLowerCase(),
    chainLine: lines.find((line) => line.startsWith("Chain ID: ")) ?? null,
    chainMatches: lines.includes(`Chain ID: ${input.chainId}`),
    nonceLinePresent: lines.some((line) => line.startsWith("Nonce: ")),
    nonceMatches: lines.includes(`Nonce: ${input.nonce}`),
  };
}
