import { describe, expect, it } from "vitest";
import type {
  AomiTaskActivityEvent,
  AomiTaskCompletedEvent,
  AomiTaskStartedEvent,
} from "@aomi-labs/client";

import {
  EMPTY_TASK_RUNS,
  ThreadStore,
  reduceTaskRuns,
  type ThreadTaskRuns,
} from "../thread-store";

const AGENT = "task-agent:9f2c";

const started = (
  overrides: Partial<AomiTaskStartedEvent> = {},
): AomiTaskStartedEvent => ({
  type: "task_started",
  call_id: "call-1",
  agent_id: AGENT,
  label: "swap-worker",
  app: "default",
  resumed: false,
  ...overrides,
});

const activity = (
  childSeq: number,
  overrides: Partial<AomiTaskActivityEvent> = {},
): AomiTaskActivityEvent => ({
  type: "task_activity",
  call_id: "call-1",
  agent_id: AGENT,
  kind: "tool_call",
  tool_name: `tool_${childSeq}`,
  args: { i: childSeq },
  result_preview: `preview ${childSeq}`,
  child_seq: childSeq,
  ...overrides,
});

const completed = (
  overrides: Partial<AomiTaskCompletedEvent> = {},
): AomiTaskCompletedEvent => ({
  type: "task_completed",
  call_id: "call-1",
  agent_id: AGENT,
  status: "completed",
  message: "staged 1 swap, simulation passed",
  staged_count: 1,
  steps: 4,
  duration_ms: 12400,
  ...overrides,
});

const replay = (
  events: Array<
    AomiTaskStartedEvent | AomiTaskActivityEvent | AomiTaskCompletedEvent
  >,
  initial: ThreadTaskRuns = EMPTY_TASK_RUNS,
  now = 1_000,
): ThreadTaskRuns =>
  events.reduce((runs, event) => reduceTaskRuns(runs, event, now), initial);

describe("reduceTaskRuns", () => {
  it("runs the happy path: started → activity → completed", () => {
    const runs = replay(
      [
        started(),
        activity(1),
        activity(2, { kind: "note", text: "Quote locked" }),
        completed(),
      ],
      EMPTY_TASK_RUNS,
      5_000,
    );

    expect(runs[AGENT]).toEqual({
      agentId: AGENT,
      callId: "call-1",
      label: "swap-worker",
      app: "default",
      status: "completed",
      startedAt: 5_000,
      steps: [
        {
          kind: "tool_call",
          toolName: "tool_1",
          args: { i: 1 },
          resultPreview: "preview 1",
          childSeq: 1,
        },
        { kind: "note", text: "Quote locked", childSeq: 2 },
      ],
      message: "staged 1 swap, simulation passed",
      stagedCount: 1,
      stepCount: 4,
      durationMs: 12400,
    });
  });

  it("records the client clock at task_started", () => {
    const runs = reduceTaskRuns(EMPTY_TASK_RUNS, started(), 1_735_000_000_000);
    expect(runs[AGENT]!.startedAt).toBe(1_735_000_000_000);
    expect(runs[AGENT]!.status).toBe("running");
  });

  it("dedupes replayed child_seq and returns the identical object", () => {
    const afterFirst = replay([started(), activity(1), activity(2)]);
    const afterReplay = replay([activity(1), activity(2)], afterFirst);

    expect(afterReplay).toBe(afterFirst);
    expect(afterReplay[AGENT]!.steps).toHaveLength(2);
  });

  it("is idempotent for a full replayed SSE window after a reconnect", () => {
    const events = [started(), activity(1), activity(2), completed()];
    const first = replay(events);
    const second = replay(events, first);

    expect(second).toBe(first);
    expect(second[AGENT]!.steps.map((s) => s.childSeq)).toEqual([1, 2]);
  });

  it("orders out-of-order activity by childSeq", () => {
    const runs = replay([started(), activity(3), activity(1), activity(2)]);
    expect(runs[AGENT]!.steps.map((s) => s.childSeq)).toEqual([1, 2, 3]);
  });

  it("creates a placeholder run when activity arrives before task_started", () => {
    const early = replay([activity(1)], EMPTY_TASK_RUNS, 2_000);
    expect(early[AGENT]).toMatchObject({
      label: "",
      app: null,
      status: "running",
      startedAt: 2_000,
    });

    const filled = reduceTaskRuns(early, started(), 9_999);
    expect(filled[AGENT]).toMatchObject({
      label: "swap-worker",
      app: "default",
      // The placeholder's clock wins — a late task_started must not restart it.
      startedAt: 2_000,
    });
    expect(filled[AGENT]!.steps).toHaveLength(1);
  });

  it("does not resurrect a finished run when task_started is replayed", () => {
    const done = replay([started(), completed({ status: "failed" })]);
    const afterReplay = reduceTaskRuns(done, started());

    expect(afterReplay).toBe(done);
    expect(afterReplay[AGENT]!.status).toBe("failed");
  });

  it("keeps steps that land after task_completed", () => {
    const runs = replay([started(), completed(), activity(1)]);
    expect(runs[AGENT]!.status).toBe("completed");
    expect(runs[AGENT]!.steps).toHaveLength(1);
  });

  it("maps every terminal status", () => {
    for (const status of [
      "completed",
      "failed",
      "stalled",
      "cancelled",
    ] as const) {
      const runs = replay([started(), completed({ status })]);
      expect(runs[AGENT]!.status).toBe(status);
    }
  });

  it("keeps parallel agents independent", () => {
    const other = "task-agent:aaaa";
    const runs = replay([
      started(),
      started({ agent_id: other, call_id: "call-2", label: "quote-worker" }),
      activity(1),
      activity(1, { agent_id: other, tool_name: "get_quote" }),
      completed(),
    ]);

    expect(Object.keys(runs).sort()).toEqual([other, AGENT].sort());
    expect(runs[AGENT]!.status).toBe("completed");
    expect(runs[other]!.status).toBe("running");
    expect(runs[other]!.label).toBe("quote-worker");
    expect(runs[other]!.steps).toEqual([
      {
        kind: "tool_call",
        toolName: "get_quote",
        args: { i: 1 },
        resultPreview: "preview 1",
        childSeq: 1,
      },
    ]);
  });

  it("ignores events without an agent id", () => {
    const runs = reduceTaskRuns(EMPTY_TASK_RUNS, started({ agent_id: "" }));
    expect(runs).toBe(EMPTY_TASK_RUNS);
  });
});

