"use client";

export {
  AomiWalletKitContextProvider,
  useAomiWalletKit,
} from "./context";
export {
  AomiWalletKitProvider,
  type AomiWalletKitProviderInput,
  type AomiWalletKitProviderProps,
} from "./config";
export type {
  AomiAccount,
  AomiAccountCredential,
  AomiLoginMethod,
  AomiNetworkTarget,
  AomiSessionIdentity,
  AomiSessionStatus,
  AomiTxResult,
  AomiWalletKit,
  AomiWalletOption,
  PublicWalletFamily,
  SvmCluster,
  SvmNetworkOption,
  SvmWalletDescriptor,
  WalletFamily,
} from "./types";
export {
  AOMI_SESSION_BOOTING_IDENTITY,
  AOMI_SESSION_DISCONNECTED_IDENTITY,
  formatAddress,
  formatAuthMethod,
  formatWalletProvider,
  inferAuthMethod,
} from "./identity";
export {
  AomiWalletNetworkPreferencesProvider,
  useAomiWalletNetworkPreferences,
  useOptionalAomiWalletNetworkPreferences,
} from "./network-preferences";
export {
  canonicalWalletKey,
  normalizeWalletOptionId,
  registerWalletBrand,
} from "./catalog/wallet-branding";
export {
  resolveAomiSvmWalletIds,
  resolveAomiSvmConfig,
  SVM_PRESETS,
} from "./catalog/svm-wallet-catalog";
export { EVM_PRESETS, SVM_PRESETS as SVM_WALLET_PRESETS } from "./catalog/wallet-ids";
export type {
  EvmWalletId,
  EvmWalletPreset,
  SvmWalletId,
  SvmWalletPreset,
  WalletId,
} from "./catalog/wallet-ids";
export {
  FullTestnetWalletRouter,
  isFullTestnet,
  useFullTestnet,
} from "./full-testnet-wallet-routing";
export { useWalletActivationGuard } from "./use-wallet-activation-guard";
export { toWireWalletFamily, fromWireWalletFamily } from "./wallet-family";
