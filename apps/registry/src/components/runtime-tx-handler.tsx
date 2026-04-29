"use client";

import { useEffect, useRef } from "react";
import {
  appendFeeCallToPayload,
  hydrateTxPayloadFromUserState,
  parseChainId,
  toViemSignTypedDataArgs,
  useAomiRuntime,
  type WalletEip712Payload,
  type WalletRequest,
  type WalletTxPayload,
} from "@aomi-labs/react";
import { useAomiAuthAdapter } from "../lib/aomi-auth-adapter";

function hasHydratedCalls(payload: WalletTxPayload): boolean {
  return Array.isArray(payload.calls) && payload.calls.length > 0;
}

function toSimulationTransactions(payload: WalletTxPayload): Array<{
  to: string;
  value?: string;
  data?: string;
  label?: string;
  chain_id?: number;
}> {
  if (Array.isArray(payload.calls) && payload.calls.length > 0) {
    return payload.calls.map((call) => ({
      to: call.to,
      value: call.value,
      data: call.data,
      label: call.description,
      chain_id: call.chainId,
    }));
  }

  if (!payload.to) {
    throw new Error("pending_transaction_missing_call_data");
  }

  return [
    {
      to: payload.to,
      value: payload.value,
      data: payload.data,
      chain_id: payload.chainId,
    },
  ];
}

/**
 * Invisible bridge component that processes wallet transaction and EIP-712
 * signing requests from the AI backend through the active Aomi auth adapter.
 *
 * Auto-mounted inside AomiFrame.Root.
 */
export function RuntimeTxHandler() {
  const {
    user,
    pendingWalletRequests,
    resolveWalletRequest,
    rejectWalletRequest,
    simulateBatchTransactions,
  } = useAomiRuntime();
  const adapter = useAomiAuthAdapter();
  const { chainId: currentChainId } = adapter.identity;
  const processingRef = useRef(false);

  useEffect(() => {
    if (!pendingWalletRequests.length) return;
    const next = pendingWalletRequests[0];
    if (!next || processingRef.current) return;

    processingRef.current = true;
    processRequest(next).finally(() => {
      processingRef.current = false;
    });

    async function processRequest(req: WalletRequest) {
      try {
        if (req.kind === "transaction") {
          const initialPayload = req.payload as WalletTxPayload;
          const payload = hasHydratedCalls(initialPayload)
            ? initialPayload
            : hydrateTxPayloadFromUserState(initialPayload, user, { strict: true });

          if (!adapter.sendTransaction) {
            await rejectWalletRequest(req.id, "Wallet provider is not ready");
            return;
          }

          const defaultChainId =
            payload.chainId ??
            payload.calls?.[0]?.chainId ??
            currentChainId ??
            1;
          const simulationResult = await simulateBatchTransactions(
            toSimulationTransactions(payload),
            {
              from: typeof user.address === "string" ? user.address : undefined,
              chainId: defaultChainId,
            },
          );
          if (!simulationResult.fee) {
            throw new Error("missing_simulated_fee");
          }

          const payloadWithFee = appendFeeCallToPayload(
            payload,
            simulationResult.fee,
            defaultChainId,
          );
          if (payloadWithFee === payload) {
            throw new Error("missing_fee_payment_tx");
          }

          const result = await adapter.sendTransaction(payloadWithFee);
          await resolveWalletRequest(req.id, result);
          return;
        }

        if (!adapter.signTypedData) {
          await rejectWalletRequest(req.id, "Wallet provider is not ready");
          return;
        }

        const payload = req.payload as WalletEip712Payload;
        const signArgs = toViemSignTypedDataArgs(payload);

        if (!signArgs) {
          await rejectWalletRequest(req.id, "Missing typed_data payload");
          return;
        }

        const domainChainId = signArgs.domain?.chainId;
        const requestChainId =
          typeof domainChainId === "number" || typeof domainChainId === "string"
            ? parseChainId(domainChainId)
            : undefined;
        if (
          requestChainId &&
          currentChainId &&
          requestChainId !== currentChainId &&
          adapter.switchChain
        ) {
          await adapter.switchChain(requestChainId);
        }

        const signaturePayload: WalletEip712Payload = {
          ...payload,
          typed_data: signArgs,
        };
        const result = await adapter.signTypedData(signaturePayload);
        await resolveWalletRequest(req.id, result);
      } catch (error) {
        console.error("[RuntimeTxHandler] Request failed:", error);
        await rejectWalletRequest(
          req.id,
          error instanceof Error ? error.message : "Request failed",
        );
      }
    }
  }, [
    adapter,
    user,
    pendingWalletRequests,
    currentChainId,
    resolveWalletRequest,
    rejectWalletRequest,
    simulateBatchTransactions,
  ]);

  return null;
}
