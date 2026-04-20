"use client";

import { useAomiAuthAdapter } from "./aomi-auth-adapter";

export type AomiAuthStatus = "booting" | "disconnected" | "connected";

export type AomiAuthIdentity = {
  status: AomiAuthStatus;
  isConnected: boolean;
  address?: string;
  chainId?: number;
  authProvider?: string;
  primaryLabel: string;
  secondaryLabel?: string;
};

export const AOMI_AUTH_DISCONNECTED_IDENTITY: AomiAuthIdentity = {
  status: "disconnected",
  isConnected: false,
  address: undefined,
  chainId: undefined,
  authProvider: undefined,
  primaryLabel: "Not connected",
  secondaryLabel: undefined,
};

export const AOMI_AUTH_BOOTING_IDENTITY: AomiAuthIdentity = {
  status: "booting",
  isConnected: false,
  address: undefined,
  chainId: undefined,
  authProvider: undefined,
  primaryLabel: "Loading Wallet...",
  secondaryLabel: undefined,
};

export function formatAddress(address?: string): string | undefined {
  if (!address) return undefined;
  return `${address.slice(0, 5)}..${address.slice(-2)}`;
}

export function formatAuthProvider(provider?: string): string | undefined {
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
    wallet: "Wallet",
  };

  return labelMap[provider] ?? provider;
}

export function inferAuthProvider(authMethods: unknown): string | undefined {
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

export function useAomiAuthIdentity(): AomiAuthIdentity {
  return useAomiAuthAdapter().identity;
}
