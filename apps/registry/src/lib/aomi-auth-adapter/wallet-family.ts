"use client";

import type { WalletFamily } from "./types";

type LegacyWireWalletFamily = "evm" | "svm";

export function toWireWalletFamily(
  family: WalletFamily,
): LegacyWireWalletFamily {
  return family === "solana" ? "svm" : family;
}

export function fromWireWalletFamily(
  family: WalletFamily | LegacyWireWalletFamily,
): WalletFamily {
  return family === "svm" ? "solana" : family;
}
