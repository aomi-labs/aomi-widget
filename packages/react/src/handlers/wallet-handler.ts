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
  /** Replace pending requests with the session's authoritative snapshot. */
  setRequests: (requests: WalletRequest[]) => void;
  /** Complete a request successfully — sends response to backend via ClientSession */
  resolveRequest: (id: string, result: WalletRequestResult) => void;
  /** Fail a request — sends error to backend via ClientSession */
  rejectRequest: (id: string, error?: string) => void;
};

export function useWalletHandler({
  getSession,
}: WalletHandlerConfig): WalletHandlerApi {
  const [pendingRequests, setPendingRequests] = useState<WalletRequest[]>([]);
  const requestsRef = useRef<WalletRequest[]>(pendingRequests);

  const setRequests = useCallback((requests: WalletRequest[]) => {
    requestsRef.current = [...requests];
    setPendingRequests(requestsRef.current);
  }, []);

  const resolveRequest = useCallback(
    (id: string, result: WalletRequestResult) => {
      const session = getSession();
      if (!session) {
        console.error("[wallet-handler] No session available to resolve request");
        return;
      }

      setRequests(requestsRef.current.filter((request) => request.id !== id));

      void session.resolve(id, result).catch((err) => {
        console.error("[wallet-handler] Failed to resolve request:", err);
      });
    },
    [getSession, setRequests],
  );

  const rejectRequest = useCallback(
    (id: string, error?: string) => {
      const session = getSession();
      if (!session) {
        console.error("[wallet-handler] No session available to reject request");
        return;
      }

      setRequests(requestsRef.current.filter((request) => request.id !== id));

      void session.reject(id, error).catch((err) => {
        console.error("[wallet-handler] Failed to reject request:", err);
      });
    },
    [getSession, setRequests],
  );

  return {
    pendingRequests,
    setRequests,
    resolveRequest,
    rejectRequest,
  };
}
