import type { MutableRefObject } from "react";
import { useMemo, useRef, useState } from "react";

import { BackendApi } from "../api/client";
import type { SessionMessage } from "../api/types";
import { useThreadContext, type ThreadContextValue } from "../state/thread-context";
import type { ThreadMetadata } from "../state/types";
import { MessageController } from "./message-controller";
import { PollingController } from "./polling-controller";
import { ThreadRegistry } from "./thread-registry";

export function useRuntimeOrchestrator(backendUrl: string) {
  const threadContext = useThreadContext();
  const backendApiRef = useRef(new BackendApi(backendUrl));

  const [isRunning, setIsRunning] = useState(false);

  const registry = useMemo(
    () =>
      new ThreadRegistry({
        getThreadMessages: threadContext.getThreadMessages,
        setThreadMessages: threadContext.setThreadMessages,
        updateThreadMetadata: threadContext.updateThreadMetadata,
        setThreadMetadata: threadContext.setThreadMetadata,
        setThreadCnt: threadContext.setThreadCnt,
        setThreads: threadContext.setThreads,
        threadCnt: threadContext.threadCnt,
        threadMetadata: threadContext.threadMetadata,
        getCurrentThreadId: () => threadContext.currentThreadId,
        setCurrentThreadId: threadContext.setCurrentThreadId,
      }),
    [
      threadContext.getThreadMessages,
      threadContext.setThreadMessages,
      threadContext.updateThreadMetadata,
      threadContext.setThreadMetadata,
      threadContext.setThreadCnt,
      threadContext.setThreads,
      threadContext.threadCnt,
      threadContext.threadMetadata,
      threadContext.currentThreadId,
      threadContext.setCurrentThreadId,
    ]
  );

  const polling = useMemo(
    () =>
      new PollingController({
        backendApiRef,
        registry,
        applyMessages: (threadId: string, msgs?: SessionMessage[] | null) => {
          messageControllerRef.current?.applyBackendMessages(threadId, msgs);
        },
        onStop: () => setIsRunning(false),
      }),
    [registry]
  );

  const messageControllerRef: MutableRefObject<MessageController | null> = useRef(null);

  const messageController = useMemo(() => {
    const controller = new MessageController({
      backendApiRef,
      registry,
      polling,
      setGlobalIsRunning: setIsRunning,
    });
    messageControllerRef.current = controller;
    return controller;
  }, [polling, registry]);

  const ensureInitialState = useMemo(
    () => async (threadId: string) => {
      if (registry.shouldSkipInitialFetch(threadId)) {
        registry.clearSkipInitialFetch(threadId);
        setIsRunning(false);
        return;
      }

      if (!registry.isThreadReady(threadId)) {
        setIsRunning(false);
        return;
      }

      const backendThreadId = registry.resolveThreadId(threadId);
      try {
        const state = await backendApiRef.current.fetchState(backendThreadId);
        messageController.applyBackendMessages(threadId, state.messages);
        if (state.is_processing) {
          setIsRunning(true);
          polling.start(threadId);
        } else {
          setIsRunning(false);
        }
      } catch (error) {
        console.error("Failed to fetch initial state:", error);
        setIsRunning(false);
      }
    },
    [backendApiRef, messageController, polling, registry]
  );

  return {
    registry,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    ensureInitialState,
    backendApiRef,
  };
}
