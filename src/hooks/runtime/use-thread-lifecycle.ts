"use client";

import { useCallback, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";

import type { BackendApi } from "@/lib/backend-api";
import type { ThreadMetadata } from "@/lib/thread-context";
import { isPlaceholderTitle } from "@/lib/runtime-utils";

type UseThreadLifecycleParams = {
  backendApiRef: RefObject<BackendApi>;
  currentThreadId: string;
  currentThreadIdRef: RefObject<string>;
  threadMetadata: Map<string, ThreadMetadata>;
  setThreadMetadata: Dispatch<SetStateAction<Map<string, ThreadMetadata>>>;
  setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => void;
  setThreads: Dispatch<SetStateAction<Map<string, ThreadMessageLike[]>>>;
  setCurrentThreadId: (id: string) => void;
  updateThreadMetadata: (threadId: string, updates: Partial<ThreadMetadata>) => void;
  bumpThreadViewKey: () => void;
  stopPolling: () => void;
  interruptThread: (threadId: string) => Promise<void>;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  pendingChatMessagesRef: RefObject<Map<string, string[]>>;
  pendingSystemMessagesRef: RefObject<Map<string, string[]>>;
  creatingThreadIdRef: RefObject<string | null>;
  createThreadPromiseRef: RefObject<Promise<void> | null>;
};

export function useThreadLifecycle({
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
  stopPolling,
  interruptThread,
  isRunning,
  setIsRunning,
  pendingChatMessagesRef,
  pendingSystemMessagesRef,
  creatingThreadIdRef,
  createThreadPromiseRef,
}: UseThreadLifecycleParams) {
  const onSwitchToNewThread = useCallback(async () => {
    const previousThreadId = currentThreadIdRef.current;
    stopPolling();
    if (isRunning) {
      void interruptThread(previousThreadId);
    }

    const preparePendingThread = (newId: string) => {
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

    // If a creation request is already in flight, keep using the same pending thread.
    if (createThreadPromiseRef.current) {
      preparePendingThread(creatingThreadIdRef.current ?? `temp-${crypto.randomUUID()}`);
      return;
    }

    // Generate a temporary ID for immediate UI update.
    const tempId = `temp-${crypto.randomUUID()}`;
    preparePendingThread(tempId);
  }, [
    bumpThreadViewKey,
    createThreadPromiseRef,
    creatingThreadIdRef,
    currentThreadIdRef,
    interruptThread,
    isRunning,
    pendingChatMessagesRef,
    pendingSystemMessagesRef,
    setCurrentThreadId,
    setIsRunning,
    setThreadMessages,
    setThreadMetadata,
    stopPolling,
  ]);

  const onSwitchToThread = useCallback(
    (threadId: string) => {
      setCurrentThreadId(threadId);
    },
    [setCurrentThreadId]
  );

  const onRename = useCallback(
    async (threadId: string, newTitle: string) => {
      updateThreadMetadata(threadId, { title: isPlaceholderTitle(newTitle) ? "" : newTitle });

      try {
        await backendApiRef.current.renameThread(threadId, newTitle);
      } catch (error) {
        console.error("Failed to rename thread:", error);
      }
    },
    [backendApiRef, updateThreadMetadata]
  );

  const onArchive = useCallback(
    async (threadId: string) => {
      updateThreadMetadata(threadId, { status: "archived" });

      try {
        await backendApiRef.current.archiveThread(threadId);
      } catch (error) {
        console.error("Failed to archive thread:", error);
        updateThreadMetadata(threadId, { status: "regular" });
      }
    },
    [backendApiRef, updateThreadMetadata]
  );

  const onUnarchive = useCallback(
    async (threadId: string) => {
      updateThreadMetadata(threadId, { status: "regular" });

      try {
        await backendApiRef.current.unarchiveThread(threadId);
      } catch (error) {
        console.error("Failed to unarchive thread:", error);
        updateThreadMetadata(threadId, { status: "archived" });
      }
    },
    [backendApiRef, updateThreadMetadata]
  );

  const onDelete = useCallback(
    async (threadId: string) => {
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
    [
      backendApiRef,
      currentThreadId,
      setCurrentThreadId,
      setThreadMessages,
      setThreadMetadata,
      setThreads,
      threadMetadata,
    ]
  );

  return {
    onArchive,
    onDelete,
    onRename,
    onSwitchToNewThread,
    onSwitchToThread,
    onUnarchive,
  };
}
