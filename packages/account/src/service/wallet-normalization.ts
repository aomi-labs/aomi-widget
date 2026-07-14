import type { WalletFamily } from "../types";

export function normalizeWalletAddress(
  family: WalletFamily,
  address: string,
): string {
  const trimmed = address.trim();
  return family === "evm" ? trimmed.toLowerCase() : trimmed;
}
