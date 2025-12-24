"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import type { BackendApi, SessionMessage } from "@/lib/backend-api";

type UseThreadPollingParams = {
  backendApiRef: RefObject<BackendApi>;
  currentThreadId: string;
  currentThreadIdRef: RefObject<string>;
  isThreadReady: (threadId: string) => boolean;
  resolveThreadId: (threadId: string) => string;
  applyMessagesForThread: (threadId: string, msgs?: SessionMessage[] | null) => void;
  handleBackendSystemEvents: (sessionId: string, threadId: string, events?: unknown[] | null) => void;
};

export function useThreadPolling({
  backendApiRef,
  currentThreadId,
  currentThreadIdRef,
  isThreadReady,
  resolveThreadId,
  applyMessagesForThread,
  handleBackendSystemEvents,
}: UseThreadPollingParams) {
  const [isRunning, setIsRunning] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingThreadIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    pollingThreadIdRef.current = null;
  }, []);

  const startPolling = useCallback(() => {
    if (!isThreadReady(currentThreadId)) return;
    if (pollingIntervalRef.current) {
      if (pollingThreadIdRef.current === currentThreadId) return;
      stopPolling();
    }
    const threadIdForPolling = currentThreadId;
    const backendThreadId = resolveThreadId(currentThreadId);
    setIsRunning(true);
    pollingThreadIdRef.current = threadIdForPolling;
    pollingIntervalRef.current = setInterval(async () => {
      try {
        if (currentThreadIdRef.current !== threadIdForPolling) return;
        const state = await backendApiRef.current.fetchState(backendThreadId);
        if (state.session_exists === false) {
          setIsRunning(false);
          stopPolling();
          return;
        }
        handleBackendSystemEvents(backendThreadId, threadIdForPolling, state.system_events);
        applyMessagesForThread(threadIdForPolling, state.messages);

        if (!state.is_processing) {
          setIsRunning(false);
          stopPolling();
        }
      } catch (error) {
        console.error("Polling error:", error);
        stopPolling();
        setIsRunning(false);
      }
    }, 500);
  }, [
    currentThreadId,
    currentThreadIdRef,
    applyMessagesForThread,
    backendApiRef,
    handleBackendSystemEvents,
    isThreadReady,
    resolveThreadId,
    stopPolling,
  ]);

  const interruptThread = useCallback(
    async (threadId: string) => {
      if (!isThreadReady(threadId)) return;
      const backendThreadId = resolveThreadId(threadId);
      try {
        await backendApiRef.current.postInterrupt(backendThreadId);
      } catch (error) {
        console.error("Failed to interrupt thread:", error);
      }
    },
    [backendApiRef, isThreadReady, resolveThreadId]
  );

  useEffect(() => stopPolling, [stopPolling]);

  return {
    interruptThread,
    isRunning,
    setIsRunning,
    startPolling,
    stopPolling,
  };
}
