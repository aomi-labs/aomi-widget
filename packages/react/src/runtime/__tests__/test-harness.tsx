import React, { forwardRef, useImperativeHandle } from "react";
import { vi } from "vitest";
import { render } from "@testing-library/react";

import type {
  ApiThread,
  ApiCreateThreadResponse,
  ApiStateResponse,
  ApiChatResponse,
  ApiInterruptResponse,
  ApiSSEEvent,
} from "../../backend/types";

// =============================================================================
// Backend API Mock Configuration
// =============================================================================

export type BackendApiConfig = {
  fetchThreads?: (publicKey: string) => Promise<ApiThread[]>;
  fetchState?: (sessionId: string) => Promise<ApiStateResponse>;
  createThread?: (
    threadId: string,
    publicKey?: string,
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

// Global state for mock configuration
const mockState = {
  config: {} as BackendApiConfig,
  instances: [] as MockBackendApiInstance[],
};

export type MockBackendApiInstance = {
  emitSSEEvent: (event: ApiSSEEvent) => void;
  fetchThreads: ReturnType<typeof vi.fn>;
  fetchState: ReturnType<typeof vi.fn>;
  createThread: ReturnType<typeof vi.fn>;
  postChatMessage: ReturnType<typeof vi.fn>;
  postSystemMessage: ReturnType<typeof vi.fn>;
  postInterrupt: ReturnType<typeof vi.fn>;
  renameThread: ReturnType<typeof vi.fn>;
  archiveThread: ReturnType<typeof vi.fn>;
  unarchiveThread: ReturnType<typeof vi.fn>;
  deleteThread: ReturnType<typeof vi.fn>;
};

export const setBackendApiConfig = (config: BackendApiConfig) => {
  mockState.config = config;
};

export const resetBackendApiMocks = () => {
  mockState.config = {};
  mockState.instances.length = 0;
};

export const getBackendApiInstances = () => mockState.instances;
export const getLatestBackendApi = () =>
  mockState.instances[mockState.instances.length - 1];

// =============================================================================
// Mock BackendApi - defined before vi.mock so it's hoisted properly
// =============================================================================

vi.mock("../../backend/client", () => {
  // Mock class defined inside the factory
  class MockBackendApi {
    private sseHandler: ((event: ApiSSEEvent) => void) | null = null;

    fetchThreads = vi.fn(async (publicKey: string) => {
      return mockState.config.fetchThreads
        ? await mockState.config.fetchThreads(publicKey)
        : [];
    });

    fetchState = vi.fn(async (sessionId: string) => {
      return mockState.config.fetchState
        ? await mockState.config.fetchState(sessionId)
        : { session_exists: true, is_processing: false, messages: [] };
    });

    createThread = vi.fn(async (threadId: string, publicKey?: string) => {
      return mockState.config.createThread
        ? await mockState.config.createThread(threadId, publicKey)
        : { session_id: threadId };
    });

    postChatMessage = vi.fn(async (sessionId: string, message: string) => {
      return mockState.config.postChatMessage
        ? await mockState.config.postChatMessage(sessionId, message)
        : { session_exists: true, is_processing: true, messages: [] };
    });

    postSystemMessage = vi.fn(async (sessionId: string, message: string) => {
      return mockState.config.postSystemMessage
        ? await mockState.config.postSystemMessage(sessionId, message)
        : { res: { sender: "system", content: message } };
    });

    postInterrupt = vi.fn(async (sessionId: string) => {
      return mockState.config.postInterrupt
        ? await mockState.config.postInterrupt(sessionId)
        : { session_exists: true, is_processing: false, messages: [] };
    });

    renameThread = vi.fn(async (sessionId: string, title: string) => {
      if (mockState.config.renameThread) {
        await mockState.config.renameThread(sessionId, title);
      }
    });

    archiveThread = vi.fn(async (sessionId: string) => {
      if (mockState.config.archiveThread) {
        await mockState.config.archiveThread(sessionId);
      }
    });

    unarchiveThread = vi.fn(async (sessionId: string) => {
      if (mockState.config.unarchiveThread) {
        await mockState.config.unarchiveThread(sessionId);
      }
    });

    deleteThread = vi.fn(async (sessionId: string) => {
      if (mockState.config.deleteThread) {
        await mockState.config.deleteThread(sessionId);
      }
    });

    subscribeSSE = (
      _sessionId: string,
      onUpdate: (event: ApiSSEEvent) => void,
    ) => {
      this.sseHandler = onUpdate;
      return () => {
        if (this.sseHandler === onUpdate) {
          this.sseHandler = null;
        }
      };
    };

    emitSSEEvent = (event: ApiSSEEvent) => {
      this.sseHandler?.(event);
    };

    constructor(_backendUrl: string) {
      mockState.instances.push(this as unknown as MockBackendApiInstance);
    }
  }

  return {
    BackendApi: MockBackendApi,
  };
});

// =============================================================================
// Import after mock is set up
// =============================================================================

import { AomiRuntimeProvider } from "../aomi-runtime";
import { useAomiRuntime, type AomiRuntimeApi } from "../../interface";

// =============================================================================
// Test Harness Component
// =============================================================================

export type RuntimeHarnessHandle = {
  api: AomiRuntimeApi;
};

const RuntimeHarness = forwardRef<RuntimeHarnessHandle>((_, ref) => {
  const api = useAomiRuntime();

  useImperativeHandle(ref, () => ({ api }), [api]);

  return null;
});

RuntimeHarness.displayName = "RuntimeHarness";

// =============================================================================
// Render Utilities
// =============================================================================

export type RenderRuntimeOptions = {
  backendUrl?: string;
};

export type RenderRuntimeResult = {
  api: AomiRuntimeApi;
  getApi: () => AomiRuntimeApi;
  unmount: () => void;
  rerender: (ui: React.ReactElement) => void;
};

export const renderRuntime = ({
  backendUrl = "http://test-backend",
}: RenderRuntimeOptions = {}): RenderRuntimeResult => {
  const ref = React.createRef<RuntimeHarnessHandle>();

  const { unmount, rerender } = render(
    <AomiRuntimeProvider backendUrl={backendUrl}>
      <RuntimeHarness ref={ref} />
    </AomiRuntimeProvider>,
  );

  if (!ref.current) {
    throw new Error("Runtime harness not mounted");
  }

  return {
    api: ref.current.api,
    getApi: () => ref.current!.api,
    unmount,
    rerender,
  };
};

// =============================================================================
// Test Utilities
// =============================================================================

export const flushPromises = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

export const waitForCondition = async (
  condition: () => boolean,
  timeout = 1000,
) => {
  const start = Date.now();
  while (!condition() && Date.now() - start < timeout) {
    await flushPromises();
  }
  if (!condition()) {
    throw new Error("Condition not met within timeout");
  }
};
