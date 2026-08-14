"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createParaViemClientHook } from "@getpara/react-core/evm/viem";
import {
  toAAWalletCalls,
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
  type Session,
  type WalletRequest,
  type WalletRequestResult,
} from "@aomi-labs/client";
import { createPublicClient, http, type Hex } from "viem";

import {
  errorMessage,
  requestChain,
  requestedAaMode,
} from "@/lib/wallet-request";

type ExecutionState = {
  error: string | null;
  status:
    | "idle"
    | "preparing"
    | "review"
    | "awaiting_wallet"
    | "done"
    | "error";
};

export type WalletExecution = ExecutionState & {
  /** Sign the request. Only meaningful while `status` is `review`. */
  approve: () => void;
  /** Decline the request and tell the bot it was not approved. */
  reject: () => void;
};

type EvmWalletRequest =
  | Extract<WalletRequest, { kind: "transaction" }>
  | (Omit<Extract<WalletRequest, { kind: "signing" }>, "payload"> & {
      payload: Extract<WalletRequest, { kind: "signing" }>["payload"] & {
        chainFamily: "evm";
      };
    });
type EvmWalletResult =
  | Extract<WalletRequestResult, { kind: "transaction" }>
  | Extract<WalletRequestResult, { kind: "signing" }>;

const useEmbeddedParaViemClient = createParaViemClientHook();

function isEvmRequest(request: WalletRequest): request is EvmWalletRequest {
  return (
    request.kind === "transaction" ||
    (request.kind === "signing" && request.payload.chainFamily === "evm")
  );
}

export function useWalletExecutor(input: {
  request: WalletRequest | null;
  session: Session | null;
}): WalletExecution {
  const [state, setState] = useState<ExecutionState>({
    error: null,
    status: "idle",
  });
  const settled = useRef(new Set<string>());
  const chain = requestChain(input.request);
  const { viemClient } = useEmbeddedParaViemClient({
    walletClientConfig: {
      chain,
      transport: http(chain.rpcUrls.default.http[0]),
    },
  });

  // A fresh request opens the review screen; nothing signs until the user acts.
  useEffect(() => {
    const request = input.request;
    if (!request || !input.session || !isEvmRequest(request)) return;
    if (settled.current.has(request.id)) return;
    setState({ error: null, status: "review" });
  }, [input.request, input.session]);

  // A request this app cannot present for review is declined outright — that is
  // not a decision to put in front of the user.
  useEffect(() => {
    const request = input.request;
    const session = input.session;
    if (!request || !session) return;
    if (isEvmRequest(request) || settled.current.has(request.id)) return;

    settled.current.add(request.id);
    void session
      .reject(
        request.id,
        "Telegram Mini App currently supports EVM requests only.",
      )
      .finally(() => {
        setState({ error: "unsupported_wallet_request", status: "error" });
      });
  }, [input.request, input.session]);

  const approve = useCallback(() => {
    const request = input.request;
    const session = input.session;
    if (!request || !session || !isEvmRequest(request)) return;
    if (!viemClient?.account || settled.current.has(request.id)) return;

    const account = viemClient.account;
    settled.current.add(request.id);
    setState({ error: null, status: "awaiting_wallet" });
    const evmRequest = request;

    const execute = async (): Promise<EvmWalletResult> => {
      if (evmRequest.kind === "signing") {
        if (
          account.address.toLowerCase() !==
          evmRequest.payload.signer.toLowerCase()
        ) {
          throw new Error("active_wallet_is_not_requested_signer");
        }

        const signatures: string[] = [];
        for (const payload of evmRequest.payload.payloads) {
          if (payload.kind === "evm_typed_data") {
            const typedData = toViemSignTypedDataArgs({
              typed_data: payload.typedData,
            });
            if (!typedData) throw new Error("invalid_signature_payload");
            signatures.push(
              await viemClient.signTypedData({
                account,
                ...typedData,
              } as Parameters<typeof viemClient.signTypedData>[0]),
            );
            continue;
          }
          if (payload.kind === "evm_personal") {
            const message = toViemSignMessageArgs({
              non_typed_data: payload.message,
            });
            if (!message) throw new Error("invalid_signature_payload");
            signatures.push(
              await viemClient.signMessage({
                account,
                ...message,
              } as Parameters<typeof viemClient.signMessage>[0]),
            );
            continue;
          }
          throw new Error("invalid_evm_signature_payload");
        }
        return { kind: "signing", signatures };
      }

      const requestedMode = requestedAaMode(evmRequest.payload);
      if (evmRequest.payload.aaStrict && requestedMode !== "none") {
        throw new Error("strict_account_abstraction_is_backend_only");
      }

      const calls = toAAWalletCalls(evmRequest.payload, chain.id);
      if (calls.some((call) => call.chainId !== chain.id)) {
        throw new Error("mixed_chain_bundle_not_supported");
      }
      if (calls.length !== 1) {
        throw new Error("transaction_bundle_requires_backend_aa");
      }

      const [call] = calls;
      const txHash: Hex = await viemClient.sendTransaction({
        account,
        chain,
        data: call.data,
        to: call.to,
        value: call.value,
      });
      const receipt = await createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      }).waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") {
        throw new Error("transaction_reverted");
      }
      return {
        kind: "transaction",
        txHash,
        aaRequestedMode: requestedMode,
        aaResolvedMode: "none",
        aaFallbackReason:
          requestedMode === "none" ? undefined : "telegram_para_eoa_fallback",
        executionKind: "eoa",
        batched: false,
        callCount: 1,
        sponsored: false,
      };
    };

    void execute()
      .then(async (result) => {
        await session.resolve(request.id, result);
        setState({ error: null, status: "done" });
      })
      .catch(async (error: unknown) => {
        const message = errorMessage(error);
        await session.reject(request.id, message).catch(() => undefined);
        setState({ error: message, status: "error" });
      });
  }, [chain, input.request, input.session, viemClient]);

  const reject = useCallback(() => {
    const request = input.request;
    const session = input.session;
    if (!request || !session || settled.current.has(request.id)) return;

    settled.current.add(request.id);
    setState({ error: null, status: "error" });
    void session
      .reject(request.id, "Declined in the Telegram Mini App.")
      .catch(() => undefined);
  }, [input.request, input.session]);

  // `settled` is only ever read from effects and callbacks — the rendered view
  // comes from state, so approving or declining re-renders.
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
