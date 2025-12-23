import { useCallback, useRef, type MutableRefObject } from "react";

import type { BackendApi } from "../api/client";
import type { SessionMessage, SessionResponsePayload } from "../api/types";

type UsePollingParams = {
  backendApiRef: MutableRefObject<BackendApi>;
  currentThreadId: string;
  isThreadReady: (threadId: string) => boolean;
  resolveThreadId: (threadId: string) => string;
  applyMessages: (messages?: SessionMessage[] | null) => void;
  setIsRunning: (isRunning: boolean) => void;
};

export function usePolling({
  backendApiRef,
  currentThreadId,
  isThreadReady,
  resolveThreadId,
  applyMessages,
  setIsRunning,
}: UsePollingParams) {
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (!isThreadReady(currentThreadId)) return;
    if (pollingIntervalRef.current) return;
    const backendThreadId = resolveThreadId(currentThreadId);
    setIsRunning(true);
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const state = await backendApiRef.current.fetchState(backendThreadId);
        handleState(state, applyMessages, setIsRunning, stopPolling);
      } catch (error) {
        console.error("Polling error:", error);
        stopPolling();
        setIsRunning(false);
      }
    }, 500);
  }, [
    applyMessages,
    backendApiRef,
    currentThreadId,
    isThreadReady,
    resolveThreadId,
    setIsRunning,
    stopPolling,
  ]);

  return { startPolling, stopPolling };
}

function handleState(
  state: SessionResponsePayload,
  applyMessages: (messages?: SessionMessage[] | null) => void,
  setIsRunning: (isRunning: boolean) => void,
  stopPolling: () => void
) {
  if (state.session_exists === false) {
    setIsRunning(false);
    stopPolling();
    return;
  }

  applyMessages(state.messages);

  if (!state.is_processing) {
    setIsRunning(false);
    stopPolling();
  }
}
