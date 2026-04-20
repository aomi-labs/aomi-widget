var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __restKey = (key) => typeof key === "symbol" ? key : key + "";
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};

// packages/react/src/index.ts
import { AomiClient as AomiClient2 } from "@aomi-labs/client";
import { toViemSignTypedDataArgs } from "@aomi-labs/client";

// packages/react/src/runtime/aomi-runtime.tsx
import { useMemo as useMemo3 } from "react";
import { AomiClient } from "@aomi-labs/client";

// packages/react/src/contexts/control-context.tsx
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  useEffect
} from "react";

// packages/react/src/utils/uuid.ts
function generateUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}

// packages/react/src/state/thread-store.ts
var shouldLogThreadUpdates = process.env.NODE_ENV !== "production";
var logThreadMetadataChange = (source, threadId, prev, next) => {
  if (!shouldLogThreadUpdates) return;
  if (!prev && !next) return;
  if (!prev || !next) {
    console.debug(`[aomi][thread:${source}]`, { threadId, prev, next });
    return;
  }
  if (prev.title !== next.title || prev.status !== next.status || prev.lastActiveAt !== next.lastActiveAt) {
    console.debug(`[aomi][thread:${source}]`, { threadId, prev, next });
  }
};
function initThreadControl() {
  return {
    model: null,
    app: null,
    controlDirty: false,
    isProcessing: false
  };
}
var ThreadStore = class {
  constructor(options) {
    this.listeners = /* @__PURE__ */ new Set();
    this.subscribe = (listener) => {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    };
    this.getSnapshot = () => this.snapshot;
    this.setCurrentThreadId = (threadId) => {
      this.ensureThreadExists(threadId);
      this.updateState({ currentThreadId: threadId });
    };
    this.bumpThreadViewKey = () => {
      this.updateState({ threadViewKey: this.state.threadViewKey + 1 });
    };
    this.setThreadCnt = (updater) => {
      const nextCnt = this.resolveStateAction(updater, this.state.threadCnt);
      this.updateState({ threadCnt: nextCnt });
    };
    this.setThreads = (updater) => {
      const nextThreads = this.resolveStateAction(updater, this.state.threads);
      this.updateState({ threads: new Map(nextThreads) });
    };
    this.setThreadMetadata = (updater) => {
      const prevMetadata = this.state.threadMetadata;
      const nextMetadata = this.resolveStateAction(updater, prevMetadata);
      for (const [threadId, next] of nextMetadata.entries()) {
        logThreadMetadataChange(
          "setThreadMetadata",
          threadId,
          prevMetadata.get(threadId),
          next
        );
      }
      for (const [threadId, prev] of prevMetadata.entries()) {
        if (!nextMetadata.has(threadId)) {
          logThreadMetadataChange("setThreadMetadata", threadId, prev, void 0);
        }
      }
      this.updateState({ threadMetadata: new Map(nextMetadata) });
    };
    this.setThreadMessages = (threadId, messages) => {
      this.ensureThreadExists(threadId);
      const nextThreads = new Map(this.state.threads);
      nextThreads.set(threadId, messages);
      this.updateState({ threads: nextThreads });
    };
    this.getThreadMessages = (threadId) => {
      var _a;
      return (_a = this.state.threads.get(threadId)) != null ? _a : [];
    };
    this.getThreadMetadata = (threadId) => {
      return this.state.threadMetadata.get(threadId);
    };
    this.updateThreadMetadata = (threadId, updates) => {
      const existing = this.state.threadMetadata.get(threadId);
      if (!existing) {
        return;
      }
      const next = __spreadValues(__spreadValues({}, existing), updates);
      const nextMetadata = new Map(this.state.threadMetadata);
      nextMetadata.set(threadId, next);
      logThreadMetadataChange("updateThreadMetadata", threadId, existing, next);
      this.updateState({ threadMetadata: nextMetadata });
    };
    var _a;
    const initialThreadId = (_a = options == null ? void 0 : options.initialThreadId) != null ? _a : generateUUID();
    this.state = {
      currentThreadId: initialThreadId,
      threadViewKey: 0,
      threadCnt: 1,
      threads: /* @__PURE__ */ new Map([[initialThreadId, []]]),
      threadMetadata: /* @__PURE__ */ new Map([
        [
          initialThreadId,
          {
            title: "New Chat",
            status: "regular",
            lastActiveAt: (/* @__PURE__ */ new Date()).toISOString(),
            control: initThreadControl()
          }
        ]
      ])
    };
    this.snapshot = this.buildSnapshot();
  }
  emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }
  resolveStateAction(updater, current) {
    return typeof updater === "function" ? updater(current) : updater;
  }
  ensureThreadExists(threadId) {
    if (!this.state.threadMetadata.has(threadId)) {
      const nextMetadata = new Map(this.state.threadMetadata);
      nextMetadata.set(threadId, {
        title: "New Chat",
        status: "regular",
        lastActiveAt: (/* @__PURE__ */ new Date()).toISOString(),
        control: initThreadControl()
      });
      this.state = __spreadProps(__spreadValues({}, this.state), { threadMetadata: nextMetadata });
    }
    if (!this.state.threads.has(threadId)) {
      const nextThreads = new Map(this.state.threads);
      nextThreads.set(threadId, []);
      this.state = __spreadProps(__spreadValues({}, this.state), { threads: nextThreads });
    }
  }
  updateState(partial) {
    this.state = __spreadValues(__spreadValues({}, this.state), partial);
    this.snapshot = this.buildSnapshot();
    this.emit();
  }
  buildSnapshot() {
    return {
      currentThreadId: this.state.currentThreadId,
      setCurrentThreadId: this.setCurrentThreadId,
      threadViewKey: this.state.threadViewKey,
      bumpThreadViewKey: this.bumpThreadViewKey,
      allThreads: this.state.threads,
      setThreads: this.setThreads,
      allThreadsMetadata: this.state.threadMetadata,
      setThreadMetadata: this.setThreadMetadata,
      threadCnt: this.state.threadCnt,
      setThreadCnt: this.setThreadCnt,
      getThreadMessages: this.getThreadMessages,
      setThreadMessages: this.setThreadMessages,
      getThreadMetadata: this.getThreadMetadata,
      updateThreadMetadata: this.updateThreadMetadata
    };
  }
};

