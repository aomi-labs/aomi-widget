"use client";

import { useCallback, useMemo } from "react";
import type { MutableRefObject } from "react";
import type { ExternalStoreThreadData as AuiThreadData } from "@assistant-ui/react";

import {
  skipFirstFetch,
  setBackendMapping,
  type BakendState,
} from "../state/backend";
import { isPlaceholderTitle, parseTimestamp } from "../utils/conversion";
import type { PollingController } from "./polling";
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

const DEFAULT_THREAD_TITLE = "New Chat";
const DEFAULT_SESSION_ID = "default-session";

function buildThreadLists(threadMetadata: Map<string, ThreadMetadata>) {
  const entries = Array.from(threadMetadata.entries()).filter(
    ([, meta]) => !isPlaceholderTitle(meta.title)
  );

  const regularThreads = entries
    .filter(([, meta]) => meta.status === "regular")
    .sort(sortByLastActiveDesc)
    .map(([id, meta]): AuiThreadData<"regular"> => ({
      id,
      title: meta.title || DEFAULT_THREAD_TITLE,
      status: "regular",
    }));

  const archivedThreads = entries
    .filter(([, meta]) => meta.status === "archived")
    .sort(sortByLastActiveDesc)
    .map(([id, meta]): AuiThreadData<"archived"> => ({
      id,
      title: meta.title || DEFAULT_THREAD_TITLE,
      status: "archived",
    }));

  return { threads: regularThreads, archivedThreads };
}

function deleteThreadFromContext(context: ThreadContext, threadId: string) {
  context.setThreadMetadata((prev) => {
    const next = new Map(prev);
    next.delete(threadId);
    return next;
  });
  context.setThreads((prev) => {
    const next = new Map(prev);
    next.delete(threadId);
    return next;
  });
}

function clearPendingQueues(backendState: BakendState, threadId: string) {
  backendState.pendingSession.delete(threadId);
  backendState.pendingSystem.delete(threadId);
}

function clearPendingSession(backendState: BakendState, threadId: string) {
  clearPendingQueues(backendState, threadId);
  backendState.tempToSessionId.delete(threadId);
  backendState.skipInitialFetch.delete(threadId);
}

function updateTitleFromBackend(
  context: ThreadContext,
  threadId: string,
  backendTitle?: string | null
) {
  if (!backendTitle || isPlaceholderTitle(backendTitle)) return;

  context.setThreadMetadata((prev) => {
    const next = new Map(prev);
    const existing = next.get(threadId);
    const nextStatus = existing?.status === "archived" ? "archived" : "regular";
    next.set(threadId, {
      title: backendTitle,
      status: nextStatus,
      lastActiveAt: existing?.lastActiveAt ?? new Date().toISOString(),
    });
    return next;
  });
}

function ensureThreadFallback(context: ThreadContext, removedId: string) {
  if (context.currentThreadId !== removedId) return;

  const firstRegularThread = Array.from(context.threadMetadata.entries()).find(
    ([id, meta]) => meta.status === "regular" && id !== removedId
  );

  if (firstRegularThread) {
    context.setCurrentThreadId(firstRegularThread[0]);
    return;
  }

  context.setThreadMetadata((prev) =>
    new Map(prev).set(DEFAULT_SESSION_ID, {
      title: DEFAULT_THREAD_TITLE,
      status: "regular",
      lastActiveAt: new Date().toISOString(),
    })
  );
  context.setThreadMessages(DEFAULT_SESSION_ID, []);
  context.setCurrentThreadId(DEFAULT_SESSION_ID);
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

// Data transformation (for rendering):
//     Uses buildThreadLists to convert internal state → AUI format
// Action handlers (for user interactions):
//     builds callbacks that coordinate threadContext and backendState
export type ThreadListAdapter = {
  threadId: string;
  threads: AuiThreadData<"regular">[];
  archivedThreads: AuiThreadData<"archived">[];
  onSwitchToNewThread: () => Promise<void>;
  onSwitchToThread: (threadId: string) => void;
  onRename: (threadId: string, newTitle: string) => Promise<void>;
  onArchive: (threadId: string) => Promise<void>;
  onUnarchive: (threadId: string) => Promise<void>;
  onDelete: (threadId: string) => Promise<void>;
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
}: ThreadListAdapterParams): ThreadListAdapter {

  // adapt to AUI data format and cache it with useMemo
  // auiRegularThreads [{id, title, 'regular'}, ...]
  // auiArchivedThreads [{id, title, 'archived'}, ...]

  const { threads, archivedThreads } = useMemo(
    // UI action → updateThreadMetadata → updateState → new snapshot created → emit() 
    // → useSyncExternalStore detects change → getSnapshot() returns new ThreadContext 
    // → component re-renders → [threadContext.threadMetadata] dependency changes 
    () => buildThreadLists(threadContext.threadMetadata),
    [threadContext.threadMetadata]
  );

  const removePendingThread = useCallback(
    (threadId: string) => {
      const currentContext = threadContextRef.current;
      deleteThreadFromContext(currentContext, threadId);
      clearPendingSession(backendStateRef.current, threadId);
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
      clearPendingQueues(backendState, threadId);
      const currentContext = threadContextRef.current;
      currentContext.setThreadMetadata((prev) =>
        new Map(prev).set(threadId, {
          title: DEFAULT_THREAD_TITLE,
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
        skipFirstFetch(backendState, uiThreadId);

        updateTitleFromBackend(threadContextRef.current, uiThreadId, newThread.title);

        if (backendState.creatingThreadId === uiThreadId) {
          backendState.creatingThreadId = null;
        }

        const pendingMessages = backendState.pendingSession.get(uiThreadId);
        if (pendingMessages?.length) {
          backendState.pendingSession.delete(uiThreadId);
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
        deleteThreadFromContext(threadContextRef.current, failedId);
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
        deleteThreadFromContext(currentContext, threadId);
        const backendState = backendStateRef.current;
        clearPendingSession(backendState, threadId);
        backendState.runningSessions.delete(threadId);
        if (backendState.creatingThreadId === threadId) {
          backendState.creatingThreadId = null;
        }

        ensureThreadFallback(currentContext, threadId);
      } catch (error) {
        console.error("Failed to delete thread:", error);
        throw error;
      }
    },
    [backendApiRef, backendStateRef, threadContextRef]
  );

  return {
    threadId: threadContext.currentThreadId,
    threads,
    archivedThreads,
    onSwitchToNewThread,
    onSwitchToThread,
    onRename,
    onArchive,
    onUnarchive,
    onDelete,
  };
}

export async function fetchPubkeyThreads(
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
