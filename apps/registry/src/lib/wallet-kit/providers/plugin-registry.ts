"use client";

import type { ReactNode } from "react";
import type {
  AomiWalletKitProviderInput,
  AomiWalletKitProviderProps,
} from "../config/types";

/**
 * A wallet provider plugin. Knows how to render itself from the normalized
 * capability config, and optionally how to recognize its ergonomic sugar form.
 * Registering one lets `AomiWalletKitProvider` resolve a provider by id instead
 * of branching on hardcoded provider names — adding a provider is a
 * `registerWalletProvider(...)` call, not a new `if` in the router.
 *
 * `render` returns the provider's element tree directly, so it is type-checked
 * inline against the provider component's real props (no generic registry, no
 * `any`).
 */
export type WalletProviderPlugin = {
  id: string;
  render: (props: AomiWalletKitProviderProps) => ReactNode;
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
