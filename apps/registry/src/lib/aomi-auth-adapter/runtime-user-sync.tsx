"use client";

import { useEffect } from "react";
import { useUser } from "@aomi-labs/react";
import { useAomiAuthAdapter } from "./context";
import { formatAuthProvider } from "./identity";

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
  const { setUser, addExtValue, removeExtValue } = useUser();
  const identity = adapter.identity;
  const providerLabel =
    identity.secondaryLabel ?? formatAuthProvider(identity.authProvider);

  useEffect(() => {
    setUser({
      address: identity.address ?? undefined,
      chainId: identity.chainId ?? undefined,
      isConnected: identity.isConnected,
      svmAddress: identity.svmAddress ?? undefined,
      // Pass `null` (not undefined) when the connected wallet isn't a
      // smart account, so switching from a smart-account provider
      // (Base Account) to an EOA provider (Para) clears the stale flag
      // instead of being pruned as a no-op.
      aaMode: identity.isConnected ? (identity.aaMode ?? null) : null,
      smartAccount: identity.isConnected
        ? (identity.smartAccount ?? null)
        : null,
    });
  }, [
    identity.aaMode,
    identity.address,
    identity.chainId,
    identity.isConnected,
    identity.smartAccount,
    identity.svmAddress,
    setUser,
  ]);

  useEffect(() => {
    if (identity.isConnected && identity.authProvider) {
      addExtValue("wallet_provider", identity.authProvider);
    } else {
      removeExtValue("wallet_provider");
    }

    if (identity.isConnected && providerLabel) {
      addExtValue("wallet_provider_label", providerLabel);
    } else {
      removeExtValue("wallet_provider_label");
    }
  }, [
    addExtValue,
    identity.authProvider,
    identity.isConnected,
    providerLabel,
    removeExtValue,
  ]);

  return null;
}
