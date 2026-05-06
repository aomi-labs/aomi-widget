"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";

import { AomiClient, UserState, type AomiClientOptions } from "@aomi-labs/client";
import { ControlContextProvider } from "../contexts/control-context";
import { EventContextProvider } from "../contexts/event-context";
import { NotificationContextProvider } from "../contexts/notification-context";
import {
  ThreadContextProvider,
  useThreadContext,
} from "../contexts/thread-context";
import { UserContextProvider, useUser } from "../contexts/user-context";
import { AomiRuntimeCore } from "./core";

// =============================================================================
// Props
// =============================================================================

export type AomiRuntimeProviderProps = {
  children: ReactNode;
  backendUrl?: string;
  clientOptions?: Omit<AomiClientOptions, "baseUrl">;
};

// =============================================================================
// Provider Shell
// =============================================================================

export function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  clientOptions,
}: Readonly<AomiRuntimeProviderProps>) {
  const aomiClient = useMemo(
    () => new AomiClient({ baseUrl: backendUrl, ...clientOptions }),
    [backendUrl, clientOptions],
  );

  return (
    <ThreadContextProvider>
      <NotificationContextProvider>
        <UserContextProvider>
          <AomiRuntimeInner aomiClient={aomiClient}>
            {children}
          </AomiRuntimeInner>
        </UserContextProvider>
      </NotificationContextProvider>
    </ThreadContextProvider>
  );
}

// =============================================================================
// Inner Provider (needs ThreadContext and UserContext)
// =============================================================================

type AomiRuntimeInnerProps = {
  children: ReactNode;
  aomiClient: AomiClient;
};

function AomiRuntimeInner({
  children,
  aomiClient,
}: Readonly<AomiRuntimeInnerProps>) {
  const threadContext = useThreadContext();
  const { user } = useUser();

  return (
    <ControlContextProvider
      aomiClient={aomiClient}
      sessionId={threadContext.currentThreadId}
      publicKey={
        UserState.isConnected(user) ? (UserState.address(user) ?? undefined) : undefined
      }
      getThreadMetadata={threadContext.getThreadMetadata}
      updateThreadMetadata={threadContext.updateThreadMetadata}
    >
      <EventContextProvider
        aomiClient={aomiClient}
        sessionId={threadContext.currentThreadId}
      >
        <AomiRuntimeCore aomiClient={aomiClient}>{children}</AomiRuntimeCore>
      </EventContextProvider>
    </ControlContextProvider>
  );
}
