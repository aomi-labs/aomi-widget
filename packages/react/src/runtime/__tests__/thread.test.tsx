/**
 * Thread API Tests
 *
 * Tests for thread management operations.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, waitFor } from "@testing-library/react";

import {
  renderRuntime,
  resetAomiClientMocks,
  setAomiClientConfig,
  flushPromises,
} from "./test-harness";
import type { AomiThread, AomiStateResponse } from "@aomi-labs/client";
import type { ThreadMessageLike } from "@assistant-ui/react";
import {
  initThreadControl,
  type ThreadMetadata,
} from "../../state/thread-store";
import type { ThreadContext } from "../../contexts/thread-context";
import { buildThreadListAdapter } from "../threadlist-adapter";

beforeEach(() => {
  resetAomiClientMocks();
});

afterEach(() => {
  cleanup();
});

describe("Thread API", () => {
  describe("thread list adapter", () => {
    const createThreadContext = (
      metadata: Map<string, ThreadMetadata>,
      messages = new Map<string, ThreadMessageLike[]>(),
    ): ThreadContext => ({
      currentThreadId: "local-empty",
      setCurrentThreadId: vi.fn(),
      threadViewKey: 0,
      bumpThreadViewKey: vi.fn(),
      allThreads: messages,
      setThreads: vi.fn(),
      allThreadsMetadata: metadata,
      setThreadMetadata: vi.fn(),
      threadCnt: 1,
      setThreadCnt: vi.fn(),
      getThreadMessages: (threadId) => messages.get(threadId) ?? [],
      setThreadMessages: vi.fn(),
      getThreadMetadata: (threadId) => metadata.get(threadId),
      updateThreadMetadata: vi.fn(),
      resetToDefault: vi.fn(),
    });

    const createMetadata = (title = "New Chat"): ThreadMetadata => ({
      title,
      status: "regular",
      lastActiveAt: "2026-05-05T00:00:00.000Z",
      control: initThreadControl(),
    });

    const createAdapter = (
      threadContext: ThreadContext,
      options?: { isRemoteThread?: (threadId: string) => boolean },
    ) =>
      buildThreadListAdapter({
        aomiClientRef: {
          current: {
            renameThread: vi.fn(),
            archiveThread: vi.fn(),
            unarchiveThread: vi.fn(),
            deleteThread: vi.fn(),
          },
        } as never,
        threadContext,
        setIsRunning: vi.fn(),
        isRemoteThread: options?.isRemoteThread ?? (() => false),
      });

    it("hides local draft threads until they have a user message", () => {
      const threadContext = createThreadContext(
        new Map([["local-empty", createMetadata()]]),
      );

      const adapter = createAdapter(threadContext);

      expect(adapter.threads).toEqual([]);
    });

    it("shows a local draft thread after the user sends a message", () => {
      const threadContext = createThreadContext(
        new Map([["local-active", createMetadata()]]),
        new Map([
          [
            "local-active",
            [
              {
                role: "user",
                content: [{ type: "text", text: "hello" }],
              },
            ],
          ],
        ]),
      );

      const adapter = createAdapter(threadContext);

      expect(adapter.threads).toEqual([
        {
          id: "local-active",
          title: "New Chat",
          status: "regular",
        },
      ]);
    });

    it("keeps remote threads visible while local drafts stay hidden", () => {
      const threadContext = createThreadContext(
        new Map([
          ["local-empty", createMetadata()],
          ["remote-thread", createMetadata("Remote thread")],
        ]),
      );

      const adapter = createAdapter(threadContext, {
        isRemoteThread: (threadId) => threadId === "remote-thread",
      });

      expect(adapter.threads).toEqual([
        {
          id: "remote-thread",
          title: "Remote thread",
          status: "regular",
        },
      ]);
    });
  });

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
      setAomiClientConfig({ deleteThread });

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
      setAomiClientConfig({ renameThread });

      const { api, getApi } = renderRuntime();
      const threadId = api.currentThreadId;

      await act(async () => {
        await api.renameThread(threadId, "New Title");
      });

      expect(renameThread).toHaveBeenCalledWith(threadId, "New Title");
      expect(getApi().getThreadMetadata(threadId)?.title).toBe("New Title");
    });

    it("rolls back on error", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const renameThread = vi.fn(async () => {
        throw new Error("Failed");
      });
      setAomiClientConfig({ renameThread });

      const { api, getApi } = renderRuntime();
      const threadId = api.currentThreadId;
      const originalTitle = api.getThreadMetadata(threadId)?.title;

      await act(async () => {
        await api.renameThread(threadId, "Failed Title");
      });

      expect(getApi().getThreadMetadata(threadId)?.title).toBe(originalTitle);
      consoleSpy.mockRestore();
    });
  });

  describe("archiveThread", () => {
    it("archives thread optimistically", async () => {
      const archiveThread = vi.fn(async () => undefined);
      setAomiClientConfig({ archiveThread });

      const { api, getApi } = renderRuntime();
      const threadId = api.currentThreadId;

      await act(async () => {
        await api.archiveThread(threadId);
      });

      expect(archiveThread).toHaveBeenCalledWith(threadId);
      expect(getApi().getThreadMetadata(threadId)?.status).toBe("archived");
    });

    it("rolls back on error", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const archiveThread = vi.fn(async () => {
        throw new Error("Failed");
      });
      setAomiClientConfig({ archiveThread });

      const { api, getApi } = renderRuntime();
      const threadId = api.currentThreadId;

      await act(async () => {
        await api.archiveThread(threadId);
      });

      // Should rollback - status depends on initial state
      expect(getApi().getThreadMetadata(threadId)?.status).not.toBe("archived");
      consoleSpy.mockRestore();
    });
  });

  describe("fetching thread list", () => {
    it("fetches threads when user connects", async () => {
      const fetchThreads = vi.fn(
        async (): Promise<AomiThread[]> => [
          { session_id: "thread-1", title: "Chat 1" },
          { session_id: "thread-2", title: "Chat 2" },
        ],
      );
      setAomiClientConfig({ fetchThreads });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0x123", chainId: 1, isConnected: true });
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
        async (): Promise<AomiThread[]> => [
          { session_id: "archived-1", title: "Archived", is_archived: true },
        ],
      );
      setAomiClientConfig({ fetchThreads });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0x456", chainId: 1, isConnected: true });
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
        async (): Promise<AomiThread[]> => [
          { session_id: "thread-1", title: "#[loading]" },
          { session_id: "thread-2", title: "#[placeholder]" },
        ],
      );
      setAomiClientConfig({ fetchThreads });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0x789", chainId: 1, isConnected: true });
        await flushPromises();
      });

      await waitFor(() => {
        expect(getApi().getThreadMetadata("thread-1")?.title).toBe("");
        expect(getApi().getThreadMetadata("thread-2")?.title).toBe("");
      });
    });

    it("prefetches the top five listed threads in the background", async () => {
      const threadIds = Array.from(
        { length: 7 },
        (_, index) => `thread-${index + 1}`,
      );
      const fetchThreads = vi.fn(
        async (): Promise<AomiThread[]> =>
          threadIds.map((threadId, index) => ({
            session_id: threadId,
            title: `Thread ${index + 1}`,
          })),
      );
      const createThread = vi.fn(async (threadId: string) => ({
        session_id: threadId,
      }));
      const resolveFetches = new Map<string, () => void>();
      const fetchState = vi.fn(
        (sessionId: string): Promise<AomiStateResponse> =>
          new Promise((resolve) => {
            resolveFetches.set(sessionId, () =>
              resolve({
                is_processing: false,
                messages: [
                  {
                    sender: "agent",
                    content: `Prefetched ${sessionId}`,
                  },
                ],
              }),
            );
          }),
      );
      setAomiClientConfig({ fetchThreads, createThread, fetchState });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0xprefetch", chainId: 1, isConnected: true });
        await flushPromises();
      });

      await waitFor(() => {
        expect(getApi().getThreadMetadata("thread-1")?.title).toBe("Thread 1");
      });
      expect(getApi().getMessages("thread-1")).toEqual([]);

      await waitFor(() => {
        expect(fetchState).toHaveBeenCalledTimes(5);
      });

      expect(fetchState.mock.calls.map(([threadId]) => threadId)).toEqual(
        threadIds.slice(0, 5),
      );
      expect(createThread.mock.calls.map(([threadId]) => threadId)).toEqual(
        threadIds.slice(0, 5),
      );
      expect(resolveFetches.has("thread-6")).toBe(false);
      expect(resolveFetches.has("thread-7")).toBe(false);

      await act(async () => {
        for (const threadId of threadIds.slice(0, 5)) {
          resolveFetches.get(threadId)?.();
        }
        await flushPromises();
      });

      await waitFor(() => {
        expect(getApi().getMessages("thread-1")).toEqual([
          expect.objectContaining({
            role: "assistant",
            content: [
              expect.objectContaining({
                type: "text",
                text: "Prefetched thread-1",
              }),
            ],
          }),
        ]);
      });
    });

    it("warms a listed thread before fetching its messages", async () => {
      let warmed = false;
      const fetchThreads = vi.fn(
        async (): Promise<AomiThread[]> => [
          { session_id: "thread-1", title: "Loaded Thread" },
        ],
      );
      const createThread = vi.fn(async (threadId: string) => {
        if (threadId === "thread-1") {
          warmed = true;
        }
        return { session_id: threadId };
      });
      const fetchState = vi.fn(
        async (sessionId: string): Promise<AomiStateResponse> => {
          if (sessionId === "thread-1" && warmed) {
            return {
              is_processing: false,
              messages: [
                {
                  sender: "agent",
                  content: "Recovered from backend",
                },
              ],
            };
          }

          return {
            is_processing: false,
            messages: [],
          };
        },
      );
      setAomiClientConfig({ fetchThreads, createThread, fetchState });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0xabc", chainId: 1, isConnected: true });
        await flushPromises();
      });

      await waitFor(() => {
        expect(fetchThreads).toHaveBeenCalledWith("0xabc");
      });

      await act(async () => {
        getApi().selectThread("thread-1");
        await flushPromises();
      });

      await waitFor(() => {
        expect(createThread).toHaveBeenCalledWith("thread-1", "0xabc");
      });

      await waitFor(() => {
        expect(getApi().currentThreadId).toBe("thread-1");
        expect(getApi().getMessages("thread-1")).toEqual([
          expect.objectContaining({
            role: "assistant",
            content: [
              expect.objectContaining({
                type: "text",
                text: "Recovered from backend",
              }),
            ],
          }),
        ]);
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
