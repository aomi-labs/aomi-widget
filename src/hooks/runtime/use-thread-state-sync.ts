"use client";

import { useEffect, type RefObject } from "react";

import type { BackendApi, SessionMessage } from "@/lib/backend-api";
import { isTempThreadId } from "@/lib/runtime-utils";

type UseThreadStateSyncParams = {
  backendApiRef: RefObject<BackendApi>;
  currentThreadId: string;
  currentThreadIdRef: RefObject<string>;
  resolveThreadId: (threadId: string) => string;
  isThreadReady: (threadId: string) => boolean;
  hasBackendId: (threadId: string) => boolean;
  skipInitialFetchRef: RefObject<Set<string>>;
  creatingThreadIdRef: RefObject<string | null>;
  setSubscribableSessionId: (sessionId: string | null) => void;
  setIsRunning: (running: boolean) => void;
  startPolling: () => void;
  stopPolling: () => void;
  applyMessagesForThread: (threadId: string, msgs?: SessionMessage[] | null) => void;
  handleBackendSystemEvents: (sessionId: string, threadId: string, events?: unknown[] | null) => void;
};

export function useThreadStateSync({
  backendApiRef,
  currentThreadId,
  currentThreadIdRef,
  resolveThreadId,
  isThreadReady,
  hasBackendId,
  skipInitialFetchRef,
  creatingThreadIdRef,
  setSubscribableSessionId,
  setIsRunning,
  startPolling,
  stopPolling,
  applyMessagesForThread,
  handleBackendSystemEvents,
}: UseThreadStateSyncParams) {
  useEffect(() => {
    const fetchInitialState = async () => {
      const threadIdForFetch = currentThreadId;

      // For temp threads without a backend ID yet, skip fetching.
      if (isTempThreadId(threadIdForFetch) && !hasBackendId(threadIdForFetch)) {
        if (currentThreadIdRef.current === threadIdForFetch) {
          setSubscribableSessionId(null);
          setIsRunning(false);
        }
        return;
      }

      // Skip initial fetch for newly created threads (switched from temp to real).
      // This prevents fetchState from clearing input when the thread was just created.
      if (skipInitialFetchRef.current.has(threadIdForFetch)) {
        skipInitialFetchRef.current.delete(threadIdForFetch);
        if (creatingThreadIdRef.current === threadIdForFetch) {
          if (isThreadReady(threadIdForFetch) && currentThreadIdRef.current === threadIdForFetch) {
            setSubscribableSessionId(resolveThreadId(threadIdForFetch));
          }
          if (currentThreadIdRef.current === threadIdForFetch) {
            setIsRunning(false);
          }
          return;
        }
      }

      const backendThreadId = resolveThreadId(threadIdForFetch);

      try {
        const state = await backendApiRef.current.fetchState(backendThreadId);
        if (state.session_exists === false) {
          if (currentThreadIdRef.current === threadIdForFetch) {
            setSubscribableSessionId(null);
            setIsRunning(false);
          }
          return;
        }
        handleBackendSystemEvents(backendThreadId, threadIdForFetch, state.system_events);
        applyMessagesForThread(threadIdForFetch, state.messages);

        if (currentThreadIdRef.current === threadIdForFetch) {
          setSubscribableSessionId(backendThreadId);
          if (state.is_processing) {
            setIsRunning(true);
            startPolling();
          } else {
            setIsRunning(false);
          }
        }
      } catch (error) {
        console.error("Failed to fetch initial state:", error);
      }
    };

    void fetchInitialState();
    return () => {
      stopPolling();
    };
  }, [
    applyMessagesForThread,
    backendApiRef,
    creatingThreadIdRef,
    currentThreadId,
    currentThreadIdRef,
    handleBackendSystemEvents,
    hasBackendId,
    isThreadReady,
    resolveThreadId,
    setIsRunning,
    setSubscribableSessionId,
    skipInitialFetchRef,
    startPolling,
    stopPolling,
  ]);
}
