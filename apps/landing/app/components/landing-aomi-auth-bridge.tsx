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
  const { selectedWallet, updateSelectedWallet } = useWalletState();

  useEffect(() => {
    if (!paraStatus.isReady || !paraAccount.isConnected) return;
    void updateSelectedWallet();
  }, [
    paraAccount.isConnected,
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
      selectedWallet.address
      ?? externalAddress
      ?? embeddedAddress
      ?? undefined;
    const authProvider = inferAuthProvider(paraAccount.embedded.authMethods);
    const providerLabel = formatAuthProvider(authProvider);
    const chainId =
      parseChainId(
        (
          paraAccount as typeof paraAccount & {
            external?: { evm?: { chainId?: number | string } };
          }
        ).external?.evm?.chainId,
      )
      ?? undefined;
    const isConnected = Boolean(paraAccount.isConnected);

    if (!paraStatus.isReady || paraAccount.isLoading) {
      return {
        identity: {
          ...AOMI_AUTH_BOOTING_ADAPTER.identity,
          chainId,
        },
        isReady: false,
      };
    }

    if (isConnected && embeddedPrimary) {
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
    paraAccount,
    paraStatus.isReady,
    selectedWallet.address,
  ]);
}

export function LandingAomiAuthBridge({ onAdapterChange }: Props) {
  const { openModal } = useModal();
  const { logoutAsync } = useLogout();
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
        await logoutAsync();
      },
      manageAccount: async () => {
        openModal({ step: "ACCOUNT_MAIN" });
      },
    };
  }, [
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
