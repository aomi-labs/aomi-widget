"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type State = {
  error: string | null;
  status:
    | "idle"
    | "preparing"
    | "review"
    | "awaiting_wallet"
    | "done"
    | "error";
};

export type ActionControl = State & {
  approve: () => void;
  reject: () => void;
};

const useEmbeddedParaViemClient = createParaViemClientHook();

export function useActionControl(input: {
  action: Action | null;
  session: Session | null;
}): ActionControl {
  const [state, setState] = useState<State>({ error: null, status: "idle" });
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

  useEffect(() => {
    const action = input.action;
    const handler = input.session?.actions;
    if (!action || !handler) return;
    if (!handler.canExecute(action.id)) {
      setState({ error: "unsupported_action", status: "error" });
      return;
    }
    setState({ error: null, status: "review" });
  }, [capabilities, input.action, input.session]);

  const approve = useCallback(() => {
    const action = input.action;
    const handler = input.session?.actions;
    if (!action || !handler || !handler.canExecute(action.id)) return;
    setState({ error: null, status: "awaiting_wallet" });
    void handler
      .execute(action.id)
      .then(() => setState({ error: null, status: "done" }))
      .catch((error: unknown) => {
        setState({ error: errorMessage(error), status: "error" });
      });
  }, [input.action, input.session]);

  const reject = useCallback(() => {
    const action = input.action;
    const handler = input.session?.actions;
    if (!action || !handler) return;
    setState({ error: null, status: "awaiting_wallet" });
    void handler
      .reject(action.id, "Declined in the Telegram Mini App.")
      .then(() => setState({ error: null, status: "done" }))
      .catch((error: unknown) => {
        setState({ error: errorMessage(error), status: "error" });
      });
  }, [input.action, input.session]);

  return {
    ...state,
    status:
      state.status === "review" && !viemClient?.account
        ? "preparing"
        : state.status,
    approve,
    reject,
  };
}
