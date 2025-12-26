import React, { forwardRef, useImperativeHandle, useRef } from "react";
import type { AssistantRuntime } from "@assistant-ui/react";
import { useAssistantRuntime } from "@assistant-ui/react";
import { act, render } from "@testing-library/react";
import { vi } from "vitest";

import { AomiRuntimeProvider } from "../aomi-runtime";
import { useRuntimeActions } from "../hooks";
import { useRuntimeOrchestration } from "../orchestration";
import { ThreadContextProvider, useThreadContext } from "../../state/thread-context";
import type { ThreadContext } from "../../state/thread-store";
import type { SessionMetadata, CreateSessionResponse, SessionResponsePayload, SystemUpdate } from "../../api/types";
import type { RuntimeActions } from "../hooks";

export type BackendApiConfig = {
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
export const backendApiInstances: Array<{
  emitUpdate: (update: SystemUpdate) => void;
}> = [];

export const setBackendApiConfig = (next: BackendApiConfig) => {
  backendApiConfig = next;
};

export const resetBackendApiMocks = () => {
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

export type HarnessHandle = {
  runtime: AssistantRuntime;
  threadContext: ThreadContext;
  runtimeActions: RuntimeActions;
};

export type OrchestratorHandle = {
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

export const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

export const ensureCurrentThreadRegular = async (ref: React.RefObject<HarnessHandle>) => {
  const threadId = ref.current!.threadContext.currentThreadId;
  await act(async () => {
    ref.current!.threadContext.updateThreadMetadata(threadId, { status: "regular" });
  });
  return threadId;
};

export const renderRuntime = async ({
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

export const renderOrchestrator = async ({
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
