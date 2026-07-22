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

export type ConnectedEntry = {
  key: string;
  title: string;
  iconId: string;
  iconLabel: string;
  iconProvider?: string;
  family: WalletFamily;
  address?: string;
  chainId?: number;
  capability?: "read" | "write";
  linked?: boolean;
};

export type AccountAccessEntries = {
  providerAccounts: ProviderAccountAccessGroup[];
  standaloneAccounts: LinkedAccountRow[];
  standaloneWallets: LinkedWalletRow[];
};

export type ProviderAccountAccessGroup = {
  key: string;
  provider: string;
  accounts: LinkedAccountRow[];
  wallets: LinkedWalletRow[];
};

const FAMILY_ORDER: Record<string, number> = { evm: 0, svm: 1 };

export function familyLabel(family: WalletFamily): string {
  return family === "svm" ? "Solana" : "Ethereum";
}

export function familyRank(family: WalletFamily): number {
  return FAMILY_ORDER[family] ?? 2;
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

export function isProviderAuthProvider(provider?: string): boolean {
  const normalizedProvider = provider?.trim().toLowerCase();
  return normalizedProvider === "para" || normalizedProvider === "privy";
}

export function providerBackedWalletTitle(input: {
  provider?: string;
  walletName?: string;
  family: WalletFamily;
  kind?: string;
  walletKind?: string;
  source?: string;
}): string {
  const provider = providerBackedAccountProvider(input);
  return provider !== null
    ? (formatWalletProvider(provider) ?? provider)
    : (input.walletName ?? familyLabel(input.family));
}

export function buildConnectedEntries(
  accounts: readonly WalletModalRow[],
  wallets: readonly LinkedWalletRow[],
): ConnectedEntry[] {
  return accounts.map((account) => {
    const linkedWallet = account.linked
      ? wallets.find((wallet) =>
          sameWalletAddress(wallet.family, wallet.address, account.address),
        )
      : undefined;
    const provider = providerBackedAccountProvider(account);
    const title = providerBackedWalletTitle(account);
    return {
      key: `row:${account.family}:${account.id}:${account.address ?? ""}`,
      title,
      iconId: provider ?? account.id,
      iconLabel: title,
      iconProvider: provider ?? account.provider,
      family: account.family,
      address: account.address,
      chainId: account.chainId ?? linkedWallet?.chainId,
      capability: account.capability ?? linkedWallet?.capability,
      linked: account.linked ?? Boolean(linkedWallet),
    };
  });
}

export function connectedLinkState(entry: {
  family: WalletFamily;
  linked?: boolean;
}): string {
  if (entry.linked) return "Linked";
  return entry.family === "evm" ? "Verify to link" : "Connected only";
}

export function buildAccountAccessEntries(
  linkedAccounts: readonly LinkedAccountRow[],
  wallets: readonly LinkedWalletRow[],
): AccountAccessEntries {
  const providerAccounts = new Map<string, ProviderAccountAccessGroup>();
  const standaloneAccounts: LinkedAccountRow[] = [];

  for (const account of linkedAccounts) {
    const provider = account.provider.trim().toLowerCase();
    if (!isProviderAuthProvider(provider)) {
      standaloneAccounts.push(account);
      continue;
    }
    const group = providerAccounts.get(provider) ?? {
      key: `provider:${provider}`,
      provider,
      accounts: [],
      wallets: [],
    };
    group.accounts.push(account);
    providerAccounts.set(provider, group);
  }

  const standaloneWallets: LinkedWalletRow[] = [];
  for (const wallet of wallets) {
    const provider = providerBackedAccountProvider(wallet)
      ?.trim()
      .toLowerCase();
    if (provider === undefined || provider === null) {
      standaloneWallets.push(wallet);
      continue;
    }
    if (!isProviderAuthProvider(provider)) continue;

    const group = providerAccounts.get(provider) ?? {
      key: `provider:${provider}`,
      provider,
      accounts: [],
      wallets: [],
    };
    const walletKey = `${wallet.family}:${
      wallet.family === "evm" ? wallet.address.toLowerCase() : wallet.address
    }`;
    const alreadyIncluded = group.wallets.some((candidate) => {
      const candidateKey = `${candidate.family}:${
        candidate.family === "evm"
          ? candidate.address.toLowerCase()
          : candidate.address
      }`;
      return candidateKey === walletKey;
    });
    if (!alreadyIncluded) group.wallets.push(wallet);
    providerAccounts.set(provider, group);
  }

  return {
    providerAccounts: [...providerAccounts.values()],
    standaloneAccounts,
    standaloneWallets,
  };
}
