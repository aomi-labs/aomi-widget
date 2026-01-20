"use client";

import { createContext, useContext } from "react";

/**
 * RuntimeActions is now mostly deprecated.
 * Use useEventContext() for event-based communication instead:
 * - enqueueOutbound() to send events to backend
 * - subscribe() to listen for events
 */
export type RuntimeActions = Record<string, never>;

const RuntimeActionsContext = createContext<RuntimeActions | undefined>(undefined);

export const RuntimeActionsProvider = RuntimeActionsContext.Provider;

export function useRuntimeActions(): RuntimeActions {
  const context = useContext(RuntimeActionsContext);
  if (!context) {
    throw new Error("useRuntimeActions must be used within AomiRuntimeProvider");
  }
  return context;
}
