"use client";

import { useEffect, useRef } from "react";
import {
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

          const result = await adapter.sendTransaction(payload);
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
  ]);

  return null;
}
