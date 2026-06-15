"use client";

import { useCallback, useMemo } from "react";
import type { AomiAccount } from "../../types";
import { selectAccounts, selectEvmIdentity } from "../../registry/selectors";
import { useWalletRegistry } from "../../registry/use-wallet-registry";
import type { CommandExecutors } from "../../registry/store";
import type { EvmWalletRuntime } from "./wallet-runtime";

const disabledExecutors: CommandExecutors = {
  wagmiReconnect: async () => undefined,
  wagmiConnect: async () => undefined,
  wagmiDisconnect: async () => undefined,
  providerLogout: async () => undefined,
};

function rejectDisabledEvm(): never {
  throw new Error("EVM wallets are disabled for this wallet kit instance.");
}

export function useDisabledEvmWalletRuntime({
  storageKey,
}: {
  storageKey: string;
}): EvmWalletRuntime {
  const { store: registryStore, state: registryState } = useWalletRegistry({
    executors: disabledExecutors,
    storageKey,
  });

  const selectRuntimeAccounts = useCallback(
    (now: number) => selectAccounts(registryState, now, undefined),
    [registryState],
  );
  const selectRuntimeEvmIdentity = useCallback(
    (now: number) => selectEvmIdentity(registryState, now, undefined),
    [registryState],
  );
  const getWalletClientFor = useCallback(async () => null, []);
  const reject = useCallback(async () => rejectDisabledEvm(), []);

  return useMemo(
    () => ({
      registryStore,
      registryState,
      registryEvmConnected: false,
      activeEvmConnection: undefined,
      activeConnector: undefined,
      capabilities: undefined,
      chainsById: {},
      supportedChains: [],
      walletClient: undefined,
      getWalletClientFor,
      sendTransactionAsync: undefined,
      sendCallsSyncAsync: undefined,
      signTypedDataAsync: undefined,
      signMessageAsync: undefined,
      switchChainAsync: undefined,
      isSwitchingChain: false,
      canDisconnectEvm: false,
      evmWalletOptions: [],
      shouldUseExternalSigner: false,
      selectEvmIdentity: selectRuntimeEvmIdentity,
      selectAccounts: selectRuntimeAccounts,
      selectEvmAccount: async (_id: string) => undefined,
      connectEvmWallet: reject,
      disconnectEvmAccount: async (_account: AomiAccount) => undefined,
      switchEvmChain: reject,
    }),
    [
      getWalletClientFor,
      registryState,
      registryStore,
      reject,
      selectRuntimeAccounts,
      selectRuntimeEvmIdentity,
    ],
  );
}
