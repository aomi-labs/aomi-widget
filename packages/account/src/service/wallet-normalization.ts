import type { WalletFamily } from "../types";

export function normalizeWalletAddress(
  family: WalletFamily,
  address: string,
): string {
  const trimmed = address.trim();
  return family === "evm" ? trimmed.toLowerCase() : trimmed;
}

export function walletKey(family: WalletFamily, address: string): string {
  return `${family}:${normalizeWalletAddress(family, address)}`;
}

export function caip10(input: {
  family: WalletFamily;
  address: string;
  chainId?: number;
  chainScope?: string | null;
}): string | null {
  if (input.family === "evm") {
    const scope =
      input.chainScope ??
      (input.chainId ? `eip155:${input.chainId}` : "eip155:*");
    return `${scope}:${normalizeWalletAddress("evm", input.address)}`;
  }
  return input.chainScope ? `${input.chainScope}:${input.address}` : null;
}
