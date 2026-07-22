import { createHash, randomBytes } from "node:crypto";
import { getAddress } from "viem";
import { parseSiweMessage, validateSiweMessage } from "viem/siwe";
import { verifyEoaSiweMessage } from "../better-auth/siwe";
import { getOrCreateAomiUserForSiwe } from "../service/account-service";
import { observedWidgetOrigin, widgetOriginDomain } from "./origin";
import { issueWidgetSession, type WidgetSession } from "./session";
import { widgetAuthStore, type WidgetAuthStore } from "./store";

export const WIDGET_SIWE_NONCE_TTL_SECONDS = 5 * 60;
const SIWE_CHALLENGE_NAMESPACE = "aomi:widget:siwe:";

export class WidgetAuthError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
    this.name = "WidgetAuthError";
  }
}

export type WidgetSiweChallenge = {
  nonce: string;
  domain: string;
  uri: string;
  issuedAt: string;
  expirationTime: string;
};

export async function createWidgetSiweChallenge(input: {
  request: Request;
  walletAddress: string;
  chainId: number;
  now?: Date;
  ttlSeconds?: number;
  store?: WidgetAuthStore;
}): Promise<WidgetSiweChallenge> {
  const origin = requireWidgetOrigin(input.request);
  const address = requireAddress(input.walletAddress);
  const chainId = requireChainId(input.chainId);
  const now = input.now ?? new Date();
  const expiresAt = new Date(
    now.getTime() + (input.ttlSeconds ?? WIDGET_SIWE_NONCE_TTL_SECONDS) * 1000,
  );
  const nonce = randomBytes(32).toString("hex");
  await (input.store ?? widgetAuthStore).write({
    identifier: challengeIdentifier(nonce),
    expiresAt,
    ticket: {
      kind: "siwe_challenge",
      origin,
      address,
      chainId,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    },
  });
  return {
    nonce,
    domain: widgetOriginDomain(origin),
    uri: origin,
    issuedAt: now.toISOString(),
    expirationTime: expiresAt.toISOString(),
  };
}

export async function verifyWidgetSiweProof(input: {
  request: Request;
  message: string;
  signature: string;
  walletAddress: string;
  chainId: number;
  now?: Date;
  store?: WidgetAuthStore;
}): Promise<WidgetSession> {
  const origin = requireWidgetOrigin(input.request);
  const address = requireAddress(input.walletAddress);
  const chainId = requireChainId(input.chainId);
  const now = input.now ?? new Date();
  const parsed = parseSiweMessage(input.message);
  const nonce = parsed.nonce;
  if (!nonce) throw new WidgetAuthError("invalid_siwe_message", 400);
  const store = input.store ?? widgetAuthStore;
  const ticket = await store.read({
    identifier: challengeIdentifier(nonce),
    now,
  });
  if (ticket?.kind !== "siwe_challenge") {
    throw new WidgetAuthError("invalid_or_expired_nonce", 401);
  }
  const matches =
    ticket.origin === origin &&
    ticket.address.toLowerCase() === address.toLowerCase() &&
    ticket.chainId === chainId &&
    parsed.chainId === chainId &&
    parsed.uri === origin &&
    parsed.issuedAt?.toISOString() === ticket.issuedAt &&
    parsed.expirationTime?.toISOString() === ticket.expiresAt &&
    validateSiweMessage({
      message: parsed,
      address,
      domain: widgetOriginDomain(origin),
      nonce,
      time: now,
    });
  if (!matches) throw new WidgetAuthError("siwe_message_mismatch", 401);
  if (
    !(await verifyEoaSiweMessage({
      message: input.message,
      signature: input.signature,
      address,
    }))
  ) {
    throw new WidgetAuthError("invalid_siwe_signature", 401);
  }
  const consumed = await store.consume({
    identifier: challengeIdentifier(nonce),
    now,
  });
  if (consumed?.kind !== "siwe_challenge") {
    throw new WidgetAuthError("nonce_already_used", 409);
  }
  const user = await getOrCreateAomiUserForSiwe({ address, chainId });
  return issueWidgetSession({
    userId: user.id,
    origin,
    authMethod: "siwe",
    now,
    store,
  });
}

export function requireWidgetOrigin(request: Request): string {
  const origin = observedWidgetOrigin(request);
  if (!origin) throw new WidgetAuthError("invalid_widget_origin", 403);
  return origin;
}

function requireAddress(address: string): `0x${string}` {
  try {
    return getAddress(address) as `0x${string}`;
  } catch {
    throw new WidgetAuthError("invalid_wallet_address", 400);
  }
}

function requireChainId(chainId: number): number {
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new WidgetAuthError("invalid_chain_id", 400);
  }
  return chainId;
}

function challengeIdentifier(nonce: string): string {
  return `${SIWE_CHALLENGE_NAMESPACE}${createHash("sha256").update(nonce).digest("hex")}`;
}
