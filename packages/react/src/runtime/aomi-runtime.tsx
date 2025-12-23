"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
} from "@assistant-ui/react";

import { RuntimeActionsProvider } from "./hooks";
import { useRuntimeOrchestrator } from "./orchestrator";
import { createThreadListAdapter } from "./thread-list-adapter";
import { isPlaceholderTitle, isTempThreadId } from "./utils";
import { useThreadContext } from "../state/thread-context";

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
  const threadContext = useThreadContext();
  const {
    registry,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    ensureInitialState,
    backendApiRef,
  } = useRuntimeOrchestrator(backendUrl);

  const currentThreadIdRef = useRef(threadContext.currentThreadId);
  useEffect(() => {
    currentThreadIdRef.current = threadContext.currentThreadId;
  }, [threadContext.currentThreadId]);

  // Map-backed refs to reuse the existing thread list adapter API.
  const pendingChatMessagesRef = useRef(registry.getPendingChatMap());
  const pendingSystemMessagesRef = useRef(registry.getPendingSystemMap());
  const tempToBackendIdRef = useRef(registry.getTempToBackendMap());
  const skipInitialFetchRef = useRef(registry.getSkipInitialFetchSet());
  const creatingThreadIdRef = useRef<string | null>(null);
  const createThreadPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    void ensureInitialState(threadContext.currentThreadId);
  }, [ensureInitialState, threadContext.currentThreadId]);

  const threadListAdapter = useMemo(() => {
    const threadListApi = registry.getThreadListApi();

    return createThreadListAdapter({
      ...threadListApi,
      currentThreadId: threadContext.currentThreadId,
      currentThreadIdRef,
      setIsRunning,
      bumpThreadViewKey: threadContext.bumpThreadViewKey,
      findPendingThreadId: () => {
        if (creatingThreadIdRef.current) return creatingThreadIdRef.current;
        for (const [id, meta] of threadListApi.threadMetadata.entries()) {
          if (meta.status === "pending") return id;
        }
        return null;
      },
      creatingThreadIdRef,
      createThreadPromiseRef,
      pendingChatMessagesRef,
      pendingSystemMessagesRef,
      tempToBackendIdRef,
      skipInitialFetchRef,
      backendApiRef,
      publicKey,
      resolveThreadId: (threadId: string) => registry.resolveThreadId(threadId),
      startPolling: (threadId?: string) => polling.start(threadId ?? threadContext.currentThreadId),
      updateThreadMetadata: threadListApi.updateThreadMetadata,
    });
  }, [
    backendApiRef,
    polling,
    publicKey,
    registry,
    setIsRunning,
    threadContext.bumpThreadViewKey,
    threadContext.currentThreadId,
  ]);

  useEffect(() => {
    const unsubscribe = backendApiRef.current.subscribeToUpdates((update) => {
      if (update.type !== "TitleChanged") return;
      const sessionId = update.data.session_id;
      const newTitle = update.data.new_title;

      const targetThreadId =
        registry.findTempIdForBackendId(sessionId) ?? registry.resolveThreadId(sessionId);
      const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
      threadContext.updateThreadMetadata(targetThreadId, {
        title: normalizedTitle,
      });
      if (!isPlaceholderTitle(newTitle) && creatingThreadIdRef.current === targetThreadId) {
        creatingThreadIdRef.current = null;
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [backendApiRef, registry, threadContext]);

  useEffect(() => {
    const threadId = currentThreadIdRef.current;
    if (!isTempThreadId(threadId)) return;
    if (!registry.isThreadReady(threadId)) return;
    void messageController.flushPendingSystem(threadId);
    void messageController.flushPendingChat(threadId);
  }, [messageController, registry]);

  const runtime = useExternalStoreRuntime({
    messages: threadContext.getThreadMessages(threadContext.currentThreadId),
    isRunning,
    onNew: (message: AppendMessage) =>
      messageController.sendChat(message, threadContext.currentThreadId),
    onCancel: () => messageController.cancel(threadContext.currentThreadId),
    convertMessage: (msg) => msg,
    adapters: { threadList: threadListAdapter },
  });

  return (
    <RuntimeActionsProvider
      value={{
        sendSystemMessage: (message: string) =>
          messageController.sendSystemMessage(threadContext.currentThreadId, message),
      }}
    >
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </RuntimeActionsProvider>
  );
}
