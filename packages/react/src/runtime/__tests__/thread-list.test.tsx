import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, waitFor } from "@testing-library/react";
import type { BackendThreadMetadata } from "../../api/types";

import { renderRuntime, resetBackendApiMocks, setBackendApiConfig } from "./test-utils";

beforeEach(() => {
  resetBackendApiMocks();
});

afterEach(() => {
  cleanup();
});

describe("Aomi runtime thread lists", () => {
  it("fetches and organizes thread lists", async () => {
    const fetchThreads = vi.fn(async (): Promise<BackendThreadMetadata[]> => [
      {
        session_id: "thread-1",
        title: "Chat 2",
        last_active_at: "2024-01-02T00:00:00.000Z",
      },
      {
        session_id: "thread-2",
        title: "Chat 3",
        last_active_at: "2024-02-02T00:00:00.000Z",
      },
      {
        session_id: "thread-3",
        title: "#[loading]",
        last_active_at: "2024-03-02T00:00:00.000Z",
      },
      {
        session_id: "thread-4",
        title: "Archived Chat",
        is_archived: true,
        last_active_at: "2024-01-15T00:00:00.000Z",
      },
    ]);

    setBackendApiConfig({ fetchThreads });

    const ref = await renderRuntime({ initialThreadId: "thread-1", publicKey: "pk_live" });

    await waitFor(() => expect(fetchThreads).toHaveBeenCalledWith("pk_live"));
    await waitFor(() => {
      expect(ref.current?.runtime.threads.getState().threads).toContain("thread-2");
    });

    const { threadContext, runtime } = ref.current!;
    const threadList = runtime.threads.getState();

    expect(threadList.threads).toEqual(["thread-2", "thread-1"]);
    expect(threadList.archivedThreads).toEqual(["thread-4"]);
    expect(threadList.threads).not.toContain("thread-3");
    expect(threadList.threadItems["thread-2"]?.title).toBe("Chat 3");
    expect(threadList.threadItems["thread-4"]?.status).toBe("archived");
    expect(threadContext.threadCnt).toBe(3);
  });
});
