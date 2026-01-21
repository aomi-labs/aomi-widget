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

export { AomiRuntimeProvider } from "./runtime/aomi-runtime";
export { useRuntimeActions, RuntimeActionsProvider } from "./contexts/runtime-actions";
export { useEventContext } from "./contexts/event-context";
export { useWalletHandler } from "./handlers/wallet-handler";
export { useNotificationHandler } from "./handlers/notification-handler";
export type {
  WalletTxRequest,
  WalletTxComplete,
  WalletConnectionStatus,
} from "./handlers/wallet-handler";
export type { Notification } from "./handlers/notification-handler";

export {
  ThreadContextProvider,
  useThreadContext,
  useCurrentThreadMetadata,
  useCurrentThreadMessages,
} from "./contexts/thread-context";
export type { ThreadMetadata, ThreadStatus } from "./state/thread-store";
