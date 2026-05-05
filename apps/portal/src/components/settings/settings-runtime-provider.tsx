"use client";

import { useMemo, type ReactNode } from "react";
import {
  AomiClient,
  ControlContextProvider,
  ThreadContextProvider,
  UserState,
  UserContextProvider,
  useThreadContext,
  useUser,
} from "@aomi-labs/react";
import { getBackendUrl, getSettingsSessionId } from "@/lib/settings-api";

type SettingsRuntimeProviderProps = {
  children: ReactNode;
};

function SettingsRuntimeInner({
  children,
  aomiClient,
  sessionId,
}: Readonly<{
  children: ReactNode;
  aomiClient: AomiClient;
  sessionId: string;
}>) {
  const threadContext = useThreadContext();
  const { user } = useUser();

  return (
    <ControlContextProvider
      aomiClient={aomiClient}
      sessionId={sessionId}
      publicKey={UserState.address(user)}
      getThreadMetadata={threadContext.getThreadMetadata}
      updateThreadMetadata={threadContext.updateThreadMetadata}
    >
      {children}
    </ControlContextProvider>
  );
}

export function SettingsRuntimeProvider({
  children,
}: Readonly<SettingsRuntimeProviderProps>) {
  const backendUrl = getBackendUrl();
  const sessionId = getSettingsSessionId();
  const aomiClient = useMemo(() => new AomiClient({ baseUrl: backendUrl }), [backendUrl]);

  return (
    <ThreadContextProvider initialThreadId={sessionId}>
      <UserContextProvider>
        <SettingsRuntimeInner
          aomiClient={aomiClient}
          sessionId={sessionId}
        >
          {children}
        </SettingsRuntimeInner>
      </UserContextProvider>
    </ThreadContextProvider>
  );
}
