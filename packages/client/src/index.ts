// =============================================================================
// Client
// =============================================================================

export { AomiClient } from "./client";

// =============================================================================
// Types
// =============================================================================

export type {
  AomiRequestOptions,
  AomiRequestQueryValue,
  AomiAppDescriptor,
  AomiAccessApproval,
  AomiAccountProfile,
  AomiAuthIdentity,
  AomiClientOptions,
  AomiCreateApprovalRequest,
  AomiIdentityWallet,
  AomiUsageStats,
  AomiUser,
  GetAccountAccessToken,
  GetAccountBearer,
  AomiMessage,
  AomiWalletFamily,
  AomiChatResponse,
  AomiClearSecretsResponse,
  AomiCreateThreadResponse,
  AomiDeleteSecretResponse,
  AomiIngestSecretsResponse,
  AomiInterruptResponse,
  AomiListSecretsResponse,
  AomiSecretSlot,
  AomiSimulateFee,
  AomiSimulateResponse,
  AomiSSEEvent,
  AomiSSEEventType,
  AomiStateResponse,
  AomiSystemEvent,
  AomiSystemResponse,
  AomiThread,
  AomiHttpMethod,
  Logger,
} from "./types";
export type {
  AomiClientType,
  UserStateAAMode,
  UserStateAuthMethod,
  UserStateWalletKind,
  UserStateWalletProvider,
  UserStateSponsorProvider,
} from "./user-state";

// =============================================================================
// Type Guards
// =============================================================================

export {
  UserState,
  CLIENT_TYPE_TS_CLI,
  CLIENT_TYPE_WEB_UI,
} from "./user-state";
export {
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
  toViemSignMessageArgs,
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
  ViemSignMessageArgs,
  ViemSignTypedDataArgs,
} from "./wallet-utils";

// =============================================================================
// Chains
// =============================================================================

export {
  ALCHEMY_CHAIN_SLUGS,
  CHAIN_NAMES,
  CHAINS_BY_ID,
  SUPPORTED_CHAINS,
  SUPPORTED_CHAIN_IDS,
  monad,
  monadTestnet,
} from "./chains";
export type { ChainInfo } from "./chains";

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
