"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";

/**
 * Thread Context Value
 *
 * Manages global state for multi-thread support:
 * - Current active thread ID
 * - Message history for all threads
 * - Thread metadata (title, archived status)
 */
export type ThreadContextValue = {
  // Current thread
  currentThreadId: string;
  setCurrentThreadId: (id: string) => void;

  // Thread messages (Map: threadId -> messages)
  threads: Map<string, ThreadMessageLike[]>;
  setThreads: React.Dispatch<React.SetStateAction<Map<string, ThreadMessageLike[]>>>;

  // Thread metadata (Map: threadId -> { title, status })
  threadMetadata: Map<string, ThreadMetadata>;
  setThreadMetadata: React.Dispatch<React.SetStateAction<Map<string, ThreadMetadata>>>;

  // Thread counter for sequential titles
  threadCnt: number;
  setThreadCnt: React.Dispatch<React.SetStateAction<number>>;

  // Helper methods
  getThreadMessages: (threadId: string) => ThreadMessageLike[];
  setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => void;
  getThreadMetadata: (threadId: string) => ThreadMetadata | undefined;
  updateThreadMetadata: (threadId: string, updates: Partial<ThreadMetadata>) => void;
};

export type ThreadMetadata = {
  title: string;
  status: "regular" | "archived";
};

/**
 * Thread Context
 *
 * IMPORTANT: Do not use this directly. Use the useThreadContext hook instead.
 */
const ThreadContext = createContext<ThreadContextValue | null>(null);

/**
 * Hook to access Thread Context
 *
 * Must be used within a ThreadContextProvider
 *
 * @example
 * ```tsx
 * const { currentThreadId, setCurrentThreadId } = useThreadContext();
 * ```
 */
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

/**
 * Thread Context Provider Props
 */
export type ThreadContextProviderProps = {
  children: ReactNode;
  /**
   * Initial thread ID to set as current
   * @default "default-session"
   */
  initialThreadId?: string;
};

/**
 * Thread Context Provider
 *
 * Provides global state for multi-thread management.
 * Should be placed high in your component tree, typically in your root layout.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * export default function Layout({ children }) {
 *   return (
 *     <ThreadContextProvider>
 *       <AomiRuntimeProvider>
 *         {children}
 *       </AomiRuntimeProvider>
 *     </ThreadContextProvider>
 *   );
 * }
 * ```
 */
export function ThreadContextProvider({
  children,
  initialThreadId = "default-session",
}: ThreadContextProviderProps) {

  const [threadCnt, setThreadCnt] = useState<number>(1); // For sequential "Chat N" titles

  // Thread messages storage
  const [threads, setThreads] = useState<Map<string, ThreadMessageLike[]>>(
    () => new Map([[initialThreadId, []]])
  );

  // Thread metadata storage
  const [threadMetadata, setThreadMetadata] = useState<Map<string, ThreadMetadata>>(
    () => new Map([[initialThreadId, { title: "Chat 1", status: "regular" }]])
  );

  // Ensure a thread has placeholder metadata/messages before use
  const ensureThreadExists = useCallback(
    (threadId: string) => {
      setThreadMetadata((prev) => {
        if (prev.has(threadId)) return prev;
        const next = new Map(prev);
        next.set(threadId, { title: "New Chat", status: "regular" });
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

  // Current thread ID
  const [currentThreadId, _setCurrentThreadId] = useState(initialThreadId);

  const setCurrentThreadId = useCallback(
    (threadId: string) => {
      ensureThreadExists(threadId);
      _setCurrentThreadId(threadId);
    },
    [ensureThreadExists]
  );

  // Helper: Get messages for a specific thread
  const getThreadMessages = useCallback(
    (threadId: string): ThreadMessageLike[] => {
      return threads.get(threadId) || [];
    },
    [threads]
  );

  // Helper: Set messages for a specific thread
  const setThreadMessages = useCallback(
    (threadId: string, messages: ThreadMessageLike[]) => {
      setThreads((prev) => {
        const next = new Map(prev);
        next.set(threadId, messages);
        return next;
      });
    },
    []
  );

  // Helper: Get metadata for a specific thread
  const getThreadMetadata = useCallback(
    (threadId: string): ThreadMetadata | undefined => {
      return threadMetadata.get(threadId);
    },
    [threadMetadata]
  );

  // Helper: Update metadata for a specific thread
  const updateThreadMetadata = useCallback(
    (threadId: string, updates: Partial<ThreadMetadata>) => {
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
    },
    []
  );

  const value: ThreadContextValue = {
    currentThreadId,
    setCurrentThreadId,
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

  return (
    <ThreadContext.Provider value={value}>
      {children}
    </ThreadContext.Provider>
  );
}

/**
 * Hook to get current thread messages
 *
 * Convenience hook that returns messages for the current thread
 *
 * @example
 * ```tsx
 * const messages = useCurrentThreadMessages();
 * ```
 */
export function useCurrentThreadMessages(): ThreadMessageLike[] {
  const { currentThreadId, getThreadMessages } = useThreadContext();
  return getThreadMessages(currentThreadId);
}

/**
 * Hook to get current thread metadata
 *
 * Convenience hook that returns metadata for the current thread
 *
 * @example
 * ```tsx
 * const metadata = useCurrentThreadMetadata();
 * console.log(metadata.title, metadata.status);
 * ```
 */
export function useCurrentThreadMetadata(): ThreadMetadata | undefined {
  const { currentThreadId, getThreadMetadata } = useThreadContext();
  return getThreadMetadata(currentThreadId);
}
