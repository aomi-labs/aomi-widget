"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
} from "@assistant-ui/react";

import type { AomiClient } from "@aomi-labs/client";
import { useControl } from "../contexts/control-context";
import { useEventContext } from "../contexts/event-context";
import { useUser } from "../contexts/user-context";
import { useThreadContext } from "../contexts/thread-context";
import { useNotification } from "../contexts/notification-context";
import { useRuntimeOrchestrator } from "./orchestrator";
import {
  isThreadRunning,
  resolveThreadId,
} from "../state/backend-state";
import { isPlaceholderTitle } from "./utils";
import { buildThreadListAdapter } from "./threadlist-adapter";
import { AomiRuntimeApiProvider, type AomiRuntimeApi } from "../interface";
import { initThreadControl } from "../state/thread-store";
import { useWalletHandler } from "../handlers/wallet-handler";

// =============================================================================
// Core Props
// =============================================================================

export type AomiRuntimeCoreProps = {
  children: ReactNode;
  aomiClient: AomiClient;
};

// =============================================================================
// Core Component
// =============================================================================

export function AomiRuntimeCore({
  children,
  aomiClient,
}: Readonly<AomiRuntimeCoreProps>) {
  const threadContext = useThreadContext();
  const eventContext = useEventContext();
  const notificationContext = useNotification();
  const { dispatchInboundSystem: dispatchSystemEvents } = eventContext;
  const { user, onUserStateChange, getUserState } = useUser();
  const { getControlState, getCurrentThreadApp } = useControl();

  const {
    backendStateRef,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    ensureInitialState,
    aomiClientRef,
  } = useRuntimeOrchestrator(aomiClient, {
    onSyncEvents: dispatchSystemEvents,
    getPublicKey: () => getUserState().address,
    getUserState,
    getApp: getCurrentThreadApp,
    getApiKey: () => getControlState().apiKey,
    getClientId: () => getControlState().clientId ?? undefined,
  });

  const walletSnapshot = useCallback(
    (nextUser: ReturnType<typeof getUserState>) => ({
      address: nextUser.address,
      chainId: nextUser.chainId,
      isConnected: nextUser.isConnected,
      ensName: nextUser.ensName,
    }),
    [getUserState],
  );

  const lastWalletStateRef = useRef(walletSnapshot(getUserState()));

  // ---------------------------------------------------------------------------
  // Send wallet state changes to backend
  // ---------------------------------------------------------------------------
  useEffect(() => {
    lastWalletStateRef.current = walletSnapshot(getUserState());

    const unsubscribe = onUserStateChange(async (newUser) => {
      const nextWalletState = walletSnapshot(newUser);
      const prevWalletState = lastWalletStateRef.current;
      if (
        prevWalletState.address === nextWalletState.address &&
        prevWalletState.chainId === nextWalletState.chainId &&
        prevWalletState.isConnected === nextWalletState.isConnected &&
        prevWalletState.ensName === nextWalletState.ensName
      ) {
        return;
      }

      lastWalletStateRef.current = nextWalletState;
      const sessionId = threadContext.currentThreadId;
      const message = JSON.stringify({
        type: "wallet:state_changed",
        payload: nextWalletState,
      });
      await aomiClientRef.current.sendSystemMessage(sessionId, message);
    });

    return unsubscribe;
  }, [
    onUserStateChange,
    aomiClientRef,
    threadContext.currentThreadId,
    getUserState,
    walletSnapshot,
  ]);

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
  // Wallet handler (queue management for tx + eip712 requests)
  // ---------------------------------------------------------------------------
  const onWalletRequestComplete = useCallback(() => {
    polling.start(currentThreadIdRef.current);
  }, [polling]);

  const walletHandler = useWalletHandler({
    sessionId: threadContext.currentThreadId,
    onRequestComplete: onWalletRequestComplete,
  });

  // ---------------------------------------------------------------------------
  // Respond to user_state_request from backend
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = eventContext.subscribe(
      "user_state_request",
      () => {
        eventContext.sendOutboundSystem({
          type: "user_state_response",
          sessionId: threadContext.currentThreadId,
          payload: getUserState(),
        });
      },
    );
    return unsubscribe;
  }, [eventContext, threadContext.currentThreadId, getUserState]);

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

  // Sync isRunning to thread metadata for control context
  useEffect(() => {
    const threadId = threadContext.currentThreadId;
    const currentMeta = threadContext.getThreadMetadata(threadId);
    if (currentMeta && currentMeta.control.isProcessing !== isRunning) {
      threadContext.updateThreadMetadata(threadId, {
        control: {
          ...currentMeta.control,
          isProcessing: isRunning,
        },
      });
    }
  }, [isRunning, threadContext]);

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
          await aomiClientRef.current.listThreads(userAddress);
        const currentContext = threadContextRef.current;
        const newMetadata = new Map(currentContext.allThreadsMetadata);
        let maxChatNum = currentContext.threadCnt;

        for (const thread of threadList) {
          const rawTitle = thread.title ?? "";
          const title = isPlaceholderTitle(rawTitle) ? "" : rawTitle;
          const lastActive =
            newMetadata.get(thread.session_id)?.lastActiveAt ||
            new Date().toISOString();
          const existingControl = newMetadata.get(thread.session_id)?.control;
          newMetadata.set(thread.session_id, {
            title,
            status: thread.is_archived ? "archived" : "regular",
            lastActiveAt: lastActive,
            control: existingControl ?? initThreadControl(),
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
  }, [user.address, aomiClientRef]);

  // ---------------------------------------------------------------------------
  // Thread list adapter
  // ---------------------------------------------------------------------------
  const threadListAdapter = useMemo(
    () =>
      buildThreadListAdapter({
        backendStateRef,
        aomiClientRef,
        threadContext,
        currentThreadIdRef,
        polling,
        userAddress: user.address,
        setIsRunning,
        getApp: getCurrentThreadApp,
        getApiKey: () => getControlState().apiKey,
        getUserState,
      }),
    [
      aomiClientRef,
      polling,
      user.address,
      backendStateRef,
      setIsRunning,
      threadContext,
      threadContext.currentThreadId,
      threadContext.allThreadsMetadata,
      getControlState,
      getCurrentThreadApp,
      getUserState,
    ],
  );

  // ---------------------------------------------------------------------------
  // Listen for title changes via EventContext (shares the single SSE connection)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const backendState = backendStateRef.current;

    const unsubscribe = eventContext.subscribe("title_changed", (event) => {
      const sessionId = event.sessionId;
      const payload = event.payload as { new_title?: string } | undefined;
      const newTitle = payload?.new_title;
      if (typeof newTitle !== "string") return;

      const targetThreadId = resolveThreadId(backendState, sessionId);
      const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;

      if (process.env.NODE_ENV !== "production") {
        console.debug("[aomi][sse] title_changed", {
          sessionId,
          newTitle,
          normalizedTitle,
          currentThreadId: threadContextRef.current.currentThreadId,
          targetThreadId,
        });
      }

      threadContextRef.current.setThreadMetadata((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetThreadId);
        const nextStatus =
          existing?.status === "archived" ? "archived" : "regular";
        next.set(targetThreadId, {
          title: normalizedTitle,
          status: nextStatus,
          lastActiveAt: existing?.lastActiveAt ?? new Date().toISOString(),
          control: existing?.control ?? initThreadControl(),
        });
        return next;
      });
    });

    return unsubscribe;
  }, [eventContext, backendStateRef]);

  // ---------------------------------------------------------------------------
  // Show notifications for tool updates/completions (SSE events)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const showToolNotification =
      (eventType: "tool_update" | "tool_complete") =>
      (event: { payload?: unknown }) => {
        const payload = event.payload as Record<string, unknown> | undefined;
        const toolName =
          typeof payload?.tool_name === "string"
            ? payload.tool_name
            : undefined;
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

      // TODO: Disable it for now, we don't need async execution
      // notificationContext.showNotification({
      //   type: "notice",
      //   title: "System notice",
      //   message,
      // });
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
  // Cleanup polling on unmount.
  // Keep vault secrets across view transitions (e.g. opening Settings).
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
      addExtValue: userContext.addExtValue,
      removeExtValue: userContext.removeExtValue,
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

      // Wallet API
      pendingWalletRequests: walletHandler.pendingRequests,
      startWalletRequest: walletHandler.startProcessing,
      resolveWalletRequest: walletHandler.resolveRequest,
      rejectWalletRequest: walletHandler.rejectRequest,

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
      walletHandler,
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
