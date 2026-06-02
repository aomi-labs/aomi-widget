"use client";

import { formatAddress } from "./identity";
import type { AomiAccount, WalletFamily } from "./types";

export type EvmConnectionInput = {
  id: string;
  walletName: string;
  address: string;
  chainId?: number;
};

export type SolanaConnectionInput = {
  id?: string;
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
