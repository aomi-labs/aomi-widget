import type { WalletPolicy } from "./types";

/** Wallets set to auto-signing whose provider grant is missing or expired. */
export function countDriftedWallets(wallets: WalletPolicy[]): number {
  return wallets.filter(
    (wallet) => wallet.desiredMode === "auto" && !wallet.grantActive,
  ).length;
}
