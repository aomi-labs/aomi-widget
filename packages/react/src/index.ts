// =============================================================================
// API Client (re-exported from @aomi-labs/client)
// =============================================================================
export { AomiClient } from "@aomi-labs/client";
export type { AomiClientOptions } from "@aomi-labs/client";
export type {
  AomiMessage,
  AomiChatResponse,
  AomiCreateThreadResponse,
  AomiInterruptResponse,
  AomiSSEEvent,
  AomiStateResponse,
  AomiSystemEvent,
  AomiSystemResponse,
  AomiThread,
  NativeWalletExecutionPolicy,
  NativeWalletSponsorship,
  SponsorshipPaymasterServiceContext,
  WalletCapabilities,
} from "@aomi-labs/client";
export {
  toViemSignTypedDataArgs,
  hydrateTxPayloadFromUserState,
  toAAWalletCalls,
  toAAWalletCall,
  appendFeeCallToPayload,
  buildFeeAAWalletCall,
  normalizeSimulatedFee,
  MAX_AUTO_FEE_WEI,
  executeWalletCalls,
  DISABLED_PROVIDER_STATE,
  parseChainId,
  aaModeFromExecutionKind,
} from "@aomi-labs/client";

// =============================================================================
// Runtime Provider
// =============================================================================
export { AomiRuntimeProvider } from "./runtime/aomi-runtime";
export type { AomiRuntimeProviderProps } from "./runtime/aomi-runtime";
export { RuntimeUserStateProvider } from "./runtime/user-state-provider";

// =============================================================================
// Unified Runtime API
// =============================================================================
export { useAomiRuntime } from "./interface";
export type { AomiRuntimeApi } from "./interface";

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
  SSEStatus,
  EventSubscriber,
} from "./contexts/event-context";

// =============================================================================
// Handler Hooks
// =============================================================================
export { useWalletHandler } from "./handlers/wallet-handler";
export { useNotificationHandler } from "./handlers/notification-handler";
export type {
  WalletRequest,
  WalletTxPayload,
  WalletEip712Payload,
  WalletSolanaSignPayload,
  WalletRequestKind,
  WalletRequestStatus,
  WalletRequestResult,
  WalletHandlerConfig,
  WalletHandlerApi,
} from "./handlers/wallet-handler";
export type {
  NotificationHandlerConfig,
  NotificationApi,
} from "./handlers/notification-handler";

// =============================================================================
// User Context (wallet/user state)
// =============================================================================
export {
  useUser,
  ExtUserProvider,
  UserState,
} from "./contexts/ext-user-context";

// User config type (for render prop pattern)
export type { UserConfig } from "./runtime/utils";

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
export type {
  ModelSelectionMode,
  ThreadMetadata,
  ThreadControlState,
} from "./state/thread-store";
export { initThreadControl } from "./state/thread-store";

// =============================================================================
// Utilities
// =============================================================================
export {
  cn,
  formatAddress,
  getNetworkName,
  getChainInfo,
  SUPPORTED_CHAINS,
  type ChainInfo,
} from "./runtime/utils";
export { resolveAutoModel } from "./utils/model-selection";

// =============================================================================
// Notification Context (for toast UI)
// =============================================================================
export {
  useNotification,
  NotificationContextProvider,
  type Notification,
  type NotificationType,
  type NotificationData as ShowNotificationParams,
  type NotificationContextApi as NotificationContextValue,
  type NotificationContextProviderProps,
} from "./contexts/notification-context";

// =============================================================================
// Control Context (model/app/api-key state)
// =============================================================================
export {
  useControl,
  ControlContextProvider,
  type ControlState,
  type ControlContextApi,
  type ControlContextProviderProps,
  type StoredModelPreference,
  type StoredByokKey,
} from "./contexts/control-context";
