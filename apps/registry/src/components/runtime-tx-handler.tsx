"use client";

import { useEffect, useRef } from "react";
import {
  appendFeeCallToPayload,
  hydrateTxPayloadFromUserState,
  parseChainId,
  toViemSignTypedDataArgs,
  useAomiRuntime,
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
    showNotification,
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
          // `req.payload` narrows to WalletTxPayload via the discriminated union.
          const payload = hasHydratedCalls(req.payload)
            ? req.payload
            : hydrateTxPayloadFromUserState(req.payload, user, {
                strict: true,
              });

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

          // Fee injection is the production path: simulation succeeds,
          // returns a non-zero fee, and we append it to the batch so Aomi
          // gets paid atomically with the user's tx. Simulation can come
          // back without a fee for test / 0-balance / unsupported-chain
          // scenarios — in that case we still want the wallet to pop so
          // the user can sign (and have the tx revert on-chain if
          // applicable) rather than silently rejecting. `strictAa: false`
          // lets the fee-injected batch fall back from AA to sequential
          // EOA sends if the wallet/bundler fails after sign.
          const payloadWithFee = simulationResult.fee
            ? appendFeeCallToPayload(
                payload,
                simulationResult.fee,
                defaultChainId,
                { strictAa: false },
              )
            : payload;
          if (payloadWithFee === payload) {
            showNotification({
              type: "notice",
              title: "Proceeding without fee on failed simulation",
              duration: 6000,
            });
          }

          const result = await adapter.sendTransaction(payloadWithFee);
          await resolveWalletRequest(req.id, { kind: "transaction", ...result });
          return;
        }

        if (req.kind === "solana_sign") {
          // No simulation, no fee injection, no chain switching — host
          // doesn't have a Solana fork simulator and apps own RPC routing.
          // Just sign the base64 unsigned tx and return base64 signed bytes.
          if (!adapter.signSolanaTransaction) {
            await rejectWalletRequest(
              req.id,
              "Solana wallet provider is not ready",
            );
            return;
          }
          if (!req.payload.unsignedTx) {
            await rejectWalletRequest(req.id, "Missing unsigned_tx payload");
            return;
          }

          const result = await adapter.signSolanaTransaction(req.payload);
          await resolveWalletRequest(req.id, { kind: "solana_sign", ...result });
          return;
        }

        // req.kind === "eip712_sign"
        if (!adapter.signTypedData) {
          await rejectWalletRequest(req.id, "Wallet provider is not ready");
          return;
        }

        const signArgs = toViemSignTypedDataArgs(req.payload);
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

        const result = await adapter.signTypedData({
          ...req.payload,
          typed_data: signArgs,
        });
        await resolveWalletRequest(req.id, { kind: "eip712_sign", ...result });
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
    showNotification,
  ]);

  return null;
}