describe("ThreadStore task runs", () => {
  it("keeps task runs per thread and skips no-op updates", () => {
    const store = new ThreadStore({ initialThreadId: "thread-a" });
    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    });

    expect(store.getThreadTaskRuns("thread-a")).toBe(EMPTY_TASK_RUNS);

    store.applyTaskEvent("thread-a", started());
    store.applyTaskEvent("thread-a", activity(1));
    expect(notifications).toBe(2);

    const snapshotRuns = store.getSnapshot().getThreadTaskRuns("thread-a");
    expect(snapshotRuns[AGENT]!.steps).toHaveLength(1);
    expect(store.getSnapshot().allThreadTaskRuns.get("thread-a")).toBe(
      snapshotRuns,
    );

    // Replayed event → reducer returns the same object → no re-render.
    store.applyTaskEvent("thread-a", activity(1));
    expect(notifications).toBe(2);

    // Other threads are untouched.
    expect(store.getThreadTaskRuns("thread-b")).toBe(EMPTY_TASK_RUNS);
    store.applyTaskEvent("thread-b", started({ agent_id: "task-agent:b" }));
    expect(Object.keys(store.getThreadTaskRuns("thread-a"))).toEqual([AGENT]);
    expect(Object.keys(store.getThreadTaskRuns("thread-b"))).toEqual([
      "task-agent:b",
    ]);

    store.clearThreadTaskRuns("thread-a");
    expect(store.getThreadTaskRuns("thread-a")).toBe(EMPTY_TASK_RUNS);
  });

  it("drops task runs on resetToDefault", () => {
    const store = new ThreadStore({ initialThreadId: "thread-a" });
    store.applyTaskEvent("thread-a", started());
    const nextThreadId = store.resetToDefault();

    expect(store.getThreadTaskRuns("thread-a")).toBe(EMPTY_TASK_RUNS);
    expect(store.getThreadTaskRuns(nextThreadId)).toBe(EMPTY_TASK_RUNS);
  });
});
