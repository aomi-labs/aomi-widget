import {
  accountResponseFromSession,
  json,
  requireAomiSession,
} from "@portal/lib/aomi-account/session";
import {
  createWalletLinkNonce,
  upsertVerifiedWallet,
  verifyWalletLinkNonce,
  verifyWalletLinkSignature,
} from "@aomi-labs/auth/account";
import type { WalletFamily } from "@aomi-labs/auth";
import { readAccountAuthEnv } from "@aomi-labs/auth/better-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const current = await requireAomiSession(req);
  if (!current) return json(401, { error: "unauthenticated" });
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
      userId: current.user.id,
      address,
      chainId,
      domain: env.siweDomain,
      secret: env.betterAuthSecret,
    }),
    domain: env.siweDomain,
    uri: env.betterAuthUrl,
  });
}

export async function POST(req: Request): Promise<Response> {
  const current = await requireAomiSession(req);
  if (!current) return json(401, { error: "unauthenticated" });
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
      userId: current.user.id,
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
    return json(401, { error: "invalid_wallet_signature" });
  }

  const resolution = await upsertVerifiedWallet({
    userId: current.user.id,
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
    status: resolution.status === "noop" ? "linked" : resolution.status,
    account: await accountResponseFromSession(req),
  });
}
