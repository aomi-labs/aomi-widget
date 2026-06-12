"use client";

import type { AomiAccount } from "../../types";
import type { WagmiConnectionShape } from "./safe-hooks";
import { canonicalWalletKey } from "./brands";

export type EvmAccountDisconnectPlan = {
  connectorIds: Set<string>;
  isParaAccount: boolean;
  otherConnectionsRemain: boolean;
  sameAddressConnectionsRemain: boolean;
  shouldMarkDroppedAddress: boolean;
  targetAddress: string;
};

export function planEvmAccountDisconnect({
  target,
  connections,
}: {
  target: Pick<AomiAccount, "id" | "address" | "connectorIds" | "walletName">;
  connections: readonly WagmiConnectionShape[];
}): EvmAccountDisconnectPlan {
  const targetAddress = target.address.toLowerCase();
  const isParaAccount = canonicalWalletKey(target.walletName ?? "") === "para";
  const targetConnectorIds = new Set([
    target.id,
    ...(target.connectorIds ?? []),
  ]);
  const connectorIds = new Set<string>();

  for (const connection of connections) {
    if (connection.address.toLowerCase() !== targetAddress) continue;
    if (!targetConnectorIds.has(connection.connectorId)) continue;
    if (
      isParaAccount &&
      canonicalWalletKey(connection.connectorName) !== "para"
    ) {
      continue;
    }
    connectorIds.add(connection.connectorId);
  }

  if (connectorIds.size === 0) {
    connectorIds.add(target.id);
  }

  const remainingConnections = connections.filter(
    (connection) => !connectorIds.has(connection.connectorId),
  );
  const sameAddressConnectionsRemain = remainingConnections.some(
    (connection) => connection.address.toLowerCase() === targetAddress,
  );

  return {
    connectorIds,
    isParaAccount,
    otherConnectionsRemain: remainingConnections.length > 0,
    sameAddressConnectionsRemain,
    shouldMarkDroppedAddress: !sameAddressConnectionsRemain,
    targetAddress,
  };
}
