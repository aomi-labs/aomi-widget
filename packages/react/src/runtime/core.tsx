"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
} from "@assistant-ui/react";

import type { BackendApi } from "../backend/client";
import { useEventContext } from "../contexts/event-context";
import { useUser } from "../contexts/user-context";
import { useThreadContext } from "../contexts/thread-context";
import { useNotification } from "../contexts/notification-context";
import { useRuntimeOrchestrator } from "./orchestrator";
import {
  findTempIdForBackendId,
  isThreadRunning,
  isThreadReady,
  resolveThreadId,
} from "../state/backend-state";
import { isPlaceholderTitle, isTempThreadId } from "./utils";
import { buildThreadListAdapter } from "./threadlist-adapter";
import { AomiRuntimeApiProvider, type AomiRuntimeApi } from "../interface";

// =============================================================================
// Core Props
// =============================================================================

export type AomiRuntimeCoreProps = {
  children: ReactNode;
  backendApi: BackendApi;
};

// =============================================================================
// Core Component
// =============================================================================

export function AomiRuntimeCore({
  children,
  backendApi,
}: Readonly<AomiRuntimeCoreProps>) {
  const threadContext = useThreadContext();
  const eventContext = useEventContext();
  const notificationContext = useNotification();
  const { dispatchInboundSystem: dispatchSystemEvents } = eventContext;
  const { user, onUserStateChange, getUserState } = useUser();

  const {
    backendStateRef,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    ensureInitialState,
    backendApiRef,
  } = useRuntimeOrchestrator(backendApi, {
    onSyncEvents: dispatchSystemEvents,
    getPublicKey: () => getUserState().address,
    getUserState,
  });

  // ---------------------------------------------------------------------------
  // Send wallet state changes to backend
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onUserStateChange(async (newUser) => {
      const sessionId = threadContext.currentThreadId;
      const message = JSON.stringify({
        type: "wallet:state_changed",
        payload: {
          address: newUser.address,
          chainId: newUser.chainId,
          isConnected: newUser.isConnected,
          ensName: newUser.ensName,
        },
      });
      await backendApiRef.current.postSystemMessage(sessionId, message);
    });

    return unsubscribe;
  }, [onUserStateChange, backendApiRef, threadContext.currentThreadId]);

  // ---------------------------------------------------------------------------
  // Refs for stable access
  // ---------------------------------------------------------------------------
  const threadContextRef = useRef(threadContext);
  threadContextRef.current = threadContext;

  const currentThreadIdRef = useRef(threadContext.currentThreadId);
  useEffect(() => {
    currentThreadIdRef.current = threadContext.currentThreadId;
  }, [threadContext.currentThreadId]);

  // ---------------------------------------------------------------------------
  // Initial state fetch on thread change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    void ensureInitialState(threadContext.currentThreadId);
  }, [ensureInitialState, threadContext.currentThreadId]);

  useEffect(() => {
    const threadId = threadContext.currentThreadId;
    setIsRunning(isThreadRunning(backendStateRef.current, threadId));
  }, [backendStateRef, setIsRunning, threadContext.currentThreadId]);

  const currentMessages = threadContext.getThreadMessages(
    threadContext.currentThreadId,
  );

  // ---------------------------------------------------------------------------
  // Fetch thread list when user connects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const userAddress = user.address;
    if (!userAddress) return;

    const fetchThreadList = async () => {
      try {
        const threadList =
          await backendApiRef.current.fetchThreads(userAddress);
        const currentContext = threadContextRef.current;
        const newMetadata = new Map(currentContext.allThreadsMetadata);
        let maxChatNum = currentContext.threadCnt;

        for (const thread of threadList) {
          const rawTitle = thread.title ?? "";
          const title = isPlaceholderTitle(rawTitle) ? "" : rawTitle;
          const lastActive =
            thread.last_active_at ||
            thread.updated_at ||
            thread.created_at ||
            newMetadata.get(thread.session_id)?.lastActiveAt ||
            new Date().toISOString();
          newMetadata.set(thread.session_id, {
            title,
            status: thread.is_archived ? "archived" : "regular",
            lastActiveAt: lastActive,
          });

          const match = title.match(/^Chat (\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxChatNum) {
              maxChatNum = num;
            }
          }
        }

        currentContext.setThreadMetadata(newMetadata);
        if (maxChatNum > currentContext.threadCnt) {
          currentContext.setThreadCnt(maxChatNum);
        }
      } catch (error) {
        console.error("Failed to fetch thread list:", error);
      }
    };

    void fetchThreadList();
  }, [user.address, backendApiRef]);

  // ---------------------------------------------------------------------------
  // Thread list adapter
  // ---------------------------------------------------------------------------
  const threadListAdapter = useMemo(
    () =>
      buildThreadListAdapter({
        backendStateRef,
        backendApiRef,
        threadContext,
        currentThreadIdRef,
        polling,
        userAddress: user.address,
        setIsRunning,
      }),
    [
      backendApiRef,
      polling,
      user.address,
      backendStateRef,
      setIsRunning,
      threadContext,
      threadContext.currentThreadId,
      threadContext.allThreadsMetadata,
    ],
  );

  // ---------------------------------------------------------------------------
  // SSE subscription for title changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const currentSessionId = threadContext.currentThreadId;
    const unsubscribe = backendApiRef.current.subscribeSSE(
      currentSessionId,
      (event) => {
        const eventType = event.type as string;
        const sessionId = event.session_id;

        if (eventType === "title_changed") {
          const newTitle = event.new_title as string;
          const backendState = backendStateRef.current;
          const targetThreadId =
            findTempIdForBackendId(backendState, sessionId) ??
            resolveThreadId(backendState, sessionId);
          const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
          threadContext.setThreadMetadata((prev) => {
            const next = new Map(prev);
            const existing = next.get(targetThreadId);
            const nextStatus =
              existing?.status === "archived" ? "archived" : "regular";
            next.set(targetThreadId, {
              title: normalizedTitle,
              status: nextStatus,
              lastActiveAt: existing?.lastActiveAt ?? new Date().toISOString(),
            });
            return next;
          });
          if (
            !isPlaceholderTitle(newTitle) &&
            backendState.creatingThreadId === targetThreadId
          ) {
            backendState.creatingThreadId = null;
          }
        }
      },
    );

    return () => {
      unsubscribe?.();
    };
  }, [
    backendApiRef,
    backendStateRef,
    threadContext,
    threadContext.currentThreadId,
  ]);

  // ---------------------------------------------------------------------------
  // Flush pending chat when thread becomes ready
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const threadId = threadContext.currentThreadId;
    if (!isTempThreadId(threadId)) return;
    if (!isThreadReady(backendStateRef.current, threadId)) return;
    void messageController.flushPendingChat(threadId);
  }, [messageController, backendStateRef, threadContext.currentThreadId]);

  // ---------------------------------------------------------------------------
  // Show notifications for tool updates/completions (SSE events)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const showToolNotification = (eventType: "tool_update" | "tool_complete") =>
      (event: { payload?: unknown }) => {
        const payload = event.payload as Record<string, unknown> | undefined;
        const toolName =
          typeof payload?.tool_name === "string" ? payload.tool_name : undefined;
        const title = toolName
          ? `${eventType === "tool_update" ? "Tool update" : "Tool complete"}: ${toolName}`
          : eventType === "tool_update"
            ? "Tool update"
            : "Tool complete";
        const message =
          typeof payload?.message === "string"
            ? payload.message
            : typeof payload?.result === "string"
              ? payload.result
              : undefined;

        notificationContext.showNotification({
          type: "notice",
          title,
          message,
        });
      };

    const unsubscribeUpdate = eventContext.subscribe(
      "tool_update",
      showToolNotification("tool_update"),
    );
    const unsubscribeComplete = eventContext.subscribe(
      "tool_complete",
      showToolNotification("tool_complete"),
    );

    return () => {
      unsubscribeUpdate();
      unsubscribeComplete();
    };
  }, [eventContext, notificationContext]);

  // ---------------------------------------------------------------------------
  // Show notifications for system notices (SSE events)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = eventContext.subscribe("system_notice", (event) => {
      const payload = event.payload as { message?: string } | undefined;
      const message = payload?.message;

      notificationContext.showNotification({
        type: "notice",
        title: "System notice",
        message,
      });
    });

    return unsubscribe;
  }, [eventContext, notificationContext]);

  // ---------------------------------------------------------------------------
  // External store runtime
  // ---------------------------------------------------------------------------
  const runtime = useExternalStoreRuntime({
    messages: currentMessages,
    setMessages: (msgs) =>
      threadContext.setThreadMessages(threadContext.currentThreadId, [...msgs]),
    isRunning,
    onNew: (message: AppendMessage) =>
      messageController.outbound(message, threadContext.currentThreadId),
    onCancel: () => messageController.cancel(threadContext.currentThreadId),
    convertMessage: (msg) => msg,
    adapters: { threadList: threadListAdapter },
  });

  // ---------------------------------------------------------------------------
  // Cleanup polling on unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      polling.stopAll();
    };
  }, [polling]);

  // ---------------------------------------------------------------------------
  // Build AomiRuntimeApi
  // ---------------------------------------------------------------------------
  const userContext = useUser();

  const sendMessage = useCallback(
    async (text: string) => {
      // Build a minimal AppendMessage - the message controller only extracts text from content
      // Using unknown cast because AppendMessage has complex metadata requirements we don't need
      const appendMessage = {
        role: "user",
        content: [{ type: "text", text }],
      } as unknown as AppendMessage;
      await messageController.outbound(
        appendMessage,
        threadContext.currentThreadId,
      );
    },
    [messageController, threadContext.currentThreadId],
  );

  const cancelGeneration = useCallback(() => {
    messageController.cancel(threadContext.currentThreadId);
  }, [messageController, threadContext.currentThreadId]);

  const getMessages = useCallback(
    (threadId?: string) => {
      const id = threadId ?? threadContext.currentThreadId;
      return threadContext.getThreadMessages(id);
    },
    [threadContext],
  );

  const createThread = useCallback(async (): Promise<string> => {
    await threadListAdapter.onSwitchToNewThread();
    return threadContextRef.current.currentThreadId;
  }, [threadListAdapter]);

  const deleteThread = useCallback(
    async (threadId: string) => {
      await threadListAdapter.onDelete(threadId);
    },
    [threadListAdapter],
  );

  const renameThread = useCallback(
    async (threadId: string, title: string) => {
      await threadListAdapter.onRename(threadId, title);
    },
    [threadListAdapter],
  );

  const archiveThread = useCallback(
    async (threadId: string) => {
      await threadListAdapter.onArchive(threadId);
    },
    [threadListAdapter],
  );

  const selectThread = useCallback(
    (threadId: string) => {
      // Check if thread exists
      if (threadContext.allThreadsMetadata.has(threadId)) {
        threadListAdapter.onSwitchToThread(threadId);
      } else {
        // Thread doesn't exist, create a new one
        void threadListAdapter.onSwitchToNewThread();
      }
    },
    [threadContext.allThreadsMetadata, threadListAdapter],
  );

  const aomiRuntimeApi: AomiRuntimeApi = useMemo(
    () => ({
      // User API
      user: userContext.user,
      getUserState: userContext.getUserState,
      setUser: userContext.setUser,
      onUserStateChange: userContext.onUserStateChange,

      // Thread API
      currentThreadId: threadContext.currentThreadId,
      threadViewKey: threadContext.threadViewKey,
      threadMetadata: threadContext.allThreadsMetadata,
      getThreadMetadata: threadContext.getThreadMetadata,
      createThread,
      deleteThread,
      renameThread,
      archiveThread,
      selectThread,

      // Chat API
      isRunning,
      getMessages,
      sendMessage,
      cancelGeneration,

      // Notification API
      notifications: notificationContext.notifications,
      showNotification: notificationContext.showNotification,
      dismissNotification: notificationContext.dismissNotification,
      clearAllNotifications: notificationContext.clearAll,

      // Event API
      subscribe: eventContext.subscribe,
      sendSystemCommand: eventContext.sendOutboundSystem,
      sseStatus: eventContext.sseStatus,
    }),
    [
      userContext,
      threadContext.currentThreadId,
      threadContext.threadViewKey,
      threadContext.allThreadsMetadata,
      threadContext.getThreadMetadata,
      createThread,
      deleteThread,
      renameThread,
      archiveThread,
      selectThread,
      isRunning,
      getMessages,
      sendMessage,
      cancelGeneration,
      notificationContext,
      eventContext,
    ],
  );

  return (
    <AomiRuntimeApiProvider value={aomiRuntimeApi}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </AomiRuntimeApiProvider>
  );
}
