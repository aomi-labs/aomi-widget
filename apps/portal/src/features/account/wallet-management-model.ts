import type {
  AccountWallet,
  AomiAccount,
  LinkedAuthAccount,
} from "@aomi-labs/widget-lib";
import type { WalletPolicy } from "./types";

export type UnifiedAccountWallet = {
  key: string;
  family: "evm" | "svm";
  address: string;
  chainId?: number;
  walletName?: string;
  label?: string;
  provider?: string;
  kind?: "external" | "embedded" | "smart_account";
  connected: boolean;
  linked: boolean;
  active: boolean;
  connectedAccountId?: string;
  accountWalletId?: string;
  policy?: WalletPolicy;
};

export type WalletManagementInput = {
  accounts: readonly AomiAccount[];
  linkedWallets: readonly AccountWallet[];
  policies: readonly WalletPolicy[];
};

function walletKey(family: "evm" | "svm", address: string): string {
  return `${family}:${family === "evm" ? address.toLowerCase() : address}`;
}

export function buildUnifiedAccountWallets({
  accounts,
  linkedWallets,
  policies,
}: WalletManagementInput): UnifiedAccountWallet[] {
  const rows = new Map<string, UnifiedAccountWallet>();

  for (const wallet of linkedWallets) {
    const key = walletKey(wallet.family, wallet.address);
    rows.set(key, {
      key,
      family: wallet.family,
      address: wallet.address,
      walletName: wallet.label,
      label: wallet.label,
      provider: wallet.provider,
      kind: wallet.kind,
      connected: false,
      linked: true,
      active: false,
      accountWalletId: wallet.id,
    });
  }

  for (const policy of policies) {
    const key = walletKey(policy.chain, policy.address);
    const current = rows.get(key);
    rows.set(key, {
      key,
      family: policy.chain,
      address: current?.address ?? policy.address,
      walletName: current?.walletName,
      label: current?.label,
      provider: current?.provider ?? policy.provider,
      kind:
        current?.kind ??
        (policy.linkedVia === "para" || policy.linkedVia === "privy"
          ? "embedded"
          : "external"),
      connected: current?.connected ?? false,
      linked: true,
      active: current?.active ?? false,
      connectedAccountId: current?.connectedAccountId,
      accountWalletId: current?.accountWalletId,
      policy,
    });
  }

  for (const account of accounts) {
    if (!account.address) continue;
    const key = walletKey(account.family, account.address);
    const current = rows.get(key);
    rows.set(key, {
      key,
      family: account.family,
      address: account.address,
      chainId: account.chainId ?? current?.chainId,
      walletName: account.walletName ?? current?.walletName,
      label: account.label ?? current?.label,
      provider: account.provider ?? current?.provider,
      kind: account.walletKind ?? current?.kind ?? "external",
      connected: true,
      linked: Boolean(account.linked || current?.linked),
      active: account.active,
      connectedAccountId: account.id,
      accountWalletId: current?.accountWalletId,
      policy: current?.policy,
    });
  }

  return [...rows.values()].sort((left, right) => {
    const rank = (wallet: UnifiedAccountWallet) =>
      wallet.active ? 0 : wallet.connected ? 1 : wallet.linked ? 2 : 3;
    const rankDelta = rank(left) - rank(right);
    if (rankDelta !== 0) return rankDelta;
    if (left.family !== right.family) return left.family === "evm" ? -1 : 1;
    return left.address.localeCompare(right.address);
  });
}

export function visibleSignInMethods(
  accounts: readonly LinkedAuthAccount[],
): LinkedAuthAccount[] {
  return accounts.filter(
    (account) =>
      account.provider !== "better_auth" &&
      account.provider !== "wallet" &&
      account.provider !== "siwe" &&
      account.provider !== "siws",
  );
}

export function isProviderSigningWallet(wallet: WalletPolicy): boolean {
  return wallet.linkedVia === "para" || wallet.linkedVia === "privy";
}
