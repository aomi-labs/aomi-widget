"use client";

import { formatAddress } from "./identity";
import type { AomiAccount, WalletFamily } from "./types";

export type EvmConnectionInput = {
  id: string;
  walletName: string;
  address: string;
  chainId?: number;
};

export function buildAccounts(input: {
  evmConnections: readonly EvmConnectionInput[];
  activeEvmAddress?: string;
  solana?: { publicKey?: string; walletName?: string };
}): AomiAccount[] {
  const accounts: AomiAccount[] = [];
  const active = input.activeEvmAddress?.toLowerCase();

  for (const conn of input.evmConnections) {
    accounts.push({
      id: conn.id,
      family: "evm",
      address: conn.address,
      label: formatAddress(conn.address),
      walletName: conn.walletName,
      active: !!active && conn.address.toLowerCase() === active,
    });
  }

  if (input.solana?.publicKey) {
    accounts.push({
      id: input.solana.walletName ?? input.solana.publicKey,
      family: "solana",
      address: input.solana.publicKey,
      label: formatAddress(input.solana.publicKey),
      walletName: input.solana.walletName,
      active: true,
    });
  }

  return accounts;
}

export function isAccountSelectable(
  account: AomiAccount,
  activeFamily: WalletFamily,
): boolean {
  return account.family === activeFamily;
}
