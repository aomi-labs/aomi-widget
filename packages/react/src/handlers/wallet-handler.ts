"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEventContext } from "../contexts/event-context";
import type { InboundEvent } from "../state/event-buffer";
import {
  createWalletBuffer,
  enqueue,
  dequeue,
  markProcessing,
  getAll,
  type WalletBuffer,
  type WalletRequest,
  type WalletTxPayload,
  type WalletEip712Payload,
} from "../state/wallet-buffer";

// Re-export types consumers need
export type { WalletRequest, WalletTxPayload, WalletEip712Payload };
export type {
  WalletRequestKind,
  WalletRequestStatus,
} from "../state/wallet-buffer";

export type WalletRequestResult = {
  txHash?: string;
  signature?: string;
  amount?: string;
};

export type WalletHandlerConfig = {
  sessionId: string;
};

export type WalletHandlerApi = {
  /** All queued wallet requests (tx + eip712) */
  pendingRequests: WalletRequest[];
  /** Mark a request as being processed */
  startProcessing: (id: string) => void;
  /** Complete a request successfully — dequeues + sends response to backend */
  resolveRequest: (
    id: string,
    result: WalletRequestResult,
  ) => void;
  /** Fail a request — dequeues + sends error to backend */
  rejectRequest: (id: string, error?: string) => void;
};

export function useWalletHandler({
  sessionId,
}: WalletHandlerConfig): WalletHandlerApi {
  const { subscribe, sendOutboundSystem: sendOutbound } = useEventContext();
  const bufferRef = useRef<WalletBuffer>(createWalletBuffer());
  const [pendingRequests, setPendingRequests] = useState<WalletRequest[]>([]);

  // Sync React state from buffer
  const syncState = useCallback(() => {
    setPendingRequests(getAll(bufferRef.current));
  }, []);

  // ---------------------------------------------------------------------------
  // Subscribe to wallet_tx_request events
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = subscribe(
      "wallet_tx_request",
      (event: InboundEvent) => {
        const payload = event.payload as WalletTxPayload;
        enqueue(bufferRef.current, "transaction", payload);
        syncState();
      },
    );
    return unsubscribe;
  }, [subscribe, syncState]);

  // ---------------------------------------------------------------------------
  // Subscribe to EIP-712 signing requests
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = subscribe(
      "wallet_eip712_request",
      (event: InboundEvent) => {
        const payload = (event.payload ?? {}) as WalletEip712Payload;
        enqueue(bufferRef.current, "eip712_sign", payload);
        syncState();
      },
    );
    return unsubscribe;
  }, [subscribe, syncState]);

  // ---------------------------------------------------------------------------
  // Mark a request as processing
  // ---------------------------------------------------------------------------
  const startProcessingCb = useCallback(
    (id: string) => {
      markProcessing(bufferRef.current, id);
      syncState();
    },
    [syncState],
  );

  // ---------------------------------------------------------------------------
  // Resolve a request — dequeues + sends appropriate backend response
  // ---------------------------------------------------------------------------
  const resolveRequest = useCallback(
    (id: string, result: WalletRequestResult) => {
      const removed = dequeue(bufferRef.current, id);
      if (!removed) return;

      if (removed.kind === "transaction") {
        sendOutbound({
          type: "wallet:tx_complete",
          sessionId,
          payload: {
            txHash: result.txHash ?? "",
            status: "success",
            amount: result.amount,
          },
        });
      } else {
        const eip712Payload = removed.payload as WalletEip712Payload;
        sendOutbound({
          type: "wallet_eip712_response",
          sessionId,
          payload: {
            status: "success",
            signature: result.signature,
            description: eip712Payload.description,
          },
        });
      }

      syncState();
    },
    [sendOutbound, sessionId, syncState],
  );

  // ---------------------------------------------------------------------------
  // Reject a request — dequeues + sends error to backend
  // ---------------------------------------------------------------------------
  const rejectRequest = useCallback(
    (id: string, error?: string) => {
      const removed = dequeue(bufferRef.current, id);
      if (!removed) return;

      if (removed.kind === "transaction") {
        sendOutbound({
          type: "wallet:tx_complete",
          sessionId,
          payload: {
            txHash: "",
            status: "failed",
          },
        });
      } else {
        const eip712Payload = removed.payload as WalletEip712Payload;
        sendOutbound({
          type: "wallet_eip712_response",
          sessionId,
          payload: {
            status: "failed",
            error: error ?? "EIP-712 signing failed",
            description: eip712Payload.description,
          },
        });
      }

      syncState();
    },
    [sendOutbound, sessionId, syncState],
  );

  return {
    pendingRequests,
    startProcessing: startProcessingCb,
    resolveRequest,
    rejectRequest,
  };
}
