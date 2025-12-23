"use client";

import { useEffect, useMemo, useRef } from "react";
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
  markSkipInitialFetch,
  resolveThreadId,
  setBackendMapping,
} from "./backend-state";
import { isPlaceholderTitle, isTempThreadId, parseTimestamp } from "./utils";
import { useThreadContext } from "../state/thread-context";
import type { ThreadMetadata } from "../state/types";

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
};

export function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  publicKey,
}: Readonly<AomiRuntimeProviderProps>) {
  const threadContext = useThreadContext();
  const {
    backendStateRef,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    ensureInitialState,
    backendApiRef,
  } = useRuntimeOrchestrator(backendUrl);

  const currentThreadIdRef = useRef(threadContext.currentThreadId);
  useEffect(() => {
    currentThreadIdRef.current = threadContext.currentThreadId;
  }, [threadContext.currentThreadId]);

  useEffect(() => {
    void ensureInitialState(threadContext.currentThreadId);
  }, [ensureInitialState, threadContext.currentThreadId]);

  const threadListAdapter = useMemo(() => {
    const backendState = backendStateRef.current;
    const { regularThreads, archivedThreads } = buildThreadLists(threadContext.threadMetadata);

    const preparePendingThread = (threadId: string, resetQueues: boolean) => {
      if (resetQueues) {
        backendState.pendingChat.delete(threadId);
        backendState.pendingSystem.delete(threadId);
      }
      threadContext.setThreadMetadata((prev) =>
        new Map(prev).set(threadId, {
          title: "New Chat",
          status: "pending",
          lastActiveAt: new Date().toISOString(),
        })
      );
      if (resetQueues) {
        threadContext.setThreadMessages(threadId, []);
      }
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
          preparePendingThread(pendingId, false);
          return;
        }

        const tempId = `temp-${crypto.randomUUID()}`;
        preparePendingThread(tempId, true);

        backendState.creatingThreadId = tempId;
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
        threadContext.updateThreadMetadata(threadId, {
          title: isPlaceholderTitle(newTitle) ? "" : newTitle,
        });

        try {
          await backendApiRef.current.renameThread(threadId, newTitle);
        } catch (error) {
          console.error("Failed to rename thread:", error);
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
  ]);

  useEffect(() => {
    const unsubscribe = backendApiRef.current.subscribeToUpdates((update) => {
      if (update.type !== "TitleChanged") return;
      const sessionId = update.data.session_id;
      const newTitle = update.data.new_title;

      const backendState = backendStateRef.current;
      const targetThreadId =
        findTempIdForBackendId(backendState, sessionId) ??
        resolveThreadId(backendState, sessionId);
      const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
      threadContext.updateThreadMetadata(targetThreadId, {
        title: normalizedTitle,
      });
      if (!isPlaceholderTitle(newTitle) && backendState.creatingThreadId === targetThreadId) {
        backendState.creatingThreadId = null;
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [backendApiRef, backendStateRef, threadContext]);

  useEffect(() => {
    const threadId = threadContext.currentThreadId;
    if (!isTempThreadId(threadId)) return;
    if (!isThreadReady(backendStateRef.current, threadId)) return;
    void messageController.flushPendingSystem(threadId);
    void messageController.flushPendingChat(threadId);
  }, [messageController, backendStateRef, threadContext.currentThreadId]);

  const runtime = useExternalStoreRuntime({
    messages: threadContext.getThreadMessages(threadContext.currentThreadId),
    isRunning,
    onNew: (message: AppendMessage) =>
      messageController.outbound(message, threadContext.currentThreadId),
    onCancel: () => messageController.cancel(threadContext.currentThreadId),
    convertMessage: (msg) => msg,
    adapters: { threadList: threadListAdapter },
  });

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
