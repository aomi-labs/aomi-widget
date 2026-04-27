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
  const UserState = actual.UserState as {
    normalize: (
      userState?: Record<string, unknown> | null,
    ) => Record<string, unknown> | undefined;
    address: (userState?: Record<string, unknown> | null) => string | undefined;
    isConnected: (userState?: Record<string, unknown> | null) => boolean | undefined;
  };

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

  // Mock Session (ClientSession) that delegates to a MockAomiClient
  class MockSession {
    readonly client: InstanceType<typeof MockAomiClient>;
    readonly sessionId: string;
    private _isProcessing = false;
    private _messages: unknown[] = [];
    private _title?: string;
    private listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    private _pollTimer: ReturnType<typeof setInterval> | null = null;

    private _app?: string;
    private _publicKey?: string;
    private _apiKey?: string;
    private _userState?: Record<string, unknown>;
    private _clientId?: string;
    private _walletRequests: Array<{
      id: string;
      kind: "transaction" | "eip712_sign";
      payload: Record<string, unknown>;
      timestamp: number;
    }> = [];

    constructor(
      clientOrOptions: unknown,
      opts?: { sessionId?: string; app?: string; publicKey?: string; apiKey?: string; clientId?: string; userState?: Record<string, unknown>; [key: string]: unknown },
    ) {
      // If passed a MockAomiClient, use it directly
      if (clientOrOptions && typeof (clientOrOptions as Record<string, unknown>).sendMessage === "function") {
        this.client = clientOrOptions as InstanceType<typeof MockAomiClient>;
      } else {
        this.client = new MockAomiClient(clientOrOptions as { baseUrl: string });
      }
      this.sessionId = opts?.sessionId ?? "mock-session";
      this._app = opts?.app;
      this._publicKey = opts?.publicKey;
      this._apiKey = opts?.apiKey;
      this._clientId = opts?.clientId;
      this.resolveUserState(opts?.userState);

      // SSE subscription
      this.client.subscribeSSE(this.sessionId, (event: AomiSSEEvent) => {
        this.emit(event.type, event);
      });
    }

    on(type: string, handler: (...args: unknown[]) => void) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type)!.add(handler);
      return () => { this.listeners.get(type)?.delete(handler); };
    }

    private emit(type: string, ...args: unknown[]) {
      const handlers = this.listeners.get(type);
      if (handlers) {
        for (const h of handlers) h(...args);
      }
    }

    async sendAsync(message: string) {
      const response = await this.client.sendMessage(this.sessionId, message, {
        app: this._app,
        publicKey: this._publicKey ?? (this._userState?.address as string | undefined),
        apiKey: this._apiKey,
        userState: this._userState,
        clientId: this._clientId,
      });
      this.applyState(response);
      if (response?.is_processing) {
        this._isProcessing = true;
        this.emit("processing_start", undefined);
        this.startPolling();
      }
      return response;
    }

    async interrupt() {
      const response = await this.client.interrupt(this.sessionId);
      this._isProcessing = false;
      this.emit("processing_end", undefined);
      return response;
    }

    async fetchCurrentState() {
      const state = await this.client.fetchState(this.sessionId, this._userState, this._clientId);
      this.applyState(state);
      this._isProcessing = !!state?.is_processing;
    }

    async resolve(_id: string, _result: unknown) {}
    async reject(_id: string, _reason?: string) {}

    resolveUserState(userState: unknown) {
      const normalized = UserState.normalize(
        userState as Record<string, unknown> | null | undefined,
      );
      if (!normalized) return;

      this._userState = normalized;
      this._publicKey =
        UserState.isConnected(normalized) === false
          ? undefined
          : UserState.address(normalized);
      this.syncWalletRequests();
    }
    syncRuntimeOptions(
      options: {
        app: string;
        publicKey?: string;
        apiKey?: string;
        clientId?: string;
        userState?: Record<string, unknown>;
      },
    ) {
      this._app = options.app;
      this._publicKey = options.publicKey;
      this._apiKey = options.apiKey;
      this._clientId = options.clientId ?? this._clientId;
      if (options.userState) {
        this.resolveUserState(options.userState);
      }
    }
    resolveWallet(_address: string, _chainId?: number) {}
    startPolling() {
      if (this._pollTimer) return;
      this._pollTimer = setInterval(async () => {
        try {
          const state = await this.client.fetchState(this.sessionId, this._userState, this._clientId);
          this.applyState(state);
          if (!state?.is_processing) {
            this.stopPolling();
            this._isProcessing = false;
            this.emit("processing_end", undefined);
          }
        } catch {
          this.stopPolling();
        }
      }, 100);
    }
    stopPolling() {
      if (this._pollTimer) {
        clearInterval(this._pollTimer);
        this._pollTimer = null;
      }
    }
    getIsProcessing() { return this._isProcessing; }
    getIsPolling() { return this._pollTimer !== null; }
    getMessages() { return this._messages; }
    getTitle() { return this._title; }
    getPendingRequests() { return [...this._walletRequests]; }
    getUserState() { return this._userState ? { ...this._userState } : undefined; }
    close() { this.stopPolling(); this.listeners.clear(); }
    removeAllListeners() { this.listeners.clear(); }

    private applyState(
      state?: AomiStateResponse | AomiChatResponse | { user_state?: Record<string, unknown> | null },
    ) {
      if (state?.user_state) {
        this.resolveUserState(state.user_state);
      }
      if (state?.messages) {
        this._messages = state.messages;
        this.emit("messages", state.messages);
      }
    }

    private syncWalletRequests() {
      const pendingTxs =
        this._userState?.pending_txs &&
        typeof this._userState.pending_txs === "object" &&
        !Array.isArray(this._userState.pending_txs)
          ? (this._userState.pending_txs as Record<string, Record<string, unknown>>)
          : {};
      const pendingEip712s =
        this._userState?.pending_eip712s &&
        typeof this._userState.pending_eip712s === "object" &&
        !Array.isArray(this._userState.pending_eip712s)
          ? (this._userState.pending_eip712s as Record<string, Record<string, unknown>>)
          : {};

      this._walletRequests = [
        ...Object.entries(pendingTxs)
          .sort((left, right) => Number(left[0]) - Number(right[0]))
          .map(([id, payload]) => ({
            id: `tx-${id}`,
            kind: "transaction" as const,
            payload: {
              ...payload,
              txId: Number(id),
              txIds: [Number(id)],
              aaPreference: "auto",
            },
            timestamp: Date.now(),
          })),
        ...Object.entries(pendingEip712s)
          .sort((left, right) => Number(left[0]) - Number(right[0]))
          .map(([id, payload]) => ({
            id: `eip712-${id}`,
            kind: "eip712_sign" as const,
            payload: {
              ...payload,
              eip712Id: Number(id),
              pending_eip712_id: Number(id),
            },
            timestamp: Date.now(),
          })),
      ];

      this.emit("wallet_requests_changed", this.getPendingRequests());
    }
  }

  return {
    ...actual,
    AomiClient: MockAomiClient,
    Session: MockSession,
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
