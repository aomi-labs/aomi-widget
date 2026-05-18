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
      connection: {
        is_connected: identity.isConnected,
        primary_family:
          identity.address && identity.svmAddress
            ? "dual"
            : identity.address
              ? "evm"
              : identity.svmAddress
                ? "solana"
                : null,
        provider: identity.authProvider ?? undefined,
        provider_label: providerLabel ?? undefined,
      },
      evm: {
        address: identity.address ?? undefined,
        chain_id: identity.chainId ?? undefined,
        aa: {
          mode: identity.isConnected ? (identity.aaMode ?? null) : null,
          smart_account: identity.isConnected
            ? (identity.smartAccount ?? null)
            : null,
        },
      },
      solana: {
        address: identity.svmAddress ?? undefined,
        cluster: identity.solanaCluster ?? undefined,
        wallet_name: identity.solanaWalletName ?? undefined,
        transport: identity.solanaTransport ?? undefined,
        capabilities: identity.solanaCapabilities
          ? {
              can_sign_message:
                identity.solanaCapabilities.canSignMessage ?? undefined,
              can_sign_transaction:
                identity.solanaCapabilities.canSignTransaction ?? undefined,
              can_sign_all_transactions:
                identity.solanaCapabilities.canSignAllTransactions ?? undefined,
              can_send_transaction:
                identity.solanaCapabilities.canSendTransaction ?? undefined,
              can_sign_and_send_transaction:
                identity.solanaCapabilities.canSignAndSendTransaction ??
                undefined,
            }
          : undefined,
      },
    });
  }, [
    identity.aaMode,
    identity.address,
    identity.chainId,
    identity.isConnected,
    identity.solanaCapabilities,
    identity.solanaCluster,
    identity.solanaTransport,
    identity.solanaWalletName,
    identity.smartAccount,
    identity.svmAddress,
    providerLabel,
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
