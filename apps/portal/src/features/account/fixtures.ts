/**
 * STUB DATA — settings redesign (see docs/SETTINGS-REDESIGN-GAPS.md).
 * Wallet rows: GET /api/account/wallets + /api/account identities.
 * Grants: needs a listing endpoint over `delegated_approval`.
 * Mode changes: permit ceremony via /api/account/authorization/*.
 */
import type { DelegationGrant, WalletPolicy } from "./types";

/**
 * Wallet ACL fixtures — one row per `public_keys` record. Chosen to exercise
 * every reconciliation state: self-custody, provider-embedded manual,
 * auto reconciled (live grant), and auto drifted (grant expired).
 */
export const seedWalletPolicies: WalletPolicy[] = [
  {
    id: "w-siwe",
    chain: "evm",
    address: "0x71C7…3E2a",
    linkedVia: "siwe",
    rdns: "io.metamask",
    primary: true,
    desiredMode: "client_auto",
    authVersion: 2,
    lastPermit: "you · Jul 12",
  },
  {
    id: "w-siws",
    chain: "svm",
    address: "9xQm…4kZ7",
    linkedVia: "siws",
    rdns: "app.phantom",
    desiredMode: "manual",
    authVersion: 1,
    lastPermit: "you · Jul 9",
  },
  {
    id: "w-privy",
    chain: "svm",
    address: "8xKn…9QpS",
    linkedVia: "privy",
    desiredMode: "auto",
    grantActive: true,
    grantExpiresLabel: "Aug 3, 2026",
    authVersion: 4,
    lastPermit: "you · Jul 20",
  },
  {
    id: "w-para",
    chain: "evm",
    address: "0x9f2B…A41c",
    linkedVia: "para",
    desiredMode: "auto",
    grantActive: false,
    grantExpiresLabel: "expired Jul 18",
    authVersion: 3,
    lastPermit: "you · Jul 2",
  },
  {
    // Deactivated-but-owned: a Privy wallet you froze. Still Privy, still keyed
    // — flip its mode to reactivate, no re-proof needed.
    id: "w-privy-locked",
    chain: "evm",
    address: "0x2E9a…B73c",
    linkedVia: "privy",
    desiredMode: "denied",
    authVersion: 2,
    lastPermit: "you · Jul 15",
  },
];

export const seedGrants: DelegationGrant[] = [
  {
    id: "g-privy",
    provider: "Privy",
    scope: "Solana · 8xKn…9QpS",
    kind: "session delegation",
    status: "active",
    expiresLabel: "Aug 3, 2026",
  },
  {
    id: "g-para",
    provider: "Para",
    scope: "Ethereum · 0x9f2B…A41c",
    kind: "session delegation",
    status: "expired",
    expiresLabel: "Jul 18, 2026",
  },
];
