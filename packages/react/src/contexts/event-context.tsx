"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import type { AomiClient, AomiSSEEvent, AomiSystemEvent } from "@aomi-labs/client";
import {
  isInlineCall,
  isSystemNotice,
  isSystemError,
  isAsyncCallback,
} from "@aomi-labs/client";
import {
  createEventBuffer,
  dispatch,
  enqueueInbound,
  setSSEStatus,
  subscribe as subscribeToBuffer,
  type EventBuffer,
  type EventSubscriber,
  type InboundEvent,
  type OutboundEvent,
  type SSEStatus,
} from "../state/event-buffer";
// =============================================================================
// Context Type
// =============================================================================

export type EventContext = {
  /** Subscribe to inbound events by type. Returns unsubscribe function. */
  subscribe: (type: string, callback: EventSubscriber) => () => void;
  /** Send an outbound event to backend immediately */
  sendOutboundSystem: (event: Omit<OutboundEvent, "timestamp">) => Promise<void>;
  /** Dispatch system events from HTTP polling into the event buffer */
  dispatchInboundSystem: (sessionId: string, events: AomiSystemEvent[]) => void;
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

export function EventContextProvider({
  children,
  aomiClient,
  sessionId,
}: EventContextProviderProps) {
  const bufferRef = useRef<EventBuffer | null>(null);
  if (!bufferRef.current) {
    bufferRef.current = createEventBuffer();
  }
  const buffer = bufferRef.current!;

  const [sseStatus, setSseStatus] = useState<SSEStatus>("disconnected");

  // ---------------------------------------------------------------------------
  // SSE Subscription (reconnects when sessionId changes)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setSSEStatus(buffer, "connecting");
    setSseStatus("connecting");

    const unsubscribe = aomiClient.subscribeSSE(
      sessionId,
      (event: AomiSSEEvent) => {
        enqueueInbound(buffer, {
          type: event.type,
          sessionId: event.session_id,
          payload: event,
        });

        const inboundEvent: InboundEvent = {
          type: event.type,
          sessionId: event.session_id,
          payload: event,
          status: "fetched",
          timestamp: Date.now(),
        };
        dispatch(buffer, inboundEvent);
      },
      (error) => {
        console.error("SSE error:", error);
        setSSEStatus(buffer, "disconnected");
        setSseStatus("disconnected");
      },
    );

    setSSEStatus(buffer, "connected");
    setSseStatus("connected");

    return () => {
      unsubscribe();
      setSSEStatus(buffer, "disconnected");
      setSseStatus("disconnected");
    };
  }, [aomiClient, sessionId, buffer]);

  // ---------------------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------------------
  const subscribeCallback = useCallback(
    (type: string, callback: EventSubscriber) => {
      return subscribeToBuffer(buffer, type, callback);
    },
    [buffer],
  );

  const sendOutbound = useCallback(
    async (event: Omit<OutboundEvent, "timestamp">) => {
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

  const dispatchSystemEvents = useCallback(
    (sessionId: string, events: AomiSystemEvent[]) => {
      for (const event of events) {
        let eventType: string;
        let payload: unknown;

        // Unwrap the tagged enum from backend serialization
        if (isInlineCall(event)) {
          // InlineCall has inner type like "wallet_tx_request"
          eventType = event.InlineCall.type;
          payload = event.InlineCall.payload ?? event.InlineCall;
        } else if (isSystemNotice(event)) {
          eventType = "system_notice";
          payload = { message: event.SystemNotice };
        } else if (isSystemError(event)) {
          eventType = "system_error";
          payload = { message: event.SystemError };
        } else if (isAsyncCallback(event)) {
          eventType = "async_callback";
          payload = event.AsyncCallback;
        } else {
          console.warn("Unknown system event type:", event);
          continue;
        }

        const inboundEvent: InboundEvent = {
          type: eventType,
          sessionId,
          payload,
          status: "fetched",
          timestamp: Date.now(),
        };
        enqueueInbound(buffer, {
          type: eventType,
          sessionId,
          payload,
        });
        dispatch(buffer, inboundEvent);
      }
    },
    [buffer],
  );

  const contextValue: EventContext = {
    subscribe: subscribeCallback,
    sendOutboundSystem: sendOutbound,
    dispatchInboundSystem: dispatchSystemEvents,
    sseStatus,
  };

  return (
    <EventContextState.Provider value={contextValue}>
      {children}
    </EventContextState.Provider>
  );
}
