import { importSPKI, jwtVerify } from "jose";
import {
  makePrivyJwtVerifier,
  type VerifiedPrivyAccessToken,
} from "../mcp-approvals/providers/privy";
import type { VerifiedPrivyToken } from "../types";

type PrivyClaims = {
  sub?: string;
  sid?: string;
  aud?: string | string[];
  iss?: string;
  exp?: number;
  email?: string;
  email_verified?: boolean;
  linked_accounts?: unknown[];
  linkedAccounts?: unknown[];
  [key: string]: unknown;
};

export async function verifyPrivyToken(input: {
  token: string;
  tokenKind: "identity_token" | "access_token";
  appId: string;
  accessTokenVerificationKey?: string;
  identityTokenVerificationKey?: string;
}): Promise<VerifiedPrivyToken> {
  if (input.tokenKind === "access_token") {
    if (!input.accessTokenVerificationKey) {
      throw new Error("Privy access-token verification key is not configured");
    }
    const verifier = makePrivyJwtVerifier({
      appId: input.appId,
      jwtVerificationKey: input.accessTokenVerificationKey,
    });
    const access = await verifier(input.token);
    return fromAccessToken(access, input.appId);
  }

  const key =
    input.identityTokenVerificationKey ?? input.accessTokenVerificationKey;
  if (!key) {
    throw new Error("Privy identity-token verification key is not configured");
  }
  const cryptoKey = await importSPKI(key, "ES256");
  const { payload } = await jwtVerify<PrivyClaims>(input.token, cryptoKey, {
    issuer: "privy.io",
    audience: input.appId,
  });
  if (!payload.sub) throw new Error("Privy token is missing sub");
  if (!payload.exp) throw new Error("Privy token is missing exp");
  return {
    subject: payload.sub,
    sessionId: payload.sid,
    audience: input.appId,
    issuer: "privy.io",
    expiresAt: payload.exp,
    email: stringClaim(payload.email),
    emailVerified: Boolean(payload.email_verified),
    linkedAccounts: Array.isArray(payload.linked_accounts)
      ? payload.linked_accounts
      : Array.isArray(payload.linkedAccounts)
        ? payload.linkedAccounts
        : undefined,
    rawClaims: { ...payload },
  };
}

function fromAccessToken(
  token: VerifiedPrivyAccessToken,
  audience: string,
): VerifiedPrivyToken {
  return {
    subject: token.userId,
    sessionId: token.sessionId,
    audience,
    issuer: "privy.io",
    expiresAt: token.expiration,
    rawClaims: {
      sub: token.userId,
      sid: token.sessionId,
      exp: token.expiration,
      aud: audience,
    },
  };
}

function stringClaim(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
