import React, { forwardRef, useImperativeHandle } from "react";
import { vi } from "vitest";
import { render } from "@testing-library/react";

import type {
  AomiThread,
  AomiCreateThreadResponse,
  AomiStateResponse,
  AomiChatResponse,
  AomiInterruptResponse,
  AomiSSEEvent,
} from "@aomi-labs/client";

// =============================================================================
// Backend API Mock Configuration
// =============================================================================

export type AomiClientConfig = {
  // New names (match AomiClient API)
  listThreads?: (publicKey: string) => Promise<AomiThread[]>;
  fetchState?: (
    sessionId: string,
    userState?: Record<string, unknown>,
  ) => Promise<AomiStateResponse>;
  createThread?: (
    threadId: string,
    publicKey?: string,
  ) => Promise<AomiCreateThreadResponse>;
  sendMessage?: (
    sessionId: string,
    message: string,
    options?: {
      app?: string;
      publicKey?: string;
      apiKey?: string;
      userState?: Record<string, unknown>;
    },
  ) => Promise<AomiChatResponse>;
  sendSystemMessage?: (
    sessionId: string,
    message: string,
  ) => Promise<{ res?: unknown }>;
  interrupt?: (sessionId: string) => Promise<AomiInterruptResponse>;
  renameThread?: (sessionId: string, title: string) => Promise<void>;
  archiveThread?: (sessionId: string) => Promise<void>;
  unarchiveThread?: (sessionId: string) => Promise<void>;
  deleteThread?: (sessionId: string) => Promise<void>;
  // Control API
  getApps?: (
    sessionId: string,
    options?: { publicKey?: string; apiKey?: string },
  ) => Promise<string[]>;
  getModels?: (sessionId: string) => Promise<string[]>;
  setModel?: (
    sessionId: string,
    rig: string,
    options?: { app?: string; apiKey?: string },
  ) => Promise<{ rig: string; app?: string }>;

  // Legacy aliases (so existing tests keep working without changes)
  fetchThreads?: (publicKey: string) => Promise<AomiThread[]>;
  postChatMessage?: (
    sessionId: string,
    message: string,
    options?: {
      app?: string;
      publicKey?: string;
      apiKey?: string;
      userState?: Record<string, unknown>;
    },
  ) => Promise<AomiChatResponse>;
  postSystemMessage?: (
    sessionId: string,
    message: string,
  ) => Promise<{ res?: unknown }>;
  postInterrupt?: (sessionId: string) => Promise<AomiInterruptResponse>;
};

// Global state for mock configuration
const mockState = {
  config: {} as AomiClientConfig,
  instances: [] as MockAomiClientInstance[],
};

export type MockAomiClientInstance = {
  emitSSEEvent: (event: AomiSSEEvent) => void;
  listThreads: ReturnType<typeof vi.fn>;
  fetchState: ReturnType<typeof vi.fn>;
  createThread: ReturnType<typeof vi.fn>;
  sendMessage: ReturnType<typeof vi.fn>;
  sendSystemMessage: ReturnType<typeof vi.fn>;
  interrupt: ReturnType<typeof vi.fn>;
  renameThread: ReturnType<typeof vi.fn>;
  archiveThread: ReturnType<typeof vi.fn>;
  unarchiveThread: ReturnType<typeof vi.fn>;
  deleteThread: ReturnType<typeof vi.fn>;
  // Control API
  getApps: ReturnType<typeof vi.fn>;
  getModels: ReturnType<typeof vi.fn>;
  setModel: ReturnType<typeof vi.fn>;
};

export const setAomiClientConfig = (config: AomiClientConfig) => {
  mockState.config = config;
};

export const resetAomiClientMocks = () => {
  mockState.config = {};
  mockState.instances.length = 0;
};

export const getAomiClientInstances = () => mockState.instances;
export const getLatestAomiClient = () =>
  mockState.instances[mockState.instances.length - 1];

// =============================================================================
// Mock AomiClient - defined before vi.mock so it's hoisted properly
// =============================================================================

