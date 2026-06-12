"use client";

import type { AomiAccount } from "../types";
import type { AccountWallet } from "../account/types";

export function buildAdapterAccounts({
  accounts,
  accountWallets = [],
  transformAccounts,
  canManageAccount,
}: {
  accounts: AomiAccount[];
  accountWallets?: readonly AccountWallet[];
  transformAccounts?: (accounts: AomiAccount[]) => AomiAccount[];
  canManageAccount?: (account: AomiAccount) => boolean;
}): AomiAccount[] {
  const linked = applyStoredWalletLinks(accounts, accountWallets);
  const transformed = transformAccounts ? transformAccounts(linked) : linked;
  if (!canManageAccount) return transformed;
  return transformed.map((account) =>
    canManageAccount(account) ? { ...account, manageable: true } : account,
  );
}

function applyStoredWalletLinks(
  accounts: AomiAccount[],
  wallets: readonly AccountWallet[],
): AomiAccount[] {
  if (wallets.length === 0) return accounts;
  const storedByKey = new Map(
    wallets.map((wallet) => [walletKey(wallet.family, wallet.address), wallet]),
  );
  return accounts.map((account) => {
    const stored = storedByKey.get(walletKey(account.family, account.address));
    if (!stored) return account;
    return {
      ...account,
      linked: true,
      linkedVia: stored.linkedVia,
      capability: stored.capability,
    };
  });
}

function walletKey(family: AomiAccount["family"], address: string): string {
  return `${family}:${address.toLowerCase()}`;
}
