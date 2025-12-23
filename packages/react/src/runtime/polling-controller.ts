import type { MutableRefObject } from "react";

import type { BackendApi } from "../api/client";
import type { SessionMessage, SessionResponsePayload } from "../api/types";
import {
  isThreadReady,
  resolveThreadId,
  setThreadRunning,
  type ThreadRuntimeState,
} from "./runtime-state";

type PollingConfig = {
  backendApiRef: MutableRefObject<BackendApi>;
  runtimeStateRef: MutableRefObject<ThreadRuntimeState>;
  applyMessages: (threadId: string, messages?: SessionMessage[] | null) => void;
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
    const runtimeState = this.config.runtimeStateRef.current;
    if (!isThreadReady(runtimeState, threadId)) return;
    if (this.intervals.has(threadId)) return;

    const backendThreadId = resolveThreadId(runtimeState, threadId);
    setThreadRunning(runtimeState, threadId, true);

    const tick = async () => {
      try {
        const state = await this.config.backendApiRef.current.fetchState(backendThreadId);
        this.handleState(threadId, state);
      } catch (error) {
        console.error("Polling error:", error);
        this.stop(threadId);
      }
    };

    const intervalId = setInterval(tick, this.intervalMs);
    this.intervals.set(threadId, intervalId);
  }

  stop(threadId: string) {
    const intervalId = this.intervals.get(threadId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(threadId);
    }
    setThreadRunning(this.config.runtimeStateRef.current, threadId, false);
    this.config.onStop?.(threadId);
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

    this.config.applyMessages(threadId, state.messages);

    if (!state.is_processing) {
      this.stop(threadId);
    }
  }
}
