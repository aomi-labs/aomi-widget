"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react";

import { BackendApi } from "../api/client";
import type { SessionMessage } from "../api/types";
import { createMessageHandlers } from "./message-handlers";
import { createPollingController } from "./polling";
import { createThreadListAdapter, normalizeBackendThreads } from "./thread-list-adapter";
import { RuntimeActionsProvider } from "./hooks";
import { isPlaceholderTitle, isTempThreadId } from "./utils";
import { constructSystemMessage, constructThreadMessage } from "../utils/conversion";
import { useThreadContext } from "../state/thread-context";
import type { ThreadMetadata } from "../state/types";

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
  const {
    currentThreadId,
    setCurrentThreadId,
    bumpThreadViewKey,
    threads,
    setThreads,
    threadMetadata,
    setThreadMetadata,
    threadCnt,
    setThreadCnt,
    getThreadMessages,
    setThreadMessages,
    updateThreadMetadata,
  } = useThreadContext();

  const [isRunning, setIsRunning] = useState(false);
  const backendApiRef = useRef(new BackendApi(backendUrl));
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingSystemMessagesRef = useRef<Map<string, string[]>>(new Map());
  const pendingChatMessagesRef = useRef<Map<string, string[]>>(new Map());
  const creatingThreadIdRef = useRef<string | null>(null);
  const createThreadPromiseRef = useRef<Promise<void> | null>(null);

  const findPendingThreadId = useCallback(() => {
    if (creatingThreadIdRef.current) return creatingThreadIdRef.current;
    for (const [id, meta] of threadMetadata.entries()) {
      if (meta.status === "pending") return id;
    }
    return null;
  }, [threadMetadata]);

  const currentThreadIdRef = useRef(currentThreadId);
  useEffect(() => {
    currentThreadIdRef.current = currentThreadId;
  }, [currentThreadId]);

  const skipInitialFetchRef = useRef<Set<string>>(new Set());
  const tempToBackendIdRef = useRef<Map<string, string>>(new Map());

  const resolveThreadId = useCallback((threadId: string): string => {
    return tempToBackendIdRef.current.get(threadId) || threadId;
  }, []);

  const findTempIdForBackendId = useCallback((backendId: string): string | undefined => {
    for (const [tempId, bId] of tempToBackendIdRef.current.entries()) {
      if (bId === backendId) return tempId;
    }
    return undefined;
  }, []);

  const isThreadReady = useCallback((threadId: string): boolean => {
    if (!isTempThreadId(threadId)) return true;
    return tempToBackendIdRef.current.has(threadId);
  }, []);

  const applyMessages = useCallback(
    (msgs?: SessionMessage[] | null) => {
      if (!msgs) return;

      const activeThreadId = currentThreadIdRef.current;
      const hasPendingMessages =
        pendingChatMessagesRef.current.has(activeThreadId) &&
        (pendingChatMessagesRef.current.get(activeThreadId)?.length ?? 0) > 0;
      if (hasPendingMessages) {
        console.log("Skipping applyMessages - pending messages exist for thread:", activeThreadId);
        return;
      }

      const threadMessages: ThreadMessageLike[] = [];

      for (const msg of msgs) {
        if (msg.sender === "system") {
          const systemMessage = constructSystemMessage(msg);
          if (systemMessage) {
            threadMessages.push(systemMessage);
          }
          continue;
        }
        const threadMessage = constructThreadMessage(msg);
        if (threadMessage) {
          threadMessages.push(threadMessage);
        }
      }

      setThreadMessages(activeThreadId, threadMessages);
    },
    [setThreadMessages]
  );

  useEffect(() => {
    backendApiRef.current = new BackendApi(backendUrl);
  }, [backendUrl]);

  const { startPolling, stopPolling } = useMemo(
    () =>
      createPollingController({
        backendApiRef,
        pollingIntervalRef,
        resolveThreadId,
        applyMessages,
        isThreadReady,
        currentThreadIdRef,
        setIsRunning,
      }),
    [applyMessages, isThreadReady, resolveThreadId]
  );

  useEffect(() => {
    const fetchInitialState = async () => {
      const threadId = currentThreadIdRef.current;
      if (isTempThreadId(threadId) && !tempToBackendIdRef.current.has(threadId)) {
        setIsRunning(false);
        return;
      }

      if (skipInitialFetchRef.current.has(threadId)) {
        skipInitialFetchRef.current.delete(threadId);
        setIsRunning(false);
        return;
      }

      const backendThreadId = resolveThreadId(threadId);

      try {
        const state = await backendApiRef.current.fetchState(backendThreadId);
        if (state.session_exists === false) {
          setIsRunning(false);
          return;
        }
        applyMessages(state.messages);

        if (state.is_processing) {
          setIsRunning(true);
          startPolling();
        } else {
          setIsRunning(false);
        }
      } catch (error) {
        console.error("Failed to fetch initial state:", error);
      }
    };

    void fetchInitialState();
    return () => {
      stopPolling();
    };
  }, [applyMessages, resolveThreadId, startPolling, stopPolling]);

  useEffect(() => {
    if (!publicKey) return;

    const fetchThreadList = async () => {
      try {
        const threadList = await backendApiRef.current.fetchThreads(publicKey);
        const { metadata, maxChatNum } = normalizeBackendThreads(threadList, threadMetadata, threadCnt);
        setThreadMetadata(metadata);
        if (maxChatNum > threadCnt) {
          setThreadCnt(maxChatNum);
        }
      } catch (error) {
        console.error("Failed to fetch thread list:", error);
      }
    };

    void fetchThreadList();
  }, [publicKey, setThreadCnt, setThreadMetadata, threadCnt, threadMetadata]);

  const threadListAdapter = useMemo(
    () =>
      createThreadListAdapter({
        currentThreadId,
        currentThreadIdRef,
        threadMetadata,
        setThreadMetadata,
        setThreads,
        setThreadMessages,
        setCurrentThreadId,
        setIsRunning,
        bumpThreadViewKey,
        findPendingThreadId,
        creatingThreadIdRef,
        createThreadPromiseRef,
        pendingChatMessagesRef,
        pendingSystemMessagesRef,
        tempToBackendIdRef,
        skipInitialFetchRef,
        backendApiRef,
        publicKey,
        threadCnt,
        setThreadCnt,
        resolveThreadId,
        startPolling,
        updateThreadMetadata: (id: string, updates: Partial<ThreadMetadata>) =>
          updateThreadMetadata(id, updates),
      }),
    [
      backendApiRef,
      bumpThreadViewKey,
      currentThreadId,
      findPendingThreadId,
      publicKey,
      resolveThreadId,
      setCurrentThreadId,
      setIsRunning,
      setThreadCnt,
      setThreadMetadata,
      setThreadMessages,
      setThreads,
      startPolling,
      threadCnt,
      threadMetadata,
      updateThreadMetadata,
    ]
  );

  const currentMessages = getThreadMessages(currentThreadId);

  const {
    onNew,
    onCancel,
    sendSystemMessage,
    sendSystemMessageNow,
    flushPendingSystemMessages,
    flushPendingChatMessages,
  } = useMemo(
    () =>
      createMessageHandlers({
        backendApiRef,
        resolveThreadId,
        getThreadMessages,
        setThreadMessages,
        setIsRunning,
        startPolling,
        stopPolling,
        isThreadReady,
        pendingSystemMessagesRef,
        pendingChatMessagesRef,
        updateThreadMetadata,
        getCurrentThreadId: () => currentThreadIdRef.current,
        getCurrentMessages: () => getThreadMessages(currentThreadIdRef.current),
      }),
    [
      backendApiRef,
      getThreadMessages,
      isThreadReady,
      resolveThreadId,
      setThreadMessages,
      setIsRunning,
      startPolling,
      stopPolling,
      updateThreadMetadata,
    ]
  );

  useEffect(() => {
    if (isTempThreadId(currentThreadId)) return;
    const hasUserMessages = currentMessages.some((msg) => msg.role === "user");
    if (hasUserMessages) {
      void flushPendingSystemMessages(currentThreadId);
    }
  }, [currentMessages, currentThreadId, flushPendingSystemMessages]);

  useEffect(() => {
    const unsubscribe = backendApiRef.current.subscribeToUpdates(
      (update) => {
        if (update.type !== "TitleChanged") return;
        const sessionId = update.data.session_id;
        const newTitle = update.data.new_title;

        const tempId = findTempIdForBackendId(sessionId);
        const threadIdToUpdate = tempId || sessionId;

        setThreadMetadata((prev) => {
          const next = new Map(prev);
          const existing = next.get(threadIdToUpdate);
          const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
          const nextStatus = existing?.status === "archived" ? "archived" : "regular";
          next.set(threadIdToUpdate, {
            title: normalizedTitle,
            status: nextStatus,
            lastActiveAt: existing?.lastActiveAt ?? new Date().toISOString(),
          });
          return next;
        });
        if (!isPlaceholderTitle(newTitle) && creatingThreadIdRef.current === threadIdToUpdate) {
          creatingThreadIdRef.current = null;
        }
      },
      (error) => {
        console.error("Failed to handle system update SSE:", error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [backendUrl, setThreadMetadata, findTempIdForBackendId]);

  useEffect(() => {
    const threadId = currentThreadIdRef.current;
    if (!isTempThreadId(threadId)) return;
    if (!tempToBackendIdRef.current.has(threadId)) return;
    void flushPendingChatMessages(threadId);
  }, [flushPendingChatMessages]);

  const runtime = useExternalStoreRuntime({
    messages: currentMessages,
    setMessages: (msgs) => setThreadMessages(currentThreadIdRef.current, [...msgs]),
    isRunning,
    onNew: (message: AppendMessage) => onNew(message),
    onCancel,
    convertMessage: (msg) => msg,
    adapters: {
      threadList: threadListAdapter,
    },
  });

  return (
    <RuntimeActionsProvider value={{ sendSystemMessage }}>
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </RuntimeActionsProvider>
  );
}
