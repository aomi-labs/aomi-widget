import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TaskRunState } from "@aomi-labs/react";

vi.mock("@/components/assistant-ui/markdown-text", () => ({
  MarkdownText: () => null,
}));

import { WorkingTrace } from "./working-trace";

const run = (steps: TaskRunState["steps"]): TaskRunState => ({
  agentId: "task-agent:9f2c1a2b3c4d",
  callId: "call-1",
  label: "swap-worker",
  app: "default",
  status: "running",
  startedAt: Date.now(),
  steps,
});

describe("WorkingTrace", () => {
  it("uses Working while the orchestrator badge identifies the mode", () => {
    const { container } = render(
      <WorkingTrace running items={[]} revealed={0} orchestrating />,
    );

    expect(container).toHaveTextContent("Working");
    expect(container).toHaveTextContent("orchestrator");
    expect(container).not.toHaveTextContent("Orchestrating");
  });

  it("follows nested subagent steps while the trace is pinned to latest", () => {
    const item = (state: TaskRunState) => ({
      kind: "agent" as const,
      agentId: state.agentId,
      run: state,
      order: 0,
      key: state.agentId,
    });
    const initialRun = run([]);
    const { container, rerender } = render(
      <WorkingTrace
        running
        items={[item(initialRun)]}
        revealed={1}
        orchestrating
      />,
    );
    const viewport = container.querySelector<HTMLElement>(
      ".aui-working-trace-viewport",
    )!;
    const body = container.querySelector<HTMLElement>(
      ".aui-working-trace-body",
    )!;
    const setScrollTop = vi.fn();
    Object.defineProperties(viewport, {
      scrollHeight: { configurable: true, get: () => 640 },
      scrollTop: { configurable: true, get: () => 0, set: setScrollTop },
    });
    Object.defineProperty(body, "offsetHeight", {
      configurable: true,
      get: () => 640,
    });

    const updatedRun = run([
      {
        kind: "tool_call",
        toolName: "get_chain_context",
        childSeq: 1,
      },
    ]);
    rerender(
      <WorkingTrace
        running
        items={[item(updatedRun)]}
        revealed={1}
        orchestrating
      />,
    );

    expect(setScrollTop).toHaveBeenCalledWith(640);
    expect(viewport).toHaveAttribute("tabindex", "0");
    expect(container).toHaveTextContent("Show all 2 steps");
  });
});
