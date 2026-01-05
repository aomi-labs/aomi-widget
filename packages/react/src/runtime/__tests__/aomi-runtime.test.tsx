import React, { forwardRef, useImperativeHandle } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { AssistantRuntime } from "@assistant-ui/react";
import { useAssistantRuntime, useThreadList } from "@assistant-ui/react";

import { AomiRuntimeProvider, AomiRuntimeProviderWithNotifications } from "../aomi-runtime";
import { useRuntimeActions } from "../hooks";
import { useRuntimeOrchestrator } from "../orchestrator";
import type {
  BackendThreadMetadata,
  CreateThreadResponse,
  SessionResponsePayload,
  SystemEvent,
  SystemUpdateNotification,
} from "../../api/types";
import { ThreadContextProvider, useThreadContext } from "../../state/thread-context";
import type { ThreadContext } from "../../state/thread-context";
import type { RuntimeActions } from "../hooks";

type BackendApiConfig = {
  fetchThreads?: (publicKey: string) => Promise<BackendThreadMetadata[]>;
  fetchState?: (
    sessionId: string,
    options?: { signal?: AbortSignal }
  ) => Promise<SessionResponsePayload>;
  fetchEventsAfter?: (
    sessionId: string,
    afterId?: number,
    limit?: number
  ) => Promise<SystemEvent[]>;
  createThread?: (publicKey?: string, title?: string) => Promise<CreateThreadResponse>;
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
  emitUpdate: (update: SystemUpdateNotification) => void;
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
    updatesHandlers = new Map<string, (update: SystemUpdateNotification) => void>();

    constructor(public readonly backendUrl: string) {
      backendApiInstances.push(this);
    }

    fetchThreads = vi.fn(async (publicKey: string) => {
      return backendApiConfig.fetchThreads
        ? await backendApiConfig.fetchThreads(publicKey)
        : [];
    });

    fetchState = vi.fn(async (sessionId: string, options?: { signal?: AbortSignal }) => {
      return backendApiConfig.fetchState
        ? await backendApiConfig.fetchState(sessionId, options)
        : { session_exists: true, is_processing: false, messages: [] };
    });

    fetchEventsAfter = vi.fn(async (sessionId: string, afterId = 0, limit = 100) => {
      return backendApiConfig.fetchEventsAfter
        ? await backendApiConfig.fetchEventsAfter(sessionId, afterId, limit)
        : [];
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

    subscribeToUpdates = (
      sessionId: string,
      onUpdate: (update: SystemUpdateNotification) => void
    ) => {
      this.updatesHandlers.set(sessionId, onUpdate);
      return () => {
        const current = this.updatesHandlers.get(sessionId);
        if (current === onUpdate) {
          this.updatesHandlers.delete(sessionId);
        }
      };
    };

    subscribeToUpdatesWithNotification = (
      sessionId: string,
      onUpdate: (update: SystemUpdateNotification) => void
    ) => {
      return this.subscribeToUpdates(sessionId, onUpdate);
    };

    emitUpdate(update: SystemUpdateNotification) {
      this.updatesHandlers.get(update.session_id)?.(update);
    }
  }

  return {
    BackendApi: MockBackendApi,
  };
});

type ThreadListState = ReturnType<typeof useThreadList>;

type HarnessHandle = {
  runtime: AssistantRuntime;
  threadList: ThreadListState;
  threadContext: ThreadContext;
  runtimeActions: RuntimeActions;
};

type OrchestratorHandle = {
  threadContext: ThreadContext;
  ensureInitialState: (threadId: string) => Promise<void>;
  backendStateRef: ReturnType<typeof useRuntimeOrchestrator>["backendStateRef"];
  messageController: ReturnType<typeof useRuntimeOrchestrator>["messageController"];
  polling: ReturnType<typeof useRuntimeOrchestrator>["polling"];
};

const RuntimeHarness = forwardRef<HarnessHandle>((_, ref) => {
  const runtime = useAssistantRuntime();
  const threadList = useThreadList();
  const threadContext = useThreadContext();
  const runtimeActions = useRuntimeActions();

  useImperativeHandle(
    ref,
    () => ({
      runtime,
      threadList,
      threadContext,
      runtimeActions,
    }),
    [runtime, threadList, threadContext, runtimeActions]
  );

  return null;
});

