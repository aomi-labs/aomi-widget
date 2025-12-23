"use client";

import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { BackendApi } from "../api/client";
import { useThreadContext } from "../state/thread-context";
import { RuntimeActionsProvider } from "./hooks";
import { useMessageHandlers } from "./message-handlers";
import { usePolling } from "./polling";
import { useThreadListAdapter } from "./thread-list-adapter";
import { isPlaceholderTitle, isTempThreadId } from "./utils";

export function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  publicKey,
}: Readonly<{
  children: ReactNode;
  backendUrl?: string;
  publicKey?: string;
}>) {
  const {
    currentThreadId,
    setCurrentThreadId,
    bumpThreadViewKey,
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
  const pendingSystemMessagesRef = useRef<Map<string, string[]>>(new Map());
  const pendingChatMessagesRef = useRef<Map<string, string[]>>(new Map());
  const creatingThreadIdRef = useRef<string | null>(null);
  const createThreadPromiseRef = useRef<Promise<void> | null>(null);
  const currentThreadIdRef = useRef(currentThreadId);
  const skipInitialFetchRef = useRef<Set<string>>(new Set());
  const tempToBackendIdRef = useRef<Map<string, string>>(new Map());
  const startPollingRef = useRef<() => void>(() => {});
  const stopPollingRef = useRef<() => void>(() => {});

  const currentMessages = getThreadMessages(currentThreadId);

  useEffect(() => {
    currentThreadIdRef.current = currentThreadId;
  }, [currentThreadId]);

  useEffect(() => {
    backendApiRef.current = new BackendApi(backendUrl);
  }, [backendUrl]);

  const findPendingThreadId = useCallback(() => {
    if (creatingThreadIdRef.current) return creatingThreadIdRef.current;
    for (const [id, meta] of threadMetadata.entries()) {
      if (meta.status === "pending") return id;
    }
    return null;
  }, [threadMetadata]);

  const resolveThreadId = useCallback((threadId: string): string => {
    return tempToBackendIdRef.current.get(threadId) || threadId;
  }, []);

  const findTempIdForBackendId = useCallback((backendId: string): string | undefined => {
    for (const [tempId, id] of tempToBackendIdRef.current.entries()) {
      if (id === backendId) return tempId;
    }
    return undefined;
  }, []);

  const isThreadReady = useCallback(
    (threadId: string): boolean => {
      if (!isTempThreadId(threadId)) return true;
      return tempToBackendIdRef.current.has(threadId);
    },
    []
  );

  const {
    applyMessages,
    onNew,
    onCancel,
    sendSystemMessage,
    flushPendingSystemMessages,
  } = useMessageHandlers({
    backendApiRef,
    currentThreadId,
    currentMessages,
    getThreadMessages,
    setThreadMessages,
    updateThreadMetadata,
    isThreadReady,
    resolveThreadId,
    setIsRunning,
    startPolling: () => startPollingRef.current(),
    stopPolling: () => stopPollingRef.current(),
    pendingSystemMessagesRef,
    pendingChatMessagesRef,
  });

  const { startPolling, stopPolling } = usePolling({
    backendApiRef,
    currentThreadId,
    isThreadReady,
    resolveThreadId,
    applyMessages,
    setIsRunning,
  });

  startPollingRef.current = startPolling;
  stopPollingRef.current = stopPolling;

  useEffect(() => {
    const fetchInitialState = async () => {
      if (isTempThreadId(currentThreadId) && !tempToBackendIdRef.current.has(currentThreadId)) {
        setIsRunning(false);
        return;
      }

      if (skipInitialFetchRef.current.has(currentThreadId)) {
        skipInitialFetchRef.current.delete(currentThreadId);
        setIsRunning(false);
        return;
      }

      const backendThreadId = resolveThreadId(currentThreadId);

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
        setIsRunning(false);
      }
    };

    void fetchInitialState();
    return () => {
      stopPolling();
    };
  }, [applyMessages, currentThreadId, resolveThreadId, setIsRunning, startPolling, stopPolling]);

  const threadListAdapter = useThreadListAdapter({
    backendApiRef,
    publicKey,
    threadMetadata,
    threadCnt,
    setThreadCnt,
    setThreadMetadata,
    setThreads,
    setThreadMessages,
    setCurrentThreadId,
    setIsRunning,
    bumpThreadViewKey,
    currentThreadId,
    findPendingThreadId,
    pendingChatMessagesRef,
    pendingSystemMessagesRef,
    tempToBackendIdRef,
    skipInitialFetchRef,
    creatingThreadIdRef,
    createThreadPromiseRef,
    startPolling,
  });

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
    if (isTempThreadId(currentThreadId)) return;
    const hasUserMessages = currentMessages.some((msg) => msg.role === "user");
    if (hasUserMessages) {
      void flushPendingSystemMessages(currentThreadId);
    }
  }, [currentMessages, currentThreadId, flushPendingSystemMessages]);

  const runtime = useExternalStoreRuntime({
    messages: currentMessages,
    setMessages: (msgs) => setThreadMessages(currentThreadId, [...msgs]),
    isRunning,
    onNew,
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
