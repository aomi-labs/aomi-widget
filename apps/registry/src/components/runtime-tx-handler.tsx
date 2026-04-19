"use client";

import { useEffect, useRef } from "react";
import {
  useAomiRuntime,
  type WalletEip712Payload,
  type WalletRequest,
  type WalletTxPayload,
} from "@aomi-labs/react";
import { useAomiAuthAdapter } from "../lib/aomi-auth-adapter";

/**
 * Invisible bridge component that processes wallet transaction and EIP-712
 * signing requests from the AI backend via the active Aomi adapter.
 *
 * Auto-mounted inside AomiFrame.Root.
 */
export function RuntimeTxHandler() {
  const {
    pendingWalletRequests,
    startWalletRequest,
    resolveWalletRequest,
    rejectWalletRequest,
  } = useAomiRuntime();
  const adapter = useAomiAuthAdapter();
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
          if (!adapter.sendTransaction) {
            rejectWalletRequest(req.id, "Wallet provider is not ready");
            return;
          }

          const result = await adapter.sendTransaction(req.payload as WalletTxPayload);
          resolveWalletRequest(req.id, result);
        } else {
          if (!adapter.signTypedData) {
            rejectWalletRequest(req.id, "Wallet provider is not ready");
            return;
          }

          const result = await adapter.signTypedData(req.payload as WalletEip712Payload);
          resolveWalletRequest(req.id, result);
        }
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
    pendingWalletRequests,
    startWalletRequest,
    resolveWalletRequest,
    rejectWalletRequest,
  ]);

  return null;
}
