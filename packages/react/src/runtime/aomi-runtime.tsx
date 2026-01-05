"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  type ExternalStoreThreadData,
  useExternalStoreRuntime,
  type AppendMessage,
} from "@assistant-ui/react";

import { RuntimeActionsProvider } from "./hooks";
import { useRuntimeOrchestrator } from "./orchestrator";
import {
  findTempIdForBackendId,
  isThreadReady,
  isThreadRunning,
  markSkipInitialFetch,
  resolveThreadId,
  setBackendMapping,
} from "./backend-state";
import { isPlaceholderTitle, isTempThreadId, parseTimestamp } from "./utils";
import { useThreadContext } from "../state/thread-context";
import type { ThreadMetadata } from "../state/types";
import type { WalletTxRequestHandler } from "../utils/wallet";
import { useNotification, NotificationProvider } from "../lib/notification-context";
import { WalletHandler } from "./wallet-handler";
import { EventController } from "./event-controller";

const sortByLastActiveDesc = (
  [, metaA]: [string, ThreadMetadata],
  [, metaB]: [string, ThreadMetadata]
) => {
  const tsA = parseTimestamp(metaA.lastActiveAt);
  const tsB = parseTimestamp(metaB.lastActiveAt);
  return tsB - tsA;
};

function buildThreadLists(threadMetadata: Map<string, ThreadMetadata>) {
  const entries = Array.from(threadMetadata.entries()).filter(
    ([, meta]) => !isPlaceholderTitle(meta.title)
  );

  const regularThreads = entries
    .filter(([, meta]) => meta.status === "regular")
    .sort(sortByLastActiveDesc)
    .map(([id, meta]): ExternalStoreThreadData<"regular"> => ({
      id,
      title: meta.title || "New Chat",
      status: "regular",
    }));

  const archivedThreads = entries
    .filter(([, meta]) => meta.status === "archived")
    .sort(sortByLastActiveDesc)
    .map(([id, meta]): ExternalStoreThreadData<"archived"> => ({
      id,
      title: meta.title || "New Chat",
      status: "archived",
    }));

  return { regularThreads, archivedThreads };
}

export type AomiRuntimeProviderProps = {
  children: ReactNode;
  backendUrl?: string;
  publicKey?: string;
  onWalletTxRequest?: WalletTxRequestHandler;
};

