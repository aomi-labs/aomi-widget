"use client";

import { useEffect } from "react";
import { useUser } from "@aomi-labs/react";
import { useAomiAuthAdapter } from "./context";

/**
 * Bridge that pushes the active auth adapter's identity into the
 * SDK-level `useUser()` state every time it changes. The SDK's
 * `UserState` carries `svmAddress` independently of the EVM `address`,
 * so a multi-chain provider (e.g. Para with both EVM and Solana
 * connectors) can populate both — the backend's call envelope reads
 * each from its respective `domain.evm.address` / `domain.svm.address`
 * attribute.
 */
export function AomiAuthRuntimeUserSync() {
  const adapter = useAomiAuthAdapter();
  const { setUser } = useUser();
  const identity = adapter.identity;

  useEffect(() => {
    setUser({
      address: identity.address ?? undefined,
      chainId: identity.chainId ?? undefined,
      isConnected: identity.isConnected,
      svmAddress: identity.svmAddress ?? undefined,
    });
  }, [
    identity.address,
    identity.chainId,
    identity.isConnected,
    identity.svmAddress,
    setUser,
  ]);

  return null;
}
