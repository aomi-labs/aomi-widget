import type { DelegationGrant, LinkedVia, SignerMode, WalletPolicy } from "./types";
import { shortenAddress } from "./account-api";

export const SIGNER_MODES: { id: SignerMode; label: string; hint: string }[] = [
  {
    id: "manual",
    label: "Manual",
    hint: "You approve every transaction in your wallet. Nothing signs without you.",
  },
  {
    id: "client_auto",
    label: "Auto-approve",
    hint: "Your wallet auto-signs each transaction. Aomi never holds the key.",
  },
  {
    id: "auto",
    label: "Aomi auto",
    hint: "Aomi signs on your behalf for scheduled and background actions. Requires an active provider grant.",
  },
  {
    id: "denied",
    label: "Locked",
    hint: "This wallet cannot sign until you change the setting.",
  },
];

const BRANDS: Record<string, string> = {
  "io.metamask": "MetaMask",
  "io.rabby": "Rabby",
  "com.coinbase.wallet": "Coinbase",
  "app.phantom": "Phantom",
  "app.backpack": "Backpack",
};

const RDNS_MARK_KEYS: Record<string, string> = {
  "io.metamask": "metamask",
  "io.rabby": "rabby",
  "com.coinbase.wallet": "coinbase",
  "app.phantom": "phantom",
  "app.backpack": "backpack",
};

const EMBEDDED_PROVIDERS: Partial<Record<LinkedVia, string>> = {
  privy: "Privy",
  para: "Para",
};

type Custody = "self" | "embedded";

export type Recon =
  | { status: "reconciled"; detail: string }
  | { status: "drifted"; detail: string; action: string };

export function modeLabel(mode: SignerMode): string {
  return SIGNER_MODES.find((m) => m.id === mode)?.label ?? mode;
}

export function walletMarkKey(wallet: WalletPolicy): string | null {
  if (wallet.rdns && RDNS_MARK_KEYS[wallet.rdns]) return RDNS_MARK_KEYS[wallet.rdns]!;
  if (wallet.linkedVia === "para") return "para";
  if (wallet.linkedVia === "privy") return "privy";
  return null;
}

/** Map adapter wallet names (e.g. "Rabby") to brand mark keys. */
export function walletNameToMarkKey(name?: string): string | null {
  if (!name) return null;
  const key = name.toLowerCase().replace(/\s+wallet$/, "").replace(/\s+/g, "");
  if (RDNS_MARK_KEYS[`io.${key}`]) return key;
  const aliases: Record<string, string> = {
    metamask: "metamask",
    rabby: "rabby",
    coinbase: "coinbase",
    coinbasewallet: "coinbase",
    phantom: "phantom",
    backpack: "backpack",
    rainbow: "rainbow",
    walletconnect: "walletconnect",
    para: "para",
    privy: "privy",
  };
  return aliases[key] ?? null;
}

export function walletDisplayName(wallet: WalletPolicy): string {
  if (wallet.rdns && BRANDS[wallet.rdns]) return BRANDS[wallet.rdns]!;
  const embedded = EMBEDDED_PROVIDERS[wallet.linkedVia];
  if (embedded) return embedded;
  if (wallet.linkedVia === "siwe" || wallet.linkedVia === "siws") {
    return "Self-custody";
  }
  return wallet.linkedVia.toUpperCase();
}

function custodyOf(v: LinkedVia): Custody {
  return v === "siwe" || v === "siws" ? "self" : "embedded";
}

export function walletGroupKey(wallet: WalletPolicy): Custody {
  return custodyOf(wallet.linkedVia);
}

export const CUSTODY_GROUPS: { key: Custody; label: string }[] = [
  { key: "self", label: "Self-custody wallets" },
  { key: "embedded", label: "Embedded wallets" },
];

/**
 * Which modes this wallet may hold — backend truth wins where the wire carries it.
 */
export function modeValidFor(wallet: WalletPolicy, mode: SignerMode): boolean {
  if (wallet.providerManaged) return mode === "auto" || mode === "denied";
  if (mode === "denied" || mode === "manual") return true;
  if (mode === "client_auto") return true;
  return wallet.canUseAuto ?? custodyOf(wallet.linkedVia) === "embedded";
}

export function unavailableReason(wallet: WalletPolicy, mode: SignerMode): string {
  if (wallet.providerManaged) {
    return "This is a provider-managed signer — you hold no key for it.";
  }
  if (mode === "auto") return "Only available on embedded wallets (Para or Privy).";
  if (mode === "client_auto") return "Only available on self-custody wallets.";
  return "Not available for this wallet.";
}

export function reconcile(wallet: WalletPolicy): Recon {
  switch (wallet.desiredMode) {
    case "denied":
      return { status: "reconciled", detail: "Locked. This wallet cannot sign." };
    case "manual":
      return { status: "reconciled", detail: "You approve every transaction." };
    case "client_auto":
      return { status: "reconciled", detail: "Your wallet auto-signs each transaction." };
    case "auto":
      return wallet.grantActive
        ? {
            status: "reconciled",
            detail: `Grant valid to ${wallet.grantExpiresLabel ?? "—"}.`,
          }
        : {
            status: "drifted",
            detail: "Aomi auto is set, but the provider grant expired.",
            action: "Renew grant",
          };
  }
}

export function findGrantForWallet(
  grants: DelegationGrant[],
  wallet: WalletPolicy,
): DelegationGrant | undefined {
  const short = shortenAddress(wallet.address);
  return grants.find(
    (g) =>
      g.scope.includes(wallet.address) ||
      g.scope.includes(short) ||
      (wallet.provider !== undefined && g.providerKey === wallet.provider),
  );
}

export function walletStatusLabel(
  wallet: WalletPolicy,
  recon: Recon,
  pending: boolean,
): string {
  if (pending) return "Awaiting signature";
  if (recon.status === "drifted") return "Grant expired";
  if (wallet.desiredMode === "auto" && wallet.grantActive) {
    return `Grant valid to ${wallet.grantExpiresLabel ?? "—"}`;
  }
  return modeLabel(wallet.desiredMode);
}

export function sortWallets(wallets: WalletPolicy[]): WalletPolicy[] {
  return [...wallets].sort((a, b) => {
    const aDrift = reconcile(a).status === "drifted" ? 0 : 1;
    const bDrift = reconcile(b).status === "drifted" ? 0 : 1;
    if (aDrift !== bDrift) return aDrift - bDrift;
    if (a.primary && !b.primary) return -1;
    if (!a.primary && b.primary) return 1;
    return 0;
  });
}
