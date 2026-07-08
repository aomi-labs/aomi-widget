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

    it("does nothing when new chat is selected from an empty local draft", () => {
      const threadContext = createThreadContext(
        new Map([["local-empty", createMetadata()]]),
      );
      const adapter = createAdapter(threadContext);

      adapter.onSwitchToNewThread();

      expect(threadContext.setThreadMetadata).not.toHaveBeenCalled();
      expect(threadContext.setThreadMessages).not.toHaveBeenCalled();
      expect(threadContext.setCurrentThreadId).not.toHaveBeenCalled();
      expect(threadContext.bumpThreadViewKey).not.toHaveBeenCalled();
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

    it("sorts visible threads by last activity without touching selection time", () => {
      const threadContext = createThreadContext(
        new Map([
          [
            "older-thread",
            {
              ...createMetadata("Older thread"),
              lastActiveAt: 1_700_000_000,
            },
          ],
          [
            "newer-thread",
            {
              ...createMetadata("Newer thread"),
              lastActiveAt: 1_800_000_000,
            },
          ],
        ]),
      );

      const adapter = createAdapter(threadContext, {
        isRemoteThread: () => true,
      });

      expect(adapter.threads.map((thread) => thread.id)).toEqual([
        "newer-thread",
        "older-thread",
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
      const listThreads = vi.fn(
        async (): Promise<AomiThread[]> => [
          { session_id: "thread-1", title: "Chat 1", last_active_at: 100 },
          { session_id: "thread-2", title: "Chat 2", last_active_at: 200 },
        ],
      );
      setAomiClientConfig({ listThreads });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0x123", chainId: 1, isConnected: true });
        await flushPromises();
      });

      await waitFor(() => {
        expect(listThreads).toHaveBeenCalledWith(expect.any(String));
      });

      await waitFor(() => {
        expect(getApi().getThreadMetadata("thread-1")?.title).toBe("Chat 1");
        expect(getApi().getThreadMetadata("thread-2")?.title).toBe("Chat 2");
        expect(getApi().getThreadMetadata("thread-1")?.lastActiveAt).toBe(100);
        expect(getApi().getThreadMetadata("thread-2")?.lastActiveAt).toBe(200);
      });
    });

    it("does not refetch account threads when the connected address changes", async () => {
      const listThreads = vi
        .fn<() => Promise<AomiThread[]>>()
        .mockResolvedValueOnce([
          { session_id: "thread-a", title: "Wallet A Thread" },
        ]);
      setAomiClientConfig({ listThreads });

      const { api, getApi } = renderRuntime();
      const activeThreadId = api.currentThreadId;

      await act(async () => {
        api.setUser({ address: "0x123", chainId: 1, isConnected: true });
        await flushPromises();
      });

      await waitFor(() => {
        expect(getApi().getThreadMetadata("thread-a")?.title).toBe(
          "Wallet A Thread",
        );
      });

      await act(async () => {
        api.setUser({ address: "0x456", chainId: 1, isConnected: true });
        await flushPromises();
      });

      expect(getApi().currentThreadId).toBe(activeThreadId);
      expect(getApi().getThreadMetadata(activeThreadId)).toBeDefined();
      expect(getApi().getThreadMetadata("thread-a")?.title).toBe(
        "Wallet A Thread",
      );
      expect(listThreads).toHaveBeenCalledTimes(1);
    });

    it("retries thread list fetches that race account authentication", async () => {
      const listThreads = vi
        .fn<() => Promise<AomiThread[]>>()
        .mockRejectedValueOnce(new Error("Failed to fetch threads: HTTP 401"))
        .mockResolvedValueOnce([
          { session_id: "thread-1", title: "Recovered Thread" },
        ]);
      setAomiClientConfig({ listThreads });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0x123", chainId: 1, isConnected: true });
        await flushPromises();
      });

      await waitFor(
        () => {
          expect(getApi().getThreadMetadata("thread-1")?.title).toBe(
            "Recovered Thread",
          );
        },
        { timeout: 2000 },
      );
      expect(listThreads).toHaveBeenCalledTimes(2);
    });

    it("keeps retrying past the old fixed cap while the sign-in cookie lands", async () => {
      // Four 401s exceeds the previous fixed 3-retry ladder, which would have
      // given up and stranded the list. The extended budget must recover once
      // authentication finally succeeds (e.g. a slow SIWE signature).
      const listThreads = vi
        .fn<() => Promise<AomiThread[]>>()
        .mockRejectedValueOnce(new Error("Failed to fetch threads: HTTP 401"))
        .mockRejectedValueOnce(new Error("Failed to fetch threads: HTTP 401"))
        .mockRejectedValueOnce(new Error("Failed to fetch threads: HTTP 401"))
        .mockRejectedValueOnce(new Error("Failed to fetch threads: HTTP 401"))
        .mockResolvedValueOnce([
          { session_id: "thread-late", title: "Late Thread" },
        ]);
      setAomiClientConfig({ listThreads });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0x123", chainId: 1, isConnected: true });
        await flushPromises();
      });

      await waitFor(
        () => {
          expect(getApi().getThreadMetadata("thread-late")?.title).toBe(
            "Late Thread",
          );
        },
        { timeout: 6000 },
      );
      expect(listThreads).toHaveBeenCalledTimes(5);
    });

    it("stops retrying non-auth thread list failures", async () => {
      // A 500 is not the sign-in race — surface it immediately rather than
      // burning the retry budget on an error that will not self-heal.
      const listThreads = vi
        .fn<() => Promise<AomiThread[]>>()
        .mockRejectedValue(new Error("Failed to fetch threads: HTTP 500"));
      setAomiClientConfig({ listThreads });

      const { api } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0x123", chainId: 1, isConnected: true });
        await flushPromises();
      });

      await waitFor(() => {
        expect(listThreads).toHaveBeenCalledTimes(1);
      });
      await flushPromises();
      expect(listThreads).toHaveBeenCalledTimes(1);
    });

    it("keeps the active chat visible when focus moves to a Solana-only state", async () => {
      const listThreads = vi.fn(
        async (): Promise<AomiThread[]> => [
          { session_id: "thread-1", title: "Wallet Thread" },
        ],
      );
      setAomiClientConfig({ listThreads });

      const { api, getApi } = renderRuntime();
      const activeThreadId = api.currentThreadId;

      await act(async () => {
        api.setUser({ address: "0x123", chainId: 1, isConnected: true });
        await flushPromises();
      });

      await waitFor(() => {
        expect(getApi().getThreadMetadata("thread-1")?.title).toBe(
          "Wallet Thread",
        );
      });

      await act(async () => {
        getApi().setUser({
          address: undefined,
          chainId: undefined,
          isConnected: true,
          connection: { is_connected: true, primary_family: "svm" },
          svm: {
            address: "So1anaCaseSensitiveSigner",
            cluster: "solana:mainnet",
          },
        });
        await flushPromises();
      });

      expect(getApi().currentThreadId).toBe(activeThreadId);
      expect(getApi().getThreadMetadata(activeThreadId)).toBeDefined();
      expect(listThreads).toHaveBeenCalledTimes(1);
    });

    it("does not refetch threads when only the connected chain changes", async () => {
      const listThreads = vi.fn(
        async (): Promise<AomiThread[]> => [
          { session_id: "thread-1", title: "Wallet Thread" },
        ],
      );
      setAomiClientConfig({ listThreads });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0x123", chainId: 1, isConnected: true });
        await flushPromises();
      });

      await waitFor(() => {
        expect(getApi().getThreadMetadata("thread-1")?.title).toBe(
          "Wallet Thread",
        );
      });
      expect(listThreads).toHaveBeenCalledTimes(1);

      await act(async () => {
        api.setUser({ chainId: 8453 });
        await flushPromises();
      });

      expect(listThreads).toHaveBeenCalledTimes(1);
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
      setAomiClientConfig({
        listThreads: fetchThreads,
        createThread,
        fetchState,
      });

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
      setAomiClientConfig({
        listThreads: fetchThreads,
        createThread,
        fetchState,
      });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0xabc", chainId: 1, isConnected: true });
        await flushPromises();
      });

      await waitFor(() => {
        expect(fetchThreads).toHaveBeenCalledWith(expect.any(String));
      });

      await act(async () => {
        getApi().selectThread("thread-1");
        await flushPromises();
      });

      await waitFor(() => {
        expect(createThread).toHaveBeenCalledWith("thread-1");
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
