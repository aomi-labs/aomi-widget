// =============================================================================
// Base Types
// =============================================================================

export interface AomiMessage {
  sender?: string;
  content?: string;
  timestamp?: string;
  is_streaming?: boolean;
  tool_result?: [string, string] | { topic?: unknown; content?: unknown } | null;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * GET /api/state
 * Fetches current session state including messages and processing status
 */
export interface ApiStateResponse {
  messages?: AomiMessage[] | null;
  title?: string | null;
  is_processing?: boolean;
  session_exists?: boolean;
  session_id?: string;
}

/**
 * POST /api/chat
 * Sends a chat message and returns updated session state
 */
export interface ApiChatResponse {
  messages?: AomiMessage[] | null;
  title?: string | null;
  is_processing?: boolean;
}

/**
 * POST /api/system
 * Sends a system message and returns the response message
 */
export interface ApiSystemResponse {
  res?: AomiMessage | null;
}

/**
 * POST /api/interrupt
 * Interrupts current processing and returns updated session state
 */
export type ApiInterruptResponse = ApiChatResponse;

/**
 * GET /api/sessions
 * Returns array of ApiThread
 */
export interface ApiThread {
  session_id: string;
  title: string;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
  last_active_at?: string;
}

/**
 * POST /api/sessions
 * Creates a new thread/session
 */
export interface ApiCreateThreadResponse {
  session_id: string;
  title?: string;
}

// =============================================================================
// SSE Event Types (/api/updates)
// =============================================================================

/**
 * Base SSE event - all events have session_id and type
 */
export type ApiSSEEvent = {
  type: string;
  session_id: string;
  [key: string]: unknown;
};

/**
 * Known SSE event types:
 * - "title_changed": { type, session_id, new_title }
 * - "tool_completion": { type, session_id, ... }
 */
export type ApiSSEEventType = "title_changed" | "tool_completion";

// =============================================================================
// System Events (/api/events)
// =============================================================================

/**
 * GET /api/events
 * Returns async callback events from backend (wallet tx requests, notifications, etc.)
 */
export type ApiSystemEvent = {
  type: string;
  [key: string]: unknown;
};

