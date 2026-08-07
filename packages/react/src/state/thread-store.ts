import { generateUUID } from "../utils/uuid";
import { safeEnv } from "../utils/env";
import type { SetStateAction } from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";
import type { AomiTaskActivityEvent, AomiTaskEvent } from "@aomi-labs/client";
import { ThreadContext } from "../contexts/thread-context";

// Fail closed: only log when `process` exists (safeEnv returns a string) and
// NODE_ENV is not production. Pure-browser production builds — where `process`
// is undefined — get `undefined` here and stay silent.
const threadLogEnv = safeEnv(() => process.env.NODE_ENV);
const shouldLogThreadUpdates =
  threadLogEnv !== undefined && threadLogEnv !== "production";

const logThreadMetadataChange = (
  source: string,
  threadId: string,
  prev: ThreadMetadata | undefined,
  next: ThreadMetadata | undefined,
) => {
  if (!shouldLogThreadUpdates) return;
  if (!prev && !next) return;
  if (!prev || !next) {
    console.debug(`[aomi][thread:${source}]`, { threadId, prev, next });
    return;
  }
  if (
    prev.title !== next.title ||
    prev.status !== next.status ||
    prev.lastActiveAt !== next.lastActiveAt
  ) {
    console.debug(`[aomi][thread:${source}]`, { threadId, prev, next });
  }
};

// ============================================================================
// Orchestrator task runs (live sidecar, keyed by agent id)
// ============================================================================

/**
 * A child step observed while a delegated `task` call is running.
 * `childSeq` is the backend's monotonic per-agent counter — it orders the list
 * and dedupes SSE replay after a reconnect.
 */
export type TaskRunStep =
  | {
      kind: "tool_call";
      toolName: string;
      args?: unknown;
      resultPreview?: string;
      childSeq: number;
    }
  | { kind: "note"; text: string; childSeq: number };

export type TaskRunStatus =
  | "running"
  | "completed"
  | "failed"
  | "stalled"
  | "cancelled";

/**
 * Live state for one delegated child agent.
 *
 * Reconciliation contract: while `status === "running"` there is **no**
 * transcript part for this run — the mother's `task` tool message only lands
 * once the child finishes. The UI renders a synthetic row from this state, and
 * once the transcript part carrying the same `agentId` (see
 * `metadata.custom.aomiTask` in `runtime/utils.ts`) arrives it joins the two:
 * the transcript part renders the row, this state supplies steps and summary.
 * On reload there is no sidecar for older runs, so the row degrades to whatever
 * the transcript part alone carries (label + staged count, no steps).
 */
export type TaskRunState = {
  agentId: string;
  callId: string;
  label: string;
  app: string | null;
  status: TaskRunStatus;
  /** Client clock at `task_started` (backend sends no start timestamp). */
  startedAt: number;
  /** Ordered by `childSeq`, deduped. */
  steps: TaskRunStep[];
  message?: string;
  stagedCount?: number;
  durationMs?: number;
  /**
   * Step count reported by `task_completed`. May exceed `steps.length` when
   * activity events were dropped (e.g. the tab was backgrounded mid-run).
   */
  stepCount?: number;
};

/** All live/finished task runs for one thread, keyed by agent id. */
export type ThreadTaskRuns = Record<string, TaskRunState>;

export const EMPTY_TASK_RUNS: ThreadTaskRuns = Object.freeze({});

const toStatus = (status: string): TaskRunStatus => {
  switch (status) {
    case "failed":
    case "stalled":
    case "cancelled":
    case "completed":
      return status;
    default:
      return "completed";
  }
};

const toStep = (event: AomiTaskActivityEvent): TaskRunStep =>
  event.kind === "note"
    ? { kind: "note", text: event.text ?? "", childSeq: event.child_seq }
    : {
        kind: "tool_call",
        toolName: event.tool_name ?? "unknown",
        childSeq: event.child_seq,
        ...(event.args !== undefined ? { args: event.args } : null),
        ...(event.result_preview !== undefined
          ? { resultPreview: event.result_preview }
          : null),
      };