// packages/react/src/contexts/control-context.tsx
import { jsx } from "react/jsx-runtime";
var API_KEY_STORAGE_KEY = "aomi_api_key";
var CLIENT_ID_STORAGE_KEY = "aomi_client_id";
var PROVIDER_KEYS_STORAGE_KEY = "aomi_provider_keys";
var PROVIDER_KEY_SECRET_PREFIX = "PROVIDER_KEY:";
function getOrCreateClientId() {
  var _a, _b, _c, _d, _e;
  try {
    const storedClientId = (_a = globalThis.localStorage) == null ? void 0 : _a.getItem(CLIENT_ID_STORAGE_KEY);
    if (storedClientId && storedClientId.trim().length > 0) {
      return storedClientId;
    }
  } catch (e) {
  }
  const clientId = (_d = (_c = (_b = globalThis.crypto) == null ? void 0 : _b.randomUUID) == null ? void 0 : _c.call(_b)) != null ? _d : `client-${Date.now()}`;
  try {
    (_e = globalThis.localStorage) == null ? void 0 : _e.setItem(CLIENT_ID_STORAGE_KEY, clientId);
  } catch (e) {
  }
  return clientId;
}
function getDefaultApp(apps) {
  var _a;
  return apps.includes("default") ? "default" : (_a = apps[0]) != null ? _a : null;
}
function resolveAuthorizedApp(app, authorizedApps, defaultApp) {
  if (app && authorizedApps.includes(app)) {
    return app;
  }
  return defaultApp;
}
var ControlContext = createContext(null);
function useControl() {
  const ctx = useContext(ControlContext);
  if (!ctx) {
    throw new Error("useControl must be used within ControlContextProvider");
  }
  return ctx;
}
function ControlContextProvider({
  children,
  aomiClient,
  sessionId,
  publicKey,
  getThreadMetadata,
  updateThreadMetadata
}) {
  var _a, _b;
  const [state, setStateInternal] = useState(() => ({
    apiKey: null,
    clientId: getOrCreateClientId(),
    availableModels: [],
    authorizedApps: [],
    defaultModel: null,
    defaultApp: null,
    providerKeys: {}
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
  const callbacks = useRef(/* @__PURE__ */ new Set());
  const currentThreadMetadata = getThreadMetadata(sessionId);
  const isProcessing = (_b = (_a = currentThreadMetadata == null ? void 0 : currentThreadMetadata.control) == null ? void 0 : _a.isProcessing) != null ? _b : false;
  useEffect(() => {
    var _a2;
    try {
      if (state.clientId) {
        (_a2 = globalThis.localStorage) == null ? void 0 : _a2.setItem(CLIENT_ID_STORAGE_KEY, state.clientId);
      }
    } catch (e) {
    }
  }, [state.clientId]);
  useEffect(() => {
    var _a2, _b2;
    try {
      const storedApiKey = (_b2 = (_a2 = globalThis.localStorage) == null ? void 0 : _a2.getItem(API_KEY_STORAGE_KEY)) != null ? _b2 : null;
      if (storedApiKey) {
        setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), { apiKey: storedApiKey }));
      }
    } catch (e) {
    }
  }, []);
  useEffect(() => {
    var _a2;
    try {
      const raw = (_a2 = globalThis.localStorage) == null ? void 0 : _a2.getItem(PROVIDER_KEYS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), { providerKeys: parsed }));
      }
    } catch (e) {
    }
  }, []);
  useEffect(() => {
    var _a2, _b2;
    try {
      if (state.apiKey) {
        (_a2 = globalThis.localStorage) == null ? void 0 : _a2.setItem(API_KEY_STORAGE_KEY, state.apiKey);
      } else {
        (_b2 = globalThis.localStorage) == null ? void 0 : _b2.removeItem(API_KEY_STORAGE_KEY);
      }
    } catch (e) {
    }
  }, [state.apiKey]);
  useEffect(() => {
    var _a2, _b2;
    try {
      const keys = state.providerKeys;
      if (Object.keys(keys).length > 0) {
        (_a2 = globalThis.localStorage) == null ? void 0 : _a2.setItem(
          PROVIDER_KEYS_STORAGE_KEY,
          JSON.stringify(keys)
        );
      } else {
        (_b2 = globalThis.localStorage) == null ? void 0 : _b2.removeItem(PROVIDER_KEYS_STORAGE_KEY);
      }
    } catch (e) {
    }
  }, [state.providerKeys]);
  useEffect(() => {
    if (!state.clientId) return;
    const keys = stateRef.current.providerKeys;
    if (Object.keys(keys).length === 0) return;
    const secrets = {};
    for (const [provider, entry] of Object.entries(keys)) {
      secrets[`${PROVIDER_KEY_SECRET_PREFIX}${provider}`] = entry.apiKey;
    }
    void aomiClientRef.current.ingestSecrets(state.clientId, secrets).catch((err) => {
      console.error("Failed to auto-ingest provider keys:", err);
    });
  }, [state.clientId, state.providerKeys]);
  useEffect(() => {
    const fetchApps = async () => {
      var _a2;
      try {
        const apps = await aomiClientRef.current.getApps(
          sessionIdRef.current,
          {
            publicKey: publicKeyRef.current,
            apiKey: (_a2 = stateRef.current.apiKey) != null ? _a2 : void 0
          }
        );
        const defaultApp = getDefaultApp(apps);
        setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), {
          authorizedApps: apps,
          defaultApp
        }));
      } catch (error) {
        console.error("Failed to fetch apps:", error);
        setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), {
          authorizedApps: ["default"],
          defaultApp: "default"
        }));
      }
    };
    void fetchApps();
  }, [state.apiKey, publicKey, sessionId]);
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const models = await aomiClientRef.current.getModels(
          sessionIdRef.current
        );
        setStateInternal((prev) => {
          var _a2;
          return __spreadProps(__spreadValues({}, prev), {
            availableModels: models,
            defaultModel: (_a2 = models[0]) != null ? _a2 : null
          });
        });
      } catch (error) {
        console.error("Failed to fetch models:", error);
      }
    };
    void fetchModels();
  }, []);
  const setApiKey = useCallback((apiKey) => {
    setStateInternal((prev) => {
      const next = __spreadProps(__spreadValues({}, prev), { apiKey: apiKey === "" ? null : apiKey });
      callbacks.current.forEach((cb) => cb(next));
      return next;
    });
  }, []);
  const ingestSecrets = useCallback(
    async (secrets) => {
      const clientId = stateRef.current.clientId;
      if (!clientId) throw new Error("clientId not initialized");
      const { handles } = await aomiClientRef.current.ingestSecrets(
        clientId,
        secrets
      );
      return handles;
    },
    []
  );
  const clearSecrets = useCallback(async () => {
    var _a2, _b2;
    const clientId = stateRef.current.clientId;
    if (!clientId) return;
    await ((_b2 = (_a2 = aomiClientRef.current).clearSecrets) == null ? void 0 : _b2.call(_a2, clientId));
  }, []);
  const setProviderKey = useCallback(
    async (provider, apiKey, label) => {
      const trimmed = apiKey.trim();
      if (!trimmed) return;
      const entry = {
        apiKey: trimmed,
        keyPrefix: trimmed.slice(0, 7),
        label
      };
      setStateInternal((prev) => {
        const next = __spreadProps(__spreadValues({}, prev), {
          providerKeys: __spreadProps(__spreadValues({}, prev.providerKeys), { [provider]: entry })
        });
        callbacks.current.forEach((cb) => cb(next));
        return next;
      });
      const clientId = stateRef.current.clientId;
      if (clientId) {
        try {
          await aomiClientRef.current.ingestSecrets(clientId, {
            [`${PROVIDER_KEY_SECRET_PREFIX}${provider}`]: trimmed
          });
        } catch (err) {
          console.error("Failed to ingest provider key:", err);
        }
      }
    },
    []
  );
  const removeProviderKey = useCallback(
    async (provider) => {
      const clientId = stateRef.current.clientId;
      if (clientId) {
        await aomiClientRef.current.deleteSecret(
          clientId,
          `${PROVIDER_KEY_SECRET_PREFIX}${provider}`
        );
      }
      setStateInternal((prev) => {
        const _a2 = prev.providerKeys, { [provider]: _ } = _a2, rest = __objRest(_a2, [__restKey(provider)]);
        const next = __spreadProps(__spreadValues({}, prev), { providerKeys: rest });
        callbacks.current.forEach((cb) => cb(next));
        return next;
      });
    },
    []
  );
  const getProviderKeys = useCallback(
    () => stateRef.current.providerKeys,
    []
  );
  const hasProviderKey = useCallback(
    (provider) => {
      const keys = stateRef.current.providerKeys;
      if (provider) return provider in keys;
      return Object.keys(keys).length > 0;
    },
    []
  );
  const getAvailableModels = useCallback(async () => {
    try {
      const models = await aomiClientRef.current.getModels(
        sessionIdRef.current
      );
      setStateInternal((prev) => {
        var _a2, _b2;
        return __spreadProps(__spreadValues({}, prev), {
          availableModels: models,
          defaultModel: (_b2 = (_a2 = prev.defaultModel) != null ? _a2 : models[0]) != null ? _b2 : null
        });
      });
      return models;
    } catch (error) {
      console.error("Failed to fetch models:", error);
      return [];
    }
  }, []);
  const getAuthorizedApps = useCallback(async () => {
    var _a2;
    try {
      const apps = await aomiClientRef.current.getApps(
        sessionIdRef.current,
        {
          publicKey: publicKeyRef.current,
          apiKey: (_a2 = stateRef.current.apiKey) != null ? _a2 : void 0
        }
      );
      const defaultApp = getDefaultApp(apps);
      setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), {
        authorizedApps: apps,
        defaultApp
      }));
      return apps;
    } catch (error) {
      console.error("Failed to fetch apps:", error);
      setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), {
        authorizedApps: ["default"],
        defaultApp: "default"
      }));
      return ["default"];
    }
  }, []);
  const getCurrentThreadControl = useCallback(() => {
    var _a2;
    const metadata = getThreadMetadataRef.current(sessionIdRef.current);
    return (_a2 = metadata == null ? void 0 : metadata.control) != null ? _a2 : initThreadControl();
  }, []);
  const getCurrentThreadApp = useCallback(() => {
    var _a2, _b2, _c;
    const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(sessionIdRef.current)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
    return (_c = resolveAuthorizedApp(
      currentControl.app,
      stateRef.current.authorizedApps,
      stateRef.current.defaultApp
    )) != null ? _c : "default";
  }, []);
  const onModelSelect = useCallback(async (model) => {
    var _a2, _b2, _c, _d, _e;
    const threadId = sessionIdRef.current;
    const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(threadId)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
    const isProcessing2 = currentControl.isProcessing;
    console.log("[control-context] onModelSelect called", {
      model,
      isProcessing: isProcessing2,
      threadId
    });
    if (isProcessing2) {
      console.warn("[control-context] Cannot switch model while processing");
      return;
    }
    const app = (_c = resolveAuthorizedApp(
      currentControl.app,
      stateRef.current.authorizedApps,
      stateRef.current.defaultApp
    )) != null ? _c : "default";
    console.log("[control-context] onModelSelect updating metadata", {
      threadId,
      model,
      app,
      currentControl
    });
    updateThreadMetadataRef.current(threadId, {
      control: __spreadProps(__spreadValues({}, currentControl), {
        model,
        app,
        controlDirty: true
      })
    });
    console.log("[control-context] onModelSelect calling backend setModel", {
      threadId,
      model,
      app,
      backendUrl: aomiClientRef.current
    });
    try {
      const result = await aomiClientRef.current.setModel(
        threadId,
        model,
        {
          app,
          apiKey: (_d = stateRef.current.apiKey) != null ? _d : void 0,
          clientId: (_e = stateRef.current.clientId) != null ? _e : void 0
        }
      );
      console.log("[control-context] onModelSelect backend result", result);
    } catch (err) {
      console.error("[control-context] setModel failed:", err);
      throw err;
    }
  }, []);
  const onAppSelect = useCallback((app) => {
    var _a2, _b2;
    const threadId = sessionIdRef.current;
    const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(threadId)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
    const isProcessing2 = currentControl.isProcessing;
    console.log("[control-context] onAppSelect called", {
      app,
      isProcessing: isProcessing2,
      threadId
    });
    if (isProcessing2) {
      console.warn(
        "[control-context] Cannot switch app while processing"
      );
      return;
    }
    if (stateRef.current.authorizedApps.length > 0 && !stateRef.current.authorizedApps.includes(app)) {
      console.warn("[control-context] Cannot select unauthorized app", { app });
      return;
    }
    console.log("[control-context] onAppSelect updating metadata", {
      threadId,
      app,
      currentControl
    });
    updateThreadMetadataRef.current(threadId, {
      control: __spreadProps(__spreadValues({}, currentControl), {
        app,
        controlDirty: true
      })
    });
    console.log("[control-context] onAppSelect metadata updated");
  }, []);
  const markControlSynced = useCallback(() => {
    var _a2, _b2;
    const threadId = sessionIdRef.current;
    const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(threadId)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
    if (currentControl.controlDirty) {
      updateThreadMetadataRef.current(threadId, {
        control: __spreadProps(__spreadValues({}, currentControl), {
          controlDirty: false
        })
      });
    }
  }, []);
  const getControlState = useCallback(() => stateRef.current, []);
  const onControlStateChange = useCallback(
    (callback) => {
      callbacks.current.add(callback);
      return () => {
        callbacks.current.delete(callback);
      };
    },
    []
  );
  const setState = useCallback(
    (updates) => {
      var _a2;
      if ("apiKey" in updates) {
        setApiKey((_a2 = updates.apiKey) != null ? _a2 : null);
      }
      if ("app" in updates && updates.app !== void 0 && updates.app !== null) {
        onAppSelect(updates.app);
      }
    },
    [setApiKey, onAppSelect]
  );
  return /* @__PURE__ */ jsx(
    ControlContext.Provider,
    {
      value: {
        state,
        setApiKey,
        ingestSecrets,
        clearSecrets,
        setProviderKey,
        removeProviderKey,
        getProviderKeys,
        hasProviderKey,
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
        setState
      },
      children
    }
  );
}

