import {
  accountResponseFromSession,
  json,
  requireAomiSession,
} from "@portal/lib/aomi-account/session";
import { upsertVerifiedWallet } from "@aomi-labs/auth/service/account-service";
import type { WalletFamily } from "@aomi-labs/auth";
import { readAccountAuthEnv } from "@aomi-labs/auth/better-auth/env";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { verifyMessage } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LINK_NONCE_MAX_AGE_MS = 5 * 60 * 1000;

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
  return Response.json({
    nonce: createLinkNonce({
      userId: current.user.id,
      address,
      chainId,
    }),
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
    confirm?: boolean;
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
  if (
    !body.nonce ||
    !verifyLinkNonce({
      nonce: body.nonce,
      userId: current.user.id,
      address: body.address,
      chainId: body.chainId,
    })
  ) {
    return json(401, { error: "invalid_wallet_link_nonce" });
  }
  const env = readAccountAuthEnv();
  const messageOk =
    body.message.includes(env.siweDomain) &&
    body.message.toLowerCase().includes(body.address.toLowerCase()) &&
    body.message.includes(`Chain ID: ${body.chainId}`) &&
    body.message.includes(`Nonce: ${body.nonce}`);
  const signatureOk = messageOk
    ? await verifyMessage({
        address: body.address as `0x${string}`,
        message: body.message,
        signature: body.signature as `0x${string}`,
      }).catch(() => false)
    : false;
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
    confirmed: body.confirm,
  });
  if (resolution.status === "needs_confirmation") {
    return Response.json(resolution);
  }
  return Response.json({
    status: resolution.status === "noop" ? "linked" : resolution.status,
    account: await accountResponseFromSession(req),
  });
}

function createLinkNonce(input: {
  userId: string;
  address: string;
  chainId: number;
}): string {
  const payload = {
    userId: input.userId,
    address: input.address.toLowerCase(),
    chainId: input.chainId,
    domain: readAccountAuthEnv().siweDomain,
    issuedAt: Date.now(),
    random: randomBytes(16).toString("base64url"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signLinkNoncePayload(encoded)}`;
}

function verifyLinkNonce(input: {
  nonce: string;
  userId: string;
  address: string;
  chainId: number;
}): boolean {
  const [encoded, signature] = input.nonce.split(".");
  if (!encoded || !signature) return false;
  const expected = signLinkNoncePayload(encoded);
  if (!timingSafeEqualString(signature, expected)) return false;
  const payload = parseLinkNoncePayload(encoded);
  if (!payload) return false;
  const ageMs = Date.now() - payload.issuedAt;
  return (
    payload.userId === input.userId &&
    payload.address === input.address.toLowerCase() &&
    payload.chainId === input.chainId &&
    payload.domain === readAccountAuthEnv().siweDomain &&
    ageMs >= 0 &&
    ageMs <= LINK_NONCE_MAX_AGE_MS
  );
}

function signLinkNoncePayload(encodedPayload: string): string {
  return createHmac("sha256", readAccountAuthEnv().betterAuthSecret)
    .update(encodedPayload)
    .digest("base64url");
}

function parseLinkNoncePayload(encoded: string): {
  userId: string;
  address: string;
  chainId: number;
  domain: string;
  issuedAt: number;
} | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.address !== "string" ||
      typeof parsed.chainId !== "number" ||
      typeof parsed.domain !== "string" ||
      typeof parsed.issuedAt !== "number"
    ) {
      return null;
    }
    return {
      userId: parsed.userId,
      address: parsed.address,
      chainId: parsed.chainId,
      domain: parsed.domain,
      issuedAt: parsed.issuedAt,
    };
  } catch {
    return null;
  }
}

function timingSafeEqualString(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
