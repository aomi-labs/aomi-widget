"use client";

import type { AomiAuthIdentity, AomiAuthMethod, AomiWalletProvider } from "./types";

export const AOMI_AUTH_DISCONNECTED_IDENTITY: AomiAuthIdentity = {
  status: "disconnected",
  isConnected: false,
  address: undefined,
  walletKind: undefined,
  aaMode: undefined,
  SmartAccount4337: undefined,
  Delegation7702: undefined,
  sponsored: undefined,
  sponsorProvider: undefined,
  sponsorAccount: undefined,
  chainId: undefined,
  svmAddress: undefined,
  walletProvider: undefined,
  authMethod: undefined,
};

export const AOMI_AUTH_BOOTING_IDENTITY: AomiAuthIdentity = {
  status: "booting",
  isConnected: false,
  address: undefined,
  walletKind: undefined,
  aaMode: undefined,
  SmartAccount4337: undefined,
  Delegation7702: undefined,
  sponsored: undefined,
  sponsorProvider: undefined,
  sponsorAccount: undefined,
  chainId: undefined,
  svmAddress: undefined,
  walletProvider: undefined,
  authMethod: undefined,
};

export function formatAddress(address?: string): string | undefined {
  if (!address) return undefined;
  return `${address.slice(0, 5)}..${address.slice(-2)}`;
}

export function formatWalletProvider(
  provider?: AomiWalletProvider,
): string | undefined {
  if (!provider) return undefined;
  const labelMap: Record<AomiWalletProvider, string> = {
    para: "Para",
    baseAccount: "Base Account",
  };
  return labelMap[provider];
}

export function formatAuthMethod(method?: AomiAuthMethod): string | undefined {
  if (!method) return undefined;
  const labelMap: Record<AomiAuthMethod, string> = {
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
    wagmi: "External Wallet",
  };
  return labelMap[method];
}

const OAUTH_METHODS: ReadonlySet<AomiAuthMethod> = new Set<AomiAuthMethod>([
  "google",
  "apple",
  "facebook",
  "x",
  "discord",
  "github",
  "farcaster",
  "telegram",
  "email",
  "phone",
]);

export function inferAuthMethod(
  authMethods: unknown,
): AomiAuthMethod | undefined {
  if (!(authMethods instanceof Set) || authMethods.size === 0) return undefined;

  for (const method of authMethods) {
    if (typeof method !== "string") continue;
    const normalized = method.toLowerCase();
    if (OAUTH_METHODS.has(normalized as AomiAuthMethod)) {
      return normalized as AomiAuthMethod;
    }
  }
  return undefined;
}
