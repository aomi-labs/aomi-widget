"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
} from "react";
import type { ReactNode } from "react";

import type { AomiClient } from "@aomi-labs/client";

// =============================================================================
// Lightweight event subscriber types (replaces event-buffer.ts)
// =============================================================================

export type InboundEvent = {
  type: string;
  sessionId: string;
  payload?: unknown;
};

export type SSEStatus = "connected" | "connecting" | "disconnected";

export type EventSubscriber = (event: InboundEvent) => void;

// =============================================================================
// Context Type
// =============================================================================

export type EventContext = {
  /** Subscribe to events by type. Returns unsubscribe function. */
  subscribe: (type: string, callback: EventSubscriber) => () => void;
  /** Dispatch an event to all matching subscribers (used by orchestrator) */
  dispatch: (event: InboundEvent) => void;
  /** Send an outbound system message to backend */
  sendOutboundSystem: (event: { type: string; sessionId: string; payload: unknown }) => Promise<void>;
  /** Current SSE connection status */
  sseStatus: SSEStatus;
};

const EventContextState = createContext<EventContext | null>(null);

// =============================================================================
// Hook
// =============================================================================

export function useEventContext(): EventContext {
  const context = useContext(EventContextState);
  if (!context) {
    throw new Error(
      "useEventContext must be used within EventContextProvider. " +
        "Wrap your app with <EventContextProvider>...</EventContextProvider>",
    );
  }
  return context;
}

// =============================================================================
// Provider Props
// =============================================================================

export type EventContextProviderProps = {
  children: ReactNode;
  aomiClient: AomiClient;
  sessionId: string;
};

// =============================================================================
// Provider
// =============================================================================

/**
 * Simplified EventContext — a pure pub/sub relay.
 *
 * SSE subscription and system event unwrapping are now handled by ClientSession
 * in the orchestrator. This provider just maintains the subscriber registry
 * and sendOutboundSystem for direct system messages.
 */
export function EventContextProvider({
  children,
  aomiClient,
  sessionId,
}: EventContextProviderProps) {
  const subscribersRef = useRef<Map<string, Set<EventSubscriber>>>(new Map());

  const subscribe = useCallback(
    (type: string, callback: EventSubscriber) => {
      const subs = subscribersRef.current;
      if (!subs.has(type)) {
        subs.set(type, new Set());
      }
      subs.get(type)!.add(callback);
      return () => {
        subs.get(type)?.delete(callback);
      };
    },
    [],
  );

  const dispatchEvent = useCallback((event: InboundEvent) => {
    const subs = subscribersRef.current;

    // Type-specific subscribers
    const typeSubs = subs.get(event.type);
    if (typeSubs) {
      for (const cb of typeSubs) cb(event);
    }

    // Wildcard subscribers
    const wildcardSubs = subs.get("*");
    if (wildcardSubs) {
      for (const cb of wildcardSubs) cb(event);
    }
  }, []);

  const sendOutbound = useCallback(
    async (event: { type: string; sessionId: string; payload: unknown }) => {
      try {
        const message = JSON.stringify({
          type: event.type,
          payload: event.payload,
        });
        await aomiClient.sendSystemMessage(event.sessionId, message);
      } catch (error) {
        console.error("Failed to send outbound event:", error);
      }
    },
    [aomiClient],
  );

  const contextValue: EventContext = {
    subscribe,
    dispatch: dispatchEvent,
    sendOutboundSystem: sendOutbound,
    // SSE is managed by ClientSession now — status is always "connected"
    // when sessions are active. Individual session status can be queried
    // from the session manager if needed.
    sseStatus: "connected",
  };

  return (
    <EventContextState.Provider value={contextValue}>
      {children}
    </EventContextState.Provider>
  );
}
