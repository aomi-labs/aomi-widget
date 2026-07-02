"use client";

import type { ReactNode } from "react";
import type {
  AccountConfig,
  AuthConfig,
  AomiWalletKitProviderInput,
  AomiWalletKitProviderProps,
  ExecutionConfig,
  ProvidersConfig,
} from "../config/types";
import type { SvmNetworkOption } from "../types";
import type { Chain } from "viem";

/**
 * A wallet provider plugin. Knows how to render itself from the normalized
 * capability config, and optionally how to recognize its ergonomic sugar form.
 * Registering one lets `AomiWalletKitProvider` resolve a provider by id instead
 * of branching on hardcoded provider names — adding a provider is a
 * `registerWalletProvider(...)` call, not a new `if` in the router.
 *
 */
export type WalletProviderPlugin = {
  id: string;
  authMode?: "additive" | "full";
  wrap?: (props: {
    auth?: AuthConfig;
    children: ReactNode;
    providers?: ProvidersConfig;
  }) => ReactNode;
  isAvailable?: (props: {
    auth?: AuthConfig;
    providers?: ProvidersConfig;
  }) => boolean;
  renderComposer?: (props: {
    account?: AccountConfig;
    auth?: AuthConfig;
    children: ReactNode;
    execution?: ExecutionConfig;
    providers?: ProvidersConfig;
    solanaRuntimeConfig?: {
      cluster: SvmNetworkOption["cluster"];
      rpcHttpUrl: string;
      rpcWsUrl?: string;
      preferDirectSend: boolean;
    };
    supportedChains: readonly Chain[];
    supportedSolanaNetworks: readonly SvmNetworkOption[];
    selectedSolanaNetwork?: SvmNetworkOption;
    setSelectedSolanaNetworkId: (networkId: string) => void;
  }) => ReactNode;
  detectSugar?: (
    input: AomiWalletKitProviderInput,
  ) => AomiWalletKitProviderProps | null;
};

const registry = new Map<string, WalletProviderPlugin>();

export function registerWalletProvider(plugin: WalletProviderPlugin): void {
  registry.set(plugin.id, plugin);
}

export function getWalletProvider(
  id: string,
): WalletProviderPlugin | undefined {
  return registry.get(id);
}

export function requireWalletProvider(id: string): WalletProviderPlugin {
  const plugin = registry.get(id);
  if (!plugin) {
    throw new Error(
      `[aomi-wallet-kit] Unknown wallet provider "${id}". Import "@aomi-labs/widget-lib/providers/${id}" before mounting AomiWalletKitProvider, or use preset="wallets-only".`,
    );
  }
  return plugin;
}

/**
 * Run each registered plugin's sugar detector in registration order; the first
 * match wins. Replaces the previous isParaSugar/isPrivySugar chain without the
 * router naming a provider.
 */
export function detectProviderSugar(
  input: AomiWalletKitProviderInput,
): AomiWalletKitProviderProps | null {
  for (const plugin of registry.values()) {
    const normalized = plugin.detectSugar?.(input);
    if (normalized) return normalized;
  }
  return null;
}
