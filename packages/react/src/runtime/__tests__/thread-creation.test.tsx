import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, waitFor } from "@testing-library/react";
import type { CreateThreadResponse, SessionResponsePayload } from "../../api/types";

import { PollingController } from "../polling-controller";
import {
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

describe("Aomi runtime thread creation", () => {
  it("creates a single thread, maps backend id, and skips initial fetch", async () => {
    const pollingStartSpy = vi
      .spyOn(PollingController.prototype, "start")
      .mockImplementation(() => {});
    try {
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
    let resolveCreate: ((value: CreateThreadResponse) => void) | undefined;
    const createThread = vi.fn(
      () =>
        new Promise<CreateThreadResponse>((resolve) => {
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
});
