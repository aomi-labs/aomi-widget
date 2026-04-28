"use strict";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/react/src/index.ts
var index_exports = {};
__export(index_exports, {
  AomiClient: () => import_client7.AomiClient,
  AomiRuntimeProvider: () => AomiRuntimeProvider,
  ControlContextProvider: () => ControlContextProvider,
  DISABLED_PROVIDER_STATE: () => import_client8.DISABLED_PROVIDER_STATE,
  EventContextProvider: () => EventContextProvider,
  MAX_AUTO_FEE_WEI: () => import_client8.MAX_AUTO_FEE_WEI,
  NotificationContextProvider: () => NotificationContextProvider,
  RuntimeUserStateProvider: () => RuntimeUserStateProvider,
  SUPPORTED_CHAINS: () => SUPPORTED_CHAINS,
  ThreadContextProvider: () => ThreadContextProvider,
  UserContextProvider: () => UserContextProvider,
  aaModeFromExecutionKind: () => import_client8.aaModeFromExecutionKind,
  appendFeeCallToPayload: () => import_client8.appendFeeCallToPayload,
  buildFeeAAWalletCall: () => import_client8.buildFeeAAWalletCall,
  cn: () => cn,
  executeWalletCalls: () => import_client8.executeWalletCalls,
  formatAddress: () => formatAddress,
  getChainInfo: () => getChainInfo,
  getNetworkName: () => getNetworkName,
  hydrateTxPayloadFromUserState: () => import_client8.hydrateTxPayloadFromUserState,
  initThreadControl: () => initThreadControl,
  normalizeSimulatedFee: () => import_client8.normalizeSimulatedFee,
  parseChainId: () => import_client8.parseChainId,
  toAAWalletCall: () => import_client8.toAAWalletCall,
  toAAWalletCalls: () => import_client8.toAAWalletCalls,
  toViemSignTypedDataArgs: () => import_client8.toViemSignTypedDataArgs,
  useAomiRuntime: () => useAomiRuntime,
  useControl: () => useControl,
  useCurrentThreadMessages: () => useCurrentThreadMessages,
  useCurrentThreadMetadata: () => useCurrentThreadMetadata,
  useEventContext: () => useEventContext,
  useNotification: () => useNotification,
  useNotificationHandler: () => useNotificationHandler,
  useThreadContext: () => useThreadContext,
  useUser: () => useUser,
  useWalletHandler: () => useWalletHandler
});
module.exports = __toCommonJS(index_exports);
var import_client7 = require("@aomi-labs/client");
var import_client8 = require("@aomi-labs/client");

// packages/react/src/runtime/aomi-runtime.tsx
var import_react12 = require("react");
var import_client6 = require("@aomi-labs/client");

