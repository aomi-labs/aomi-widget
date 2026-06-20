import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { verifySiweMessage } from "../better-auth/siwe";

export const DEFAULT_WALLET_LINK_NONCE_MAX_AGE_MS = 5 * 60 * 1000;

export type WalletLinkNoncePayload = {
  userId: string;
  address: string;
  chainId: number;
  domain: string;
  issuedAt: number;
};

export function createWalletLinkNonce(input: {
  userId: string;
  address: string;
  chainId: number;
  domain: string;
  secret: string;
  now?: number;
  random?: string;
}): string {
  const payload = {
    userId: input.userId,
    address: input.address.toLowerCase(),
    chainId: input.chainId,
    domain: input.domain,
    issuedAt: input.now ?? Date.now(),
    random: input.random ?? randomBytes(16).toString("base64url"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signWalletLinkNoncePayload(encoded, input.secret)}`;
}

export function verifyWalletLinkNonce(input: {
  nonce: string;
  userId: string;
  address: string;
  chainId: number;
  domain: string;
  secret: string;
  now?: number;
  maxAgeMs?: number;
}): boolean {
  const [encoded, signature] = input.nonce.split(".");
  if (!encoded || !signature) return false;
  const expected = signWalletLinkNoncePayload(encoded, input.secret);
  if (!timingSafeEqualString(signature, expected)) return false;
  const payload = parseWalletLinkNoncePayload(encoded);
  if (!payload) return false;
  const ageMs = (input.now ?? Date.now()) - payload.issuedAt;
  return (
    payload.userId === input.userId &&
    payload.address === input.address.toLowerCase() &&
    payload.chainId === input.chainId &&
    payload.domain === input.domain &&
    ageMs >= 0 &&
    ageMs <= (input.maxAgeMs ?? DEFAULT_WALLET_LINK_NONCE_MAX_AGE_MS)
  );
}

export async function verifyWalletLinkSignature(input: {
  message: string;
  signature: string;
  address: string;
  chainId: number;
  nonce: string;
  domain: string;
}): Promise<boolean> {
  if (
    !walletLinkMessageMatches({
      message: input.message,
      address: input.address,
      chainId: input.chainId,
      nonce: input.nonce,
      domain: input.domain,
    })
  ) {
    return false;
  }
  return verifySiweMessage({
    address: input.address,
    message: input.message,
    signature: input.signature,
    chainId: input.chainId,
  });
}

export function walletLinkMessageMatches(input: {
  message: string;
  address: string;
  chainId: number;
  nonce: string;
  domain: string;
}): boolean {
  return (
    input.message.includes(input.domain) &&
    input.message.toLowerCase().includes(input.address.toLowerCase()) &&
    input.message.includes(`Chain ID: ${input.chainId}`) &&
    input.message.includes(`Nonce: ${input.nonce}`)
  );
}

function signWalletLinkNoncePayload(
  encodedPayload: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
}

function parseWalletLinkNoncePayload(
  encoded: string,
): WalletLinkNoncePayload | null {
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