// packages/react/src/contexts/event-context.tsx
import {
  createContext as createContext2,
  useCallback as useCallback2,
  useContext as useContext2,
  useRef as useRef2
} from "react";
import { jsx as jsx2 } from "react/jsx-runtime";
var EventContextState = createContext2(null);
function useEventContext() {
  const context = useContext2(EventContextState);
  if (!context) {
    throw new Error(
      "useEventContext must be used within EventContextProvider. Wrap your app with <EventContextProvider>...</EventContextProvider>"
    );
  }
  return context;
}
function EventContextProvider({
  children,
  aomiClient,
  sessionId
}) {
  const subscribersRef = useRef2(/* @__PURE__ */ new Map());
  const subscribe = useCallback2(
    (type, callback) => {
      const subs = subscribersRef.current;
      if (!subs.has(type)) {
        subs.set(type, /* @__PURE__ */ new Set());
      }
      subs.get(type).add(callback);
      return () => {
        var _a;
        (_a = subs.get(type)) == null ? void 0 : _a.delete(callback);
      };
    },
    []
  );
  const dispatchEvent = useCallback2((event) => {
    const subs = subscribersRef.current;
    const typeSubs = subs.get(event.type);
    if (typeSubs) {
      for (const cb of typeSubs) cb(event);
    }
    const wildcardSubs = subs.get("*");
    if (wildcardSubs) {
      for (const cb of wildcardSubs) cb(event);
    }
  }, []);
  const sendOutbound = useCallback2(
    async (event) => {
      try {
        const message = JSON.stringify({
          type: event.type,
          payload: event.payload
        });
        await aomiClient.sendSystemMessage(event.sessionId, message);
      } catch (error) {
        console.error("Failed to send outbound event:", error);
      }
    },
    [aomiClient]
  );
  const contextValue = {
    subscribe,
    dispatch: dispatchEvent,
    sendOutboundSystem: sendOutbound,
    // SSE is managed by ClientSession now — status is always "connected"
    // when sessions are active. Individual session status can be queried
    // from the session manager if needed.
    sseStatus: "connected"
  };
  return /* @__PURE__ */ jsx2(EventContextState.Provider, { value: contextValue, children });
}