// packages/react/src/contexts/control-context.tsx
var import_react = require("react");

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
var import_jsx_runtime = require("react/jsx-runtime");
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
var ControlContext = (0, import_react.createContext)(null);
function useControl() {
  const ctx = (0, import_react.useContext)(ControlContext);
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
  const [state, setStateInternal] = (0, import_react.useState)(() => ({
    apiKey: null,
    clientId: getOrCreateClientId(),
    availableModels: [],
    authorizedApps: [],
    defaultModel: null,
    defaultApp: null,
    providerKeys: {}
  }));
  const stateRef = (0, import_react.useRef)(state);
  stateRef.current = state;
  const aomiClientRef = (0, import_react.useRef)(aomiClient);
  aomiClientRef.current = aomiClient;
  const sessionIdRef = (0, import_react.useRef)(sessionId);
  sessionIdRef.current = sessionId;
  const publicKeyRef = (0, import_react.useRef)(publicKey);
  publicKeyRef.current = publicKey;
  const getThreadMetadataRef = (0, import_react.useRef)(getThreadMetadata);
  getThreadMetadataRef.current = getThreadMetadata;
  const updateThreadMetadataRef = (0, import_react.useRef)(updateThreadMetadata);
  updateThreadMetadataRef.current = updateThreadMetadata;
  const callbacks = (0, import_react.useRef)(/* @__PURE__ */ new Set());
  const currentThreadMetadata = getThreadMetadata(sessionId);
  const isProcessing = (_b = (_a = currentThreadMetadata == null ? void 0 : currentThreadMetadata.control) == null ? void 0 : _a.isProcessing) != null ? _b : false;
  (0, import_react.useEffect)(() => {
    var _a2;
    try {
      if (state.clientId) {
        (_a2 = globalThis.localStorage) == null ? void 0 : _a2.setItem(CLIENT_ID_STORAGE_KEY, state.clientId);
      }
    } catch (e) {
    }
  }, [state.clientId]);
  (0, import_react.useEffect)(() => {
    var _a2, _b2;
    try {
      const storedApiKey = (_b2 = (_a2 = globalThis.localStorage) == null ? void 0 : _a2.getItem(API_KEY_STORAGE_KEY)) != null ? _b2 : null;
      if (storedApiKey) {
        setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), { apiKey: storedApiKey }));
      }
    } catch (e) {
    }
  }, []);
  (0, import_react.useEffect)(() => {
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
  (0, import_react.useEffect)(() => {
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
  (0, import_react.useEffect)(() => {
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
  (0, import_react.useEffect)(() => {
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
  (0, import_react.useEffect)(() => {
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
  (0, import_react.useEffect)(() => {
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
  const setApiKey = (0, import_react.useCallback)((apiKey) => {
    setStateInternal((prev) => {
      const next = __spreadProps(__spreadValues({}, prev), { apiKey: apiKey === "" ? null : apiKey });
      callbacks.current.forEach((cb) => cb(next));
      return next;
    });
  }, []);
  const ingestSecrets = (0, import_react.useCallback)(
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
  const clearSecrets = (0, import_react.useCallback)(async () => {
    var _a2, _b2;
    const clientId = stateRef.current.clientId;
    if (!clientId) return;
    await ((_b2 = (_a2 = aomiClientRef.current).clearSecrets) == null ? void 0 : _b2.call(_a2, clientId));
  }, []);
  const setProviderKey = (0, import_react.useCallback)(
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
  const removeProviderKey = (0, import_react.useCallback)(
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
  const getProviderKeys = (0, import_react.useCallback)(
    () => stateRef.current.providerKeys,
    []
  );
  const hasProviderKey = (0, import_react.useCallback)(
    (provider) => {
      const keys = stateRef.current.providerKeys;
      if (provider) return provider in keys;
      return Object.keys(keys).length > 0;
    },
    []
  );
  const getAvailableModels = (0, import_react.useCallback)(async () => {
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
  const getAuthorizedApps = (0, import_react.useCallback)(async () => {
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
  const getCurrentThreadControl = (0, import_react.useCallback)(() => {
    var _a2;
    const metadata = getThreadMetadataRef.current(sessionIdRef.current);
    return (_a2 = metadata == null ? void 0 : metadata.control) != null ? _a2 : initThreadControl();
  }, []);
  const getCurrentThreadApp = (0, import_react.useCallback)(() => {
    var _a2, _b2, _c;
    const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(sessionIdRef.current)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
    return (_c = resolveAuthorizedApp(
      currentControl.app,
      stateRef.current.authorizedApps,
      stateRef.current.defaultApp
    )) != null ? _c : "default";
  }, []);
  const onModelSelect = (0, import_react.useCallback)(async (model) => {
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
  const onAppSelect = (0, import_react.useCallback)((app) => {
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
  const markControlSynced = (0, import_react.useCallback)(() => {
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
  const getControlState = (0, import_react.useCallback)(() => stateRef.current, []);
  const onControlStateChange = (0, import_react.useCallback)(
    (callback) => {
      callbacks.current.add(callback);
      return () => {
        callbacks.current.delete(callback);
      };
    },
    []
  );
  const setState = (0, import_react.useCallback)(
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
var import_react2 = require("react");
var import_jsx_runtime2 = require("react/jsx-runtime");
var EventContextState = (0, import_react2.createContext)(null);
function useEventContext() {
  const context = (0, import_react2.useContext)(EventContextState);
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
  const subscribersRef = (0, import_react2.useRef)(/* @__PURE__ */ new Map());
  const subscribe = (0, import_react2.useCallback)(
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
  const dispatchEvent = (0, import_react2.useCallback)((event) => {
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
  const sendOutbound = (0, import_react2.useCallback)(
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
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(EventContextState.Provider, { value: contextValue, children });
}

// packages/react/src/contexts/notification-context.tsx
var import_react3 = require("react");
var import_jsx_runtime3 = require("react/jsx-runtime");
var NotificationContext = (0, import_react3.createContext)(null);
function useNotification() {
  const context = (0, import_react3.useContext)(NotificationContext);
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
  const [notifications, setNotifications] = (0, import_react3.useState)([]);
  const showNotification = (0, import_react3.useCallback)((params) => {
    const id = generateId();
    const notification = __spreadProps(__spreadValues({}, params), {
      id,
      timestamp: Date.now()
    });
    setNotifications((prev) => [notification, ...prev]);
    return id;
  }, []);
  const dismissNotification = (0, import_react3.useCallback)((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);
  const clearAll = (0, import_react3.useCallback)(() => {
    setNotifications([]);
  }, []);
  const value = {
    notifications,
    showNotification,
    dismissNotification,
    clearAll
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(NotificationContext.Provider, { value, children });
}

// packages/react/src/contexts/thread-context.tsx
var import_react4 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
var ThreadContextState = (0, import_react4.createContext)(null);
function useThreadContext() {
  const context = (0, import_react4.useContext)(ThreadContextState);
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
  const storeRef = (0, import_react4.useRef)(null);
  if (!storeRef.current) {
    storeRef.current = new ThreadStore({ initialThreadId });
  }
  const store = storeRef.current;
  const value = (0, import_react4.useSyncExternalStore)(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ThreadContextState.Provider, { value, children });
}
function useCurrentThreadMessages() {
  const { currentThreadId, getThreadMessages } = useThreadContext();
  return (0, import_react4.useMemo)(
    () => getThreadMessages(currentThreadId),
    [currentThreadId, getThreadMessages]
  );
}
function useCurrentThreadMetadata() {
  const { currentThreadId, getThreadMetadata } = useThreadContext();
  return (0, import_react4.useMemo)(
    () => getThreadMetadata(currentThreadId),
    [currentThreadId, getThreadMetadata]
  );
}

// packages/react/src/contexts/user-context.tsx
var import_react5 = require("react");
var import_client = require("@aomi-labs/client");
var import_client2 = require("@aomi-labs/client");
var import_jsx_runtime5 = require("react/jsx-runtime");
var UserContext = (0, import_react5.createContext)(void 0);
function useUser() {
  const context = (0, import_react5.useContext)(UserContext);
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
  const [user, setUserState] = (0, import_react5.useState)({
    address: void 0,
    chain_id: void 0,
    is_connected: false,
    ens_name: void 0,
    ext: void 0
  });
  const userRef = (0, import_react5.useRef)(user);
  userRef.current = user;
  const StateChangeCallbacks = (0, import_react5.useRef)(
    /* @__PURE__ */ new Set()
  );
  const notifyStateChange = (0, import_react5.useCallback)((next) => {
    queueMicrotask(() => {
      StateChangeCallbacks.current.forEach((callback) => {
        callback(next);
      });
    });
  }, []);
  const pruneUndefined = (0, import_react5.useCallback)((state) => {
    return Object.fromEntries(
      Object.entries(state).filter(([, value]) => value !== void 0)
    );
  }, []);
  const setUser = (0, import_react5.useCallback)((data) => {
    setUserState((prev) => {
      var _a, _b, _c;
      const normalizedData = pruneUndefined((_a = import_client.UserState.normalize(data)) != null ? _a : {});
      const nextPartial = __spreadValues({}, normalizedData);
      if (nextPartial.is_connected === true && nextPartial.chain_id === void 0) {
        if (prev.chain_id !== void 0) {
          nextPartial.chain_id = prev.chain_id;
        } else {
          delete nextPartial.is_connected;
        }
      }
      const next = nextPartial.is_connected === false ? __spreadProps(__spreadValues({}, (_b = import_client.UserState.normalize(__spreadValues(__spreadValues({}, prev), nextPartial))) != null ? _b : prev), {
        address: void 0,
        chain_id: void 0,
        ens_name: void 0
      }) : (_c = import_client.UserState.normalize(__spreadValues(__spreadValues({}, prev), nextPartial))) != null ? _c : prev;
      notifyStateChange(next);
      return next;
    });
  }, [notifyStateChange, pruneUndefined]);
  const addExtValue = (0, import_react5.useCallback)((key, value) => {
    setUserState((prev) => {
      const next = import_client.UserState.withExt(prev, key, value);
      notifyStateChange(next);
      return next;
    });
  }, [notifyStateChange]);
  const removeExtValue = (0, import_react5.useCallback)((key) => {
    setUserState((prev) => {
      const ext = prev.ext;
      if (typeof ext !== "object" || ext === null || Array.isArray(ext) || !(key in ext)) {
        return prev;
      }
      const nextExt = __spreadValues({}, ext);
      delete nextExt[key];
      const next = __spreadProps(__spreadValues({}, prev), {
        ext: Object.keys(nextExt).length > 0 ? nextExt : void 0
      });
      notifyStateChange(next);
      return next;
    });
  }, [notifyStateChange]);
  const getUserState = (0, import_react5.useCallback)(() => userRef.current, []);
  const onUserStateChange = (0, import_react5.useCallback)(
    (callback) => {
      StateChangeCallbacks.current.add(callback);
      return () => {
        StateChangeCallbacks.current.delete(callback);
      };
    },
    []
  );
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
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
var import_react10 = require("react");
var import_react11 = require("@assistant-ui/react");
var import_client5 = require("@aomi-labs/client");

// packages/react/src/runtime/orchestrator.ts
var import_react6 = require("react");
var import_client4 = require("@aomi-labs/client");

// packages/react/src/runtime/session-manager.ts
var import_client3 = require("@aomi-labs/client");
var SessionManager = class {
  constructor(clientFactory) {
    this.clientFactory = clientFactory;
    this.sessions = /* @__PURE__ */ new Map();
  }
  getOrCreate(threadId, opts) {
    let session = this.sessions.get(threadId);
    if (session) return session;
    session = new import_client3.Session(this.clientFactory(), __spreadProps(__spreadValues({}, opts), {
      sessionId: threadId
    }));
    this.sessions.set(threadId, session);
    return session;
  }
  get(threadId) {
    return this.sessions.get(threadId);
  }
  forEach(callback) {
    for (const [threadId, session] of this.sessions) {
      callback(session, threadId);
    }
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
var import_clsx = require("clsx");
var import_tailwind_merge = require("tailwind-merge");
function cn(...inputs) {
  return (0, import_tailwind_merge.twMerge)((0, import_clsx.clsx)(inputs));
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
  const threadContextRef = (0, import_react6.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const aomiClientRef = (0, import_react6.useRef)(aomiClient);
  aomiClientRef.current = aomiClient;
  const [isRunning, setIsRunning] = (0, import_react6.useState)(false);
  const sessionManagerRef = (0, import_react6.useRef)(null);
  if (!sessionManagerRef.current) {
    sessionManagerRef.current = new SessionManager(() => aomiClientRef.current);
  }
  const pendingFetches = (0, import_react6.useRef)(/* @__PURE__ */ new Set());
  const listenerCleanups = (0, import_react6.useRef)(/* @__PURE__ */ new Map());
  const getSession = (0, import_react6.useCallback)(
    (threadId) => {
      var _a, _b, _c, _d, _e;
      const manager = sessionManagerRef.current;
      const nextApp = options.getApp();
      const nextPublicKey = (_a = options.getPublicKey) == null ? void 0 : _a.call(options);
      const nextApiKey = (_c = (_b = options.getApiKey) == null ? void 0 : _b.call(options)) != null ? _c : void 0;
      const nextClientId = (_d = options.getClientId) == null ? void 0 : _d.call(options);
      const nextUserState = (_e = options.getUserState) == null ? void 0 : _e.call(options);
      const existing = manager.get(threadId);
      if (existing) {
        existing.syncRuntimeOptions({
          app: nextApp,
          publicKey: nextPublicKey,
          apiKey: nextApiKey,
          clientId: nextClientId,
          userState: nextUserState
        });
        return existing;
      }
      const session = manager.getOrCreate(threadId, {
        app: nextApp,
        publicKey: nextPublicKey,
        apiKey: nextApiKey,
        clientId: nextClientId,
        clientType: import_client4.CLIENT_TYPE_WEB_UI,
        syncPendingTxRequestsFromUserState: false,
        userState: nextUserState
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
        session.on(
          "wallet_requests_changed",
          (requests) => {
            var _a2;
            return (_a2 = options.onPendingRequestsChange) == null ? void 0 : _a2.call(options, requests);
          }
        )
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
  const ensureInitialState = (0, import_react6.useCallback)(
    async (threadId) => {
      var _a;
      if (pendingFetches.current.has(threadId)) return;
      pendingFetches.current.add(threadId);
      try {
        const session = getSession(threadId);
        await session.fetchCurrentState();
        (_a = options.onPendingRequestsChange) == null ? void 0 : _a.call(options, session.getPendingRequests());
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
  const sendMessage = (0, import_react6.useCallback)(
    async (text, threadId) => {
      var _a;
      const session = getSession(threadId);
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
      (_a = options.onPendingRequestsChange) == null ? void 0 : _a.call(options, session.getPendingRequests());
    },
    [getSession]
  );
  const cancelGeneration = (0, import_react6.useCallback)(
    async (threadId) => {
      var _a;
      const session = (_a = sessionManagerRef.current) == null ? void 0 : _a.get(threadId);
      if (session) {
        await session.interrupt();
      }
    },
    []
  );
  (0, import_react6.useEffect)(() => {
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
var import_react7 = require("react");
var AomiRuntimeContext = (0, import_react7.createContext)(null);
var AomiRuntimeApiProvider = AomiRuntimeContext.Provider;
function useAomiRuntime() {
  const context = (0, import_react7.useContext)(AomiRuntimeContext);
  if (!context) {
    throw new Error(
      "useAomiRuntime must be used within AomiRuntimeProvider. Wrap your app with <AomiRuntimeProvider>...</AomiRuntimeProvider>"
    );
  }
  return context;
}

// packages/react/src/handlers/wallet-handler.ts
var import_react8 = require("react");
function useWalletHandler({
  getSession
}) {
  const [pendingRequests, setPendingRequests] = (0, import_react8.useState)([]);
  const requestsRef = (0, import_react8.useRef)(pendingRequests);
  const inFlightRequestSetRef = (0, import_react8.useRef)(/* @__PURE__ */ new Set());
  const suppressedRequestSetRef = (0, import_react8.useRef)(/* @__PURE__ */ new Set());
  const syncVisibleRequests = (0, import_react8.useCallback)(() => {
    setPendingRequests(
      requestsRef.current.filter(
        (request) => !suppressedRequestSetRef.current.has(request.id)
      )
    );
  }, []);
  const setRequests = (0, import_react8.useCallback)((requests) => {
    const incomingIds = new Set(requests.map((request) => request.id));
    for (const id of suppressedRequestSetRef.current) {
      if (!incomingIds.has(id) && !inFlightRequestSetRef.current.has(id)) {
        suppressedRequestSetRef.current.delete(id);
      }
    }
    const preservedInFlight = requestsRef.current.filter(
      (request) => inFlightRequestSetRef.current.has(request.id) && !incomingIds.has(request.id)
    );
    requestsRef.current = [...requests, ...preservedInFlight];
    syncVisibleRequests();
  }, [syncVisibleRequests]);
  const startRequest = (0, import_react8.useCallback)((id) => {
    if (!requestsRef.current.some((request) => request.id === id)) {
      return;
    }
    inFlightRequestSetRef.current.add(id);
    suppressedRequestSetRef.current.add(id);
    syncVisibleRequests();
  }, [syncVisibleRequests]);
  const resolveRequest = (0, import_react8.useCallback)(
    async (id, result) => {
      const session = getSession();
      if (!session) {
        console.error("[wallet-handler] No session available to resolve request");
        return;
      }
      startRequest(id);
      try {
        await session.resolve(id, result);
      } catch (err) {
        console.error("[wallet-handler] Failed to resolve request:", err);
      } finally {
        requestsRef.current = requestsRef.current.filter(
          (request) => request.id !== id
        );
        inFlightRequestSetRef.current.delete(id);
        syncVisibleRequests();
      }
    },
    [getSession, startRequest, syncVisibleRequests]
  );
  const rejectRequest = (0, import_react8.useCallback)(
    async (id, error) => {
      const session = getSession();
      if (!session) {
        console.error("[wallet-handler] No session available to reject request");
        return;
      }
      startRequest(id);
      try {
        await session.reject(id, error);
      } catch (err) {
        console.error("[wallet-handler] Failed to reject request:", err);
      } finally {
        requestsRef.current = requestsRef.current.filter(
          (request) => request.id !== id
        );
        inFlightRequestSetRef.current.delete(id);
        syncVisibleRequests();
      }
    },
    [getSession, startRequest, syncVisibleRequests]
  );
  return {
    pendingRequests,
    setRequests,
    startRequest,
    resolveRequest,
    rejectRequest
  };
}

// packages/react/src/runtime/user-state-provider.tsx
var import_react9 = require("react");
var import_jsx_runtime6 = require("react/jsx-runtime");
function stableStateString(state) {
  return JSON.stringify(state != null ? state : {});
}
function RuntimeUserStateProvider({
  children,
  sessionManager,
  getUserState,
  onUserStateChange
}) {
  const lastSerializedStateRef = (0, import_react9.useRef)("");
  (0, import_react9.useEffect)(() => {
    const applyToSessions = (next) => {
      const serialized = stableStateString(next);
      if (serialized === lastSerializedStateRef.current) {
        return;
      }
      lastSerializedStateRef.current = serialized;
      sessionManager.forEach((session) => {
        session.resolveUserState(next);
      });
    };
    applyToSessions(getUserState());
    const unsubscribe = onUserStateChange((next) => {
      applyToSessions(next);
    });
    return unsubscribe;
  }, [getUserState, onUserStateChange, sessionManager]);
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_jsx_runtime6.Fragment, { children });
}

// packages/react/src/runtime/core.tsx
var import_jsx_runtime7 = require("react/jsx-runtime");
function AomiRuntimeCore({
  children,
  aomiClient
}) {
  const threadContext = useThreadContext();
  const eventContext = useEventContext();
  const notificationContext = useNotification();
  const { user, onUserStateChange, getUserState } = useUser();
  const { getControlState, getCurrentThreadApp } = useControl();
  const sessionManagerRef = (0, import_react10.useRef)(null);
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
    getPublicKey: () => import_client5.UserState.isConnected(getUserState()) ? import_client5.UserState.address(getUserState()) : void 0,
    getUserState,
    getApp: getCurrentThreadApp,
    getApiKey: () => getControlState().apiKey,
    getClientId: () => {
      var _a;
      return (_a = getControlState().clientId) != null ? _a : void 0;
    },
    onPendingRequestsChange: walletHandler.setRequests,
    onEvent: (event) => eventContext.dispatch(event)
  });
  sessionManagerRef.current = sessionManager;
  const walletSnapshot = (0, import_react10.useCallback)(
    (nextUser) => {
      var _a;
      return {
        address: import_client5.UserState.address(nextUser),
        chain_id: import_client5.UserState.chainId(nextUser),
        is_connected: (_a = import_client5.UserState.isConnected(nextUser)) != null ? _a : false,
        ens_name: typeof nextUser.ens_name === "string" ? nextUser.ens_name : void 0
      };
    },
    [getUserState]
  );
  const lastWalletStateRef = (0, import_react10.useRef)(walletSnapshot(getUserState()));
  (0, import_react10.useEffect)(() => {
    lastWalletStateRef.current = walletSnapshot(getUserState());
    const unsubscribe = onUserStateChange(async (newUser) => {
      const nextWalletState = walletSnapshot(newUser);
      const prevWalletState = lastWalletStateRef.current;
      if (prevWalletState.address === nextWalletState.address && prevWalletState.chain_id === nextWalletState.chain_id && prevWalletState.is_connected === nextWalletState.is_connected && prevWalletState.ens_name === nextWalletState.ens_name) {
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
  const threadContextRef = (0, import_react10.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const remoteThreadIdsRef = (0, import_react10.useRef)(/* @__PURE__ */ new Set());
  const warmedThreadIdsRef = (0, import_react10.useRef)(/* @__PURE__ */ new Set());
  const warmThread = (0, import_react10.useCallback)(
    async (threadId) => {
      if (!remoteThreadIdsRef.current.has(threadId) || warmedThreadIdsRef.current.has(threadId)) {
        return;
      }
      const userState = getUserState();
      await aomiClientRef.current.createThread(
        threadId,
        import_client5.UserState.isConnected(userState) ? import_client5.UserState.address(userState) : void 0
      );
      warmedThreadIdsRef.current.add(threadId);
    },
    [aomiClientRef, getUserState]
  );
  (0, import_react10.useEffect)(() => {
    const unsubscribe = eventContext.subscribe(
      "user_state_request",
      () => {
        var _a, _b, _c;
        const session = (_b = (_a = sessionManagerRef.current) == null ? void 0 : _a.get(threadContext.currentThreadId)) != null ? _b : getSession(threadContext.currentThreadId);
        eventContext.sendOutboundSystem({
          type: "user_state_response",
          sessionId: threadContext.currentThreadId,
          payload: (_c = session.getUserState()) != null ? _c : getUserState()
        });
      }
    );
    return unsubscribe;
  }, [eventContext, threadContext.currentThreadId, getSession, getUserState]);
  (0, import_react10.useEffect)(() => {
    const threadId = threadContext.currentThreadId;
    let cancelled = false;
    void (async () => {
      await warmThread(threadId);
      if (!cancelled) {
        await ensureInitialState(threadId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ensureInitialState, threadContext.currentThreadId, warmThread]);
  (0, import_react10.useEffect)(() => {
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
  (0, import_react10.useEffect)(() => {
    const userAddress = import_client5.UserState.isConnected(user) ? import_client5.UserState.address(user) : void 0;
    if (!userAddress) {
      remoteThreadIdsRef.current.clear();
      warmedThreadIdsRef.current.clear();
      return;
    }
    const fetchThreadList = async () => {
      var _a, _b, _c;
      try {
        const threadList = await aomiClientRef.current.listThreads(userAddress);
        const currentContext = threadContextRef.current;
        const remoteThreadIds = /* @__PURE__ */ new Set();
        const newMetadata = new Map(currentContext.allThreadsMetadata);
        let maxChatNum = currentContext.threadCnt;
        for (const thread of threadList) {
          remoteThreadIds.add(thread.session_id);
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
        remoteThreadIdsRef.current = remoteThreadIds;
        warmedThreadIdsRef.current = new Set(
          Array.from(warmedThreadIdsRef.current).filter(
            (threadId) => remoteThreadIds.has(threadId)
          )
        );
        currentContext.setThreadMetadata(newMetadata);
        if (maxChatNum > currentContext.threadCnt) {
          currentContext.setThreadCnt(maxChatNum);
        }
        if (remoteThreadIds.has(currentContext.currentThreadId)) {
          await warmThread(currentContext.currentThreadId);
          await ensureInitialState(currentContext.currentThreadId);
        }
      } catch (error) {
        console.error("Failed to fetch thread list:", error);
      }
    };
    void fetchThreadList();
  }, [user, aomiClientRef, ensureInitialState, warmThread]);
  const threadListAdapter = (0, import_react10.useMemo)(
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
  (0, import_react10.useEffect)(() => {
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
  (0, import_react10.useEffect)(() => {
    const unsubscribe = eventContext.subscribe("system_notice", (_event) => {
    });
    return unsubscribe;
  }, [eventContext, notificationContext]);
  const runtime = (0, import_react11.useExternalStoreRuntime)({
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
  (0, import_react10.useEffect)(() => {
    return () => {
      sessionManager.closeAll();
    };
  }, [sessionManager]);
  const userContext = useUser();
  const sendMessage = (0, import_react10.useCallback)(
    async (text) => {
      await orchestratorSendMessage(text, threadContext.currentThreadId);
    },
    [orchestratorSendMessage, threadContext.currentThreadId]
  );
  const cancelGeneration = (0, import_react10.useCallback)(() => {
    void orchestratorCancel(threadContext.currentThreadId);
  }, [orchestratorCancel, threadContext.currentThreadId]);
  const getMessages = (0, import_react10.useCallback)(
    (threadId) => {
      const id = threadId != null ? threadId : threadContext.currentThreadId;
      return threadContext.getThreadMessages(id);
    },
    [threadContext]
  );
  const createThread = (0, import_react10.useCallback)(async () => {
    await threadListAdapter.onSwitchToNewThread();
    return threadContextRef.current.currentThreadId;
  }, [threadListAdapter]);
  const deleteThread = (0, import_react10.useCallback)(
    async (threadId) => {
      sessionManager.close(threadId);
      await threadListAdapter.onDelete(threadId);
    },
    [threadListAdapter, sessionManager]
  );
  const renameThread = (0, import_react10.useCallback)(
    async (threadId, title) => {
      await threadListAdapter.onRename(threadId, title);
    },
    [threadListAdapter]
  );
  const archiveThread = (0, import_react10.useCallback)(
    async (threadId) => {
      await threadListAdapter.onArchive(threadId);
    },
    [threadListAdapter]
  );
  const selectThread = (0, import_react10.useCallback)(
    (threadId) => {
      if (threadContext.allThreadsMetadata.has(threadId)) {
        threadListAdapter.onSwitchToThread(threadId);
      } else {
        void threadListAdapter.onSwitchToNewThread();
      }
    },
    [threadContext.allThreadsMetadata, threadListAdapter]
  );
  const simulateBatchTransactions = (0, import_react10.useCallback)(
    async (transactions, options) => {
      var _a, _b;
      const session = (_b = (_a = sessionManagerRef.current) == null ? void 0 : _a.get(threadContext.currentThreadId)) != null ? _b : getSession(threadContext.currentThreadId);
      if (!session) {
        throw new Error("runtime_session_unavailable");
      }
      const response = await session.client.simulateBatch(
        session.sessionId,
        transactions,
        options
      );
      return response.result;
    },
    [getSession, threadContext.currentThreadId]
  );
  const aomiRuntimeApi = (0, import_react10.useMemo)(
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
      startWalletRequest: walletHandler.startRequest,
      resolveWalletRequest: walletHandler.resolveRequest,
      rejectWalletRequest: walletHandler.rejectRequest,
      simulateBatchTransactions,
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
      simulateBatchTransactions,
      eventContext
    ]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(AomiRuntimeApiProvider, { value: aomiRuntimeApi, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
    RuntimeUserStateProvider,
    {
      sessionManager,
      getUserState: userContext.getUserState,
      onUserStateChange: userContext.onUserStateChange,
      children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_react11.AssistantRuntimeProvider, { runtime, children })
    }
  ) });
}

// packages/react/src/runtime/aomi-runtime.tsx
var import_jsx_runtime8 = require("react/jsx-runtime");
function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080"
}) {
  const aomiClient = (0, import_react12.useMemo)(() => new import_client6.AomiClient({ baseUrl: backendUrl }), [backendUrl]);
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ThreadContextProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(NotificationContextProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(UserContextProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(AomiRuntimeInner, { aomiClient, children }) }) }) });
}
function AomiRuntimeInner({
  children,
  aomiClient
}) {
  var _a;
  const threadContext = useThreadContext();
  const { user } = useUser();
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
    ControlContextProvider,
    {
      aomiClient,
      sessionId: threadContext.currentThreadId,
      publicKey: import_client6.UserState.isConnected(user) ? (_a = import_client6.UserState.address(user)) != null ? _a : void 0 : void 0,
      getThreadMetadata: threadContext.getThreadMetadata,
      updateThreadMetadata: threadContext.updateThreadMetadata,
      children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        EventContextProvider,
        {
          aomiClient,
          sessionId: threadContext.currentThreadId,
          children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(AomiRuntimeCore, { aomiClient, children })
        }
      )
    }
  );
}

// packages/react/src/handlers/notification-handler.ts
var import_react13 = require("react");
var notificationIdCounter2 = 0;
function generateNotificationId() {
  return `notif-${Date.now()}-${++notificationIdCounter2}`;
}
function useNotificationHandler({
  onNotification
} = {}) {
  const { subscribe } = useEventContext();
  const [notifications, setNotifications] = (0, import_react13.useState)([]);
  (0, import_react13.useEffect)(() => {
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
  const markHandled = (0, import_react13.useCallback)((id) => {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AomiClient,
  AomiRuntimeProvider,
  ControlContextProvider,
  DISABLED_PROVIDER_STATE,
  EventContextProvider,
  MAX_AUTO_FEE_WEI,
  NotificationContextProvider,
  RuntimeUserStateProvider,
  SUPPORTED_CHAINS,
  ThreadContextProvider,
  UserContextProvider,
  aaModeFromExecutionKind,
  appendFeeCallToPayload,
  buildFeeAAWalletCall,
  cn,
  executeWalletCalls,
  formatAddress,
  getChainInfo,
  getNetworkName,
  hydrateTxPayloadFromUserState,
  initThreadControl,
  normalizeSimulatedFee,
  parseChainId,
  toAAWalletCall,
  toAAWalletCalls,
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
});
//# sourceMappingURL=index.cjs.map