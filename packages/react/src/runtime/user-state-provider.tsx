"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { UserState } from "@aomi-labs/client";

import { SessionManager } from "./session-manager";

type RuntimeUserStateProviderProps = {
  children: ReactNode;
  sessionManager: SessionManager;
  getUserState: () => UserState;
  onUserStateChange: (callback: (user: UserState) => void) => () => void;
};

function stableStateString(state: UserState): string {
  return JSON.stringify(state ?? {});
}

export function RuntimeUserStateProvider({
  children,
  sessionManager,
  getUserState,
  onUserStateChange,
}: RuntimeUserStateProviderProps) {
  const lastSerializedStateRef = useRef<string>("");

  useEffect(() => {
    const applyToSessions = (next: UserState) => {
      const serialized = stableStateString(next);
      if (serialized === lastSerializedStateRef.current) {
        return;
      }
      lastSerializedStateRef.current = serialized;
      sessionManager.forEach((session) => {
        session.resolveUserState(next);
      });
    };

    applyToSessions(getUserState());
    const unsubscribe = onUserStateChange((next) => {
      applyToSessions(next);
    });
    return unsubscribe;
  }, [getUserState, onUserStateChange, sessionManager]);

  return <>{children}</>;
}
