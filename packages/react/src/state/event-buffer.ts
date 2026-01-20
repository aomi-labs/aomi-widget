
export type InboundEvent = {
  type: string;
  sessionId: string;
  payload?: unknown;
  status: "pending" | "fetched";
  timestamp: number;
};

export type OutboundEvent = {
  type: string;
  sessionId: string;
  payload: unknown;
  priority: "high" | "normal";
  timestamp: number;
};

export type SSEStatus = "connected" | "connecting" | "disconnected";

export type EventSubscriber = (event: InboundEvent) => void;


export type EventBuffer = {
  inboundQueue: InboundEvent[];
  outboundQueue: OutboundEvent[];
  sseStatus: SSEStatus;
  lastEventId: string | null;
  subscribers: Map<string, Set<EventSubscriber>>;
};

export function createEventBuffer(): EventBuffer {
  return {
    inboundQueue: [],
    outboundQueue: [],
    sseStatus: "disconnected",
    lastEventId: null,
    subscribers: new Map(),
  };
}

// =============================================================================
// Inbound Queue Helpers
// =============================================================================

export function enqueueInbound(
  state: EventBuffer,
  event: Omit<InboundEvent, "status" | "timestamp">
): void {
  state.inboundQueue.push({
    ...event,
    status: "pending",
    timestamp: Date.now(),
  });
}

export function dequeueInbound(state: EventBuffer): InboundEvent | null {
  return state.inboundQueue.shift() ?? null;
}

export function peekInbound(state: EventBuffer): InboundEvent | null {
  return state.inboundQueue[0] ?? null;
}

export function markFetched(
  state: EventBuffer,
  event: InboundEvent,
  payload: unknown
): void {
  event.status = "fetched";
  event.payload = payload;
}

export function hasInbound(state: EventBuffer): boolean {
  return state.inboundQueue.length > 0;
}

// =============================================================================
// Outbound Queue Helpers
// =============================================================================

export function enqueueOutbound(
  state: EventBuffer,
  event: Omit<OutboundEvent, "timestamp">
): void {
  state.outboundQueue.push({
    ...event,
    timestamp: Date.now(),
  });
}

export function drainOutbound(state: EventBuffer): OutboundEvent[] {
  const events = [...state.outboundQueue];
  state.outboundQueue = [];
  return events;
}

export function hasOutbound(state: EventBuffer): boolean {
  return state.outboundQueue.length > 0;
}

export function hasHighPriorityOutbound(state: EventBuffer): boolean {
  return state.outboundQueue.some((e) => e.priority === "high");
}

// =============================================================================
// Subscription Helpers
// =============================================================================

export function subscribe(
  state: EventBuffer,
  type: string,
  callback: EventSubscriber
): () => void {
  if (!state.subscribers.has(type)) {
    state.subscribers.set(type, new Set());
  }
  state.subscribers.get(type)!.add(callback);

  // Return unsubscribe function
  return () => {
    state.subscribers.get(type)?.delete(callback);
  };
}

export function subscribeAll(
  state: EventBuffer,
  callback: EventSubscriber
): () => void {
  return subscribe(state, "*", callback);
}

export function dispatch(state: EventBuffer, event: InboundEvent): void {
  // Dispatch to specific type subscribers
  const typeSubscribers = state.subscribers.get(event.type);
  if (typeSubscribers) {
    for (const callback of typeSubscribers) {
      callback(event);
    }
  }

  // Dispatch to wildcard subscribers
  const allSubscribers = state.subscribers.get("*");
  if (allSubscribers) {
    for (const callback of allSubscribers) {
      callback(event);
    }
  }
}

// =============================================================================
// SSE Status Helpers
// =============================================================================

export function setSSEStatus(state: EventBuffer, status: SSEStatus): void {
  state.sseStatus = status;
}

export function setLastEventId(state: EventBuffer, id: string): void {
  state.lastEventId = id;
}
