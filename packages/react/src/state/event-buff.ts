import { ApiSSEEvent } from "src/backend/types";


/**
 * Flexible event structure - any type, any payload.
 * Consumers use takeByType() to get events they care about.
 */
export type SystemEvent = {
    type: string;
    sessionId: string;
    threadId: string;
    payload: unknown;
    timestamp: number;
};


function sseToSystemEvent(event: ApiSSEEvent, currentThreadId: string): SystemEvent | null {
    switch (event.type) {
        case "title_changed":
            return {
                type: "title_changed",
                sessionId: event.session_id,
                threadId: currentThreadId,
                payload: event.payload,
                timestamp: Date.now(),
            };
        case "tool_completion":
            return {
                type: "tool_completion",
                sessionId: event.session_id,
                threadId: "",
                payload: event.payload,
                timestamp: Date.now(),
            };
        default:
            return null;
    }
}

export type SystemEventBuff = {
    
    inboundQueue: SystemEvent[];
    skipInitialFetch: Set<string>;
    pendingChat: Map<string, string[]>;
    runningThreads: Set<string>;
    creatingThreadId: string | null;
    createThreadPromise: Promise<void> | null;
  };
  