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
      walletKind: identity.walletKind ?? undefined,
      aaMode: identity.isConnected
        ? (identity.aaMode ?? "none")
        : null,
      chainId: identity.chainId ?? undefined,
      isConnected: identity.isConnected,
      svmAddress: identity.svmAddress ?? undefined,
      walletProvider: identity.isConnected
        ? (identity.walletProvider ?? null)
        : null,
      authMethod: identity.isConnected
        ? (identity.authMethod ?? null)
        : null,
      sponsored: identity.isConnected ? (identity.sponsored ?? null) : null,
      sponsorProvider: identity.isConnected
        ? (identity.sponsorProvider ?? null)
        : null,
      sponsorAccount: identity.isConnected
        ? (identity.sponsorAccount ?? null)
        : null,
    });
  }, [
    identity.aaMode,
    identity.address,
    identity.authMethod,
    identity.chainId,
    identity.isConnected,
    identity.walletKind,
    identity.sponsorAccount,
    identity.sponsorProvider,
    identity.sponsored,
    identity.svmAddress,
    identity.walletProvider,
    setUser,
  ]);

  return null;
}
