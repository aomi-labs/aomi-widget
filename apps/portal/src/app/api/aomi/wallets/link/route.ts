import {
  accountResponseFromSession,
  json,
  requireAomiSession,
} from "@portal/lib/aomi-account/session";
import { upsertVerifiedWallet } from "@aomi-labs/auth/service/account-service";
import type { WalletFamily } from "@aomi-labs/auth";
import { readAccountAuthEnv } from "@aomi-labs/auth/better-auth/env";
import { verifyMessage } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const current = await requireAomiSession(req);
  if (!current) return json(401, { error: "unauthenticated" });
  const body = (await req.json().catch(() => null)) as {
    family?: WalletFamily;
    address?: string;
    chainId?: number;
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
  const env = readAccountAuthEnv();
  const messageOk =
    body.message.includes(env.siweDomain) &&
    body.message.toLowerCase().includes(body.address.toLowerCase()) &&
    body.message.includes(`Chain ID: ${body.chainId}`);
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
