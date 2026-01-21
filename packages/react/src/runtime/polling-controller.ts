import type { MutableRefObject } from "react";

import type { BackendApi } from "../backend/client";
import type {
  AomiMessage,
  ApiStateResponse,
  ApiSystemEvent,
} from "../backend/types";
import {
  isThreadReady,
  resolveThreadId,
  setThreadRunning,
  type BakendState,
} from "../state/backend-state";

type PollingConfig = {
  backendApiRef: MutableRefObject<BackendApi>;
  backendStateRef: MutableRefObject<BakendState>;
  applyMessages: (threadId: string, messages?: AomiMessage[] | null) => void;
  onSystemEvents?: (sessionId: string, events: ApiSystemEvent[]) => void;
  onStart?: (threadId: string) => void;
  onStop?: (threadId: string) => void;
  intervalMs?: number;
};

export class PollingController {
  private intervals = new Map<string, ReturnType<typeof setInterval>>();
  private intervalMs: number;

  constructor(private readonly config: PollingConfig) {
    this.intervalMs = config.intervalMs ?? 500;
  }

  start(threadId: string) {
    const backendState = this.config.backendStateRef.current;
    if (!isThreadReady(backendState, threadId)) return;
    if (this.intervals.has(threadId)) return;

    const backendThreadId = resolveThreadId(backendState, threadId);
    setThreadRunning(backendState, threadId, true);

    const tick = async () => {
      if (!this.intervals.has(threadId)) return;

      try {
        console.log(
          "[PollingController] Fetching state for threadId:",
          threadId,
        );
        const state =
          await this.config.backendApiRef.current.fetchState(backendThreadId);

        if (!this.intervals.has(threadId)) return;

        this.handleState(threadId, state);
      } catch (error) {
        console.error("Polling error:", error);
        this.stop(threadId);
      }
    };

    const intervalId = setInterval(tick, this.intervalMs);
    this.intervals.set(threadId, intervalId);

    this.config.onStart?.(threadId);
  }

  stop(threadId: string) {
    const intervalId = this.intervals.get(threadId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(threadId);
    }
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

  private handleState(threadId: string, state: ApiStateResponse) {
    if (state.session_exists === false) {
      this.stop(threadId);
      return;
    }

    // Dispatch system events (wallet_tx_request, errors, etc.)
    if (state.system_events?.length && this.config.onSystemEvents) {
      const backendState = this.config.backendStateRef.current;
      const sessionId = resolveThreadId(backendState, threadId);
      this.config.onSystemEvents(sessionId, state.system_events);
    }

    this.config.applyMessages(threadId, state.messages);

    if (!state.is_processing) {
      this.stop(threadId);
    }
  }
}
