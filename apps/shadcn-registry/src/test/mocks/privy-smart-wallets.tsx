import type { ReactNode } from "react";

export function SmartWalletsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useSmartWallets() {
  return {
    client: undefined,
    getClientForChain: async () => undefined,
  };
}
