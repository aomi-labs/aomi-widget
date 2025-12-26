import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { AssistantRuntime } from "@assistant-ui/react";
import { useAssistantRuntime } from "@assistant-ui/react";

import { AomiRuntimeProvider } from "../aomi-runtime";
import { useRuntimeActions } from "../hooks";
import { useRuntimeOrchestration } from "../orchestration";
import { PollingController } from "../polling-controller";
import type { SessionMetadata, CreateSessionResponse, SessionResponsePayload, SystemUpdate } from "../../api/types";
import { ThreadContextProvider, useThreadContext } from "../../state/thread-context";
import type { ThreadContext } from "../../state/thread-store";
import type { RuntimeActions } from "../hooks";

type BackendApiConfig = {
  fetchThreads?: (publicKey: string) => Promise<SessionMetadata[]>;
  fetchState?: (sessionId: string) => Promise<SessionResponsePayload>;
  createThread?: (publicKey?: string, title?: string) => Promise<CreateSessionResponse>;
  postChatMessage?: (sessionId: string, message: string) => Promise<SessionResponsePayload>;
  postSystemMessage?: (sessionId: string, message: string) => Promise<{ res?: unknown }>;
  postInterrupt?: (sessionId: string) => Promise<SessionResponsePayload>;
  renameThread?: (sessionId: string, title: string) => Promise<void>;
  archiveThread?: (sessionId: string) => Promise<void>;
  unarchiveThread?: (sessionId: string) => Promise<void>;
  deleteThread?: (sessionId: string) => Promise<void>;
};

let backendApiConfig: BackendApiConfig = {};
const backendApiInstances: Array<{
  emitUpdate: (update: SystemUpdate) => void;
}> = [];

const setBackendApiConfig = (next: BackendApiConfig) => {
  backendApiConfig = next;
};

const resetBackendApiMocks = () => {
  backendApiConfig = {};
  backendApiInstances.length = 0;
};

vi.mock("../../api/client", () => {
  class MockBackendApi {
    updatesHandler: ((update: SystemUpdate) => void) | null = null;

    constructor(public readonly backendUrl: string) {
      backendApiInstances.push(this);
    }

    fetchThreads = vi.fn(async (publicKey: string) => {
      return backendApiConfig.fetchThreads
        ? await backendApiConfig.fetchThreads(publicKey)
        : [];
    });

    fetchState = vi.fn(async (sessionId: string) => {
      return backendApiConfig.fetchState
        ? await backendApiConfig.fetchState(sessionId)
        : { session_exists: true, is_processing: false, messages: [] };
    });

    createThread = vi.fn(async (publicKey?: string, title?: string) => {
      return backendApiConfig.createThread
        ? await backendApiConfig.createThread(publicKey, title)
        : { session_id: "mock-thread" };
    });

    postChatMessage = vi.fn(async (sessionId: string, message: string) => {
      return backendApiConfig.postChatMessage
        ? await backendApiConfig.postChatMessage(sessionId, message)
        : { session_exists: true, is_processing: true, messages: [] };
    });

    postSystemMessage = vi.fn(async (sessionId: string, message: string) => {
      return backendApiConfig.postSystemMessage
        ? await backendApiConfig.postSystemMessage(sessionId, message)
        : { res: { sender: "system", content: message } };
    });

    postInterrupt = vi.fn(async (sessionId: string) => {
      return backendApiConfig.postInterrupt
        ? await backendApiConfig.postInterrupt(sessionId)
        : { session_exists: true, is_processing: false, messages: [] };
    });

    renameThread = vi.fn(async (sessionId: string, title: string) => {
      if (backendApiConfig.renameThread) {
        await backendApiConfig.renameThread(sessionId, title);
      }
    });

    archiveThread = vi.fn(async (sessionId: string) => {
      if (backendApiConfig.archiveThread) {
        await backendApiConfig.archiveThread(sessionId);
      }
    });

    unarchiveThread = vi.fn(async (sessionId: string) => {
      if (backendApiConfig.unarchiveThread) {
        await backendApiConfig.unarchiveThread(sessionId);
      }
    });

    deleteThread = vi.fn(async (sessionId: string) => {
      if (backendApiConfig.deleteThread) {
        await backendApiConfig.deleteThread(sessionId);
      }
    });

    subscribeToUpdates = (onUpdate: (update: SystemUpdate) => void) => {
      this.updatesHandler = onUpdate;
      return () => {
        if (this.updatesHandler === onUpdate) {
          this.updatesHandler = null;
        }
      };
    };

    emitUpdate(update: SystemUpdate) {
      this.updatesHandler?.(update);
    }
  }

  return {
    BackendApi: MockBackendApi,
  };
});

