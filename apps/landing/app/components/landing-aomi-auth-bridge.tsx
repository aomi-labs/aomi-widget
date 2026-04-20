"use client";

import { useEffect, useMemo } from "react";
import {
  useAccount as useParaAccount,
  useLogout,
  useModal,
  useParaStatus,
  useWalletState,
} from "@getpara/react-sdk";
import {
  AOMI_AUTH_BOOTING_ADAPTER,
  AOMI_AUTH_DISCONNECTED_ADAPTER,
  type AomiAuthAdapter,
  type AomiAuthIdentity,
  formatAuthProvider,
  formatAddress,
  inferAuthProvider,
} from "@aomi-labs/widget-lib";
import { useAccount as useWagmiAccount, useDisconnect } from "wagmi";

type Props = {
  onAdapterChange: (adapter: AomiAuthAdapter) => void;
};

function parseChainId(value: number | string | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("0x")) {
    const parsedHex = Number.parseInt(trimmed.slice(2), 16);
    return Number.isFinite(parsedHex) ? parsedHex : undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function useLandingAomiAuthState(): {
  identity: AomiAuthIdentity;
  isReady: boolean;
} {
  const paraStatus = useParaStatus();
  const paraAccount = useParaAccount();
  const {
    address: wagmiAddress,
    chainId: wagmiChainId,
    isConnected: wagmiConnected,
  } = useWagmiAccount();
  const { selectedWallet, updateSelectedWallet } = useWalletState();
  const isConnected = Boolean(paraAccount.isConnected || wagmiConnected);
  const isBooting =
    !paraStatus.isReady
    || (paraAccount.isLoading && !isConnected);

  useEffect(() => {
    if (!paraStatus.isReady || !isConnected) return;
    void updateSelectedWallet();
  }, [
    isConnected,
    paraStatus.isReady,
    updateSelectedWallet,
  ]);

  return useMemo(() => {
    const embeddedPrimary =
      paraAccount.embedded.email
      ?? paraAccount.embedded.farcasterUsername
      ?? paraAccount.embedded.telegramUserId
      ?? undefined;
    const embeddedWallet = paraAccount.embedded.wallets?.[0] as
      | { address?: string }
      | undefined;
    const embeddedAddress = embeddedWallet?.address;
    const externalAddress = paraAccount.external.evm?.address;
    const address =
      wagmiAddress
      ?? selectedWallet.address
      ?? externalAddress
      ?? embeddedAddress
      ?? undefined;
    const authProvider = inferAuthProvider(paraAccount.embedded.authMethods);
    const providerLabel = formatAuthProvider(authProvider);
    const chainId =
      wagmiChainId
      ?? parseChainId(
        (
          paraAccount as typeof paraAccount & {
            external?: { evm?: { chainId?: number | string } };
          }
        ).external?.evm?.chainId,
      )
      ?? undefined;

    if (isBooting) {
      return {
        identity: {
          ...AOMI_AUTH_BOOTING_ADAPTER.identity,
          chainId,
        },
        isReady: false,
      };
    }

    if (paraAccount.isConnected && embeddedPrimary) {
      return {
        identity: {
          status: "connected",
          isConnected: true,
          address,
          chainId,
          authProvider,
          primaryLabel: embeddedPrimary,
          secondaryLabel: providerLabel,
        },
        isReady: true,
      };
    }

    if (isConnected && address) {
      return {
        identity: {
          status: "connected",
          isConnected: true,
          address,
          chainId,
          authProvider,
          primaryLabel: formatAddress(address) ?? "Connected wallet",
          secondaryLabel: undefined,
        },
        isReady: true,
      };
    }

    return {
      identity: {
        ...AOMI_AUTH_DISCONNECTED_ADAPTER.identity,
        chainId,
        authProvider,
      },
      isReady: true,
    };
  }, [
    isBooting,
    isConnected,
    paraAccount,
    selectedWallet.address,
    wagmiAddress,
    wagmiChainId,
  ]);
}

export function LandingAomiAuthBridge({ onAdapterChange }: Props) {
  const { openModal } = useModal();
  const { logoutAsync } = useLogout();
  const { disconnectAsync: disconnectWalletAsync } = useDisconnect();
  const { identity, isReady } = useLandingAomiAuthState();

  const adapter = useMemo<AomiAuthAdapter>(() => {
    return {
      identity,
      isReady,
      isSwitchingChain: false,
      canConnect: isReady && !identity.isConnected,
      canManageAccount: identity.isConnected,
      connect: async () => {
        if (!isReady) return;
        openModal({ step: "AUTH_MAIN" });
      },
      disconnect: async () => {
        const results = await Promise.allSettled([
          logoutAsync(),
          disconnectWalletAsync(),
        ]);
        const rejectedResults = results.filter(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected",
        );

        if (rejectedResults.length === results.length) {
          throw rejectedResults[0]?.reason;
        }
      },
      manageAccount: async () => {
        openModal({ step: "ACCOUNT_MAIN" });
      },
    };
  }, [
    disconnectWalletAsync,
    identity,
    isReady,
    logoutAsync,
    openModal,
  ]);

  useEffect(() => {
    onAdapterChange(adapter);
  }, [adapter, onAdapterChange]);

  return null;
}
