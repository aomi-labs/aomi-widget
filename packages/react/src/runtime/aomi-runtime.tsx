"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject, ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  type AppendMessage,
  type AssistantRuntime,
  type ThreadMessageLike,
  useExternalStoreRuntime,
} from "@assistant-ui/react";

import { RuntimeActionsProvider } from "./hooks";
import { useRuntimeOrchestration } from "./orchestration";
import { getTempIdForSession, isSessionReady, isSessionRunning, resolveSessionId } from "./backend-state";
import { isPlaceholderTitle, isTempThreadId } from "./utils";
import type { MessageConverter } from "./message-converter";
import { fetchPubkeyThreads, useThreadListAdapter, type ThreadListAdapter } from "./thread-list";
import { useThreadContext } from "../state/thread-context";
import type { ThreadContext } from "../state/thread-store";

export type AomiRuntimeProviderProps = {
  children: ReactNode;
  backendUrl?: string;
  publicKey?: string;
};

export function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  publicKey,
}: Readonly<AomiRuntimeProviderProps>) {
  // Get contextual state from ThreadContextProvider
  const threadContext = useThreadContext();
  const threadContextRef = useRef(threadContext);
  threadContextRef.current = threadContext;
  const currentThreadId = threadContext.currentThreadId;

  // hook to BackendApi, PollingController, and MessageConverter
  // in one render cycle, init them if needed
  // apply changes to ThreadContext based on BE state & polling interval
  const {
    backendStateRef,
    polling,
    messageConverter,
    isRunning,
    setIsRunning,
    syncThreadState,
    backendApiRef,
  } = useRuntimeOrchestration(backendUrl, threadContextRef);

  // Concurrency checkpoint 🤝
  // make a thread-safe smart pointer for other hooks that useEffect
  const currentThreadIdRef = useRef(currentThreadId);
  currentThreadIdRef.current = currentThreadId;
  // Syncs thread state with backend when currentThreadId changes
  useEffect(() => {
    void syncThreadState(currentThreadId);
  }, [syncThreadState, currentThreadId]);

  // Updates isRunning state based on whether the current thread is running
  useEffect(() => {
    setIsRunning(isSessionRunning(backendStateRef.current, currentThreadId));
  }, [backendStateRef, setIsRunning, currentThreadId]);

  const currentMessages = threadContext.getThreadMessages(currentThreadId);

  // Fetches thread list from backend when publicKey is available
  useEffect(() => {
    if (!publicKey) return;
    void fetchPubkeyThreads(publicKey, backendApiRef, threadContextRef);
  }, [backendApiRef, publicKey, threadContextRef]);

  // Subscribes to backend updates and handles title change events
  useEffect(() => {
    const unsubscribe = backendApiRef.current.subscribeToUpdates((update) => {
      if (update.type !== "TitleChanged") return;
      const sessionId = update.data.session_id;
      const newTitle = update.data.new_title;

      const backendState = backendStateRef.current;
      const targetThreadId =
        getTempIdForSession(backendState, sessionId) ??
        resolveSessionId(backendState, sessionId);
      const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
      threadContext.setThreadMetadata((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetThreadId);
        const nextStatus = existing?.status === "archived" ? "archived" : "regular";
        next.set(targetThreadId, {
          title: normalizedTitle,
          status: nextStatus,
          lastActiveAt: existing?.lastActiveAt ?? new Date().toISOString(),
        });
        return next;
      });
      if (!isPlaceholderTitle(newTitle) && backendState.creatingThreadId === targetThreadId) {
        backendState.creatingThreadId = null;
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [backendApiRef, backendStateRef, threadContext]);

  // Flushes pending chat messages when a temp thread is ready and mapped
  useEffect(() => {
    if (!isTempThreadId(currentThreadId)) return;
    if (!isSessionReady(backendStateRef.current, currentThreadId)) return;
    void messageConverter.flushPendingSession(currentThreadId);
  }, [messageConverter, backendStateRef, currentThreadId]);

  // Flushes pending system messages after user messages are sent
  useEffect(() => {
    if (isTempThreadId(currentThreadId)) return;
    const hasUserMessages = currentMessages.some((msg) => msg.role === "user");
    if (hasUserMessages) {
      void messageConverter.flushPendingSystem(currentThreadId);
    }
  }, [currentMessages, messageConverter, currentThreadId]);

  // Stops all polling when the provider unmounts
  useEffect(() => {
    return () => {
      polling.stopAll();
    };
  }, [polling]);

  const { setMessages, onNew, onCancel, sendSystemMessage } = useRuntimeCallbacks({
    currentThreadIdRef,
    messageConverter,
    threadContextRef,
  });

  const threadListAdapter: ThreadListAdapter = useThreadListAdapter({
    backendApiRef,
    backendStateRef,
    currentThreadIdRef,
    polling,
    publicKey,
    setIsRunning,
    threadContext,
    threadContextRef,
  });

  const runtime: AssistantRuntime = useExternalStoreRuntime({
    messages: currentMessages,
    setMessages,
    isRunning,
    onNew,
    onCancel,
    convertMessage: (msg) => msg,
    adapters: { threadList: threadListAdapter },
  });

  return (
    <RuntimeActionsProvider value={{ sendSystemMessage }}>
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </RuntimeActionsProvider>
  );
}

type RuntimeCallbacksParams = {
  currentThreadIdRef: MutableRefObject<string>;
  messageConverter: MessageConverter;
  threadContextRef: MutableRefObject<ThreadContext>;
};

function useRuntimeCallbacks({
  currentThreadIdRef,
  messageConverter,
  threadContextRef,
}: RuntimeCallbacksParams) {
  const setMessages = useCallback(
    (messages: readonly ThreadMessageLike[]) => {
      threadContextRef.current.setThreadMessages(currentThreadIdRef.current, [...messages]);
    },
    [currentThreadIdRef, threadContextRef]
  );

  const onNew = useCallback(
    (message: AppendMessage) =>
      messageConverter.outbound(message, currentThreadIdRef.current),
    [currentThreadIdRef, messageConverter]
  );

  const onCancel = useCallback(
    () => messageConverter.cancel(currentThreadIdRef.current),
    [currentThreadIdRef, messageConverter]
  );

  const sendSystemMessage = useCallback(
    (message: string) =>
      messageConverter.outboundSystem(currentThreadIdRef.current, message),
    [currentThreadIdRef, messageConverter]
  );

  return { setMessages, onNew, onCancel, sendSystemMessage };
}