/** Insert a step ordered by `childSeq`; drop it if that seq is already known. */
const insertStep = (steps: TaskRunStep[], step: TaskRunStep): TaskRunStep[] => {
  let index = steps.length;
  for (let i = steps.length - 1; i >= 0; i--) {
    const existing = steps[i]!;
    if (existing.childSeq === step.childSeq) return steps; // replay — idempotent
    if (existing.childSeq < step.childSeq) break;
    index = i;
  }
  const next = steps.slice();
  next.splice(index, 0, step);
  return next;
};

/** Placeholder for an agent whose `task_started` has not arrived (or was lost). */
const initTaskRun = (
  agentId: string,
  callId: string,
  startedAt: number,
): TaskRunState => ({
  agentId,
  callId,
  label: "",
  app: null,
  status: "running",
  startedAt,
  steps: [],
});

/**
 * Fold one delegation event into a thread's task runs.
 *
 * Pure and idempotent: replaying the same SSE window (which the backend does
 * after a reconnect via `Last-Event-ID`) returns the identical object, so React
 * consumers do not re-render. Events may also arrive out of order — an activity
 * or completion before `task_started` creates a placeholder run that the later
 * `task_started` fills in without discarding collected steps.
 */
export function reduceTaskRuns(
  runs: ThreadTaskRuns,
  event: AomiTaskEvent,
  now: number = Date.now(),
): ThreadTaskRuns {
  const agentId = event.agent_id;
  if (!agentId) return runs;
  const existing = runs[agentId];

  if (event.type === "task_started") {
    const app = event.app ?? null;
    const label = event.label ?? "";
    if (existing) {
      // Replay of a started event: keep the run's own clock, steps and any
      // terminal status already reached; only fill in identity fields.
      if (
        existing.label === label &&
        existing.app === app &&
        existing.callId === event.call_id
      ) {
        return runs;
      }
      return {
        ...runs,
        [agentId]: { ...existing, label, app, callId: event.call_id },
      };
    }
    return {
      ...runs,
      [agentId]: {
        ...initTaskRun(agentId, event.call_id, now),
        label,
        app,
      },
    };
  }

  if (event.type === "task_activity") {
    const base = existing ?? initTaskRun(agentId, event.call_id, now);
    const steps = insertStep(base.steps, toStep(event));
    if (existing && steps === existing.steps) return runs; // duplicate child_seq
    return { ...runs, [agentId]: { ...base, steps } };
  }

  const base = existing ?? initTaskRun(agentId, event.call_id, now);
  const next: TaskRunState = {
    ...base,
    status: toStatus(event.status),
    ...(event.message !== undefined ? { message: event.message } : null),
    ...(event.staged_count !== undefined
      ? { stagedCount: event.staged_count }
      : null),
    ...(event.steps !== undefined ? { stepCount: event.steps } : null),
    ...(event.duration_ms !== undefined
      ? { durationMs: event.duration_ms }
      : null),
  };
  if (
    existing &&
    existing.status === next.status &&
    existing.message === next.message &&
    existing.stagedCount === next.stagedCount &&
    existing.stepCount === next.stepCount &&
    existing.durationMs === next.durationMs
  ) {
    return runs;
  }
  return { ...runs, [agentId]: next };
}

export type ThreadStatus = "regular" | "archived";
export type ModelSelectionMode = "auto" | "manual";
export type ThreadTurnPhase = "idle" | "submitting" | "working";

export type ThreadControlState = {
  /** Selected model for this thread (human-readable label) */
  model: string | null;
  /** Whether the selected model should be displayed as auto or explicit */
  modelMode?: ModelSelectionMode;
  /** Selected app for this thread */
  app: string | null;
  /** Concrete backend application row for hosted/platform apps */
  applicationId: number | string | null;
  /** Whether control state has changed but chat hasn't started yet */
  controlDirty: boolean;
  /** Whether this thread is currently processing (assistant generating) */
  isProcessing: boolean;
  /** Fine-grained turn phase for rendering pending/working assistant states */
  turnPhase: ThreadTurnPhase;
  /** Epoch ms when the latest assistant turn completed in this thread. */
  lastCompletedAt?: number;
};