RuntimeHarness.displayName = "RuntimeHarness";

const OrchestratorHarness = forwardRef<OrchestratorHandle, { backendUrl: string }>(
  ({ backendUrl }, ref) => {
    const orchestrator = useRuntimeOrchestrator(backendUrl);
    const threadContext = useThreadContext();

    useImperativeHandle(
      ref,
      () => ({
        threadContext,
        ensureInitialState: orchestrator.ensureInitialState,
        backendStateRef: orchestrator.backendStateRef,
        messageController: orchestrator.messageController,
        polling: orchestrator.polling,
      }),
      [orchestrator, threadContext]
    );

    return null;
  }
);

OrchestratorHarness.displayName = "OrchestratorHarness";

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const renderRuntime = ({
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
      <AomiRuntimeProviderWithNotifications backendUrl={backendUrl} publicKey={publicKey}>
        <RuntimeHarness ref={ref} />
      </AomiRuntimeProviderWithNotifications>
    </ThreadContextProvider>
  );
  if (!ref.current) {
    throw new Error("Runtime harness not mounted");
  }
  return ref;
};

const renderOrchestrator = ({
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

    const ref = renderRuntime({ initialThreadId: "thread-1", publicKey: "pk_live" });

    await waitFor(() => expect(fetchThreads).toHaveBeenCalledWith("pk_live"));
    await waitFor(() => {
      expect(ref.current?.threadList.threads).toContain("thread-2");
    });

    const { threadList, threadContext } = ref.current!;

    expect(threadList.threads).toEqual(["thread-2", "thread-1"]);
    expect(threadList.archivedThreads).toEqual(["thread-4"]);
    expect(threadList.threads).not.toContain("thread-3");
    expect(threadList.threadItems["thread-2"]?.title).toBe("Chat 3");
    expect(threadList.threadItems["thread-4"]?.status).toBe("archived");
    expect(threadContext.threadCnt).toBe(3);
  });

  it("creates a single thread, maps backend id, and skips initial fetch", async () => {
    let resolveCreate: ((value: CreateThreadResponse) => void) | undefined;
    const createThread = vi.fn(
      () =>
        new Promise<CreateThreadResponse>((resolve) => {
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

    const ref = renderRuntime({ publicKey: "pk_create" });

    await act(async () => {
      await ref.current!.runtime.threads.switchToNewThread();
    });

    const tempThreadId = ref.current!.threadContext.currentThreadId;
    expect(tempThreadId).toMatch(/^temp-/);
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
    const fetchCallsAfterSwitch = fetchState.mock.calls.length;
    await act(async () => {
      await ref.current!.runtime.threads.switchToThread(tempThreadId);
    });

    await waitFor(() => {
      expect(fetchState.mock.calls.length).toBe(fetchCallsAfterSwitch);
    });

    const tempMessages = ref.current!.threadContext.getThreadMessages(tempThreadId);
    expect(tempMessages.some((msg) => msg.role === "user")).toBe(true);
  });

  it("reuses the pending temp thread for rapid creates", async () => {
    let resolveCreate: ((value: CreateThreadResponse) => void) | undefined;
    const createThread = vi.fn(
      () =>
        new Promise<CreateThreadResponse>((resolve) => {
          resolveCreate = resolve;
        })
    );

    setBackendApiConfig({ createThread });

    const ref = renderRuntime({ publicKey: "pk_rapid" });

    await act(async () => {
      await ref.current!.runtime.threads.switchToNewThread();
      await ref.current!.runtime.threads.switchToNewThread();
    });

    const tempThreadId = ref.current!.threadContext.currentThreadId;
    expect(createThread).toHaveBeenCalledTimes(1);
    expect(ref.current!.threadContext.threadMetadata.get(tempThreadId)?.status).toBe(
      "pending"
    );

    await act(async () => {
      resolveCreate?.({ session_id: "backend-rapid" });
      await flushPromises();
    });
  });

  it("queues temp thread messages and flushes in order", async () => {
    let resolveCreate: ((value: CreateThreadResponse) => void) | undefined;
    const createThread = vi.fn(
      () =>
        new Promise<CreateThreadResponse>((resolve) => {
          resolveCreate = resolve;
        })
    );
    const postChatMessage = vi.fn(async (): Promise<SessionResponsePayload> => ({
      session_exists: true,
      is_processing: true,
      messages: [],
    }));

    setBackendApiConfig({ createThread, postChatMessage });

    const ref = renderRuntime({ publicKey: "pk_messages" });

    await act(async () => {
      await ref.current!.runtime.threads.switchToNewThread();
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

    const ref = renderRuntime({ publicKey: "pk_system", initialThreadId: "thread-1" });

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
    const ref = renderOrchestrator({ initialThreadId: "thread-1" });

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

  it("starts polling when processing and stops when finished", async () => {
    vi.useFakeTimers();
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

    const ref = renderOrchestrator({ initialThreadId: "thread-1" });

    await act(async () => {
      await ref.current.ensureInitialState("thread-1");
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await flushPromises();
    });

    await waitFor(() => {
      expect(fetchState).toHaveBeenCalledTimes(2);
    });

    expect(ref.current.backendStateRef.current.runningThreads.has("thread-1")).toBe(false);
    vi.useRealTimers();
  });

  it("stops polling when processing flag is missing", async () => {
    vi.useFakeTimers();
    const fetchState = vi.fn(async (): Promise<SessionResponsePayload> => ({
      session_exists: true,
      messages: [{ sender: "assistant", content: "Done" }],
    }));

    setBackendApiConfig({ fetchState });

    const ref = renderOrchestrator({ initialThreadId: "thread-1" });

    await act(async () => {
      ref.current.polling.start("thread-1");
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await flushPromises();
    });

    expect(fetchState).toHaveBeenCalledTimes(1);
    expect(ref.current.backendStateRef.current.runningThreads.has("thread-1")).toBe(false);
    vi.useRealTimers();
  });

  it("stops polling when the session no longer exists", async () => {
    vi.useFakeTimers();
    const fetchState = vi.fn(async (): Promise<SessionResponsePayload> => ({
      session_exists: false,
      is_processing: true,
      messages: [],
    }));

    setBackendApiConfig({ fetchState });

    const ref = renderOrchestrator({ initialThreadId: "thread-1" });

    await act(async () => {
      ref.current.polling.start("thread-1");
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await flushPromises();
    });

    await waitFor(() => {
      expect(fetchState).toHaveBeenCalled();
    });

    expect(ref.current.backendStateRef.current.runningThreads.has("thread-1")).toBe(false);
    vi.useRealTimers();
  });

  it("keeps polling inactive threads when switching", async () => {
    vi.useFakeTimers();
    const fetchState = vi.fn(async (): Promise<SessionResponsePayload> => ({
      session_exists: true,
      is_processing: true,
      messages: [],
    }));

    setBackendApiConfig({ fetchState });

    const ref = renderOrchestrator({ initialThreadId: "thread-1" });

    await act(async () => {
      ref.current.polling.start("thread-1");
    });

    await act(async () => {
      ref.current.threadContext.setCurrentThreadId("thread-2");
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await flushPromises();
    });

    expect(fetchState).toHaveBeenCalled();
    expect(ref.current.backendStateRef.current.runningThreads.has("thread-1")).toBe(true);
    vi.useRealTimers();
  });

  it("interrupts polling and stops updates on cancel", async () => {
    vi.useFakeTimers();
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

    const ref = renderOrchestrator({ initialThreadId: "thread-1" });

    await act(async () => {
      ref.current.polling.start("thread-1");
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await flushPromises();
    });

    const messageCount = ref.current.threadContext.getThreadMessages("thread-1").length;

    await act(async () => {
      await ref.current.messageController.cancel("thread-1");
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await flushPromises();
    });

    expect(postInterrupt).toHaveBeenCalled();
    expect(ref.current.backendStateRef.current.runningThreads.has("thread-1")).toBe(false);
    expect(ref.current.threadContext.getThreadMessages("thread-1")).toHaveLength(messageCount);
    vi.useRealTimers();
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

    const ref = renderRuntime({ publicKey: "pk_mutations", initialThreadId: "thread-1" });

    ref.current.threadContext.setThreadMetadata((prev) =>
      new Map(prev).set("thread-1", {
        title: "Original",
        status: "regular",
        lastActiveAt: new Date().toISOString(),
      })
    );

    await act(async () => {
      await ref.current.runtime.threads.getItemById("thread-1").rename("Next");
    });

    expect(ref.current.threadContext.getThreadMetadata("thread-1")?.title).toBe(
      "Original"
    );

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

    const ref = renderRuntime({ publicKey: "pk_delete", initialThreadId: "thread-1" });

    ref.current.threadContext.setThreadMetadata((prev) =>
      new Map(prev).set("thread-2", {
        title: "Other",
        status: "regular",
        lastActiveAt: new Date().toISOString(),
      })
    );
    ref.current.threadContext.setThreadMessages("thread-2", []);

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

    const ref = renderRuntime({ publicKey: "pk_delete_last", initialThreadId: "thread-1" });

    await act(async () => {
      await ref.current.runtime.threads.getItemById("thread-1").delete();
    });

    expect(ref.current.threadContext.currentThreadId).toBe("default-session");
    expect(ref.current.threadContext.getThreadMetadata("default-session")?.title).toBe(
      "New Chat"
    );
  });

  it("updates titles from SSE for backend and temp threads", async () => {
    let resolveCreate: ((value: CreateThreadResponse) => void) | undefined;
    const createThread = vi.fn(
      () =>
        new Promise<CreateThreadResponse>((resolve) => {
          resolveCreate = resolve;
        })
    );

    const eventsQueue = new Map<string, SystemEvent[]>([
      [
        "backend-sse",
        [
          {
            type: "title_changed",
            session_id: "backend-sse",
            event_id: 1,
            new_title: "Chat 12",
          } as SystemEvent,
        ],
      ],
      [
        "thread-1",
        [
          {
            type: "title_changed",
            session_id: "thread-1",
            event_id: 1,
            new_title: "Renamed",
          } as SystemEvent,
          {
            type: "title_changed",
            session_id: "thread-1",
            event_id: 2,
            new_title: "#[placeholder]",
          } as SystemEvent,
        ],
      ],
    ]);

    const fetchEventsAfter = vi.fn(async (sessionId: string) => {
      const queue = eventsQueue.get(sessionId) ?? [];
      if (!queue.length) return [];
      return [queue.shift()!];
    });

    setBackendApiConfig({ createThread, fetchEventsAfter });

    const ref = renderRuntime({ publicKey: "pk_sse", initialThreadId: "thread-1" });

    await act(async () => {
      await ref.current.runtime.threads.switchToNewThread();
    });

    const tempThreadId = ref.current.threadContext.currentThreadId;

    await act(async () => {
      resolveCreate?.({ session_id: "backend-sse" });
      await flushPromises();
    });

    const api = backendApiInstances[0];
    act(() => {
      api.emitUpdate({
        type: "event_available",
        session_id: "backend-sse",
        event_id: 1,
        event_type: "title_changed",
      } satisfies SystemUpdateNotification);
    });

    await waitFor(() => {
      expect(ref.current.threadContext.getThreadMetadata(tempThreadId)?.title).toBe(
        "Chat 12"
      );
    });

    act(() => {
      api.emitUpdate({
        type: "event_available",
        session_id: "thread-1",
        event_id: 2,
        event_type: "title_changed",
      } satisfies SystemUpdateNotification);
    });

    await waitFor(() => {
      expect(ref.current.threadContext.getThreadMetadata("thread-1")?.title).toBe(
        "Renamed"
      );
    });

    act(() => {
      api.emitUpdate({
        type: "event_available",
        session_id: "thread-1",
        event_id: 3,
        event_type: "title_changed",
      } satisfies SystemUpdateNotification);
    });

    await waitFor(() => {
      expect(ref.current.threadList.threads).not.toContain("thread-1");
    });
  });
});
