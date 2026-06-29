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

/** One chain "leg" of a wallet entry. */
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
      iconProvider: account.provider,
      legs: [
        {
          family: account.family,
          address: account.address,
          chainId: account.chainId ?? linkedWallet?.chainId,
          capability: account.capability ?? linkedWallet?.capability,
          linked: account.linked ?? Boolean(linkedWallet),
        },
      ],
    };
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
  return accounts.map((account) => [account]);
}

export function buildAccountAccessEntries(
  linkedAccounts: readonly LinkedAccountRow[],
  wallets: readonly LinkedWalletRow[],
): AccountAccessEntries {
  return {
    standaloneAccounts: [...linkedAccounts],
    standaloneWallets: wallets.filter(
      (wallet) => providerBackedAccountProvider(wallet) === null,
    ),
  };
}
