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
import type { BackendApi } from "../backend/client";
import type { ThreadMetadata, ThreadControlState } from "../state/thread-store";
import { initThreadControl } from "../state/thread-store";

// =============================================================================
// Types
// =============================================================================

/** Global control state (shared across all threads) */
export type ControlState = {
  /** API key for authenticated requests */
  apiKey: string | null;
  /** Available models fetched from backend */
  availableModels: string[];
  /** Authorized namespaces fetched from backend */
  authorizedNamespaces: string[];
  /** Default model (first from availableModels) */
  defaultModel: string | null;
  /** Default namespace (from authorizedNamespaces) */
  defaultNamespace: string | null;
};

export type ControlContextApi = {
  /** Global state (apiKey, available models/namespaces) */
  state: ControlState;
  /** Update global state (apiKey only) */
  setApiKey: (apiKey: string | null) => void;
  /** Fetch available models from backend */
  getAvailableModels: () => Promise<string[]>;
  /** Fetch authorized namespaces from backend */
  getAuthorizedNamespaces: () => Promise<string[]>;
  /** Get current thread's control state */
  getCurrentThreadControl: () => ThreadControlState;
  /** Select a model for the current thread (updates metadata + calls backend) */
  onModelSelect: (model: string) => Promise<void>;
  /** Select a namespace for the current thread (updates metadata only) */
  onNamespaceSelect: (namespace: string) => void;
  /** Whether the current thread is processing (disables control switching) */
  isProcessing: boolean;
  /** Mark control state as synced (called after chat starts) */
  markControlSynced: () => void;
  /** Get global control state */
  getControlState: () => ControlState;
  /** Subscribe to global state changes */
  onControlStateChange: (callback: (state: ControlState) => void) => () => void;

  // Legacy compatibility
  /** @deprecated Use getCurrentThreadControl().namespace instead */
  setState: (
    updates: Partial<{ namespace: string | null; apiKey: string | null }>,
  ) => void;
};

// =============================================================================
// Constants
// =============================================================================

const API_KEY_STORAGE_KEY = "aomi_api_key";

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
  backendApi: BackendApi;
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
  backendApi,
  sessionId,
  publicKey,
  getThreadMetadata,
  updateThreadMetadata,
}: ControlContextProviderProps) {
  const [state, setStateInternal] = useState<ControlState>(() => ({
    apiKey: null,
    availableModels: [],
    authorizedNamespaces: [],
    defaultModel: null,
    defaultNamespace: null,
  }));

  const stateRef = useRef(state);
  stateRef.current = state;

  const backendApiRef = useRef(backendApi);
  backendApiRef.current = backendApi;

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

  // Fetch namespaces when apiKey changes
  useEffect(() => {
    const fetchNamespaces = async () => {
      try {
        const namespaces = await backendApiRef.current.getNamespaces(
          sessionIdRef.current,
          publicKeyRef.current,
          stateRef.current.apiKey ?? undefined,
        );
        const defaultNs = namespaces.includes("default")
          ? "default"
          : (namespaces[0] ?? null);
        setStateInternal((prev) => ({
          ...prev,
          authorizedNamespaces: namespaces,
          defaultNamespace: defaultNs,
        }));
      } catch (error) {
        console.error("Failed to fetch namespaces:", error);
        setStateInternal((prev) => ({
          ...prev,
          authorizedNamespaces: ["default"],
          defaultNamespace: "default",
        }));
      }
    };
    void fetchNamespaces();
  }, [state.apiKey]);

  // Fetch models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const models = await backendApiRef.current.getModels(
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
  // Fetch available options
  // ---------------------------------------------------------------------------
  const getAvailableModels = useCallback(async (): Promise<string[]> => {
    try {
      const models = await backendApiRef.current.getModels(
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

  const getAuthorizedNamespaces = useCallback(async (): Promise<string[]> => {
    try {
      const namespaces = await backendApiRef.current.getNamespaces(
        sessionIdRef.current,
        publicKeyRef.current,
        stateRef.current.apiKey ?? undefined,
      );
      const defaultNs = namespaces.includes("default")
        ? "default"
        : (namespaces[0] ?? null);
      setStateInternal((prev) => ({
        ...prev,
        authorizedNamespaces: namespaces,
        defaultNamespace: defaultNs,
      }));
      return namespaces;
    } catch (error) {
      console.error("Failed to fetch namespaces:", error);
      setStateInternal((prev) => ({
        ...prev,
        authorizedNamespaces: ["default"],
        defaultNamespace: "default",
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

  const onModelSelect = useCallback(async (model: string) => {
    const threadId = sessionIdRef.current;
    const currentControl =
      getThreadMetadataRef.current(threadId)?.control ??
      initThreadControl();
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

    const namespace =
      currentControl.namespace ??
      stateRef.current.defaultNamespace ??
      "default";

    console.log("[control-context] onModelSelect updating metadata", {
      threadId,
      model,
      namespace,
      currentControl,
    });

    // Update thread metadata with new model and mark as dirty
    updateThreadMetadataRef.current(threadId, {
      control: {
        ...currentControl,
        model,
        namespace,
        controlDirty: true,
      },
    });

    console.log("[control-context] onModelSelect calling backend setModel", {
      threadId,
      model,
      namespace,
      backendUrl: backendApiRef.current,
    });

    try {
      const result = await backendApiRef.current.setModel(
        threadId,
        model,
        namespace,
        stateRef.current.apiKey ?? undefined,
      );
      console.log("[control-context] onModelSelect backend result", result);
    } catch (err) {
      console.error("[control-context] setModel failed:", err);
      throw err;
    }
  }, []);

  const onNamespaceSelect = useCallback((namespace: string) => {
    const threadId = sessionIdRef.current;
    const currentControl =
      getThreadMetadataRef.current(threadId)?.control ??
      initThreadControl();
    const isProcessing = currentControl.isProcessing;

    console.log("[control-context] onNamespaceSelect called", {
      namespace,
      isProcessing,
      threadId,
    });

    if (isProcessing) {
      console.warn(
        "[control-context] Cannot switch namespace while processing",
      );
      return;
    }

    console.log("[control-context] onNamespaceSelect updating metadata", {
      threadId,
      namespace,
      currentControl,
    });

    // Update thread metadata with new namespace and mark as dirty
    updateThreadMetadataRef.current(threadId, {
      control: {
        ...currentControl,
        namespace,
        controlDirty: true,
      },
    });

    console.log("[control-context] onNamespaceSelect metadata updated");
  }, []);

  const markControlSynced = useCallback(() => {
    const threadId = sessionIdRef.current;
    const currentControl =
      getThreadMetadataRef.current(threadId)?.control ??
      initThreadControl();

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
    (updates: Partial<{ namespace: string | null; apiKey: string | null }>) => {
      if ("apiKey" in updates) {
        setApiKey(updates.apiKey ?? null);
      }
      if (
        "namespace" in updates &&
        updates.namespace !== undefined &&
        updates.namespace !== null
      ) {
        onNamespaceSelect(updates.namespace);
      }
    },
    [setApiKey, onNamespaceSelect],
  );

  return (
    <ControlContext.Provider
      value={{
        state,
        setApiKey,
        getAvailableModels,
        getAuthorizedNamespaces,
        getCurrentThreadControl,
        onModelSelect,
        onNamespaceSelect,
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
