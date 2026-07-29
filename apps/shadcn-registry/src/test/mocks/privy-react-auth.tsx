import type { ReactNode } from "react";

export type PrivyClientConfig = {
  loginMethods?: string[];
};

/** Minimal stand-in for `ConnectedWallet` fields used by the widget logic.
 *  The real type lives in `@privy-io/react-auth`; only the runtime `useWallets`
 *  export needs mocking here, the type import is erased at compile time. */
export type ConnectedWallet = {
  type: "ethereum" | "solana";
  address: string;
  walletClientType: string;
  connectorType: string;
  imported: boolean;
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

export function useWallets() {
  return { wallets: [] as ConnectedWallet[], ready: false };
}

/** Used by the delegation ceremony in `providers/privy/privy-delegation.tsx`.
 *  Inert here: `usePrivy().ready` is false in this mock, so the ceremony never
 *  reaches the signer step. */
export function useSessionSigners() {
  return {
    addSessionSigners: async () => undefined,
    removeSessionSigners: async () => undefined,
  };
}

/** Also read by the delegation ceremony, to notice a dismissed sign-in. */
export function useModalStatus() {
  return { isOpen: false };
}
