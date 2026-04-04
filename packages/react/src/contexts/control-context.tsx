"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { AomiClient } from "@aomi-labs/client";
import type { ThreadMetadata, ThreadControlState } from "../state/thread-store";
import { initThreadControl } from "../state/thread-store";

// =============================================================================
// Types
// =============================================================================

/** Global control state (shared across all threads) */
export type ControlState = {
  /** API key for authenticated requests */
  apiKey: string | null;
  /** Stable client identifier for this browser tab (associates sessions with secrets) */
  clientId: string | null;
  /** Available models fetched from backend */
  availableModels: string[];
  /** Authorized apps fetched from backend */
  authorizedApps: string[];
  /** Default model (first from availableModels) */
  defaultModel: string | null;
  /** Default app (from authorizedApps) */
  defaultApp: string | null;
};

export type ControlContextApi = {
  /** Global state (apiKey, clientId, available models/apps) */
  state: ControlState;
  /** Update global state (apiKey only) */
  setApiKey: (apiKey: string | null) => void;
  /** Ingest secrets into the backend vault, returns opaque handles */
  ingestSecrets: (secrets: Record<string, string>) => Promise<Record<string, string>>;
  /** Clear all secrets from the backend vault */
  clearSecrets: () => Promise<void>;
  /** Fetch available models from backend */
  getAvailableModels: () => Promise<string[]>;
  /** Fetch authorized apps from backend */
  getAuthorizedApps: () => Promise<string[]>;
  /** Get current thread's control state */
  getCurrentThreadControl: () => ThreadControlState;
  /** Get the current thread's effective app after auth fallback */
  getCurrentThreadApp: () => string;
  /** Select a model for the current thread (updates metadata + calls backend) */
  onModelSelect: (model: string) => Promise<void>;
  /** Select an app for the current thread (updates metadata only) */
  onAppSelect: (app: string) => void;
  /** Whether the current thread is processing (disables control switching) */
  isProcessing: boolean;
  /** Mark control state as synced (called after chat starts) */
  markControlSynced: () => void;
  /** Get global control state */
  getControlState: () => ControlState;
  /** Subscribe to global state changes */
  onControlStateChange: (callback: (state: ControlState) => void) => () => void;

  // Legacy compatibility
  /** @deprecated Use getCurrentThreadControl().app instead */
  setState: (
    updates: Partial<{ app: string | null; apiKey: string | null }>,
  ) => void;
};

// =============================================================================
// Constants
// =============================================================================

const API_KEY_STORAGE_KEY = "aomi_api_key";

function getDefaultApp(apps: string[]): string | null {
  return apps.includes("default") ? "default" : (apps[0] ?? null);
}

function resolveAuthorizedApp(
  app: string | null | undefined,
  authorizedApps: string[],
  defaultApp: string | null,
): string | null {
  if (app && authorizedApps.includes(app)) {
    return app;
  }
  return defaultApp;
}

// =============================================================================
// Context
// =============================================================================

const ControlContext = createContext<ControlContextApi | null>(null);

// =============================================================================
// Hook
// =============================================================================

export function useControl(): ControlContextApi {
  const ctx = useContext(ControlContext);
  if (!ctx) {
    throw new Error("useControl must be used within ControlContextProvider");
  }
  return ctx;
}

// =============================================================================
// Provider
// =============================================================================

export type ControlContextProviderProps = {
  children: ReactNode;
  aomiClient: AomiClient;
  sessionId: string;
  publicKey?: string;
  /** Get metadata for a thread */
  getThreadMetadata: (threadId: string) => ThreadMetadata | undefined;
  /** Update metadata for a thread */
  updateThreadMetadata: (
    threadId: string,
    updates: Partial<ThreadMetadata>,
  ) => void;
};

