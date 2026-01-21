"use client";

import { useCallback, useEffect, useState } from "react";
import { useEventContext } from "../contexts/event-context";
import { useUser } from "../contexts/user-context";
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
  /** Send wallet connection status change and update user state */
  sendConnectionChange: (
    status: WalletConnectionStatus,
    address?: string,
    chainId?: number,
  ) => void;
  /** Pending transaction requests from AI */
  pendingTxRequests: WalletTxRequest[];
  /** Clear a pending request after handling */
  clearTxRequest: (index: number) => void;
};

export function useWalletHandler({
  sessionId,
  onTxRequest,
}: WalletHandlerConfig): WalletHanderApi {
  const { subscribe, sendOutboundSystem: sendOutbound } = useEventContext();
  const { setUser, getUserState } = useUser();
  const [pendingTxRequests, setPendingTxRequests] = useState<WalletTxRequest[]>(
    [],
  );

  // ---------------------------------------------------------------------------
  // Subscribe to wallet-related inbound events
  // Backend sends InlineCall with type: "wallet_tx_request"
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = subscribe(
      "wallet_tx_request",
      (event: InboundEvent) => {
        const request = event.payload as WalletTxRequest;

        // Add to pending requests
        setPendingTxRequests((prev) => [...prev, request]);

        // Call optional callback
        onTxRequest?.(request);
      },
    );

    return unsubscribe;
  }, [subscribe, onTxRequest]);


  // ---------------------------------------------------------------------------
  // Subscribe to wallet-related inbound events
  // Backend sends InlineCall with type: "user_state_response"
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = subscribe(
      "user_state_request",
      (event: InboundEvent) => {
        sendOutbound({
          type: "user_state_response",
          sessionId,
          payload: getUserState(),
        });
      },
    );

    return unsubscribe;
  }, [subscribe, onTxRequest]);

  // ---------------------------------------------------------------------------
  // Outbound: Send transaction completion
  // ---------------------------------------------------------------------------
  const sendTxComplete = useCallback(
    (tx: WalletTxComplete) => {
      sendOutbound({
        type: "wallet:tx_complete",
        sessionId,
        payload: tx,
      });
    },
    [sendOutbound, sessionId],
  );

  // ---------------------------------------------------------------------------
  // Outbound: Send connection status change and update user state
  // ---------------------------------------------------------------------------
  const sendConnectionChange = useCallback(
    (
      status: WalletConnectionStatus,
      address?: string,
      chainId?: number,
    ) => {
      // Update user state
      if (status === "connected") {
        setUser({
          isConnected: true,
          address,
          chainId,
        });
      } else {
        setUser({
          isConnected: false,
          address: undefined,
          chainId: undefined,
        });
      }

      // Send event to backend (optional - only if you still want events)
      sendOutbound({
        type:
          status === "connected" ? "wallet:connected" : "wallet:disconnected",
        sessionId,
        payload: { status, address },
      });
    },
    [setUser, sendOutbound, sessionId],
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