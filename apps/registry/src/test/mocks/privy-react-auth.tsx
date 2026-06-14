import type { ReactNode } from "react";

export type PrivyClientConfig = {
  loginMethods?: string[];
};

export function PrivyProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function usePrivy() {
  return {
    ready: false,
    authenticated: false,
    user: null,
    login: async () => undefined,
    logout: async () => undefined,
    getAccessToken: async () => null,
  };
}
