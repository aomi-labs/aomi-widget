"use client";

import type { WalletFamily, WireWalletFamily } from "./types";

export function toWireWalletFamily(family: WalletFamily): WireWalletFamily {
  return family === "solana" ? "svm" : family;
}

export function fromWireWalletFamily(
  family: WalletFamily | WireWalletFamily,
): WalletFamily {
  return family === "svm" ? "solana" : family;
}