export function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  publicKey,
  onWalletTxRequest,
}: Readonly<AomiRuntimeProviderProps>) {
  const threadContext = useThreadContext();
  const threadContextRef = useRef(threadContext);
  threadContextRef.current = threadContext;

  const currentThreadIdRef = useRef(threadContext.currentThreadId);
  useEffect(() => {
    currentThreadIdRef.current = threadContext.currentThreadId;
  }, [threadContext.currentThreadId]);

  const publicKeyRef = useRef(publicKey);
  useEffect(() => {
    publicKeyRef.current = publicKey;
  }, [publicKey]);

  const getPublicKey = useCallback(() => publicKeyRef.current, []);

  const lastSubscribedThreadRef = useRef<string | null>(null);

  const { showNotification } = useNotification();

  // Declare refs early so they can be used in orchestrator
  const eventControllerRef = useRef<EventController | null>(null);
  const walletHandlerRef = useRef<WalletHandler | null>(null);

  const {
    backendStateRef,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    ensureInitialState,
    setSystemEventsHandler,
    backendApiRef,
  } = useRuntimeOrchestrator(backendUrl, { getPublicKey });

  // Create wallet handler
  if (!walletHandlerRef.current) {
    walletHandlerRef.current = new WalletHandler({
      backendApiRef,
      onWalletTxRequest,
      publicKey,
      showNotification,
      applySessionMessagesToThread: (threadId, msgs) => {
        messageController.inbound(threadId, msgs);
      },
      getCurrentThreadId: () => currentThreadIdRef.current,
    });
  }

  // Create event controller
  if (!eventControllerRef.current) {
    eventControllerRef.current = new EventController({
      backendApiRef,
      backendStateRef,
      showNotification,
      handleWalletTxRequest: (sessionId, threadId, request) => {
        walletHandlerRef.current?.handleRequest(sessionId, threadId, request);
      },
      setThreadMetadata: threadContext.setThreadMetadata,
    });
  }

  const handleSystemEvents = useCallback(
    (sessionId: string, threadId: string, events?: unknown[] | null) => {
      eventControllerRef.current?.handleBackendSystemEvents(sessionId, threadId, events);
    },
    []
  );

  useEffect(() => {
    setSystemEventsHandler(handleSystemEvents);
    return () => {
      setSystemEventsHandler(null);
    };
  }, [handleSystemEvents, setSystemEventsHandler]);

  const [updateSubscriptionsTick, setUpdateSubscriptionsTick] = useState(0);
  const bumpUpdateSubscriptions = useCallback(() => {
    setUpdateSubscriptionsTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    void ensureInitialState(threadContext.currentThreadId);
  }, [ensureInitialState, threadContext.currentThreadId]);

  // Sync isRunning when thread changes - check if it's currently running
  // This ensures isRunning is correct when switching threads
  useEffect(() => {
    const threadId = threadContext.currentThreadId;
    const isCurrentlyRunning = isThreadRunning(backendStateRef.current, threadId);
    setIsRunning(isCurrentlyRunning);
  }, [threadContext.currentThreadId, setIsRunning]);

  const currentMessages = threadContext.getThreadMessages(threadContext.currentThreadId);

  useEffect(() => {
    if (!publicKey) return;

    const fetchThreadList = async () => {
      try {
        const threadList = await backendApiRef.current.fetchThreads(publicKey);
        const currentContext = threadContextRef.current;
        const newMetadata = new Map(currentContext.threadMetadata);
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
  }, [publicKey]);

  const threadListAdapter = useMemo(() => {
    const backendState = backendStateRef.current;
    const { regularThreads, archivedThreads } = buildThreadLists(threadContext.threadMetadata);

    const preparePendingThread = (threadId: string) => {
      const previousPendingId = backendState.creatingThreadId;
      if (previousPendingId && previousPendingId !== threadId) {
        threadContext.setThreadMetadata((prev) => {
          const next = new Map(prev);
          next.delete(previousPendingId);
          return next;
        });
        threadContext.setThreads((prev) => {
          const next = new Map(prev);
          next.delete(previousPendingId);
          return next;
        });
        backendState.pendingChat.delete(previousPendingId);
        backendState.pendingSystem.delete(previousPendingId);
        backendState.tempToBackendId.delete(previousPendingId);
        backendState.skipInitialFetch.delete(previousPendingId);
      }
      backendState.creatingThreadId = threadId;
      backendState.pendingChat.delete(threadId);
      backendState.pendingSystem.delete(threadId);
      threadContext.setThreadMetadata((prev) =>
        new Map(prev).set(threadId, {
          title: "New Chat",
          status: "pending",
          lastActiveAt: new Date().toISOString(),
        })
      );
      threadContext.setThreadMessages(threadId, []);
      threadContext.setCurrentThreadId(threadId);
      setIsRunning(false);
      threadContext.bumpThreadViewKey();
    };

    const findPendingThreadId = () => {
      if (backendState.creatingThreadId) return backendState.creatingThreadId;
      for (const [id, meta] of threadContext.threadMetadata.entries()) {
        if (meta.status === "pending") return id;
      }
      return null;
    };

    return {
      threadId: threadContext.currentThreadId,
      threads: regularThreads,
      archivedThreads,

      onSwitchToNewThread: async () => {
        const previousThreadId = currentThreadIdRef.current;

        // Stop polling and interrupt if currently running
        polling.stopAll();
        if (isRunning && isThreadReady(backendState, previousThreadId)) {
          const backendId = resolveThreadId(backendState, previousThreadId);
          void backendApiRef.current.postInterrupt(backendId);
        }

        const pendingId = findPendingThreadId();
        if (pendingId) {
          preparePendingThread(pendingId);
          return;
        }

        if (backendState.createThreadPromise) {
          preparePendingThread(backendState.creatingThreadId ?? `temp-${crypto.randomUUID()}`);
          return;
        }

        const tempId = `temp-${crypto.randomUUID()}`;
        preparePendingThread(tempId);

        const createPromise = backendApiRef.current
          .createThread(publicKey, undefined)
          .then(async (newThread) => {
            const uiThreadId = backendState.creatingThreadId ?? tempId;
            const backendId = newThread.session_id;

            setBackendMapping(backendState, uiThreadId, backendId);
            markSkipInitialFetch(backendState, uiThreadId);

            bumpUpdateSubscriptions();

            const backendTitle = newThread.title;
            if (backendTitle && !isPlaceholderTitle(backendTitle)) {
              threadContext.setThreadMetadata((prev) => {
                const next = new Map(prev);
                const existing = next.get(uiThreadId);
                const nextStatus = existing?.status === "archived" ? "archived" : "regular";
                next.set(uiThreadId, {
                  title: backendTitle,
                  status: nextStatus,
                  lastActiveAt: existing?.lastActiveAt ?? new Date().toISOString(),
                });
                return next;
              });
            }

            if (backendState.creatingThreadId === uiThreadId) {
              backendState.creatingThreadId = null;
            }

            const pendingMessages = backendState.pendingChat.get(uiThreadId);
            if (pendingMessages?.length) {
              backendState.pendingChat.delete(uiThreadId);
              for (const text of pendingMessages) {
                try {
                  const activePublicKey = publicKeyRef.current;
                  if (activePublicKey) {
                    await backendApiRef.current.postChatMessage(
                      backendId,
                      text,
                      activePublicKey
                    );
                  } else {
                    await backendApiRef.current.postChatMessage(backendId, text);
                  }
                } catch (error) {
                  console.error("Failed to send queued message:", error);
                }
              }
              if (currentThreadIdRef.current === uiThreadId) {
                polling?.start(uiThreadId);
              }
            }
          })
          .catch((error) => {
            console.error("Failed to create new thread:", error);
            const failedId = backendState.creatingThreadId ?? tempId;
            threadContext.setThreadMetadata((prev) => {
              const next = new Map(prev);
              next.delete(failedId);
              return next;
            });
            threadContext.setThreads((prev) => {
              const next = new Map(prev);
              next.delete(failedId);
              return next;
            });
            if (backendState.creatingThreadId === failedId) {
              backendState.creatingThreadId = null;
            }
          })
          .finally(() => {
            backendState.createThreadPromise = null;
          });

        backendState.createThreadPromise = createPromise;
      },

      onSwitchToThread: (threadId: string) => {
        const previousThreadId = currentThreadIdRef.current;

        // Stop polling and interrupt if currently running
        polling.stopAll();
        if (isRunning && isThreadReady(backendState, previousThreadId)) {
          const backendId = resolveThreadId(backendState, previousThreadId);
          void backendApiRef.current.postInterrupt(backendId);
        }

        threadContext.setCurrentThreadId(threadId);
      },

      onRename: async (threadId: string, newTitle: string) => {
        const previousTitle = threadContext.getThreadMetadata(threadId)?.title ?? "";
        const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
        threadContext.updateThreadMetadata(threadId, {
          title: normalizedTitle,
        });

        try {
          await backendApiRef.current.renameThread(threadId, newTitle);
        } catch (error) {
          console.error("Failed to rename thread:", error);
          threadContext.updateThreadMetadata(threadId, { title: previousTitle });
        }
      },

      onArchive: async (threadId: string) => {
        threadContext.updateThreadMetadata(threadId, { status: "archived" });

        try {
          await backendApiRef.current.archiveThread(threadId);
        } catch (error) {
          console.error("Failed to archive thread:", error);
          threadContext.updateThreadMetadata(threadId, { status: "regular" });
        }
      },

      onUnarchive: async (threadId: string) => {
        threadContext.updateThreadMetadata(threadId, { status: "regular" });

        try {
          await backendApiRef.current.unarchiveThread(threadId);
        } catch (error) {
          console.error("Failed to unarchive thread:", error);
          threadContext.updateThreadMetadata(threadId, { status: "archived" });
        }
      },

      onDelete: async (threadId: string) => {
        try {
          await backendApiRef.current.deleteThread(threadId);

          threadContext.setThreadMetadata((prev) => {
            const next = new Map(prev);
            next.delete(threadId);
            return next;
          });
          threadContext.setThreads((prev) => {
            const next = new Map(prev);
            next.delete(threadId);
            return next;
          });
          backendState.pendingChat.delete(threadId);
          backendState.pendingSystem.delete(threadId);
          backendState.tempToBackendId.delete(threadId);
          backendState.skipInitialFetch.delete(threadId);
          backendState.runningThreads.delete(threadId);
          if (backendState.creatingThreadId === threadId) {
            backendState.creatingThreadId = null;
          }

          if (threadContext.currentThreadId === threadId) {
            const firstRegularThread = Array.from(threadContext.threadMetadata.entries()).find(
              ([id, meta]) => meta.status === "regular" && id !== threadId
            );

            if (firstRegularThread) {
              threadContext.setCurrentThreadId(firstRegularThread[0]);
            } else {
              const defaultId = "default-session";
              threadContext.setThreadMetadata((prev) =>
                new Map(prev).set(defaultId, {
                  title: "New Chat",
                  status: "regular",
                  lastActiveAt: new Date().toISOString(),
                })
              );
              threadContext.setThreadMessages(defaultId, []);
              threadContext.setCurrentThreadId(defaultId);
            }
          }
        } catch (error) {
          console.error("Failed to delete thread:", error);
          throw error;
        }
      },
    };
  }, [
    backendApiRef,
    polling,
    publicKey,
    backendStateRef,
    setIsRunning,
    threadContext,
    threadContext.currentThreadId,
    threadContext.threadMetadata,
    bumpUpdateSubscriptions,
  ]);


  useEffect(() => {
    const threadId = threadContext.currentThreadId;
    if (!isTempThreadId(threadId)) return;
    if (!isThreadReady(backendStateRef.current, threadId)) return;
    void messageController.flushPendingChat(threadId);
  }, [messageController, backendStateRef, threadContext.currentThreadId]);

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

  useEffect(() => {
    const threadId = threadContext.currentThreadId;
    if (isTempThreadId(threadId)) return;
    const hasUserMessages = currentMessages.some((msg) => msg.role === "user");
    if (hasUserMessages) {
      void messageController.flushPendingSystem(threadId);
    }
  }, [currentMessages, messageController, threadContext.currentThreadId]);

  useEffect(() => {
    return () => {
      polling.stopAll();
      eventControllerRef.current?.cleanup();
    };
  }, [polling]);

  // Update event controller subscription when current thread changes
  useEffect(() => {
    const backendState = backendStateRef.current;
    const threadId = threadContext.currentThreadId;
    const isReady = isThreadReady(backendState, threadId);
    if (!isReady) {
      lastSubscribedThreadRef.current = null;
      eventControllerRef.current?.setSubscribableSessionId(null);
      return;
    }

    const isCurrentlyRunning = isThreadRunning(backendState, threadId);
    if (isCurrentlyRunning) {
      const sessionId = resolveThreadId(backendState, threadId);
      eventControllerRef.current?.setSubscribableSessionId(sessionId);
      lastSubscribedThreadRef.current = threadId;
      return;
    }

    if (lastSubscribedThreadRef.current !== threadId) {
      eventControllerRef.current?.setSubscribableSessionId(null);
    }
  }, [backendStateRef, threadContext.currentThreadId, updateSubscriptionsTick, isRunning]);

  return (
    <RuntimeActionsProvider
      value={{
        sendSystemMessage: (message: string) =>
          messageController.outboundSystem(threadContext.currentThreadId, message),
      }}
    >
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </RuntimeActionsProvider>
  );
}

// Wrapper component that provides NotificationProvider
export function AomiRuntimeProviderWithNotifications(
  props: Readonly<AomiRuntimeProviderProps>
) {
  return (
    <NotificationProvider>
      <AomiRuntimeProvider {...props} />
    </NotificationProvider>
  );
}
