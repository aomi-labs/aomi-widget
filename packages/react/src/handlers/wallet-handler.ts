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
  /** Mark a request as in-flight so it is not replayed while awaiting backend ack. */
  startRequest: (id: string) => void;
  /** Complete a request successfully — sends response to backend via ClientSession */
  resolveRequest: (id: string, result: WalletRequestResult) => Promise<void>;
  /** Fail a request — sends error to backend via ClientSession */
  rejectRequest: (id: string, error?: string) => Promise<void>;
};

export function useWalletHandler({
  getSession,
}: WalletHandlerConfig): WalletHandlerApi {
  const [pendingRequests, setPendingRequests] = useState<WalletRequest[]>([]);
  const requestsRef = useRef<WalletRequest[]>(pendingRequests);
  const inFlightRequestSetRef = useRef<Set<string>>(new Set());
  const suppressedRequestSetRef = useRef<Set<string>>(new Set());

  const syncVisibleRequests = useCallback(() => {
    setPendingRequests(
      requestsRef.current.filter(
        (request) => !suppressedRequestSetRef.current.has(request.id),
      ),
    );
  }, []);

  const setRequests = useCallback((requests: WalletRequest[]) => {
    const incomingIds = new Set(requests.map((request) => request.id));
    for (const id of suppressedRequestSetRef.current) {
      if (
        !incomingIds.has(id) &&
        !inFlightRequestSetRef.current.has(id)
      ) {
        suppressedRequestSetRef.current.delete(id);
      }
    }

    const preservedInFlight = requestsRef.current.filter(
      (request) =>
        inFlightRequestSetRef.current.has(request.id) &&
        !incomingIds.has(request.id),
    );

    requestsRef.current = [...requests, ...preservedInFlight];
    syncVisibleRequests();
  }, [syncVisibleRequests]);

  const startRequest = useCallback((id: string) => {
    if (!requestsRef.current.some((request) => request.id === id)) {
      return;
    }

    inFlightRequestSetRef.current.add(id);
    suppressedRequestSetRef.current.add(id);
    syncVisibleRequests();
  }, [syncVisibleRequests]);

  const resolveRequest = useCallback(
    async (id: string, result: WalletRequestResult) => {
      const session = getSession();
      if (!session) {
        console.error("[wallet-handler] No session available to resolve request");
        return;
      }

      startRequest(id);

      try {
        await session.resolve(id, result);
      } catch (err) {
        console.error("[wallet-handler] Failed to resolve request:", err);
      } finally {
        requestsRef.current = requestsRef.current.filter(
          (request) => request.id !== id,
        );
        inFlightRequestSetRef.current.delete(id);
        syncVisibleRequests();
      }
    },
    [getSession, startRequest, syncVisibleRequests],
  );

  const rejectRequest = useCallback(
    async (id: string, error?: string) => {
      const session = getSession();
      if (!session) {
        console.error("[wallet-handler] No session available to reject request");
        return;
      }

      startRequest(id);

      try {
        await session.reject(id, error);
      } catch (err) {
        console.error("[wallet-handler] Failed to reject request:", err);
      } finally {
        requestsRef.current = requestsRef.current.filter(
          (request) => request.id !== id,
        );
        inFlightRequestSetRef.current.delete(id);
        syncVisibleRequests();
      }
    },
    [getSession, startRequest, syncVisibleRequests],
  );

  return {
    pendingRequests,
    setRequests,
    startRequest,
    resolveRequest,
    rejectRequest,
  };
}
