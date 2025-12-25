import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup } from "@testing-library/react";
import type { SessionResponsePayload } from "../../api/types";

import {
  renderOrchestrator,
  resetBackendApiMocks,
  setBackendApiConfig,
} from "./test-utils";

beforeEach(() => {
  resetBackendApiMocks();
});

afterEach(() => {
  cleanup();
});

describe("Aomi runtime polling", () => {
  it("starts polling when processing and stops when finished", async () => {
    vi.useFakeTimers();
    try {
      const fetchState = vi.fn(async (): Promise<SessionResponsePayload> => {
        if (fetchState.mock.calls.length === 1) {
          return {
            session_exists: true,
            is_processing: true,
            messages: [{ sender: "assistant", content: "Working" }],
          };
        }
        return {
          session_exists: true,
          is_processing: false,
          messages: [{ sender: "assistant", content: "Done" }],
        };
      });

      setBackendApiConfig({ fetchState });

      const ref = await renderOrchestrator({ initialThreadId: "thread-1" });

      await act(async () => {
        await ref.current.syncThreadState("thread-1");
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(fetchState).toHaveBeenCalledTimes(2);

      expect(ref.current.backendStateRef.current.runningThreads.has("thread-1")).toBe(
        false
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops polling when the session no longer exists", async () => {
    vi.useFakeTimers();
    try {
      const fetchState = vi.fn(async (): Promise<SessionResponsePayload> => ({
        session_exists: false,
        is_processing: true,
        messages: [],
      }));

      setBackendApiConfig({ fetchState });

      const ref = await renderOrchestrator({ initialThreadId: "thread-1" });

      await act(async () => {
        ref.current.polling.start("thread-1");
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(fetchState).toHaveBeenCalled();

      expect(ref.current.backendStateRef.current.runningThreads.has("thread-1")).toBe(
        false
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps polling inactive threads when switching", async () => {
    vi.useFakeTimers();
    try {
      const fetchState = vi.fn(async (): Promise<SessionResponsePayload> => ({
        session_exists: true,
        is_processing: true,
        messages: [],
      }));

      setBackendApiConfig({ fetchState });

      const ref = await renderOrchestrator({ initialThreadId: "thread-1" });

      await act(async () => {
        ref.current.polling.start("thread-1");
      });

      await act(async () => {
        ref.current.threadContext.setCurrentThreadId("thread-2");
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(fetchState).toHaveBeenCalled();
      expect(ref.current.backendStateRef.current.runningThreads.has("thread-1")).toBe(
        true
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("interrupts polling and stops updates on cancel", async () => {
    vi.useFakeTimers();
    try {
      const fetchState = vi.fn(async (): Promise<SessionResponsePayload> => ({
        session_exists: true,
        is_processing: true,
        messages: [{ sender: "assistant", content: "Streaming" }],
      }));
      const postInterrupt = vi.fn(async (): Promise<SessionResponsePayload> => ({
        session_exists: true,
        is_processing: false,
        messages: [],
      }));

      setBackendApiConfig({ fetchState, postInterrupt });

      const ref = await renderOrchestrator({ initialThreadId: "thread-1" });

      await act(async () => {
        ref.current.polling.start("thread-1");
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      const messageCount = ref.current.threadContext.getThreadMessages("thread-1").length;

      await act(async () => {
        await ref.current.messageController.cancel("thread-1");
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(postInterrupt).toHaveBeenCalled();
      expect(ref.current.backendStateRef.current.runningThreads.has("thread-1")).toBe(
        false
      );
      expect(ref.current.threadContext.getThreadMessages("thread-1")).toHaveLength(
        messageCount
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
