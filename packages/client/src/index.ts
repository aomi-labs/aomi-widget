// =============================================================================
// Client
// =============================================================================

export { AomiClient } from "./client";

// =============================================================================
// Types
// =============================================================================

export type {
  AomiClientType,
  AomiClientOptions,
  AomiMessage,
  AomiChatResponse,
  AomiClearSecretsResponse,
  AomiCreateThreadResponse,
  AomiDeleteSecretResponse,
  AomiIngestSecretsResponse,
  AomiInterruptResponse,
  AomiSimulateFee,
  AomiSimulateResponse,
  AomiSSEEvent,
  AomiSSEEventType,
  AomiStateResponse,
  AomiSystemEvent,
  AomiSystemResponse,
  AomiThread,
  Logger,
} from "./types";

// =============================================================================
// Type Guards
// =============================================================================

export {
  UserState,
  addUserStateExt,
  CLIENT_TYPE_TS_CLI,
  CLIENT_TYPE_WEB_UI,
  isAsyncCallback,
  isInlineCall,
  isSystemError,
  isSystemNotice,
} from "./types";

// =============================================================================
// Session (high-level orchestrated client)
// =============================================================================

export { ClientSession as Session } from "./session";

export type {
  SessionOptions,
  SessionEventMap,
  SendResult,
  WalletRequest,
  WalletRequestKind,
  WalletRequestResult,
} from "./session";

// =============================================================================
// Event Utilities
// =============================================================================

export { TypedEventEmitter } from "./event";
export { unwrapSystemEvent, type UnwrappedEvent } from "./event";

// =============================================================================
// Wallet Utilities
// =============================================================================

export {
  normalizeTxPayload,
  normalizeEip712Payload,
  toViemSignTypedDataArgs,
  toAAWalletCall,
} from "./wallet-utils";

export type {
  WalletTxPayload,
  WalletEip712Payload,
  ViemSignTypedDataArgs,
} from "./wallet-utils";

// =============================================================================
// Account Abstraction
// =============================================================================

export {
  DEFAULT_AA_CONFIG,
  getAAChainConfig,
  buildAAExecutionPlan,
  getWalletExecutorReady,
  executeWalletCalls,
  createAlchemyAAProvider,
  createPimlicoAAProvider,
  adaptSmartAccount,
  isAlchemySponsorshipLimitError,
  resolvePimlicoConfig,
  createAAProviderState,
} from "./aa";

export type {
  AAProvider,
  AAMode,
  AASponsorship,
  AAWalletCall,
  AACallPayload,
  AAChainConfig,
  AAConfig,
  AAResolvedConfig,
  WalletAtomicCapability,
  SmartAccount,
  AAState,
  ExecutionResult,
  AtomicBatchArgs,
  ExecuteWalletCallsParams,
  AlchemyHookParams,
  UseAlchemyAAHook,
  CreateAlchemyAAProviderOptions,
  PimlicoHookParams,
  UsePimlicoAAHook,
  CreatePimlicoAAProviderOptions,
  PimlicoResolveOptions,
  PimlicoResolvedConfig,
  AAOwner,
  CreateAAStateOptions,
} from "./aa";