// packages/react/src/contexts/notification-context.tsx
import {
  createContext as createContext3,
  useCallback as useCallback3,
  useContext as useContext3,
  useState as useState2
} from "react";
import { jsx as jsx3 } from "react/jsx-runtime";
var NotificationContext = createContext3(null);
function useNotification() {
  const context = useContext3(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within NotificationContextProvider"
    );
  }
  return context;
}
var notificationIdCounter = 0;
function generateId() {
  return `notif-${Date.now()}-${++notificationIdCounter}`;
}
function NotificationContextProvider({
  children
}) {
  const [notifications, setNotifications] = useState2([]);
  const showNotification = useCallback3((params) => {
    const id = generateId();
    const notification = __spreadProps(__spreadValues({}, params), {
      id,
      timestamp: Date.now()
    });
    setNotifications((prev) => [notification, ...prev]);
    return id;
  }, []);
  const dismissNotification = useCallback3((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);
  const clearAll = useCallback3(() => {
    setNotifications([]);
  }, []);
  const value = {
    notifications,
    showNotification,
    dismissNotification,
    clearAll
  };
  return /* @__PURE__ */ jsx3(NotificationContext.Provider, { value, children });
}

// packages/react/src/contexts/thread-context.tsx
import {
  createContext as createContext4,
  useContext as useContext4,
  useMemo,
  useRef as useRef3,
  useSyncExternalStore
} from "react";
import { jsx as jsx4 } from "react/jsx-runtime";
var ThreadContextState = createContext4(null);
function useThreadContext() {
  const context = useContext4(ThreadContextState);
  if (!context) {
    throw new Error(
      "useThreadContext must be used within ThreadContextProvider. Wrap your app with <ThreadContextProvider>...</ThreadContextProvider>"
    );
  }
  return context;
}
function ThreadContextProvider({
  children,
  initialThreadId
}) {
  const storeRef = useRef3(null);
  if (!storeRef.current) {
    storeRef.current = new ThreadStore({ initialThreadId });
  }
  const store = storeRef.current;
  const value = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  return /* @__PURE__ */ jsx4(ThreadContextState.Provider, { value, children });
}
function useCurrentThreadMessages() {
  const { currentThreadId, getThreadMessages } = useThreadContext();
  return useMemo(
    () => getThreadMessages(currentThreadId),
    [currentThreadId, getThreadMessages]
  );
}
function useCurrentThreadMetadata() {
  const { currentThreadId, getThreadMetadata } = useThreadContext();
  return useMemo(
    () => getThreadMetadata(currentThreadId),
    [currentThreadId, getThreadMetadata]
  );
}

// packages/react/src/contexts/user-context.tsx
import {
  createContext as createContext5,
  useCallback as useCallback4,
  useContext as useContext5,
  useRef as useRef4,
  useState as useState3
} from "react";
import { jsx as jsx5 } from "react/jsx-runtime";
var UserContext = createContext5(void 0);
function normalizeUserState(next, data) {
  if (data.isConnected === false) {
    return __spreadProps(__spreadValues({}, next), {
      address: void 0,
      chainId: void 0,
      ensName: void 0
    });
  }
  return next;
}
function useUser() {
  const context = useContext5(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserContextProvider");
  }
  return {
    user: context.user,
    setUser: context.setUser,
    addExtValue: context.addExtValue,
    removeExtValue: context.removeExtValue,
    getUserState: context.getUserState,
    onUserStateChange: context.onUserStateChange
  };
}
function UserContextProvider({ children }) {
  const [user, setUserState] = useState3({
    isConnected: false,
    address: void 0,
    chainId: void 0,
    ensName: void 0,
    ext: void 0
  });
  const userRef = useRef4(user);
  userRef.current = user;
  const StateChangeCallbacks = useRef4(
    /* @__PURE__ */ new Set()
  );
  const setUser = useCallback4((data) => {
    setUserState((prev) => {
      const next = normalizeUserState(__spreadValues(__spreadValues({}, prev), data), data);
      StateChangeCallbacks.current.forEach((callback) => {
        callback(next);
      });
      return next;
    });
  }, []);
  const addExtValue = useCallback4((key, value) => {
    setUserState((prev) => {
      var _a;
      const next = __spreadProps(__spreadValues({}, prev), {
        ext: __spreadProps(__spreadValues({}, (_a = prev.ext) != null ? _a : {}), {
          [key]: value
        })
      });
      StateChangeCallbacks.current.forEach((callback) => {
        callback(next);
      });
      return next;
    });
  }, []);
  const removeExtValue = useCallback4((key) => {
    setUserState((prev) => {
      if (!prev.ext || !(key in prev.ext)) {
        return prev;
      }
      const nextExt = __spreadValues({}, prev.ext);
      delete nextExt[key];
      const next = __spreadProps(__spreadValues({}, prev), {
        ext: Object.keys(nextExt).length > 0 ? nextExt : void 0
      });
      StateChangeCallbacks.current.forEach((callback) => {
        callback(next);
      });
      return next;
    });
  }, []);
  const getUserState = useCallback4(() => userRef.current, []);
  const onUserStateChange = useCallback4(
    (callback) => {
      StateChangeCallbacks.current.add(callback);
      return () => {
        StateChangeCallbacks.current.delete(callback);
      };
    },
    []
  );
  return /* @__PURE__ */ jsx5(
    UserContext.Provider,
    {
      value: {
        user,
        setUser,
        addExtValue,
        removeExtValue,
        getUserState,
        onUserStateChange
      },
      children
    }
  );
}

// packages/react/src/runtime/core.tsx
import { useCallback as useCallback7, useEffect as useEffect3, useMemo as useMemo2, useRef as useRef7 } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime
} from "@assistant-ui/react";

// packages/react/src/runtime/orchestrator.ts
import { useCallback as useCallback5, useEffect as useEffect2, useRef as useRef5, useState as useState4 } from "react";

// packages/react/src/runtime/session-manager.ts
import { Session as ClientSession } from "@aomi-labs/client";
var SessionManager = class {
  constructor(clientFactory) {
    this.clientFactory = clientFactory;
    this.sessions = /* @__PURE__ */ new Map();
  }
  getOrCreate(threadId, opts) {
    let session = this.sessions.get(threadId);
    if (session) return session;
    session = new ClientSession(this.clientFactory(), __spreadProps(__spreadValues({}, opts), {
      sessionId: threadId
    }));
    this.sessions.set(threadId, session);
    return session;
  }
  get(threadId) {
    return this.sessions.get(threadId);
  }
  close(threadId) {
    const session = this.sessions.get(threadId);
    if (session) {
      session.close();
      this.sessions.delete(threadId);
    }
  }
  closeAll() {
    for (const [threadId, session] of this.sessions) {
      session.close();
    }
    this.sessions.clear();
  }
};