type HarnessHandle = {
  runtime: AssistantRuntime;
  threadContext: ThreadContext;
  runtimeActions: RuntimeActions;
};

type OrchestratorHandle = {
  threadContext: ThreadContext;
  syncThreadState: (threadId: string) => Promise<void>;
  backendStateRef: ReturnType<typeof useRuntimeOrchestration>["backendStateRef"];
  messageConverter: ReturnType<typeof useRuntimeOrchestration>["messageConverter"];
  polling: ReturnType<typeof useRuntimeOrchestration>["polling"];
};

const RuntimeHarness = forwardRef<HarnessHandle>((_, ref) => {
  const runtime = useAssistantRuntime();
  const threadContext = useThreadContext();
  const runtimeActions = useRuntimeActions();

  useImperativeHandle(
    ref,
    () => ({
      runtime,
      threadContext,
      runtimeActions,
    }),
    [runtime, threadContext, runtimeActions]
  );

  return null;
});

RuntimeHarness.displayName = "RuntimeHarness";

const OrchestratorHarness = forwardRef<OrchestratorHandle, { backendUrl: string }>(
  ({ backendUrl }, ref) => {
    const threadContext = useThreadContext();
    const threadContextRef = useRef(threadContext);
    threadContextRef.current = threadContext;
    const orchestrator = useRuntimeOrchestration(backendUrl, threadContextRef);

    useImperativeHandle(
      ref,
      () => ({
        threadContext,
        syncThreadState: orchestrator.syncThreadState,
        backendStateRef: orchestrator.backendStateRef,
        messageConverter: orchestrator.messageConverter,
        polling: orchestrator.polling,
      }),
      [orchestrator, threadContext]
    );

    return null;
  }
);

OrchestratorHarness.displayName = "OrchestratorHarness";

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const ensureCurrentThreadRegular = async (ref: React.RefObject<HarnessHandle>) => {
  const threadId = ref.current!.threadContext.currentThreadId;
  await act(async () => {
    ref.current!.threadContext.updateThreadMetadata(threadId, { status: "regular" });
  });
  return threadId;
};

const renderRuntime = async ({
  backendUrl = "http://backend",
  publicKey = "pk_test",
  initialThreadId = "thread-1",
}: {
  backendUrl?: string;
  publicKey?: string;
  initialThreadId?: string;
} = {}) => {
  const ref = React.createRef<HarnessHandle>();
  render(
    <ThreadContextProvider initialThreadId={initialThreadId}>
      <AomiRuntimeProvider backendUrl={backendUrl} publicKey={publicKey}>
        <RuntimeHarness ref={ref} />
      </AomiRuntimeProvider>
    </ThreadContextProvider>
  );
  if (!ref.current) {
    throw new Error("Runtime harness not mounted");
  }
  return ref;
};

const renderOrchestrator = async ({
  backendUrl = "http://backend",
  initialThreadId = "thread-1",
}: {
  backendUrl?: string;
  initialThreadId?: string;
} = {}) => {
  const ref = React.createRef<OrchestratorHandle>();
  render(
    <ThreadContextProvider initialThreadId={initialThreadId}>
      <OrchestratorHarness backendUrl={backendUrl} ref={ref} />
    </ThreadContextProvider>
  );
  if (!ref.current) {
    throw new Error("Orchestrator harness not mounted");
  }
  return ref;
};

beforeEach(() => {
  resetBackendApiMocks();
});

afterEach(() => {
  cleanup();
});

