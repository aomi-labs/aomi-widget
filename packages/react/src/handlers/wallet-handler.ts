"use client";

import { useCallback, useRef, useState } from "react";
import type {
  WalletEip712Payload,
  WalletTxPayload,
  WalletRequest,
} from "@aomi-labs/client";
import type { Session as ClientSession } from "@aomi-labs/client";

// Re-export types consumers need
export type { WalletRequest, WalletTxPayload, WalletEip712Payload };

export type WalletRequestKind = "transaction" | "eip712_sign";
export type WalletRequestStatus = "pending" | "processing";

export type WalletRequestResult = {
  txHash?: string;
  signature?: string;
  amount?: string;
};

export type WalletHandlerConfig = {
  /** Get the ClientSession for the current thread. */
  getSession: () => ClientSession | undefined;
};

export type WalletHandlerApi = {
  /** All queued wallet requests (tx + eip712) */
  pendingRequests: WalletRequest[];
  /** Enqueue a wallet request (called by orchestrator on ClientSession events) */
  enqueueRequest: (request: WalletRequest) => void;
  /** Complete a request successfully — sends response to backend via ClientSession */
  resolveRequest: (id: string, result: WalletRequestResult) => void;
  /** Fail a request — sends error to backend via ClientSession */
  rejectRequest: (id: string, error?: string) => void;
};

export function useWalletHandler({
  getSession,
}: WalletHandlerConfig): WalletHandlerApi {
  const [pendingRequests, setPendingRequests] = useState<WalletRequest[]>([]);
  const requestsRef = useRef<WalletRequest[]>([]);

  const enqueueRequest = useCallback((request: WalletRequest) => {
    requestsRef.current = [...requestsRef.current, request];
    setPendingRequests(requestsRef.current);
  }, []);

  const resolveRequest = useCallback(
    (id: string, result: WalletRequestResult) => {
      const session = getSession();
      if (!session) {
        console.error("[wallet-handler] No session available to resolve request");
        return;
      }

      requestsRef.current = requestsRef.current.filter((r) => r.id !== id);
      setPendingRequests(requestsRef.current);

      void session.resolve(id, result).catch((err) => {
        console.error("[wallet-handler] Failed to resolve request:", err);
      });
    },
    [getSession],
  );

  const rejectRequest = useCallback(
    (id: string, error?: string) => {
      const session = getSession();
      if (!session) {
        console.error("[wallet-handler] No session available to reject request");
        return;
      }

      requestsRef.current = requestsRef.current.filter((r) => r.id !== id);
      setPendingRequests(requestsRef.current);

      void session.reject(id, error).catch((err) => {
        console.error("[wallet-handler] Failed to reject request:", err);
      });
    },
    [getSession],
  );

  return {
    pendingRequests,
    enqueueRequest,
    resolveRequest,
    rejectRequest,
  };
}
