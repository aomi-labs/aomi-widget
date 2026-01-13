export { BackendApi } from "./api/client";
export type {
  BackendSessionResponse,
  BackendThreadMetadata,
  CreateThreadResponse,
  SessionMessage,
  SessionResponsePayload,
  SystemResponsePayload,
  SystemUpdate,
  SystemUpdateNotification,
  SystemEvent,
} from "./api/types";

export {
  AomiRuntimeProvider,
  AomiRuntimeProviderWithNotifications,
} from "./runtime/aomi-runtime";
export type { AomiRuntimeProviderProps } from "./runtime/aomi-runtime";
export { useRuntimeActions, RuntimeActionsProvider } from "./runtime/hooks";
export { SessionService } from "./services/session-service";
export { useSessionService } from "./hooks/use-session-service";

export {
  ThreadContextProvider,
  useThreadContext,
  useCurrentThreadMetadata,
  useCurrentThreadMessages,
} from "./state/thread-context";
export type { ThreadMetadata, ThreadStatus } from "./state/types";

export {
  toInboundSystem as constructSystemMessage,
  toInboundMessage as constructThreadMessage,
} from "./utils/conversion";
export {
  WalletSystemMessageEmitter,
  formatAddress,
  getNetworkName,
  normalizeWalletError,
  toHexQuantity,
  pickInjectedProvider,
} from "./utils/wallet";
export type {
  WalletButtonState,
  WalletFooterProps,
  WalletTxRequestPayload,
  WalletTxRequestHandler,
  WalletTxRequestContext,
  Eip1193Provider,
} from "./utils/wallet";

export { cn } from "./lib/utils";

// Notification system (logic only)
export {
  NotificationProvider,
  useNotification,
} from "./lib/notification-context";
export type {
  Notification,
  NotificationType,
  NotificationIconType,
} from "./lib/notification-context";