// packages/react/src/runtime/utils.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
var parseTimestamp = (value) => {
  if (value === void 0 || value === null) return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value < 1e12 ? value * 1e3 : value : 0;
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric < 1e12 ? numeric * 1e3 : numeric;
  }
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
};
var isPlaceholderTitle = (title) => {
  var _a;
  const normalized = (_a = title == null ? void 0 : title.trim()) != null ? _a : "";
  return !normalized || normalized.startsWith("#[");
};
function toInboundMessage(msg) {
  var _a;
  if (msg.sender === "system") return null;
  const content = [];
  const role = msg.sender === "user" ? "user" : "assistant";
  if (msg.content) {
    content.push({ type: "text", text: msg.content });
  }
  const [topic, toolContent] = (_a = parseToolPayload(msg)) != null ? _a : [];
  if (topic && toolContent) {
    content.push({
      type: "tool-call",
      toolCallId: `tool_${Date.now()}`,
      toolName: topic,
      args: void 0,
      result: (() => {
        try {
          return JSON.parse(toolContent);
        } catch (e) {
          return { args: toolContent };
        }
      })()
    });
  }
  const threadMessage = __spreadValues({
    role,
    content: content.length > 0 ? content : [{ type: "text", text: "" }]
  }, msg.timestamp && { createdAt: new Date(msg.timestamp) });
  return threadMessage;
}
function parseToolPayload(msg) {
  return parseToolResult(msg.tool_result);
}
function parseToolResult(toolResult) {
  if (!toolResult) return null;
  if (Array.isArray(toolResult) && toolResult.length === 2) {
    const [topic, content] = toolResult;
    return [String(topic), String(content != null ? content : "")];
  }
  return null;
}
var getNetworkName = (chainId) => {
  if (chainId === void 0) return "";
  const id = typeof chainId === "string" ? Number(chainId) : chainId;
  switch (id) {
    case 1:
      return "ethereum";
    case 137:
      return "polygon";
    case 42161:
      return "arbitrum";
    case 8453:
      return "base";
    case 10:
      return "optimism";
    case 11155111:
      return "sepolia";
    case 1337:
    case 31337:
      return "testnet";
    case 59140:
      return "linea-sepolia";
    case 59144:
      return "linea";
    default:
      return "testnet";
  }
};
var formatAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Connect Wallet";
var SUPPORTED_CHAINS = [
  { id: 1, name: "Ethereum", ticker: "ETH" },
  { id: 137, name: "Polygon", ticker: "MATIC" },
  { id: 42161, name: "Arbitrum", ticker: "ARB" },
  { id: 8453, name: "Base", ticker: "BASE" },
  { id: 10, name: "Optimism", ticker: "OP" },
  { id: 11155111, name: "Sepolia", ticker: "SEP" }
];
var getChainInfo = (chainId) => chainId === void 0 ? void 0 : SUPPORTED_CHAINS.find((c) => c.id === chainId);

