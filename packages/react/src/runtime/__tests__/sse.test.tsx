import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, waitFor } from "@testing-library/react";
import type { CreateSessionResponse, SystemUpdate } from "../../api/types";

import {
  backendApiInstances,
  ensureCurrentThreadRegular,
  flushPromises,
  renderRuntime,
  resetBackendApiMocks,
  setBackendApiConfig,
} from "./test-utils";

beforeEach(() => {
  resetBackendApiMocks();
});

afterEach(() => {
  cleanup();
});

describe("Aomi runtime SSE updates", () => {
  it("updates titles for backend and temp threads", async () => {
    let resolveCreate: ((value: CreateSessionResponse) => void) | undefined;
    const createThread = vi.fn(
      () =>
        new Promise<CreateSessionResponse>((resolve) => {
          resolveCreate = resolve;
        })
    );

    setBackendApiConfig({ createThread });

    const ref = await renderRuntime({ publicKey: "pk_sse", initialThreadId: "thread-1" });
    await ensureCurrentThreadRegular(ref);
    await waitFor(() => {
      expect(ref.current.runtime.threads.getState().threads).toContain("thread-1");
    });

    await act(async () => {
      await ref.current!.runtime.threads.switchToNewThread();
    });

    await waitFor(() => {
      expect(ref.current!.threadContext.currentThreadId).toMatch(/^temp-/);
    });
    const tempThreadId = ref.current.threadContext.currentThreadId;

    await act(async () => {
      resolveCreate?.({ session_id: "backend-sse" });
      await flushPromises();
    });

    const api = backendApiInstances[0];
    act(() => {
      api.emitUpdate({
        type: "TitleChanged",
        data: { session_id: "backend-sse", new_title: "Chat 12" },
      } satisfies SystemUpdate);
    });

    await waitFor(() => {
      expect(ref.current.threadContext.getThreadMetadata(tempThreadId)?.title).toBe(
        "Chat 12"
      );
    });

    act(() => {
      api.emitUpdate({
        type: "TitleChanged",
        data: { session_id: "thread-1", new_title: "Renamed" },
      } satisfies SystemUpdate);
    });

    await waitFor(() => {
      expect(ref.current.threadContext.getThreadMetadata("thread-1")?.title).toBe(
        "Renamed"
      );
    });

    act(() => {
      api.emitUpdate({
        type: "TitleChanged",
        data: { session_id: "thread-1", new_title: "#[placeholder]" },
      } satisfies SystemUpdate);
    });

    await waitFor(() => {
      expect(ref.current.runtime.threads.getState().threads).not.toContain("thread-1");
    });
  });
});
