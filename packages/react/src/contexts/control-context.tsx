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
import type { AomiAppDescriptor, AomiClient } from "@aomi-labs/client";
import type {
  ModelSelectionMode,
  ThreadMetadata,
  ThreadControlState,
} from "../state/thread-store";
import { initThreadControl } from "../state/thread-store";
import { resolveAutoModel } from "../utils/model-selection";
import {
  CLIENT_ID_STORAGE_KEY,
  getControlSessionId,
  getOrCreateClientId,
} from "../utils/client-session";

// =============================================================================
// Types
// =============================================================================

/** A stored BYOK entry for an LLM provider */
export type StoredByokKey = {
  apiKey: string;
  keyPrefix: string;
  label?: string;
};

export type StoredModelPreference = {
  mode: ModelSelectionMode;
  model: string | null;
};

/** Global control state (shared across all threads) */
export type ControlState = {
  /** API key for authenticated requests */
  apiKey: string | null;
  /** Stable client identifier for this browser profile (associates sessions with secrets) */
  clientId: string | null;
  /** Available models fetched from backend */
  availableModels: string[];
  /** Authorized apps fetched from backend — names only, derived from
   *  `appDescriptors`. Kept as a separate field so existing
   *  `authorizedApps.includes(app)` consumers keep working. */
  authorizedApps: string[];
  /** Full per-app descriptors from `/api/thread/apps`, including each
   *  app's declared secret slots. Used by the Secrets settings page to
   *  render slot inputs and by the chat shell to gate app load. */
  appDescriptors: AomiAppDescriptor[];
  /** Default model (first from availableModels) */
  defaultModel: string | null;
  /** Default app (from authorizedApps) */
  defaultApp: string | null;
  /** BYOK entries stored locally — keyed by LLM provider name */
  byokKeys: Record<string, StoredByokKey>;
};

