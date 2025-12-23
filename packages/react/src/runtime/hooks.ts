import { createContext, useContext, type ReactNode } from "react";

type RuntimeActions = {
  sendSystemMessage: (message: string) => Promise<void>;
};

const RuntimeActionsContext = createContext<RuntimeActions | undefined>(undefined);

export function RuntimeActionsProvider({
  children,
  value,
}: Readonly<{
  children: ReactNode;
  value: RuntimeActions;
}>) {
  return <RuntimeActionsContext.Provider value={value}>{children}</RuntimeActionsContext.Provider>;
}

export function useRuntimeActions(): RuntimeActions {
  const context = useContext(RuntimeActionsContext);
  if (!context) {
    throw new Error("useRuntimeActions must be used within AomiRuntimeProvider");
  }
  return context;
}
