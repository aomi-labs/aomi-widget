import type { UserState } from "./user-state";

export { UserState } from "./user-state";
export type {
  UserStateAAMode,
  UserStateAuthMethod,
  UserStateConnection,
  UserStateEvm,
  UserStateEvmAa,
  UserStateEvmSponsorship,
  UserStatePending,
  UserStateSponsorProvider,
  UserStateSvm,
  UserStateWalletKind,
  UserStateWalletProvider,
  AomiClientType,
} from "./user-state";
export { CLIENT_TYPE_TS_CLI, CLIENT_TYPE_WEB_UI } from "./user-state";

// =============================================================================
// Logger
// =============================================================================

/**
 * Optional logger for debug output. Pass `console` or any compatible object.
 */
export type Logger = {
  debug: (...args: unknown[]) => void;
};

// =============================================================================
// Client Options
// =============================================================================

export type AomiClientOptions = {
  /** Base URL of the Aomi backend (e.g. "https://api.aomi.dev" or "/" for same-origin proxying) */
  baseUrl: string;
  /** Optional fetch implementation for payment-aware browser transports and tests. */
  fetch?: typeof fetch;
  /** Default API key for non-default apps */
  apiKey?: string;
  /** Supplies a short-lived Aomi account bearer for REST and SSE requests. */
  getAccountBearer?: GetAccountBearer;
  /** Optional logger for debug output (default: silent) */
  logger?: Logger;
};

export type GetAccountBearer = (options?: {
  /** Re-exchange the upstream Para/Privy credential after an API 401. */
  forceRefresh?: boolean;
}) => Promise<string | null | undefined>;

export type AomiRequestQueryValue =
  | string
  | number
  | boolean
  | readonly (string | number | boolean)[]
  | null
  | undefined;

export type AomiPlatformFilter = string | readonly string[] | null | undefined;

export type AomiHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface AomiRequestOptions {
  /** Session id for session-scoped routes. */
  sessionId?: string;
  /** App key for app-key checked routes; defaults to the client's apiKey. */
  apiKey?: string;
  /** Query params appended to the request URL. */
  query?: Record<string, AomiRequestQueryValue>;
  /** JSON request payload. */
  body?: unknown;
  /** Extra request headers. */
  headers?: HeadersInit;
  /** Use the native fetch path instead of a custom payment-aware fetch wrapper. */
  raw?: boolean;
}

// =============================================================================
// Base Types
// =============================================================================

