import type { MutableRefObject } from "react";
import { useCallback, useRef, useState } from "react";

import { BackendApi } from "../api/client";
import type { SessionMessage } from "../api/types";
import type { ThreadContext } from "../state/thread-store";
import { MessageConverter } from "./message-converter";
import { PollingController } from "./polling-controller";
import {
  clearSkipInitialFetch,
  createBakendState,
  isSessionReady,
  resolveSessionId,
  shouldSkipInitialFetch,
  type BakendState,
} from "./backend-state";

export function useRuntimeOrchestration(
  backendUrl: string,
  threadContextRef: MutableRefObject<ThreadContext>
) {
  const backendApiRef = useRef<BackendApi | null>(null);
  if (!backendApiRef.current) {
    // Init whenever the backendUrl changes or null
    backendApiRef.current = new BackendApi(backendUrl);
  }
  // useRef always graps BakendState if not null, otherwise runs createBakendState()
  const backendApi = backendApiRef as MutableRefObject<BackendApi>;
  const backendStateRef = useRef<BakendState>(createBakendState());

  // Local state inside the DOM tree, re-init everytime
  const [isRunning, setIsRunning] = useState(false);

  const messageConverterRef = useRef<MessageConverter | null>(null);
  const pollingRef = useRef<PollingController | null>(null);

  if (!pollingRef.current) {
    // Init once, polling is an singleton state machine with ref of backend, and msgs functions 
    // keeps a map of threadId -> intervalId
    pollingRef.current = new PollingController({
      backendApiRef: backendApi,
      backendStateRef,
      // find the right time to run applyMessages
      applyMessages: (threadId: string, msgs?: SessionMessage[] | null) => {
        messageConverterRef.current?.inbound(threadId, msgs);
      },
      onStop: (threadId: string) => {
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(false);
        }
      },
    });
  }

  if (!messageConverterRef.current) {
    // Singleton processor interface, stateless
    messageConverterRef.current = new MessageConverter({
      backendApiRef: backendApi,
      backendStateRef,
      threadContextRef,
      polling: pollingRef.current,
      setGlobalIsRunning: setIsRunning,
    });
  }
  // - On mount / page load: it runs for the current thread to pull existing messages and processing state.
  // - On thread switch: it runs for the newly selected thread to load its messages and start/stop polling.
  // - New temp thread: it does nothing until the temp thread is mapped to a backend thread (isSessionReady becomes true).
  const syncThreadState = useCallback(
    async (threadId: string) => {
      const backendState = backendStateRef.current;
      const isCurrentThread = threadContextRef.current.currentThreadId === threadId;
      //  If this thread is marked to skip the initial fetch, clear the flag and stop 
      if (shouldSkipInitialFetch(backendState, threadId)) {
        clearSkipInitialFetch(backendState, threadId);
        if (isCurrentThread) {
          setIsRunning(false);
        }
        return;
      }
      //  If the thread isn’t “ready” yet (e.g., temp thread not mapped), stop and return 
      if (!isSessionReady(backendState, threadId)) {
        if (isCurrentThread) {
          setIsRunning(false);
        }
        return;
      }
      // The thread had registered with BE! 
      const sessionId = resolveSessionId(backendState, threadId);
      try {
        // 🌸 BE -> UI sync point with POST
        const state = await backendApi.current.fetchState(sessionId);
        // conversion from BE type to UI type and apply to ThreadContext
        messageConverterRef.current?.inbound(threadId, state.messages);
        if (state.is_processing) {
          if (isCurrentThread) {
            setIsRunning(true);
          }
          pollingRef.current?.start(threadId);
        } else {
          if (isCurrentThread) {
            setIsRunning(false);
          }
        }
      } catch (error) {
        console.error("Failed to fetch initial state:", error);
        if (isCurrentThread) {
          setIsRunning(false);
        }
      }
    },
    [
      backendApi,
      backendStateRef,
      pollingRef,
      messageConverterRef,
      setIsRunning,
      threadContextRef,
    ]
  );

  return {
    backendStateRef,
    polling: pollingRef.current!,
    messageConverter: messageConverterRef.current!,
    isRunning,
    setIsRunning,
    syncThreadState,
    backendApiRef: backendApi,
  };
}
