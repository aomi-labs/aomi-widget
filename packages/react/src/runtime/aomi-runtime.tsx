"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";

import {
  AomiClient,
  UserState,
  type AomiClientOptions,
} from "@aomi-labs/client";
import { ControlContextProvider } from "../contexts/control-context";
import { EventContextProvider } from "../contexts/event-context";
import { NotificationContextProvider } from "../contexts/notification-context";
import {
  ThreadContextProvider,
  useThreadContext,
} from "../contexts/thread-context";
import { ExtUserProvider, useUser } from "../contexts/ext-user-context";
import { AomiRuntimeCore } from "./core";

// =============================================================================
// Props
// =============================================================================

export type AomiRuntimeProviderProps = {
  children: ReactNode;
  backendUrl?: string;
  clientOptions?: Omit<AomiClientOptions, "baseUrl">;
};

function normalizeBackendUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {
    // Keep caller-provided strings unchanged if URL parsing fails.
  }
  return url;
}

function legacySessionPublicKey(user: ReturnType<typeof UserState.normalize>) {
  const address = UserState.address(user);
  return address?.startsWith("0x") ? address : undefined;
}

// =============================================================================
// Provider Shell
// =============================================================================

export function AomiRuntimeProvider({
  children,
  backendUrl = "http://127.0.0.1:8080",
  clientOptions,
}: Readonly<AomiRuntimeProviderProps>) {
  const resolvedClientOptions = useMemo(
    () => ({
      logger: {
        debug: (...args: unknown[]) => console.debug(...args),
      },
      ...clientOptions,
    }),
    [clientOptions],
  );

  const aomiClient = useMemo(
    () =>
      new AomiClient({
        baseUrl: normalizeBackendUrl(backendUrl),
        ...resolvedClientOptions,
      }),
    [backendUrl, resolvedClientOptions],
  );

  return (
    <ThreadContextProvider>
      <NotificationContextProvider>
        <ExtUserProvider>
          <AomiRuntimeInner aomiClient={aomiClient}>
            {children}
          </AomiRuntimeInner>
        </ExtUserProvider>
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
        UserState.isConnected(user) ? legacySessionPublicKey(user) : undefined
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
