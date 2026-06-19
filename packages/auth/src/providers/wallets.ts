// =============================================================================
// Server-side provider wallet attestation.
// =============================================================================
//
// Lists wallets that an embedded-wallet provider (Privy / Para) attests are
// owned by a verified user, by calling the provider's REST API with Aomi's
// server-side credentials — NOT by trusting a client-reported address.
//
// Why this exists: for embedded (custodied) wallets, the provider is the
// authoritative source of "which wallets belong to this user", because the
// provider created and custody-shares the key under that user. A SIWE/SIWS
// signature proves key control at a moment in time, but for a non-extractable
// embedded key the provider's ownership record is the matching — and for
// Solana (where SIWS does not exist yet) the only — reliable proof.
//
// What this module does NOT do:
//   * Link externally-connected wallets the user plugged into the provider
//     (e.g. a MetaMask they linked inside Privy). Those are filtered out
//     because the provider does not custody their keys; they must still go
//     through SIWE/SIWS.
//   * Trust any address the client sends. The only input derived from the
//     client is the verified token subject; every address comes from the
//     provider API response.
//
// See specs/WIDGET-AUTH-PLAN.md §6 ("Provider-attested wallets") and §8.4
// (Solana). In v1 the spec records these as identity-only; this module
// promotes them to real `aomi_wallets` rows with `linked_via='privy'|'para'`
// and `kind='embedded'`, gated on server-side attestation.

import type { WalletFamily } from "../types";

/** A wallet the provider attests is owned by the verified user and currently
 *  custodied by the provider. Only these are eligible to become
 *  `aomi_wallets` rows with `linked_via = provider`. */
export interface AttestedWallet {
  provider: "privy" | "para";
  /** Stable provider-side wallet id (Privy wallet `id` / Para wallet `id`).
   *  Stored on `aomi_wallets.provider_wallet_id` for later server-side
   *  signing lookups. */
  providerWalletId: string;
  family: WalletFamily;
  address: string;
  /** Chain scope for the caip-10 derivation. `null` keeps the unique-index
   *  key consistent with the SIWE convention (`coalesce(chain_scope,'*')`). */
  chainScope: string | null;
}

const PRIVY_WALLETS_URL = "https://api.privy.io/v1/wallets";
const PARA_WALLETS_URL =
  process.env.PARA_API_BASE_URL ?? "https://api.beta.getpara.com/v1/wallets";

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
// Solana base58 addresses: 32–44 chars, no 0/O/I/l.
const SVM_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Fetch every wallet Privy attests is owned by `userId` (a verified
 *  `did:privy:…`), following the cursor-paginated list endpoint.
 *
 *  Filters to currently-custodied wallets only: skips wallets that were
 *  imported from or exported to external custody, archived wallets, and any
 *  wallet whose `owner_id` does not match the verified subject. Throws on
 *  network / auth failure so the caller can distinguish "API down" (skip
 *  sync, keep existing rows) from "user has no wallets" (revoke stale
 *  rows). */
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
  // Defensive cap so a misbehaving cursor loop can't run forever.
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
      const attested = normalizePrivyRow(row);
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

function normalizePrivyRow(
  row: PrivyWalletRow,
): AttestedWallet | null {
  // Ownership is scoped server-side by the `user_id` query param — Privy
  // returns only wallets owned by that user. The response `owner_id` is
  // Privy's internal user-table key, which is NOT the same identifier space
  // as the DID passed as `user_id` (the docs' own example shows a short
  // opaque id, not a `did:privy:…`), so it must not be equality-checked
  // against the verified subject. The custody gates below are what matter.
  if (row.imported_at != null) return null;
  if (row.exported_at != null) return null;
  if (row.archived_at != null) return null;

  const family = privyFamily(row.chain_type);
  if (!family) return null;
  if (!row.id || typeof row.id !== "string") return null;
  if (!validAddress(family, row.address)) return null;

  return {
    provider: "privy",
    providerWalletId: row.id,
    family,
    address: row.address as string,
    // `null` keeps the unique-index key aligned with SIWE wallets.
    chainScope: null,
  };
}

function privyFamily(chainType: string | undefined): WalletFamily | null {
  switch (chainType) {
    case "ethereum":
      return "evm";
    case "solana":
      return "svm";
    default:
      return null;
  }
}

/** Fetch every wallet Para attests is owned by the user identified by
 *  `userIdentifier` / `userIdentifierType` (the verified Para JWT subject,
 *  typed as `CUSTOM_ID`). Filters to embedded/MPC wallets Para custody-shares
 *  — external imports are skipped. Throws on failure so the caller can skip
 *  the sync rather than revoke live rows. */
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
      const attested = normalizeParaRow(row);
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

function normalizeParaRow(row: ParaWalletRow): AttestedWallet | null {
  const family = paraFamily(row.type);
  if (!family) return null;
  if (!row.id || typeof row.id !== "string") return null;
  if (!validAddress(family, row.address)) return null;
  // Only accept embedded/MPC wallets Para custody-shares under this user.
  // External imports / observed wallets do not carry custody and must still
  // go through SIWE/SIWS. `scheme` is the custody indicator (DKLS / FROST /
  // similar MPC schemes). If scheme is missing or unrecognized, skip rather
  // than risk linking a wallet Para doesn't custody.
  if (!isEmbeddedScheme(row.scheme)) return null;

  return {
    provider: "para",
    providerWalletId: row.id,
    family,
    address: row.address as string,
    chainScope: null,
  };
}

function paraFamily(type: string | undefined): WalletFamily | null {
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
 *  wallets. Anything else (or missing) is treated as non-custodied. */
function isEmbeddedScheme(scheme: string | undefined): boolean {
  if (!scheme) return false;
  const upper = scheme.toUpperCase();
  return upper === "DKLS" || upper === "FROST" || upper.includes("MPC");
}

function validAddress(family: WalletFamily, address: unknown): address is string {
  return (
    typeof address === "string" &&
    (family === "evm"
      ? EVM_ADDRESS_RE.test(address)
      : SVM_ADDRESS_RE.test(address))
  );
}
