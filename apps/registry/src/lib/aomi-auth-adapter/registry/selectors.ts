import { buildAccounts } from "../accounts";
import type { AomiAccount, WalletFamily } from "../types";
import { resolveGracefulEvmIdentity } from "../runtime/evm/identity-grace";
import { EVM_IDENTITY_GRACE_MS } from "./types";
import type {
  ActiveRef,
  RegistryConnection,
  WalletRegistryState,
} from "./types";

export function selectActiveEvm(
  state: WalletRegistryState,
): ActiveRef | undefined {
  return state.activeByFamily.evm;
}

export function selectSolana(
  state: WalletRegistryState,
): RegistryConnection | undefined {
  const active = state.activeByFamily.solana;
  if (active) {
    return state.connections.find(
      (connection) =>
        connection.family === "solana" &&
        connection.address === active.address &&
        (!active.uid || connection.uid === active.uid),
    );
  }
  return state.connections.find((connection) => connection.family === "solana");
}

function findActiveConnection(
  state: WalletRegistryState,
  family: WalletFamily,
): RegistryConnection | undefined {
  const active = state.activeByFamily[family];
  if (!active) return undefined;
  return state.connections.find((connection) => {
    if (connection.family !== family) return false;
    if (active.uid && connection.uid === active.uid) return true;
    if (active.stableId && connection.stableId !== active.stableId) {
      return false;
    }
    const left =
      family === "evm" ? connection.address.toLowerCase() : connection.address;
    const right =
      family === "evm" ? active.address.toLowerCase() : active.address;
    return left === right;
  });
}

export function selectEvmIdentity(
  state: WalletRegistryState,
  now: number,
  selectedChainId?: number,
): {
  address?: string;
  chainId?: number;
  connectorId?: string;
  walletName?: string;
} {
  const activeConnection = findActiveConnection(state, "evm");
  const current = activeConnection
    ? {
        address: activeConnection.address,
        chainId: activeConnection.chainId,
        connectorId: activeConnection.uid,
        walletName: activeConnection.walletName,
      }
    : {};
  const explicitDisconnect = Boolean(
    state.evmGrace.last?.address &&
      state.intents.droppedAddresses.includes(
        state.evmGrace.last.address.toLowerCase(),
      ),
  );

  return resolveGracefulEvmIdentity({
    current,
    previous: state.evmGrace.last,
    selectedChainId,
    disconnectedAt: state.evmGrace.disconnectedAt,
    now,
    graceMs: EVM_IDENTITY_GRACE_MS,
    explicitDisconnect,
  }).identity;
}

export function selectAccounts(
  state: WalletRegistryState,
  now: number,
  selectedChainId?: number,
): AomiAccount[] {
  const activeEvm = state.activeByFamily.evm;
  const evmIdentity = selectEvmIdentity(state, now, selectedChainId);
  const evmConnections = state.connections
    .filter((connection) => connection.family === "evm")
    .map((connection) => ({
      id: connection.uid,
      walletName: connection.walletName ?? connection.stableId,
      address: connection.address,
      chainId: connection.chainId,
    }));

  if (evmIdentity.address && evmConnections.length === 0) {
    evmConnections.push({
      id: evmIdentity.connectorId ?? "cached-evm",
      walletName: evmIdentity.walletName ?? "Wallet",
      address: evmIdentity.address,
      chainId: evmIdentity.chainId,
    });
  }

  const solana = selectSolana(state);
  return buildAccounts({
    evmConnections,
    activeEvmAddress: evmIdentity.address,
    activeEvmConnectionId: activeEvm?.uid ?? evmIdentity.connectorId,
    solanaConnections: solana
      ? [{ id: solana.uid, publicKey: solana.address, walletName: solana.walletName }]
      : [],
    activeSolanaAddress: solana?.address,
  });
}
