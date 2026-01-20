"use client";

import { useCallback, useEffect, useState } from "react";
import { useEventContext } from "../contexts/event-context";
import type { InboundEvent } from "../state/event-buffer";


export type WalletTxRequest = {
  to: string;
  value?: string;
  data?: string;
  chainId?: number;
};

export type WalletTxComplete = {
  txHash: string;
  status: "success" | "failed";
  amount?: string;
  token?: string;
};

export type WalletConnectionStatus = "connected" | "disconnected";


export type WalletHandlerConfig = {
  sessionId: string;
  onTxRequest?: (request: WalletTxRequest) => void;
};

export type WalletHanderApi = {
  /** Send transaction completion event to backend */
  sendTxComplete: (tx: WalletTxComplete) => void;
  /** Send wallet connection status change */
  sendConnectionChange: (status: WalletConnectionStatus, address?: string) => void;
  /** Pending transaction requests from AI */
  pendingTxRequests: WalletTxRequest[];
  /** Clear a pending request after handling */
  clearTxRequest: (index: number) => void;
};

export function useWalletHandler({
  sessionId,
  onTxRequest,
}: WalletHandlerConfig): WalletHanderApi {
  const { subscribe, enqueueOutbound } = useEventContext();
  const [pendingTxRequests, setPendingTxRequests] = useState<WalletTxRequest[]>([]);

  // ---------------------------------------------------------------------------
  // Subscribe to wallet-related inbound events
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = subscribe("wallet:tx_request", (event: InboundEvent) => {
      const request = event.payload as WalletTxRequest;

      // Add to pending requests
      setPendingTxRequests((prev) => [...prev, request]);

      // Call optional callback
      onTxRequest?.(request);
    });

    return unsubscribe;
  }, [subscribe, onTxRequest]);

  // ---------------------------------------------------------------------------
  // Outbound: Send transaction completion
  // ---------------------------------------------------------------------------
  const sendTxComplete = useCallback(
    (tx: WalletTxComplete) => {
      enqueueOutbound({
        type: "wallet:tx_complete",
        sessionId,
        payload: tx,
        priority: "high", // Tx completions are high priority
      });
    },
    [enqueueOutbound, sessionId]
  );

  // ---------------------------------------------------------------------------
  // Outbound: Send connection status change
  // ---------------------------------------------------------------------------
  const sendConnectionChange = useCallback(
    (status: WalletConnectionStatus, address?: string) => {
      enqueueOutbound({
        type: status === "connected" ? "wallet:connected" : "wallet:disconnected",
        sessionId,
        payload: { status, address },
        priority: "normal",
      });
    },
    [enqueueOutbound, sessionId]
  );

  // ---------------------------------------------------------------------------
  // Clear handled request
  // ---------------------------------------------------------------------------
  const clearTxRequest = useCallback((index: number) => {
    setPendingTxRequests((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    sendTxComplete,
    sendConnectionChange,
    pendingTxRequests,
    clearTxRequest,
  };
}
