// =============================================================================
// Client
// =============================================================================

export { AomiClient, secretNamesFrom } from "./client";
export { AgentApiError, AgentTransport } from "./agent/transport";
export { PipelineApiError, PipelineTransport } from "./pipeline/transport";
export type {
  PipelineAction,
  PipelineAppResponse,
  PipelineAppsResponse,
  PipelineCatalogResponse,
  PipelineExecutionOptions,
  PipelineExecutionResponse,
  PipelineListOptions,
  PipelineResource,
  PipelineRunRequest,
  PipelineSearchOptions,
  PipelineSearchResponse,
  PipelineSkillsResponse,
  PipelineToolCallRequest,
  PipelineToolListOptions,
  PipelineToolResponse,
  PipelineToolSearchOptions,
  PipelineToolsResponse,
} from "./pipeline/types";
export type {
  AgentAction,
  AgentActionResult,
  AgentActivity,
  AgentDelta,
  AgentMessage,
  AgentSessionPage,
  AgentSessionRecord,
  AgentStartRequest,
  AgentStatus,
  AgentWalletContext,
  EvmExternalTransactionAction,
  SigningRequestAction,
  SvmExternalTransactionAction,
} from "./agent/types";
export {
  authorizationChallenge,
  authorizationCommit,
  ensureSvmWalletBound,
  ensureSvmWalletBoundVia,
  isUnboundWalletError,
  posterFromClient,
  createOAuthTokenProvider,
} from "./authorization";
export type {
  AomiAuthorizationChallenge,
  AomiAuthorizationPermit,
  AomiAuthorizationState,
  AomiEnsureBoundResult,
  AuthorizationPoster,
  AomiOAuthResource,
  AomiOAuthTokenProvider,
  AomiOAuthTokenRequest,
  AomiOAuthTokenSet,
} from "./authorization";
export { createGuestSessionProvider } from "./guest-auth";
export type { GuestSessionProvider } from "./guest-auth";
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
  ApplicationId,
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
  AomiClearSecretsResponse,
  AomiAccountResponse,
  AomiDeleteSecretResponse,
  AomiIngestSecretsResponse,
  AomiListSecretsResponse,
  AomiSecretSlot,
  AomiSimulateFee,
  AomiSimulateResponse,
  AomiTaskActivityEvent,
  AomiTaskActivityKind,
  AomiTaskCompletedEvent,
  AomiTaskEvent,
  AomiTaskEventType,
  AomiTaskStartedEvent,
  AomiTaskStatus,
  Logger,
} from "./types";
export {
  createProviderCredentialAdapter,
  createSiweWidgetAuthAdapter,
  WidgetChallengeBindingError,
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
  UserStateWalletProvider,
  OwnedUserState,
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
  WalletSignablePayload,
  WalletSigningPayload,
  WalletRequestKind,
  WalletRequestResult,
  WalletSolanaLegResult,
} from "./session";

// =============================================================================
// Event Utilities
// =============================================================================

export { TypedEventEmitter } from "./event";

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
  partialWalletExecution,
  PartialWalletExecutionError,
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
  PartialWalletExecution,
  AtomicBatchArgs,
  ExecuteWalletCallsParams,
  NormalizedSimulatedFee,
} from "./aa";
