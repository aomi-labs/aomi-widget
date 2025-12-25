"use client";

import { createContext, useContext, useMemo, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";

import type { ThreadMetadata } from "./types";
import { ThreadStore, type ThreadContext } from "./thread-store";

export type ThreadContextProviderProps = {
  children: ReactNode;
  initialThreadId?: string;
};

const ThreadContextState = createContext<ThreadContext | null>(null);

export function useThreadContext(): ThreadContext {
  // Initialization: 
  // ThreadContextProvider      // new ThreadStore({ initialThreadId }) 
  //  -> ThreadStore            // this.createSnapshot();
  //  -> ThreadContext

  // useContext only peek into the in-DOM context after construction
  const context = useContext(ThreadContextState);
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
  // Alloc the ThreadStore state
  const storeRef = useRef<ThreadStore | null>(null);
  if (!storeRef.current) {
    // Init 
    storeRef.current = new ThreadStore({ initialThreadId });
  }
  // Get the ThreadStore state from useRef smart pointer
  const store = storeRef.current;

  // React 18+ hook for wiring an external store to React’s render cycle
  // store.subscribe tells React ThreadStore has changed
  // store.getSnapshot returns the current ThreadStore state
  // value is whatever store.getSnapshot() returns, before that React re-renders the component to sync data
  const value = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return (
    // Feed the sync value of ThreadStore to child components
    <ThreadContextState.Provider value={value}>{children}</ThreadContextState.Provider>
  );
}

export function useCurrentThreadMessages(): ThreadMessageLike[] {
  const { currentThreadId, getThreadMessages } = useThreadContext();
  return useMemo(() => getThreadMessages(currentThreadId), [currentThreadId, getThreadMessages]);
}

export function useCurrentThreadMetadata(): ThreadMetadata | undefined {
  const { currentThreadId, getThreadMetadata } = useThreadContext();
  return useMemo(() => getThreadMetadata(currentThreadId), [currentThreadId, getThreadMetadata]);
}
