"use client";

import { useEffect } from "react";
import { useUser } from "@aomi-labs/react";
import { useAomiAuthAdapter } from "../lib/aomi-auth-adapter";

export function AuthStateSync() {
  const adapter = useAomiAuthAdapter();
  const { setUser } = useUser();
  const { address, chainId, isConnected } = adapter.identity;

  useEffect(() => {
    setUser({
      address: address ?? undefined,
      chainId: chainId ?? undefined,
      isConnected,
    });
  }, [address, chainId, isConnected, setUser]);

  return null;
}
