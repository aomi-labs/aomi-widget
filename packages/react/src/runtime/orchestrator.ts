import type { MutableRefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

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

type SystemEventsHandler = (
  sessionId: string,
  threadId: string,
  events?: unknown[] | null
) => void;

export function useRuntimeOrchestrator(backendUrl: string) {
  const threadContext = useThreadContext();
  const threadContextRef = useRef<ThreadContext>(threadContext);
  threadContextRef.current = threadContext;
  const backendApiRef = useRef(new BackendApi(backendUrl));
  const backendStateRef = useRef<BakendState>(createBakendState());

  const [isRunning, setIsRunning] = useState(false);

  const messageControllerRef: MutableRefObject<MessageController | null> = useRef(null);
  const pollingRef: MutableRefObject<PollingController | null> = useRef(null);
  const systemEventsHandlerRef = useRef<SystemEventsHandler | null>(null);
  const inFlightRef = useRef<Map<string, AbortController>>(new Map());

  if (!pollingRef.current) {
    pollingRef.current = new PollingController({
      backendApiRef,
      backendStateRef,
      applyMessages: (threadId: string, msgs?: SessionMessage[] | null) => {
        messageControllerRef.current?.inbound(threadId, msgs);
      },
      onStart: (threadId: string) => {
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(true);
        }
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

  const setSystemEventsHandler = useCallback((handler: SystemEventsHandler | null) => {
    systemEventsHandlerRef.current = handler;
    pollingRef.current?.setSystemEventsHandler(handler ?? undefined);
  }, []);

  useEffect(() => {
    return () => {
      for (const controller of inFlightRef.current.values()) {
        controller.abort();
      }
      inFlightRef.current.clear();
    };
  }, []);

  const ensureInitialState = useCallback(
    async (threadId: string) => {
      const backendState = backendStateRef.current;
      if (shouldSkipInitialFetch(backendState, threadId)) {
        clearSkipInitialFetch(backendState, threadId);
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(false);
        }
        return;
      }

      if (!isThreadReady(backendState, threadId)) {
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(false);
        }
        return;
      }

      if (inFlightRef.current.has(threadId)) {
        return;
      }

      const backendThreadId = resolveThreadId(backendState, threadId);
      const controller = new AbortController();
      inFlightRef.current.set(threadId, controller);
      try {
        console.log("🔵 [Orchestrator] Fetching initial state for threadId:", threadId);
        const state = await backendApiRef.current.fetchState(backendThreadId, {
          signal: controller.signal,
        });
        messageControllerRef.current?.inbound(threadId, state.messages);
        // Handle system events if handler is provided
        if (systemEventsHandlerRef.current && state.system_events) {
          systemEventsHandlerRef.current(backendThreadId, threadId, state.system_events);
        }
        if (state.is_processing) {
          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(true);
          }
          pollingRef.current?.start(threadId);
        } else {
          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(false);
          }
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Failed to fetch initial state:", error);
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(false);
        }
      } finally {
        if (inFlightRef.current.get(threadId) === controller) {
          inFlightRef.current.delete(threadId);
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
    setSystemEventsHandler,
    backendApiRef,
  };
}
