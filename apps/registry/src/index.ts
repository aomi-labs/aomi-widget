// Main entry point for @aomi-labs/widget-lib
// Re-export the main AomiFrame component
export { AomiFrame } from "./components/aomi-frame";

// Aomi auth adapter (provider-agnostic context + types)
export {
  type AomiAuthAdapter,
  AOMI_AUTH_BOOTING_ADAPTER,
  AomiAuthAdapterContext,
  AomiAuthAdapterProvider,
  AOMI_AUTH_DISCONNECTED_ADAPTER,
  useAomiAuthAdapter,
} from "./lib/aomi-auth-adapter";

// Auth runtime bridge
export { AomiAuthSyncBridge } from "./components/aomi-auth-sync-bridge";

// Notification UI
export { NotificationToaster } from "./components/ui/notification";

// UI Components
export { Button } from "./components/ui/button";
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
export type {
  AomiAuthIdentity,
  AomiAuthStatus,
} from "./lib/auth-identity";
export {
  AOMI_AUTH_BOOTING_IDENTITY,
  AOMI_AUTH_DISCONNECTED_IDENTITY,
  formatAuthProvider,
  inferAuthProvider,
  useAomiAuthIdentity,
} from "./lib/auth-identity";
