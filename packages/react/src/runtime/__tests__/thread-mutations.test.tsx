import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, waitFor } from "@testing-library/react";

import {
  ensureCurrentThreadRegular,
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

describe("Aomi runtime thread mutations", () => {
  it("rolls back archive and rename mutations on error", async () => {
    const renameThread = vi.fn(async () => {
      throw new Error("rename failed");
    });
    const archiveThread = vi.fn(async () => {
      throw new Error("archive failed");
    });
    const unarchiveThread = vi.fn(async () => {
      throw new Error("unarchive failed");
    });

    setBackendApiConfig({ renameThread, archiveThread, unarchiveThread });

    const ref = await renderRuntime({ publicKey: "pk_mutations", initialThreadId: "thread-1" });

    ref.current.threadContext.setThreadMetadata((prev) =>
      new Map(prev).set("thread-1", {
        title: "Original",
        status: "regular",
        lastActiveAt: new Date().toISOString(),
      })
    );
    await waitFor(() => {
      expect(ref.current.runtime.threads.getState().threads).toContain("thread-1");
    });

    await act(async () => {
      await ref.current.runtime.threads.getItemById("thread-1").rename("Next");
    });

    await waitFor(() => {
      expect(ref.current.threadContext.getThreadMetadata("thread-1")?.title).toBe(
        "Original"
      );
    });

    await act(async () => {
      await ref.current.runtime.threads.getItemById("thread-1").archive();
    });

    expect(ref.current.threadContext.getThreadMetadata("thread-1")?.status).toBe(
      "regular"
    );

    ref.current.threadContext.updateThreadMetadata("thread-1", { status: "archived" });

    await act(async () => {
      await ref.current.runtime.threads.getItemById("thread-1").unarchive();
    });

    expect(ref.current.threadContext.getThreadMetadata("thread-1")?.status).toBe(
      "archived"
    );
  });

  it("deletes threads and switches to the next regular thread", async () => {
    const deleteThread = vi.fn(async () => undefined);

    setBackendApiConfig({ deleteThread });

    const ref = await renderRuntime({ publicKey: "pk_delete", initialThreadId: "thread-1" });
    await ensureCurrentThreadRegular(ref);
    await waitFor(() => {
      expect(ref.current.runtime.threads.getState().threads).toContain("thread-1");
    });

    ref.current.threadContext.setThreadMetadata((prev) =>
      new Map(prev).set("thread-2", {
        title: "Other",
        status: "regular",
        lastActiveAt: new Date().toISOString(),
      })
    );
    ref.current.threadContext.setThreadMessages("thread-2", []);
    await waitFor(() => {
      expect(ref.current.runtime.threads.getState().threads).toContain("thread-2");
    });

    await act(async () => {
      await ref.current.runtime.threads.getItemById("thread-1").delete();
    });

    expect(deleteThread).toHaveBeenCalledWith("thread-1");
    expect(ref.current.threadContext.getThreadMetadata("thread-1")).toBeUndefined();
    expect(ref.current.threadContext.getThreadMessages("thread-1")).toEqual([]);
    expect(ref.current.threadContext.currentThreadId).toBe("thread-2");
  });

  it("creates a default thread when deleting the last regular thread", async () => {
    const deleteThread = vi.fn(async () => undefined);

    setBackendApiConfig({ deleteThread });

    const ref = await renderRuntime({ publicKey: "pk_delete_last", initialThreadId: "thread-1" });
    await ensureCurrentThreadRegular(ref);
    await waitFor(() => {
      expect(ref.current.runtime.threads.getState().threads).toContain("thread-1");
    });

    await act(async () => {
      await ref.current.runtime.threads.getItemById("thread-1").delete();
    });

    expect(ref.current.threadContext.currentThreadId).toBe("default-session");
    expect(ref.current.threadContext.getThreadMetadata("default-session")?.title).toBe(
      "New Chat"
    );
  });
});
