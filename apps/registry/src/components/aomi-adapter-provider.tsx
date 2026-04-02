"use client";

import {
  Component,
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  WalletEip712Payload,
  WalletTxPayload,
} from "@aomi-labs/react";
import type { AccountIdentity } from "../lib/account-identity";

export type AomiAdapter = {
  identity: AccountIdentity;
  isReady: boolean;
  isSwitchingChain: boolean;
  canConnect: boolean;
  canManageAccount: boolean;
  connect: () => Promise<void>;
  manageAccount: () => Promise<void>;
  switchChain?: (chainId: number) => Promise<void>;
  sendTransaction?: (
    payload: WalletTxPayload,
  ) => Promise<{ txHash: string; amount?: string }>;
  signTypedData?: (
    payload: WalletEip712Payload,
  ) => Promise<{ signature: string }>;
};

type AomiAdapterProviderProps = {
  children: ReactNode;
  adapter?: AomiAdapter | null;
};

export const DISCONNECTED_ADAPTER: AomiAdapter = {
  identity: {
    kind: "disconnected",
    isConnected: false,
    address: undefined,
    chainId: undefined,
    authProvider: undefined,
    primaryLabel: "Not connected",
    secondaryLabel: undefined,
  },
  isReady: false,
  isSwitchingChain: false,
  canConnect: false,
  canManageAccount: false,
  connect: async () => undefined,
  manageAccount: async () => undefined,
};

export const AomiAdapterContext =
  createContext<AomiAdapter>(DISCONNECTED_ADAPTER);

const LazyParaProvider = lazy(() => import("./para-adapter-provider"));

function DisconnectedFallback({ children }: { children: ReactNode }) {
  return (
    <AomiAdapterContext.Provider value={DISCONNECTED_ADAPTER}>
      {children}
    </AomiAdapterContext.Provider>
  );
}

class ParaErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[AomiAdapterProvider] Para provider failed to load:", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function ClientOnlyParaProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <DisconnectedFallback>{children}</DisconnectedFallback>;
  }

  const fallback = <DisconnectedFallback>{children}</DisconnectedFallback>;

  return (
    <ParaErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <LazyParaProvider>{children}</LazyParaProvider>
      </Suspense>
    </ParaErrorBoundary>
  );
}

export function AomiAdapterProvider({
  children,
  adapter,
}: AomiAdapterProviderProps) {
  if (adapter) {
    return (
      <AomiAdapterContext.Provider value={adapter}>
        {children}
      </AomiAdapterContext.Provider>
    );
  }

  if (adapter === null) {
    return <DisconnectedFallback>{children}</DisconnectedFallback>;
  }

  return <ClientOnlyParaProvider>{children}</ClientOnlyParaProvider>;
}

export function useAomiAdapter(): AomiAdapter {
  return useContext(AomiAdapterContext);
}
