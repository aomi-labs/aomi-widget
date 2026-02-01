import type { MutableRefObject } from "react";
import type { ExternalStoreThreadData } from "@assistant-ui/react";

import type { BackendApi } from "../backend/client";
import type { ThreadContext } from "../contexts/thread-context";
import type { ThreadMetadata } from "../state/thread-store";
import {
  markSkipInitialFetch,
  type BackendState,
} from "../state/backend-state";
import type { PollingController } from "./polling-controller";
import { isPlaceholderTitle, parseTimestamp } from "./utils";

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
    .filter(([, meta]) => meta.status !== "archived")
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

// =============================================================================
// Adapter Builder
// =============================================================================

export type ThreadListAdapterConfig = {
  backendStateRef: MutableRefObject<BackendState>;
  backendApiRef: MutableRefObject<BackendApi>;
  threadContext: ThreadContext;
  currentThreadIdRef: MutableRefObject<string>;
  polling: PollingController;
  userAddress?: string;
  setIsRunning: (running: boolean) => void;
  getNamespace: () => string;
  getApiKey?: () => string | null;
};

export function buildThreadListAdapter({
  backendStateRef,
  backendApiRef,
  threadContext,
  currentThreadIdRef,
  polling,
  userAddress,
  setIsRunning,
  getNamespace,
  getApiKey,
}: ThreadListAdapterConfig) {
  const backendState = backendStateRef.current;
  const { regularThreads, archivedThreads } = buildThreadLists(
    threadContext.allThreadsMetadata,
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
    for (const [id, meta] of threadContext.allThreadsMetadata.entries()) {
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
          backendState.creatingThreadId ?? crypto.randomUUID(),
        );
        return;
      }

      const threadId = crypto.randomUUID();
      preparePendingThread(threadId);

      const createPromise = backendApiRef.current
        .createThread(threadId, userAddress)
        .then(async (newThread) => {
          const uiThreadId = backendState.creatingThreadId ?? threadId;
          const backendId = newThread.session_id;

          if (uiThreadId !== backendId) {
            console.warn("[aomi][thread] backend id mismatch", {
              uiThreadId,
              backendId,
            });
          }
          markSkipInitialFetch(backendState, uiThreadId);

          threadContext.setThreadMetadata((prev) => {
            const next = new Map(prev);
            const existing = next.get(uiThreadId);
            const nextStatus =
              existing?.status === "archived" ? "archived" : "regular";
            next.set(uiThreadId, {
              title: existing?.title ?? "New Chat",
              status: nextStatus,
              lastActiveAt: existing?.lastActiveAt ?? new Date().toISOString(),
            });
            return next;
          });

          if (backendState.creatingThreadId === uiThreadId) {
            backendState.creatingThreadId = null;
          }

          const pendingMessages = backendState.pendingChat.get(uiThreadId);
          if (pendingMessages?.length) {
            backendState.pendingChat.delete(uiThreadId);
            const namespace = getNamespace();
            const apiKey = getApiKey?.() ?? undefined;
            for (const text of pendingMessages) {
              try {
                await backendApiRef.current.postChatMessage(
                  backendId,
                  text,
                  namespace,
                  userAddress,
                  apiKey,
                );
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
          const failedId = backendState.creatingThreadId ?? threadId;
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
        backendState.skipInitialFetch.delete(threadId);
        backendState.runningThreads.delete(threadId);
        if (backendState.creatingThreadId === threadId) {
          backendState.creatingThreadId = null;
        }

        if (threadContext.currentThreadId === threadId) {
          const firstRegularThread = Array.from(
            threadContext.allThreadsMetadata.entries(),
          ).find(([id, meta]) => meta.status === "regular" && id !== threadId);

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
}