export interface AomiMessage {
  sender?: "user" | "agent" | "system" | string;
  content?: string;
  timestamp?: string;
  is_streaming?: boolean;
  tool_result?: [string, string] | null;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * GET /api/state
 * Fetches current session state including messages and processing status
 */
export interface AomiStateResponse {
  messages?: AomiMessage[] | null;
  system_events?: AomiSystemEvent[] | null;
  title?: string | null;
  is_processing?: boolean;
  user_state?: UserState | null;
}

/**
 * POST /api/chat
 * Sends a chat message and returns updated session state
 */
export interface AomiChatResponse {
  messages?: AomiMessage[] | null;
  system_events?: AomiSystemEvent[] | null;
  title?: string | null;
  is_processing?: boolean;
  user_state?: UserState | null;
}

/**
 * POST /api/system
 * Sends a system message and returns the response message
 */
export interface AomiSystemResponse {
  res?: AomiMessage | null;
}

/**
 * POST /api/simulate
 * Batch-simulate pending transactions atomically (snapshot → sequential send → revert).
 */
export interface AomiSimulateFee {
  /** Treasury address to receive the fee. */
  recipient: string;
  /** Fee amount in wei (decimal string). */
  amount_wei: string;
  /** Token type — always "native" for now. */
  token: "native";
}

export interface AomiSimulateResponse {
  result: {
    batch_success: boolean;
    stateful: boolean;
    from: string;
    network: string;
    total_gas?: number;
    fee?: AomiSimulateFee;
    steps: Array<{
      step: number;
      label: string;
      success: boolean;
      result?: string | null;
      revert_reason?: string | null;
      gas_used?: number;
      tx: { to: string; value_wei: string; value_eth: string; data: string };
    }>;
  };
}

/**
 * POST /api/interrupt
 * Interrupts current processing and returns updated session state
 */
export type AomiInterruptResponse = AomiChatResponse;

/**
 * GET /api/sessions
 * Returns array of AomiThread
 */
export interface AomiThread {
  session_id: string;
  title: string;
  is_archived?: boolean;
}

/**
 * POST /api/sessions
 * Creates a new thread/session
 */
export interface AomiCreateThreadResponse {
  session_id: string;
  title?: string;
}

/**
 * GET /api/account
 * The account bound to the authenticated request (resolved from the account
 * bearer). Returned only when the session is bound to a real user; an
 * anonymous session yields HTTP 400.
 */
export interface AomiUser {
  user_id: string;
  username?: string | null;
  apps?: string[];
  tier?: string;
  verified_email?: string | null;
  status?: string;
  last_seen_at?: number | null;
  created_at?: number;
  updated_at?: number;
}

export interface AomiAuthIdentity {
  id: number;
  application?: string | null;
  wallet_provider: string;
  auth_method: string;
  auth_verified_at?: number | null;
  is_primary: boolean;
  created_at: number;
}

export interface AomiIdentityWallet {
  wallet_id?: string | null;
  address: string;
  chain_type: string;
  wallet_provider: string;
}

export interface AomiUsageStats {
  period_utc_month?: string;
  input_tokens: number;
  output_tokens: number;
  credit_used: number;
  credit_paid: number;
}

export interface AomiAccountProfile {
  user: AomiUser;
  auth_identities?: AomiAuthIdentity[];
  identity_wallets?: AomiIdentityWallet[];
  usage?: AomiUsageStats;
}

export interface AomiCreateApprovalRequest {
  auth_identity_id: number;
  grant_kind: string;
  secret_handle: string;
  external_subject?: string | null;
  display_label?: string | null;
  scopes?: string[];
  expires_at?: number | null;
  metadata?: unknown;
}

export interface AomiAccessApproval {
  id: number;
  user_id: string;
  auth_identity_id: number;
  external_subject?: string | null;
  display_label?: string | null;
  grant_kind: string;
  scopes: string[];
  secret_handle: string;
  expires_at?: number | null;
  granted_at: number;
  revoked_at?: number | null;
  metadata: unknown;
  created_at: number;
  updated_at: number;
}

export interface AomiBeginAccountAuthResponse {
  state_token: string;
  auth_url: string;
  expires_at: number;
}

export type AomiWalletFamily = "evm" | "svm";
export type AomiAuthWalletFamily = "evm" | "solana";

/**
 * GET/POST/DELETE /api/account/payment/byok
 * Lists or saves BYOK keys (one per LLM provider) for the account.
 */
export interface AomiByokKeyEntry {
  provider: string;
  key_prefix: string;
  label?: string | null;
  is_active: boolean;
}

export interface AomiListByokKeysResponse {
  byok: AomiByokKeyEntry[];
}

export interface AomiSaveByokKeyResponse {
  key: AomiByokKeyEntry;
}

export interface AomiDeleteByokKeyResponse {
  deleted: boolean;
}

// =============================================================================
// SSE Event Types (/api/updates)
// =============================================================================

/**
 * Base SSE event - all events have session_id and type
 */
export type AomiSSEEvent = {
  type:
    | "title_changed"
    | "tool_update"
    | "tool_complete"
    | "system_notice"
    | string;
  session_id: string;
  new_title?: string;
  [key: string]: unknown;
};

/**
 * POST /api/secrets
 * Ingests secrets for a client, returns opaque handles
 */
export interface AomiIngestSecretsResponse {
  handles: Record<string, string>;
}

/**
 * DELETE /api/secrets
 * Clears all secrets for a client
 */
export interface AomiClearSecretsResponse {
  cleared: boolean;
}

/**
 * DELETE /api/secrets/:name
 * Removes a single secret for a client
 */
export interface AomiDeleteSecretResponse {
  deleted: boolean;
}

/**
 * GET /api/secrets
 * Per-app slot names currently filled for the session's client. The
 * backend never returns raw values; only the names.
 */
export interface AomiListSecretsResponse {
  by_app: Record<string, string[]>;
}

/**
 * One per-app secret slot declared by a plugin manifest. Surfaced via
 * `AomiAppDescriptor.secrets` so the frontend can render input rows and
 * gate app load on `required` slots being filled.
 */
export interface AomiSecretSlot {
  name: string;
  description: string;
  required: boolean;
}

/**
 * GET /api/session/apps
 * One entry per app the user can use. `secrets` is empty for apps that
 * declare no slots.
 */
export interface AomiAppDescriptor {
  name: string;
  applicationId?: number | string | null;
  platform?: string | null;
  label?: string | null;
  appReleaseTag?: string | null;
  isActive?: boolean | null;
  isPublic?: boolean | null;
  artifactReady?: boolean | null;
  secrets?: AomiSecretSlot[];
}

export type AomiSSEEventType =
  | "title_changed"
  | "tool_update"
  | "tool_complete"
  | "system_notice";

// =============================================================================
// System Events (/api/events)
// =============================================================================

/**
 * Backend SystemEvent enum serializes as tagged JSON:
 * - InlineCall: {"InlineCall": {"type": "wallet_tx_request", "payload": {...}}}
 * - SystemNotice: {"SystemNotice": "message"}
 * - SystemError: {"SystemError": "message"}
 * - AsyncCallback: {"AsyncCallback": {...}} (not sent over HTTP)
 */
export type AomiSystemEvent =
  | { InlineCall: { type: string; payload?: unknown; [key: string]: unknown } }
  | { SystemNotice: string }
  | { SystemError: string }
  | { AsyncCallback: Record<string, unknown> };

// =============================================================================
// Type Guards
// =============================================================================

export function isInlineCall(
  event: AomiSystemEvent,
): event is { InlineCall: { type: string; payload?: unknown } } {
  return "InlineCall" in event;
}

export function isSystemNotice(
  event: AomiSystemEvent,
): event is { SystemNotice: string } {
  return "SystemNotice" in event;
}

export function isSystemError(
  event: AomiSystemEvent,
): event is { SystemError: string } {
  return "SystemError" in event;
}

export function isAsyncCallback(
  event: AomiSystemEvent,
): event is { AsyncCallback: Record<string, unknown> } {
  return "AsyncCallback" in event;
}
