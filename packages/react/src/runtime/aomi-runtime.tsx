"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";

import {
  AomiClient,
  type AomiClientOptions,
  type AomiPlatformFilter,
} from "@aomi-labs/client";
import { ControlContextProvider } from "../contexts/control-context";
import { EventContextProvider } from "../contexts/event-context";
import { NotificationContextProvider } from "../contexts/notification-context";
import {
  ThreadContextProvider,
  useThreadContext,
} from "../contexts/thread-context";
import { ExtUserProvider } from "../contexts/ext-user-context";
import { AomiRuntimeCore } from "./core";
import {
  buildThreadPersistenceKey,
  readPersistedThreadId,
} from "./thread-persistence";

// =============================================================================
// Props
// =============================================================================

export type AomiRuntimeProviderProps = {
  children: ReactNode;
  backendUrl?: string;
  applicationId?: number | string | null;
  appPlatforms?: AomiPlatformFilter;
  clientOptions?: Omit<AomiClientOptions, "baseUrl">;
  /** Optional explicit initial thread. Takes precedence over stored state. */
  initialThreadId?: string;
  /** Persist the active materialized thread in localStorage. Defaults to true. */
  persistThread?: boolean;
  /** Full localStorage key override for vendors that need exact isolation. */
  threadPersistenceKey?: string;
  /** Extra key segment for tenant/user/app scoping without owning the full key. */
  threadPersistenceScope?: string | null;
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

// =============================================================================
// Provider Shell
// =============================================================================

export function AomiRuntimeProvider({
  children,
  backendUrl = "http://127.0.0.1:8080",
  applicationId,
  appPlatforms,
  clientOptions,
  initialThreadId,
  persistThread = true,
  threadPersistenceKey,
  threadPersistenceScope,
}: Readonly<AomiRuntimeProviderProps>) {
  const normalizedBackendUrl = normalizeBackendUrl(backendUrl);
  const resolvedThreadPersistenceKey = useMemo(() => {
    if (!persistThread) return null;
    return (
      threadPersistenceKey ??
      buildThreadPersistenceKey({
        backendUrl: normalizedBackendUrl,
        applicationId,
        scope: threadPersistenceScope,
      })
    );
  }, [
    applicationId,
    normalizedBackendUrl,
    persistThread,
    threadPersistenceKey,
    threadPersistenceScope,
  ]);

  const restoredThreadId = useMemo(() => {
    if (initialThreadId) return initialThreadId;
    if (!resolvedThreadPersistenceKey) return undefined;
    return readPersistedThreadId(resolvedThreadPersistenceKey) ?? undefined;
  }, [initialThreadId, resolvedThreadPersistenceKey]);

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
        baseUrl: normalizedBackendUrl,
        ...resolvedClientOptions,
      }),
    [normalizedBackendUrl, resolvedClientOptions],
  );

  return (
    <ThreadContextProvider initialThreadId={restoredThreadId}>
      <NotificationContextProvider>
        <ExtUserProvider>
          <AomiRuntimeInner
            aomiClient={aomiClient}
            applicationId={applicationId}
            appPlatforms={appPlatforms}
            restoredThreadId={restoredThreadId}
            threadPersistenceKey={resolvedThreadPersistenceKey}
          >
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
  applicationId?: number | string | null;
  appPlatforms?: AomiPlatformFilter;
  restoredThreadId?: string;
  threadPersistenceKey?: string | null;
};

function AomiRuntimeInner({
  children,
  aomiClient,
  applicationId,
  appPlatforms,
  restoredThreadId,
  threadPersistenceKey,
}: Readonly<AomiRuntimeInnerProps>) {
  const threadContext = useThreadContext();

  return (
    <ControlContextProvider
      aomiClient={aomiClient}
      sessionId={threadContext.currentThreadId}
      getThreadMetadata={threadContext.getThreadMetadata}
      updateThreadMetadata={threadContext.updateThreadMetadata}
      appPlatforms={appPlatforms}
    >
      <EventContextProvider
        aomiClient={aomiClient}
        sessionId={threadContext.currentThreadId}
      >
        <AomiRuntimeCore
          aomiClient={aomiClient}
          applicationId={applicationId}
          restoredThreadId={restoredThreadId}
          threadPersistenceKey={threadPersistenceKey}
        >
          {children}
        </AomiRuntimeCore>
      </EventContextProvider>
    </ControlContextProvider>
  );
}
