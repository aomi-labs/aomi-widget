import { importSPKI, jwtVerify } from "jose";
import {
  makePrivyJwtVerifier,
  type VerifiedPrivyAccessToken,
} from "../mcp-approvals/providers/privy";
import type { VerifiedPrivyToken, WalletFamily } from "../types";
import { validWalletAddress, type AttestedWallet } from "./wallet-attestation";

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

const PRIVY_WALLETS_URL = "https://api.privy.io/v1/wallets";

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

/** Fetch every wallet Privy attests is owned by `userId` (a verified
 * `did:privy:...`), following the cursor-paginated list endpoint.
 *
 * Filters to currently-custodied wallets only: skips wallets that were
 * imported from or exported to external custody, archived wallets, and
 * unsupported chains. Throws on network / auth failure so callers can
 * distinguish "API down" from "user has no wallets". */
export async function listPrivyWalletsForUser(input: {
  appId: string;
  appSecret: string;
  userId: string;
}): Promise<AttestedWallet[]> {
  const auth = Buffer.from(`${input.appId}:${input.appSecret}`).toString(
    "base64",
  );
  const headers: Record<string, string> = {
    Authorization: `Basic ${auth}`,
    "privy-app-id": input.appId,
  };

  const out: AttestedWallet[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 50; page++) {
    const url = new URL(PRIVY_WALLETS_URL);
    url.searchParams.set("user_id", input.userId);
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(
        `privy wallets: list failed (${res.status} ${res.statusText})`,
      );
    }
    const body = (await res.json()) as {
      data?: PrivyWalletRow[];
      next_cursor?: string | null;
    };
    const rows = Array.isArray(body.data) ? body.data : [];

    for (const row of rows) {
      const attested = normalizePrivyWalletRow(row);
      if (attested) out.push(attested);
    }

    cursor = body.next_cursor ?? undefined;
    if (!cursor) break;
  }
  return out;
}

interface PrivyWalletRow {
  id?: string;
  address?: string;
  chain_type?: string;
  owner_id?: string;
  imported_at?: number | null;
  exported_at?: number | null;
  archived_at?: number | null;
}

function normalizePrivyWalletRow(row: PrivyWalletRow): AttestedWallet | null {
  // Ownership is scoped server-side by the `user_id` query param. The response
  // `owner_id` is Privy's internal user-table key, not the DID passed as
  // `user_id`, so it must not be equality-checked against the verified subject.
  if (row.imported_at != null) return null;
  if (row.exported_at != null) return null;
  if (row.archived_at != null) return null;

  const family = privyWalletFamily(row.chain_type);
  if (!family) return null;
  if (!row.id || typeof row.id !== "string") return null;
  if (!validWalletAddress(family, row.address)) return null;

  return {
    provider: "privy",
    providerWalletId: row.id,
    family,
    address: row.address,
    chainScope: null,
  };
}

function privyWalletFamily(chainType: string | undefined): WalletFamily | null {
  switch (chainType) {
    case "ethereum":
      return "evm";
    case "solana":
      return "svm";
    default:
      return null;
  }
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
