"use client";

import type { ReactNode } from "react";

const wallet = (name: string) => ({
  adapter: { name },
  readyState: "Installed",
});

export function ParaSolanaProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export const backpackWallet = () => wallet("Backpack");
export const glowWallet = () => wallet("Glow");
export const phantomWallet = () => wallet("Phantom");
export const solflareWallet = () => wallet("Solflare");
export const allWallets = [
  phantomWallet,
  glowWallet,
  backpackWallet,
  solflareWallet,
];
