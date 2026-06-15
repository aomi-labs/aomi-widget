"use client";

import type { PublicWalletFamily, WalletFamily } from "./types";

export function walletKey(family: WalletFamily, address: string): string {
  return `${family}:${address.toLowerCase()}`;
}

export function toRegistryFamily(
  family: PublicWalletFamily | undefined,
  fallback: WalletFamily = "evm",
): WalletFamily {
  if (!family) return fallback;
  return family === "solana" ? "svm" : family;
}
