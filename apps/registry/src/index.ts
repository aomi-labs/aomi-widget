// Main entry point for @aomi-labs/widget-lib
// Re-export the main AomiFrame component
export { AomiFrame } from "./components/aomi-frame";

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
