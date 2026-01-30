"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

// =============================================================================
// Types
// =============================================================================

export type ModelOption = {
  id: string;
  label: string;
  provider?: string;
};

export type NamespaceOption = {
  id: string;
  label: string;
  description?: string;
};

export type ControlState = {
  modelId: string | null;
  availableModels: ModelOption[];
  namespace: string | null;
  availableNamespaces: NamespaceOption[];
  apiKey: string | null;
};

export type ControlContextApi = {
  state: ControlState;
  setModelId: (id: string) => void;
  setAvailableModels: (models: ModelOption[]) => void;
  setNamespace: (ns: string) => void;
  setAvailableNamespaces: (namespaces: NamespaceOption[]) => void;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
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
  /** Initial models to populate the selector */
  initialModels?: ModelOption[];
  /** Initial namespaces to populate the selector */
  initialNamespaces?: NamespaceOption[];
  /** Default model ID to select */
  defaultModelId?: string | null;
  /** Default namespace ID to select */
  defaultNamespace?: string | null;
};

export function ControlContextProvider({
  children,
  initialModels = [],
  initialNamespaces = [],
  defaultModelId,
  defaultNamespace,
}: ControlContextProviderProps) {
  const [state, setState] = useState<ControlState>(() => ({
    modelId: defaultModelId ?? null,
    availableModels: initialModels,
    namespace: defaultNamespace ?? null,
    availableNamespaces: initialNamespaces,
    apiKey:
      typeof window !== "undefined"
        ? localStorage.getItem(API_KEY_STORAGE_KEY)
        : null,
  }));

  // Persist API key to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (state.apiKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, state.apiKey);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }, [state.apiKey]);

  const setModelId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, modelId: id }));
  }, []);

  const setAvailableModels = useCallback((models: ModelOption[]) => {
    setState((prev) => ({ ...prev, availableModels: models }));
  }, []);

  const setNamespace = useCallback((ns: string) => {
    setState((prev) => ({ ...prev, namespace: ns }));
  }, []);

  const setAvailableNamespaces = useCallback(
    (namespaces: NamespaceOption[]) => {
      setState((prev) => ({ ...prev, availableNamespaces: namespaces }));
    },
    [],
  );

  const setApiKey = useCallback((key: string) => {
    setState((prev) => ({ ...prev, apiKey: key }));
  }, []);

  const clearApiKey = useCallback(() => {
    setState((prev) => ({ ...prev, apiKey: null }));
  }, []);

  return (
    <ControlContext.Provider
      value={{
        state,
        setModelId,
        setAvailableModels,
        setNamespace,
        setAvailableNamespaces,
        setApiKey,
        clearApiKey,
      }}
    >
      {children}
    </ControlContext.Provider>
  );
}
