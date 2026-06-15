"use client";

import type { WalletFamily } from "./types";

type WireWalletFamily = "evm" | "svm";
type LegacyWalletFamily = WalletFamily | "solana";

export function toWireWalletFamily(family: LegacyWalletFamily): WireWalletFamily {
  return family === "solana" ? "svm" : family;
}

export function fromWireWalletFamily(
  family: LegacyWalletFamily | WireWalletFamily,
): WalletFamily {
  return family === "solana" ? "svm" : family;
}
