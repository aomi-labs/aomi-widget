"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AomiAuthAdapterProvider, useAomiAuthAdapter } from "./context";
import { AOMI_AUTH_DISCONNECTED_IDENTITY } from "./identity";
import type { AomiAuthAdapter } from "./types";

/**
 * Multi-wallet router. Lets a host app mount several `AomiAuthAdapter`
 * providers (Para, Base Account, etc.) as parallel sub-trees and expose
 * whichever one the user has selected through the standard
 * `AomiAuthAdapterContext`.
 *
 * Structure (host side):
 *
 *   <WalletAdapterRouter>
 *     <AomiParaProvider {...}>          // its own context sub-tree
 *       <CaptureWalletAdapter id="para" />
 *     </AomiParaProvider>
 *     <AomiBaseAccountProvider {...}>   // its own context sub-tree
 *       <CaptureWalletAdapter id="base-account" />
 *     </AomiBaseAccountProvider>
 *     <RouterAuthAdapterBridge>         // exposes active adapter downstream
 *       {children}
 *     </RouterAuthAdapterBridge>
 *   </WalletAdapterRouter>
 */

const DISCONNECTED_ADAPTER: AomiAuthAdapter = {
  identity: AOMI_AUTH_DISCONNECTED_IDENTITY,
  isReady: true,
  isSwitchingChain: false,
  canConnect: false,
  canOpenAccountUI: false,
  canDisconnect: false,
  connect: async () => undefined,
};

export type WalletAdapterRouterValue = {
  /** Stable map of registered adapters keyed by provider id. */
  adapters: Map<string, AomiAuthAdapter>;
  /** Currently-active provider id. `null` until a user selects one. */
  activeId: string | null;
  /** Explicitly set the active provider id. */
  setActiveId: (id: string | null) => void;
  /** Get a registered adapter by id, or `undefined`. */
  getAdapter: (id: string) => AomiAuthAdapter | undefined;
  /** Register / replace an adapter under the given id. */
  registerAdapter: (id: string, adapter: AomiAuthAdapter) => void;
  /** Remove an adapter (e.g. on capture unmount). */
  unregisterAdapter: (id: string) => void;
};

const WalletAdapterRouterContext =
  createContext<WalletAdapterRouterValue | null>(null);

export type WalletAdapterRouterProps = {
  children: ReactNode;
  /** Initial active provider id. */
  defaultActiveId?: string;
};

export function WalletAdapterRouter({
  children,
  defaultActiveId,
}: WalletAdapterRouterProps) {
  const [adapters, setAdapters] = useState<Map<string, AomiAuthAdapter>>(
    () => new Map(),
  );
  const [activeId, setActiveIdState] = useState<string | null>(
    defaultActiveId ?? null,
  );

  const registerAdapter = useCallback(
    (id: string, adapter: AomiAuthAdapter) => {
      setAdapters((prev) => {
        if (prev.get(id) === adapter) return prev;
        const next = new Map(prev);
        next.set(id, adapter);
        return next;
      });
    },
    [],
  );

  const unregisterAdapter = useCallback((id: string) => {
    setAdapters((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const getAdapter = useCallback(
    (id: string) => adapters.get(id),
    [adapters],
  );

  const setActiveId = useCallback((id: string | null) => {
    setActiveIdState(id);
  }, []);

  // Auto-elect: if no active id is set (or the active one isn't registered),
  // prefer the first connected adapter so the widget reflects reality.
  useEffect(() => {
    const activeAdapter = activeId ? adapters.get(activeId) : undefined;
    if (activeAdapter?.identity.isConnected) return;

    for (const [id, adapter] of adapters) {
      if (adapter.identity.isConnected && id !== activeId) {
        setActiveIdState(id);
        return;
      }
    }
  }, [activeId, adapters]);

  const value = useMemo<WalletAdapterRouterValue>(
    () => ({
      adapters,
      activeId,
      setActiveId,
      getAdapter,
      registerAdapter,
      unregisterAdapter,
    }),
    [
      adapters,
      activeId,
      setActiveId,
      getAdapter,
      registerAdapter,
      unregisterAdapter,
    ],
  );

  return (
    <WalletAdapterRouterContext.Provider value={value}>
      {children}
    </WalletAdapterRouterContext.Provider>
  );
}

export function useWalletAdapterRouter(): WalletAdapterRouterValue | null {
  return useContext(WalletAdapterRouterContext);
}

/**
 * Captures the nearest `AomiAuthAdapter` (provided by Para / Base / etc.)
 * and registers it in the surrounding router under the given id.
 * Renders nothing.
 */
export function CaptureWalletAdapter({ id }: { id: string }) {
  const adapter = useAomiAuthAdapter();
  const router = useWalletAdapterRouter();
  const lastAdapterRef = useRef<AomiAuthAdapter | null>(null);

  useEffect(() => {
    if (!router) return;
    if (lastAdapterRef.current === adapter) return;
    lastAdapterRef.current = adapter;
    router.registerAdapter(id, adapter);
  }, [id, adapter, router]);

  useEffect(() => {
    if (!router) return;
    return () => {
      router.unregisterAdapter(id);
      lastAdapterRef.current = null;
    };
  }, [id, router]);

  return null;
}

/**
 * Re-publishes the router's active adapter through the standard
 * `AomiAuthAdapterContext`, so the rest of the widget (the chat runtime,
 * tx handler, control bar, etc.) keeps using `useAomiAuthAdapter()`
 * unchanged.
 */
export function RouterAuthAdapterBridge({ children }: { children: ReactNode }) {
  const router = useWalletAdapterRouter();
  if (!router) return <>{children}</>;

  const active =
    (router.activeId ? router.adapters.get(router.activeId) : undefined) ??
    pickConnected(router.adapters) ??
    pickFirst(router.adapters) ??
    DISCONNECTED_ADAPTER;

  return (
    <AomiAuthAdapterProvider value={active}>
      {children}
    </AomiAuthAdapterProvider>
  );
}

function pickConnected(
  adapters: Map<string, AomiAuthAdapter>,
): AomiAuthAdapter | undefined {
  for (const adapter of adapters.values()) {
    if (adapter.identity.isConnected) return adapter;
  }
  return undefined;
}

function pickFirst(
  adapters: Map<string, AomiAuthAdapter>,
): AomiAuthAdapter | undefined {
  for (const adapter of adapters.values()) {
    return adapter;
  }
  return undefined;
}
