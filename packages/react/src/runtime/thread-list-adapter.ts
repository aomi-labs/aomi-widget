import {
  type ExternalStoreThreadData,
  type ExternalStoreThreadListAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import {
  useCallback,
  useEffect,
  useMemo,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import type { BackendApi } from "../api/client";
import type {
  BackendThreadMetadata,
  CreateThreadResponse,
} from "../api/types";
import type { ThreadMetadata } from "../state/types";
import { isPlaceholderTitle, parseTimestamp, isTempThreadId } from "./utils";

type UseThreadListAdapterParams = {
  backendApiRef: MutableRefObject<BackendApi>;
  publicKey?: string;
  threadMetadata: Map<string, ThreadMetadata>;
  threadCnt: number;
  setThreadCnt: (count: number) => void;
  setThreadMetadata: Dispatch<SetStateAction<Map<string, ThreadMetadata>>>;
  setThreads: Dispatch<SetStateAction<Map<string, ThreadMessageLike[]>>>;
  setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => void;
  setCurrentThreadId: (threadId: string) => void;
  setIsRunning: (isRunning: boolean) => void;
  bumpThreadViewKey: () => void;
  currentThreadId: string;
  findPendingThreadId: () => string | null;
  pendingChatMessagesRef: MutableRefObject<Map<string, string[]>>;
  pendingSystemMessagesRef: MutableRefObject<Map<string, string[]>>;
  tempToBackendIdRef: MutableRefObject<Map<string, string>>;
  skipInitialFetchRef: MutableRefObject<Set<string>>;
  creatingThreadIdRef: MutableRefObject<string | null>;
  createThreadPromiseRef: MutableRefObject<Promise<void> | null>;
  startPolling: () => void;
};

export function useThreadListAdapter({
  backendApiRef,
  publicKey,
  threadMetadata,
  threadCnt,
  setThreadCnt,
  setThreadMetadata,
  setThreads,
  setThreadMessages,
  setCurrentThreadId,
  setIsRunning,
  bumpThreadViewKey,
  currentThreadId,
  findPendingThreadId,
  pendingChatMessagesRef,
  pendingSystemMessagesRef,
  tempToBackendIdRef,
  skipInitialFetchRef,
  creatingThreadIdRef,
  createThreadPromiseRef,
  startPolling,
}: UseThreadListAdapterParams): ExternalStoreThreadListAdapter {
  useEffect(() => {
    if (!publicKey) return;

    const syncThreadList = async () => {
      try {
        const threadList = await backendApiRef.current.fetchThreads(publicKey);
        const nextMetadata = mergeThreadMetadata(threadList, threadMetadata);

        const highestChatNum = getHighestChatNumber(nextMetadata, threadCnt);
        setThreadMetadata(nextMetadata);
        if (highestChatNum > threadCnt) {
          setThreadCnt(highestChatNum);
        }
      } catch (error) {
        console.error("Failed to fetch thread list:", error);
      }
    };

    void syncThreadList();
  }, [backendApiRef, publicKey, setThreadMetadata, threadCnt, setThreadCnt, threadMetadata]);

  const preparePendingThread = useCallback(
    (newId: string) => {
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
    },
    [
      bumpThreadViewKey,
      creatingThreadIdRef,
      pendingChatMessagesRef,
      pendingSystemMessagesRef,
      setCurrentThreadId,
      setIsRunning,
      setThreadMessages,
      setThreadMetadata,
      setThreads,
      skipInitialFetchRef,
      tempToBackendIdRef,
    ]
  );

  const onCreateThread = useCallback(
    async (publicKeyForRequest?: string) => {
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
        .createThread(publicKeyForRequest, undefined)
        .then(async (created) => {
          await handleThreadCreation({
            created,
            tempId,
            creatingThreadIdRef,
            tempToBackendIdRef,
            skipInitialFetchRef,
            setThreadMetadata,
            pendingChatMessagesRef,
            startPolling,
            currentThreadId,
            setThreadMessages,
            setIsRunning,
            backendApiRef,
          });
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
    [
      backendApiRef,
      createThreadPromiseRef,
      creatingThreadIdRef,
      currentThreadId,
      findPendingThreadId,
      pendingChatMessagesRef,
      preparePendingThread,
      setIsRunning,
      setThreadMetadata,
      setThreadMessages,
      setThreads,
      skipInitialFetchRef,
      startPolling,
      tempToBackendIdRef,
    ]
  );

  return useMemo((): ExternalStoreThreadListAdapter => {
    const sortByLastActiveDesc = (
      [, metaA]: [string, ThreadMetadata],
      [, metaB]: [string, ThreadMetadata]
    ) => {
      const tsA = parseTimestamp(metaA.lastActiveAt);
      const tsB = parseTimestamp(metaB.lastActiveAt);
      return tsB - tsA;
    };

    const regularThreads = Array.from(threadMetadata.entries())
      .filter(([, meta]) => meta.status === "regular")
      .filter(([, meta]) => !isPlaceholderTitle(meta.title))
      .sort(sortByLastActiveDesc)
      .map(([id, meta]): ExternalStoreThreadData<"regular"> => ({
        id,
        title: meta.title || "New Chat",
        status: "regular",
      }));

    const archivedThreadsArray = Array.from(threadMetadata.entries())
      .filter(([, meta]) => meta.status === "archived")
      .filter(([, meta]) => !isPlaceholderTitle(meta.title))
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
      onSwitchToNewThread: () => onCreateThread(publicKey),
      onSwitchToThread: (threadId: string) => setCurrentThreadId(threadId),
      onRename: async (threadId: string, newTitle: string) => {
        setThreadMetadata((prev) => {
          const next = new Map(prev);
          const existing = next.get(threadId);
          if (!existing) return prev;
          next.set(threadId, {
            ...existing,
            title: isPlaceholderTitle(newTitle) ? "" : newTitle,
          });
          return next;
        });

        try {
          await backendApiRef.current.renameThread(threadId, newTitle);
        } catch (error) {
          console.error("Failed to rename thread:", error);
        }
      },
      onArchive: async (threadId: string) => {
        setThreadMetadata((prev) => {
          const next = new Map(prev);
          const existing = next.get(threadId);
          if (!existing) return prev;
          next.set(threadId, { ...existing, status: "archived" });
          return next;
        });

        try {
          await backendApiRef.current.archiveThread(threadId);
        } catch (error) {
          console.error("Failed to archive thread:", error);
          setThreadMetadata((prev) => {
            const next = new Map(prev);
            const existing = next.get(threadId);
            if (!existing) return prev;
            next.set(threadId, { ...existing, status: "regular" });
            return next;
          });
        }
      },
      onUnarchive: async (threadId: string) => {
        setThreadMetadata((prev) => {
          const next = new Map(prev);
          const existing = next.get(threadId);
          if (!existing) return prev;
          next.set(threadId, { ...existing, status: "regular" });
          return next;
        });

        try {
          await backendApiRef.current.unarchiveThread(threadId);
        } catch (error) {
          console.error("Failed to unarchive thread:", error);
          setThreadMetadata((prev) => {
            const next = new Map(prev);
            const existing = next.get(threadId);
            if (!existing) return prev;
            next.set(threadId, { ...existing, status: "archived" });
            return next;
          });
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
  }, [
    backendApiRef,
    currentThreadId,
    onCreateThread,
    publicKey,
    setCurrentThreadId,
    setThreadMetadata,
    setThreadMessages,
    setThreads,
    threadMetadata,
  ]);
}

function mergeThreadMetadata(
  threadList: BackendThreadMetadata[],
  threadMetadata: Map<string, ThreadMetadata>
) {
  const newMetadata = new Map(threadMetadata);

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
  }

  return newMetadata;
}

function getHighestChatNumber(metadata: Map<string, ThreadMetadata>, currentMax: number) {
  let maxChatNum = currentMax;
  for (const [, meta] of metadata) {
    const match = meta.title.match(/^Chat (\\d+)$/);
    if (!match) continue;
    const num = parseInt(match[1] ?? "0", 10);
    if (Number.isFinite(num) && num > maxChatNum) {
      maxChatNum = num;
    }
  }
  return maxChatNum;
}

async function handleThreadCreation({
  created,
  tempId,
  creatingThreadIdRef,
  tempToBackendIdRef,
  skipInitialFetchRef,
  setThreadMetadata,
  pendingChatMessagesRef,
  startPolling,
  currentThreadId,
  setThreadMessages,
  setIsRunning,
  backendApiRef,
}: {
  created: CreateThreadResponse;
  tempId: string;
  creatingThreadIdRef: MutableRefObject<string | null>;
  tempToBackendIdRef: MutableRefObject<Map<string, string>>;
  skipInitialFetchRef: MutableRefObject<Set<string>>;
  setThreadMetadata: Dispatch<SetStateAction<Map<string, ThreadMetadata>>>;
  pendingChatMessagesRef: MutableRefObject<Map<string, string[]>>;
  startPolling: () => void;
  currentThreadId: string;
  setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => void;
  setIsRunning: (isRunning: boolean) => void;
  backendApiRef: MutableRefObject<BackendApi>;
}) {
  const uiThreadId = creatingThreadIdRef.current ?? tempId;
  const backendId = created.session_id;

  tempToBackendIdRef.current.set(uiThreadId, backendId);
  skipInitialFetchRef.current.add(uiThreadId);

  const backendTitle = created.title;
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
    if (currentThreadId === uiThreadId) {
      startPolling();
    }
  }
}