describe("Aomi runtime orchestrator compatibility", () => {
  it("fetches and organizes thread lists", async () => {
    const fetchThreads = vi.fn(async (): Promise<SessionMetadata[]> => [
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

  it("creates a single thread, maps backend id, and skips initial fetch", async () => {
    const pollingStartSpy = vi
      .spyOn(PollingController.prototype, "start")
      .mockImplementation(() => {});
    try {
      let resolveCreate: ((value: CreateSessionResponse) => void) | undefined;
      const createThread = vi.fn(
        () =>
          new Promise<CreateSessionResponse>((resolve) => {
            resolveCreate = resolve;
          })
      );
      const fetchState = vi.fn(async (): Promise<SessionResponsePayload> => ({
        session_exists: true,
        is_processing: false,
        messages: [],
      }));
      const postChatMessage = vi.fn(async (): Promise<SessionResponsePayload> => ({
        session_exists: true,
        is_processing: true,
        messages: [],
      }));

      setBackendApiConfig({ createThread, fetchState, postChatMessage });

      const ref = await renderRuntime({ publicKey: "pk_create" });
      await ensureCurrentThreadRegular(ref);

      await act(async () => {
        await ref.current!.runtime.threads.switchToNewThread();
      });

      await waitFor(() => {
        expect(ref.current!.threadContext.currentThreadId).toMatch(/^temp-/);
      });
      const tempThreadId = ref.current!.threadContext.currentThreadId;
      expect(ref.current!.threadContext.threadMetadata.get(tempThreadId)?.status).toBe(
        "pending"
      );
      expect(createThread).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveCreate?.({ session_id: "backend-1", title: "Chat 5" });
        await flushPromises();
      });

      await waitFor(() => {
        expect(ref.current!.threadContext.threadMetadata.get(tempThreadId)?.title).toBe(
          "Chat 5"
        );
      });

      await act(async () => {
        ref.current!.runtime.thread.append("Hello mapped");
      });

      await waitFor(() => {
        expect(postChatMessage).toHaveBeenCalledWith("backend-1", "Hello mapped");
      });

      await act(async () => {
        ref.current!.runtime.threads.switchToThread("thread-1");
      });
      const backendFetchCount = () =>
        fetchState.mock.calls.filter(([sessionId]) => sessionId === "backend-1").length;
      const fetchCallsAfterSwitch = backendFetchCount();
      await act(async () => {
        await ref.current!.runtime.threads.switchToThread(tempThreadId);
      });

      await waitFor(() => {
        expect(backendFetchCount()).toBe(fetchCallsAfterSwitch);
      });

      const tempMessages = ref.current!.threadContext.getThreadMessages(tempThreadId);
      expect(tempMessages.some((msg) => msg.role === "user")).toBe(true);
    } finally {
      pollingStartSpy.mockRestore();
    }
  });

  it("reuses the pending temp thread for rapid creates", async () => {
    let resolveCreate: ((value: CreateSessionResponse) => void) | undefined;
    const createThread = vi.fn(
      () =>
        new Promise<CreateSessionResponse>((resolve) => {
          resolveCreate = resolve;
        })
    );

    setBackendApiConfig({ createThread });

    const ref = await renderRuntime({ publicKey: "pk_rapid" });
    await ensureCurrentThreadRegular(ref);

    await act(async () => {
      await ref.current!.runtime.threads.switchToNewThread();
      await ref.current!.runtime.threads.switchToNewThread();
    });

    await waitFor(() => {
      expect(ref.current!.threadContext.currentThreadId).toMatch(/^temp-/);
    });
    const tempThreadId = ref.current!.threadContext.currentThreadId;
    await waitFor(() => {
      expect(createThread).toHaveBeenCalledTimes(1);
    });
    expect(ref.current!.threadContext.threadMetadata.get(tempThreadId)?.status).toBe(
      "pending"
    );

    await act(async () => {
      resolveCreate?.({ session_id: "backend-rapid" });
      await flushPromises();
    });
  });

  it("queues temp thread messages and flushes in order", async () => {
    let resolveCreate: ((value: CreateSessionResponse) => void) | undefined;
    const createThread = vi.fn(
      () =>
        new Promise<CreateSessionResponse>((resolve) => {
          resolveCreate = resolve;
        })
    );
    const postChatMessage = vi.fn(async (): Promise<SessionResponsePayload> => ({
      session_exists: true,
      is_processing: true,
      messages: [],
    }));

    setBackendApiConfig({ createThread, postChatMessage });

    const ref = await renderRuntime({ publicKey: "pk_messages" });
    await ensureCurrentThreadRegular(ref);

    await act(async () => {
      await ref.current!.runtime.threads.switchToNewThread();
    });

    await waitFor(() => {
      expect(ref.current!.threadContext.currentThreadId).toMatch(/^temp-/);
    });
    const tempThreadId = ref.current!.threadContext.currentThreadId;

    await act(async () => {
      ref.current!.runtime.thread.append("First");
      ref.current!.runtime.thread.append("Second");
    });

    expect(ref.current!.threadContext.getThreadMessages(tempThreadId)).toHaveLength(2);

    await act(async () => {
      resolveCreate?.({ session_id: "backend-msgs", title: "Chat 10" });
      await flushPromises();
    });

    await waitFor(() => {
      expect(postChatMessage).toHaveBeenCalledTimes(2);
    });

    expect(postChatMessage.mock.calls[0]).toEqual(["backend-msgs", "First"]);
    expect(postChatMessage.mock.calls[1]).toEqual(["backend-msgs", "Second"]);
  });

  it("flushes system messages after the first user message", async () => {
    const postChatMessage = vi.fn(async (): Promise<SessionResponsePayload> => ({
      session_exists: true,
      is_processing: true,
      messages: [],
    }));
    const postSystemMessage = vi.fn(async () => ({
      res: { sender: "system", content: "system" },
    }));

    setBackendApiConfig({ postChatMessage, postSystemMessage });

    const ref = await renderRuntime({ publicKey: "pk_system", initialThreadId: "thread-1" });

    await act(async () => {
      await ref.current!.runtimeActions.sendSystemMessage("system");
    });

    expect(postSystemMessage).not.toHaveBeenCalled();

    await act(async () => {
      ref.current!.runtime.thread.append("Hello");
    });

    await waitFor(() => expect(postChatMessage).toHaveBeenCalled());
    await waitFor(() => expect(postSystemMessage).toHaveBeenCalled());

    const [chatOrder] = postChatMessage.mock.invocationCallOrder;
    const [systemOrder] = postSystemMessage.mock.invocationCallOrder;
    expect(chatOrder).toBeLessThan(systemOrder);
  });

  it("preserves optimistic messages when inbound fetch arrives with pending chat", async () => {
    const ref = await renderOrchestrator({ initialThreadId: "thread-1" });

    const optimisticMessage = {
      role: "user" as const,
      content: [{ type: "text" as const, text: "Draft" }],
    };

    ref.current.threadContext.setThreadMessages("thread-1", [optimisticMessage]);
    ref.current.backendStateRef.current.pendingChat.set("thread-1", ["Draft"]);

    act(() => {
      ref.current.messageConverter.inbound("thread-1", [
        { sender: "assistant", content: "Should not overwrite" },
      ]);
    });

    expect(ref.current.threadContext.getThreadMessages("thread-1")).toEqual([
      optimisticMessage,
    ]);
  });

  it("starts polling when processing and stops when finished", async () => {
    vi.useFakeTimers();
    try {
      const fetchState = vi.fn(async (sessionId: string): Promise<SessionResponsePayload> => {
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

      expect(ref.current.backendStateRef.current.runningSessions.has("thread-1")).toBe(false);
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

      expect(ref.current.backendStateRef.current.runningSessions.has("thread-1")).toBe(false);
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
      expect(ref.current.backendStateRef.current.runningSessions.has("thread-1")).toBe(true);
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
        await ref.current.messageConverter.cancel("thread-1");
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(postInterrupt).toHaveBeenCalled();
      expect(ref.current.backendStateRef.current.runningSessions.has("thread-1")).toBe(false);
      expect(ref.current.threadContext.getThreadMessages("thread-1")).toHaveLength(
        messageCount
      );
    } finally {
      vi.useRealTimers();
    }
  });

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

  it("updates titles from SSE for backend and temp threads", async () => {
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

    await act(async () => {
      await ref.current.runtime.threads.switchToNewThread();
    });

    await waitFor(() => {
      expect(ref.current.threadContext.currentThreadId).toMatch(/^temp-/);
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
