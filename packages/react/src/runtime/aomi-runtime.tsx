"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject, ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  type AppendMessage,
  type ThreadMessageLike,
  useExternalStoreRuntime,
} from "@assistant-ui/react";

import { RuntimeActionsProvider } from "./hooks";
import { useRuntimeOrchestration } from "./orchestrator";
import { findTempIdForBackendId, isThreadReady, isThreadRunning, resolveThreadId } from "./backend-state";
import { isPlaceholderTitle, isTempThreadId } from "./utils";
import type { MessageController } from "./message-controller";
import { fetchThreadListWithPk, useThreadListAdapter } from "./thread-list";
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

  // hook to BackendApi, PollingController, and MessageController
  // in one render cycle, init them if needed
  // apply changes to ThreadContext based on BE state & polling interval
  const {
    backendStateRef,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    syncThreadState,
    backendApiRef,
  } = useRuntimeOrchestration(backendUrl, threadContextRef);

  // Concurrency checkpoint 🤝
  // make a thread-safe smart pointer for other hooks that useEffect
  const currentThreadIdRef = useRef(currentThreadId);
  currentThreadIdRef.current = currentThreadId;
  useEffect(() => {
    void syncThreadState(currentThreadId);
  }, [syncThreadState, currentThreadId]);

  useEffect(() => {
    setIsRunning(isThreadRunning(backendStateRef.current, currentThreadId));
  }, [backendStateRef, setIsRunning, currentThreadId]);

  const currentMessages = threadContext.getThreadMessages(currentThreadId);

  useEffect(() => {
    if (!publicKey) return;
    void fetchThreadListWithPk(publicKey, backendApiRef, threadContextRef);
  }, [backendApiRef, publicKey, threadContextRef]);

  const threadListAdapter = useThreadListAdapter({
    backendApiRef,
    backendStateRef,
    currentThreadIdRef,
    polling,
    publicKey,
    setIsRunning,
    threadContext,
    threadContextRef,
  });

  useEffect(() => {
    const unsubscribe = backendApiRef.current.subscribeToUpdates((update) => {
      if (update.type !== "TitleChanged") return;
      const sessionId = update.data.session_id;
      const newTitle = update.data.new_title;

      const backendState = backendStateRef.current;
      const targetThreadId =
        findTempIdForBackendId(backendState, sessionId) ??
        resolveThreadId(backendState, sessionId);
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

  useEffect(() => {
    if (!isTempThreadId(currentThreadId)) return;
    if (!isThreadReady(backendStateRef.current, currentThreadId)) return;
    void messageController.flushPendingChat(currentThreadId);
  }, [messageController, backendStateRef, currentThreadId]);

  const { setMessages, onNew, onCancel, sendSystemMessage } = useRuntimeCallbacks({
    currentThreadIdRef,
    messageController,
    threadContextRef,
  });

  const runtime = useExternalStoreRuntime({
    messages: currentMessages,
    setMessages,
    isRunning,
    onNew,
    onCancel,
    convertMessage: (msg) => msg,
    adapters: { threadList: threadListAdapter },
  });

  useEffect(() => {
    if (isTempThreadId(currentThreadId)) return;
    const hasUserMessages = currentMessages.some((msg) => msg.role === "user");
    if (hasUserMessages) {
      void messageController.flushPendingSystem(currentThreadId);
    }
  }, [currentMessages, messageController, currentThreadId]);

  useEffect(() => {
    return () => {
      polling.stopAll();
    };
  }, [polling]);

  return (
    <RuntimeActionsProvider value={{ sendSystemMessage }}>
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </RuntimeActionsProvider>
  );
}

type RuntimeCallbacksParams = {
  currentThreadIdRef: MutableRefObject<string>;
  messageController: MessageController;
  threadContextRef: MutableRefObject<ThreadContext>;
};

function useRuntimeCallbacks({
  currentThreadIdRef,
  messageController,
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
      messageController.outbound(message, currentThreadIdRef.current),
    [currentThreadIdRef, messageController]
  );

  const onCancel = useCallback(
    () => messageController.cancel(currentThreadIdRef.current),
    [currentThreadIdRef, messageController]
  );

  const sendSystemMessage = useCallback(
    (message: string) =>
      messageController.outboundSystem(currentThreadIdRef.current, message),
    [currentThreadIdRef, messageController]
  );

  return { setMessages, onNew, onCancel, sendSystemMessage };
}
