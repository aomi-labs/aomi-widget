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
    // NOTE: aaMode / SmartAccount4337 / Delegation7702 are NOT forwarded
    // here. They are session-owned: `session.ts` writes them on tx-complete
    // and providers read them back via `useUser()`. Forwarding them from
    // identity would create a write loop (UserState → identity → setUser
    // → UserState). walletKind is provider-static and forwarded normally.
    setUser({
      address: identity.address ?? undefined,
      walletKind: identity.walletKind ?? undefined,
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
