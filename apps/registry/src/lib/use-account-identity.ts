"use client";

import { useAccount as useParaAccount } from "@getpara/react-sdk";
import { useAccount } from "wagmi";

export type AccountIdentityKind = "disconnected" | "social" | "wallet";

export type AccountIdentity = {
  kind: AccountIdentityKind;
  isConnected: boolean;
  address?: string;
  chainId?: number;
  authProvider?: string;
  primaryLabel: string;
  secondaryLabel?: string;
};

function formatAddress(address?: string): string | undefined {
  if (!address) return undefined;
  return `${address.slice(0, 5)}..${address.slice(-2)}`;
}

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

  const allowed = new Set([
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
  ]);

  for (const method of authMethods) {
    if (typeof method !== "string") continue;
    const normalized = method.toLowerCase();
    if (allowed.has(normalized)) return normalized;
  }

  const first = authMethods.values().next().value;
  return typeof first === "string" ? first.toLowerCase() : undefined;
}

export function useAccountIdentity(): AccountIdentity {
  const paraAccount = useParaAccount();
  const {
    address: wagmiAddress,
    chainId,
    isConnected: wagmiConnected,
  } = useAccount();

  const embeddedPrimary =
    paraAccount.embedded.email ??
    paraAccount.embedded.farcasterUsername ??
    paraAccount.embedded.telegramUserId ??
    undefined;

  const embeddedWallet = paraAccount.embedded.wallets?.[0] as
    | { address?: string }
    | undefined;
  const embeddedAddress = embeddedWallet?.address;
  const externalAddress = paraAccount.external.evm?.address;
  const address = wagmiAddress ?? externalAddress ?? embeddedAddress;

  const authProvider = inferAuthProvider(paraAccount.embedded.authMethods);
  const providerLabel = formatAuthProvider(authProvider);
  const isConnected = Boolean(paraAccount.isConnected || wagmiConnected);

  if (isConnected && embeddedPrimary) {
    return {
      kind: "social",
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
      kind: "wallet",
      isConnected,
      address,
      chainId: chainId ?? undefined,
      authProvider,
      primaryLabel: formatAddress(address) ?? "Connected wallet",
    };
  }

  return {
    kind: "disconnected",
    isConnected: false,
    address: undefined,
    chainId: chainId ?? undefined,
    authProvider,
    primaryLabel: "Not connected",
    secondaryLabel: undefined,
  };
}
