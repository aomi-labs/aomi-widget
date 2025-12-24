"use client";

import { useMemo } from "react";

import type { ExternalStoreThreadData, ExternalStoreThreadListAdapter } from "@assistant-ui/react";
import type { ThreadMetadata } from "@/lib/thread-context";
import { isPlaceholderTitle, parseTimestamp } from "@/lib/runtime-utils";

type UseThreadListAdapterParams = {
  currentThreadId: string;
  threadMetadata: Map<string, ThreadMetadata>;
  onSwitchToNewThread: () => void | Promise<void>;
  onSwitchToThread: (threadId: string) => void;
  onRename: (threadId: string, newTitle: string) => Promise<void>;
  onArchive: (threadId: string) => Promise<void>;
  onUnarchive: (threadId: string) => Promise<void>;
  onDelete: (threadId: string) => Promise<void>;
};

export function useThreadListAdapter({
  currentThreadId,
  threadMetadata,
  onSwitchToNewThread,
  onSwitchToThread,
  onRename,
  onArchive,
  onUnarchive,
  onDelete,
}: UseThreadListAdapterParams): ExternalStoreThreadListAdapter {
  return useMemo(() => {
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
      onSwitchToNewThread,
      onSwitchToThread,
      onRename,
      onArchive,
      onUnarchive,
      onDelete,
    };
  }, [
    currentThreadId,
    onArchive,
    onDelete,
    onRename,
    onSwitchToNewThread,
    onSwitchToThread,
    onUnarchive,
    threadMetadata,
  ]);
}
