"use client";

import {
  type WalletAaSignPayload,
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
} from "@aomi-labs/react";
import { serializeSignature, type Address, type Hex } from "viem";
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
 * `overrides` (smart-wallet send/sign), so they spread on top. Keeps the
 * signing surface in one place instead of three copies.
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
  const sendCallsSyncAsync = runtime.sendCallsSyncAsync;
  const sendTransactionAsync = runtime.sendTransactionAsync;
  const signTypedDataAsync = runtime.signTypedDataAsync;
  const switchChainAsync = runtime.switchChainAsync;

  const signAaRequests = async (
    payload: WalletAaSignPayload,
  ): Promise<{ signatures: string[] }> => {
    const active = evm.activeAccount;
    if (
      !active ||
      active.address.toLowerCase() !== payload.signer.toLowerCase()
    ) {
      throw new Error("The active wallet is not the prepared AA owner");
    }
    const walletClient = (await runtime.getWalletClientFor({
      connector: runtime.activeConnector,
      chainId: payload.chain_id,
    })) as {
      signMessage?: (args: unknown) => Promise<Hex>;
      signAuthorization?: (args: unknown) => Promise<{
        r: Hex;
        s: Hex;
        yParity: number;
      }>;
    } | null;
    const signatures: string[] = [];
    for (const request of payload.signature_requests) {
      if (request.kind === "personal_sign") {
        if (walletClient?.signMessage) {
          signatures.push(
            await walletClient.signMessage({
              account: payload.signer as Address,
              // Alchemy's `signatureRequest.data.raw` is bytes, not the
              // textual characters "0x…". Viem must receive the raw form or
              // the recovered signer will not match `rawPayload`.
              message: { raw: request.message as Hex },
            }),
          );
        } else {
          throw new Error("The active wallet cannot sign the AA UserOperation");
        }
      } else {
        if (!walletClient?.signAuthorization) {
          throw new Error(
            "The active wallet does not support EIP-7702 authorization",
          );
        }
        const authorization = await walletClient.signAuthorization({
          account: payload.signer as Address,
          contractAddress: request.contract_address as Address,
          chainId: request.chain_id,
          nonce: request.nonce,
        });
        signatures.push(serializeSignature(authorization));
      }
    }
    return { signatures };
  };

  return {
    ...runtime,
    signAaRequests: runtime.signAaRequests ?? signAaRequests,
    sendTransaction:
      runtime.sendTransaction ??
      (sendTransactionAsync
        ? async (payload) =>
            executeWalletKitTransaction({
              payload,
              state: {
                currentChainId: runtime.currentChainId,
                capabilities: runtime.capabilities,
                nativeWalletExecution: runtime.nativeWalletExecution,
                sendCallsSyncAsync: sendCallsSyncAsync
                  ? async (args) =>
                      sendCallsSyncAsync({
                        ...args,
                        connector: runtime.activeConnector,
                      })
                  : undefined,
                sendTransactionAsync: async (args) =>
                  sendTransactionAsync({
                    ...args,
                    connector: runtime.activeConnector,
                  }),
                switchChainAsync: switchChainAsync
                  ? async ({ chainId }) =>
                      switchChainAsync({
                        chainId,
                        connector: runtime.activeConnector,
                      })
                  : undefined,
                chainsById: runtime.chainsById,
                getPreferredRpcUrl,
              },
            })
        : undefined),
    signTypedData:
      runtime.signTypedData ??
      (signTypedDataAsync
        ? async (payload) => {
            const signArgs = toViemSignTypedDataArgs(payload);
            if (!signArgs) {
              throw new Error("Missing typed_data payload");
            }
            const signature = await signTypedDataAsync({
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
