// =============================================================================
// Client
// =============================================================================

export { AomiClient } from "./client";

// =============================================================================
// Types
// =============================================================================

export type {
  AomiClientOptions,
  AomiMessage,
  AomiChatResponse,
  AomiCreateThreadResponse,
  AomiInterruptResponse,
  AomiSSEEvent,
  AomiSSEEventType,
  AomiStateResponse,
  AomiSystemEvent,
  AomiSystemResponse,
  AomiThread,
  Logger,
  UserState,
} from "./types";

// =============================================================================
// Type Guards
// =============================================================================

export {
  isAsyncCallback,
  isInlineCall,
  isSystemError,
  isSystemNotice,
} from "./types";

// =============================================================================
// Session (high-level orchestrated client)
// =============================================================================

export { Session } from "./session";

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

export { TypedEventEmitter } from "./event-emitter";
export { unwrapSystemEvent, type UnwrappedEvent } from "./event-unwrap";

// =============================================================================
// Wallet Utilities
// =============================================================================

export {
  normalizeTxPayload,
  normalizeEip712Payload,
} from "./wallet-utils";

export type {
  WalletTxPayload,
  WalletEip712Payload,
} from "./wallet-utils";
