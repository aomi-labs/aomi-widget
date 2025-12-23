import type { MutableRefObject } from "react";
import { useCallback, useRef, useState } from "react";

import { BackendApi } from "../api/client";
import type { SessionMessage } from "../api/types";
import { useThreadContext, type ThreadContext } from "../state/thread-context";
import { MessageController } from "./message-controller";
import { PollingController } from "./polling-controller";
import {
  clearSkipInitialFetch,
  createBakendState,
  isThreadReady,
  resolveThreadId,
  shouldSkipInitialFetch,
  type BakendState,
} from "./backend-state";

export function useRuntimeOrchestrator(backendUrl: string) {
  const threadContext = useThreadContext();
  const threadContextRef = useRef<ThreadContext>(threadContext);
  threadContextRef.current = threadContext;
  const backendApiRef = useRef(new BackendApi(backendUrl));
  const backendStateRef = useRef<BakendState>(createBakendState());

  const [isRunning, setIsRunning] = useState(false);

  const messageControllerRef: MutableRefObject<MessageController | null> = useRef(null);
  const pollingRef: MutableRefObject<PollingController | null> = useRef(null);

  if (!pollingRef.current) {
    pollingRef.current = new PollingController({
      backendApiRef,
      backendStateRef,
      applyMessages: (threadId: string, msgs?: SessionMessage[] | null) => {
        messageControllerRef.current?.inbound(threadId, msgs);
      },
      onStop: () => setIsRunning(false),
    });
  }

  if (!messageControllerRef.current) {
    messageControllerRef.current = new MessageController({
      backendApiRef,
      backendStateRef,
      threadContextRef,
      polling: pollingRef.current,
      setGlobalIsRunning: setIsRunning,
    });
  }

  const ensureInitialState = useCallback(
    async (threadId: string) => {
      const backendState = backendStateRef.current;
      if (shouldSkipInitialFetch(backendState, threadId)) {
        clearSkipInitialFetch(backendState, threadId);
        setIsRunning(false);
        return;
      }

      if (!isThreadReady(backendState, threadId)) {
        setIsRunning(false);
        return;
      }

      const backendThreadId = resolveThreadId(backendState, threadId);
      try {
        const state = await backendApiRef.current.fetchState(backendThreadId);
        messageControllerRef.current?.inbound(threadId, state.messages);
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
    [backendApiRef, backendStateRef, pollingRef, messageControllerRef, setIsRunning]
  );

  return {
    backendStateRef,
    polling: pollingRef.current!,
    messageController: messageControllerRef.current!,
    isRunning,
    setIsRunning,
    ensureInitialState,
    backendApiRef,
  };
}
