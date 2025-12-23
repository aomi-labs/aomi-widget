import type { MutableRefObject } from "react";
import { useCallback, useRef, useState } from "react";

import { BackendApi } from "../api/client";
import type { SessionMessage } from "../api/types";
import { useThreadContext, type ThreadContextValue } from "../state/thread-context";
import { MessageController } from "./message-controller";
import { PollingController } from "./polling-controller";
import {
  clearSkipInitialFetch,
  createThreadRuntimeState,
  isThreadReady,
  resolveThreadId,
  shouldSkipInitialFetch,
  type ThreadRuntimeState,
} from "./runtime-state";

export function useRuntimeOrchestrator(backendUrl: string) {
  const threadContext = useThreadContext();
  const threadContextRef = useRef<ThreadContextValue>(threadContext);
  threadContextRef.current = threadContext;
  const backendApiRef = useRef(new BackendApi(backendUrl));
  const runtimeStateRef = useRef<ThreadRuntimeState>(createThreadRuntimeState());

  const [isRunning, setIsRunning] = useState(false);

  const messageControllerRef: MutableRefObject<MessageController | null> = useRef(null);
  const pollingRef: MutableRefObject<PollingController | null> = useRef(null);

  if (!pollingRef.current) {
    pollingRef.current = new PollingController({
      backendApiRef,
      runtimeStateRef,
      applyMessages: (threadId: string, msgs?: SessionMessage[] | null) => {
        messageControllerRef.current?.applyBackendMessages(threadId, msgs);
      },
      onStop: () => setIsRunning(false),
    });
  }

  if (!messageControllerRef.current) {
    messageControllerRef.current = new MessageController({
      backendApiRef,
      runtimeStateRef,
      threadContextRef,
      polling: pollingRef.current,
      setGlobalIsRunning: setIsRunning,
    });
  }

  const ensureInitialState = useCallback(
    async (threadId: string) => {
      const runtimeState = runtimeStateRef.current;
      if (shouldSkipInitialFetch(runtimeState, threadId)) {
        clearSkipInitialFetch(runtimeState, threadId);
        setIsRunning(false);
        return;
      }

      if (!isThreadReady(runtimeState, threadId)) {
        setIsRunning(false);
        return;
      }

      const backendThreadId = resolveThreadId(runtimeState, threadId);
      try {
        const state = await backendApiRef.current.fetchState(backendThreadId);
        messageControllerRef.current?.applyBackendMessages(threadId, state.messages);
        if (state.is_processing) {
          setIsRunning(true);
          pollingRef.current?.start(threadId);
        } else {
          setIsRunning(false);
        }
      } catch (error) {
        console.error("Failed to fetch initial state:", error);
        setIsRunning(false);
      }
    },
    [backendApiRef, runtimeStateRef, pollingRef, messageControllerRef, setIsRunning]
  );

  return {
    runtimeStateRef,
    polling: pollingRef.current!,
    messageController: messageControllerRef.current!,
    isRunning,
    setIsRunning,
    ensureInitialState,
    backendApiRef,
  };
}
