"use client";

import { createContext, useContext } from "react";

export type RuntimeActions = {
  // Todo
  sendSystemCommand: (command: any) => Promise<void>;
};

const RuntimeActionsContext = createContext<RuntimeActions | undefined>(undefined);

export const RuntimeActionsProvider = RuntimeActionsContext.Provider;

export function useRuntimeActions(): RuntimeActions {
  const context = useContext(RuntimeActionsContext);
  if (!context) {
    throw new Error("useRuntimeActions must be used within AomiRuntimeProvider");
  }
  return context;
}
