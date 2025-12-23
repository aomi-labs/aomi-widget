import type { ThreadMessageLike } from "@assistant-ui/react";

import type { ThreadMetadata } from "../state/types";

export type ThreadStateStatus = ThreadMetadata["status"];

export type ThreadStateStore = {
  id: string;
  metadata: ThreadMetadata;
  messages: ThreadMessageLike[];
  pendingChatQueue: string[];
  pendingSystemQueue: string[];
  isRunning: boolean;
};

export function createThreadState(
  id: string,
  metadata?: Partial<ThreadMetadata>,
  messages: ThreadMessageLike[] = []
): ThreadStateStore {
  return {
    id,
    metadata: {
      title: metadata?.title ?? "New Chat",
      status: metadata?.status ?? "regular",
      lastActiveAt: metadata?.lastActiveAt ?? new Date().toISOString(),
    },
    messages,
    pendingChatQueue: [],
    pendingSystemQueue: [],
    isRunning: false,
  };
}
