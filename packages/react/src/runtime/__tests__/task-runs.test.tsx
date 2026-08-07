/**
 * Runtime wiring for orchestrator delegation events: session SSE →
 * per-thread `taskRuns` sidecar (see specs/ORCHESTRATOR-UI-PLAN.md §4).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, waitFor } from "@testing-library/react";

import {
  getLatestAomiClient,
  renderRuntime,
  resetAomiClientMocks,
  setAomiClientConfig,
  type RenderRuntimeResult,
} from "./test-harness";

const AGENT = "task-agent:9f2c";

beforeEach(() => {
  resetAomiClientMocks();
  window.localStorage.clear();
  setAomiClientConfig({
    fetchState: async () => ({ messages: [], is_processing: false }),
    postChatMessage: async () => ({ messages: [], is_processing: true }),
  });
});

afterEach(() => {
  cleanup();
});

/** Sessions are created lazily — send a turn so the SSE wiring is in place. */
const startTurn = async (harness: RenderRuntimeResult) => {
  await act(async () => {
    await harness.api.sendMessage("delegate this");
  });
  await waitFor(() => {
    expect(getLatestAomiClient()).toBeTruthy();
  });
  return getLatestAomiClient()!;
};

describe("task run sidecar wiring", () => {
  it("reduces task events into the thread's taskRuns and dedupes replays", async () => {
    const harness = renderRuntime();
    const { getThreadContext } = harness;
    const threadId = getThreadContext().currentThreadId;
    const client = await startTurn(harness);

    await act(async () => {
      client.emitSSEEvent({
        type: "task_started",
        call_id: "call-1",
        agent_id: AGENT,
        label: "swap-worker",
        app: "default",
        resumed: false,
      });
    });

    await waitFor(() => {
      expect(
        getThreadContext().getThreadTaskRuns(threadId)[AGENT],
      ).toMatchObject({ label: "swap-worker", status: "running" });
    });

    await act(async () => {
      client.emitSSEEvent({
        type: "task_activity",
        call_id: "call-1",
        agent_id: AGENT,
        kind: "tool_call",
        tool_name: "encode_and_simulate",
        child_seq: 1,
      });
      // Replayed after a reconnect — must not duplicate the step.
      client.emitSSEEvent({
        type: "task_activity",
        call_id: "call-1",
        agent_id: AGENT,
        kind: "tool_call",
        tool_name: "encode_and_simulate",
        child_seq: 1,
      });
      client.emitSSEEvent({
        type: "task_completed",
        call_id: "call-1",
        agent_id: AGENT,
        status: "completed",
        message: "staged 1 swap",
        staged_count: 1,
        steps: 4,
        duration_ms: 12400,
      });
    });

    await waitFor(() => {
      expect(
        getThreadContext().getThreadTaskRuns(threadId)[AGENT],
      ).toMatchObject({
        status: "completed",
        message: "staged 1 swap",
        stagedCount: 1,
        stepCount: 4,
        durationMs: 12400,
      });
    });

    const run = getThreadContext().getThreadTaskRuns(threadId)[AGENT]!;
    expect(run.steps).toEqual([
      { kind: "tool_call", toolName: "encode_and_simulate", childSeq: 1 },
    ]);
    expect(run.startedAt).toBeGreaterThan(0);
  });

  it("forwards task events to the runtime event relay", async () => {
    const harness = renderRuntime();
    const { api, getThreadContext } = harness;
    const seen: string[] = [];
    const unsubscribe = api.subscribe("task_started", (event) => {
      seen.push((event.payload as { agent_id: string }).agent_id);
    });

    const client = await startTurn(harness);

    await act(async () => {
      client.emitSSEEvent({
        type: "task_started",
        call_id: "call-1",
        agent_id: AGENT,
        label: "swap-worker",
      });
    });

    await waitFor(() => {
      expect(seen).toEqual([AGENT]);
    });
    expect(
      getThreadContext().getThreadTaskRuns(getThreadContext().currentThreadId)[
        AGENT
      ],
    ).toBeTruthy();

    unsubscribe();
  });

  it("ignores task events with no agent id", async () => {
    const harness = renderRuntime();
    const { getThreadContext } = harness;
    const threadId = getThreadContext().currentThreadId;
    const client = await startTurn(harness);

    await act(async () => {
      client.emitSSEEvent({
        type: "task_started",
        call_id: "call-1",
        label: "orphan",
      });
    });

    expect(getThreadContext().getThreadTaskRuns(threadId)).toEqual({});
  });
});
