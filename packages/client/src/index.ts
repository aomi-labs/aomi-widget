// =============================================================================
// Client
// =============================================================================

export { AomiClient } from "./client";
export {
  authorizationChallenge,
  authorizationCommit,
  ensureSvmWalletBound,
  ensureSvmWalletBoundVia,
  isUnboundWalletError,
  posterFromClient,
} from "./authorization";
export type {
  AomiAuthorizationChallenge,
  AomiAuthorizationPermit,
  AomiAuthorizationState,
  AomiEnsureBoundResult,
  AuthorizationPoster,
} from "./authorization";
export {
  AccountCredentialUnavailableError,
  createAccountBearerProvider,
} from "./account-session";
export { buildSiwsMessage } from "./siws";
export type { SiwsChainId, SiwsIntent } from "./siws";
export {
  handlePaymentChallenges,
  wrapFetchWithPaymentChallenges,
} from "./payment";
export type {
  AccountBearerProviderOptions,
  AccountBearerProvider,
  AccountCredentialProvider,
  AccountSessionExchangeResponse,
  BetterAuthAccountTokenSourceOptions,
  BetterAuthTokenResponse,
} from "./account-session";

// =============================================================================
// Types
// =============================================================================

export type {
  AomiAppDescriptor,
  AomiPlatformFilter,
  AomiRequestOptions,
  AomiRequestQueryValue,
  AomiClientOptions,
  AomiHttpMethod,
  AomiAccessApproval,
  AomiAccountProfile,
  AomiAuthPurpose,
  AomiAuthIdentity,
  AomiCreateApprovalRequest,
  AomiIdentityWallet,
  AomiUsageStats,
  AomiUser,
  GetAccountBearer,
  AomiMessage,
  AomiWalletFamily,
  AomiChatResponse,
  AomiClearSecretsResponse,
  AomiCreateThreadResponse,
  AomiAccountResponse,
  AomiDeleteSecretResponse,
  AomiIngestSecretsResponse,
  AomiInterruptResponse,
  AomiListSecretsResponse,
  AomiSecretSlot,
  AomiSimulateFee,
  AomiSimulateResponse,
  AomiSSEEvent,
  AomiSSEEventType,
  AomiTaskActivityEvent,
  AomiTaskActivityKind,
  AomiTaskCompletedEvent,
  AomiTaskEvent,
  AomiTaskEventType,
  AomiTaskStartedEvent,
  AomiTaskStatus,
  AomiStateResponse,
  AomiSystemEvent,
  AomiSystemResponse,
  AomiThread,
  Logger,
} from "./types";
export {
  createProviderCredentialAdapter,
  createSiweWidgetAuthAdapter,
  createSiwsWidgetAuthAdapter,
  createWidgetSessionProvider,
  type ProviderCredential,
  type SiwsWidgetSessionSigner,
  type WidgetAuthAdapter,
  type WidgetAuthSession,
  type WidgetSession,
  type WidgetSessionProvider,
  type WidgetSessionSigner,
} from "./widget-session";
export { normalizeAppDescriptor, appIdentityKey } from "./app-descriptor";
export { safeEnv } from "./internal/env";
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
  isAomiTaskEventType,
  parseAomiTaskEvent,
  AOMI_TASK_EVENT_TYPES,
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
  WalletAaSignPayload,
  WalletAaSignatureRequest,
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
  normalizeSolanaCluster,
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
  arcTestnet,
  monad,
  monadTestnet,
  megaeth,
  robinhood,
} from "./chains";
export type { ChainInfo } from "./chains";

// =============================================================================
// Wallet Execution (native wallet only — AA executes server-side)
// =============================================================================

export {
  executeWalletCalls,
  MAX_AUTO_FEE_WEI,
  normalizeSimulatedFee,
  buildFeeAAWalletCall,
  appendFeeCallToPayload,
} from "./aa";

export type {
  AAMode,
  AASponsorship,
  AAWalletCall,
  AACallPayload,
  WalletCapabilities,
  WalletAtomicCapability,
  NativeWalletExecutionPolicy,
  NativeWalletSponsorship,
  SponsorshipPaymasterServiceContext,
  ExecutionResult,
  AtomicBatchArgs,
  ExecuteWalletCallsParams,
  NormalizedSimulatedFee,
} from "./aa";
