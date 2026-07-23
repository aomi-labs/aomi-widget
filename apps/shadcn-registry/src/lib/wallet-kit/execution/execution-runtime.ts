"use client";

import {
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
} from "@aomi-labs/react";
import type { EvmExecutionRuntime } from "../composer/types";
import type { EvmWalletRuntime } from "../runtime/evm/wallet-runtime";
import {
  executeWalletKitTransaction,
  getPreferredRpcUrl,
} from "./wallet-execution";

/**
 * Map a shared `EvmWalletRuntime` into the composer's `EvmExecutionRuntime`
 * shape. Every provider lane (Para, Privy, wallets-only) passes the same dozen
 * wagmi passthrough fields; the only differences are provider-specific
 * `overrides` (AA owner resolution, smart-wallet send/sign), so they spread on
 * top. Keeps the signing surface in one place instead of three copies.
 */
export function buildEvmExecutionRuntime(
  evm: EvmWalletRuntime,
  overrides?: Partial<EvmExecutionRuntime>,
): EvmExecutionRuntime {
  const runtime: EvmExecutionRuntime = {
    activeConnector: evm.activeConnector,
    capabilities: evm.capabilities,
    chainsById: evm.chainsById,
    currentChainId: evm.activeEvmConnection?.chainId,
    getWalletClientFor: evm.getWalletClientFor,
    sendCallsSyncAsync: evm.sendCallsSyncAsync,
    sendTransactionAsync: evm.sendTransactionAsync,
    shouldUseExternalSigner: evm.shouldUseExternalSigner,
    signMessageAsync: evm.signMessageAsync,
    signTypedDataAsync: evm.signTypedDataAsync,
    switchChainAsync: evm.switchChainAsync,
    walletClient: evm.walletClient,
    ...overrides,
  };
  const shouldUseExternalSignerForAA =
    runtime.aaOwner === "provider-session"
      ? false
      : runtime.aaOwner === "external-wallet"
        ? true
        : runtime.shouldUseExternalSigner;

  return {
    ...runtime,
    sendTransaction:
      runtime.sendTransaction ??
      (runtime.sendTransactionAsync
        ? async (payload) =>
            executeWalletKitTransaction({
              payload,
              state: {
                currentChainId: runtime.currentChainId,
                capabilities: runtime.capabilities,
                nativeWalletExecution: runtime.nativeWalletExecution,
                sendCallsSyncAsync: runtime.sendCallsSyncAsync
                  ? async (args) =>
                      runtime.sendCallsSyncAsync!({
                        ...args,
                        connector: runtime.activeConnector,
                      })
                  : undefined,
                sendTransactionAsync: async (args) =>
                  runtime.sendTransactionAsync!({
                    ...args,
                    connector: runtime.activeConnector,
                  }),
                switchChainAsync: runtime.switchChainAsync
                  ? async ({ chainId }) =>
                      runtime.switchChainAsync!({
                        chainId,
                        connector: runtime.activeConnector,
                      })
                  : undefined,
                chainsById: runtime.chainsById,
                getPreferredRpcUrl,
              },
              shouldUseExternalSigner: shouldUseExternalSignerForAA,
              resolveAAProviderState: runtime.resolveAAProviderState
                ? async (params) =>
                    runtime.resolveAAProviderState!(params, {
                      address: evm.identity(Date.now()).address,
                      walletClient: shouldUseExternalSignerForAA
                        ? await runtime.getWalletClientFor({
                            connector: runtime.activeConnector,
                            chainId: params.callList[0]?.chainId,
                          })
                        : runtime.walletClient,
                    })
                : undefined,
              forceAA: runtime.aaPolicy !== "off",
              preferAAForSingleCall: runtime.aaPolicy !== "off",
              aaPolicy: runtime.aaPolicy,
              aaModes: runtime.aaModes,
              aaProvider: runtime.aaProvider,
            })
        : undefined),
    signTypedData:
      runtime.signTypedData ??
      (runtime.signTypedDataAsync
        ? async (payload) => {
            const signArgs = toViemSignTypedDataArgs(payload);
            if (!signArgs) {
              throw new Error("Missing typed_data payload");
            }
            const signature = await runtime.signTypedDataAsync!({
              ...(signArgs as Record<string, unknown>),
              connector: runtime.activeConnector,
            } as never);
            return { signature };
          }
        : undefined),
    signMessage:
      runtime.signMessage ??
      (evm.signMessageForAccount || runtime.signMessageAsync
        ? async (payload) => {
            const messageArgs = toViemSignMessageArgs(payload);
            if (!messageArgs) {
              throw new Error("Missing non_typed_data payload");
            }
            const activeAccountId = evm.activeAccount?.id;
            if (
              activeAccountId &&
              evm.signMessageForAccount &&
              typeof messageArgs.message === "string"
            ) {
              return {
                signature: await evm.signMessageForAccount({
                  accountId: activeAccountId,
                  message: messageArgs.message,
                  chainId: runtime.currentChainId,
                }),
              };
            }
            // The outer guard admits this branch when only
            // `signMessageForAccount` exists but its preconditions above are not
            // met; fail loudly instead of dereferencing an undefined signer.
            if (!runtime.signMessageAsync) {
              throw new Error("No EVM signer available to sign message");
            }
            const signature = await runtime.signMessageAsync({
              ...(messageArgs as Record<string, unknown>),
              connector: runtime.activeConnector,
            } as never);
            return { signature };
          }
        : undefined),
  };
}
