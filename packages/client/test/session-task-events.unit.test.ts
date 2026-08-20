import { afterEach, describe, expect, it, vi } from "vitest";

import { AomiClient, Session } from "../src/index";
import type {
  AomiSSEEvent,
  AomiTaskActivityEvent,
  AomiTaskCompletedEvent,
  AomiTaskStartedEvent,
} from "../src/index";
import { parseAomiTaskEvent } from "../src/index";
import {
  formatTaskActivity,
  formatTaskCompletionStats,
  printTaskActivity,
  printTaskCompleted,
  printTaskStarted,
} from "../src/cli/output";

/** Build a session whose SSE stream we can drive by hand. */
function createSSESession(sessionId: string) {
  const client = new AomiClient({ baseUrl: "http://unit.test" });
  let emitSSE: ((event: AomiSSEEvent) => void) | null = null;
  vi.spyOn(client, "subscribeSSE").mockImplementation((_id, onEvent) => {
    emitSSE = onEvent as (event: AomiSSEEvent) => void;
    return () => {};
  });

  const session = new Session(client, { transport: "legacy", sessionId });
  session.setSSEActive(true);

  return {
    session,
    emit: (event: AomiSSEEvent) => {
      if (!emitSSE) throw new Error("SSE not subscribed");
      emitSSE(event);
    },
  };
}

const STARTED = {
  type: "task_started",
  call_id: "call-1",
  agent_id: "task-agent:9f2c",
  label: "swap-worker",
  app: "default",
  resumed: false,
} satisfies AomiTaskStartedEvent;

const ACTIVITY = {
  type: "task_activity",
  call_id: "call-1",
  agent_id: "task-agent:9f2c",
  kind: "tool_call",
  tool_name: "encode_and_simulate",
  args: { amount: "250" },
  result_preview: "simulation passed",
  child_seq: 7,
} satisfies AomiTaskActivityEvent;

const COMPLETED = {
  type: "task_completed",
  call_id: "call-1",
  agent_id: "task-agent:9f2c",
  status: "completed",
  message: "staged 1 swap, simulation passed",
  staged_count: 1,
  steps: 4,
  duration_ms: 12400,
} satisfies AomiTaskCompletedEvent;

describe("ClientSession orchestrator task events", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("re-emits task_started / task_activity / task_completed to subscribers", () => {
    const { session, emit } = createSSESession("thread-task-1");

    const started = vi.fn();
    const activity = vi.fn();
    const completed = vi.fn();
    session.on("task_started", started);
    session.on("task_activity", activity);
    session.on("task_completed", completed);

    emit(STARTED);
    emit(ACTIVITY);
    emit(COMPLETED);

    expect(started).toHaveBeenCalledTimes(1);
    expect(started).toHaveBeenCalledWith(expect.objectContaining(STARTED));
    expect(activity).toHaveBeenCalledWith(expect.objectContaining(ACTIVITY));
    expect(completed).toHaveBeenCalledWith(expect.objectContaining(COMPLETED));

    session.close();
  });

  it("also reaches wildcard subscribers and leaves session state alone", () => {
    const { session, emit } = createSSESession("thread-task-2");
    const seen: string[] = [];
    session.on("*", ({ type }) => seen.push(type));

    emit(STARTED);
    emit(ACTIVITY);
    emit(COMPLETED);

    expect(seen).toEqual(["task_started", "task_activity", "task_completed"]);
    // v1 keeps task events sidecar-only: no transcript or processing mutation.
    expect(session.getMessages()).toEqual([]);
    expect(session.getIsProcessing()).toBe(false);

    session.close();
  });

  it("drops malformed task events instead of emitting half-built rows", () => {
    const { session, emit } = createSSESession("thread-task-3");
    const started = vi.fn();
    const activity = vi.fn();
    session.on("task_started", started);
    session.on("task_activity", activity);

    emit({ type: "task_started", call_id: "call-1" }); // no agent_id
    emit({ ...ACTIVITY, child_seq: undefined }); // no child_seq

    expect(started).not.toHaveBeenCalled();
    expect(activity).not.toHaveBeenCalled();

    session.close();
  });
});

describe("parseAomiTaskEvent", () => {
  it("normalizes optional fields and defaults", () => {
    expect(
      parseAomiTaskEvent({
        type: "task_started",
        call_id: "c",
        agent_id: "a",
      }),
    ).toEqual({
      type: "task_started",
      call_id: "c",
      agent_id: "a",
      label: "",
      app: null,
      resumed: false,
    });

    expect(
      parseAomiTaskEvent({
        type: "task_activity",
        call_id: "c",
        agent_id: "a",
        kind: "note",
        text: "Quote locked",
        child_seq: 2,
      }),
    ).toEqual({
      type: "task_activity",
      call_id: "c",
      agent_id: "a",
      kind: "note",
      text: "Quote locked",
      child_seq: 2,
    });
  });

  it("returns null for non-task events", () => {
    expect(parseAomiTaskEvent({ type: "tool_update" })).toBeNull();
  });
});

describe("CLI task lines", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints the agent row, indented steps and the summary line", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    printTaskStarted(STARTED);
    printTaskActivity(ACTIVITY);
    printTaskActivity({
      ...ACTIVITY,
      kind: "note",
      text: "Quote locked — simulating…",
      child_seq: 8,
    });
    printTaskCompleted(COMPLETED, "swap-worker");

    const lines = log.mock.calls.map(([line]) =>
      String(line).replace(/\x1b\[[0-9;]*m/g, ""),
    );
    expect(lines).toEqual([
      "◆ [agent] swap-worker started",
      "  ↳ encode_and_simulate",
      "  ↳ Quote locked — simulating…",
      "  ✔ swap-worker: completed (4 steps, 12.4s)",
    ]);
  });

  it("truncates long note text to ~100 chars", () => {
    const text = "x".repeat(140);
    const formatted = formatTaskActivity({
      ...ACTIVITY,
      kind: "note",
      text,
      tool_name: undefined,
    });

    expect(formatted).toHaveLength(101);
    expect(formatted.endsWith("…")).toBe(true);
  });

  it("formats completion stats defensively when the backend omits counters", () => {
    expect(
      formatTaskCompletionStats({
        type: "task_completed",
        call_id: "c",
        agent_id: "a",
        status: "failed",
      }),
    ).toBe("0 steps, 0.0s");
    expect(
      formatTaskCompletionStats({ ...COMPLETED, steps: 1, duration_ms: 900 }),
    ).toBe("1 step, 0.9s");
  });
});