// packages/react/src/runtime/orchestrator.ts
function useRuntimeOrchestrator(aomiClient, options) {
  const threadContext = useThreadContext();
  const threadContextRef = useRef5(threadContext);
  threadContextRef.current = threadContext;
  const aomiClientRef = useRef5(aomiClient);
  aomiClientRef.current = aomiClient;
  const [isRunning, setIsRunning] = useState4(false);
  const sessionManagerRef = useRef5(null);
  if (!sessionManagerRef.current) {
    sessionManagerRef.current = new SessionManager(() => aomiClientRef.current);
  }
  const pendingFetches = useRef5(/* @__PURE__ */ new Set());
  const listenerCleanups = useRef5(/* @__PURE__ */ new Map());
  const getSession = useCallback5(
    (threadId) => {
      var _a, _b, _c, _d, _e;
      const manager = sessionManagerRef.current;
      const existing = manager.get(threadId);
      if (existing) return existing;
      const session = manager.getOrCreate(threadId, {
        app: options.getApp(),
        publicKey: (_a = options.getPublicKey) == null ? void 0 : _a.call(options),
        apiKey: (_c = (_b = options.getApiKey) == null ? void 0 : _b.call(options)) != null ? _c : void 0,
        clientId: (_d = options.getClientId) == null ? void 0 : _d.call(options),
        userState: (_e = options.getUserState) == null ? void 0 : _e.call(options)
      });
      const cleanups = [];
      cleanups.push(
        session.on("messages", (msgs) => {
          const threadMessages = [];
          for (const msg of msgs) {
            const converted = toInboundMessage(msg);
            if (converted) threadMessages.push(converted);
          }
          threadContextRef.current.setThreadMessages(threadId, threadMessages);
        })
      );
      cleanups.push(
        session.on("processing_start", () => {
          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(true);
          }
        })
      );
      cleanups.push(
        session.on("processing_end", () => {
          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(false);
          }
        })
      );
      cleanups.push(
        session.on("wallet_tx_request", (req) => {
          var _a2;
          return (_a2 = options.onWalletRequest) == null ? void 0 : _a2.call(options, req);
        })
      );
      cleanups.push(
        session.on("wallet_eip712_request", (req) => {
          var _a2;
          return (_a2 = options.onWalletRequest) == null ? void 0 : _a2.call(options, req);
        })
      );
      cleanups.push(
        session.on("title_changed", ({ title }) => {
          threadContextRef.current.updateThreadMetadata(threadId, { title });
        })
      );
      const forwardEvent = (type) => session.on(type, (payload) => {
        var _a2;
        (_a2 = options.onEvent) == null ? void 0 : _a2.call(options, { type, payload, sessionId: threadId });
      });
      cleanups.push(forwardEvent("tool_update"));
      cleanups.push(forwardEvent("tool_complete"));
      cleanups.push(forwardEvent("system_notice"));
      cleanups.push(forwardEvent("system_error"));
      cleanups.push(forwardEvent("async_callback"));
      listenerCleanups.current.set(threadId, () => {
        for (const cleanup of cleanups) cleanup();
      });
      return session;
    },
    // Stable deps — option getters are refs
    []
  );
  const ensureInitialState = useCallback5(
    async (threadId) => {
      var _a;
      if (pendingFetches.current.has(threadId)) return;
      pendingFetches.current.add(threadId);
      try {
        const session = getSession(threadId);
        const userState = (_a = options.getUserState) == null ? void 0 : _a.call(options);
        if (userState) session.resolveUserState(userState);
        await session.fetchCurrentState();
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(session.getIsProcessing());
        }
      } catch (error) {
        console.error("Failed to fetch initial state:", error);
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(false);
        }
      } finally {
        pendingFetches.current.delete(threadId);
      }
    },
    [getSession]
  );
  const sendMessage = useCallback5(
    async (text, threadId) => {
      var _a;
      const session = getSession(threadId);
      const userState = (_a = options.getUserState) == null ? void 0 : _a.call(options);
      if (userState) session.resolveUserState(userState);
      const existingMessages = threadContextRef.current.getThreadMessages(threadId);
      const userMessage = {
        role: "user",
        content: [{ type: "text", text }],
        createdAt: /* @__PURE__ */ new Date()
      };
      threadContextRef.current.setThreadMessages(threadId, [
        ...existingMessages,
        userMessage
      ]);
      threadContextRef.current.updateThreadMetadata(threadId, {
        lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      await session.sendAsync(text);
    },
    [getSession]
  );
  const cancelGeneration = useCallback5(
    async (threadId) => {
      var _a;
      const session = (_a = sessionManagerRef.current) == null ? void 0 : _a.get(threadId);
      if (session) {
        await session.interrupt();
      }
    },
    []
  );
  useEffect2(() => {
    return () => {
      var _a;
      (_a = sessionManagerRef.current) == null ? void 0 : _a.closeAll();
      for (const cleanup of listenerCleanups.current.values()) {
        cleanup();
      }
      listenerCleanups.current.clear();
    };
  }, []);
  return {
    sessionManager: sessionManagerRef.current,
    getSession,
    isRunning,
    setIsRunning,
    ensureInitialState,
    sendMessage,
    cancelGeneration,
    aomiClientRef
  };
}

// packages/react/src/runtime/threadlist-adapter.ts
var sortByLastActiveDesc = ([, metaA], [, metaB]) => {
  const tsA = parseTimestamp(metaA.lastActiveAt);
  const tsB = parseTimestamp(metaB.lastActiveAt);
  return tsB - tsA;
};
function buildThreadLists(threadMetadata) {
  const entries = Array.from(threadMetadata.entries()).filter(
    ([, meta]) => !isPlaceholderTitle(meta.title)
  );
  const regularThreads = entries.filter(([, meta]) => meta.status !== "archived").sort(sortByLastActiveDesc).map(
    ([id, meta]) => ({
      id,
      title: meta.title || "New Chat",
      status: "regular"
    })
  );
  const archivedThreads = entries.filter(([, meta]) => meta.status === "archived").sort(sortByLastActiveDesc).map(
    ([id, meta]) => ({
      id,
      title: meta.title || "New Chat",
      status: "archived"
    })
  );
  return { regularThreads, archivedThreads };
}
function buildThreadListAdapter({
  aomiClientRef,
  threadContext,
  setIsRunning
}) {
  const { regularThreads, archivedThreads } = buildThreadLists(
    threadContext.allThreadsMetadata
  );
  return {
    threadId: threadContext.currentThreadId,
    threads: regularThreads,
    archivedThreads,
    onSwitchToNewThread: () => {
      const threadId = generateUUID();
      threadContext.setThreadMetadata(
        (prev) => new Map(prev).set(threadId, {
          title: "New Chat",
          status: "regular",
          lastActiveAt: (/* @__PURE__ */ new Date()).toISOString(),
          control: initThreadControl()
        })
      );
      threadContext.setThreadMessages(threadId, []);
      threadContext.setCurrentThreadId(threadId);
      setIsRunning(false);
      threadContext.bumpThreadViewKey();
    },
    onSwitchToThread: (threadId) => {
      threadContext.setCurrentThreadId(threadId);
      threadContext.bumpThreadViewKey();
    },
    onRename: async (threadId, newTitle) => {
      var _a, _b;
      const previousTitle = (_b = (_a = threadContext.getThreadMetadata(threadId)) == null ? void 0 : _a.title) != null ? _b : "";
      const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
      threadContext.updateThreadMetadata(threadId, {
        title: normalizedTitle
      });
      try {
        await aomiClientRef.current.renameThread(threadId, newTitle);
      } catch (error) {
        console.error("Failed to rename thread:", error);
        threadContext.updateThreadMetadata(threadId, {
          title: previousTitle
        });
      }
    },
    onArchive: async (threadId) => {
      threadContext.updateThreadMetadata(threadId, { status: "archived" });
      try {
        await aomiClientRef.current.archiveThread(threadId);
      } catch (error) {
        console.error("Failed to archive thread:", error);
        threadContext.updateThreadMetadata(threadId, { status: "regular" });
      }
    },
    onUnarchive: async (threadId) => {
      threadContext.updateThreadMetadata(threadId, { status: "regular" });
      try {
        await aomiClientRef.current.unarchiveThread(threadId);
      } catch (error) {
        console.error("Failed to unarchive thread:", error);
        threadContext.updateThreadMetadata(threadId, { status: "archived" });
      }
    },
    onDelete: async (threadId) => {
      try {
        await aomiClientRef.current.deleteThread(threadId);
        threadContext.setThreadMetadata((prev) => {
          const next = new Map(prev);
          next.delete(threadId);
          return next;
        });
        threadContext.setThreads((prev) => {
          const next = new Map(prev);
          next.delete(threadId);
          return next;
        });
        if (threadContext.currentThreadId === threadId) {
          const firstRegularThread = Array.from(
            threadContext.allThreadsMetadata.entries()
          ).find(([id, meta]) => meta.status === "regular" && id !== threadId);
          if (firstRegularThread) {
            threadContext.setCurrentThreadId(firstRegularThread[0]);
          } else {
            const defaultId = "default-session";
            threadContext.setThreadMetadata(
              (prev) => new Map(prev).set(defaultId, {
                title: "New Chat",
                status: "regular",
                lastActiveAt: (/* @__PURE__ */ new Date()).toISOString(),
                control: initThreadControl()
              })
            );
            threadContext.setThreadMessages(defaultId, []);
            threadContext.setCurrentThreadId(defaultId);
          }
        }
      } catch (error) {
        console.error("Failed to delete thread:", error);
        throw error;
      }
    }
  };
}

// packages/react/src/interface.tsx
import { createContext as createContext6, useContext as useContext6 } from "react";
var AomiRuntimeContext = createContext6(null);
var AomiRuntimeApiProvider = AomiRuntimeContext.Provider;
function useAomiRuntime() {
  const context = useContext6(AomiRuntimeContext);
  if (!context) {
    throw new Error(
      "useAomiRuntime must be used within AomiRuntimeProvider. Wrap your app with <AomiRuntimeProvider>...</AomiRuntimeProvider>"
    );
  }
  return context;
}

// packages/react/src/handlers/wallet-handler.ts
import { useCallback as useCallback6, useRef as useRef6, useState as useState5 } from "react";
function useWalletHandler({
  getSession
}) {
  const [pendingRequests, setPendingRequests] = useState5([]);
  const requestsRef = useRef6([]);
  const enqueueRequest = useCallback6((request) => {
    requestsRef.current = [...requestsRef.current, request];
    setPendingRequests(requestsRef.current);
  }, []);
  const resolveRequest = useCallback6(
    (id, result) => {
      const session = getSession();
      if (!session) {
        console.error("[wallet-handler] No session available to resolve request");
        return;
      }
      requestsRef.current = requestsRef.current.filter((r) => r.id !== id);
      setPendingRequests(requestsRef.current);
      void session.resolve(id, result).catch((err) => {
        console.error("[wallet-handler] Failed to resolve request:", err);
      });
    },
    [getSession]
  );
  const rejectRequest = useCallback6(
    (id, error) => {
      const session = getSession();
      if (!session) {
        console.error("[wallet-handler] No session available to reject request");
        return;
      }
      requestsRef.current = requestsRef.current.filter((r) => r.id !== id);
      setPendingRequests(requestsRef.current);
      void session.reject(id, error).catch((err) => {
        console.error("[wallet-handler] Failed to reject request:", err);
      });
    },
    [getSession]
  );
  return {
    pendingRequests,
    enqueueRequest,
    resolveRequest,
    rejectRequest
  };
}

// packages/react/src/runtime/core.tsx
import { jsx as jsx6 } from "react/jsx-runtime";
function AomiRuntimeCore({
  children,
  aomiClient
}) {
  const threadContext = useThreadContext();
  const eventContext = useEventContext();
  const notificationContext = useNotification();
  const { user, onUserStateChange, getUserState } = useUser();
  const { getControlState, getCurrentThreadApp } = useControl();
  const sessionManagerRef = useRef7(null);
  const walletHandler = useWalletHandler({
    getSession: () => {
      var _a;
      return (_a = sessionManagerRef.current) == null ? void 0 : _a.get(threadContext.currentThreadId);
    }
  });
  const {
    sessionManager,
    getSession,
    isRunning,
    setIsRunning,
    ensureInitialState,
    sendMessage: orchestratorSendMessage,
    cancelGeneration: orchestratorCancel,
    aomiClientRef
  } = useRuntimeOrchestrator(aomiClient, {
    getPublicKey: () => {
      var _a;
      const userState = getUserState();
      return userState.isConnected ? (_a = userState.address) != null ? _a : void 0 : void 0;
    },
    getUserState,
    getApp: getCurrentThreadApp,
    getApiKey: () => getControlState().apiKey,
    getClientId: () => {
      var _a;
      return (_a = getControlState().clientId) != null ? _a : void 0;
    },
    onWalletRequest: (request) => walletHandler.enqueueRequest(request),
    onEvent: (event) => eventContext.dispatch(event)
  });
  sessionManagerRef.current = sessionManager;
  const walletSnapshot = useCallback7(
    (nextUser) => ({
      address: nextUser.address,
      chainId: nextUser.chainId,
      isConnected: nextUser.isConnected,
      ensName: nextUser.ensName
    }),
    [getUserState]
  );
  const lastWalletStateRef = useRef7(walletSnapshot(getUserState()));
  useEffect3(() => {
    lastWalletStateRef.current = walletSnapshot(getUserState());
    const unsubscribe = onUserStateChange(async (newUser) => {
      const nextWalletState = walletSnapshot(newUser);
      const prevWalletState = lastWalletStateRef.current;
      if (prevWalletState.address === nextWalletState.address && prevWalletState.chainId === nextWalletState.chainId && prevWalletState.isConnected === nextWalletState.isConnected && prevWalletState.ensName === nextWalletState.ensName) {
        return;
      }
      lastWalletStateRef.current = nextWalletState;
      const sessionId = threadContext.currentThreadId;
      const message = JSON.stringify({
        type: "wallet:state_changed",
        payload: nextWalletState
      });
      await aomiClientRef.current.sendSystemMessage(sessionId, message);
    });
    return unsubscribe;
  }, [
    onUserStateChange,
    aomiClientRef,
    threadContext.currentThreadId,
    getUserState,
    walletSnapshot
  ]);
  const threadContextRef = useRef7(threadContext);
  threadContextRef.current = threadContext;
  const currentThreadIdRef = useRef7(threadContext.currentThreadId);
  useEffect3(() => {
    currentThreadIdRef.current = threadContext.currentThreadId;
  }, [threadContext.currentThreadId]);
  useEffect3(() => {
    const unsubscribe = eventContext.subscribe(
      "user_state_request",
      () => {
        eventContext.sendOutboundSystem({
          type: "user_state_response",
          sessionId: threadContext.currentThreadId,
          payload: getUserState()
        });
      }
    );
    return unsubscribe;
  }, [eventContext, threadContext.currentThreadId, getUserState]);
  useEffect3(() => {
    void ensureInitialState(threadContext.currentThreadId);
  }, [ensureInitialState, threadContext.currentThreadId]);
  useEffect3(() => {
    const threadId = threadContext.currentThreadId;
    const currentMeta = threadContext.getThreadMetadata(threadId);
    if (currentMeta && currentMeta.control.isProcessing !== isRunning) {
      threadContext.updateThreadMetadata(threadId, {
        control: __spreadProps(__spreadValues({}, currentMeta.control), {
          isProcessing: isRunning
        })
      });
    }
  }, [isRunning, threadContext]);
  const currentMessages = threadContext.getThreadMessages(
    threadContext.currentThreadId
  );
  useEffect3(() => {
    const userAddress = user.isConnected ? user.address : void 0;
    if (!userAddress) return;
    const fetchThreadList = async () => {
      var _a, _b, _c;
      try {
        const threadList = await aomiClientRef.current.listThreads(userAddress);
        const currentContext = threadContextRef.current;
        const newMetadata = new Map(currentContext.allThreadsMetadata);
        let maxChatNum = currentContext.threadCnt;
        for (const thread of threadList) {
          const rawTitle = (_a = thread.title) != null ? _a : "";
          const title = isPlaceholderTitle(rawTitle) ? "" : rawTitle;
          const lastActive = ((_b = newMetadata.get(thread.session_id)) == null ? void 0 : _b.lastActiveAt) || (/* @__PURE__ */ new Date()).toISOString();
          const existingControl = (_c = newMetadata.get(thread.session_id)) == null ? void 0 : _c.control;
          newMetadata.set(thread.session_id, {
            title,
            status: thread.is_archived ? "archived" : "regular",
            lastActiveAt: lastActive,
            control: existingControl != null ? existingControl : initThreadControl()
          });
          const match = title.match(/^Chat (\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxChatNum) {
              maxChatNum = num;
            }
          }
        }
        currentContext.setThreadMetadata(newMetadata);
        if (maxChatNum > currentContext.threadCnt) {
          currentContext.setThreadCnt(maxChatNum);
        }
      } catch (error) {
        console.error("Failed to fetch thread list:", error);
      }
    };
    void fetchThreadList();
  }, [user.address, user.isConnected, aomiClientRef]);
  const threadListAdapter = useMemo2(
    () => buildThreadListAdapter({
      aomiClientRef,
      threadContext,
      setIsRunning
    }),
    [
      aomiClientRef,
      setIsRunning,
      threadContext,
      threadContext.currentThreadId,
      threadContext.allThreadsMetadata
    ]
  );
  useEffect3(() => {
    const showToolNotification = (eventType) => (event) => {
      const payload = event.payload;
      const toolName = typeof (payload == null ? void 0 : payload.tool_name) === "string" ? payload.tool_name : void 0;
      const title = toolName ? `${eventType === "tool_update" ? "Tool update" : "Tool complete"}: ${toolName}` : eventType === "tool_update" ? "Tool update" : "Tool complete";
      const message = typeof (payload == null ? void 0 : payload.message) === "string" ? payload.message : typeof (payload == null ? void 0 : payload.result) === "string" ? payload.result : void 0;
      notificationContext.showNotification({
        type: "notice",
        title,
        message
      });
    };
    const unsubscribeUpdate = eventContext.subscribe(
      "tool_update",
      showToolNotification("tool_update")
    );
    const unsubscribeComplete = eventContext.subscribe(
      "tool_complete",
      showToolNotification("tool_complete")
    );
    return () => {
      unsubscribeUpdate();
      unsubscribeComplete();
    };
  }, [eventContext, notificationContext]);
  useEffect3(() => {
    const unsubscribe = eventContext.subscribe("system_notice", (_event) => {
    });
    return unsubscribe;
  }, [eventContext, notificationContext]);
  const runtime = useExternalStoreRuntime({
    messages: currentMessages,
    setMessages: (msgs) => threadContext.setThreadMessages(threadContext.currentThreadId, [...msgs]),
    isRunning,
    onNew: async (message) => {
      const text = message.content.filter(
        (part) => part.type === "text"
      ).map((part) => part.text).join("\n");
      if (text) {
        await orchestratorSendMessage(text, threadContext.currentThreadId);
      }
    },
    onCancel: async () => {
      await orchestratorCancel(threadContext.currentThreadId);
    },
    convertMessage: (msg) => msg,
    adapters: { threadList: threadListAdapter }
  });
  useEffect3(() => {
    return () => {
      sessionManager.closeAll();
    };
  }, [sessionManager]);
  const userContext = useUser();
  const sendMessage = useCallback7(
    async (text) => {
      await orchestratorSendMessage(text, threadContext.currentThreadId);
    },
    [orchestratorSendMessage, threadContext.currentThreadId]
  );
  const cancelGeneration = useCallback7(() => {
    void orchestratorCancel(threadContext.currentThreadId);
  }, [orchestratorCancel, threadContext.currentThreadId]);
  const getMessages = useCallback7(
    (threadId) => {
      const id = threadId != null ? threadId : threadContext.currentThreadId;
      return threadContext.getThreadMessages(id);
    },
    [threadContext]
  );
  const createThread = useCallback7(async () => {
    await threadListAdapter.onSwitchToNewThread();
    return threadContextRef.current.currentThreadId;
  }, [threadListAdapter]);
  const deleteThread = useCallback7(
    async (threadId) => {
      sessionManager.close(threadId);
      await threadListAdapter.onDelete(threadId);
    },
    [threadListAdapter, sessionManager]
  );
  const renameThread = useCallback7(
    async (threadId, title) => {
      await threadListAdapter.onRename(threadId, title);
    },
    [threadListAdapter]
  );
  const archiveThread = useCallback7(
    async (threadId) => {
      await threadListAdapter.onArchive(threadId);
    },
    [threadListAdapter]
  );
  const selectThread = useCallback7(
    (threadId) => {
      if (threadContext.allThreadsMetadata.has(threadId)) {
        threadListAdapter.onSwitchToThread(threadId);
      } else {
        void threadListAdapter.onSwitchToNewThread();
      }
    },
    [threadContext.allThreadsMetadata, threadListAdapter]
  );
  const aomiRuntimeApi = useMemo2(
    () => ({
      // User API
      user: userContext.user,
      getUserState: userContext.getUserState,
      setUser: userContext.setUser,
      addExtValue: userContext.addExtValue,
      removeExtValue: userContext.removeExtValue,
      onUserStateChange: userContext.onUserStateChange,
      // Thread API
      currentThreadId: threadContext.currentThreadId,
      threadViewKey: threadContext.threadViewKey,
      threadMetadata: threadContext.allThreadsMetadata,
      getThreadMetadata: threadContext.getThreadMetadata,
      createThread,
      deleteThread,
      renameThread,
      archiveThread,
      selectThread,
      // Chat API
      isRunning,
      getMessages,
      sendMessage,
      cancelGeneration,
      // Notification API
      notifications: notificationContext.notifications,
      showNotification: notificationContext.showNotification,
      dismissNotification: notificationContext.dismissNotification,
      clearAllNotifications: notificationContext.clearAll,
      // Wallet API
      pendingWalletRequests: walletHandler.pendingRequests,
      startWalletRequest: () => {
      },
      // No-op: ClientSession manages processing state
      resolveWalletRequest: walletHandler.resolveRequest,
      rejectWalletRequest: walletHandler.rejectRequest,
      // Event API
      subscribe: eventContext.subscribe,
      sendSystemCommand: eventContext.sendOutboundSystem,
      sseStatus: eventContext.sseStatus
    }),
    [
      userContext,
      threadContext.currentThreadId,
      threadContext.threadViewKey,
      threadContext.allThreadsMetadata,
      threadContext.getThreadMetadata,
      createThread,
      deleteThread,
      renameThread,
      archiveThread,
      selectThread,
      isRunning,
      getMessages,
      sendMessage,
      cancelGeneration,
      notificationContext,
      walletHandler,
      eventContext
    ]
  );
  return /* @__PURE__ */ jsx6(AomiRuntimeApiProvider, { value: aomiRuntimeApi, children: /* @__PURE__ */ jsx6(AssistantRuntimeProvider, { runtime, children }) });
}

// packages/react/src/runtime/aomi-runtime.tsx
import { jsx as jsx7 } from "react/jsx-runtime";
function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080"
}) {
  const aomiClient = useMemo3(() => new AomiClient({ baseUrl: backendUrl }), [backendUrl]);
  return /* @__PURE__ */ jsx7(ThreadContextProvider, { children: /* @__PURE__ */ jsx7(NotificationContextProvider, { children: /* @__PURE__ */ jsx7(UserContextProvider, { children: /* @__PURE__ */ jsx7(AomiRuntimeInner, { aomiClient, children }) }) }) });
}
function AomiRuntimeInner({
  children,
  aomiClient
}) {
  var _a;
  const threadContext = useThreadContext();
  const { user } = useUser();
  return /* @__PURE__ */ jsx7(
    ControlContextProvider,
    {
      aomiClient,
      sessionId: threadContext.currentThreadId,
      publicKey: user.isConnected ? (_a = user.address) != null ? _a : void 0 : void 0,
      getThreadMetadata: threadContext.getThreadMetadata,
      updateThreadMetadata: threadContext.updateThreadMetadata,
      children: /* @__PURE__ */ jsx7(
        EventContextProvider,
        {
          aomiClient,
          sessionId: threadContext.currentThreadId,
          children: /* @__PURE__ */ jsx7(AomiRuntimeCore, { aomiClient, children })
        }
      )
    }
  );
}

