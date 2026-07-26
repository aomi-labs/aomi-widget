"use client";

/**
 * Wire layer for the Account tab — the two read endpoints behind the ACL
 * editor, plus the grant revoke, mapped onto the view types.
 *
 * Two axes, two endpoints (see the backend's own note on `delegated_approval`):
 * `/api/account/wallets` is the **policy** axis (`public_keys.signing_mode` —
 * what the user wants), `/api/account/grants` is the **capability** axis (is
 * there a live delegated grant to honor an `auto` policy with). Drift is the
 * two disagreeing, which is why the view needs both rather than one merged
 * payload.
 */

import { accountScopedFetch } from "@portal/lib/settings-api";
import type { DelegationGrant, LinkedVia, SignerMode, WalletPolicy } from "./types";

/** One row of `GET /api/account/wallets` (backend `AccountWalletView`). */
export type AccountWalletRow = {
  address: string;
  chain_type: string;
  /** Provider provenance on the key row; absent for provider-less keys. */
  wallet_provider?: string | null;
  signing: string;
  is_primary: boolean;
  signing_mode: string;
  authorization_version: number;
  last_authorized_at?: number;
  last_authorized_by?: string;
  auth_provider_id?: number | null;
  has_delegated_grant: boolean;
  provider_managed: boolean;
  can_use_auto: boolean;
  expires_at?: number;
};

/** One row of `GET /api/account/grants` (backend `GrantView`). */
export type AccountGrantRow = {
  id: number;
  provider: string;
  grant_kind: string;
  status: "active" | "expired" | "revoked";
  created_at: number;
  expires_at?: number;
  revoked_at?: number;
  revocation_reason?: string;
  chain_type?: string;
  address?: string;
};

export async function fetchWalletPolicies(): Promise<WalletPolicy[]> {
  const data = await accountScopedFetch<{ wallets: AccountWalletRow[] }>(
    "/api/account/wallets",
  );
  const owned = new Set(
    data.wallets.map((wallet) => wallet.address.toLowerCase()),
  );
  return data.wallets.map((wallet) => toWalletPolicy(wallet, owned));
}

export async function fetchGrants(): Promise<DelegationGrant[]> {
  const data = await accountScopedFetch<{ grants: AccountGrantRow[] }>(
    "/api/account/grants",
  );
  return data.grants.map(toDelegationGrant);
}

/**
 * Cut a provider's live grant. The backend revokes per *provider identity*, not
 * per grant row (`DELETE /providers/:provider/grant`), because the vault secrets
 * it clears hang off the identity — so revoking one row of a provider revokes
 * that provider's capability wholesale. The view reflects that by keying its
 * revoke button on `providerKey`.
 */
export function revokeProviderGrant(providerKey: string): Promise<unknown> {
  return accountScopedFetch(
    `/api/account/providers/${encodeURIComponent(providerKey)}/grant`,
    { method: "DELETE" },
  );
}

/**
 * Normalize the kernel's `signing_mode` to the view's `SignerMode`, absorbing
 * the pre-rename wire values (`human_sync` / `agent_sync`) that `from_db` still
 * accepts — rows written before the rename are still in the table.
 */
export function normalizeSignerMode(mode: string): SignerMode {
  switch (mode) {
    case "auto":
      return "auto";
    case "client_auto":
    case "agent_sync":
      return "client_auto";
    case "denied":
      return "denied";
    default:
      return "manual";
  }
}

/**
 * Provenance is *derived*, not stored: a key row carries the provider identity
 * it came from, and a key with no provider was necessarily proven by a wallet
 * signature — SIWE on EVM, SIWS on SVM.
 */
function linkedViaOf(row: AccountWalletRow, chain: "evm" | "svm"): LinkedVia {
  const provider = row.wallet_provider?.toLowerCase();
  if (provider === "privy") return "privy";
  if (provider === "para") return "para";
  return chain === "svm" ? "siws" : "siwe";
}

