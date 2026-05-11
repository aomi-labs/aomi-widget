// Main entry point for @aomi-labs/widget-lib
// Re-export the main AomiFrame component
export { AomiFrame } from "./components/aomi-frame";

// Control bar — payment picker types so hosts can build adapters.
export {
  PaymentSelect,
  type PaymentSelectProps,
  type PaymentMethodStatus,
  type PaymentMethodStatusTone,
} from "./components/control-bar/payment-select";

// Settings panels — opt-in, not mounted by AomiFrame.
export {
  PaymentSettings,
  type PaymentSettingsProps,
  type PaymentSettingsStatus,
  type PaymentSettingsToggles,
  type PaymentSettingsCredits,
  type MppStatus,
  type X402Status,
} from "./components/settings/payment-settings";
export { ProviderKeysSettings } from "./components/settings/provider-keys-settings";

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
export type { UserConfig } from "@aomi-labs/react";
export { formatAddress, getNetworkName } from "@aomi-labs/react";
export type { AomiAuthAdapter } from "./lib/aomi-auth-adapter";
export {
  AomiAuthAdapterProvider,
  AomiAuthRuntimeUserSync,
  useAomiAuthAdapter,
} from "./lib/aomi-auth-adapter";
export { AomiWalletProvider } from "./lib/aomi-auth-adapter/providers";
export { AomiBaseAccountProvider } from "./lib/aomi-auth-adapter/providers/base-account";
export {
  AomiParaAdapterProvider,
  AomiParaProvider,
} from "./lib/aomi-auth-adapter/providers/para";
export type { AomiAuthIdentity, AomiAuthStatus } from "./lib/aomi-auth-adapter";
export {
  AOMI_AUTH_BOOTING_IDENTITY,
  AOMI_AUTH_DISCONNECTED_IDENTITY,
  formatAuthProvider,
  inferAuthProvider,
} from "./lib/aomi-auth-adapter";
