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
export type { AomiAuthAdapter } from "./lib/aomi-auth-adapter";
export {
  AomiAuthAdapterProvider,
  useAomiAuthAdapter,
} from "./lib/aomi-auth-adapter";
export { AomiWalletProvider } from "./lib/aomi-auth-adapter/providers";
export { AomiBaseAccountProvider } from "./lib/aomi-auth-adapter/providers/base-account";
export {
  AomiParaAdapterProvider,
  AomiParaProvider,
} from "./lib/aomi-auth-adapter/providers/para";
export { AomiPrivyProvider } from "./lib/aomi-auth-adapter/providers/privy";
export type { AomiParaAdapterProviderProps } from "./lib/aomi-auth-adapter/providers/para";
export type { AomiAuthIdentity, AomiAuthStatus } from "./lib/aomi-auth-adapter";
export {
  AOMI_AUTH_BOOTING_IDENTITY,
  AOMI_AUTH_DISCONNECTED_IDENTITY,
  formatAuthMethod,
  formatWalletProvider,
  inferAuthMethod,
} from "./lib/aomi-auth-adapter";
export {
  FullTestnetWalletRouter,
  isFullTestnet,
  useFullTestnet,
} from "./lib/aomi-auth-adapter";
