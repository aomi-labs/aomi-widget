"use client";

import type { AomiAccount } from "../types";

export function buildAdapterAccounts({
  accounts,
  transformAccounts,
  canManageAccount,
}: {
  accounts: AomiAccount[];
  transformAccounts?: (accounts: AomiAccount[]) => AomiAccount[];
  canManageAccount?: (account: AomiAccount) => boolean;
}): AomiAccount[] {
  const transformed = transformAccounts
    ? transformAccounts(accounts)
    : accounts;
  if (!canManageAccount) return transformed;
  return transformed.map((account) =>
    canManageAccount(account) ? { ...account, manageable: true } : account,
  );
}
