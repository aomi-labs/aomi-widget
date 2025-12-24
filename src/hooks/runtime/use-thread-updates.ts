"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import type { BackendApi } from "@/lib/backend-api";
import type { ThreadMetadata } from "@/lib/thread-context";
import type { WalletTxRequestPayload } from "@/lib/wallet-tx";
import { isPlaceholderTitle } from "@/lib/runtime-utils";

type WalletTxRequest = WalletTxRequestPayload;

type UseThreadUpdatesParams = {
  backendApiRef: RefObject<BackendApi>;
  findTempIdForBackendId: (backendId: string) => string | undefined;
  handleWalletTxRequest: (sessionId: string, threadId: string, request: WalletTxRequest) => void;
  setThreadMetadata: Dispatch<SetStateAction<Map<string, ThreadMetadata>>>;
  creatingThreadIdRef: RefObject<string | null>;
};

export function useThreadUpdates({
  backendApiRef,
  findTempIdForBackendId,
  handleWalletTxRequest,
  setThreadMetadata,
  creatingThreadIdRef,
}: UseThreadUpdatesParams) {
  const [subscribableSessionId, setSubscribableSessionId] = useState<string | null>(null);
  const [updateSubscriptionsTick, setUpdateSubscriptionsTick] = useState(0);

  const lastEventIdBySessionRef = useRef<Map<string, number>>(new Map());
  const eventsInFlightRef = useRef<Set<string>>(new Set());
  const updateSubscriptionsRef = useRef<Map<string, () => void>>(new Map());

  const bumpUpdateSubscriptions = useCallback(() => {
    setUpdateSubscriptionsTick((prev) => prev + 1);
  }, []);

  const applyTitleChanged = useCallback(
    (sessionId: string, newTitle: string) => {
      const tempId = findTempIdForBackendId(sessionId);
      const threadIdToUpdate = tempId || sessionId;

      setThreadMetadata((prev) => {
        const next = new Map(prev);
        const existing = next.get(threadIdToUpdate);
        const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
        const nextStatus = existing?.status === "archived" ? "archived" : "regular";
        next.set(threadIdToUpdate, {
          title: normalizedTitle,
          status: nextStatus,
          lastActiveAt: existing?.lastActiveAt ?? new Date().toISOString(),
        });
        return next;
      });
      if (!isPlaceholderTitle(newTitle) && creatingThreadIdRef.current === threadIdToUpdate) {
        creatingThreadIdRef.current = null;
      }
    },
    [creatingThreadIdRef, findTempIdForBackendId, setThreadMetadata]
  );

  const drainEvents = useCallback(
    async (sessionId: string) => {
      if (eventsInFlightRef.current.has(sessionId)) return;
      eventsInFlightRef.current.add(sessionId);

      try {
        let afterId = lastEventIdBySessionRef.current.get(sessionId) ?? 0;
        for (;;) {
          const events = await backendApiRef.current.fetchEventsAfter(sessionId, afterId, 200);
          if (!events.length) break;

          for (const event of events) {
            const eventId = typeof event.event_id === "number" ? event.event_id : Number(event.event_id);
            if (Number.isFinite(eventId)) afterId = Math.max(afterId, eventId);

            if (event.type === "title_changed" && typeof event.new_title === "string") {
              applyTitleChanged(sessionId, event.new_title);
            }

            if (event.type === "wallet_tx_request") {
              const payload = (event as unknown as { payload?: unknown }).payload;
              if (payload && typeof payload === "object") {
                const req = payload as Record<string, unknown>;
                if (typeof req.to === "string" && typeof req.value === "string" && typeof req.data === "string") {
                  const threadId = findTempIdForBackendId(sessionId) || sessionId;
                  handleWalletTxRequest(sessionId, threadId, req as unknown as WalletTxRequest);
                }
              }
            }
          }

          // If we hit the limit, keep draining in case more events are waiting.
          if (events.length < 200) break;
        }

        lastEventIdBySessionRef.current.set(sessionId, afterId);
      } catch (error) {
        console.error("Failed to fetch async events:", error);
      } finally {
        eventsInFlightRef.current.delete(sessionId);
      }
    },
    [applyTitleChanged, backendApiRef, findTempIdForBackendId, handleWalletTxRequest]
  );

  const ensureUpdateSubscription = useCallback(
    (sessionId: string) => {
      if (updateSubscriptionsRef.current.has(sessionId)) return;
      const unsubscribe = backendApiRef.current.subscribeToUpdates(
        sessionId,
        (update) => {
          if (update.type !== "event_available") return;
          void drainEvents(update.session_id);
        },
        (error) => {
          console.error("Failed to handle system update SSE:", error);
        }
      );
      updateSubscriptionsRef.current.set(sessionId, unsubscribe);
      // Don't call drainEvents immediately - only when SSE notifies of new events.
    },
    [backendApiRef, drainEvents]
  );

  const removeUpdateSubscription = useCallback((sessionId: string) => {
    const unsubscribe = updateSubscriptionsRef.current.get(sessionId);
    if (!unsubscribe) return;
    unsubscribe();
    updateSubscriptionsRef.current.delete(sessionId);
  }, []);

  useEffect(() => {
    const nextSessions = new Set<string>();
    // Only subscribe to the active thread.
    if (subscribableSessionId) {
      nextSessions.add(subscribableSessionId);
    }

    for (const sessionId of updateSubscriptionsRef.current.keys()) {
      if (!nextSessions.has(sessionId)) {
        removeUpdateSubscription(sessionId);
      }
    }

    for (const sessionId of nextSessions) {
      ensureUpdateSubscription(sessionId);
    }
  }, [
    ensureUpdateSubscription,
    removeUpdateSubscription,
    subscribableSessionId,
    updateSubscriptionsTick,
  ]);

  useEffect(() => {
    return () => {
      for (const unsubscribe of updateSubscriptionsRef.current.values()) {
        unsubscribe();
      }
      updateSubscriptionsRef.current.clear();
    };
  }, []);

  return {
    bumpUpdateSubscriptions,
    setSubscribableSessionId,
    subscribableSessionId,
  };
}
