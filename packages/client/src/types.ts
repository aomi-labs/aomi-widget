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

export type GetAccountBearer = ((options?: {
  /** Force a refresh after an API 401. */
  forceRefresh?: boolean;
}) => Promise<string | null | undefined>) & {
  /**
   * When true, a throwing bearer source is fatal: the wrapped fetch rethrows
   * instead of proceeding unauthenticated. Providers that mint a required
   * (widget) session set this; additive account bearers leave it unset.
   */
  required?: boolean;
};

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
  /** Thread id for thread-scoped routes. Kept as sessionId for SDK compatibility. */
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
  /** Name of the tool this message reports on, when the backend supplies it. */
  tool_name?: string;
  /** Arguments the model passed to `tool_name`, as serialized by the backend. */
  tool_arguments?: unknown;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * GET /api/thread/state
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
 * POST /api/thread/chat
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
 * POST /api/exec/simulate
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
 * POST /api/thread/interrupt
 * Interrupts current processing and returns updated session state
 */
export type AomiInterruptResponse = AomiChatResponse;

/**
 * GET /api/threads
 * Returns array of AomiThread
 */
export interface AomiThread {
  thread_id?: string;
  session_id: string;
  title: string | null;
  is_archived?: boolean;
  last_active_at?: number;
}

export type AomiAccountResponse = AomiAccountProfile;

/**
 * POST /api/threads
 * Creates a new thread/session
 */
export interface AomiCreateThreadResponse {
  thread_id?: string;
  session_id: string;
  title?: string | null;
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
/** Provider login intent. Linking ownership never implies delegated signing. */
export type AomiAuthPurpose = "link_wallet" | "delegate_signing";

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
// SSE Event Types (/api/thread/updates)
// =============================================================================

/**
 * Base SSE event. Newer backends may include `thread_id`; `session_id` stays
 * optional for SDK compatibility with existing consumers.
 */
export type AomiSSEEvent = {
  type:
    | "title_changed"
    | "tool_update"
    | "tool_complete"
    | "system_notice"
    | "task_started"
    | "task_activity"
    | "task_completed"
    | string;
  session_id?: string;
  thread_id?: string;
  new_title?: string;
  [key: string]: unknown;
};

// =============================================================================
// Orchestrator delegation events (emitted on the mother thread's event bus)
// =============================================================================

/** Terminal status reported by `task_completed`. */
export type AomiTaskStatus =
  | "completed"
  | "failed"
  | "stalled"
  | "cancelled"
  | string;

/** Child step flavor reported by `task_activity`. */
export type AomiTaskActivityKind = "tool_call" | "note";

/** Emitted when the mother dispatches a `task` call, before awaiting the child. */
export type AomiTaskStartedEvent = {
  type: "task_started";
  /** id of the mother's `task` tool call. */
  call_id: string;
  /** Stable child handle, e.g. `task-agent:9f2c…`. */
  agent_id: string;
  label: string;
  app?: string | null;
  resumed?: boolean;
  session_id?: string;
  thread_id?: string;
};

/** Emitted as the mother observes the child transcript grow. */
export type AomiTaskActivityEvent = {
  type: "task_activity";
  call_id: string;
  agent_id: string;
  kind: AomiTaskActivityKind;
  /** Present for `kind: "tool_call"`. */
  tool_name?: string;
  /** Present for `kind: "tool_call"`; redacted/truncated by the backend. */
  args?: unknown;
  /** Present for `kind: "tool_call"`; redacted/truncated by the backend. */
  result_preview?: string;
  /** Present for `kind: "note"`. */
  text?: string;
  /** Monotonic per agent — used for ordering and replay dedupe. */
  child_seq: number;
  session_id?: string;
  thread_id?: string;
};

/** Emitted just before the mother's `task` call returns. */
export type AomiTaskCompletedEvent = {
  type: "task_completed";
  call_id: string;
  agent_id: string;
  status: AomiTaskStatus;
  message?: string;
  staged_count?: number;
  /** Number of child steps the backend counted (may exceed observed activity). */
  steps?: number;
  duration_ms?: number;
  session_id?: string;
  thread_id?: string;
};

export type AomiTaskEvent =
  | AomiTaskStartedEvent
  | AomiTaskActivityEvent
  | AomiTaskCompletedEvent;

export type AomiTaskEventType = AomiTaskEvent["type"];

export const AOMI_TASK_EVENT_TYPES = [
  "task_started",
  "task_activity",
  "task_completed",
] as const satisfies readonly AomiTaskEventType[];

export function isAomiTaskEventType(type: string): type is AomiTaskEventType {
  return (AOMI_TASK_EVENT_TYPES as readonly string[]).includes(type);
}

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

/**
 * Narrow a raw SSE payload to a typed task event.
 *
 * Returns `null` when the payload is not a task event or is missing the fields
 * the UI joins on (`agent_id`, plus `child_seq` for activity), so a malformed
 * backend event degrades to "no row" instead of a half-built one.
 */
export function parseAomiTaskEvent(
  event: AomiSSEEvent | AomiTaskEvent,
): AomiTaskEvent | null {
  const raw = event as Record<string, unknown>;
  const type = asString(raw.type);
  if (!type || !isAomiTaskEventType(type)) return null;

  const agentId = asString(raw.agent_id);
  if (!agentId) return null;
  const callId = asString(raw.call_id) ?? "";

  if (type === "task_started") {
    return {
      type,
      call_id: callId,
      agent_id: agentId,
      label: asString(raw.label) ?? "",
      app: asString(raw.app) ?? null,
      resumed: raw.resumed === true,
      ...(asString(raw.session_id)
        ? { session_id: raw.session_id as string }
        : null),
      ...(asString(raw.thread_id)
        ? { thread_id: raw.thread_id as string }
        : null),
    };
  }

  if (type === "task_activity") {
    const childSeq = raw.child_seq;
    if (typeof childSeq !== "number" || !Number.isFinite(childSeq)) return null;
    const kind: AomiTaskActivityKind =
      raw.kind === "note" ? "note" : "tool_call";
    return {
      type,
      call_id: callId,
      agent_id: agentId,
      kind,
      child_seq: childSeq,
      ...(asString(raw.tool_name)
        ? { tool_name: raw.tool_name as string }
        : null),
      ...(raw.args !== undefined ? { args: raw.args } : null),
      ...(asString(raw.result_preview)
        ? { result_preview: raw.result_preview as string }
        : null),
      ...(asString(raw.text) ? { text: raw.text as string } : null),
      ...(asString(raw.session_id)
        ? { session_id: raw.session_id as string }
        : null),
      ...(asString(raw.thread_id)
        ? { thread_id: raw.thread_id as string }
        : null),
    };
  }

  return {
    type,
    call_id: callId,
    agent_id: agentId,
    status: asString(raw.status) ?? "completed",
    ...(asString(raw.message) ? { message: raw.message as string } : null),
    ...(typeof raw.staged_count === "number"
      ? { staged_count: raw.staged_count }
      : null),
    ...(typeof raw.steps === "number" ? { steps: raw.steps } : null),
    ...(typeof raw.duration_ms === "number"
      ? { duration_ms: raw.duration_ms }
      : null),
    ...(asString(raw.session_id)
      ? { session_id: raw.session_id as string }
      : null),
    ...(asString(raw.thread_id)
      ? { thread_id: raw.thread_id as string }
      : null),
  };
}

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
 * GET /api/thread/apps
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
  | "system_notice"
  | AomiTaskEventType;

// =============================================================================
// System Events (/api/thread/events)
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
