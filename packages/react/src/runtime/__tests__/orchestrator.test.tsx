import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup } from "@testing-library/react";

import { renderOrchestrator, resetBackendApiMocks } from "./test-utils";

beforeEach(() => {
  resetBackendApiMocks();
});

afterEach(() => {
  cleanup();
});

describe("Aomi runtime orchestrator", () => {
  it("preserves optimistic messages when inbound fetch arrives with pending chat", async () => {
    const ref = await renderOrchestrator({ initialThreadId: "thread-1" });

    const optimisticMessage = {
      role: "user" as const,
      content: [{ type: "text" as const, text: "Draft" }],
    };

    ref.current.threadContext.setThreadMessages("thread-1", [optimisticMessage]);
    ref.current.backendStateRef.current.pendingChat.set("thread-1", ["Draft"]);

    act(() => {
      ref.current.messageController.inbound("thread-1", [
        { sender: "assistant", content: "Should not overwrite" },
      ]);
    });

    expect(ref.current.threadContext.getThreadMessages("thread-1")).toEqual([
      optimisticMessage,
    ]);
  });
});
