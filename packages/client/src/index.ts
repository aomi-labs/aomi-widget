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
  UserStateAAMode,
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
  getUserStateAAMode,
  getUserStateSmartAccount,
  isAsyncCallback,
  isInlineCall,
  isSystemError,
  isSystemNotice,
} from "./types";

// =============================================================================
// Session (high-level orchestrated client)
// =============================================================================

export { ClientSession as Session, aaModeFromExecutionKind } from "./session";

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
  hydrateTxPayloadFromUserState,
  normalizeEip712Payload,
  normalizeSolanaSignPayload,
  normalizeSolanaSignMessagePayload,
  normalizeSolanaWalletRequest,
  toViemSignTypedDataArgs,
  toAAWalletCalls,
  toAAWalletCall,
  parseChainId,
} from "./wallet-utils";

export type {
  WalletTxPayload,
  WalletTxCallPayload,
  WalletTxAaPreference,
  WalletEip712Payload,
  NormalizedSolanaWalletRequest,
  WalletSolanaSignPayload,
  WalletSolanaSignMessagePayload,
  ViemSignTypedDataArgs,
} from "./wallet-utils";

// =============================================================================
// Account Abstraction
// =============================================================================

export {
  DEFAULT_AA_CONFIG,
  DISABLED_PROVIDER_STATE,
  getAAChainConfig,
  buildAAExecutionPlan,
  getWalletExecutorReady,
  executeWalletCalls,
  MAX_AUTO_FEE_WEI,
  normalizeSimulatedFee,
  buildFeeAAWalletCall,
  appendFeeCallToPayload,
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
  WalletCapabilities,
  WalletAtomicCapability,
  NativeWalletExecutionPolicy,
  NativeWalletSponsorship,
  SponsorshipPaymasterServiceContext,
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
  NormalizedSimulatedFee,
} from "./aa";
