"use client";

import { useCallback, useRef, useState } from "react";
import type {
  WalletEip712Payload,
  WalletAaSignPayload,
  WalletAaSignatureRequest,
  WalletSolanaSignMessagePayload,
  WalletSolanaSignPayload,
  WalletTxPayload,
  WalletRequest,
  WalletRequestKind,
  WalletRequestResult,
  ViemSignMessageArgs,
} from "@aomi-labs/client";
import type { Session as ClientSession } from "@aomi-labs/client";

// Re-export types consumers need. The source of truth for `WalletRequestKind`
// is `@aomi-labs/client` — Solana adds a third arm there.
export type {
  WalletRequest,
  WalletRequestKind,
  WalletRequestResult,
  WalletTxPayload,
  WalletEip712Payload,
  WalletAaSignPayload,
  WalletAaSignatureRequest,
  WalletSolanaSignMessagePayload,
  WalletSolanaSignPayload,
  ViemSignMessageArgs,
};

export type WalletRequestStatus = "pending" | "processing";

export type WalletHandlerConfig = {
  /** Get the ClientSession for the current thread. */
  getSession: () => ClientSession | undefined;
};

export type WalletHandlerApi = {
  /**
   * All queued wallet requests across every supported kind: EVM txs
   * (`kind: "transaction"`), EIP-712 signs (`kind: "eip712_sign"`), and
   * Solana signs (`kind: "solana_sign"`). Consumers should narrow on
   * `request.kind` before reading `request.payload` — the discriminated
   * union auto-narrows the payload type.
   */
  pendingRequests: WalletRequest[];
  /** True while a visible or callback-in-flight wallet request still exists. */
  hasBlockingWalletRequests: boolean;
  /** Replace pending requests with the session's authoritative snapshot. */
  setRequests: (requests: WalletRequest[]) => void;
  /** Mark a request as in-flight so it is not replayed while awaiting backend ack. */
  startRequest: (id: string) => void;
  /** Remove a request after an operation-specific API acknowledged it. */
  dismissRequest: (id: string) => void;
  /**
   * Complete a request successfully — sends the response wire event to
   * the backend via ClientSession. The `result.kind` discriminator must
   * match the originating request's kind (e.g. `{ kind: "solana_sign",
   * signedTx: "..." }` for a Solana request); ClientSession runtime-checks
   * this and throws on mismatch.
   */
  resolveRequest: (id: string, result: WalletRequestResult) => Promise<void>;
  /** Fail a request — sends error to backend via ClientSession */
  rejectRequest: (id: string, error?: string) => Promise<void>;
};

export function useWalletHandler({
  getSession,
}: WalletHandlerConfig): WalletHandlerApi {
  const [pendingRequests, setPendingRequests] = useState<WalletRequest[]>([]);
  const [hasBlockingWalletRequests, setHasBlockingWalletRequests] =
    useState(false);
  const requestsRef = useRef<WalletRequest[]>(pendingRequests);
  const inFlightRequestSetRef = useRef<Set<string>>(new Set());
  const suppressedRequestSetRef = useRef<Set<string>>(new Set());

  const syncVisibleRequests = useCallback(() => {
    setPendingRequests(
      requestsRef.current.filter(
        (request) => !suppressedRequestSetRef.current.has(request.id),
      ),
    );
    setHasBlockingWalletRequests(
      requestsRef.current.length > 0 || inFlightRequestSetRef.current.size > 0,
    );
  }, []);

  const setRequests = useCallback(
    (requests: WalletRequest[]) => {
      const incomingIds = new Set(requests.map((request) => request.id));
      for (const id of suppressedRequestSetRef.current) {
        if (!incomingIds.has(id) && !inFlightRequestSetRef.current.has(id)) {
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
    },
    [syncVisibleRequests],
  );

  const startRequest = useCallback(
    (id: string) => {
      if (!requestsRef.current.some((request) => request.id === id)) {
        return;
      }

      inFlightRequestSetRef.current.add(id);
      suppressedRequestSetRef.current.add(id);
      syncVisibleRequests();
    },
    [syncVisibleRequests],
  );

  const resolveRequest = useCallback(
    async (id: string, result: WalletRequestResult) => {
      const session = getSession();
      if (!session) {
        console.error(
          "[wallet-handler] No session available to resolve request",
        );
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

  const dismissRequest = useCallback(
    (id: string) => {
      // Drop it from the ClientSession too, otherwise `sync()` preserves the
      // request in the controller and re-feeds it on the next snapshot, keeping
      // `hasBlockingWalletRequests` stuck true with no visible dialog.
      getSession()?.dismiss(id);
      requestsRef.current = requestsRef.current.filter(
        (request) => request.id !== id,
      );
      inFlightRequestSetRef.current.delete(id);
      suppressedRequestSetRef.current.add(id);
      syncVisibleRequests();
    },
    [getSession, syncVisibleRequests],
  );

  const rejectRequest = useCallback(
    async (id: string, error?: string) => {
      const session = getSession();
      if (!session) {
        console.error(
          "[wallet-handler] No session available to reject request",
        );
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
    hasBlockingWalletRequests,
    setRequests,
    startRequest,
    dismissRequest,
    resolveRequest,
    rejectRequest,
  };
}
