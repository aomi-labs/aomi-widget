import type { MutableRefObject } from "react";

import type { BackendApi } from "../api/client";
import type { SessionMessage } from "../api/types";

export type PollingDependencies = {
  backendApiRef: MutableRefObject<BackendApi>;
  pollingIntervalRef: MutableRefObject<ReturnType<typeof setInterval> | null>;
  resolveThreadId: (threadId: string) => string;
  applyMessages: (messages?: SessionMessage[] | null) => void;
  isThreadReady: (threadId: string) => boolean;
  currentThreadIdRef: MutableRefObject<string>;
  setIsRunning: (running: boolean) => void;
};

export function createPollingController({
  backendApiRef,
  pollingIntervalRef,
  resolveThreadId,
  applyMessages,
  isThreadReady,
  currentThreadIdRef,
  setIsRunning,
}: PollingDependencies) {
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const startPolling = () => {
    const threadId = currentThreadIdRef.current;
    if (!isThreadReady(threadId)) return;
    if (pollingIntervalRef.current) return;
    const backendThreadId = resolveThreadId(threadId);
    setIsRunning(true);
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const state = await backendApiRef.current.fetchState(backendThreadId);
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
      } catch (error) {
        console.error("Polling error:", error);
        stopPolling();
        setIsRunning(false);
      }
    }, 500);
  };

  return { startPolling, stopPolling };
}
