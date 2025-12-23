import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type {
  ExternalStoreThreadData,
  ExternalStoreThreadListAdapter,
  ThreadMessageLike,
} from "@assistant-ui/react";

import type { BackendApi } from "../api/client";
import type { BackendThreadMetadata } from "../api/types";
import type { ThreadMetadata } from "../state/types";
import { isPlaceholderTitle, isTempThreadId, parseTimestamp } from "./utils";

export type ThreadListAdapterDependencies = {
  currentThreadId: string;
  currentThreadIdRef: MutableRefObject<string>;
  threadMetadata: Map<string, ThreadMetadata>;
  setThreadMetadata: Dispatch<SetStateAction<Map<string, ThreadMetadata>>>;
  setThreads: Dispatch<SetStateAction<Map<string, ThreadMessageLike[]>>>;
  setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => void;
  setCurrentThreadId: (id: string) => void;
  setIsRunning: (running: boolean) => void;
  bumpThreadViewKey: () => void;
  findPendingThreadId: () => string | null;
  creatingThreadIdRef: MutableRefObject<string | null>;
  createThreadPromiseRef: MutableRefObject<Promise<void> | null>;
  pendingChatMessagesRef: MutableRefObject<Map<string, string[]>>;
  pendingSystemMessagesRef: MutableRefObject<Map<string, string[]>>;
  tempToBackendIdRef: MutableRefObject<Map<string, string>>;
  skipInitialFetchRef: MutableRefObject<Set<string>>;
  backendApiRef: MutableRefObject<BackendApi>;
  publicKey?: string;
  threadCnt: number;
  setThreadCnt: Dispatch<SetStateAction<number>>;
  resolveThreadId: (threadId: string) => string;
  startPolling: () => void;
  updateThreadMetadata: (threadId: string, updates: Partial<ThreadMetadata>) => void;
};

