"use client";

import { useMemo, type ReactNode } from "react";
import {
  AomiClient,
  ControlContextProvider,
  ThreadContextProvider,
  ExtUserProvider,
  useThreadContext,
} from "@aomi-labs/react";
import { getBackendUrl, getSettingsSessionId } from "@portal/lib/settings-api";

type SettingsRuntimeProviderProps = {
  children: ReactNode;
};

function SettingsRuntimeInner({
  children,
  aomiClient,
  sessionId,
}: {
  children: ReactNode;
  aomiClient: AomiClient;
  sessionId: string;
}) {
  const threadContext = useThreadContext();

  return (
    <ControlContextProvider
      aomiClient={aomiClient}
      sessionId={sessionId}
      getThreadMetadata={threadContext.getThreadMetadata}
      updateThreadMetadata={threadContext.updateThreadMetadata}
    >
      {children}
    </ControlContextProvider>
  );
}

export function SettingsRuntimeProvider({
  children,
}: SettingsRuntimeProviderProps) {
  const sessionId = getSettingsSessionId();
  const aomiClient = useMemo(
    () => new AomiClient({ baseUrl: getBackendUrl() }),
    [],
  );

  return (
    <ThreadContextProvider initialThreadId={sessionId}>
      <ExtUserProvider>
        <SettingsRuntimeInner aomiClient={aomiClient} sessionId={sessionId}>
          {children}
        </SettingsRuntimeInner>
      </ExtUserProvider>
    </ThreadContextProvider>
  );
}