// packages/react/src/handlers/notification-handler.ts
import { useCallback as useCallback8, useEffect as useEffect4, useState as useState6 } from "react";
var notificationIdCounter2 = 0;
function generateNotificationId() {
  return `notif-${Date.now()}-${++notificationIdCounter2}`;
}
function useNotificationHandler({
  onNotification
} = {}) {
  const { subscribe } = useEventContext();
  const [notifications, setNotifications] = useState6([]);
  useEffect4(() => {
    const unsubscribe = subscribe("notification", (event) => {
      var _a, _b;
      const payload = event.payload;
      const notification = {
        id: generateNotificationId(),
        type: (_a = payload.type) != null ? _a : "notification",
        title: (_b = payload.title) != null ? _b : "Notification",
        body: payload.body,
        handled: false,
        timestamp: Date.now(),
        sessionId: event.sessionId
      };
      setNotifications((prev) => [notification, ...prev]);
      onNotification == null ? void 0 : onNotification(notification);
    });
    return unsubscribe;
  }, [subscribe, onNotification]);
  const unhandledCount = notifications.filter((n) => !n.handled).length;
  const markHandled = useCallback8((id) => {
    setNotifications(
      (prev) => prev.map((n) => n.id === id ? __spreadProps(__spreadValues({}, n), { handled: true }) : n)
    );
  }, []);
  return {
    notifications,
    unhandledCount,
    markDone: markHandled
  };
}
export {
  AomiClient2 as AomiClient,
  AomiRuntimeProvider,
  ControlContextProvider,
  EventContextProvider,
  NotificationContextProvider,
  SUPPORTED_CHAINS,
  ThreadContextProvider,
  UserContextProvider,
  cn,
  formatAddress,
  getChainInfo,
  getNetworkName,
  initThreadControl,
  toViemSignTypedDataArgs,
  useAomiRuntime,
  useControl,
  useCurrentThreadMessages,
  useCurrentThreadMetadata,
  useEventContext,
  useNotification,
  useNotificationHandler,
  useThreadContext,
  useUser,
  useWalletHandler
};
//# sourceMappingURL=index.js.map