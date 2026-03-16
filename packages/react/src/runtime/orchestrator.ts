import type { MutableRefObject } from "react";
import { useCallback, useRef, useState } from "react";

import type { AomiClient, AomiMessage, AomiSystemEvent } from "@aomi-labs/client";
import type { UserState } from "../contexts/user-context";
import {
  useThreadContext,
  type ThreadContext,
} from "../contexts/thread-context";
import { MessageController } from "./message-controller";
import { PollingController } from "./polling-controller";
import {
  createBackendState,
  resolveThreadId,
  type BackendState,
} from "../state/backend-state";

type OrchestratorOptions = {
  getPublicKey?: () => string | undefined;
  getUserState?: () => UserState;
  getApp: () => string;
  getApiKey?: () => string | null;
  onSyncEvents?: (sessionId: string, events: AomiSystemEvent[]) => void;
};

export function useRuntimeOrchestrator(
  aomiClient: AomiClient,
  options: OrchestratorOptions,
) {
  const threadContext = useThreadContext();
  const threadContextRef = useRef<ThreadContext>(threadContext);
  threadContextRef.current = threadContext;
  const aomiClientRef = useRef(aomiClient);
  aomiClientRef.current = aomiClient;
  const backendStateRef = useRef<BackendState>(createBackendState());

  const [isRunning, setIsRunning] = useState(false);

  const messageControllerRef: MutableRefObject<MessageController | null> =
    useRef(null);
  const pollingRef: MutableRefObject<PollingController | null> = useRef(null);
  const pendingFetches = useRef<Set<string>>(new Set());

  if (!pollingRef.current) {
    pollingRef.current = new PollingController({
      aomiClientRef,
      backendStateRef,
      applyMessages: (threadId: string, msgs?: AomiMessage[] | null) => {
        messageControllerRef.current?.inbound(threadId, msgs);
      },
      onSyncEvents: options.onSyncEvents,
      getUserState: options.getUserState,
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
      aomiClientRef,
      backendStateRef,
      threadContextRef,
      polling: pollingRef.current,
      setGlobalIsRunning: setIsRunning,
      getPublicKey: options.getPublicKey,
      getApp: options.getApp,
      getApiKey: options.getApiKey,
      getUserState: options.getUserState,
      onSyncEvents: options.onSyncEvents,
    });
  }

  const ensureInitialState = useCallback(async (threadId: string) => {
    // Skip if already fetching this thread
    if (pendingFetches.current.has(threadId)) return;

    const backendThreadId = resolveThreadId(backendStateRef.current, threadId);
    pendingFetches.current.add(threadId);

    try {
      const userState = options.getUserState?.();
      const state = await aomiClientRef.current.fetchState(
        backendThreadId,
        userState,
      );
      messageControllerRef.current?.inbound(threadId, state.messages);
      if (state.system_events?.length && options.onSyncEvents) {
        options.onSyncEvents(backendThreadId, state.system_events);
      }

      if (threadContextRef.current.currentThreadId === threadId) {
        if (state.is_processing) {
          setIsRunning(true);
          pollingRef.current?.start(threadId);
        } else {
          setIsRunning(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch initial state:", error);
      if (threadContextRef.current.currentThreadId === threadId) {
        setIsRunning(false);
      }
    } finally {
      pendingFetches.current.delete(threadId);
    }
  }, []);

  return {
    backendStateRef,
    polling: pollingRef.current!,
    messageController: messageControllerRef.current!,
    isRunning,
    setIsRunning,
    ensureInitialState,
    aomiClientRef,
  };
}
