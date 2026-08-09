"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
} from "@assistant-ui/react";

import type { AomiClient } from "@aomi-labs/client";
import { useControl } from "../contexts/control-context";
import { useEventContext } from "../contexts/event-context";
import { useUser } from "../contexts/ext-user-context";
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
import { getHttpStatus } from "./http-status";
import {
  clearPersistedThreadId,
  writePersistedThreadId,
} from "./thread-persistence";

// =============================================================================
// Core Props
// =============================================================================

export type AomiRuntimeCoreProps = {
  children: ReactNode;
  aomiClient: AomiClient;
  applicationId?: number | string | null;
  accountSessionAvailable?: boolean;
  restoredThreadId?: string;
  threadPersistenceKey?: string | null;
};

// =============================================================================
// Core Component
// =============================================================================

export function AomiRuntimeCore({
  children,
  aomiClient,
  applicationId,
  accountSessionAvailable = false,
  restoredThreadId,
  threadPersistenceKey,
}: Readonly<AomiRuntimeCoreProps>) {
  const threadContext = useThreadContext();
  const eventContext = useEventContext();
  const notificationContext = useNotification();
  const { getUserState } = useUser();
  const {
    getControlState,
    getCurrentThreadApplicationId,
    getCurrentThreadApp,
    getPreferredThreadControl,
    syncCurrentThreadControl,
  } = useControl();

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
    regenerateMessage: orchestratorRegenerateMessage,
    cancelGeneration: orchestratorCancel,
    closeSession,
    closeIdleSessionsExcept,
    closeAllSessions,
    aomiClientRef,
  } = useRuntimeOrchestrator(aomiClient, {
    getUserState,
    getApp: getCurrentThreadApp,
    getApplicationId: () => getCurrentThreadApplicationId() ?? applicationId,
    getApiKey: () => getControlState().apiKey,
    getClientId: () => getControlState().clientId ?? undefined,
    prepareThreadForSend: async (threadId) => {
      const wasCreated = await ensureBackendThread(threadId);
      if (wasCreated) {
        threadsMaterializedForSendRef.current.add(threadId);
      }
      await syncCurrentThreadControl({ ignoreProcessing: true });
    },
    onSendSuccess: (threadId) => {
      const wasRemote = remoteThreadIdsRef.current.has(threadId);
      remoteThreadIdsRef.current.add(threadId);
      warmedThreadIdsRef.current.add(threadId);
      if (threadPersistenceKey) {
        writePersistedThreadId(threadPersistenceKey, threadId);
      }
      threadsMaterializedForSendRef.current.delete(threadId);
      if (!wasRemote && threadContextRef.current.currentThreadId === threadId) {
        void syncCurrentThreadControl().catch((error) => {
          console.error("Failed to sync thread controls:", error);
        });
      }
    },
    onSendError: async (threadId, error) => {
      const wasMaterializedForSend =
        threadsMaterializedForSendRef.current.has(threadId);
      threadsMaterializedForSendRef.current.delete(threadId);
      const httpStatus = getHttpStatus(error);

      if (httpStatus === 402) {
        // The `payment_required` modal (apps/shadcn-registry payment-required-gate)
        // owns its own copy; only `kind` is consumed for routing. `message`
        // would be dead config — leave it off so there's one source of truth.
        notificationContext.showNotification({
          type: "error",
          kind: "payment_required",
          title: "You're out of funds",
        });
      }

      if (httpStatus !== 402 || !wasMaterializedForSend) {
        return;
      }

      try {
        await aomiClientRef.current.deleteThread(threadId);
        remoteThreadIdsRef.current.delete(threadId);
        warmedThreadIdsRef.current.delete(threadId);
      } catch (deleteError) {
        console.error("Failed to delete quota-blocked thread:", deleteError);
      }
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
  const threadsMaterializedForSendRef = useRef(new Set<string>());
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
        await aomiClientRef.current.createThread(threadId);
        warmedThreadIdsRef.current.add(threadId);
      })();

      warmPromisesRef.current.set(threadId, warmPromise);

      try {
        await warmPromise;
      } finally {
        warmPromisesRef.current.delete(threadId);
      }
    },
    [aomiClientRef],
  );

  // ---------------------------------------------------------------------------
  // Ensure backend thread exists (lazy creation on first message send)
  // ---------------------------------------------------------------------------
  const ensureBackendThread = useCallback(
    async (threadId: string) => {
      if (remoteThreadIdsRef.current.has(threadId)) return false;

      // Fast path: carry the thread's selected model/app on the create so a
      // fresh chat binds in one round-trip instead of create + setModel.
      const control =
        threadContextRef.current.getThreadMetadata(threadId)?.control;
      const created = await aomiClientRef.current.createThread(threadId, {
        rig: control?.model ?? undefined,
        app: control?.app ?? undefined,
        applicationId: control?.applicationId ?? undefined,
        clientId: getControlState().clientId ?? undefined,
      });
      remoteThreadIdsRef.current.add(threadId);
      warmedThreadIdsRef.current.add(threadId);

      if (created?.rig && control?.model) {
        // The create bound the selection. Clear the dirty flag (only if the
        // control hasn't changed meanwhile) so the send path's
        // syncCurrentThreadControl no-ops instead of re-posting it.
        const latest = threadContextRef.current.getThreadMetadata(threadId);
        if (
          latest?.control.controlDirty &&
          latest.control.model === control.model &&
          latest.control.app === control.app &&
          latest.control.applicationId === control.applicationId
        ) {
          threadContextRef.current.updateThreadMetadata(threadId, {
            control: { ...latest.control, controlDirty: false },
          });
        }
      }
      return true;
    },
    [aomiClientRef, getControlState],
  );

  const getRuntimeSession = useCallback(
    (threadId: string) =>
      sessionManagerRef.current?.get(threadId) ?? getSession(threadId),
    [getSession],
  );

  const threadPersistence = useMemo(
    () => ({
      restoredThreadId,
      onInvalidRestoredThread: () => {
        if (threadPersistenceKey) {
          clearPersistedThreadId(threadPersistenceKey);
        }
      },
    }),
    [restoredThreadId, threadPersistenceKey],
  );

  const { isThreadListLoading, threadListError } = useRuntimeUserStateEffects({
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
    accountSessionAvailable,
    threadPersistence,
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
    const nextTurnPhase = isRunning
      ? (currentMeta?.control.turnPhase ?? "working")
      : "idle";
    if (
      currentMeta &&
      (currentMeta.control.isProcessing !== isRunning ||
        currentMeta.control.turnPhase !== nextTurnPhase)
    ) {
      threadContext.updateThreadMetadata(threadId, {
        control: {
          ...currentMeta.control,
          isProcessing: isRunning,
          turnPhase: nextTurnPhase,
        },
      });
    }
  }, [isRunning, threadContext]);

  const currentMessages = threadContext.getThreadMessages(
    threadContext.currentThreadId,
  );

  useEffect(() => {
    if (!threadPersistenceKey) return;
    const threadId = threadContext.currentThreadId;
    if (!remoteThreadIdsRef.current.has(threadId)) {
      return;
    }
    writePersistedThreadId(threadPersistenceKey, threadId);
  }, [
    threadContext.allThreadsMetadata,
    threadContext.currentThreadId,
    threadPersistenceKey,
  ]);

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

  // Tool update/complete SSE events intentionally raise NO toasts: the Working
  // trace renders tool activity inline, so raw "Tool complete: <tool>" toasts
  // were just noise (notably on tx signing, e.g. `evm_commit_txs`). The events
  // are still emitted on the bus for any other consumer.

  // ---------------------------------------------------------------------------
  // Show live system events as side notifications. Persisted system messages
  // take the separate `SystemMessage` rendering path in the chat surface.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const getMessage = (payload: unknown) => {
      if (!payload || typeof payload !== "object") return null;
      const message = (payload as { message?: unknown }).message;
      return typeof message === "string" && message.trim()
        ? message.trim()
        : null;
    };

    const unsubscribeNotice = eventContext.subscribe(
      "system_notice",
      (event) => {
        const message = getMessage(event.payload);
        if (!message) return;
        notificationContext.showNotification({
          type: "notice",
          title: "System notice",
          message,
        });
      },
    );
    const unsubscribeError = eventContext.subscribe("system_error", (event) => {
      const message = getMessage(event.payload);
      if (!message) return;
      notificationContext.showNotification({
        type: "error",
        title: "Error",
        message,
      });
    });

    return () => {
      unsubscribeNotice();
      unsubscribeError();
    };
  }, [eventContext, notificationContext.showNotification]);

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
        try {
          await orchestratorSendMessage(text, threadContext.currentThreadId);
        } catch (error) {
          console.error("Failed to send message:", error);
        }
      }
    },
    onEdit: async (message: AppendMessage) => {
      const text = message.content
        .filter(
          (part): part is Extract<typeof part, { type: "text" }> =>
            part.type === "text",
        )
        .map((part) => part.text)
        .join("\n");
      try {
        await orchestratorRegenerateMessage(
          threadContext.currentThreadId,
          message.sourceId ?? message.parentId,
          text,
        );
      } catch (error) {
        console.error("Failed to edit message:", error);
      }
    },
    onReload: async (parentId) => {
      try {
        await orchestratorRegenerateMessage(
          threadContext.currentThreadId,
          parentId,
        );
      } catch (error) {
        console.error("Failed to reload message:", error);
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
      remoteThreadIdsRef.current.delete(threadId);
      warmedThreadIdsRef.current.delete(threadId);
      warmPromisesRef.current.delete(threadId);

      const nextThreadId = threadContextRef.current.currentThreadId;
      if (
        !remoteThreadIdsRef.current.has(nextThreadId) &&
        threadPersistenceKey
      ) {
        clearPersistedThreadId(threadPersistenceKey);
      }
    },
    [closeSession, threadListAdapter, threadPersistenceKey],
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
      threadListError,
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
      hasBlockingWalletRequests: walletHandler.hasBlockingWalletRequests,
      startWalletRequest: walletHandler.startRequest,
      dismissWalletRequest: walletHandler.dismissRequest,
      resolveWalletRequest: walletHandler.resolveRequest,
      rejectWalletRequest: walletHandler.rejectRequest,
      simulateBatchTransactions,

      // Event API
      subscribe: eventContext.subscribe,
      sendSystemCommand: eventContext.sendOutboundSystem,
      recordUiInteraction: (payload) =>
        eventContext.sendOutboundSystem({
          type: "ui_interaction",
          sessionId: threadContext.currentThreadId,
          payload,
        }),
      sseStatus: eventContext.sseStatus,
    }),
    [
      userContext,
      threadContext.currentThreadId,
      threadContext.threadViewKey,
      threadContext.allThreadsMetadata,
      threadContext.getThreadMetadata,
      threadListError,
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
      simulateBatchTransactions,
      eventContext,
    ],
  );

  return (
    <AomiRuntimeApiProvider value={aomiRuntimeApi}>
      <RuntimeUserStateProvider
        sessionManager={sessionManager}
        getUserState={userContext.getUserState}
        setUser={userContext.setUser}
        onUserStateChange={userContext.onUserStateChange}
      >
        <AssistantRuntimeProvider runtime={runtime}>
          {children}
        </AssistantRuntimeProvider>
      </RuntimeUserStateProvider>
    </AomiRuntimeApiProvider>
  );
}