export function normalizeBackendThreads(
  threads: BackendThreadMetadata[],
  existingMetadata: Map<string, ThreadMetadata>,
  threadCnt: number
) {
  const newMetadata = new Map(existingMetadata);
  let maxChatNum = threadCnt;

  for (const thread of threads) {
    const rawTitle = thread.title || "New Chat";
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

  return { metadata: newMetadata, maxChatNum };
}

export function createThreadListAdapter({
  currentThreadId,
  currentThreadIdRef,
  threadMetadata,
  setThreadMetadata,
  setThreads,
  setThreadMessages,
  setCurrentThreadId,
  setIsRunning,
  bumpThreadViewKey,
  findPendingThreadId,
  creatingThreadIdRef,
  createThreadPromiseRef,
  pendingChatMessagesRef,
  pendingSystemMessagesRef,
  tempToBackendIdRef,
  skipInitialFetchRef,
  backendApiRef,
  publicKey,
  threadCnt,
  setThreadCnt,
  resolveThreadId,
  startPolling,
  updateThreadMetadata,
}: ThreadListAdapterDependencies): ExternalStoreThreadListAdapter {
  const sortByLastActiveDesc = (
    [, metaA]: [string, ThreadMetadata],
    [, metaB]: [string, ThreadMetadata]
  ) => {
    const tsA = parseTimestamp(metaA.lastActiveAt);
    const tsB = parseTimestamp(metaB.lastActiveAt);
    return tsB - tsA;
  };

  const regularThreads = Array.from(threadMetadata.entries())
    .filter(([_, meta]) => meta.status === "regular")
    .filter(([_, meta]) => !isPlaceholderTitle(meta.title))
    .sort(sortByLastActiveDesc)
    .map(([id, meta]): ExternalStoreThreadData<"regular"> => ({
      id,
      title: meta.title || "New Chat",
      status: "regular",
    }));

  const archivedThreadsArray = Array.from(threadMetadata.entries())
    .filter(([_, meta]) => meta.status === "archived")
    .filter(([_, meta]) => !isPlaceholderTitle(meta.title))
    .sort(sortByLastActiveDesc)
    .map(([id, meta]): ExternalStoreThreadData<"archived"> => ({
      id,
      title: meta.title || "New Chat",
      status: "archived",
    }));

  return {
    threadId: currentThreadId,
    threads: regularThreads,
    archivedThreads: archivedThreadsArray,

    onSwitchToNewThread: async () => {
      const preparePendingThread = (newId: string) => {
        const previousPendingId = creatingThreadIdRef.current;
        if (previousPendingId && previousPendingId !== newId) {
          setThreadMetadata((prev) => {
            const next = new Map(prev);
            next.delete(previousPendingId);
            return next;
          });
          setThreads((prev) => {
            const next = new Map(prev);
            next.delete(previousPendingId);
            return next;
          });
          pendingChatMessagesRef.current.delete(previousPendingId);
          pendingSystemMessagesRef.current.delete(previousPendingId);
          tempToBackendIdRef.current.delete(previousPendingId);
          skipInitialFetchRef.current.delete(previousPendingId);
        }

        creatingThreadIdRef.current = newId;
        pendingChatMessagesRef.current.delete(newId);
        pendingSystemMessagesRef.current.delete(newId);
        setThreadMetadata((prev) =>
          new Map(prev).set(newId, {
            title: "New Chat",
            status: "pending",
            lastActiveAt: new Date().toISOString(),
          })
        );
        setThreadMessages(newId, []);
        setCurrentThreadId(newId);
        setIsRunning(false);
        bumpThreadViewKey();
      };

      const existingPendingId = findPendingThreadId();
      if (existingPendingId) {
        preparePendingThread(existingPendingId);
        return;
      }

      if (createThreadPromiseRef.current) {
        preparePendingThread(creatingThreadIdRef.current ?? `temp-${crypto.randomUUID()}`);
        return;
      }

      const tempId = `temp-${crypto.randomUUID()}`;
      preparePendingThread(tempId);

      const createPromise = backendApiRef.current
        .createThread(publicKey, undefined)
        .then(async (newThread) => {
          const uiThreadId = creatingThreadIdRef.current ?? tempId;
          const backendId = newThread.session_id;

          tempToBackendIdRef.current.set(uiThreadId, backendId);
          skipInitialFetchRef.current.add(uiThreadId);

          const backendTitle = newThread.title;
          if (backendTitle && !isPlaceholderTitle(backendTitle)) {
            setThreadMetadata((prev) => {
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
            if (creatingThreadIdRef.current === uiThreadId) {
              creatingThreadIdRef.current = null;
            }
          }

          const pendingMessages = pendingChatMessagesRef.current.get(uiThreadId);
          if (pendingMessages?.length) {
            pendingChatMessagesRef.current.delete(uiThreadId);
            for (const text of pendingMessages) {
              try {
                await backendApiRef.current.postChatMessage(backendId, text);
              } catch (error) {
                console.error("Failed to send queued message:", error);
              }
            }
            if (currentThreadIdRef.current === uiThreadId) {
              startPolling();
            }
          }
        })
        .catch((error) => {
          console.error("Failed to create new thread:", error);
          const failedId = creatingThreadIdRef.current ?? tempId;
          setThreadMetadata((prev) => {
            const next = new Map(prev);
            next.delete(failedId);
            return next;
          });
          setThreads((prev) => {
            const next = new Map(prev);
            next.delete(failedId);
            return next;
          });
          if (creatingThreadIdRef.current === failedId) {
            creatingThreadIdRef.current = null;
          }
        })
        .finally(() => {
          createThreadPromiseRef.current = null;
        });

      createThreadPromiseRef.current = createPromise;
    },

    onSwitchToThread: (threadId: string) => {
      setCurrentThreadId(threadId);
    },

    onRename: async (threadId: string, newTitle: string) => {
      updateThreadMetadata(threadId, { title: isPlaceholderTitle(newTitle) ? "" : newTitle });

      try {
        await backendApiRef.current.renameThread(threadId, newTitle);
      } catch (error) {
        console.error("Failed to rename thread:", error);
      }
    },

    onArchive: async (threadId: string) => {
      updateThreadMetadata(threadId, { status: "archived" });

      try {
        await backendApiRef.current.archiveThread(threadId);
      } catch (error) {
        console.error("Failed to archive thread:", error);
        updateThreadMetadata(threadId, { status: "regular" });
      }
    },

    onUnarchive: async (threadId: string) => {
      updateThreadMetadata(threadId, { status: "regular" });

      try {
        await backendApiRef.current.unarchiveThread(threadId);
      } catch (error) {
        console.error("Failed to unarchive thread:", error);
        updateThreadMetadata(threadId, { status: "archived" });
      }
    },

    onDelete: async (threadId: string) => {
      try {
        await backendApiRef.current.deleteThread(threadId);

        setThreadMetadata((prev) => {
          const next = new Map(prev);
          next.delete(threadId);
          return next;
        });
        setThreads((prev) => {
          const next = new Map(prev);
          next.delete(threadId);
          return next;
        });

        if (currentThreadId === threadId) {
          const firstRegularThread = Array.from(threadMetadata.entries()).find(
            ([id, meta]) => meta.status === "regular" && id !== threadId
          );

          if (firstRegularThread) {
            setCurrentThreadId(firstRegularThread[0]);
          } else {
            const defaultId = "default-session";
            setThreadMetadata((prev) =>
              new Map(prev).set(defaultId, {
                title: "New Chat",
                status: "regular",
                lastActiveAt: new Date().toISOString(),
              })
            );
            setThreadMessages(defaultId, []);
            setCurrentThreadId(defaultId);
          }
        }
      } catch (error) {
        console.error("Failed to delete thread:", error);
        throw error;
      }
    },
  };
}
