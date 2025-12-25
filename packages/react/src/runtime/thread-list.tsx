"use client";

import { useCallback, useMemo } from "react";
import type { MutableRefObject } from "react";
import type { ExternalStoreThreadData } from "@assistant-ui/react";

import {
  markSkipInitialFetch,
  setBackendMapping,
  type BakendState,
} from "./backend-state";
import { isPlaceholderTitle, parseTimestamp } from "./utils";
import type { PollingController } from "./polling-controller";
import type { BackendApi } from "../api/client";
import type { ThreadContext } from "../state/thread-store";
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

type ThreadListAdapterParams = {
  backendApiRef: MutableRefObject<BackendApi>;
  backendStateRef: MutableRefObject<BakendState>;
  currentThreadIdRef: MutableRefObject<string>;
  polling: PollingController;
  publicKey?: string;
  setIsRunning: (running: boolean) => void;
  threadContext: ThreadContext;
  threadContextRef: MutableRefObject<ThreadContext>;
};

export function useThreadListAdapter({
  backendApiRef,
  backendStateRef,
  currentThreadIdRef,
  polling,
  publicKey,
  setIsRunning,
  threadContext,
  threadContextRef,
}: ThreadListAdapterParams) {
  const { regularThreads, archivedThreads } = useMemo(
    () => buildThreadLists(threadContext.threadMetadata),
    [threadContext.threadMetadata]
  );

  const removePendingThread = useCallback(
    (threadId: string) => {
      const currentContext = threadContextRef.current;
      currentContext.setThreadMetadata((prev) => {
        const next = new Map(prev);
        next.delete(threadId);
        return next;
      });
      currentContext.setThreads((prev) => {
        const next = new Map(prev);
        next.delete(threadId);
        return next;
      });
      const backendState = backendStateRef.current;
      backendState.pendingChat.delete(threadId);
      backendState.pendingSystem.delete(threadId);
      backendState.tempToBackendId.delete(threadId);
      backendState.skipInitialFetch.delete(threadId);
    },
    [backendStateRef, threadContextRef]
  );

  const preparePendingThread = useCallback(
    (threadId: string) => {
      const backendState = backendStateRef.current;
      const previousPendingId = backendState.creatingThreadId;
      if (previousPendingId && previousPendingId !== threadId) {
        removePendingThread(previousPendingId);
      }
      backendState.creatingThreadId = threadId;
      backendState.pendingChat.delete(threadId);
      backendState.pendingSystem.delete(threadId);
      const currentContext = threadContextRef.current;
      currentContext.setThreadMetadata((prev) =>
        new Map(prev).set(threadId, {
          title: "New Chat",
          status: "pending",
          lastActiveAt: new Date().toISOString(),
        })
      );
      currentContext.setThreadMessages(threadId, []);
      currentContext.setCurrentThreadId(threadId);
      setIsRunning(false);
      currentContext.bumpThreadViewKey();
    },
    [backendStateRef, removePendingThread, setIsRunning, threadContextRef]
  );

  const findPendingThreadId = useCallback(() => {
    const backendState = backendStateRef.current;
    if (backendState.creatingThreadId) return backendState.creatingThreadId;
    for (const [id, meta] of threadContextRef.current.threadMetadata.entries()) {
      if (meta.status === "pending") return id;
    }
    return null;
  }, [backendStateRef, threadContextRef]);

  const onSwitchToNewThread = useCallback(async () => {
    const backendState = backendStateRef.current;
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

        const backendTitle = newThread.title;
        if (backendTitle && !isPlaceholderTitle(backendTitle)) {
          const currentContext = threadContextRef.current;
          currentContext.setThreadMetadata((prev) => {
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
        const currentContext = threadContextRef.current;
        currentContext.setThreadMetadata((prev) => {
          const next = new Map(prev);
          next.delete(failedId);
          return next;
        });
        currentContext.setThreads((prev) => {
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
  }, [
    backendApiRef,
    backendStateRef,
    currentThreadIdRef,
    findPendingThreadId,
    polling,
    preparePendingThread,
    publicKey,
    threadContextRef,
  ]);

  const onSwitchToThread = useCallback(
    (threadId: string) => {
      threadContextRef.current.setCurrentThreadId(threadId);
    },
    [threadContextRef]
  );

  const onRename = useCallback(
    async (threadId: string, newTitle: string) => {
      const currentContext = threadContextRef.current;
      const previousTitle = currentContext.getThreadMetadata(threadId)?.title ?? "";
      const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
      currentContext.updateThreadMetadata(threadId, {
        title: normalizedTitle,
      });

      try {
        await backendApiRef.current.renameThread(threadId, newTitle);
      } catch (error) {
        console.error("Failed to rename thread:", error);
        currentContext.updateThreadMetadata(threadId, { title: previousTitle });
      }
    },
    [backendApiRef, threadContextRef]
  );

  const onArchive = useCallback(
    async (threadId: string) => {
      const currentContext = threadContextRef.current;
      currentContext.updateThreadMetadata(threadId, { status: "archived" });

      try {
        await backendApiRef.current.archiveThread(threadId);
      } catch (error) {
        console.error("Failed to archive thread:", error);
        currentContext.updateThreadMetadata(threadId, { status: "regular" });
      }
    },
    [backendApiRef, threadContextRef]
  );

  const onUnarchive = useCallback(
    async (threadId: string) => {
      const currentContext = threadContextRef.current;
      currentContext.updateThreadMetadata(threadId, { status: "regular" });

      try {
        await backendApiRef.current.unarchiveThread(threadId);
      } catch (error) {
        console.error("Failed to unarchive thread:", error);
        currentContext.updateThreadMetadata(threadId, { status: "archived" });
      }
    },
    [backendApiRef, threadContextRef]
  );

  const onDelete = useCallback(
    async (threadId: string) => {
      try {
        await backendApiRef.current.deleteThread(threadId);

        const currentContext = threadContextRef.current;
        currentContext.setThreadMetadata((prev) => {
          const next = new Map(prev);
          next.delete(threadId);
          return next;
        });
        currentContext.setThreads((prev) => {
          const next = new Map(prev);
          next.delete(threadId);
          return next;
        });
        const backendState = backendStateRef.current;
        backendState.pendingChat.delete(threadId);
        backendState.pendingSystem.delete(threadId);
        backendState.tempToBackendId.delete(threadId);
        backendState.skipInitialFetch.delete(threadId);
        backendState.runningThreads.delete(threadId);
        if (backendState.creatingThreadId === threadId) {
          backendState.creatingThreadId = null;
        }

        if (currentContext.currentThreadId === threadId) {
          const firstRegularThread = Array.from(currentContext.threadMetadata.entries()).find(
            ([id, meta]) => meta.status === "regular" && id !== threadId
          );

          if (firstRegularThread) {
            currentContext.setCurrentThreadId(firstRegularThread[0]);
          } else {
            const defaultId = "default-session";
            currentContext.setThreadMetadata((prev) =>
              new Map(prev).set(defaultId, {
                title: "New Chat",
                status: "regular",
                lastActiveAt: new Date().toISOString(),
              })
            );
            currentContext.setThreadMessages(defaultId, []);
            currentContext.setCurrentThreadId(defaultId);
          }
        }
      } catch (error) {
        console.error("Failed to delete thread:", error);
        throw error;
      }
    },
    [backendApiRef, backendStateRef, threadContextRef]
  );

  return useMemo(
    () => ({
      threadId: threadContext.currentThreadId,
      threads: regularThreads,
      archivedThreads,
      onSwitchToNewThread,
      onSwitchToThread,
      onRename,
      onArchive,
      onUnarchive,
      onDelete,
    }),
    [
      archivedThreads,
      onArchive,
      onDelete,
      onRename,
      onSwitchToNewThread,
      onSwitchToThread,
      onUnarchive,
      regularThreads,
      threadContext.currentThreadId,
    ]
  );
}

export async function fetchThreadListWithPk(
  publicKey: string,
  backendApiRef: MutableRefObject<BackendApi>,
  threadContextRef: MutableRefObject<ThreadContext>
) {
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
}
