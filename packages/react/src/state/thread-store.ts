import type { SetStateAction } from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { ThreadContext } from "../contexts/thread-context";

export type ThreadStatus = "regular" | "archived" | "pending";

export type ThreadMetadata = {
  title: string;
  status: ThreadStatus;
  lastActiveAt?: string | number;
};

type ThreadStoreState = {
  currentThreadId: string;
  threadViewKey: number;
  threadCnt: number;
  threads: Map<string, ThreadMessageLike[]>;
  threadMetadata: Map<string, ThreadMetadata>;
};

type ThreadStoreOptions = {
  initialThreadId?: string;
};

export class ThreadStore {
  private state: ThreadStoreState;
  private listeners = new Set<() => void>();
  private snapshot: ThreadContext;

  constructor(options?: ThreadStoreOptions) {
    const initialThreadId = options?.initialThreadId ?? crypto.randomUUID();
    this.state = {
      currentThreadId: initialThreadId,
      threadViewKey: 0,
      threadCnt: 1,
      threads: new Map([[initialThreadId, []]]),
      threadMetadata: new Map([
        [
          initialThreadId,
          {
            title: "New Chat",
            status: "pending",
            lastActiveAt: new Date().toISOString(),
          },
        ],
      ]),
    };

    this.snapshot = this.buildSnapshot();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): ThreadContext => this.snapshot;

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private resolveStateAction<T>(updater: SetStateAction<T>, current: T): T {
    return typeof updater === "function"
      ? (updater as (prev: T) => T)(current)
      : updater;
  }

  private ensureThreadExists(threadId: string) {
    if (!this.state.threadMetadata.has(threadId)) {
      const nextMetadata = new Map(this.state.threadMetadata);
      nextMetadata.set(threadId, {
        title: "New Chat",
        status: "regular",
        lastActiveAt: new Date().toISOString(),
      });
      this.state = { ...this.state, threadMetadata: nextMetadata };
    }

    if (!this.state.threads.has(threadId)) {
      const nextThreads = new Map(this.state.threads);
      nextThreads.set(threadId, []);
      this.state = { ...this.state, threads: nextThreads };
    }
  }

  private updateState(partial: Partial<ThreadStoreState>) {
    this.state = { ...this.state, ...partial };
    this.snapshot = this.buildSnapshot();
    this.emit();
  }

  private buildSnapshot(): ThreadContext {
    return {
      currentThreadId: this.state.currentThreadId,
      setCurrentThreadId: this.setCurrentThreadId,
      threadViewKey: this.state.threadViewKey,
      bumpThreadViewKey: this.bumpThreadViewKey,
      threads: this.state.threads,
      setThreads: this.setThreads,
      threadMetadata: this.state.threadMetadata,
      setThreadMetadata: this.setThreadMetadata,
      threadCnt: this.state.threadCnt,
      setThreadCnt: this.setThreadCnt,
      getThreadMessages: this.getThreadMessages,
      setThreadMessages: this.setThreadMessages,
      getThreadMetadata: this.getThreadMetadata,
      updateThreadMetadata: this.updateThreadMetadata,
    };
  }

  setCurrentThreadId = (threadId: string) => {
    this.ensureThreadExists(threadId);
    this.updateState({ currentThreadId: threadId });
  };

  bumpThreadViewKey = () => {
    this.updateState({ threadViewKey: this.state.threadViewKey + 1 });
  };

  setThreadCnt = (updater: SetStateAction<number>) => {
    const nextCnt = this.resolveStateAction(updater, this.state.threadCnt);
    this.updateState({ threadCnt: nextCnt });
  };

  setThreads = (updater: SetStateAction<Map<string, ThreadMessageLike[]>>) => {
    const nextThreads = this.resolveStateAction(updater, this.state.threads);
    this.updateState({ threads: new Map(nextThreads) });
  };

  setThreadMetadata = (
    updater: SetStateAction<Map<string, ThreadMetadata>>,
  ) => {
    const nextMetadata = this.resolveStateAction(
      updater,
      this.state.threadMetadata,
    );
    this.updateState({ threadMetadata: new Map(nextMetadata) });
  };

  setThreadMessages = (threadId: string, messages: ThreadMessageLike[]) => {
    this.ensureThreadExists(threadId);
    const nextThreads = new Map(this.state.threads);
    nextThreads.set(threadId, messages);
    this.updateState({ threads: nextThreads });
  };

  getThreadMessages = (threadId: string): ThreadMessageLike[] => {
    return this.state.threads.get(threadId) ?? [];
  };

  getThreadMetadata = (threadId: string): ThreadMetadata | undefined => {
    return this.state.threadMetadata.get(threadId);
  };

  updateThreadMetadata = (
    threadId: string,
    updates: Partial<ThreadMetadata>,
  ) => {
    const existing = this.state.threadMetadata.get(threadId);
    if (!existing) {
      return;
    }
    const nextMetadata = new Map(this.state.threadMetadata);
    nextMetadata.set(threadId, { ...existing, ...updates });
    this.updateState({ threadMetadata: nextMetadata });
  };
}
