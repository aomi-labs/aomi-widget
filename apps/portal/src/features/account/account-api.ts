"use client";

/** Canonical account wire layer. Policy and exact-address delegation state are
 * returned together so the ACL view never reconciles two independently-timed
 * snapshots.
 */

import { accountScopedFetch } from "@portal/lib/settings-api";
import type {
  DelegationGrant,
  LinkedVia,
  SignerMode,
  WalletPolicy,
} from "./types";

type ChainKind = "evm" | "svm";
type AccountRecordStatus =
  | "provisioning"
  | "active"
  | "expired"
  | "revoked"
  | "unavailable";

export type OnchainAddress = {
  chain: ChainKind;
  address: string;
};

export type UserAccount = {
  address: OnchainAddress;
  auth_provider?: string | null;
  is_primary: boolean;
  provider_managed: boolean;
};

export type SigningPolicy = {
  address: OnchainAddress;
  mode: string;
  authorization_version: number;
  last_authorized_at?: number;
  last_authorized_by?: OnchainAddress | null;
};

export type DelegatedAccount = {
  id: number;
  address: OnchainAddress;
  delegation_provider: string;
  kind: string;
  status: AccountRecordStatus;
  created_at: number;
  updated_at: number;
  expires_at?: number;
  revoked_at?: number;
  revocation_reason?: string;
};

export type AccountProfile = {
  user_accounts: UserAccount[];
  signing_policies: SigningPolicy[];
  delegated_accounts: DelegatedAccount[];
};

export async function fetchAccountAcl(): Promise<{
  wallets: WalletPolicy[];
  grants: DelegationGrant[];
}> {
  const data = await accountScopedFetch<AccountProfile>("/api/account");
  const owned = new Set(
    data.user_accounts.map((account) => addressKey(account.address)),
  );
  const userAccountsByAddress = new Map(
    data.user_accounts.map((account) => [addressKey(account.address), account]),
  );
  const delegationsByAddress = new Map<string, DelegatedAccount[]>();
  for (const delegation of data.delegated_accounts) {
    const key = addressKey(delegation.address);
    delegationsByAddress.set(key, [
      ...(delegationsByAddress.get(key) ?? []),
      delegation,
    ]);
  }
  return {
    wallets: data.signing_policies.map((policy) =>
      toWalletPolicy(
        policy,
        userAccountsByAddress.get(addressKey(policy.address)),
        delegationsByAddress.get(addressKey(policy.address)) ?? [],
        owned,
      ),
    ),
    grants: data.delegated_accounts.map(toDelegationGrant),
  };
}

function addressKey(address: OnchainAddress): string {
  const value =
    address.chain === "evm" ? address.address.toLowerCase() : address.address;
  return `${address.chain}:${value}`;
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

/** Provision a provider-managed agent wallet (Para auto-signing prerequisite). */
export async function provisionAgentWallet(provider: string): Promise<void> {
  await accountScopedFetch(
    `/api/account/providers/${encodeURIComponent(provider)}/agent-wallet`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

const GRANT_KIND_LABELS: Record<string, string> = {
  session_delegation: "Session delegation",
  agent_delegation: "Agent delegation",
  signing_delegation: "Signing delegation",
};

export function grantKindLabel(kind: string): string {
  return GRANT_KIND_LABELS[kind] ?? kind.replace(/_/g, " ");
}

/**
 * Normalize the kernel's `signing_mode` to the view's `SignerMode`. Only the
 * canonical ladder spellings (`denied → manual → client_auto → server_auto`)
 * are recognized; anything else fail-safes to `manual`.
 */
export function normalizeSignerMode(mode: string): SignerMode {
  switch (mode) {
    case "auto":
    case "server_auto":
      return "auto";
    case "client_auto":
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
function linkedViaOf(
  row: UserAccount | undefined,
  chain: ChainKind,
): LinkedVia {
  const provider = row?.auth_provider?.toLowerCase();
  if (provider === "privy") return "privy";
  if (provider === "para") return "para";
  return chain === "svm" ? "siws" : "siwe";
}

function toWalletPolicy(
  row: SigningPolicy,
  userAccount: UserAccount | undefined,
  delegations: DelegatedAccount[],
  ownedAddresses: Set<string>,
): WalletPolicy {
  const chain = row.address.chain;
  const active = delegations.find(
    (delegation) => delegation.status === "active",
  );
  return {
    id: `${chain}:${row.address.address}`,
    chain,
    address: row.address.address,
    linkedVia: linkedViaOf(userAccount, chain),
    primary: userAccount?.is_primary ?? false,
    desiredMode: normalizeSignerMode(row.mode),
    grantActive: Boolean(active),
    grantExpiresLabel: formatDate(active?.expires_at),
    authVersion: row.authorization_version,
    lastPermit: formatPermit(row, ownedAddresses),
    provider: userAccount?.auth_provider ?? undefined,
    canUseAuto: row.mode === "auto" && Boolean(active),
    providerManaged: userAccount?.provider_managed ?? false,
  };
}

function toDelegationGrant(row: DelegatedAccount): DelegationGrant {
  return {
    id: String(row.id),
    provider: titleCase(row.delegation_provider),
    providerKey: row.delegation_provider,
    scope: grantScope(row),
    kind: grantKindLabel(row.kind),
    status:
      row.status === "provisioning" || row.status === "unavailable"
        ? "expired"
        : row.status,
    expiresLabel:
      row.status === "revoked"
        ? (formatDate(row.revoked_at) ?? "")
        : (formatDate(row.expires_at) ?? "no expiry"),
  };
}

function grantScope(row: DelegatedAccount): string {
  const chain = row.address.chain === "svm" ? "Solana" : "Ethereum";
  return `${chain} · ${shortenAddress(row.address.address)}`;
}

/**
 * "you · Jul 12" when the signer was one of this account's own keys — which is
 * the normal case, since a tighten may be signed by any *linked* key, not only
 * the wallet being changed.
 */
function formatPermit(
  row: SigningPolicy,
  ownedAddresses: Set<string>,
): string | undefined {
  const when = formatDate(row.last_authorized_at);
  if (!when) return undefined;
  const by = row.last_authorized_by;
  if (!by) return when;
  return ownedAddresses.has(addressKey(by))
    ? `you · ${when}`
    : `${shortenAddress(by.address)} · ${when}`;
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
    case "widget_auth_failed":
      return "Couldn’t authenticate your account. Sign in again and retry.";
    default:
      // Transport failures commonly arrive as structured JSON. Never render
      // an unknown server payload verbatim in Settings; it is implementation
      // detail, not an actionable message for the account holder.
      if (code !== raw) {
        return "Couldn’t load your account. Try again shortly.";
      }
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
