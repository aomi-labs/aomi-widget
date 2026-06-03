"use client";

import { formatAddress } from "./identity";
import type { AomiAccount, WalletFamily } from "./types";

export type EvmConnectionInput = {
  id: string;
  identityWalletId?: number;
  walletName: string;
  address: string;
  chainId?: number;
};

export type SolanaConnectionInput = {
  id?: string;
  identityWalletId?: number;
  publicKey: string;
  walletName?: string;
};

export function buildAccounts(input: {
  evmConnections: readonly EvmConnectionInput[];
  activeEvmAddress?: string;
  solanaConnections?: readonly SolanaConnectionInput[];
  activeSolanaAddress?: string;
}): AomiAccount[] {
  const accounts: AomiAccount[] = [];
  const active = input.activeEvmAddress?.toLowerCase();

  for (const conn of input.evmConnections) {
    accounts.push({
      id: conn.id,
      identityWalletId: conn.identityWalletId,
      family: "evm",
      address: conn.address,
      label: formatAddress(conn.address),
      walletName: conn.walletName,
      active: !!active && conn.address.toLowerCase() === active,
    });
  }

  for (const connection of input.solanaConnections ?? []) {
    accounts.push({
      id: connection.id ?? connection.walletName ?? connection.publicKey,
      identityWalletId: connection.identityWalletId,
      family: "solana",
      address: connection.publicKey,
      label: formatAddress(connection.publicKey),
      walletName: connection.walletName,
      active: connection.publicKey === input.activeSolanaAddress,
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
