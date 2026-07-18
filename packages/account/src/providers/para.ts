import { createRemoteJWKSet, jwtVerify } from "jose";
import type { VerifiedParaJwt, WalletFamily } from "../types";
import { validWalletAddress, type AttestedWallet } from "./wallet-attestation";

type ParaClaims = {
  sub?: string;
  aud?: string | string[];
  exp?: number;
  email?: string;
  email_verified?: boolean;
  wallets?: unknown[];
  connectedWallets?: unknown[];
  connected_wallets?: unknown[];
  data?: {
    email?: unknown;
    identifier?: unknown;
    authType?: unknown;
    oAuthMethod?: unknown;
    wallets?: unknown;
    connectedWallets?: unknown;
    connected_wallets?: unknown;
  };
  [key: string]: unknown;
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

const PARA_WALLETS_URL =
  process.env.PARA_API_BASE_URL ?? "https://api.beta.getpara.com/v1/wallets";

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
  const nested = payload.data;
  const nestedEmail = stringClaim(nested?.email);
  const email = nestedEmail ?? stringClaim(payload.email);
  const identifier = stringClaim(nested?.identifier);
  const wallets = arrayClaim(nested?.wallets) ?? arrayClaim(payload.wallets);
  const connectedWallets =
    arrayClaim(nested?.connectedWallets) ??
    arrayClaim(nested?.connected_wallets) ??
    arrayClaim(payload.connectedWallets) ??
    arrayClaim(payload.connected_wallets);
  return {
    subject: payload.sub,
    audience: input.expectedAudience,
    expiresAt: payload.exp,
    email,
    emailVerified: Boolean(payload.email_verified || nestedEmail),
    displayLabel: email ?? identifier,
    wallets,
    connectedWallets,
    rawClaims: { ...payload },
  };
}

/** Fetch every wallet Para attests is owned by the user identified by
 * `userIdentifier` / `userIdentifierType`. Filters to embedded/MPC wallets
 * Para custody-shares; external imports must still go through SIWE/SIWS. */
export async function listParaWalletsForUser(input: {
  apiKey: string;
  userIdentifier: string;
  userIdentifierType?: "CUSTOM_ID" | "EMAIL" | "PHONE";
}): Promise<AttestedWallet[]> {
  const headers: Record<string, string> = {
    "X-API-Key": input.apiKey,
  };
  const identifierType = input.userIdentifierType ?? "CUSTOM_ID";

  const out: AttestedWallet[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 50; page++) {
    const url = new URL(PARA_WALLETS_URL);
    url.searchParams.set("userIdentifier", input.userIdentifier);
    url.searchParams.set("userIdentifierType", identifierType);
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(
        `para wallets: list failed (${res.status} ${res.statusText})`,
      );
    }
    const body = (await res.json()) as {
      wallets?: ParaWalletRow[];
      data?: ParaWalletRow[];
      pagination?: { cursor?: string | null; hasMore?: boolean };
    };
    const rows = Array.isArray(body.wallets)
      ? body.wallets
      : Array.isArray(body.data)
        ? body.data
        : [];

    for (const row of rows) {
      const attested = normalizeParaWalletRow(row);
      if (attested) out.push(attested);
    }

    const next = body.pagination?.cursor ?? undefined;
    cursor = next && body.pagination?.hasMore !== false ? next : undefined;
    if (!cursor) break;
  }
  return out;
}

interface ParaWalletRow {
  id?: string;
  address?: string;
  type?: string;
  scheme?: string;
}

function normalizeParaWalletRow(row: ParaWalletRow): AttestedWallet | null {
  const family = paraWalletFamily(row.type);
  if (!family) return null;
  if (!row.id || typeof row.id !== "string") return null;
  if (!validWalletAddress(family, row.address)) return null;
  if (!isEmbeddedScheme(row.scheme)) return null;

  return {
    provider: "para",
    providerWalletId: row.id,
    family,
    address: row.address,
    chainScope: null,
  };
}

function paraWalletFamily(type: string | undefined): WalletFamily | null {
  switch (type) {
    case "EVM":
    case "ETHEREUM":
      return "evm";
    case "SOLANA":
      return "svm";
    default:
      return null;
  }
}

/** MPC / embedded custody schemes Para uses for non-extractable embedded
 * wallets. Anything else (or missing) is treated as non-custodied. */
function isEmbeddedScheme(scheme: string | undefined): boolean {
  if (!scheme) return false;
  const upper = scheme.toUpperCase();
  return upper === "DKLS" || upper === "FROST" || upper.includes("MPC");
}

function getJwks(url: string): ReturnType<typeof createRemoteJWKSet> {
  const cached = jwksCache.get(url);
  if (cached) return cached;
  const jwks = createRemoteJWKSet(new URL(url));
  jwksCache.set(url, jwks);
  return jwks;
}

function stringClaim(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function arrayClaim(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}
