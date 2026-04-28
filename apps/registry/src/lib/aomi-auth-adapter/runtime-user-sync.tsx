"use client";

import { useEffect } from "react";
import { useUser } from "@aomi-labs/react";
import { useAomiAuthAdapter } from "./context";

export function AomiAuthRuntimeUserSync() {
  const adapter = useAomiAuthAdapter();
  const { setUser } = useUser();
  const identity = adapter.identity;

  useEffect(() => {
    setUser({
      address: identity.address ?? undefined,
      chainId: identity.chainId ?? undefined,
      isConnected: identity.isConnected,
    });
  }, [identity.address, identity.chainId, identity.isConnected, setUser]);

  return null;
}