export function ControlContextProvider({
  children,
  aomiClient,
  sessionId,
  publicKey,
  getThreadMetadata,
  updateThreadMetadata,
}: ControlContextProviderProps) {
  const [state, setStateInternal] = useState<ControlState>(() => ({
    apiKey: null,
    clientId: null,
    availableModels: [],
    authorizedApps: [],
    defaultModel: null,
    defaultApp: null,
  }));

  const stateRef = useRef(state);
  stateRef.current = state;

  const aomiClientRef = useRef(aomiClient);
  aomiClientRef.current = aomiClient;

  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const publicKeyRef = useRef(publicKey);
  publicKeyRef.current = publicKey;

  const getThreadMetadataRef = useRef(getThreadMetadata);
  getThreadMetadataRef.current = getThreadMetadata;

  const updateThreadMetadataRef = useRef(updateThreadMetadata);
  updateThreadMetadataRef.current = updateThreadMetadata;

  const callbacks = useRef<Set<(state: ControlState) => void>>(new Set());

  // Compute isProcessing from current thread's control state
  const currentThreadMetadata = getThreadMetadata(sessionId);
  const isProcessing = currentThreadMetadata?.control?.isProcessing ?? false;

  // Generate a stable client_id for this browser tab on mount
  useEffect(() => {
    const clientId = globalThis.crypto?.randomUUID?.() ?? `client-${Date.now()}`;
    setStateInternal((prev) => ({ ...prev, clientId }));
  }, []);

  // Load API key from localStorage on mount
  useEffect(() => {
    try {
      const storedApiKey =
        globalThis.localStorage?.getItem(API_KEY_STORAGE_KEY) ?? null;
      if (storedApiKey) {
        setStateInternal((prev) => ({ ...prev, apiKey: storedApiKey }));
      }
    } catch {
      // localStorage not available
    }
  }, []);

  // Persist API key to localStorage
  useEffect(() => {
    try {
      if (state.apiKey) {
        globalThis.localStorage?.setItem(API_KEY_STORAGE_KEY, state.apiKey);
      } else {
        globalThis.localStorage?.removeItem(API_KEY_STORAGE_KEY);
      }
    } catch {
      // localStorage not available
    }
  }, [state.apiKey]);

  // Fetch apps whenever the auth context changes
  useEffect(() => {
    const fetchApps = async () => {
      try {
        const apps = await aomiClientRef.current.getApps(
          sessionIdRef.current,
          {
            publicKey: publicKeyRef.current,
            apiKey: stateRef.current.apiKey ?? undefined,
          },
        );
        const defaultApp = getDefaultApp(apps);
        setStateInternal((prev) => ({
          ...prev,
          authorizedApps: apps,
          defaultApp,
        }));
      } catch (error) {
        console.error("Failed to fetch apps:", error);
        setStateInternal((prev) => ({
          ...prev,
          authorizedApps: ["default"],
          defaultApp: "default",
        }));
      }
    };
    void fetchApps();
  }, [state.apiKey, publicKey, sessionId]);

  // Fetch models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const models = await aomiClientRef.current.getModels(
          sessionIdRef.current,
        );
        setStateInternal((prev) => ({
          ...prev,
          availableModels: models,
          defaultModel: models[0] ?? null,
        }));
      } catch (error) {
        console.error("Failed to fetch models:", error);
      }
    };
    void fetchModels();
  }, []);

  // ---------------------------------------------------------------------------
  // API Key
  // ---------------------------------------------------------------------------
  const setApiKey = useCallback((apiKey: string | null) => {
    setStateInternal((prev) => {
      const next = { ...prev, apiKey: apiKey === "" ? null : apiKey };
      callbacks.current.forEach((cb) => cb(next));
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Secrets
  // ---------------------------------------------------------------------------
  const ingestSecrets = useCallback(
    async (secrets: Record<string, string>): Promise<Record<string, string>> => {
      const clientId = stateRef.current.clientId;
      if (!clientId) throw new Error("clientId not initialized");
      const { handles } = await aomiClientRef.current.ingestSecrets(
        clientId,
        secrets,
      );
      return handles;
    },
    [],
  );

  const clearSecrets = useCallback(async (): Promise<void> => {
    const clientId = stateRef.current.clientId;
    if (!clientId) return;
    await aomiClientRef.current.clearSecrets(clientId);
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch available options
  // ---------------------------------------------------------------------------
  const getAvailableModels = useCallback(async (): Promise<string[]> => {
    try {
      const models = await aomiClientRef.current.getModels(
        sessionIdRef.current,
      );
      setStateInternal((prev) => ({
        ...prev,
        availableModels: models,
        defaultModel: prev.defaultModel ?? models[0] ?? null,
      }));
      return models;
    } catch (error) {
      console.error("Failed to fetch models:", error);
      return [];
    }
  }, []);

  const getAuthorizedApps = useCallback(async (): Promise<string[]> => {
    try {
      const apps = await aomiClientRef.current.getApps(
        sessionIdRef.current,
        {
          publicKey: publicKeyRef.current,
          apiKey: stateRef.current.apiKey ?? undefined,
        },
      );
      const defaultApp = getDefaultApp(apps);
      setStateInternal((prev) => ({
        ...prev,
        authorizedApps: apps,
        defaultApp,
      }));
      return apps;
    } catch (error) {
      console.error("Failed to fetch apps:", error);
      setStateInternal((prev) => ({
        ...prev,
        authorizedApps: ["default"],
        defaultApp: "default",
      }));
      return ["default"];
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Per-thread control state
  // ---------------------------------------------------------------------------
  const getCurrentThreadControl = useCallback((): ThreadControlState => {
    const metadata = getThreadMetadataRef.current(sessionIdRef.current);
    return metadata?.control ?? initThreadControl();
  }, []);

  const getCurrentThreadApp = useCallback((): string => {
    const currentControl =
      getThreadMetadataRef.current(sessionIdRef.current)?.control ??
      initThreadControl();
    return (
      resolveAuthorizedApp(
        currentControl.app,
        stateRef.current.authorizedApps,
        stateRef.current.defaultApp,
      ) ?? "default"
    );
  }, []);

  const onModelSelect = useCallback(async (model: string) => {
    const threadId = sessionIdRef.current;
    const currentControl =
      getThreadMetadataRef.current(threadId)?.control ?? initThreadControl();
    const isProcessing = currentControl.isProcessing;

    console.log("[control-context] onModelSelect called", {
      model,
      isProcessing,
      threadId,
    });

    if (isProcessing) {
      console.warn("[control-context] Cannot switch model while processing");
      return;
    }

    const app =
      resolveAuthorizedApp(
        currentControl.app,
        stateRef.current.authorizedApps,
        stateRef.current.defaultApp,
      ) ?? "default";

    console.log("[control-context] onModelSelect updating metadata", {
      threadId,
      model,
      app,
      currentControl,
    });

    // Update thread metadata with new model and mark as dirty
    updateThreadMetadataRef.current(threadId, {
      control: {
        ...currentControl,
        model,
        app,
        controlDirty: true,
      },
    });

    console.log("[control-context] onModelSelect calling backend setModel", {
      threadId,
      model,
      app,
      backendUrl: aomiClientRef.current,
    });

    try {
      const result = await aomiClientRef.current.setModel(
        threadId,
        model,
        { app, apiKey: stateRef.current.apiKey ?? undefined },
      );
      console.log("[control-context] onModelSelect backend result", result);
    } catch (err) {
      console.error("[control-context] setModel failed:", err);
      throw err;
    }
  }, []);

  const onAppSelect = useCallback((app: string) => {
    const threadId = sessionIdRef.current;
    const currentControl =
      getThreadMetadataRef.current(threadId)?.control ?? initThreadControl();
    const isProcessing = currentControl.isProcessing;

    console.log("[control-context] onAppSelect called", {
      app,
      isProcessing,
      threadId,
    });

    if (isProcessing) {
      console.warn(
        "[control-context] Cannot switch app while processing",
      );
      return;
    }

    if (
      stateRef.current.authorizedApps.length > 0 &&
      !stateRef.current.authorizedApps.includes(app)
    ) {
      console.warn("[control-context] Cannot select unauthorized app", { app });
      return;
    }

    console.log("[control-context] onAppSelect updating metadata", {
      threadId,
      app,
      currentControl,
    });

    // Update thread metadata with new app and mark as dirty
    updateThreadMetadataRef.current(threadId, {
      control: {
        ...currentControl,
        app,
        controlDirty: true,
      },
    });

    console.log("[control-context] onAppSelect metadata updated");
  }, []);

  const markControlSynced = useCallback(() => {
    const threadId = sessionIdRef.current;
    const currentControl =
      getThreadMetadataRef.current(threadId)?.control ?? initThreadControl();

    if (currentControl.controlDirty) {
      updateThreadMetadataRef.current(threadId, {
        control: {
          ...currentControl,
          controlDirty: false,
        },
      });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Global state access
  // ---------------------------------------------------------------------------
  const getControlState = useCallback(() => stateRef.current, []);

  const onControlStateChange = useCallback(
    (callback: (state: ControlState) => void) => {
      callbacks.current.add(callback);
      return () => {
        callbacks.current.delete(callback);
      };
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Legacy compatibility
  // ---------------------------------------------------------------------------
  const setState = useCallback(
    (updates: Partial<{ app: string | null; apiKey: string | null }>) => {
      if ("apiKey" in updates) {
        setApiKey(updates.apiKey ?? null);
      }
      if (
        "app" in updates &&
        updates.app !== undefined &&
        updates.app !== null
      ) {
        onAppSelect(updates.app);
      }
    },
    [setApiKey, onAppSelect],
  );

  return (
    <ControlContext.Provider
      value={{
        state,
        setApiKey,
        ingestSecrets,
        clearSecrets,
        getAvailableModels,
        getAuthorizedApps,
        getCurrentThreadControl,
        getCurrentThreadApp,
        onModelSelect,
        onAppSelect,
        isProcessing,
        markControlSynced,
        getControlState,
        onControlStateChange,
        setState,
      }}
    >
      {children}
    </ControlContext.Provider>
  );
}