export type ControlContextApi = {
  /** Global state (apiKey, clientId, available models/apps) */
  state: ControlState;
  /** Update global state (apiKey only) */
  setApiKey: (apiKey: string | null) => void;
  /** Ingest secrets into the backend vault, returns opaque handles. Pass
   *  `app` to scope to the per-app store; omit for the flat client store
   *  (BYOK / STREAM / legacy). */
  ingestSecrets: (
    secrets: Record<string, string>,
    app?: string,
  ) => Promise<Record<string, string>>;
  /** Clear secrets from the backend vault. With `app`, clears only that
   *  app's per-app slots; without, wipes the entire client (flat + app). */
  clearSecrets: (app?: string) => Promise<void>;
  /** Remove a single secret. With `app`, targets the per-app store under
   *  that scope; without, targets the flat store. */
  deleteSecret: (name: string, app?: string) => Promise<void>;
  /** Return the names of slots filled per app for this client. Source of
   *  truth for the Secrets settings page (no values are returned). */
  listSecrets: () => Promise<Record<string, string[]>>;
  /** Store a BYOK entry for an LLM provider in localStorage and ingest into backend vault */
  setByok: (provider: string, apiKey: string, label?: string) => Promise<void>;
  /** Remove a BYOK entry from localStorage and backend vault */
  removeByok: (provider: string) => Promise<void>;
  /** Get all stored BYOK entries (metadata only — keys are in state.byokKeys) */
  getByokKeys: () => Record<string, StoredByokKey>;
  /** Check if a BYOK entry is stored */
  hasByok: (provider?: string) => boolean;
  /** Fetch available models from backend */
  getAvailableModels: () => Promise<string[]>;
  /** Fetch authorized apps from backend */
  getAuthorizedApps: () => Promise<string[]>;
  /** Get current thread's control state */
  getCurrentThreadControl: () => ThreadControlState;
  /** Get the current thread's effective app after auth fallback */
  getCurrentThreadApp: () => string;
  /** Get the current thread's effective application id after auth fallback */
  getCurrentThreadApplicationId: () => number | string | null;
  /** Select a model for the current thread (updates metadata + calls backend) */
  onModelSelect: (
    model: string,
    options?: { mode?: ModelSelectionMode },
  ) => Promise<void>;
  /** Select an app for the current thread (updates metadata only) */
  onAppSelect: (
    app: string,
    options?: { applicationId?: number | string | null },
  ) => void;
  /** Whether the current thread is processing (disables control switching) */
  isProcessing: boolean;
  /** Mark control state as synced (called after chat starts) */
  markControlSynced: () => void;
  /** Sync pending control state to the backend before sending */
  syncCurrentThreadControl: (options?: {
    ignoreProcessing?: boolean;
  }) => Promise<void>;
  /** Build initial control state for new local threads */
  getPreferredThreadControl: () => ThreadControlState;
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

const API_KEY_STORAGE_KEY = "aomi_secret_key";
const BYOK_KEYS_STORAGE_KEY = "aomi_byok_keys";
const MODEL_SELECTION_STORAGE_KEY = "aomi_model_selection";
const BYOK_SECRET_PREFIX = "PROVIDER_KEY:";

function getDefaultApp(apps: string[]): string | null {
  return apps.includes("default") ? "default" : (apps[0] ?? null);
}

function namesFromDescriptors(apps: ReadonlyArray<{ name: string }>): string[] {
  return apps.map((a) => a.name);
}

function readStoredModelPreference(): StoredModelPreference {
  try {
    const raw = globalThis.localStorage?.getItem(MODEL_SELECTION_STORAGE_KEY);
    if (!raw) return { mode: "auto", model: null };
    const parsed = JSON.parse(raw) as Partial<StoredModelPreference>;
    return {
      mode: parsed.mode === "manual" ? "manual" : "auto",
      model: typeof parsed.model === "string" ? parsed.model : null,
    };
  } catch {
    return { mode: "auto", model: null };
  }
}

function writeStoredModelPreference(preference: StoredModelPreference): void {
  try {
    globalThis.localStorage?.setItem(
      MODEL_SELECTION_STORAGE_KEY,
      JSON.stringify(preference),
    );
  } catch {
    // localStorage not available
  }
}

function resolvePreferredModelSelection(
  preference: StoredModelPreference,
  models: string[],
  defaultModel: string | null,
): StoredModelPreference {
  if (
    preference.mode === "manual" &&
    preference.model &&
    models.includes(preference.model)
  ) {
    return preference;
  }

  if (preference.mode === "auto") {
    return {
      mode: "auto",
      model: resolveAutoModel(models) ?? defaultModel,
    };
  }

  return {
    mode: "auto",
    model: defaultModel ?? resolveAutoModel(models),
  };
}

function getFallbackModel(
  models: string[],
  defaultModel: string | null,
): string | null {
  return defaultModel ?? resolveAutoModel(models);
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

export function useApiKey(): {
  state: Pick<ControlState, "apiKey" | "clientId">;
  actions: Pick<ControlContextApi, "setApiKey">;
} {
  const ctx = useControl();
  return {
    state: {
      apiKey: ctx.state.apiKey,
      clientId: ctx.state.clientId,
    },
    actions: {
      setApiKey: ctx.setApiKey,
    },
  };
}

export function useByok(): {
  state: Pick<ControlState, "byokKeys">;
  actions: Pick<
    ControlContextApi,
    | "clearSecrets"
    | "deleteSecret"
    | "getByokKeys"
    | "hasByok"
    | "ingestSecrets"
    | "listSecrets"
    | "removeByok"
    | "setByok"
  >;
} {
  const ctx = useControl();
  return {
    state: {
      byokKeys: ctx.state.byokKeys,
    },
    actions: {
      clearSecrets: ctx.clearSecrets,
      deleteSecret: ctx.deleteSecret,
      getByokKeys: ctx.getByokKeys,
      hasByok: ctx.hasByok,
      ingestSecrets: ctx.ingestSecrets,
      listSecrets: ctx.listSecrets,
      removeByok: ctx.removeByok,
      setByok: ctx.setByok,
    },
  };
}

export function useAuthEndpoints(): {
  state: Pick<
    ControlState,
    | "appDescriptors"
    | "authorizedApps"
    | "availableModels"
    | "defaultApp"
    | "defaultModel"
  >;
  actions: Pick<ControlContextApi, "getAuthorizedApps" | "getAvailableModels">;
} {
  const ctx = useControl();
  return {
    state: {
      appDescriptors: ctx.state.appDescriptors,
      authorizedApps: ctx.state.authorizedApps,
      availableModels: ctx.state.availableModels,
      defaultApp: ctx.state.defaultApp,
      defaultModel: ctx.state.defaultModel,
    },
    actions: {
      getAuthorizedApps: ctx.getAuthorizedApps,
      getAvailableModels: ctx.getAvailableModels,
    },
  };
}

export function usePerThreadControl(): {
  actions: Pick<
    ControlContextApi,
    | "getCurrentThreadApp"
    | "getCurrentThreadApplicationId"
    | "getCurrentThreadControl"
    | "getPreferredThreadControl"
    | "markControlSynced"
    | "onAppSelect"
    | "onModelSelect"
    | "syncCurrentThreadControl"
  >;
  isProcessing: boolean;
} {
  const ctx = useControl();
  return {
    actions: {
      getCurrentThreadApp: ctx.getCurrentThreadApp,
      getCurrentThreadApplicationId: ctx.getCurrentThreadApplicationId,
      getCurrentThreadControl: ctx.getCurrentThreadControl,
      getPreferredThreadControl: ctx.getPreferredThreadControl,
      markControlSynced: ctx.markControlSynced,
      onAppSelect: ctx.onAppSelect,
      onModelSelect: ctx.onModelSelect,
      syncCurrentThreadControl: ctx.syncCurrentThreadControl,
    },
    isProcessing: ctx.isProcessing,
  };
}

// =============================================================================
// Provider
// =============================================================================

export type ControlContextProviderProps = {
  children: ReactNode;
  aomiClient: AomiClient;
  sessionId: string;
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
  getThreadMetadata,
  updateThreadMetadata,
}: ControlContextProviderProps) {
  const [state, setStateInternal] = useState<ControlState>(() => ({
    apiKey: null,
    clientId: getOrCreateClientId(),
    availableModels: [],
    authorizedApps: [],
    appDescriptors: [],
    defaultModel: null,
    defaultApp: null,
    byokKeys: {},
  }));

  const stateRef = useRef(state);
  stateRef.current = state;

  const aomiClientRef = useRef(aomiClient);
  aomiClientRef.current = aomiClient;

  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const getThreadMetadataRef = useRef(getThreadMetadata);
  getThreadMetadataRef.current = getThreadMetadata;

  const updateThreadMetadataRef = useRef(updateThreadMetadata);
  updateThreadMetadataRef.current = updateThreadMetadata;

  const callbacks = useRef<Set<(state: ControlState) => void>>(new Set());
  const getCurrentControlSessionId = useCallback(
    () => getControlSessionId(stateRef.current.clientId, sessionIdRef.current),
    [],
  );

  // Compute isProcessing from current thread's control state
  const currentThreadMetadata = getThreadMetadata(sessionId);
  const isProcessing = currentThreadMetadata?.control?.isProcessing ?? false;

  // Persist client id so settings page and chat runtime share one vault namespace.
  useEffect(() => {
    try {
      if (state.clientId) {
        globalThis.localStorage?.setItem(CLIENT_ID_STORAGE_KEY, state.clientId);
      }
    } catch {
      // localStorage not available
    }
  }, [state.clientId]);

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

  // Load BYOK keys from localStorage on mount
  useEffect(() => {
    try {
      const raw = globalThis.localStorage?.getItem(BYOK_KEYS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, StoredByokKey>;
        setStateInternal((prev) => ({ ...prev, byokKeys: parsed }));
      }
    } catch {
      // localStorage not available or invalid JSON
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

  // Persist BYOK keys to localStorage
  useEffect(() => {
    try {
      const keys = state.byokKeys;
      if (Object.keys(keys).length > 0) {
        globalThis.localStorage?.setItem(
          BYOK_KEYS_STORAGE_KEY,
          JSON.stringify(keys),
        );
      } else {
        globalThis.localStorage?.removeItem(BYOK_KEYS_STORAGE_KEY);
      }
    } catch {
      // localStorage not available
    }
  }, [state.byokKeys]);

  // Auto-ingest BYOK keys into backend vault when the client id or stored key set changes.
  useEffect(() => {
    if (!state.clientId) return;
    const keys = stateRef.current.byokKeys;
    if (Object.keys(keys).length === 0) return;

    const secrets: Record<string, string> = {};
    for (const [provider, entry] of Object.entries(keys)) {
      secrets[`${BYOK_SECRET_PREFIX}${provider}`] = entry.apiKey;
    }

    void aomiClientRef.current
      .ingestSecrets(getCurrentControlSessionId(), state.clientId, secrets)
      .catch((err: unknown) => {
        console.error("Failed to auto-ingest BYOK keys:", err);
      });
  }, [getCurrentControlSessionId, state.clientId, state.byokKeys]);

  // Fetch apps whenever the auth context changes. App authorization is scoped
  // to api-key state, so thread switches and wallet/network changes should
  // not refetch it (refetching on publicKey change makes the app picker
  // reset to default when the user switches between EVM and Solana wallets).
  useEffect(() => {
    const fetchApps = async () => {
      try {
        const descriptors = await aomiClientRef.current.getApps(
          getCurrentControlSessionId(),
          {
            apiKey: stateRef.current.apiKey ?? undefined,
          },
        );
        const names = namesFromDescriptors(descriptors);
        const defaultApp = getDefaultApp(names);
        setStateInternal((prev) => ({
          ...prev,
          authorizedApps: names,
          appDescriptors: descriptors,
          defaultApp,
        }));
      } catch (error) {
        console.error("Failed to fetch apps:", error);
        setStateInternal((prev) => ({
          ...prev,
          authorizedApps: ["default"],
          appDescriptors: [{ name: "default" }],
          defaultApp: "default",
        }));
      }
    };
    void fetchApps();
  }, [getCurrentControlSessionId, state.apiKey]);

  // Fetch models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const models = await aomiClientRef.current.getModels(
          getCurrentControlSessionId(),
        );
        setStateInternal((prev) => ({
          ...prev,
          availableModels: models,
          defaultModel: resolveAutoModel(models),
        }));
      } catch (error) {
        console.error("Failed to fetch models:", error);
      }
    };
    void fetchModels();
  }, [getCurrentControlSessionId]);

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
    async (
      secrets: Record<string, string>,
      app?: string,
    ): Promise<Record<string, string>> => {
      const clientId = stateRef.current.clientId;
      if (!clientId) throw new Error("clientId not initialized");
      const { handles } = await aomiClientRef.current.ingestSecrets(
        getCurrentControlSessionId(),
        clientId,
        secrets,
        app,
      );
      return handles;
    },
    [getCurrentControlSessionId],
  );

  const clearSecrets = useCallback(
    async (app?: string): Promise<void> => {
      const clientId = stateRef.current.clientId;
      if (!clientId) return;
      await aomiClientRef.current.clearSecrets?.(
        getCurrentControlSessionId(),
        clientId,
        app,
      );
    },
    [getCurrentControlSessionId],
  );

  const deleteSecret = useCallback(
    async (name: string, app?: string): Promise<void> => {
      const clientId = stateRef.current.clientId;
      if (!clientId) return;
      await aomiClientRef.current.deleteSecret(
        getCurrentControlSessionId(),
        clientId,
        name,
        app,
      );
    },
    [getCurrentControlSessionId],
  );

  const listSecrets = useCallback(async (): Promise<
    Record<string, string[]>
  > => {
    const { by_app } = await aomiClientRef.current.listSecrets(
      getCurrentControlSessionId(),
    );
    return by_app;
  }, [getCurrentControlSessionId]);

  // ---------------------------------------------------------------------------
  // BYOK (LLM provider keys)
  // ---------------------------------------------------------------------------
  const setByok = useCallback(
    async (provider: string, apiKey: string, label?: string): Promise<void> => {
      const trimmed = apiKey.trim();
      if (!trimmed) return;

      const entry: StoredByokKey = {
        apiKey: trimmed,
        keyPrefix: trimmed.slice(0, 7),
        label,
      };

      setStateInternal((prev) => {
        const next = {
          ...prev,
          byokKeys: { ...prev.byokKeys, [provider]: entry },
        };
        callbacks.current.forEach((cb) => cb(next));
        return next;
      });

      // Ingest into backend vault
      const clientId = stateRef.current.clientId;
      if (clientId) {
        try {
          await aomiClientRef.current.ingestSecrets(
            getCurrentControlSessionId(),
            clientId,
            {
              [`${BYOK_SECRET_PREFIX}${provider}`]: trimmed,
            },
          );
        } catch (err) {
          console.error("Failed to ingest BYOK key:", err);
        }
      }
    },
    [getCurrentControlSessionId],
  );

  const removeByok = useCallback(
    async (provider: string): Promise<void> => {
      const clientId = stateRef.current.clientId;
      if (clientId) {
        await aomiClientRef.current.deleteSecret(
          getCurrentControlSessionId(),
          clientId,
          `${BYOK_SECRET_PREFIX}${provider}`,
        );
      }

      setStateInternal((prev) => {
        const { [provider]: _, ...rest } = prev.byokKeys;
        const next = { ...prev, byokKeys: rest };
        callbacks.current.forEach((cb) => cb(next));
        return next;
      });
    },
    [getCurrentControlSessionId],
  );

  const getByokKeys = useCallback(
    (): Record<string, StoredByokKey> => stateRef.current.byokKeys,
    [],
  );

  const hasByok = useCallback((provider?: string): boolean => {
    const keys = stateRef.current.byokKeys;
    if (provider) return provider in keys;
    return Object.keys(keys).length > 0;
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch available options
  // ---------------------------------------------------------------------------
  const getAvailableModels = useCallback(async (): Promise<string[]> => {
    try {
      const models = await aomiClientRef.current.getModels(
        getCurrentControlSessionId(),
      );
      setStateInternal((prev) => ({
        ...prev,
        availableModels: models,
        defaultModel: resolveAutoModel(models),
      }));
      return models;
    } catch (error) {
      console.error("Failed to fetch models:", error);
      return [];
    }
  }, [getCurrentControlSessionId]);

  const getAuthorizedApps = useCallback(async (): Promise<string[]> => {
    try {
      const descriptors = await aomiClientRef.current.getApps(
        getCurrentControlSessionId(),
        {
          apiKey: stateRef.current.apiKey ?? undefined,
        },
      );
      const names = namesFromDescriptors(descriptors);
      const defaultApp = getDefaultApp(names);
      setStateInternal((prev) => ({
        ...prev,
        authorizedApps: names,
        appDescriptors: descriptors,
        defaultApp,
      }));
      return names;
    } catch (error) {
      console.error("Failed to fetch apps:", error);
      setStateInternal((prev) => ({
        ...prev,
        authorizedApps: ["default"],
        appDescriptors: [{ name: "default" }],
        defaultApp: "default",
      }));
      return ["default"];
    }
  }, [getCurrentControlSessionId]);

  // ---------------------------------------------------------------------------
  // Per-thread control state
  // ---------------------------------------------------------------------------
  const getCurrentThreadControl = useCallback((): ThreadControlState => {
    const metadata = getThreadMetadataRef.current(sessionIdRef.current);
    return metadata?.control ?? initThreadControl();
  }, []);

  const getPreferredThreadControl = useCallback((): ThreadControlState => {
    const preference = readStoredModelPreference();
    const selection = resolvePreferredModelSelection(
      preference,
      stateRef.current.availableModels,
      stateRef.current.defaultModel,
    );
    return {
      ...initThreadControl(),
      model: selection.model,
      modelMode: selection.mode,
      controlDirty: selection.model !== null,
    };
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

  const getCurrentThreadApplicationId = useCallback(():
    | number
    | string
    | null => {
    const currentControl =
      getThreadMetadataRef.current(sessionIdRef.current)?.control ??
      initThreadControl();
    return currentControl.applicationId ?? null;
  }, []);

  const onModelSelect = useCallback(
    async (model: string, options?: { mode?: ModelSelectionMode }) => {
      const threadId = sessionIdRef.current;
      const currentControl =
        getThreadMetadataRef.current(threadId)?.control ?? initThreadControl();
      const isProcessing = currentControl.isProcessing;
      const modelMode = options?.mode ?? "manual";

      console.log("[control-context] onModelSelect called", {
        model,
        modelMode,
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
          modelMode,
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
        const result = await aomiClientRef.current.setModel(threadId, model, {
          app,
          apiKey: stateRef.current.apiKey ?? undefined,
          clientId: stateRef.current.clientId ?? undefined,
        });
        console.log("[control-context] onModelSelect backend result", result);
        writeStoredModelPreference({
          mode: modelMode,
          model: modelMode === "manual" ? model : null,
        });
        const latestControl =
          getThreadMetadataRef.current(threadId)?.control ?? currentControl;
        if (latestControl.model === model && latestControl.app === app) {
          updateThreadMetadataRef.current(threadId, {
            control: {
              ...latestControl,
              modelMode,
              controlDirty: false,
            },
          });
        }
      } catch (err) {
        console.error("[control-context] setModel failed:", err);
        throw err;
      }
    },
    [],
  );

  const onAppSelect = useCallback(
    (app: string, options?: { applicationId?: number | string | null }) => {
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
        console.warn("[control-context] Cannot switch app while processing");
        return;
      }

      if (
        stateRef.current.authorizedApps.length > 0 &&
        !stateRef.current.authorizedApps.includes(app)
      ) {
        console.warn("[control-context] Cannot select unauthorized app", {
          app,
        });
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
          applicationId: options?.applicationId ?? null,
          controlDirty: true,
        },
      });

      console.log("[control-context] onAppSelect metadata updated");
    },
    [],
  );

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

  const syncCurrentThreadControl = useCallback(
    async (options?: { ignoreProcessing?: boolean }) => {
      const threadId = sessionIdRef.current;
      const currentControl =
        getThreadMetadataRef.current(threadId)?.control ?? initThreadControl();

      if (
        !currentControl.controlDirty ||
        (!options?.ignoreProcessing && currentControl.isProcessing) ||
        !currentControl.model
      ) {
        return;
      }

      const app =
        resolveAuthorizedApp(
          currentControl.app,
          stateRef.current.authorizedApps,
          stateRef.current.defaultApp,
        ) ?? "default";

      await aomiClientRef.current.setModel(threadId, currentControl.model, {
        app,
        apiKey: stateRef.current.apiKey ?? undefined,
        clientId: stateRef.current.clientId ?? undefined,
      });

      const latestControl =
        getThreadMetadataRef.current(threadId)?.control ?? currentControl;
      if (
        latestControl.model === currentControl.model &&
        latestControl.app === currentControl.app
      ) {
        updateThreadMetadataRef.current(threadId, {
          control: {
            ...latestControl,
            app,
            controlDirty: false,
          },
        });
      }
    },
    [],
  );

  useEffect(() => {
    const threadId = sessionIdRef.current;
    const metadata = getThreadMetadataRef.current(threadId);
    if (!metadata || metadata.control.isProcessing) return;

    const currentControl = metadata.control;
    let nextControl: ThreadControlState | null = null;

    if (currentControl.model === null) {
      const preferred = getPreferredThreadControl();
      if (!preferred.model) return;
      nextControl = {
        ...currentControl,
        model: preferred.model,
        modelMode: preferred.modelMode,
        controlDirty: true,
      };
    } else if (state.availableModels.length > 0) {
      const currentMode = currentControl.modelMode ?? "manual";

      if (currentMode === "auto") {
        const autoModel = getFallbackModel(
          state.availableModels,
          state.defaultModel,
        );
        if (autoModel && currentControl.model !== autoModel) {
          nextControl = {
            ...currentControl,
            model: autoModel,
            modelMode: "auto",
            controlDirty: true,
          };
        }
      } else if (!state.availableModels.includes(currentControl.model)) {
        const fallbackModel = getFallbackModel(
          state.availableModels,
          state.defaultModel,
        );
        if (fallbackModel) {
          nextControl = {
            ...currentControl,
            model: fallbackModel,
            modelMode: "auto",
            controlDirty: true,
          };
        }
      }
    }

    if (!nextControl) return;

    updateThreadMetadataRef.current(threadId, {
      control: nextControl,
    });
  }, [
    getPreferredThreadControl,
    sessionId,
    state.availableModels,
    state.defaultModel,
  ]);

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
        deleteSecret,
        listSecrets,
        setByok,
        removeByok,
        getByokKeys,
        hasByok,
        getAvailableModels,
        getAuthorizedApps,
        getCurrentThreadControl,
        getCurrentThreadApp,
        getCurrentThreadApplicationId,
        onModelSelect,
        onAppSelect,
        isProcessing,
        markControlSynced,
        syncCurrentThreadControl,
        getPreferredThreadControl,
        getControlState,
        onControlStateChange,
        setState,
      }}
    >
      {children}
    </ControlContext.Provider>
  );
}
