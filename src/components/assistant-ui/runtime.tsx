"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { AssistantRuntimeProvider, useExternalStoreRuntime } from "@assistant-ui/react";

import type { WalletTxRequestHandler } from "@/lib/wallet-tx";
import { useNotification } from "@/lib/notification-context";
import { useThreadContext } from "@/lib/thread-context";
import { isTempThreadId } from "@/lib/runtime-utils";

import { useBackendApi } from "@/hooks/runtime/use-backend-api";
import { useBackendSystemEvents } from "@/hooks/runtime/use-backend-system-events";
import { useThreadIdMapping } from "@/hooks/runtime/use-thread-id-mapping";
import { useThreadLifecycle } from "@/hooks/runtime/use-thread-lifecycle";
import { useThreadListAdapter } from "@/hooks/runtime/use-thread-list-adapter";
import { useThreadListSync } from "@/hooks/runtime/use-thread-list-sync";
import { useThreadMessageStore } from "@/hooks/runtime/use-thread-message-store";
import { useThreadMessaging } from "@/hooks/runtime/use-thread-messaging";
import { useThreadPolling } from "@/hooks/runtime/use-thread-polling";
import { useThreadStateSync } from "@/hooks/runtime/use-thread-state-sync";
import { useThreadUpdates } from "@/hooks/runtime/use-thread-updates";
import { useWalletTx } from "@/hooks/runtime/use-wallet-tx";

type RuntimeActions = {
  sendSystemMessage: (message: string) => Promise<void>;
};

const RuntimeActionsContext = createContext<RuntimeActions | undefined>(undefined);

export const useRuntimeActions = () => {
  const context = useContext(RuntimeActionsContext);
  if (!context) {
    throw new Error("useRuntimeActions must be used within AomiRuntimeProvider");
  }
  return context;
};

