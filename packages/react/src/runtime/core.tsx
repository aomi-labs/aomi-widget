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
  const { user, onUserStateChange, getUserState } = useUser();
  const { getControlState, getCurrentThreadApp, clearSecrets } = useControl();

  // ---------------------------------------------------------------------------
  // Wallet handler (receives requests from orchestrator)
  // ---------------------------------------------------------------------------
  const sessionManagerRef = useRef<ReturnType<typeof useRuntimeOrchestrator>["sessionManager"] | null>(null);

  const walletHandler = useWalletHandler({
    getSession: () => sessionManagerRef.current?.get(threadContext.currentThreadId),
  });

  // ---------------------------------------------------------------------------
  // Orchestrator (manages ClientSession per thread)
  // ---------------------------------------------------------------------------
  const {
    sessionManager,
    getSession,
    isRunning,
    setIsRunning,
    ensureInitialState,
    sendMessage: orchestratorSendMessage,
    cancelGeneration: orchestratorCancel,
    aomiClientRef,
  } = useRuntimeOrchestrator(aomiClient, {
    getPublicKey: () => getUserState().address,
    getUserState,
    getApp: getCurrentThreadApp,
    getApiKey: () => getControlState().apiKey,
    getClientId: () => getControlState().clientId ?? undefined,
    onWalletRequest: (request) => walletHandler.enqueueRequest(request),
    onEvent: (event) => eventContext.dispatch(event),
  });

  sessionManagerRef.current = sessionManager;

  // ---------------------------------------------------------------------------
  // Send wallet state changes to backend
  // ---------------------------------------------------------------------------
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
        aomiClientRef,
        threadContext,
        setIsRunning,
      }),
    [
      aomiClientRef,
      setIsRunning,
      threadContext,
      threadContext.currentThreadId,
      threadContext.allThreadsMetadata,
    ],
  );

  // ---------------------------------------------------------------------------
  // Show notifications for tool updates/completions
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
  // Show notifications for system notices
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = eventContext.subscribe("system_notice", (_event) => {
      // TODO: Disable it for now, we don't need async execution
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
    onNew: async (message: AppendMessage) => {
      const text = message.content
        .filter(
          (part): part is Extract<typeof part, { type: "text" }> =>
            part.type === "text",
        )
        .map((part) => part.text)
        .join("\n");
      if (text) {
        await orchestratorSendMessage(text, threadContext.currentThreadId);
      }
    },
    onCancel: async () => {
      await orchestratorCancel(threadContext.currentThreadId);
    },
    convertMessage: (msg) => msg,
    adapters: { threadList: threadListAdapter },
  });

  // ---------------------------------------------------------------------------
  // Cleanup on unmount.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      sessionManager.closeAll();
      void clearSecrets();
    };
  }, [sessionManager, clearSecrets]);

  // ---------------------------------------------------------------------------
  // Build AomiRuntimeApi
  // ---------------------------------------------------------------------------
  const userContext = useUser();

  const sendMessage = useCallback(
    async (text: string) => {
      await orchestratorSendMessage(text, threadContext.currentThreadId);
    },
    [orchestratorSendMessage, threadContext.currentThreadId],
  );

  const cancelGeneration = useCallback(() => {
    void orchestratorCancel(threadContext.currentThreadId);
  }, [orchestratorCancel, threadContext.currentThreadId]);

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
      sessionManager.close(threadId);
      await threadListAdapter.onDelete(threadId);
    },
    [threadListAdapter, sessionManager],
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
      if (threadContext.allThreadsMetadata.has(threadId)) {
        threadListAdapter.onSwitchToThread(threadId);
      } else {
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
      startWalletRequest: () => {}, // No-op: ClientSession manages processing state
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
