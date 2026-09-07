import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ToolCallMessagePart } from "@assistant-ui/react";

const state = vi.hoisted(() => ({
  running: true,
  turnState: "processing",
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useMessage: (selector: (message: unknown) => unknown) =>
    selector({
      content: [
        {
          type: "tool-call",
          argsText: "{}",
          toolName: "commit",
          toolCallId: "call-1",
          args: {},
          result: { status: "completed" },
        } satisfies ToolCallMessagePart,
      ],
      status: { type: state.running ? "running" : "complete" },
      isLast: true,
    }),
}));

vi.mock("@aomi-labs/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@aomi-labs/react")>()),
  useOptionalAomiRuntime: () => ({ turnState: state.turnState }),
  useThreadTaskRuns: () => ({}),
}));

vi.mock("@/components/assistant-ui/markdown-text", () => ({
  MarkdownText: () => null,
}));

vi.mock(
  "@/components/assistant-ui/working-trace-rows",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/components/assistant-ui/working-trace-rows")
    >()),
    prefersReducedMotion: () => true,
  }),
);

import { AssistantTurnParts } from "./working-trace";

afterEach(cleanup);

describe("AssistantTurnParts lifecycle", () => {
  it.each(["complete", "interrupted", "failed"])(
    "stops Working after a tool-only turn becomes %s",
    (terminal) => {
      state.running = true;
      state.turnState = "processing";
      const view = render(<AssistantTurnParts />);
      expect(view.getByRole("button", { name: /Working/ })).toBeTruthy();

      act(() => {
        state.running = false;
        state.turnState = terminal;
      });
      view.rerender(<AssistantTurnParts />);

      expect(view.queryByRole("button", { name: /Working/ })).toBeNull();
      expect(view.getByRole("button", { name: /Worked/ })).toBeTruthy();
    },
  );

  it.each(["awaiting_action", "processing"])(
    "keeps a tool-only turn live during %s",
    (turnState) => {
      state.running = true;
      state.turnState = "processing";
      const view = render(<AssistantTurnParts />);
      state.running = false;
      state.turnState = turnState;
      view.rerender(<AssistantTurnParts />);
      expect(view.getByRole("button", { name: /Working/ })).toBeTruthy();
    },
  );
});
