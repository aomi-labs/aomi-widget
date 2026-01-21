import React, { forwardRef, useImperativeHandle } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { AssistantRuntime } from "@assistant-ui/react";
import { useAssistantRuntime, useThreadList } from "@assistant-ui/react";

import { AomiRuntimeProvider } from "../aomi-runtime";
import { useRuntimeActions } from "../../contexts/runtime-actions";
import { useRuntimeOrchestrator } from "../orchestrator";
import type {
  ApiThread,
  ApiCreateThreadResponse,
  ApiStateResponse,
  ApiChatResponse,
  ApiInterruptResponse,
  ApiSSEEvent,
} from "../../backend/types";
import {
  ThreadContextProvider,
  useThreadContext,
} from "../../contexts/thread-context";
import type { ThreadContext } from "../../contexts/thread-context";
import type { ThreadMetadata } from "../../state/thread-store";
import type { RuntimeActions } from "../../contexts/runtime-actions";

type BackendApiConfig = {
  fetchThreads?: (publicKey: string) => Promise<ApiThread[]>;
  fetchState?: (sessionId: string) => Promise<ApiStateResponse>;
  createThread?: (
    publicKey?: string,
    title?: string,
  ) => Promise<ApiCreateThreadResponse>;
  postChatMessage?: (
    sessionId: string,
    message: string,
  ) => Promise<ApiChatResponse>;
  postSystemMessage?: (
    sessionId: string,
    message: string,
  ) => Promise<{ res?: unknown }>;
  postInterrupt?: (sessionId: string) => Promise<ApiInterruptResponse>;
  renameThread?: (sessionId: string, title: string) => Promise<void>;
  archiveThread?: (sessionId: string) => Promise<void>;
  unarchiveThread?: (sessionId: string) => Promise<void>;
  deleteThread?: (sessionId: string) => Promise<void>;
};

let backendApiConfig: BackendApiConfig = {};
const backendApiInstances: Array<{
  emitUpdate: (update: ApiSSEEvent) => void;
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
    updatesHandler: ((update: ApiSSEEvent) => void) | null = null;

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

    subscribeSSE = (
      sessionId: string,
      onUpdate: (update: ApiSSEEvent) => void,
    ) => {
      this.updatesHandler = onUpdate;
      return () => {
        if (this.updatesHandler === onUpdate) {
          this.updatesHandler = null;
        }
      };
    };

    emitUpdate(update: ApiSSEEvent) {
      this.updatesHandler?.(update);
    }
  }

  return {
    BackendApi: MockBackendApi,
  };
});

type ThreadListState = ReturnType<typeof useThreadList> & {
  threads: readonly string[];
  archivedThreads: readonly string[];
  threadItems: Record<string, { title?: string; status?: string }>;
};

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
  messageController: ReturnType<
    typeof useRuntimeOrchestrator
  >["messageController"];
  polling: ReturnType<typeof useRuntimeOrchestrator>["polling"];
};

const RuntimeHarness = forwardRef<HarnessHandle>((_, ref) => {
  const runtime = useAssistantRuntime();
  const threadList = useThreadList() as ThreadListState;
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
    [runtime, threadList, threadContext, runtimeActions],
  );

  return null;
});

RuntimeHarness.displayName = "RuntimeHarness";

const OrchestratorHarness = forwardRef<
  OrchestratorHandle,
  { backendUrl: string }
>(({ backendUrl }, ref) => {
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
    [orchestrator, threadContext],
  );

  return null;
});

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
      <AomiRuntimeProvider backendUrl={backendUrl} publicKey={publicKey}>
        <RuntimeHarness ref={ref} />
      </AomiRuntimeProvider>
    </ThreadContextProvider>,
  );
  if (!ref.current) {
    throw new Error("Runtime harness not mounted");
  }
  return ref.current;
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
    </ThreadContextProvider>,
  );
  if (!ref.current) {
    throw new Error("Orchestrator harness not mounted");
  }
  return ref.current;
};

beforeEach(() => {
  resetBackendApiMocks();
});

afterEach(() => {
  cleanup();
});

