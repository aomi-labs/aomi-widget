"use client";

import { useEffect, useRef, useState } from "react";
import { createParaViemClientHook } from "@getpara/react-core/evm/viem";
import {
  toAAWalletCalls,
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
  type Session,
  type WalletRequest,
  type WalletRequestResult,
} from "@aomi-labs/client";
import { http, type Hex } from "viem";

import {
  errorMessage,
  requestChain,
  requestedAaMode,
} from "@/lib/wallet-request";
import { failTelegramRequest, finishTelegramRequest } from "@/lib/telegram";

type ExecutionState = {
  error: string | null;
  status: "idle" | "preparing" | "awaiting_wallet" | "done" | "error";
};

type EvmWalletRequest = Extract<
  WalletRequest,
  { kind: "transaction" | "eip712_sign" }
>;
type EvmWalletResult =
  | Extract<WalletRequestResult, { kind: "transaction" }>
  | Extract<WalletRequestResult, { kind: "eip712_sign" }>;

const useEmbeddedParaViemClient = createParaViemClientHook();

function isEvmRequest(request: WalletRequest): request is EvmWalletRequest {
  return request.kind === "transaction" || request.kind === "eip712_sign";
}

export function useWalletExecutor(input: {
  request: WalletRequest | null;
  session: Session | null;
}): ExecutionState {
  const [state, setState] = useState<ExecutionState>({
    error: null,
    status: "idle",
  });
  const processed = useRef(new Set<string>());
  const chain = requestChain(input.request);
  const { viemClient } = useEmbeddedParaViemClient({
    walletClientConfig: {
      chain,
      transport: http(chain.rpcUrls.default.http[0]),
    },
  });

  useEffect(() => {
    const request = input.request;
    const session = input.session;
    if (!request || !session || processed.current.has(request.id)) return;

    if (!isEvmRequest(request)) {
      processed.current.add(request.id);
      void session
        .reject(
          request.id,
          "Telegram Mini App currently supports EVM requests only.",
        )
        .finally(() => {
          setState({ error: "unsupported_wallet_request", status: "error" });
          failTelegramRequest({
            request_id: request.id,
            status: "failed",
            error: "unsupported_wallet_request",
          });
        });
      return;
    }
    const evmRequest = request;

    if (!viemClient?.account) return;

    processed.current.add(request.id);
    let active = true;
    queueMicrotask(() => {
      if (active) setState({ error: null, status: "awaiting_wallet" });
    });

    const execute = async (): Promise<EvmWalletResult> => {
      if (evmRequest.kind === "eip712_sign") {
        const typedData = toViemSignTypedDataArgs(evmRequest.payload);
        if (typedData) {
          const signature = await viemClient.signTypedData({
            account: viemClient.account!,
            ...typedData,
          } as Parameters<typeof viemClient.signTypedData>[0]);
          return { kind: "eip712_sign", signature };
        }

        const message = toViemSignMessageArgs(evmRequest.payload);
        if (!message) throw new Error("invalid_signature_payload");
        const signature = await viemClient.signMessage({
          account: viemClient.account!,
          ...message,
        } as Parameters<typeof viemClient.signMessage>[0]);
        return { kind: "eip712_sign", signature };
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
        account: viemClient.account!,
        chain,
        data: call.data,
        to: call.to,
        value: call.value,
      });
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
        if (!active) return;
        setState({ error: null, status: "done" });
        finishTelegramRequest({
          request_id: request.id,
          status: "signed",
          kind: result.kind,
          ...(result.kind === "transaction"
            ? { tx_hash: result.txHash }
            : { signature: result.signature }),
        });
      })
      .catch(async (error: unknown) => {
        const message = errorMessage(error);
        await session.reject(request.id, message).catch(() => undefined);
        if (!active) return;
        setState({ error: message, status: "error" });
        failTelegramRequest({
          request_id: request.id,
          status: "failed",
          error: message,
        });
      });

    return () => {
      active = false;
    };
  }, [chain, input.request, input.session, viemClient]);

  const preparing =
    input.request &&
    input.session &&
    isEvmRequest(input.request) &&
    !viemClient?.account;
  return preparing ? { error: null, status: "preparing" } : state;
}
