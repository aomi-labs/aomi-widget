import { formatWalletProvider } from "../../lib/wallet-kit";
import type { AomiWalletKit, WalletFamily } from "../../lib/wallet-kit/types";

export type WalletModalRow = NonNullable<
  AomiWalletKit["walletModalRows"]
>[number];
export type LinkedAccountRow = NonNullable<
  AomiWalletKit["accountLinkedAccounts"]
>[number];
export type LinkedWalletRow = NonNullable<
  AomiWalletKit["accountWallets"]
>[number];

/**
 * One chain "leg" of a consolidated entry. A provider-backed account can
 * contribute one EVM and one SVM leg under the same row instead of showing as
 * separate cards.
 */
export type WalletLeg = {
  family: WalletFamily;
  address?: string;
  chainId?: number;
  capability?: "read" | "write";
  linked?: boolean;
};

export type ConnectedEntry = {
  key: string;
  title: string;
  iconId: string;
  iconLabel: string;
  iconProvider?: string;
  legs: WalletLeg[];
};

export type AccountAccessEntries = {
  providerEntries: { account: LinkedAccountRow; wallets: LinkedWalletRow[] }[];
  standaloneAccounts: LinkedAccountRow[];
  standaloneWallets: LinkedWalletRow[];
};

const FAMILY_ORDER: Record<string, number> = { evm: 0, svm: 1 };

export function familyLabel(family: WalletFamily): string {
  return family === "svm" ? "Solana" : "Ethereum";
}

export function familyRank(family: WalletFamily): number {
  return FAMILY_ORDER[family] ?? 2;
}

export function sortWalletLegs<T extends { family: WalletFamily }>(
  legs: readonly T[],
): T[] {
  return [...legs].sort((a, b) => familyRank(a.family) - familyRank(b.family));
}

export function sameWalletAddress(
  family: WalletFamily,
  left?: string,
  right?: string,
): boolean {
  if (!left || !right) return false;
  return family === "evm"
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
}

export function providerBackedAccountProvider(input: {
  provider?: string;
  kind?: string;
  linkedVia?: string;
  walletKind?: string;
  source?: string;
}): string | null {
  if (!input.provider) return null;
  if (input.linkedVia === "siwe" || input.linkedVia === "siws") return null;
  const walletKind = input.walletKind ?? input.kind;
  if (walletKind === "embedded" || walletKind === "smart_account") {
    return input.provider;
  }
  if (input.source === "live" && walletKind == null) return input.provider;
  return input.source === "embedded" ? input.provider : null;
}

export function buildConnectedEntries(
  accounts: readonly WalletModalRow[],
  wallets: readonly LinkedWalletRow[],
): ConnectedEntry[] {
  const byKey = new Map<string, ConnectedEntry>();
  const order: string[] = [];
  for (const account of accounts) {
    const provider = providerBackedAccountProvider(account);
    const groupKey =
      provider !== null ? `provider:${provider}` : `row:${account.id}`;
    const linkedWallet = account.linked
      ? wallets.find((wallet) =>
          sameWalletAddress(wallet.family, wallet.address, account.address),
        )
      : undefined;
    const leg: WalletLeg = {
      family: account.family,
      address: account.address,
      chainId: account.chainId,
      capability: account.capability ?? linkedWallet?.capability,
      linked: account.linked,
    };
    let entry = byKey.get(groupKey);
    if (!entry) {
      const title =
        provider !== null
          ? (formatWalletProvider(provider) ?? provider)
          : (account.walletName ?? familyLabel(account.family));
      entry = {
        key: groupKey,
        title,
        iconId: provider !== null ? provider : account.id,
        iconLabel: title,
        iconProvider: account.provider,
        legs: [],
      };
      byKey.set(groupKey, entry);
      order.push(groupKey);
    }
    entry.legs.push(leg);
  }
  return order.map((key) => {
    const entry = byKey.get(key)!;
    return { ...entry, legs: sortWalletLegs(entry.legs) };
  });
}

export function connectedLinkState(legs: readonly WalletLeg[]): string {
  if (legs.length > 0 && legs.every((leg) => leg.linked)) return "Linked";
  const anyEvmUnlinked = legs.some(
    (leg) => leg.family === "evm" && !leg.linked,
  );
  return anyEvmUnlinked ? "Verify to link" : "Connected only";
}

export function groupConnectedByProvider(
  accounts: readonly WalletModalRow[],
): WalletModalRow[][] {
  const byKey = new Map<string, WalletModalRow[]>();
  const order: string[] = [];
  for (const account of accounts) {
    const provider = providerBackedAccountProvider(account);
    const key =
      provider !== null ? `provider:${provider}` : `row:${account.id}`;
    let group = byKey.get(key);
    if (!group) {
      group = [];
      byKey.set(key, group);
      order.push(key);
    }
    group.push(account);
  }
  return order.map((key) => sortWalletLegs(byKey.get(key)!));
}

export function buildAccountAccessEntries(
  linkedAccounts: readonly LinkedAccountRow[],
  wallets: readonly LinkedWalletRow[],
): AccountAccessEntries {
  const consumedWalletIds = new Set<string>();
  const consumedAccountIds = new Set<string>();
  const providerEntries: AccountAccessEntries["providerEntries"] = [];

  for (const account of linkedAccounts) {
    const provider = account.provider;
    if (!provider) continue;
    const matched = wallets.filter(
      (wallet) =>
        providerBackedAccountProvider(wallet) === provider &&
        !consumedWalletIds.has(wallet.id),
    );
    if (matched.length === 0) continue;
    matched.forEach((wallet) => consumedWalletIds.add(wallet.id));
    consumedAccountIds.add(account.id);
    providerEntries.push({ account, wallets: matched });
  }

  return {
    providerEntries,
    standaloneAccounts: linkedAccounts.filter(
      (account) => !consumedAccountIds.has(account.id),
    ),
    standaloneWallets: wallets.filter(
      (wallet) => !consumedWalletIds.has(wallet.id),
    ),
  };
}
