// Re-export all API types from the portable client package.
// The React package adds no additional API types.
export type {
  AomiMessage,
  ApiChatResponse,
  ApiCreateThreadResponse,
  ApiInterruptResponse,
  ApiSSEEvent,
  ApiSSEEventType,
  ApiStateResponse,
  ApiSystemEvent,
  ApiSystemResponse,
  ApiThread,
} from "@aomi-labs/client";

export {
  isAsyncCallback,
  isInlineCall,
  isSystemError,
  isSystemNotice,
} from "@aomi-labs/client";