export type ThreadMetadata = {
  title: string;
  status: ThreadStatus;
  lastActiveAt?: string | number;
  /** Per-thread control state (model, app selection) */
  control: ThreadControlState;
};

/** Create default control state for a new thread */
export function initThreadControl(): ThreadControlState {
  return {
    model: null,
    modelMode: "auto",
    app: null,
    applicationId: null,
    controlDirty: false,
    isProcessing: false,
    turnPhase: "idle",
  };
}

type ThreadStoreState = {
  currentThreadId: string;
  threadViewKey: number;
  threadCnt: number;
  threads: Map<string, ThreadMessageLike[]>;
  threadMetadata: Map<string, ThreadMetadata>;
  /** Live delegation sidecar, per thread, keyed by agent id. */
  threadTaskRuns: Map<string, ThreadTaskRuns>;
};

type ThreadStoreOptions = {
  initialThreadId?: string;
};

export class ThreadStore {
  private state: ThreadStoreState;
  private listeners = new Set<() => void>();
  private snapshot: ThreadContext;

  constructor(options?: ThreadStoreOptions) {
    const initialThreadId = options?.initialThreadId ?? generateUUID();
    this.state = {
      currentThreadId: initialThreadId,
      threadViewKey: 0,
      threadCnt: 1,
      threads: new Map([[initialThreadId, []]]),
      threadMetadata: new Map([
        [
          initialThreadId,
          {
            title: "New Chat",
            status: "regular",
            lastActiveAt: new Date().toISOString(),
            control: initThreadControl(),
          },
        ],
      ]),
      threadTaskRuns: new Map(),
    };

    this.snapshot = this.buildSnapshot();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): ThreadContext => this.snapshot;

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private resolveStateAction<T>(updater: SetStateAction<T>, current: T): T {
    return typeof updater === "function"
      ? (updater as (prev: T) => T)(current)
      : updater;
  }

  private ensureThreadExists(threadId: string) {
    if (!this.state.threadMetadata.has(threadId)) {
      const nextMetadata = new Map(this.state.threadMetadata);
      nextMetadata.set(threadId, {
        title: "New Chat",
        status: "regular",
        lastActiveAt: new Date().toISOString(),
        control: initThreadControl(),
      });
      this.state = { ...this.state, threadMetadata: nextMetadata };
    }

    if (!this.state.threads.has(threadId)) {
      const nextThreads = new Map(this.state.threads);
      nextThreads.set(threadId, []);
      this.state = { ...this.state, threads: nextThreads };
    }
  }

  private updateState(partial: Partial<ThreadStoreState>) {
    this.state = { ...this.state, ...partial };
    this.snapshot = this.buildSnapshot();
    this.emit();
  }

  private buildSnapshot(): ThreadContext {
    return {
      currentThreadId: this.state.currentThreadId,
      setCurrentThreadId: this.setCurrentThreadId,
      threadViewKey: this.state.threadViewKey,
      bumpThreadViewKey: this.bumpThreadViewKey,
      allThreads: this.state.threads,
      setThreads: this.setThreads,
      allThreadsMetadata: this.state.threadMetadata,
      setThreadMetadata: this.setThreadMetadata,
      threadCnt: this.state.threadCnt,
      setThreadCnt: this.setThreadCnt,
      getThreadMessages: this.getThreadMessages,
      setThreadMessages: this.setThreadMessages,
      getThreadMetadata: this.getThreadMetadata,
      updateThreadMetadata: this.updateThreadMetadata,
      allThreadTaskRuns: this.state.threadTaskRuns,
      getThreadTaskRuns: this.getThreadTaskRuns,
      applyTaskEvent: this.applyTaskEvent,
      clearThreadTaskRuns: this.clearThreadTaskRuns,
      resetToDefault: this.resetToDefault,
    };
  }

  setCurrentThreadId = (threadId: string) => {
    this.ensureThreadExists(threadId);
    this.updateState({ currentThreadId: threadId });
  };

  bumpThreadViewKey = () => {
    this.updateState({ threadViewKey: this.state.threadViewKey + 1 });
  };

