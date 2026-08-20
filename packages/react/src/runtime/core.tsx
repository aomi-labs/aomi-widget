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

/** Deduplicate in-flight async work keyed by thread id. */
async function runSingleFlight(
  flights: Map<string, Promise<void>>,
  threadId: string,
  work: () => Promise<void>,
): Promise<void> {
  const existing = flights.get(threadId);
  if (existing) return existing;

  const promise = work();
  flights.set(threadId, promise);
  try {
    await promise;
  } finally {
    if (flights.get(threadId) === promise) {
      flights.delete(threadId);
    }
  }
}

function appendMessageText(message: AppendMessage): string {
  return message.content
    .filter(
      (part): part is Extract<typeof part, { type: "text" }> =>
        part.type === "text",
    )
    .map((part) => part.text)
    .join("\n");
}

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
      await prepareBackendThread(threadId);
    },
    onSendSuccess: (threadId) => {
      const wasRemote = remoteThreadIdsRef.current.has(threadId);
      remoteThreadIdsRef.current.add(threadId);
      warmedThreadIdsRef.current.add(threadId);
      if (threadPersistenceKey) {
        writePersistedThreadId(threadPersistenceKey, threadId);
      }
      if (!wasRemote && threadContextRef.current.currentThreadId === threadId) {
        void syncCurrentThreadControl().catch((error) => {
          console.error("Failed to sync thread controls:", error);
        });
      }
    },
    onSendError: (_threadId, error) => {
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

      // Prewarmed empty threads are intentionally durable. A quota failure
      // keeps the same thread so payment setup can retry without another
      // create/model round trip.
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
  const preparePromisesRef = useRef(new Map<string, Promise<void>>());
  const [isThreadLoading, setIsThreadLoading] = useState(false);

  const warmThread = useCallback(
    async (threadId: string) => {
      if (
        !remoteThreadIdsRef.current.has(threadId) ||
        warmedThreadIdsRef.current.has(threadId)
      ) {
        return;
      }

      await runSingleFlight(warmPromisesRef.current, threadId, async () => {
        await aomiClientRef.current.createThread(threadId);
        warmedThreadIdsRef.current.add(threadId);
      });
    },
    [aomiClientRef],
  );

  // ---------------------------------------------------------------------------
  // Ensure backend thread exists (lazy creation on first message send)
  // ---------------------------------------------------------------------------
  const ensureBackendThread = useCallback(
    async (threadId: string) => {
      if (remoteThreadIdsRef.current.has(threadId)) return;

      await runSingleFlight(warmPromisesRef.current, threadId, async () => {
        // Fast path: carry the selected model/app on create so a fresh chat
        // normally binds in one round trip. The control sync below remains a
        // compatibility fallback for older backends.
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
      });
    },
    [aomiClientRef, getControlState],
  );

  const prepareBackendThread = useCallback(
    async (threadId: string) => {
      await runSingleFlight(preparePromisesRef.current, threadId, async () => {
        await ensureBackendThread(threadId);
        if (threadContextRef.current.currentThreadId !== threadId) return;

        // If the selection changes during the first sync, apply the newest
        // value once more before admitting chat.
        await syncCurrentThreadControl({ ignoreProcessing: true });
        if (threadContextRef.current.currentThreadId !== threadId) return;
        const latest =
          threadContextRef.current.getThreadMetadata(threadId)?.control;
        if (latest?.controlDirty && latest.model) {
          await syncCurrentThreadControl({ ignoreProcessing: true });
        }
      });
    },
    [ensureBackendThread, syncCurrentThreadControl],
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
  const activeThreadControl = threadContext.getThreadMetadata(
    threadContext.currentThreadId,
  )?.control;

  // Materialize the active empty draft as soon as account/thread hydration has
  // settled. Send awaits this same promise, so a fast submit never duplicates
  // create/model work. A failed speculative warm remains retryable on send.
  useEffect(() => {
    if (isThreadListLoading) return;
    const threadId = threadContext.currentThreadId;
    if (
      remoteThreadIdsRef.current.has(threadId) &&
      !activeThreadControl?.controlDirty
    ) {
      return;
    }
    if (
      accountSessionAvailable &&
      threadListError &&
      restoredThreadId === threadId
    ) {
      // Never recreate an unverified persisted id after account-list failure;
      // that could cross an authenticated identity boundary.
      return;
    }

    let cancelled = false;
    void prepareBackendThread(threadId).catch((error) => {
      if (!cancelled) {
        console.debug("Thread prewarm deferred until send:", error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    accountSessionAvailable,
    activeThreadControl?.app,
    activeThreadControl?.applicationId,
    activeThreadControl?.controlDirty,
    activeThreadControl?.model,
    isThreadListLoading,
    prepareBackendThread,
    restoredThreadId,
    threadContext.currentThreadId,
    threadListError,
  ]);

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
  const threadListAdapter = useMemo(
    () =>
      buildThreadListAdapter({
        aomiClientRef,
        threadContext,
        setIsRunning,
        isLoading: isThreadListLoading,
        getInitialControl: getPreferredThreadControl,
        isRemoteThread: (threadId) => remoteThreadIdsRef.current.has(threadId),
      }),
    [
      aomiClientRef,
      getPreferredThreadControl,
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
      const text = appendMessageText(message);
      if (text) {
        try {
          await orchestratorSendMessage(text, threadContext.currentThreadId);
        } catch (error) {
          console.error("Failed to send message:", error);
        }
      }
    },
    onEdit: async (message: AppendMessage) => {
      try {
        await orchestratorRegenerateMessage(
          threadContext.currentThreadId,
          message.sourceId ?? message.parentId,
          appendMessageText(message),
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
      warmPromisesRef.current.clear();
      preparePromisesRef.current.clear();
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
      const session = getRuntimeSession(threadContext.currentThreadId);
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
    [getRuntimeSession, threadContext.currentThreadId],
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
      renameThread: (threadId, title) =>
        threadListAdapter.onRename(threadId, title),
      archiveThread: (threadId) => threadListAdapter.onArchive(threadId),
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
      threadListAdapter,
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
