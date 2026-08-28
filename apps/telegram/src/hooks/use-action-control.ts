"use client";

import { useCallback, useEffect, useMemo } from "react";
import { createParaViemClientHook } from "@getpara/react-core/evm/viem";
import {
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
  walletCapabilities,
  type Action,
  type EvmWallet,
  type Session,
} from "@aomi-labs/client";
import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  isHex,
  type Hex,
} from "viem";

import { actionChain, errorMessage } from "@/lib/action";

export type ActionControl = {
  error: string | null;
  status: "idle" | "preparing" | "review" | "awaiting_wallet" | "done" | "error";
  approve: () => void;
  reject: () => void;
};

const useEmbeddedParaViemClient = createParaViemClientHook();

export function useActionControl(input: {
  action: Action | null;
  session: Session | null;
}): ActionControl {
  const chain = actionChain(input.action);
  const { viemClient } = useEmbeddedParaViemClient({
    walletClientConfig: {
      chain,
      transport: http(chain.rpcUrls.default.http[0]),
    },
  });
  const capabilities = useMemo(() => {
    if (!viemClient?.account) return {};
    const account = viemClient.account;
    const wallet: EvmWallet = {
      address: account.address,
      chainId: chain.id,
      sendTransaction: async ({ chainId, to, data, value }) => {
        if (chainId !== chain.id) throw new Error("wrong_chain");
        if (!isAddress(to) || (data !== undefined && !isHex(data))) {
          throw new Error("invalid_transaction");
        }
        const transactionId: Hex = await viemClient.sendTransaction({
          account,
          chain,
          data: data as Hex | undefined,
          to: getAddress(to),
          value: value ? BigInt(value) : undefined,
        });
        const receipt = await createPublicClient({
          chain,
          transport: http(chain.rpcUrls.default.http[0]),
        }).waitForTransactionReceipt({ hash: transactionId });
        if (receipt.status !== "success")
          throw new Error("transaction_reverted");
        return transactionId;
      },
      signMessage: async ({ message, chainId }) => {
        if (chainId && chainId !== chain.id) throw new Error("wrong_chain");
        const request = toViemSignMessageArgs({ non_typed_data: message });
        if (!request) throw new Error("invalid_signature_payload");
        return viemClient.signMessage({ account, ...request });
      },
      signTypedData: async ({ typedData, chainId }) => {
        if (chainId && chainId !== chain.id) throw new Error("wrong_chain");
        const request = toViemSignTypedDataArgs({ typed_data: typedData });
        if (!request?.message) throw new Error("invalid_signature_payload");
        const { message, ...rest } = request;
        return viemClient.signTypedData({ account, ...rest, message });
      },
    };
    return walletCapabilities({ evm: wallet });
  }, [chain, viemClient]);

  useEffect(() => {
    input.session?.actions.setCapabilities(capabilities);
  }, [capabilities, input.session]);

  const approve = useCallback(() => {
    const action = input.action;
    const handler = input.session?.actions;
    if (!action || !handler || !handler.canExecute(action.id)) return;
    void handler.execute(action.id).catch(() => undefined);
  }, [input.action, input.session]);

  const reject = useCallback(() => {
    const action = input.action;
    const handler = input.session?.actions;
    if (!action || !handler) return;
    void handler
      .reject(action.id, "Declined in the Telegram Mini App.")
      .catch(() => undefined);
  }, [input.action, input.session]);

  const action = input.action;
  const handler = input.session?.actions;
  const attempt = action
    ? input.session?.getSnapshot().actionAttempts.get(action.id)
    : undefined;
  const status: ActionControl["status"] = !action || !handler
    ? "idle"
    : attempt?.state === "failed"
      ? "error"
      : attempt?.state === "executing" || attempt?.state === "responding"
        ? "awaiting_wallet"
        : action.state !== "pending"
          ? "done"
          : !viemClient?.account
            ? "preparing"
            : handler.canExecute(action.id)
              ? "review"
              : "error";

  return {
    error:
      attempt?.state === "failed"
        ? errorMessage(attempt.error)
        : status === "error"
          ? "unsupported_action"
          : null,
    status,
    approve,
    reject,
  };
}
