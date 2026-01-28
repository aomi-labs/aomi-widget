"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import type { ReactNode, SetStateAction } from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { ThreadMetadata, ThreadStore } from "../state/thread-store";

export type ThreadContext = {
  currentThreadId: string;
  setCurrentThreadId: (id: string) => void;
  threadViewKey: number;
  bumpThreadViewKey: () => void;
  allThreads: Map<string, ThreadMessageLike[]>;
  setThreads: (
    updater: SetStateAction<Map<string, ThreadMessageLike[]>>,
  ) => void;
  allThreadsMetadata: Map<string, ThreadMetadata>;
  setThreadMetadata: (
    updater: SetStateAction<Map<string, ThreadMetadata>>,
  ) => void;
  threadCnt: number;
  setThreadCnt: (updater: SetStateAction<number>) => void;
  getThreadMessages: (threadId: string) => ThreadMessageLike[];
  setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => void;
  getThreadMetadata: (threadId: string) => ThreadMetadata | undefined;
  updateThreadMetadata: (
    threadId: string,
    updates: Partial<ThreadMetadata>,
  ) => void;
};

export type ThreadContextProviderProps = {
  children: ReactNode;
  initialThreadId?: string;
};

const ThreadContextState = createContext<ThreadContext | null>(null);

export function useThreadContext(): ThreadContext {
  const context = useContext(ThreadContextState);
  if (!context) {
    throw new Error(
      "useThreadContext must be used within ThreadContextProvider. " +
        "Wrap your app with <ThreadContextProvider>...</ThreadContextProvider>",
    );
  }
  return context;
}

export function ThreadContextProvider({
  children,
  initialThreadId,
}: ThreadContextProviderProps) {
  const storeRef = useRef<ThreadStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = new ThreadStore({ initialThreadId });
  }
  const store = storeRef.current;
  const value = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  return (
    <ThreadContextState.Provider value={value}>
      {children}
    </ThreadContextState.Provider>
  );
}

export function useCurrentThreadMessages(): ThreadMessageLike[] {
  const { currentThreadId, getThreadMessages } = useThreadContext();
  return useMemo(
    () => getThreadMessages(currentThreadId),
    [currentThreadId, getThreadMessages],
  );
}

export function useCurrentThreadMetadata(): ThreadMetadata | undefined {
  const { currentThreadId, getThreadMetadata } = useThreadContext();
  return useMemo(
    () => getThreadMetadata(currentThreadId),
    [currentThreadId, getThreadMetadata],
  );
}