export function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  publicKey,
  onWalletTxRequest,
}: Readonly<{
  children: ReactNode;
  backendUrl?: string;
  publicKey?: string;
  onWalletTxRequest?: WalletTxRequestHandler;
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

  const { showNotification } = useNotification();
  const backendApiRef = useBackendApi(backendUrl);

  const currentThreadIdRef = useRef(currentThreadId);
  useEffect(() => {
    currentThreadIdRef.current = currentThreadId;
  }, [currentThreadId]);

  const pendingChatMessagesRef = useRef<Map<string, string[]>>(new Map());
  const pendingSystemMessagesRef = useRef<Map<string, string[]>>(new Map());
  const skipInitialFetchRef = useRef<Set<string>>(new Set());
  const creatingThreadIdRef = useRef<string | null>(null);
  const createThreadPromiseRef = useRef<Promise<void> | null>(null);

  const idMapping = useThreadIdMapping();
  const currentMessages = getThreadMessages(currentThreadId);

  const messageStore = useThreadMessageStore({
    setThreadMessages,
    pendingChatMessagesRef,
  });

  const { handleWalletTxRequest } = useWalletTx({
    backendApiRef,
    onWalletTxRequest,
    publicKey,
    showNotification,
    applySessionMessagesToThread: messageStore.applySessionMessagesToThread,
    currentThreadIdRef,
  });

  const { handleBackendSystemEvents } = useBackendSystemEvents({
    showNotification,
    handleWalletTxRequest,
  });

  const polling = useThreadPolling({
    backendApiRef,
    currentThreadId,
    currentThreadIdRef,
    isThreadReady: idMapping.isThreadReady,
    resolveThreadId: idMapping.resolveThreadId,
    applyMessagesForThread: messageStore.applyMessagesForThread,
    handleBackendSystemEvents,
  });

  const updates = useThreadUpdates({
    backendApiRef,
    findTempIdForBackendId: idMapping.findTempIdForBackendId,
    handleWalletTxRequest,
    setThreadMetadata,
    creatingThreadIdRef,
  });

  const messaging = useThreadMessaging({
    backendApiRef,
    publicKey,
    currentThreadId,
    currentMessages,
    currentThreadIdRef,
    getThreadMessages,
    setThreadMessages,
    setThreadMetadata,
    updateThreadMetadata,
    setIsRunning: polling.setIsRunning,
    startPolling: polling.startPolling,
    resolveThreadId: idMapping.resolveThreadId,
    isThreadReady: idMapping.isThreadReady,
    bindBackendId: idMapping.bindBackendId,
    bumpUpdateSubscriptions: updates.bumpUpdateSubscriptions,
    setSubscribableSessionId: updates.setSubscribableSessionId,
    pendingChatMessagesRef,
    pendingSystemMessagesRef,
    skipInitialFetchRef,
    creatingThreadIdRef,
    createThreadPromiseRef,
  });

  useThreadStateSync({
    backendApiRef,
    currentThreadId,
    currentThreadIdRef,
    resolveThreadId: idMapping.resolveThreadId,
    isThreadReady: idMapping.isThreadReady,
    hasBackendId: idMapping.hasBackendId,
    skipInitialFetchRef,
    creatingThreadIdRef,
    setSubscribableSessionId: updates.setSubscribableSessionId,
    setIsRunning: polling.setIsRunning,
    startPolling: polling.startPolling,
    stopPolling: polling.stopPolling,
    applyMessagesForThread: messageStore.applyMessagesForThread,
    handleBackendSystemEvents,
  });

  useThreadListSync({
    backendApiRef,
    publicKey,
    threadMetadata,
    threadCnt,
    setThreadMetadata,
    setThreadCnt,
  });

  const lifecycle = useThreadLifecycle({
    backendApiRef,
    currentThreadId,
    currentThreadIdRef,
    threadMetadata,
    setThreadMetadata,
    setThreadMessages,
    setThreads,
    setCurrentThreadId,
    updateThreadMetadata,
    bumpThreadViewKey,
    stopPolling: polling.stopPolling,
    interruptThread: polling.interruptThread,
    isRunning: polling.isRunning,
    setIsRunning: polling.setIsRunning,
    pendingChatMessagesRef,
    pendingSystemMessagesRef,
    creatingThreadIdRef,
    createThreadPromiseRef,
  });

  const threadListAdapter = useThreadListAdapter({
    currentThreadId,
    threadMetadata,
    onSwitchToNewThread: lifecycle.onSwitchToNewThread,
    onSwitchToThread: lifecycle.onSwitchToThread,
    onRename: lifecycle.onRename,
    onArchive: lifecycle.onArchive,
    onUnarchive: lifecycle.onUnarchive,
    onDelete: lifecycle.onDelete,
  });

  const onCancel = useCallback(async () => {
    if (!idMapping.isThreadReady(currentThreadId)) return;
    polling.stopPolling();

    const backendThreadId = idMapping.resolveThreadId(currentThreadId);

    try {
      await backendApiRef.current.postInterrupt(backendThreadId);
      polling.setIsRunning(false);
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  }, [backendApiRef, currentThreadId, idMapping, polling]);

  const runtime = useExternalStoreRuntime({
    messages: currentMessages,
    setMessages: (msgs) => setThreadMessages(currentThreadId, [...msgs]),
    isRunning: polling.isRunning,
    onNew: messaging.onNew,
    onCancel,
    convertMessage: (msg) => msg,
    adapters: {
      threadList: threadListAdapter,
    },
  });

  useEffect(() => {
    if (isTempThreadId(currentThreadId)) return;
    const hasUserMessages = currentMessages.some((msg) => msg.role === "user");
    if (hasUserMessages) {
      void messaging.flushPendingSystemMessages(currentThreadId);
    }
  }, [currentMessages, currentThreadId, messaging.flushPendingSystemMessages]);

  return (
    <RuntimeActionsContext.Provider value={{ sendSystemMessage: messaging.sendSystemMessage }}>
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </RuntimeActionsContext.Provider>
  );
}
