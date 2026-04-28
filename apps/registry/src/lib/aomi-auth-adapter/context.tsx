"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  AOMI_AUTH_DISCONNECTED_IDENTITY,
} from "./identity";
import type { AomiAuthAdapter } from "./types";

const DISCONNECTED_ADAPTER: AomiAuthAdapter = {
  identity: AOMI_AUTH_DISCONNECTED_IDENTITY,
  isReady: true,
  isSwitchingChain: false,
  canConnect: false,
  canManageAccount: false,
  connect: async () => undefined,
  manageAccount: async () => undefined,
};

const AomiAuthAdapterContext =
  createContext<AomiAuthAdapter>(DISCONNECTED_ADAPTER);

export function AomiAuthAdapterProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AomiAuthAdapter;
}) {
  return (
    <AomiAuthAdapterContext.Provider value={value}>
      {children}
    </AomiAuthAdapterContext.Provider>
  );
}

export function useAomiAuthAdapter(): AomiAuthAdapter {
  return useContext(AomiAuthAdapterContext);
}