describe("Aomi runtime orchestrator compatibility", () => {
  it("fetches and organizes thread lists", async () => {
    const fetchThreads = vi.fn(
      async (): Promise<ApiThread[]> => [
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
      ],
    );

    setBackendApiConfig({ fetchThreads });

    const runtime = renderRuntime({
      initialThreadId: "thread-1",
      publicKey: "pk_live",
    });

    await waitFor(() => expect(fetchThreads).toHaveBeenCalledWith("pk_live"));
    await waitFor(() => {
      expect(runtime.threadList.threads).toContain("thread-2");
    });

    const { threadList, threadContext } = runtime;

    expect(threadList.threads).toEqual(["thread-2", "thread-1"]);
    expect(threadList.archivedThreads).toEqual(["thread-4"]);
    expect(threadList.threads).not.toContain("thread-3");
    expect(threadList.threadItems["thread-2"]?.title).toBe("Chat 3");
    expect(threadList.threadItems["thread-4"]?.status).toBe("archived");
    expect(threadContext.threadCnt).toBe(3);
  });

  it("creates a single thread, maps backend id, and skips initial fetch", async () => {
    let resolveCreate: ((value: ApiCreateThreadResponse) => void) | undefined;
    const createThread = vi.fn(
      () =>
        new Promise<ApiCreateThreadResponse>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const fetchState = vi.fn(
      async (): Promise<ApiStateResponse> => ({
        session_exists: true,
        is_processing: false,
        messages: [],
      }),
    );
    const postChatMessage = vi.fn(
      async (): Promise<ApiChatResponse> => ({
        session_exists: true,
        is_processing: true,
        messages: [],
      }),
    );

    setBackendApiConfig({ createThread, fetchState, postChatMessage });

    const runtime = renderRuntime({ publicKey: "pk_create" });

    await act(async () => {
      await runtime.runtime.threads.switchToNewThread();
    });

    const tempThreadId = runtime.threadContext.currentThreadId;
    expect(tempThreadId).toMatch(/^temp-/);
    expect(runtime.threadContext.threadMetadata.get(tempThreadId)?.status).toBe(
      "pending",
    );
    expect(createThread).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate?.({ session_id: "backend-1", title: "Chat 5" });
      await flushPromises();
    });

    await waitFor(() => {
      expect(
        runtime.threadContext.threadMetadata.get(tempThreadId)?.title,
      ).toBe("Chat 5");
    });

    await act(async () => {
      runtime.runtime.thread.append("Hello mapped");
    });

    await waitFor(() => {
      expect(postChatMessage).toHaveBeenCalledWith("backend-1", "Hello mapped");
    });

    await act(async () => {
      runtime.runtime.threads.switchToThread("thread-1");
    });
    const fetchCallsAfterSwitch = fetchState.mock.calls.length;
    await act(async () => {
      await runtime.runtime.threads.switchToThread(tempThreadId);
    });

    await waitFor(() => {
      expect(fetchState.mock.calls.length).toBe(fetchCallsAfterSwitch);
    });

    const tempMessages = runtime.threadContext.getThreadMessages(tempThreadId);
    expect(tempMessages.some((msg) => msg.role === "user")).toBe(true);
  });

  it("reuses the pending temp thread for rapid creates", async () => {
    let resolveCreate: ((value: ApiCreateThreadResponse) => void) | undefined;
    const createThread = vi.fn(
      () =>
        new Promise<ApiCreateThreadResponse>((resolve) => {
          resolveCreate = resolve;
        }),
    );

    setBackendApiConfig({ createThread });

    const runtime = renderRuntime({ publicKey: "pk_rapid" });

    await act(async () => {
      await runtime.runtime.threads.switchToNewThread();
      await runtime.runtime.threads.switchToNewThread();
    });

    const tempThreadId = runtime.threadContext.currentThreadId;
    expect(createThread).toHaveBeenCalledTimes(1);
    expect(runtime.threadContext.threadMetadata.get(tempThreadId)?.status).toBe(
      "pending",
    );

    await act(async () => {
      resolveCreate?.({ session_id: "backend-rapid" });
      await flushPromises();
    });
  });

  it("queues temp thread messages and flushes in order", async () => {
    let resolveCreate: ((value: ApiCreateThreadResponse) => void) | undefined;
    const createThread = vi.fn(
      () =>
        new Promise<ApiCreateThreadResponse>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const postChatMessage = vi.fn(
      async (): Promise<ApiChatResponse> => ({
        session_exists: true,
        is_processing: true,
        messages: [],
      }),
    );

    setBackendApiConfig({ createThread, postChatMessage });

    const runtime = renderRuntime({ publicKey: "pk_messages" });

    await act(async () => {
      await runtime.runtime.threads.switchToNewThread();
    });

    const tempThreadId = runtime.threadContext.currentThreadId;

    await act(async () => {
      runtime.runtime.thread.append("First");
      runtime.runtime.thread.append("Second");
    });

    expect(runtime.threadContext.getThreadMessages(tempThreadId)).toHaveLength(
      2,
    );

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
    const postChatMessage = vi.fn(
      async (): Promise<ApiChatResponse> => ({
        session_exists: true,
        is_processing: true,
        messages: [],
      }),
    );
    const postSystemMessage = vi.fn(async () => ({
      res: { sender: "system", content: "system" },
    }));

    setBackendApiConfig({ postChatMessage, postSystemMessage });

    const runtime = renderRuntime({
      publicKey: "pk_system",
      initialThreadId: "thread-1",
    });

    await act(async () => {
      await runtime.runtime.thread.append("Hello");
    });

    await waitFor(() => expect(postChatMessage).toHaveBeenCalled());
  });

  it("preserves optimistic messages when inbound fetch arrives with pending chat", async () => {
    const orchestrator = renderOrchestrator({ initialThreadId: "thread-1" });

    const optimisticMessage = {
      role: "user" as const,
      content: [{ type: "text" as const, text: "Draft" }],
    };

    orchestrator.threadContext.setThreadMessages("thread-1", [
      optimisticMessage,
    ]);
    orchestrator.backendStateRef.current.pendingChat.set("thread-1", ["Draft"]);

    act(() => {
      orchestrator.messageController.inbound("thread-1", [
        { sender: "assistant", content: "Should not overwrite" },
      ]);
    });

    expect(orchestrator.threadContext.getThreadMessages("thread-1")).toEqual([
      optimisticMessage,
    ]);
  });

  it("stops polling when the session no longer exists", async () => {
    vi.useFakeTimers();
    const fetchState = vi.fn(
      async (): Promise<ApiStateResponse> => ({
        session_exists: false,
        is_processing: true,
        messages: [],
      }),
    );

    setBackendApiConfig({ fetchState });

    const orchestrator = renderOrchestrator({ initialThreadId: "thread-1" });

    await act(async () => {
      orchestrator.polling.start("thread-1");
    });

    await act(async () => {
      orchestrator.threadContext.setCurrentThreadId("thread-2");
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await flushPromises();
    });

    expect(fetchState).toHaveBeenCalled();
    expect(
      orchestrator.backendStateRef.current.runningThreads.has("thread-1"),
    ).toBe(true);
    vi.useRealTimers();
  });

  it("interrupts polling and stops updates on cancel", async () => {
    vi.useFakeTimers();
    const fetchState = vi.fn(
      async (): Promise<ApiStateResponse> => ({
        session_exists: true,
        is_processing: true,
        messages: [{ sender: "assistant", content: "Streaming" }],
      }),
    );
    const postInterrupt = vi.fn(
      async (): Promise<ApiInterruptResponse> => ({
        session_exists: true,
        is_processing: false,
        messages: [],
      }),
    );

    setBackendApiConfig({ fetchState, postInterrupt });

    const orchestrator = renderOrchestrator({ initialThreadId: "thread-1" });

    await act(async () => {
      orchestrator.polling.start("thread-1");
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await flushPromises();
    });

    const messageCount =
      orchestrator.threadContext.getThreadMessages("thread-1").length;

    await act(async () => {
      await orchestrator.messageController.cancel("thread-1");
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await flushPromises();
    });

    expect(postInterrupt).toHaveBeenCalled();
    expect(
      orchestrator.backendStateRef.current.runningThreads.has("thread-1"),
    ).toBe(false);
    expect(
      orchestrator.threadContext.getThreadMessages("thread-1"),
    ).toHaveLength(messageCount);
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

    const runtime = renderRuntime({
      publicKey: "pk_mutations",
      initialThreadId: "thread-1",
    });

    runtime.threadContext.setThreadMetadata(
      (prev: Map<string, ThreadMetadata>) =>
        new Map(prev).set("thread-1", {
          title: "Original",
          status: "regular",
          lastActiveAt: new Date().toISOString(),
        }),
    );

    await act(async () => {
      await runtime.runtime.threads.getItemById("thread-1").rename("Next");
    });

    expect(runtime.threadContext.getThreadMetadata("thread-1")?.title).toBe(
      "Original",
    );

    await act(async () => {
      await runtime.runtime.threads.getItemById("thread-1").archive();
    });

    expect(runtime.threadContext.getThreadMetadata("thread-1")?.status).toBe(
      "regular",
    );

    runtime.threadContext.updateThreadMetadata("thread-1", {
      status: "archived",
    });

    await act(async () => {
      await runtime.runtime.threads.getItemById("thread-1").unarchive();
    });

    expect(runtime.threadContext.getThreadMetadata("thread-1")?.status).toBe(
      "archived",
    );
  });

  it("deletes threads and switches to the next regular thread", async () => {
    const deleteThread = vi.fn(async () => undefined);

    setBackendApiConfig({ deleteThread });

    const runtime = renderRuntime({
      publicKey: "pk_delete",
      initialThreadId: "thread-1",
    });

    runtime.threadContext.setThreadMetadata(
      (prev: Map<string, ThreadMetadata>) =>
        new Map(prev).set("thread-2", {
          title: "Other",
          status: "regular",
          lastActiveAt: new Date().toISOString(),
        }),
    );
    runtime.threadContext.setThreadMessages("thread-2", []);

    await act(async () => {
      await runtime.runtime.threads.getItemById("thread-1").delete();
    });

    expect(deleteThread).toHaveBeenCalledWith("thread-1");
    expect(runtime.threadContext.getThreadMetadata("thread-1")).toBeUndefined();
    expect(runtime.threadContext.getThreadMessages("thread-1")).toEqual([]);
    expect(runtime.threadContext.currentThreadId).toBe("thread-2");
  });

  it("creates a default thread when deleting the last regular thread", async () => {
    const deleteThread = vi.fn(async () => undefined);

    setBackendApiConfig({ deleteThread });

    const runtime = renderRuntime({
      publicKey: "pk_delete_last",
      initialThreadId: "thread-1",
    });

    await act(async () => {
      await runtime.runtime.threads.getItemById("thread-1").delete();
    });

    expect(runtime.threadContext.currentThreadId).toBe("default-session");
    expect(
      runtime.threadContext.getThreadMetadata("default-session")?.title,
    ).toBe("New Chat");
  });

  it("updates titles from SSE for backend and temp threads", async () => {
    let resolveCreate: ((value: ApiCreateThreadResponse) => void) | undefined;
    const createThread = vi.fn(
      () =>
        new Promise<ApiCreateThreadResponse>((resolve) => {
          resolveCreate = resolve;
        }),
    );

    setBackendApiConfig({ createThread });

    const runtime = renderRuntime({
      publicKey: "pk_sse",
      initialThreadId: "thread-1",
    });

    await act(async () => {
      await runtime.runtime.threads.switchToNewThread();
    });

    const tempThreadId = runtime.threadContext.currentThreadId;

    await act(async () => {
      resolveCreate?.({ session_id: "backend-sse" });
      await flushPromises();
    });

    const api = backendApiInstances[0];
    act(() => {
      api.emitUpdate({
        type: "title_changed",
        session_id: "backend-sse",
        new_title: "Chat 12",
      });
    });

    await waitFor(() => {
      expect(runtime.threadContext.getThreadMetadata(tempThreadId)?.title).toBe(
        "Chat 12",
      );
    });

    act(() => {
      api.emitUpdate({
        type: "title_changed",
        session_id: "thread-1",
        new_title: "Renamed",
      });
    });

    await waitFor(() => {
      expect(runtime.threadContext.getThreadMetadata("thread-1")?.title).toBe(
        "Renamed",
      );
    });

    act(() => {
      api.emitUpdate({
        type: "title_changed",
        session_id: "thread-1",
        new_title: "#[placeholder]",
      });
    });

    await waitFor(() => {
      expect(runtime.threadList.threads).not.toContain("thread-1");
    });
  });
});
