import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ToolCallMessagePart } from "@assistant-ui/react";

import type { TaskRunState } from "@aomi-labs/react";

vi.mock("@/components/assistant-ui/markdown-text", async () => {
  const { useMessagePartText } = await vi.importActual<
    typeof import("@assistant-ui/react")
  >("@assistant-ui/react");
  return {
    MarkdownText: () => {
      const part = useMessagePartText();
      return <span data-testid="rendered-text">{part.text}</span>;
    },
  };
});

import {
  buildTraceItems,
  MinimalWorkingTrace,
  ProgressiveRenderedText,
  WorkingTrace,
} from "./working-trace";

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
  it("uses a compact status pill before trace steps arrive", () => {
    const { container, getByRole } = render(<MinimalWorkingTrace />);

    expect(getByRole("status", { name: "Aomi is thinking" })).toHaveTextContent(
      "Thinking",
    );
    expect(container.querySelector(".aui-working-trace-start")).toHaveClass(
      "h-9",
      "w-fit",
      "rounded-full",
      "pl-3",
      "pr-4",
      "border-aomi-border",
      "bg-aomi-surface",
    );
    expect(container.querySelector(".aui-working-trace-start")).not.toHaveClass(
      "h-8",
      "px-3",
      "-mt-px",
    );
    expect(container.querySelector(".aui-working-shimmer")).toHaveClass(
      "text-[13px]",
      "font-medium",
      "leading-none",
    );
    expect(container.querySelector(".aui-working-shimmer")).not.toHaveClass(
      "-top-px",
    );
    expect(container.querySelector(".aui-thinking-glyph")).toBeTruthy();
    expect(container.querySelector(".aui-thinking-bulb")).toBeTruthy();
    expect(container.querySelector(".aui-working-glyph")).toBeNull();
    expect(container.querySelector(".aui-working-trace")).toBeNull();
    expect(getByRole("status")).toHaveTextContent(/^Thinking$/);
  });

  it("keeps Thinking and collapsed Worked chips the same size", () => {
    const { getByRole } = render(
      <>
        <MinimalWorkingTrace />
        <WorkingTrace running={false} items={[]} revealed={0} />
      </>,
    );

    const thinking = getByRole("status", { name: "Aomi is thinking" });
    const worked = getByRole("button", { name: /Worked it out/ });
    for (const className of [
      "h-9",
      "w-fit",
      "rounded-full",
      "pl-3",
      "pr-4",
      "border-aomi-border",
      "bg-aomi-surface",
    ]) {
      expect(thinking).toHaveClass(className);
      expect(worked).toHaveClass(className);
    }
  });

  it("shows completed duration as whole seconds", () => {
    const now = Date.now();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);
    try {
      const { getByRole, rerender } = render(
        <WorkingTrace
          running
          items={[]}
          revealed={0}
          startedAtMs={now - 6400}
        />,
      );

      rerender(
        <WorkingTrace
          running={false}
          items={[]}
          revealed={0}
          startedAtMs={now - 6400}
        />,
      );

      expect(getByRole("button", { name: /Worked for/ })).toHaveTextContent(
        "Worked for 6s",
      );
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("progressively reveals a buffered final answer", async () => {
    vi.useFakeTimers();
    try {
      const answer = "A buffered final answer should arrive progressively.";
      const { getByTestId } = render(
        <ProgressiveRenderedText text={answer} animate />,
      );
      const rendered = getByTestId("rendered-text");

      expect(rendered).toHaveTextContent("");

      act(() => vi.advanceTimersByTime(20));
      expect(rendered.textContent?.length).toBeGreaterThan(0);
      expect(rendered.textContent?.length).toBeLessThan(answer.length);

      for (let tick = 0; tick < 75; tick += 1) {
        await act(() => vi.advanceTimersByTimeAsync(20));
      }
      expect(rendered).toHaveTextContent(answer);
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses Working without exposing the internal execution mode", () => {
    const { container, getByText } = render(
      <WorkingTrace running items={[]} revealed={0} />,
    );

    expect(container).toHaveTextContent("Working");
    expect(getByText("Working")).toHaveClass(
      "text-[13px]",
      "font-medium",
      "leading-none",
      "aui-working-shimmer",
    );
    expect(container).not.toHaveTextContent(/orchestrat/i);
    expect(container.querySelector(".aui-working-glyph")).toBeTruthy();
    expect(container.querySelector(".aui-working-cog")).toBeTruthy();
    expect(container.querySelector(".aui-thinking-glyph")).toBeNull();
    expect(container).not.toHaveTextContent("0 steps");
  });

  it("keeps the trace body mounted while animating it open and closed", () => {
    const { container, getByRole } = render(
      <WorkingTrace running items={[]} revealed={0} />,
    );
    const toggle = getByRole("button", { name: /Working/ });
    const body = container.querySelector<HTMLElement>(
      ".aui-working-trace > div",
    )!;

    expect(body).toHaveClass("grid-rows-[1fr]", "opacity-100");
    expect(body).not.toHaveClass("hidden");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(body).toHaveClass("grid-rows-[0fr]", "opacity-0");
    expect(body).not.toHaveClass("hidden");
    expect(body).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(body).toHaveClass("grid-rows-[1fr]", "opacity-100");
  });

  it("stays open until final-answer playback is ready", () => {
    vi.useFakeTimers();
    try {
      const { getByRole, rerender } = render(
        <WorkingTrace running items={[]} revealed={0} collapseReady={false} />,
      );

      rerender(
        <WorkingTrace
          running={false}
          items={[]}
          revealed={0}
          collapseReady={false}
        />,
      );
      act(() => vi.advanceTimersByTime(1_000));
      expect(getByRole("button", { name: /Worked/ })).toHaveAttribute(
        "aria-expanded",
        "true",
      );

      rerender(
        <WorkingTrace running={false} items={[]} revealed={0} collapseReady />,
      );
      act(() => vi.advanceTimersByTime(500));
      expect(getByRole("button", { name: /Worked/ })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    } finally {
      vi.useRealTimers();
    }
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
      <WorkingTrace running items={[item(initialRun)]} revealed={1} />,
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
    rerender(<WorkingTrace running items={[item(updatedRun)]} revealed={1} />);

    expect(setScrollTop).toHaveBeenCalledWith(640);
    expect(viewport).toHaveAttribute("tabindex", "0");
    expect(container).toHaveTextContent("Show all 2 steps");
  });

  it("keeps a failed delegation at its transcript position after recovery", () => {
    const failedRun: TaskRunState = {
      ...run([]),
      status: "failed",
      message: "LI.FI route was unavailable",
    };
    const delegatedTask = {
      type: "tool-call" as const,
      toolCallId: failedRun.callId,
      toolName: "task",
      args: { label: "Prepare swap", app: "default", prompt: "Swap" },
      result: { status: "failed" },
    } as ToolCallMessagePart;
    const recoveredCommit = {
      type: "tool-call" as const,
      toolCallId: "call-2",
      toolName: "commit",
      args: {},
      result: { status: "completed" },
    } as ToolCallMessagePart;

    const items = buildTraceItems(
      [delegatedTask, recoveredCommit],
      [failedRun],
    );

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      kind: "agent",
      agentId: failedRun.agentId,
      run: failedRun,
      tool: delegatedTask,
    });
    expect(items[1]).toMatchObject({
      kind: "tool",
      tool: recoveredCommit,
    });
  });
});
