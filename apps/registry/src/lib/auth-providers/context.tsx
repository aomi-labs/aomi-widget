"use client";

import { createContext, useContext } from "react";
import type { AomiAuthAdapter } from "./types";
import { AOMI_AUTH_DISCONNECTED_IDENTITY } from "./types";

const NOOP_ADAPTER: AomiAuthAdapter = {
  identity: AOMI_AUTH_DISCONNECTED_IDENTITY,
  isReady: false,
  isSwitchingChain: false,
  canConnect: false,
  canManageAccount: false,
  connect: async () => {},
  manageAccount: async () => {},
};

export const AomiAuthAdapterContext =
  createContext<AomiAuthAdapter>(NOOP_ADAPTER);

export function useAomiAuthAdapter(): AomiAuthAdapter {
  return useContext(AomiAuthAdapterContext);
}
