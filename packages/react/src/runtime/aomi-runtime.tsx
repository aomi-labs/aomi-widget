"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";

import { BackendApi } from "../backend/client";
import { EventContextProvider } from "../contexts/event-context";
import { NotificationContextProvider } from "../contexts/notification-context";
import {
  ThreadContextProvider,
  useThreadContext,
} from "../contexts/thread-context";
import { UserContextProvider } from "../contexts/user-context";
import { AomiRuntimeCore } from "./core";

// =============================================================================
// Props
// =============================================================================

export type AomiRuntimeProviderProps = {
  children: ReactNode;
  backendUrl?: string;
};

// =============================================================================
// Provider Shell
// =============================================================================

export function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
}: Readonly<AomiRuntimeProviderProps>) {
  const backendApi = useMemo(() => new BackendApi(backendUrl), [backendUrl]);

  return (
    <ThreadContextProvider>
      <NotificationContextProvider>
        <UserContextProvider>
          <AomiRuntimeInner backendApi={backendApi}>
            {children}
          </AomiRuntimeInner>
        </UserContextProvider>
      </NotificationContextProvider>
    </ThreadContextProvider>
  );
}

// =============================================================================
// Inner Provider (needs ThreadContext)
// =============================================================================

type AomiRuntimeInnerProps = {
  children: ReactNode;
  backendApi: BackendApi;
};

function AomiRuntimeInner({
  children,
  backendApi,
}: Readonly<AomiRuntimeInnerProps>) {
  const threadContext = useThreadContext();

  return (
    <EventContextProvider
      backendApi={backendApi}
      sessionId={threadContext.currentThreadId}
    >
      <AomiRuntimeCore backendApi={backendApi}>{children}</AomiRuntimeCore>
    </EventContextProvider>
  );
}
