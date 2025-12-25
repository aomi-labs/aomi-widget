import type { MutableRefObject } from "react";
import { useCallback, useRef, useState } from "react";

import { BackendApi } from "../api/client";
import type { SessionMessage } from "../api/types";
import { useThreadContext } from "../state/thread-context";
import type { ThreadContext } from "../state/thread-store";
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
      onStop: (threadId: string) => {
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(false);
        }
      },
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
      const isCurrentThread = threadContextRef.current.currentThreadId === threadId;
      if (shouldSkipInitialFetch(backendState, threadId)) {
        clearSkipInitialFetch(backendState, threadId);
        if (isCurrentThread) {
          setIsRunning(false);
        }
        return;
      }

      if (!isThreadReady(backendState, threadId)) {
        if (isCurrentThread) {
          setIsRunning(false);
        }
        return;
      }

      const backendThreadId = resolveThreadId(backendState, threadId);
      try {
        const state = await backendApiRef.current.fetchState(backendThreadId);
        messageControllerRef.current?.inbound(threadId, state.messages);
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