function toWalletPolicy(
  row: AccountWalletRow,
  ownedAddresses: Set<string>,
): WalletPolicy {
  const chain = row.chain_type.toLowerCase() === "svm" ? "svm" : "evm";
  return {
    // No key id is exposed on the wire; (chain, address) is the table's own
    // uniqueness constraint, so it is a stable identity for React keys.
    id: `${chain}:${row.address}`,
    chain,
    address: row.address,
    linkedVia: linkedViaOf(row, chain),
    primary: row.is_primary,
    desiredMode: normalizeSignerMode(row.signing_mode),
    grantActive: row.has_delegated_grant,
    grantExpiresLabel: formatDate(row.expires_at),
    authVersion: row.authorization_version,
    lastPermit: formatPermit(row, ownedAddresses),
    provider: row.wallet_provider ?? undefined,
    canUseAuto: row.can_use_auto,
    providerManaged: row.provider_managed,
  };
}

function toDelegationGrant(row: AccountGrantRow): DelegationGrant {
  return {
    id: String(row.id),
    provider: titleCase(row.provider),
    providerKey: row.provider,
    scope: grantScope(row),
    kind: row.grant_kind.replace(/_/g, " "),
    status: row.status,
    expiresLabel:
      row.status === "revoked"
        ? (formatDate(row.revoked_at) ?? "")
        : (formatDate(row.expires_at) ?? "no expiry"),
  };
}

function grantScope(row: AccountGrantRow): string {
  if (!row.address) {
    // A provider-level grant (`public_key_id` null) covers every key under the
    // identity — say so rather than inventing a wallet it isn't bound to.
    return "All wallets on this provider";
  }
  const chain = row.chain_type?.toLowerCase() === "svm" ? "Solana" : "Ethereum";
  return `${chain} · ${shortenAddress(row.address)}`;
}

/**
 * "you · Jul 12" when the signer was one of this account's own keys — which is
 * the normal case, since a tighten may be signed by any *linked* key, not only
 * the wallet being changed.
 */
function formatPermit(
  row: AccountWalletRow,
  ownedAddresses: Set<string>,
): string | undefined {
  const when = formatDate(row.last_authorized_at);
  if (!when) return undefined;
  const by = row.last_authorized_by;
  if (!by) return when;
  return ownedAddresses.has(by.toLowerCase())
    ? `you · ${when}`
    : `${shortenAddress(by)} · ${when}`;
}

function formatDate(unixSeconds?: number | null): string | undefined {
  if (!unixSeconds) return undefined;
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Turn a failed call into something a person can act on.
 *
 * The authorization endpoints answer with `{"error": "<code>"}` and
 * `accountScopedFetch` rethrows the raw body, so without this the UI would show
 * a user `{"error":"stale_permit"}`. Wallet rejections arrive as provider
 * errors instead and get their own calm phrasing — declining a signature is a
 * choice, not a fault.
 */
export function explainAccountError(cause: unknown): string {
  const raw = cause instanceof Error ? cause.message : String(cause);

  if (/user rejected|user denied|rejected the request|4001/i.test(raw)) {
    return "Signature declined — nothing changed.";
  }

  let code = raw;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "error" in parsed) {
      code = String((parsed as { error: unknown }).error);
    }
  } catch {
    // Not JSON — fall through and match the bare text.
  }

  if (code.startsWith("bad_permit")) {
    return "That authorization was malformed. Try again.";
  }
  if (/authentication required/i.test(code)) {
    return "Sign in to see your account.";
  }
  switch (code) {
    case "stale_permit":
      // The version CAS lost — someone (or another tab) committed first.
      return "This wallet changed while you were signing. Reload and try again.";
    case "wrong_signer":
      return "That signature came from a wallet not linked to this account.";
    case "missing_delegated_grant":
      return "No active delegation grant backs this wallet yet.";
    case "mode_illegal_for_provider":
      return "This wallet's provider can't hold that signing mode.";
    case "unknown_wallet":
      return "This wallet isn't linked to your account.";
    case "forbidden":
      return "You're not authorized to change this wallet.";
    case "already_bound":
      return "This wallet is already linked.";
    case "bad_mode":
      return "Unsupported signing mode.";
    case "internal":
      return "The server hit an error. Try again shortly.";
    default:
      return raw || "Something went wrong.";
  }
}

export function shortenAddress(address: string): string {
  // Fixtures already ship elided; only shorten what's actually a full address.
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
