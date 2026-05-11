"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
} from "@assistant-ui/react";

import { UserState, type AomiClient } from "@aomi-labs/client";
import { useControl } from "../contexts/control-context";
import { useEventContext } from "../contexts/event-context";
import { useUser } from "../contexts/user-context";
import { useThreadContext } from "../contexts/thread-context";
import { useNotification } from "../contexts/notification-context";
import { useRuntimeOrchestrator } from "./orchestrator";
import { buildThreadListAdapter } from "./threadlist-adapter";
import { AomiRuntimeApiProvider, type AomiRuntimeApi } from "../interface";
import { useWalletHandler } from "../handlers/wallet-handler";
import {
  RuntimeUserStateProvider,
  useRuntimeUserStateEffects,
} from "./user-state-provider";

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
  const { getUserState } = useUser();
  const {
    getControlState,
    getCurrentThreadApp,
    getCurrentThreadPaymentMethod,
    getPreferredThreadControl,
    onPaymentMethodSelect,
    syncCurrentThreadControl,
  } = useControl();

  const getEffectiveApiKey = useCallback(() => {
    const paymentMethod = getCurrentThreadPaymentMethod();
    if (paymentMethod === "tempo" || paymentMethod === "coinbase") {
      return null;
    }
    return getControlState().apiKey;
  }, [getControlState, getCurrentThreadPaymentMethod]);

  // ---------------------------------------------------------------------------
  // Wallet handler (receives requests from orchestrator)
  // ---------------------------------------------------------------------------
  const sessionManagerRef = useRef<
    ReturnType<typeof useRuntimeOrchestrator>["sessionManager"] | null
  >(null);

  const walletHandler = useWalletHandler({
    getSession: () =>
      sessionManagerRef.current?.get(threadContext.currentThreadId),
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
    closeSession,
    closeIdleSessionsExcept,
    closeAllSessions,
    aomiClientRef,
  } = useRuntimeOrchestrator(aomiClient, {
    getPublicKey: () =>
      UserState.isConnected(getUserState())
        ? UserState.address(getUserState())
        : undefined,
    getUserState,
    getApp: getCurrentThreadApp,
    getPaymentMethod: getCurrentThreadPaymentMethod,
    getApiKey: getEffectiveApiKey,
    getClientId: () => getControlState().clientId ?? undefined,
    prepareThreadForSend: async (threadId) => {
      await ensureBackendThread(threadId);
      await syncCurrentThreadControl();
    },
    onPendingRequestsChange: walletHandler.setRequests,
    onEvent: (event) => eventContext.dispatch(event),
  });

  sessionManagerRef.current = sessionManager;

  // ---------------------------------------------------------------------------
  // Refs for stable access
  // ---------------------------------------------------------------------------
  const threadContextRef = useRef(threadContext);
  threadContextRef.current = threadContext;
  const remoteThreadIdsRef = useRef(new Set<string>());
  const warmedThreadIdsRef = useRef(new Set<string>());
  const warmPromisesRef = useRef(new Map<string, Promise<void>>());
  const [isThreadLoading, setIsThreadLoading] = useState(false);

  const warmThread = useCallback(
    async (threadId: string) => {
      if (
        !remoteThreadIdsRef.current.has(threadId) ||
        warmedThreadIdsRef.current.has(threadId)
      ) {
        return;
      }

      const existingPromise = warmPromisesRef.current.get(threadId);
      if (existingPromise) {
        return existingPromise;
      }

      const warmPromise = (async () => {
        const userState = getUserState();
        await aomiClientRef.current.createThread(
          threadId,
          UserState.isConnected(userState)
            ? UserState.address(userState)
            : undefined,
        );
        warmedThreadIdsRef.current.add(threadId);
      })();

      warmPromisesRef.current.set(threadId, warmPromise);

      try {
        await warmPromise;
      } finally {
        warmPromisesRef.current.delete(threadId);
      }
    },
    [aomiClientRef, getUserState],
  );

  // ---------------------------------------------------------------------------
  // Ensure backend thread exists (lazy creation on first message send)
  // ---------------------------------------------------------------------------
  const ensureBackendThread = useCallback(
    async (threadId: string) => {
      if (remoteThreadIdsRef.current.has(threadId)) return;

      const userState = getUserState();
      await aomiClientRef.current.createThread(
        threadId,
        UserState.isConnected(userState)
          ? UserState.address(userState)
          : undefined,
      );
      remoteThreadIdsRef.current.add(threadId);
      warmedThreadIdsRef.current.add(threadId);
    },
    [aomiClientRef, getUserState],
  );

  const getRuntimeSession = useCallback(
    (threadId: string) =>
      sessionManagerRef.current?.get(threadId) ?? getSession(threadId),
    [getSession],
  );

  const { isThreadListLoading } = useRuntimeUserStateEffects({
    sessions: {
      aomiClientRef,
      sessionManager,
      getSession: getRuntimeSession,
      closeAllSessions,
      ensureInitialState,
      setIsThreadLoading,
    },
    remoteThreads: {
      remoteThreadIdsRef,
      warmPromisesRef,
      warmedThreadIdsRef,
      warmThread,
    },
  });

  // ---------------------------------------------------------------------------
  // Initial state fetch on thread change (skip for local-only threads)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const threadId = threadContext.currentThreadId;
    closeIdleSessionsExcept(threadId);

    if (!remoteThreadIdsRef.current.has(threadId)) {
      setIsThreadLoading(false);
      return;
    }

    let cancelled = false;
    setIsThreadLoading(true);

    void (async () => {
      try {
        await warmThread(threadId);
        if (!cancelled) {
          await ensureInitialState(threadId);
        }
      } finally {
        if (!cancelled) {
          setIsThreadLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    closeIdleSessionsExcept,
    ensureInitialState,
    threadContext.currentThreadId,
    warmThread,
  ]);

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
  // Thread list adapter
  // ---------------------------------------------------------------------------
  const isRemoteThread = useCallback(
    (threadId: string) => remoteThreadIdsRef.current.has(threadId),
    [],
  );

  const threadListAdapter = useMemo(
    () =>
      buildThreadListAdapter({
        aomiClientRef,
        threadContext,
        setIsRunning,
        isLoading: isThreadListLoading,
        getInitialControl: getPreferredThreadControl,
        isRemoteThread,
      }),
    [
      aomiClientRef,
      getPreferredThreadControl,
      isRemoteThread,
      isThreadListLoading,
      setIsRunning,
      threadContext,
      threadContext.currentThreadId,
      threadContext.allThreadsMetadata,
      currentMessages,
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
    isLoading: isThreadLoading,
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
      closeAllSessions();
    };
  }, [closeAllSessions]);

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
      closeSession(threadId);
      await threadListAdapter.onDelete(threadId);
    },
    [closeSession, threadListAdapter],
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

  const simulateBatchTransactions = useCallback<
    AomiRuntimeApi["simulateBatchTransactions"]
  >(
    async (transactions, options) => {
      const session =
        sessionManagerRef.current?.get(threadContext.currentThreadId) ??
        getSession(threadContext.currentThreadId);
      if (!session) {
        throw new Error("runtime_session_unavailable");
      }

      const response = await session.client.simulateBatch(
        session.sessionId,
        transactions,
        options,
      );
      return response.result;
    },
    [getSession, threadContext.currentThreadId],
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
      paymentMethod: getCurrentThreadPaymentMethod(),
      setPaymentMethod: onPaymentMethodSelect,
      cancelGeneration,

      // Notification API
      notifications: notificationContext.notifications,
      showNotification: notificationContext.showNotification,
      dismissNotification: notificationContext.dismissNotification,
      clearAllNotifications: notificationContext.clearAll,

      // Wallet API
      pendingWalletRequests: walletHandler.pendingRequests,
      startWalletRequest: walletHandler.startRequest,
      resolveWalletRequest: walletHandler.resolveRequest,
      rejectWalletRequest: walletHandler.rejectRequest,
      simulateBatchTransactions,

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
      getCurrentThreadPaymentMethod,
      onPaymentMethodSelect,
      cancelGeneration,
      notificationContext,
      walletHandler,
      simulateBatchTransactions,
      eventContext,
    ],
  );

  return (
    <AomiRuntimeApiProvider value={aomiRuntimeApi}>
      <RuntimeUserStateProvider
        sessionManager={sessionManager}
        getUserState={userContext.getUserState}
        onUserStateChange={userContext.onUserStateChange}
      >
        <AssistantRuntimeProvider runtime={runtime}>
          {children}
        </AssistantRuntimeProvider>
      </RuntimeUserStateProvider>
    </AomiRuntimeApiProvider>
  );
}
