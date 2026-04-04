// =============================================================================
// User State
// =============================================================================

/**
 * Client-side user state synced with the backend.
 * Typically wallet connection info, but can be any key-value data.
 */
export type UserState = Record<string, unknown>;

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
  /** Default API key for non-default apps */
  apiKey?: string;
  /** Optional logger for debug output (default: silent) */
  logger?: Logger;
};

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
