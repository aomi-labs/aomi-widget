"use client";

import { useEffect, useMemo } from "react";
import { useAccount as useParaAccount, useModal } from "@getpara/react-sdk";
import {
  AOMI_AUTH_DISCONNECTED_ADAPTER,
  type AomiAuthAdapter,
  type AomiAuthIdentity,
  formatAddress,
} from "@aomi-labs/widget-lib";
import type {
  WalletEip712Payload,
  WalletTxPayload,
} from "@aomi-labs/react";
import {
  useAccount,
  useSendTransaction,
  useSignTypedData,
  useSwitchChain,
} from "wagmi";

type Props = {
  onAdapterChange: (adapter: AomiAuthAdapter) => void;
};

function formatAuthProvider(provider?: string): string | undefined {
  if (!provider) return undefined;

  const labelMap: Record<string, string> = {
    google: "Google",
    github: "GitHub",
    apple: "Apple",
    facebook: "Facebook",
    x: "X",
    discord: "Discord",
    farcaster: "Farcaster",
    telegram: "Telegram",
    email: "Email",
    phone: "Phone",
  };

  return labelMap[provider] ?? provider;
}

function inferAuthProvider(authMethods: unknown): string | undefined {
  if (!(authMethods instanceof Set) || authMethods.size === 0) return undefined;

  const allowed = [
    "google",
    "github",
    "apple",
    "facebook",
    "x",
    "discord",
    "farcaster",
    "telegram",
    "email",
    "phone",
  ];

  for (const method of authMethods) {
    if (typeof method !== "string") continue;
    const normalized = method.toLowerCase();
    if (allowed.includes(normalized)) return normalized;
  }

  const first = authMethods.values().next().value;
  return typeof first === "string" ? first.toLowerCase() : undefined;
}

function parseChainId(value: number | string | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (trimmed.startsWith("0x")) {
    const parsedHex = Number.parseInt(trimmed.slice(2), 16);
    return Number.isFinite(parsedHex) ? parsedHex : undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function useLandingAomiAuthIdentity(): AomiAuthIdentity {
  const paraAccount = useParaAccount();
  const { address: wagmiAddress, chainId, isConnected: wagmiConnected } = useAccount();

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
    const address = wagmiAddress ?? externalAddress ?? embeddedAddress ?? undefined;

    const authProvider = inferAuthProvider(paraAccount.embedded.authMethods);
    const providerLabel = formatAuthProvider(authProvider);
    const isConnected = Boolean(paraAccount.isConnected || wagmiConnected);

    if (isConnected && embeddedPrimary) {
      return {
        status: "social" as const,
        isConnected,
        address,
        chainId: chainId ?? undefined,
        authProvider,
        primaryLabel: embeddedPrimary,
        secondaryLabel: providerLabel,
      };
    }

    if (isConnected && address) {
      return {
        status: "wallet" as const,
        isConnected,
        address,
        chainId: chainId ?? undefined,
        authProvider,
        primaryLabel: formatAddress(address) ?? "Connected wallet",
      };
    }

    return {
      status: "disconnected" as const,
      isConnected: false,
      address: undefined,
      chainId: chainId ?? undefined,
      authProvider,
      primaryLabel: "Not connected",
      secondaryLabel: undefined,
    };
  }, [
    chainId,
    paraAccount.embedded,
    paraAccount.external,
    paraAccount.isConnected,
    wagmiAddress,
    wagmiConnected,
  ]);
}

export function LandingAomiAuthBridge({ onAdapterChange }: Props) {
  const { openModal } = useModal();
  const identity = useLandingAomiAuthIdentity();
  const { sendTransactionAsync } = useSendTransaction();
  const { signTypedDataAsync } = useSignTypedData();
  const { chainId: currentChainId } = useAccount();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

  const adapter = useMemo<AomiAuthAdapter>(() => {
    return {
      identity,
      isReady: true,
      isSwitchingChain,
      canConnect: true,
      canManageAccount: identity.isConnected,
      connect: async () => {
        openModal({ step: "AUTH_MAIN" });
      },
      manageAccount: async () => {
        openModal({ step: "ACCOUNT_MAIN" });
      },
      switchChain: switchChainAsync
        ? async (nextChainId: number) => {
            await switchChainAsync({ chainId: nextChainId });
          }
        : undefined,
      sendTransaction: sendTransactionAsync
        ? async (payload: WalletTxPayload) => {
            const value = payload.value ? BigInt(payload.value) : undefined;

            if (
              payload.chainId &&
              currentChainId &&
              payload.chainId !== currentChainId &&
              switchChainAsync
            ) {
              await switchChainAsync({ chainId: payload.chainId });
            }

            const txHash = await sendTransactionAsync({
              chainId: payload.chainId,
              to: payload.to as `0x${string}`,
              value,
              data:
                payload.data && payload.data !== "0x"
                  ? (payload.data as `0x${string}`)
                  : undefined,
            });

            return {
              txHash,
              amount: payload.value,
            };
          }
        : undefined,
      signTypedData: signTypedDataAsync
        ? async (payload: WalletEip712Payload) => {
            const typedData = payload.typed_data;

            if (!typedData) {
              throw new Error("Missing typed_data payload");
            }

            const requestChainId = parseChainId(typedData.domain?.chainId);
            if (
              requestChainId &&
              currentChainId &&
              requestChainId !== currentChainId &&
              switchChainAsync
            ) {
              await switchChainAsync({ chainId: requestChainId });
            }

            const signature = await signTypedDataAsync(typedData as never);
            return { signature };
          }
        : undefined,
    };
  }, [
    currentChainId,
    identity,
    isSwitchingChain,
    openModal,
    sendTransactionAsync,
    signTypedDataAsync,
    switchChainAsync,
  ]);

  useEffect(() => {
    onAdapterChange(adapter);

    return () => {
      onAdapterChange(AOMI_AUTH_DISCONNECTED_ADAPTER);
    };
  }, [adapter, onAdapterChange]);

  return null;
}
