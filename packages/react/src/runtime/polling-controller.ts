import type { MutableRefObject } from "react";

import type { BackendApi } from "../api/client";
import type { SessionMessage, SessionResponsePayload } from "../api/types";
import {
  isThreadReady,
  resolveThreadId,
  setThreadRunning,
  type BakendState,
} from "./backend-state";

type PollingConfig = {
  backendApiRef: MutableRefObject<BackendApi>;
  backendStateRef: MutableRefObject<BakendState>;
  applyMessages: (threadId: string, messages?: SessionMessage[] | null) => void;
  handleSystemEvents?: (
    sessionId: string,
    threadId: string,
    events?: unknown[] | null
  ) => void;
  onStart?: (threadId: string) => void;
  onStop?: (threadId: string) => void;
  intervalMs?: number;
};

export class PollingController {
  private intervals = new Map<string, ReturnType<typeof setInterval>>();
  private intervalMs: number;
  private handleSystemEvents?: (
    sessionId: string,
    threadId: string,
    events?: unknown[] | null
  ) => void;

  constructor(private readonly config: PollingConfig) {
    this.intervalMs = config.intervalMs ?? 500;
    this.handleSystemEvents = config.handleSystemEvents;
  }

  setSystemEventsHandler(
    handler?: (sessionId: string, threadId: string, events?: unknown[] | null) => void
  ) {
    this.handleSystemEvents = handler;
  }

  start(threadId: string) {
    const backendState = this.config.backendStateRef.current;
    if (!isThreadReady(backendState, threadId)) return;
    // Prevent starting if already polling
    if (this.intervals.has(threadId)) {
      return;
    }

    const backendThreadId = resolveThreadId(backendState, threadId);
    setThreadRunning(backendState, threadId, true);

    const tick = async () => {
      // Check if polling was stopped before proceeding (handles race conditions)
      if (!this.intervals.has(threadId)) {
        return;
      }

      try {
        console.log("🔵 [PollingController] Fetching state for threadId:", threadId);
        const state = await this.config.backendApiRef.current.fetchState(backendThreadId);
        
        // Check again after async operation (polling might have been stopped)
        if (!this.intervals.has(threadId)) {
          return;
        }
        
        this.handleState(threadId, state);
      } catch (error) {
        console.error("Polling error:", error);
        this.stop(threadId);
      }
    };

    const intervalId = setInterval(tick, this.intervalMs);
    this.intervals.set(threadId, intervalId);
    
    // Trigger onStart if provided (for setting isRunning state)
    if (this.config.onStart) {
      this.config.onStart(threadId);
    }
  }

  stop(threadId: string) {
    const intervalId = this.intervals.get(threadId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(threadId);
    }
    // Update state immediately to prevent any queued ticks from proceeding
    setThreadRunning(this.config.backendStateRef.current, threadId, false);
    this.config.onStop?.(threadId);
  }

  isPolling(threadId: string): boolean {
    return this.intervals.has(threadId);
  }

  stopAll() {
    for (const threadId of this.intervals.keys()) {
      this.stop(threadId);
    }
  }

  private handleState(threadId: string, state: SessionResponsePayload) {
    if (state.session_exists === false) {
      this.stop(threadId);
      return;
    }

    const backendState = this.config.backendStateRef.current;
    const backendThreadId = resolveThreadId(backendState, threadId);

    // Handle system events if handler is provided
    if (this.handleSystemEvents && state.system_events) {
      this.handleSystemEvents(backendThreadId, threadId, state.system_events);
    }

    this.config.applyMessages(threadId, state.messages);

    // Stop polling if backend explicitly indicates processing is complete
    // or the flag is omitted.
    if (!state.is_processing) {
      this.stop(threadId);
    }
  }
}
