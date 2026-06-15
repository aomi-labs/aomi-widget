"use client";

import { formatAddress } from "./identity";
import type { AomiAccount } from "./types";

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

const GENERIC_WALLET_NAMES = new Set(["", "injected", "browser wallet", "wallet"]);

/** A real brand name beats a generic injected label when picking the display row. */
function isRealBrandName(name: string | undefined): boolean {
  return !GENERIC_WALLET_NAMES.has((name ?? "").trim().toLowerCase());
}

export function buildAccounts(input: {
  evmConnections: readonly EvmConnectionInput[];
  activeEvmAddress?: string;
  activeEvmConnectionId?: string;
  solanaConnections?: readonly SolanaConnectionInput[];
  activeSolanaAddress?: string;
}): AomiAccount[] {
  const accounts: AomiAccount[] = [];
  const active = input.activeEvmAddress?.toLowerCase();
  const activeConnId = input.activeEvmConnectionId;

  // Group EVM connections by lowercased address so one address yields one row,
  // regardless of how many connectors expose it (e.g. Rabby impersonating
  // MetaMask via EIP-6963). Preserve first-seen order.
  const evmGroups = new Map<string, EvmConnectionInput[]>();
  for (const conn of input.evmConnections) {
    const key = conn.address.toLowerCase();
    const group = evmGroups.get(key);
    if (group) group.push(conn);
    else evmGroups.set(key, [conn]);
  }

  for (const [lowerAddr, conns] of evmGroups) {
    const activeConn = activeConnId
      ? conns.find((c) => c.id === activeConnId)
      : undefined;
    const display =
      activeConn ??
      conns.find((c) => isRealBrandName(c.walletName)) ??
      conns[0];
    const isActive = activeConnId
      ? conns.some((c) => c.id === activeConnId)
      : !!active && lowerAddr === active;

    accounts.push({
      id: (activeConn ?? display).id,
      family: "evm",
      address: display.address,
      label: formatAddress(display.address),
      walletName: display.walletName,
      chainId: display.chainId,
      connectorIds: conns.map((c) => c.id),
      active: isActive,
    });
  }

  const seenSolana = new Set<string>();
  for (const connection of input.solanaConnections ?? []) {
    const key = connection.publicKey.toLowerCase();
    if (seenSolana.has(key)) continue;
    seenSolana.add(key);
    accounts.push({
      id: connection.id ?? connection.walletName ?? connection.publicKey,
      family: "svm",
      address: connection.publicKey,
      label: formatAddress(connection.publicKey),
      walletName: connection.walletName,
      active: connection.publicKey === input.activeSolanaAddress,
    });
  }

  return accounts;
}
