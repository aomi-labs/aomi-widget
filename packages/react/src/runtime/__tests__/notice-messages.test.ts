/**
 * Notice-message placement.
 *
 * A notice is a runtime record shown in the transcript — a payment gate, or a
 * turn the app failed to answer. These tests pin down *which* thread it lands
 * on and how many of them appear, both of which have bitten before.
 */

import { describe, expect, it } from "vitest";
import type { ThreadMessageLike } from "@assistant-ui/react";

import {
  appendNoticeMessage,
  buildTurnErrorMessage,
} from "../orchestrator";
import type { ThreadContext } from "../../contexts/thread-context";

/** Minimal stand-in exposing only what `appendNoticeMessage` touches. */
const fakeThreadContext = (
  initial: Record<string, ThreadMessageLike[]> = {},
) => {
  const threads: Record<string, ThreadMessageLike[]> = { ...initial };
  return {
    currentThreadId: "thread-on-screen",
    getThreadMessages: (threadId: string) => threads[threadId] ?? [],
    setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => {
      threads[threadId] = messages;
    },
    threads,
  } as unknown as ThreadContext & {
    threads: Record<string, ThreadMessageLike[]>;
  };
};

const noticeKinds = (messages: ThreadMessageLike[] = []) =>
  messages.map(
    (message) =>
      (message.metadata?.custom as { aomiNoticeKind?: string } | undefined)
        ?.aomiNoticeKind,
  );

describe("appendNoticeMessage", () => {
  it("files the notice against the thread that raised it, not the one on screen", () => {
    // Errors arrive from warmed and background sessions too. Attributing them
    // to `currentThreadId` would file the failure against whichever
    // conversation the user happens to be reading.
    const threadContext = fakeThreadContext();

    appendNoticeMessage(
      threadContext,
      "background-thread",
      buildTurnErrorMessage(),
    );

    expect(noticeKinds(threadContext.threads["background-thread"])).toEqual([
      "error",
    ]);
    expect(threadContext.threads["thread-on-screen"]).toBeUndefined();
  });

  it("does not stack a second notice of the same kind", () => {
    const threadContext = fakeThreadContext();

    appendNoticeMessage(threadContext, "thread-1", buildTurnErrorMessage());
    appendNoticeMessage(threadContext, "thread-1", buildTurnErrorMessage());

    expect(noticeKinds(threadContext.threads["thread-1"])).toEqual(["error"]);
  });

  it("adds a fresh notice once a real reply has landed since the last one", () => {
    const threadContext = fakeThreadContext({
      "thread-1": [
        buildTurnErrorMessage(),
        { id: "reply", role: "assistant", content: [] },
      ],
    });

    appendNoticeMessage(threadContext, "thread-1", buildTurnErrorMessage());

    expect(noticeKinds(threadContext.threads["thread-1"])).toEqual([
      "error",
      undefined,
      "error",
    ]);
  });
});
