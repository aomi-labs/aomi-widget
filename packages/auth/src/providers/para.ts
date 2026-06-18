import { createRemoteJWKSet, jwtVerify } from "jose";
import type { VerifiedParaJwt } from "../types";

type ParaClaims = {
  sub?: string;
  aud?: string | string[];
  exp?: number;
  email?: string;
  email_verified?: boolean;
  wallets?: unknown[];
  connectedWallets?: unknown[];
  connected_wallets?: unknown[];
  [key: string]: unknown;
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function verifyParaJwt(input: {
  token: string;
  expectedAudience: string;
  jwksUrl: string;
  keyId?: string;
}): Promise<VerifiedParaJwt> {
  const jwks = getJwks(input.jwksUrl);
  const { payload, protectedHeader } = await jwtVerify<ParaClaims>(
    input.token,
    jwks,
    { audience: input.expectedAudience },
  );
  if (
    input.keyId &&
    protectedHeader.kid &&
    input.keyId !== protectedHeader.kid
  ) {
    throw new Error("Para JWT kid did not match the requested key id");
  }
  if (!payload.sub) throw new Error("Para JWT is missing sub");
  if (!payload.exp) throw new Error("Para JWT is missing exp");
  return {
    subject: payload.sub,
    audience: input.expectedAudience,
    expiresAt: payload.exp,
    email: stringClaim(payload.email),
    emailVerified: Boolean(payload.email_verified),
    wallets: Array.isArray(payload.wallets) ? payload.wallets : undefined,
    connectedWallets: Array.isArray(payload.connectedWallets)
      ? payload.connectedWallets
      : Array.isArray(payload.connected_wallets)
        ? payload.connected_wallets
        : undefined,
    rawClaims: { ...payload },
  };
}

function getJwks(url: string): ReturnType<typeof createRemoteJWKSet> {
  const cached = jwksCache.get(url);
  if (cached) return cached;
  const jwks = createRemoteJWKSet(new URL(url));
  jwksCache.set(url, jwks);
  return jwks;
}

function stringClaim(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
