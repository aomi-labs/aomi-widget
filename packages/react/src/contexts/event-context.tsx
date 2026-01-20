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

import type { BackendApi } from "../backend/client";
import type { ApiSSEEvent, ApiSystemEvent } from "../backend/types";
import {
  createEventBuffer,
  dispatch,
  enqueueInbound,
  enqueueOutbound,
  drainOutbound,
  hasHighPriorityOutbound,
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
  /** Enqueue an outbound event to be sent to backend */
  enqueueOutbound: (event: Omit<OutboundEvent, "timestamp">) => void;
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
        "Wrap your app with <EventContextProvider>...</EventContextProvider>"
    );
  }
  return context;
}

// =============================================================================
// Provider Props
// =============================================================================

export type EventContextProviderProps = {
  children: ReactNode;
  backendApi: BackendApi;
  sessionId: string;
};

// =============================================================================
// Provider
// =============================================================================

const FLUSH_INTERVAL_MS = 1000;
const POLL_INTERVAL_MS = 2000;

export function EventContextProvider({
  children,
  backendApi,
  sessionId,
}: EventContextProviderProps) {
  const bufferRef = useRef<EventBuffer | null>(null);
  if (!bufferRef.current) {
    bufferRef.current = createEventBuffer();
  }
  const buffer = bufferRef.current;

  const [sseStatus, setSseStatus] = useState<SSEStatus>("disconnected");

  // ---------------------------------------------------------------------------
  // SSE Subscription
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setSSEStatus(buffer, "connecting");
    setSseStatus("connecting");

    const unsubscribe = backendApi.subscribeSSE(
      (event: ApiSSEEvent) => {
        // Convert SSE event to inbound event and enqueue
        enqueueInbound(buffer, {
          type: event.type,
          sessionId: event.session_id,
          payload: event, // Store raw event, handler can fetch more if needed
        });

        // Immediately dispatch to subscribers
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
      }
    );

    // Mark as connected after subscription
    setSSEStatus(buffer, "connected");
    setSseStatus("connected");

    return () => {
      unsubscribe();
      setSSEStatus(buffer, "disconnected");
      setSseStatus("disconnected");
    };
  }, [backendApi, buffer]);

  // ---------------------------------------------------------------------------
  // System Events Polling (GET /api/events)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const pollSystemEvents = async () => {
      try {
        const events = await backendApi.getSystemEvents(sessionId);
        for (const event of events) {
          const inboundEvent: InboundEvent = {
            type: event.type,
            sessionId,
            payload: event,
            status: "fetched",
            timestamp: Date.now(),
          };
          enqueueInbound(buffer, {
            type: event.type,
            sessionId,
            payload: event,
          });
          dispatch(buffer, inboundEvent);
        }
      } catch (error) {
        // Silently ignore polling errors (session may not exist yet)
        console.debug("System events poll:", error);
      }
    };

    const intervalId = setInterval(pollSystemEvents, POLL_INTERVAL_MS);
    // Initial poll
    void pollSystemEvents();

    return () => clearInterval(intervalId);
  }, [backendApi, buffer, sessionId]);

  // ---------------------------------------------------------------------------
  // Outbound Flush Timer
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const flushOutbound = async () => {
      const events = drainOutbound(buffer);
      if (events.length === 0) return;

      try {
        // TODO: POST to /api/events when endpoint is ready
        console.log("📤 Flushing outbound events:", events);
        // await backendApi.postEvents(sessionId, events);
      } catch (error) {
        console.error("Failed to flush outbound events:", error);
        // Re-enqueue failed events
        for (const event of events) {
          enqueueOutbound(buffer, event);
        }
      }
    };

    const intervalId = setInterval(() => {
      if (hasHighPriorityOutbound(buffer)) {
        void flushOutbound();
      }
    }, FLUSH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      // Flush remaining on cleanup
      void flushOutbound();
    };
  }, [buffer, sessionId]);

  // ---------------------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------------------
  const subscribeCallback = useCallback(
    (type: string, callback: EventSubscriber) => {
      return subscribeToBuffer(buffer, type, callback);
    },
    [buffer]
  );

  const enqueueOutboundCallback = useCallback(
    (event: Omit<OutboundEvent, "timestamp">) => {
      enqueueOutbound(buffer, event);

      // Immediate flush for high priority
      if (event.priority === "high") {
        const events = drainOutbound(buffer);
        if (events.length > 0) {
          // TODO: POST to /api/events when endpoint is ready
          console.log("📤 Immediate flush (high priority):", events);
          // void backendApi.postEvents(sessionId, events);
        }
      }
    },
    [buffer]
  );

  const contextValue: EventContext = {
    subscribe: subscribeCallback,
    enqueueOutbound: enqueueOutboundCallback,
    sseStatus,
  };

  return (
    <EventContextState.Provider value={contextValue}>
      {children}
    </EventContextState.Provider>
  );
}
