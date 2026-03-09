import { generateUUID } from "../utils/uuid";
import type { MutableRefObject } from "react";
import type { ExternalStoreThreadData } from "@assistant-ui/react";

import type { AomiClient } from "@aomi-labs/client";
import type { ThreadContext } from "../contexts/thread-context";
import type { UserState } from "../contexts/user-context";
import { initThreadControl, type ThreadMetadata } from "../state/thread-store";
import type { BackendState } from "../state/backend-state";
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
  aomiClientRef: MutableRefObject<AomiClient>;
  threadContext: ThreadContext;
  currentThreadIdRef: MutableRefObject<string>;
  polling: PollingController;
  userAddress?: string;
  setIsRunning: (running: boolean) => void;
  getNamespace: () => string;
  getApiKey?: () => string | null;
  getUserState?: () => UserState;
};

export function buildThreadListAdapter({
  aomiClientRef,
  threadContext,
  setIsRunning,
}: ThreadListAdapterConfig) {
  const { regularThreads, archivedThreads } = buildThreadLists(
    threadContext.allThreadsMetadata,
  );

  return {
    threadId: threadContext.currentThreadId,
    threads: regularThreads,
    archivedThreads,

    onSwitchToNewThread: () => {
      const threadId = generateUUID();
      threadContext.setThreadMetadata((prev) =>
        new Map(prev).set(threadId, {
          title: "New Chat",
          status: "regular",
          lastActiveAt: new Date().toISOString(),
          control: initThreadControl(),
        }),
      );
      threadContext.setThreadMessages(threadId, []);
      threadContext.setCurrentThreadId(threadId);
      setIsRunning(false);
      threadContext.bumpThreadViewKey();
    },

    onSwitchToThread: (threadId: string) => {
      threadContext.setCurrentThreadId(threadId);
      threadContext.bumpThreadViewKey();
    },

    onRename: async (threadId: string, newTitle: string) => {
      const previousTitle =
        threadContext.getThreadMetadata(threadId)?.title ?? "";
      const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
      threadContext.updateThreadMetadata(threadId, {
        title: normalizedTitle,
      });

      try {
        await aomiClientRef.current.renameThread(threadId, newTitle);
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
        await aomiClientRef.current.archiveThread(threadId);
      } catch (error) {
        console.error("Failed to archive thread:", error);
        threadContext.updateThreadMetadata(threadId, { status: "regular" });
      }
    },

    onUnarchive: async (threadId: string) => {
      threadContext.updateThreadMetadata(threadId, { status: "regular" });

      try {
        await aomiClientRef.current.unarchiveThread(threadId);
      } catch (error) {
        console.error("Failed to unarchive thread:", error);
        threadContext.updateThreadMetadata(threadId, { status: "archived" });
      }
    },

    onDelete: async (threadId: string) => {
      try {
        await aomiClientRef.current.deleteThread(threadId);

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
                control: initThreadControl(),
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
