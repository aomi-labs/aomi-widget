/**
 * Thread API Tests
 *
 * Tests for thread management operations.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, waitFor } from "@testing-library/react";

import {
  renderRuntime,
  resetBackendApiMocks,
  setBackendApiConfig,
  flushPromises,
} from "./test-harness";
import type { ApiThread, ApiStateResponse } from "../../backend/types";

beforeEach(() => {
  resetBackendApiMocks();
});

afterEach(() => {
  cleanup();
});

describe("Thread API", () => {
  describe("initial state", () => {
    it("has a current thread ID", () => {
      const { api } = renderRuntime();
      expect(api.currentThreadId).toBeDefined();
      expect(typeof api.currentThreadId).toBe("string");
    });

    it("has thread metadata for current thread", () => {
      const { api } = renderRuntime();
      const metadata = api.getThreadMetadata(api.currentThreadId);
      expect(metadata).toBeDefined();
      expect(metadata?.title).toBe("New Chat");
    });

    it("has threadViewKey starting at 0", () => {
      const { api } = renderRuntime();
      expect(api.threadViewKey).toBe(0);
    });
  });

  describe("deleteThread", () => {
    it("deletes thread and creates default", async () => {
      const deleteThread = vi.fn(async () => undefined);
      setBackendApiConfig({ deleteThread });

      const { api, getApi } = renderRuntime();
      const threadId = api.currentThreadId;

      await act(async () => {
        await api.deleteThread(threadId);
      });

      expect(deleteThread).toHaveBeenCalledWith(threadId);
      expect(getApi().getThreadMetadata(threadId)).toBeUndefined();
      expect(getApi().currentThreadId).toBe("default-session");
    });
  });

  describe("renameThread", () => {
    it("renames thread optimistically", async () => {
      const renameThread = vi.fn(async () => undefined);
      setBackendApiConfig({ renameThread });

      const { api, getApi } = renderRuntime();
      const threadId = api.currentThreadId;

      await act(async () => {
        await api.renameThread(threadId, "New Title");
      });

      expect(renameThread).toHaveBeenCalledWith(threadId, "New Title");
      expect(getApi().getThreadMetadata(threadId)?.title).toBe("New Title");
    });

    it("rolls back on error", async () => {
      const renameThread = vi.fn(async () => {
        throw new Error("Failed");
      });
      setBackendApiConfig({ renameThread });

      const { api, getApi } = renderRuntime();
      const threadId = api.currentThreadId;
      const originalTitle = api.getThreadMetadata(threadId)?.title;

      await act(async () => {
        await api.renameThread(threadId, "Failed Title");
      });

      expect(getApi().getThreadMetadata(threadId)?.title).toBe(originalTitle);
    });
  });

  describe("archiveThread", () => {
    it("archives thread optimistically", async () => {
      const archiveThread = vi.fn(async () => undefined);
      setBackendApiConfig({ archiveThread });

      const { api, getApi } = renderRuntime();
      const threadId = api.currentThreadId;

      await act(async () => {
        await api.archiveThread(threadId);
      });

      expect(archiveThread).toHaveBeenCalledWith(threadId);
      expect(getApi().getThreadMetadata(threadId)?.status).toBe("archived");
    });

    it("rolls back on error", async () => {
      const archiveThread = vi.fn(async () => {
        throw new Error("Failed");
      });
      setBackendApiConfig({ archiveThread });

      const { api, getApi } = renderRuntime();
      const threadId = api.currentThreadId;

      await act(async () => {
        await api.archiveThread(threadId);
      });

      // Should rollback - status depends on initial state
      expect(getApi().getThreadMetadata(threadId)?.status).not.toBe("archived");
    });
  });

  describe("fetching thread list", () => {
    it("fetches threads when user connects", async () => {
      const fetchThreads = vi.fn(
        async (): Promise<ApiThread[]> => [
          { session_id: "thread-1", title: "Chat 1" },
          { session_id: "thread-2", title: "Chat 2" },
        ],
      );
      setBackendApiConfig({ fetchThreads });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0x123", isConnected: true });
        await flushPromises();
      });

      await waitFor(() => {
        expect(fetchThreads).toHaveBeenCalledWith("0x123");
      });

      await waitFor(() => {
        expect(getApi().getThreadMetadata("thread-1")?.title).toBe("Chat 1");
        expect(getApi().getThreadMetadata("thread-2")?.title).toBe("Chat 2");
      });
    });

    it("handles archived threads", async () => {
      const fetchThreads = vi.fn(
        async (): Promise<ApiThread[]> => [
          { session_id: "archived-1", title: "Archived", is_archived: true },
        ],
      );
      setBackendApiConfig({ fetchThreads });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0x456", isConnected: true });
        await flushPromises();
      });

      await waitFor(() => {
        expect(getApi().getThreadMetadata("archived-1")?.status).toBe(
          "archived",
        );
      });
    });

    it("normalizes placeholder titles", async () => {
      const fetchThreads = vi.fn(
        async (): Promise<ApiThread[]> => [
          { session_id: "thread-1", title: "#[loading]" },
          { session_id: "thread-2", title: "#[placeholder]" },
        ],
      );
      setBackendApiConfig({ fetchThreads });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0x789", isConnected: true });
        await flushPromises();
      });

      await waitFor(() => {
        expect(getApi().getThreadMetadata("thread-1")?.title).toBe("");
        expect(getApi().getThreadMetadata("thread-2")?.title).toBe("");
      });
    });
  });

  describe("getThreadMetadata", () => {
    it("returns undefined for non-existent thread", () => {
      const { api } = renderRuntime();
      expect(api.getThreadMetadata("non-existent")).toBeUndefined();
    });

    it("returns metadata for existing thread", () => {
      const { api } = renderRuntime();
      const metadata = api.getThreadMetadata(api.currentThreadId);
      expect(metadata).toBeDefined();
      expect(metadata).toHaveProperty("title");
      expect(metadata).toHaveProperty("status");
    });
  });
});
