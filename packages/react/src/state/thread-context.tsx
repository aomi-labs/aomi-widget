"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";

import type { ThreadMetadata } from "./types";
import { ThreadStore, type ThreadContextValue } from "./thread-store";

export type { ThreadContextValue };

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
  const storeRef = useRef<ThreadStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = new ThreadStore({ initialThreadId });
  }
  const store = storeRef.current;
  const value = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>;
}

export function useCurrentThreadMessages(): ThreadMessageLike[] {
  const { currentThreadId, getThreadMessages } = useThreadContext();
  return useMemo(() => getThreadMessages(currentThreadId), [currentThreadId, getThreadMessages]);
}

export function useCurrentThreadMetadata(): ThreadMetadata | undefined {
  const { currentThreadId, getThreadMetadata } = useThreadContext();
  return useMemo(() => getThreadMetadata(currentThreadId), [currentThreadId, getThreadMetadata]);
}
