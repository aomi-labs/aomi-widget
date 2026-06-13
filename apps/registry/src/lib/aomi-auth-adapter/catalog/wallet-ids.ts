"use client";

export type WalletId =
  | "metamask"
  | "rabby"
  | "coinbase"
  | "rainbow"
  | "walletconnect"
  | "baseAccount"
  | "phantom"
  | "solflare"
  | "backpack"
  | "glow"
  | (string & {});

export type EvmWalletPreset = "popular" | "evm-only" | "minimal";
export type SvmWalletPreset = "popular" | "minimal";

export const EVM_PRESETS: Record<EvmWalletPreset, readonly WalletId[]> = {
  popular: ["metamask", "rabby", "coinbase", "walletconnect"],
  "evm-only": ["metamask", "rabby", "walletconnect"],
  minimal: ["metamask", "walletconnect"],
};

export const SVM_PRESETS: Record<SvmWalletPreset, readonly WalletId[]> = {
  popular: ["phantom", "solflare", "backpack", "glow"],
  minimal: ["phantom", "solflare"],
};
