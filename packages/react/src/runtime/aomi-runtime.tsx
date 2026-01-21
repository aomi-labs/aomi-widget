"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";

import { BackendApi } from "../backend/client";
import { EventContextProvider } from "../contexts/event-context";
import { NotificationContextProvider } from "../contexts/notification-context";
import { RuntimeActionsProvider } from "../contexts/runtime-actions";
import { useThreadContext } from "../contexts/thread-context";
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
  const threadContext = useThreadContext();

  const backendApi = useMemo(() => new BackendApi(backendUrl), [backendUrl]);

  return (
    <NotificationContextProvider>
      <UserContextProvider>
        <EventContextProvider
          backendApi={backendApi}
          sessionId={threadContext.currentThreadId}
        >
          <RuntimeActionsProvider value={{}}>
            <AomiRuntimeCore backendApi={backendApi}>
              {children}
            </AomiRuntimeCore>
          </RuntimeActionsProvider>
        </EventContextProvider>
      </UserContextProvider>
    </NotificationContextProvider>
  );
}
