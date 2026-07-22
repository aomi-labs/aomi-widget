import { createHash, randomBytes } from "node:crypto";
import {
  SIWS_CLUSTERS,
  validSolanaAddress,
  verifySiwsMessage,
  type SiwsCluster,
} from "../better-auth/siws";
import { getOrCreateAomiUserForSiws } from "../service/account-service";
import { widgetOriginDomain } from "./origin";
import { issueWidgetSession, type WidgetSession } from "./session";
import { requireWidgetOrigin, WidgetAuthError } from "./siwe";
import { widgetAuthStore, type WidgetAuthStore } from "./store";

const SIWS_CHALLENGE_NAMESPACE = "aomi:widget:siws:";
export const WIDGET_SIWS_NONCE_TTL_SECONDS = 5 * 60;

export type WidgetSiwsChallenge = {
  nonce: string;
  domain: string;
  uri: string;
  issuedAt: string;
  expirationTime: string;
};

export async function createWidgetSiwsChallenge(input: {
  request: Request;
  walletAddress: string;
  chainId: string;
  now?: Date;
  ttlSeconds?: number;
  store?: WidgetAuthStore;
}): Promise<WidgetSiwsChallenge> {
  const origin = requireWidgetOrigin(input.request);
  const address = requireSolanaAddress(input.walletAddress);
  const chainId = requireSiwsCluster(input.chainId);
  const now = input.now ?? new Date();
  const expiresAt = new Date(
    now.getTime() + (input.ttlSeconds ?? WIDGET_SIWS_NONCE_TTL_SECONDS) * 1000,
  );
  const nonce = randomBytes(32).toString("hex");
  await (input.store ?? widgetAuthStore).write({
    identifier: challengeIdentifier(nonce),
    expiresAt,
    ticket: {
      kind: "siws_challenge",
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

export async function verifyWidgetSiwsProof(input: {
  request: Request;
  message: string;
  signature: string;
  walletAddress: string;
  chainId: string;
  now?: Date;
  store?: WidgetAuthStore;
}): Promise<WidgetSession> {
  const origin = requireWidgetOrigin(input.request);
  const address = requireSolanaAddress(input.walletAddress);
  const chainId = requireSiwsCluster(input.chainId);
  const now = input.now ?? new Date();
  const nonce = readField(input.message, "Nonce");
  if (!nonce) throw new WidgetAuthError("invalid_siws_message", 400);
  const store = input.store ?? widgetAuthStore;
  const ticket = await store.read({
    identifier: challengeIdentifier(nonce),
    now,
  });
  if (ticket?.kind !== "siws_challenge") {
    throw new WidgetAuthError("invalid_or_expired_nonce", 401);
  }
  const valid =
    ticket.origin === origin &&
    ticket.address === address &&
    ticket.chainId === chainId &&
    readField(input.message, "Issued At") === ticket.issuedAt &&
    verifySiwsMessage({
      message: input.message,
      signature: input.signature,
      walletAddress: address,
      chainId,
      intent: "sign-in",
      nonce,
      domain: widgetOriginDomain(origin),
      uri: origin,
      now: now.getTime(),
    });
  if (!valid) throw new WidgetAuthError("invalid_siws_signature", 401);
  const consumed = await store.consume({
    identifier: challengeIdentifier(nonce),
    now,
  });
  if (consumed?.kind !== "siws_challenge") {
    throw new WidgetAuthError("nonce_already_used", 409);
  }
  const user = await getOrCreateAomiUserForSiws({ address, chainId });
  return issueWidgetSession({
    userId: user.id,
    origin,
    authMethod: "siws",
    now,
    store,
  });
}

function requireSolanaAddress(address: string): string {
  if (!validSolanaAddress(address)) {
    throw new WidgetAuthError("invalid_wallet_address", 400);
  }
  return address;
}

function requireSiwsCluster(value: string): SiwsCluster {
  if (!SIWS_CLUSTERS.includes(value as SiwsCluster)) {
    throw new WidgetAuthError("invalid_chain_id", 400);
  }
  return value as SiwsCluster;
}

function challengeIdentifier(nonce: string): string {
  return `${SIWS_CHALLENGE_NAMESPACE}${createHash("sha256").update(nonce).digest("hex")}`;
}

function readField(message: string, field: string): string | null {
  const prefix = `${field}: `;
  return (
    message
      .split(/\r?\n/)
      .find((line) => line.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  );
}
