"use client";

import { useEffect } from "react";
import { useUser } from "@aomi-labs/react";
import { useAomiAuthAdapter } from "../lib/aomi-auth-adapter";

/**
 * Keeps the Aomi runtime's user state in sync with the active Aomi auth adapter.
 *
 * This makes wallet identity flow through a single bridge instead of being
 * coupled to individual UI components like the connect button.
 */
export function AomiAuthSyncBridge() {
  const adapter = useAomiAuthAdapter();
  const { user, setUser } = useUser();
  const { address, chainId, isConnected } = adapter.identity;

  useEffect(() => {
    if (
      user.address === address &&
      user.chainId === chainId &&
      user.isConnected === isConnected
    ) {
      return;
    }

    setUser({
      address: address ?? undefined,
      chainId: chainId ?? undefined,
      isConnected,
    });
  }, [
    address,
    chainId,
    isConnected,
    setUser,
    user.address,
    user.chainId,
    user.isConnected,
  ]);

  return null;
}
