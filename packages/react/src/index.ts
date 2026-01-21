// =============================================================================
// Backend API Client
// =============================================================================
export { BackendApi } from "./backend/client";
export type {
  AomiMessage,
  ApiChatResponse,
  ApiCreateThreadResponse,
  ApiInterruptResponse,
  ApiSSEEvent,
  ApiStateResponse,
  ApiSystemEvent,
  ApiSystemResponse,
  ApiThread,
} from "./backend/types";

// =============================================================================
// Runtime Provider
// =============================================================================
export { AomiRuntimeProvider } from "./runtime/aomi-runtime";
export type { AomiRuntimeProviderProps } from "./runtime/aomi-runtime";

// =============================================================================
// Event System (follows RUNTIME-ARCH.md)
// =============================================================================
export {
  useEventContext,
  EventContextProvider,
} from "./contexts/event-context";
export type {
  EventContext,
  EventContextProviderProps,
} from "./contexts/event-context";

export type {
  InboundEvent,
  OutboundEvent,
  SSEStatus,
  EventSubscriber,
  EventBuffer,
} from "./state/event-buffer";

// =============================================================================
// Handler Hooks
// =============================================================================
export { useWalletHandler } from "./handlers/wallet-handler";
export { useNotificationHandler } from "./handlers/notification-handler";
export type {
  WalletTxRequest,
  WalletTxComplete,
  WalletConnectionStatus,
  WalletHandlerConfig,
  WalletHanderApi,
} from "./handlers/wallet-handler";
export type {
  Notification as HandlerNotification,
  NotificationHandlerConfig,
  NotificationApi,
} from "./handlers/notification-handler";

// =============================================================================
// User Context (wallet/user state)
// =============================================================================
export {
  useUser,
  UserContextProvider,
  type UserState,
} from "./contexts/user-context"; 

// Backwards compatibility alias
export type { UserState as WalletButtonState } from "./contexts/user-context";

// Wallet footer props type (for render prop pattern)
export type WalletFooterProps = {
  wallet: import("./contexts/user-context").UserState;
  setWallet: (
    data: Partial<import("./contexts/user-context").UserState>,
  ) => void;
};

// =============================================================================
// Thread Context (for UI components)
// =============================================================================
export {
  useThreadContext,
  useCurrentThreadMessages,
  useCurrentThreadMetadata,
  ThreadContextProvider,
} from "./contexts/thread-context";
export type { ThreadContext } from "./contexts/thread-context";
export type { ThreadMetadata } from "./state/thread-store";

// =============================================================================
// Utilities
// =============================================================================
export { cn } from "./runtime/utils";

// =============================================================================
// Notification Context (for toast UI)
// =============================================================================
export {
  useNotification,
  NotificationContextProvider,
  type Notification,
  type NotificationType,
  type ShowNotificationParams,
  type NotificationContextApi as NotificationContextValue,
  type NotificationContextProviderProps,
} from "./contexts/notification-context";
