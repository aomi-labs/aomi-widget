// Main entry point for @aomi-labs/widget-lib
// Re-export the main AomiFrame component
export { AomiFrame } from "./components/aomi-frame";

// Dual-wallet UI
export {
  DualWalletBar,
  type DualWalletBarProps,
} from "./components/control-bar/dual-wallet-bar";

// Notification UI
export { NotificationToaster } from "./components/ui/notification";

// UI Components
export { Button } from "./components/ui/button";
export { Input } from "./components/ui/input";
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
export {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./components/ui/sidebar";

// Re-export types and utilities from @aomi-labs/react
export type { ChainInfo, UserConfig } from "@aomi-labs/react";
export {
  formatAddress,
  getChainInfo,
  getNetworkName,
  SUPPORTED_CHAINS,
} from "@aomi-labs/react";
export { ExtUserProvider, useUser, UserState } from "@aomi-labs/react";
export { monad, monadTestnet } from "@aomi-labs/client";
export type {
  AomiWalletKit,
  AomiWalletKit as AomiAuthAdapter,
  AomiSessionIdentity,
  AomiSessionIdentity as AomiAuthIdentity,
  AomiSessionStatus,
  AomiSessionStatus as AomiAuthStatus,
} from "./lib/wallet-kit";
export {
  AOMI_SESSION_BOOTING_IDENTITY as AOMI_AUTH_BOOTING_IDENTITY,
  AOMI_SESSION_DISCONNECTED_IDENTITY as AOMI_AUTH_DISCONNECTED_IDENTITY,
  AomiWalletKitContextProvider as AomiAuthAdapterProvider,
  AomiWalletKitContextProvider,
  AomiWalletKitProvider,
  useAomiWalletKit as useAomiAuthAdapter,
  useAomiWalletKit,
} from "./lib/wallet-kit";
export { AomiWalletProvider } from "./lib/wallet-kit/providers";
export {
  AomiBaseAccountProvider,
  type AomiBaseAccountProviderProps,
  type BaseAccountSponsorshipOptions,
} from "./lib/wallet-kit/providers/base-account";
export {
  AOMI_SESSION_BOOTING_IDENTITY,
  AOMI_SESSION_DISCONNECTED_IDENTITY,
  formatAuthMethod,
  formatWalletProvider,
  inferAuthMethod,
} from "./lib/wallet-kit";
export {
  FullTestnetWalletRouter,
  isFullTestnet,
  useFullTestnet,
} from "./lib/wallet-kit";
