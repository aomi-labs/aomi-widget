"use client";

import { useEffect, useRef } from "react";
import {
  hydrateTxPayloadFromUserState,
  toViemSignTypedDataArgs,
  useAomiRuntime,
  type WalletEip712Payload,
  type WalletRequest,
  type WalletTxPayload,
} from "@aomi-labs/react";
import { useAomiAuthAdapter } from "../lib/aomi-auth-adapter";

function parseChainId(value: number | string | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (trimmed.startsWith("0x")) {
    const parsedHex = Number.parseInt(trimmed.slice(2), 16);
    return Number.isFinite(parsedHex) ? parsedHex : undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
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
    startWalletRequest,
    resolveWalletRequest,
    rejectWalletRequest,
  } = useAomiRuntime();
  const adapter = useAomiAuthAdapter();
  const { chainId: currentChainId } = adapter.identity;
  const processingRef = useRef(false);

  useEffect(() => {
    if (!pendingWalletRequests.length) return;
    const next = pendingWalletRequests[0];
    if (!next || processingRef.current) return;

    processingRef.current = true;
    startWalletRequest(next.id);

    processRequest(next).finally(() => {
      processingRef.current = false;
    });

    async function processRequest(req: WalletRequest) {
      try {
        if (req.kind === "transaction") {
          const initialPayload = req.payload as WalletTxPayload;
          const payload = initialPayload.to
            ? initialPayload
            : hydrateTxPayloadFromUserState(initialPayload, user);

          if (!payload.to) {
            rejectWalletRequest(req.id, "pending_transaction_missing_call_data");
            return;
          }

          if (!adapter.sendTransaction) {
            rejectWalletRequest(req.id, "Wallet provider is not ready");
            return;
          }

          const result = await adapter.sendTransaction(payload);

          resolveWalletRequest(req.id, {
            txHash: result.txHash,
            amount: result.amount,
          });
          return;
        }

        if (!adapter.signTypedData) {
          rejectWalletRequest(req.id, "Wallet provider is not ready");
          return;
        }

        const payload = req.payload as WalletEip712Payload;
        const signArgs = toViemSignTypedDataArgs(payload);

        if (!signArgs) {
          rejectWalletRequest(req.id, "Missing typed_data payload");
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
        resolveWalletRequest(req.id, result);
      } catch (error) {
        console.error("[RuntimeTxHandler] Request failed:", error);
        rejectWalletRequest(
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
    startWalletRequest,
    resolveWalletRequest,
    rejectWalletRequest,
  ]);

  return null;
}
