"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";

import type { ThreadMetadata } from "./types";

export type ThreadContextValue = {
  currentThreadId: string;
  setCurrentThreadId: (id: string) => void;
  threadViewKey: number;
  bumpThreadViewKey: () => void;
  threads: Map<string, ThreadMessageLike[]>;
  setThreads: React.Dispatch<React.SetStateAction<Map<string, ThreadMessageLike[]>>>;
  threadMetadata: Map<string, ThreadMetadata>;
  setThreadMetadata: React.Dispatch<React.SetStateAction<Map<string, ThreadMetadata>>>;
  threadCnt: number;
  setThreadCnt: React.Dispatch<React.SetStateAction<number>>;
  getThreadMessages: (threadId: string) => ThreadMessageLike[];
  setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => void;
  getThreadMetadata: (threadId: string) => ThreadMetadata | undefined;
  updateThreadMetadata: (threadId: string, updates: Partial<ThreadMetadata>) => void;
};

export type ThreadContextProviderProps = {
  children: ReactNode;
  initialThreadId?: string;
};

const ThreadContext = createContext<ThreadContextValue | null>(null);

export function useThreadContext(): ThreadContextValue {
  const context = useContext(ThreadContext);
  if (!context) {
    throw new Error(
      "useThreadContext must be used within ThreadContextProvider. " +
        "Wrap your app with <ThreadContextProvider>...</ThreadContextProvider>"
    );
  }
  return context;
}

export function ThreadContextProvider({
  children,
  initialThreadId,
}: ThreadContextProviderProps) {
  const [generateThreadId] = useState(() => {
    const id = initialThreadId || crypto.randomUUID();
    console.log("🔵 [ThreadContext] Initialized with thread ID:", id);
    return id;
  });

  const [threadCnt, setThreadCnt] = useState<number>(1);

  const [threads, setThreads] = useState<Map<string, ThreadMessageLike[]>>(
    () => new Map([[generateThreadId, []]])
  );

  const [threadMetadata, setThreadMetadata] = useState<Map<string, ThreadMetadata>>(
    () =>
      new Map([
        [
          generateThreadId,
          { title: "New Chat", status: "pending", lastActiveAt: new Date().toISOString() },
        ],
      ])
  );

  const ensureThreadExists = useCallback(
    (threadId: string) => {
      setThreadMetadata((prev) => {
        if (prev.has(threadId)) return prev;
        const next = new Map(prev);
        next.set(threadId, { title: "New Chat", status: "regular", lastActiveAt: new Date().toISOString() });
        return next;
      });

      setThreads((prev) => {
        if (prev.has(threadId)) return prev;
        const next = new Map(prev);
        next.set(threadId, []);
        return next;
      });
    },
    []
  );

  const [currentThreadId, _setCurrentThreadId] = useState(generateThreadId);
  const [threadViewKey, setThreadViewKey] = useState(0);

  const bumpThreadViewKey = useCallback(() => {
    setThreadViewKey((prev) => prev + 1);
  }, []);

  const setCurrentThreadId = useCallback(
    (threadId: string) => {
      ensureThreadExists(threadId);
      _setCurrentThreadId(threadId);
    },
    [ensureThreadExists]
  );

  const getThreadMessages = useCallback(
    (threadId: string): ThreadMessageLike[] => {
      return threads.get(threadId) || [];
    },
    [threads]
  );

  const setThreadMessages = useCallback((threadId: string, messages: ThreadMessageLike[]) => {
    setThreads((prev) => {
      const next = new Map(prev);
      next.set(threadId, messages);
      return next;
    });
  }, []);

  const getThreadMetadata = useCallback(
    (threadId: string): ThreadMetadata | undefined => {
      return threadMetadata.get(threadId);
    },
    [threadMetadata]
  );

  const updateThreadMetadata = useCallback((threadId: string, updates: Partial<ThreadMetadata>) => {
    setThreadMetadata((prev) => {
      const existing = prev.get(threadId);
      if (!existing) {
        console.warn(`Thread metadata not found for threadId: ${threadId}`);
        return prev;
      }

      const next = new Map(prev);
      next.set(threadId, { ...existing, ...updates });
      return next;
    });
  }, []);

  const value: ThreadContextValue = {
    currentThreadId,
    setCurrentThreadId,
    threadViewKey,
    bumpThreadViewKey,
    threads,
    setThreads,
    threadMetadata,
    setThreadMetadata,
    threadCnt,
    setThreadCnt,
    getThreadMessages,
    setThreadMessages,
    getThreadMetadata,
    updateThreadMetadata,
  };

  return <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>;
}

export function useCurrentThreadMessages(): ThreadMessageLike[] {
  const { currentThreadId, getThreadMessages } = useThreadContext();
  return getThreadMessages(currentThreadId);
}

export function useCurrentThreadMetadata(): ThreadMetadata | undefined {
  const { currentThreadId, getThreadMetadata } = useThreadContext();
  return getThreadMetadata(currentThreadId);
}