vi.mock("@aomi-labs/client", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;

  // Mock class defined inside the factory
  class MockAomiClient {
    private sseHandler: ((event: AomiSSEEvent) => void) | null = null;

    listThreads = vi.fn(async (publicKey: string) => {
      const fn = mockState.config.listThreads ?? mockState.config.fetchThreads;
      return fn ? await fn(publicKey) : [];
    });

    fetchState = vi.fn(
      async (sessionId: string, userState?: Record<string, unknown>) => {
        return mockState.config.fetchState
          ? await mockState.config.fetchState(sessionId, userState)
          : { is_processing: false, messages: [] };
      },
    );

    createThread = vi.fn(async (threadId: string, publicKey?: string) => {
      return mockState.config.createThread
        ? await mockState.config.createThread(threadId, publicKey)
        : { session_id: threadId };
    });

    sendMessage = vi.fn(
      async (
        sessionId: string,
        message: string,
        options?: {
          app?: string;
          publicKey?: string;
          apiKey?: string;
          userState?: Record<string, unknown>;
        },
      ) => {
        const fn = mockState.config.sendMessage ?? mockState.config.postChatMessage;
        return fn
          ? await fn(sessionId, message, options)
          : { is_processing: true, messages: [] };
      },
    );

    sendSystemMessage = vi.fn(async (sessionId: string, message: string) => {
      const fn =
        mockState.config.sendSystemMessage ?? mockState.config.postSystemMessage;
      return fn
        ? await fn(sessionId, message)
        : { res: { sender: "system", content: message } };
    });

    interrupt = vi.fn(async (sessionId: string) => {
      const fn = mockState.config.interrupt ?? mockState.config.postInterrupt;
      return fn
        ? await fn(sessionId)
        : { is_processing: false, messages: [] };
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

    // Control API
    getApps = vi.fn(
      async (
        sessionId: string,
        options?: { publicKey?: string; apiKey?: string },
      ) => {
        return mockState.config.getApps
          ? await mockState.config.getApps(sessionId, options)
          : [];
      },
    );

    getModels = vi.fn(async (sessionId: string) => {
      return mockState.config.getModels
        ? await mockState.config.getModels(sessionId)
        : [];
    });

    setModel = vi.fn(
      async (
        sessionId: string,
        rig: string,
        options?: { app?: string; apiKey?: string },
      ) => {
        return mockState.config.setModel
          ? await mockState.config.setModel(sessionId, rig, options)
          : { rig, app: options?.app };
      },
    );

    subscribeSSE = (
      _sessionId: string,
      onUpdate: (event: AomiSSEEvent) => void,
    ) => {
      this.sseHandler = onUpdate;
      return () => {
        if (this.sseHandler === onUpdate) {
          this.sseHandler = null;
        }
      };
    };

    emitSSEEvent = (event: AomiSSEEvent) => {
      this.sseHandler?.(event);
    };

    constructor(_options: { baseUrl: string }) {
      mockState.instances.push(this as unknown as MockAomiClientInstance);
    }
  }

  return {
    ...actual,
    AomiClient: MockAomiClient,
  };
});

// =============================================================================
// Import after mock is set up
// =============================================================================

import { AomiRuntimeProvider } from "../aomi-runtime";
import { useAomiRuntime, type AomiRuntimeApi } from "../../interface";
import { useControl, type ControlContextApi } from "../../contexts/control-context";

// =============================================================================
// Test Harness Component
// =============================================================================

export type RuntimeHarnessHandle = {
  api: AomiRuntimeApi;
  control: ControlContextApi;
};

const RuntimeHarness = forwardRef<RuntimeHarnessHandle>((_, ref) => {
  const api = useAomiRuntime();
  const control = useControl();

  useImperativeHandle(ref, () => ({ api, control }), [api, control]);

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
  control: ControlContextApi;
  getApi: () => AomiRuntimeApi;
  getControl: () => ControlContextApi;
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
    control: ref.current.control,
    getApi: () => ref.current!.api,
    getControl: () => ref.current!.control,
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
