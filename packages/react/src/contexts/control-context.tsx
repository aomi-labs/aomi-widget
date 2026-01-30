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

// =============================================================================
// Types
// =============================================================================

export type ControlState = {
  namespace: string | null;
  apiKey: string | null;
  availableModels: string[];
  authorizedNamespaces: string[];
};

export type ControlContextApi = {
  state: ControlState;
  setState: (
    updates: Partial<Pick<ControlState, "namespace" | "apiKey">>,
  ) => void;
  getAvailableModels: () => Promise<string[]>;
  getAuthorizedNamespaces: () => Promise<string[]>;
  onModelSelect: (model: string) => Promise<void>;
  getControlState: () => ControlState;
  onControlStateChange: (callback: (state: ControlState) => void) => () => void;
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
};

export function ControlContextProvider({
  children,
  backendApi,
  sessionId,
  publicKey,
}: ControlContextProviderProps) {
  const [state, setStateInternal] = useState<ControlState>(() => {
    let apiKey: string | null = null;
    try {
      apiKey = globalThis.localStorage?.getItem(API_KEY_STORAGE_KEY) ?? null;
    } catch {
      // localStorage not available
    }
    return {
      namespace: null,
      apiKey,
      availableModels: [],
      authorizedNamespaces: [],
    };
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const backendApiRef = useRef(backendApi);
  backendApiRef.current = backendApi;

  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const publicKeyRef = useRef(publicKey);
  publicKeyRef.current = publicKey;

  const callbacks = useRef<Set<(state: ControlState) => void>>(new Set());

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
        setStateInternal((prev) => {
          const next = { ...prev, authorizedNamespaces: namespaces };
          if (!prev.namespace && namespaces.length > 0) {
            next.namespace = namespaces.includes("default")
              ? "default"
              : namespaces[0];
          }
          return next;
        });
      } catch (error) {
        console.error("Failed to fetch namespaces:", error);
        setStateInternal((prev) => ({
          ...prev,
          authorizedNamespaces: ["default"],
          namespace: prev.namespace ?? "default",
        }));
      }
    };
    void fetchNamespaces();
  }, [state.apiKey]);

  const setState = useCallback(
    (updates: Partial<Pick<ControlState, "namespace" | "apiKey">>) => {
      setStateInternal((prev) => {
        const next = { ...prev };
        if ("namespace" in updates) next.namespace = updates.namespace ?? null;
        if ("apiKey" in updates)
          next.apiKey = updates.apiKey === "" ? null : (updates.apiKey ?? null);
        callbacks.current.forEach((cb) => cb(next));
        return next;
      });
    },
    [],
  );

  const getAvailableModels = useCallback(async (): Promise<string[]> => {
    try {
      const models = await backendApiRef.current.getModels(
        sessionIdRef.current,
      );
      setStateInternal((prev) => ({ ...prev, availableModels: models }));
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
      setStateInternal((prev) => {
        const next = { ...prev, authorizedNamespaces: namespaces };
        if (!prev.namespace && namespaces.length > 0) {
          next.namespace = namespaces.includes("default")
            ? "default"
            : namespaces[0];
        }
        return next;
      });
      return namespaces;
    } catch (error) {
      console.error("Failed to fetch namespaces:", error);
      setStateInternal((prev) => ({
        ...prev,
        authorizedNamespaces: ["default"],
        namespace: prev.namespace ?? "default",
      }));
      return ["default"];
    }
  }, []);

  const onModelSelect = useCallback(async (model: string) => {
    await backendApiRef.current.setModel(
      sessionIdRef.current,
      model,
      stateRef.current.namespace ?? undefined,
    );
  }, []);

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

  return (
    <ControlContext.Provider
      value={{
        state,
        setState,
        getAvailableModels,
        getAuthorizedNamespaces,
        onModelSelect,
        getControlState,
        onControlStateChange,
      }}
    >
      {children}
    </ControlContext.Provider>
  );
}
