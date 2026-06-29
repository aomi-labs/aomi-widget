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
  const parsed = parseWalletLinkMessage(input.message);
  return Boolean(
    parsed &&
    parsed.domain === input.domain &&
    parsed.address.toLowerCase() === input.address.toLowerCase() &&
    parsed.chainId === input.chainId &&
    parsed.nonce === input.nonce,
  );
}

export type ParsedWalletLinkMessage = {
  domain: string;
  address: string;
  uri: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
};

export function parseWalletLinkMessage(
  message: string,
): ParsedWalletLinkMessage | null {
  const lines = message.split(/\r?\n/);
  if (lines.length !== 10) return null;
  const domainMatch = lines[0]?.match(
    /^(.+) wants to link this wallet to your Aomi account:$/,
  );
  if (!domainMatch) return null;
  if (!/^0x[0-9a-fA-F]{40}$/.test(lines[1] ?? "")) return null;
  if (lines[2] !== "") return null;
  if (
    lines[3] !==
    "Only sign this message if you want this wallet attached to the current Aomi account."
  ) {
    return null;
  }
  if (lines[4] !== "") return null;
  const fields = {
    uri: readExactField(lines[5], "URI"),
    version: readExactField(lines[6], "Version"),
    chainId: readExactField(lines[7], "Chain ID"),
    nonce: readExactField(lines[8], "Nonce"),
    issuedAt: readExactField(lines[9], "Issued At"),
  };
  if (
    !fields.uri ||
    fields.version !== "1" ||
    !fields.chainId ||
    !fields.nonce ||
    !fields.issuedAt
  ) {
    return null;
  }
  const chainId = Number(fields.chainId);
  if (
    !Number.isInteger(chainId) ||
    chainId <= 0 ||
    String(chainId) !== fields.chainId
  ) {
    return null;
  }
  if (Number.isNaN(Date.parse(fields.issuedAt))) return null;

  return {
    domain: domainMatch[1],
    address: lines[1],
    uri: fields.uri,
    chainId,
    nonce: fields.nonce,
    issuedAt: fields.issuedAt,
  };
}

function readExactField(
  line: string | undefined,
  field: string,
): string | null {
  const prefix = `${field}: `;
  if (!line?.startsWith(prefix)) return null;
  return line.slice(prefix.length);
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
