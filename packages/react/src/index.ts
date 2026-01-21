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
export { useEventContext, EventContextProvider } from "./contexts/event-context";
export type { EventContext, EventContextProviderProps } from "./contexts/event-context";

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
  Notification,
  NotificationHandlerConfig,
  NotificationApi,
} from "./handlers/notification-handler";
