import { act, render } from "@testing-library/react";
import { useEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { AomiClient, Session } from "@aomi-labs/client";
import type { AomiSSEEvent, AomiMessage } from "@aomi-labs/client";
import type { TaskRunState } from "@aomi-labs/react";

vi.mock("@/components/assistant-ui/markdown-text", async () => {
  const { useMessagePartText } = await vi.importActual<
    typeof import("@assistant-ui/react")
  >("@assistant-ui/react");
  return {
    MarkdownText: () => {
      const part = useMessagePartText();
      return <span data-testid="safe-markdown">{part.text}</span>;
    },
  };
});

import { MinimalWorkingTrace, WorkingTrace } from "./working-trace";

const SessionWorkingTrace = ({ session }: { session: Session }) => {
  const [messages, setMessages] = useState<AomiMessage[]>(
    session.getMessages(),
  );
  useEffect(() => {
    const update = (next: AomiMessage[]) => setMessages(next);
    session.on("messages", update);
    return () => {
      session.off("messages", update);
    };
  }, [session]);
  const text = [...messages]
    .reverse()
    .find((message) => message.sender === "agent")?.content;
  return <MinimalWorkingTrace text={text} />;
};

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
  it("renders provisional display text immediately inside Working", () => {
    const { container } = render(
      <MinimalWorkingTrace text="First **visible** text" />,
    );

    expect(container).toHaveTextContent("Working");
    expect(container).toHaveTextContent("First **visible** text");
    expect(
      container.querySelector("[data-testid='safe-markdown']"),
    ).not.toBeNull();
  });

  it("keeps p95 SSE-to-visible-text below 250ms over 50 measured turns", async () => {
    const client = new AomiClient({ baseUrl: "http://unit.test" });
    let emitSSE: ((event: AomiSSEEvent) => void) | undefined;
    vi.spyOn(client, "subscribeSSE").mockImplementation((_id, onEvent) => {
      emitSSE = onEvent;
      return () => {};
    });
    const sendMessage = vi
      .spyOn(client, "sendMessage")
      .mockImplementation(async (_threadId, _message, options) => ({
        is_processing: true,
        messages: [],
        turn_id: options?.turnId,
      }));
    let completedText = "";
    vi.spyOn(client, "fetchState").mockImplementation(async () => ({
      is_processing: false,
      messages: [{ sender: "agent", content: completedText }],
    }));
    const session = new Session(client, {
      sessionId: "browser-first-text-perf",
      pollIntervalMs: 60_000,
    });
    session.setSSEActive(true);
    const { container } = render(<SessionWorkingTrace session={session} />);
    const measured: number[] = [];

    for (let turn = 0; turn < 55; turn += 1) {
      const text = `visible-turn-${turn}`;
      await act(async () => {
        await session.sendAsync(`turn ${turn}`);
      });
      const turnId = sendMessage.mock.calls.at(-1)?.[2]?.turnId;
      const startedAt = performance.now();
      act(() => {
        emitSSE?.({
          type: "assistant_text_started",
          thread_id: "browser-first-text-perf",
          turn_id: turnId,
          text,
          truncated: false,
        });
      });
      expect(container).toHaveTextContent(text);
      if (turn >= 5) measured.push(performance.now() - startedAt);

      completedText = text;
      await act(async () => {
        await session.fetchCurrentState();
      });
      session.stopPolling();
    }

    const sorted = measured.toSorted((a, b) => a - b);
    const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
    expect(measured).toHaveLength(50);
    expect(p95).toBeLessThanOrEqual(250);
    session.close();
  });

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
