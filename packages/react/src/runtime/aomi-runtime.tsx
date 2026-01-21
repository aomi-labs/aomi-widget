"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  type ExternalStoreThreadData,
  useExternalStoreRuntime,
  type AppendMessage,
} from "@assistant-ui/react";

import {
  EventContextProvider,
  useEventContext,
} from "../contexts/event-context";
import { NotificationContextProvider } from "../contexts/notification-context";
import { UserContextProvider, useUser } from "../contexts/user-context";
import { useRuntimeOrchestrator } from "./orchestrator";
import {
  findTempIdForBackendId,
  isThreadReady,
  isThreadRunning,
  markSkipInitialFetch,
  resolveThreadId,
  setBackendMapping,
} from "../state/backend-state";
import { isPlaceholderTitle, isTempThreadId, parseTimestamp } from "./utils";
import { useThreadContext } from "../contexts/thread-context";
import { ThreadMetadata } from "../state/thread-store";

// =============================================================================
// Thread List Helpers
// =============================================================================

const sortByLastActiveDesc = (
  [, metaA]: [string, ThreadMetadata],
  [, metaB]: [string, ThreadMetadata],
) => {
  const tsA = parseTimestamp(metaA.lastActiveAt);
  const tsB = parseTimestamp(metaB.lastActiveAt);
  return tsB - tsA;
};

function buildThreadLists(threadMetadata: Map<string, ThreadMetadata>) {
  const entries = Array.from(threadMetadata.entries()).filter(
    ([, meta]) => !isPlaceholderTitle(meta.title),
  );

  const regularThreads = entries
    .filter(([, meta]) => meta.status === "regular")
    .sort(sortByLastActiveDesc)
    .map(
      ([id, meta]): ExternalStoreThreadData<"regular"> => ({
        id,
        title: meta.title || "New Chat",
        status: "regular",
      }),
    );

  const archivedThreads = entries
    .filter(([, meta]) => meta.status === "archived")
    .sort(sortByLastActiveDesc)
    .map(
      ([id, meta]): ExternalStoreThreadData<"archived"> => ({
        id,
        title: meta.title || "New Chat",
        status: "archived",
      }),
    );

  return { regularThreads, archivedThreads };
}

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
  const threadContext = useThreadContext();
  const { dispatchInboundSystem: dispatchSystemEvents } = useEventContext();
  const { onUserStateChange } = useUser();
  const {
    backendStateRef,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    ensureInitialState,
    backendApiRef,
  } = useRuntimeOrchestrator(backendUrl, { onSystemEvents: dispatchSystemEvents });


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

  const threadContextRef = useRef(threadContext);
  threadContextRef.current = threadContext;

  const currentThreadIdRef = useRef(threadContext.currentThreadId);
  useEffect(() => {
    currentThreadIdRef.current = threadContext.currentThreadId;
  }, [threadContext.currentThreadId]);

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

  // Fetch thread list on mount when publicKey is available
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
  }, [publicKey, backendApiRef]);

  const threadListAdapter = useMemo(() => {
    const backendState = backendStateRef.current;
    const { regularThreads, archivedThreads } = buildThreadLists(
      threadContext.threadMetadata,
    );

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
        backendState.tempToBackendId.delete(previousPendingId);
        backendState.skipInitialFetch.delete(previousPendingId);
      }
      backendState.creatingThreadId = threadId;
      backendState.pendingChat.delete(threadId);
      threadContext.setThreadMetadata((prev) =>
        new Map(prev).set(threadId, {
          title: "New Chat",
          status: "pending",
          lastActiveAt: new Date().toISOString(),
        }),
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
        const pendingId = findPendingThreadId();
        if (pendingId) {
          preparePendingThread(pendingId);
          return;
        }

        if (backendState.createThreadPromise) {
          preparePendingThread(
            backendState.creatingThreadId ?? `temp-${crypto.randomUUID()}`,
          );
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

            const backendTitle = newThread.title;
            if (backendTitle && !isPlaceholderTitle(backendTitle)) {
              threadContext.setThreadMetadata((prev) => {
                const next = new Map(prev);
                const existing = next.get(uiThreadId);
                const nextStatus =
                  existing?.status === "archived" ? "archived" : "regular";
                next.set(uiThreadId, {
                  title: backendTitle,
                  status: nextStatus,
                  lastActiveAt:
                    existing?.lastActiveAt ?? new Date().toISOString(),
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
                  await backendApiRef.current.postChatMessage(backendId, text);
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
        threadContext.setCurrentThreadId(threadId);
      },

      onRename: async (threadId: string, newTitle: string) => {
        const previousTitle =
          threadContext.getThreadMetadata(threadId)?.title ?? "";
        const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
        threadContext.updateThreadMetadata(threadId, {
          title: normalizedTitle,
        });

        try {
          await backendApiRef.current.renameThread(threadId, newTitle);
        } catch (error) {
          console.error("Failed to rename thread:", error);
          threadContext.updateThreadMetadata(threadId, {
            title: previousTitle,
          });
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
          backendState.tempToBackendId.delete(threadId);
          backendState.skipInitialFetch.delete(threadId);
          backendState.runningThreads.delete(threadId);
          if (backendState.creatingThreadId === threadId) {
            backendState.creatingThreadId = null;
          }

          if (threadContext.currentThreadId === threadId) {
            const firstRegularThread = Array.from(
              threadContext.threadMetadata.entries(),
            ).find(
              ([id, meta]) => meta.status === "regular" && id !== threadId,
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
                }),
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
  ]);

  // Subscribe to SSE updates for title changes
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
        // Other event types (wallet:tx_request, notification, etc.) are handled
        // by the EventContext and dispatched to subscribers
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

  // Flush pending chat when thread becomes ready
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
    return () => {
      polling.stopAll();
    };
  }, [polling]);


  return (
    <NotificationContextProvider>
      <UserContextProvider>
        <EventContextProvider
        backendApi={backendApiRef.current}
        sessionId={threadContext.currentThreadId}
      >
          <AssistantRuntimeProvider runtime={runtime}>
            {children}
          </AssistantRuntimeProvider>
      </EventContextProvider>
      </UserContextProvider>
    </NotificationContextProvider>
  );
}

// =============================================================================
