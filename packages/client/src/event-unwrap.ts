// =============================================================================
// System Event Unwrap
// =============================================================================
//
// Converts tagged-enum AomiSystemEvent into a flat { type, payload } object.
// Ported from packages/react/src/contexts/event-context.tsx dispatchSystemEvents.

import type { AomiSystemEvent } from "./types";
import {
  isInlineCall,
  isSystemNotice,
  isSystemError,
  isAsyncCallback,
} from "./types";

export type UnwrappedEvent = {
  type: string;
  payload: unknown;
};

/**
 * Unwrap a tagged-enum AomiSystemEvent from the backend into a flat event.
 *
 * ```ts
 * const event: AomiSystemEvent = { InlineCall: { type: "wallet_tx_request", payload: { to: "0x..." } } };
 * const unwrapped = unwrapSystemEvent(event);
 * // => { type: "wallet_tx_request", payload: { to: "0x..." } }
 * ```
 */
export function unwrapSystemEvent(
  event: AomiSystemEvent,
): UnwrappedEvent | null {
  if (isInlineCall(event)) {
    return {
      type: event.InlineCall.type,
      payload: event.InlineCall.payload ?? event.InlineCall,
    };
  }

  if (isSystemNotice(event)) {
    return {
      type: "system_notice",
      payload: { message: event.SystemNotice },
    };
  }

  if (isSystemError(event)) {
    return {
      type: "system_error",
      payload: { message: event.SystemError },
    };
  }

  if (isAsyncCallback(event)) {
    return {
      type: "async_callback",
      payload: event.AsyncCallback,
    };
  }

  return null;
}