  setThreadCnt = (updater: SetStateAction<number>) => {
    const nextCnt = this.resolveStateAction(updater, this.state.threadCnt);
    this.updateState({ threadCnt: nextCnt });
  };

  setThreads = (updater: SetStateAction<Map<string, ThreadMessageLike[]>>) => {
    const nextThreads = this.resolveStateAction(updater, this.state.threads);
    this.updateState({ threads: new Map(nextThreads) });
  };

  setThreadMetadata = (
    updater: SetStateAction<Map<string, ThreadMetadata>>,
  ) => {
    const prevMetadata = this.state.threadMetadata;
    const nextMetadata = this.resolveStateAction(updater, prevMetadata);
    for (const [threadId, next] of nextMetadata.entries()) {
      logThreadMetadataChange(
        "setThreadMetadata",
        threadId,
        prevMetadata.get(threadId),
        next,
      );
    }
    for (const [threadId, prev] of prevMetadata.entries()) {
      if (!nextMetadata.has(threadId)) {
        logThreadMetadataChange("setThreadMetadata", threadId, prev, undefined);
      }
    }
    this.updateState({ threadMetadata: new Map(nextMetadata) });
  };

  setThreadMessages = (threadId: string, messages: ThreadMessageLike[]) => {
    this.ensureThreadExists(threadId);
    const nextThreads = new Map(this.state.threads);
    nextThreads.set(threadId, messages);
    this.updateState({ threads: nextThreads });
  };

  getThreadMessages = (threadId: string): ThreadMessageLike[] => {
    return this.state.threads.get(threadId) ?? [];
  };

  getThreadMetadata = (threadId: string): ThreadMetadata | undefined => {
    return this.state.threadMetadata.get(threadId);
  };

  getThreadTaskRuns = (threadId: string): ThreadTaskRuns => {
    return this.state.threadTaskRuns.get(threadId) ?? EMPTY_TASK_RUNS;
  };

  /**
   * Fold a delegation SSE event into the thread's task-run sidecar. No-ops when
   * the reducer returns the same object (replayed / duplicate events), so an
   * SSE replay after reconnect never re-renders the trace.
   */
  applyTaskEvent = (threadId: string, event: AomiTaskEvent) => {
    const current = this.state.threadTaskRuns.get(threadId) ?? EMPTY_TASK_RUNS;
    const next = reduceTaskRuns(current, event);
    if (next === current) return;
    const nextTaskRuns = new Map(this.state.threadTaskRuns);
    nextTaskRuns.set(threadId, next);
    this.updateState({ threadTaskRuns: nextTaskRuns });
  };

  clearThreadTaskRuns = (threadId: string) => {
    if (!this.state.threadTaskRuns.has(threadId)) return;
    const nextTaskRuns = new Map(this.state.threadTaskRuns);
    nextTaskRuns.delete(threadId);
    this.updateState({ threadTaskRuns: nextTaskRuns });
  };

  /** Reset store to a single empty "New Chat" thread (e.g. on wallet disconnect). */
  resetToDefault = () => {
    const threadId = generateUUID();
    this.state = {
      currentThreadId: threadId,
      threadViewKey: this.state.threadViewKey + 1,
      threadCnt: 1,
      threads: new Map([[threadId, []]]),
      threadMetadata: new Map([
        [
          threadId,
          {
            title: "New Chat",
            status: "regular",
            lastActiveAt: new Date().toISOString(),
            control: initThreadControl(),
          },
        ],
      ]),
      threadTaskRuns: new Map(),
    };
    this.snapshot = this.buildSnapshot();
    this.emit();
    return threadId;
  };

  updateThreadMetadata = (
    threadId: string,
    updates: Partial<ThreadMetadata>,
  ) => {
    const existing = this.state.threadMetadata.get(threadId);
    if (!existing) {
      return;
    }
    const next = { ...existing, ...updates };
    const nextMetadata = new Map(this.state.threadMetadata);
    nextMetadata.set(threadId, next);
    logThreadMetadataChange("updateThreadMetadata", threadId, existing, next);
    this.updateState({ threadMetadata: nextMetadata });
  };
}
