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
  AomiClient: () => import_client9.AomiClient,
  AomiRuntimeApiProvider: () => AomiRuntimeApiProvider,
  AomiRuntimeProvider: () => AomiRuntimeProvider,
  ControlContextProvider: () => ControlContextProvider,
  DISABLED_PROVIDER_STATE: () => import_client10.DISABLED_PROVIDER_STATE,
  EventContextProvider: () => EventContextProvider,
  ExtUserProvider: () => ExtUserProvider,
  MAX_AUTO_FEE_WEI: () => import_client10.MAX_AUTO_FEE_WEI,
  NotificationContextProvider: () => NotificationContextProvider,
  RuntimeUserStateProvider: () => RuntimeUserStateProvider,
  SUPPORTED_CHAINS: () => SUPPORTED_CHAINS,
  ThreadContextProvider: () => ThreadContextProvider,
  UserState: () => import_client2.UserState,
  aaModeFromExecutionKind: () => import_client10.aaModeFromExecutionKind,
  appendFeeCallToPayload: () => import_client10.appendFeeCallToPayload,
  buildFeeAAWalletCall: () => import_client10.buildFeeAAWalletCall,
  cn: () => cn,
  executeWalletCalls: () => import_client10.executeWalletCalls,
  formatAddress: () => formatAddress,
  getChainInfo: () => getChainInfo,
  getNetworkName: () => getNetworkName,
  hydrateTxPayloadFromUserState: () => import_client10.hydrateTxPayloadFromUserState,
  initThreadControl: () => initThreadControl,
  normalizeSimulatedFee: () => import_client10.normalizeSimulatedFee,
  parseChainId: () => import_client10.parseChainId,
  resolveAutoModel: () => resolveAutoModel,
  toAAWalletCall: () => import_client10.toAAWalletCall,
  toAAWalletCalls: () => import_client10.toAAWalletCalls,
  toViemSignTypedDataArgs: () => import_client10.toViemSignTypedDataArgs,
  useAomiRuntime: () => useAomiRuntime,
  useControl: () => useControl,
  useCurrentThreadMessages: () => useCurrentThreadMessages,
  useCurrentThreadMetadata: () => useCurrentThreadMetadata,
  useEventContext: () => useEventContext,
  useNotification: () => useNotification,
  useNotificationHandler: () => useNotificationHandler,
  useOptionalAomiRuntime: () => useOptionalAomiRuntime,
  useThreadContext: () => useThreadContext,
  useUser: () => useUser,
  useWalletHandler: () => useWalletHandler
});
module.exports = __toCommonJS(index_exports);
var import_client9 = require("@aomi-labs/client");
var import_client10 = require("@aomi-labs/client");

// packages/react/src/runtime/aomi-runtime.tsx
var import_react12 = require("react");
var import_client8 = require("@aomi-labs/client");

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
    modelMode: "auto",
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
    /** Reset store to a single empty "New Chat" thread (e.g. on wallet disconnect). */
    this.resetToDefault = () => {
      const threadId = generateUUID();
      this.state = {
        currentThreadId: threadId,
        threadViewKey: this.state.threadViewKey + 1,
        threadCnt: 1,
        threads: /* @__PURE__ */ new Map([[threadId, []]]),
        threadMetadata: /* @__PURE__ */ new Map([
          [
            threadId,
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
      this.emit();
      return threadId;
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
      updateThreadMetadata: this.updateThreadMetadata,
      resetToDefault: this.resetToDefault
    };
  }
};

// packages/react/src/utils/model-selection.ts
var PREFERRED_DEFAULT_MODEL_PATTERNS = [
  /^claude.*opus.*4[.-]?6/i,
  /^claude.*4[.-]?6.*opus/i,
  /^claude-4\.5-haiku/i,
  /^claude.*haiku/i,
  /^gpt-4o-mini/i,
  /^gemini.*flash/i
];
function resolveAutoModel(models) {
  var _a;
  if (models.length === 0) return null;
  for (const pattern of PREFERRED_DEFAULT_MODEL_PATTERNS) {
    const match = models.find((model) => pattern.test(model));
    if (match) return match;
  }
  return (_a = models[0]) != null ? _a : null;
}

// packages/react/src/utils/client-session.ts
var CLIENT_ID_STORAGE_KEY = "aomi_client_id";
var CONTROL_SESSION_PREFIX = "control:";
function getOrCreateClientId() {
  var _a, _b, _c, _d, _e;
  try {
    const storedClientId = (_a = globalThis.localStorage) == null ? void 0 : _a.getItem(
      CLIENT_ID_STORAGE_KEY
    );
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
function getControlSessionId(clientId, fallbackSessionId) {
  const trimmedClientId = clientId == null ? void 0 : clientId.trim();
  return trimmedClientId ? `${CONTROL_SESSION_PREFIX}${trimmedClientId}` : fallbackSessionId;
}

// packages/react/src/contexts/control-context.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var API_KEY_STORAGE_KEY = "aomi_secret_key";
var BYOK_KEYS_STORAGE_KEY = "aomi_byok_keys";
var MODEL_SELECTION_STORAGE_KEY = "aomi_model_selection";
var BYOK_SECRET_PREFIX = "PROVIDER_KEY:";
function getDefaultApp(apps) {
  var _a;
  return apps.includes("default") ? "default" : (_a = apps[0]) != null ? _a : null;
}
function namesFromDescriptors(apps) {
  return apps.map((a) => a.name);
}
function readStoredModelPreference() {
  var _a;
  try {
    const raw = (_a = globalThis.localStorage) == null ? void 0 : _a.getItem(MODEL_SELECTION_STORAGE_KEY);
    if (!raw) return { mode: "auto", model: null };
    const parsed = JSON.parse(raw);
    return {
      mode: parsed.mode === "manual" ? "manual" : "auto",
      model: typeof parsed.model === "string" ? parsed.model : null
    };
  } catch (e) {
    return { mode: "auto", model: null };
  }
}
function writeStoredModelPreference(preference) {
  var _a;
  try {
    (_a = globalThis.localStorage) == null ? void 0 : _a.setItem(
      MODEL_SELECTION_STORAGE_KEY,
      JSON.stringify(preference)
    );
  } catch (e) {
  }
}
function resolvePreferredModelSelection(preference, models, defaultModel) {
  var _a;
  if (preference.mode === "manual" && preference.model && models.includes(preference.model)) {
    return preference;
  }
  if (preference.mode === "auto") {
    return {
      mode: "auto",
      model: (_a = resolveAutoModel(models)) != null ? _a : defaultModel
    };
  }
  return {
    mode: "auto",
    model: defaultModel != null ? defaultModel : resolveAutoModel(models)
  };
}
function getFallbackModel(models, defaultModel) {
  return defaultModel != null ? defaultModel : resolveAutoModel(models);
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
    appDescriptors: [],
    defaultModel: null,
    defaultApp: null,
    byokKeys: {}
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
  const getCurrentControlSessionId = (0, import_react.useCallback)(
    () => getControlSessionId(stateRef.current.clientId, sessionIdRef.current),
    []
  );
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
      const raw = (_a2 = globalThis.localStorage) == null ? void 0 : _a2.getItem(BYOK_KEYS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), { byokKeys: parsed }));
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
      const keys = state.byokKeys;
      if (Object.keys(keys).length > 0) {
        (_a2 = globalThis.localStorage) == null ? void 0 : _a2.setItem(
          BYOK_KEYS_STORAGE_KEY,
          JSON.stringify(keys)
        );
      } else {
        (_b2 = globalThis.localStorage) == null ? void 0 : _b2.removeItem(BYOK_KEYS_STORAGE_KEY);
      }
    } catch (e) {
    }
  }, [state.byokKeys]);
  (0, import_react.useEffect)(() => {
    if (!state.clientId) return;
    const keys = stateRef.current.byokKeys;
    if (Object.keys(keys).length === 0) return;
    const secrets = {};
    for (const [provider, entry] of Object.entries(keys)) {
      secrets[`${BYOK_SECRET_PREFIX}${provider}`] = entry.apiKey;
    }
    void aomiClientRef.current.ingestSecrets(getCurrentControlSessionId(), state.clientId, secrets).catch((err) => {
      console.error("Failed to auto-ingest BYOK keys:", err);
    });
  }, [getCurrentControlSessionId, state.clientId, state.byokKeys]);
  (0, import_react.useEffect)(() => {
    const fetchApps = async () => {
      var _a2;
      try {
        const descriptors = await aomiClientRef.current.getApps(
          getCurrentControlSessionId(),
          {
            publicKey: publicKeyRef.current,
            apiKey: (_a2 = stateRef.current.apiKey) != null ? _a2 : void 0
          }
        );
        const names = namesFromDescriptors(descriptors);
        const defaultApp = getDefaultApp(names);
        setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), {
          authorizedApps: names,
          appDescriptors: descriptors,
          defaultApp
        }));
      } catch (error) {
        console.error("Failed to fetch apps:", error);
        setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), {
          authorizedApps: ["default"],
          appDescriptors: [{ name: "default" }],
          defaultApp: "default"
        }));
      }
    };
    void fetchApps();
  }, [getCurrentControlSessionId, state.apiKey]);
  (0, import_react.useEffect)(() => {
    const fetchModels = async () => {
      try {
        const models = await aomiClientRef.current.getModels(
          getCurrentControlSessionId()
        );
        setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), {
          availableModels: models,
          defaultModel: resolveAutoModel(models)
        }));
      } catch (error) {
        console.error("Failed to fetch models:", error);
      }
    };
    void fetchModels();
  }, [getCurrentControlSessionId]);
  const setApiKey = (0, import_react.useCallback)((apiKey) => {
    setStateInternal((prev) => {
      const next = __spreadProps(__spreadValues({}, prev), { apiKey: apiKey === "" ? null : apiKey });
      callbacks.current.forEach((cb) => cb(next));
      return next;
    });
  }, []);
  const ingestSecrets = (0, import_react.useCallback)(
    async (secrets, app) => {
      const clientId = stateRef.current.clientId;
      if (!clientId) throw new Error("clientId not initialized");
      const { handles } = await aomiClientRef.current.ingestSecrets(
        getCurrentControlSessionId(),
        clientId,
        secrets,
        app
      );
      return handles;
    },
    [getCurrentControlSessionId]
  );
  const clearSecrets = (0, import_react.useCallback)(
    async (app) => {
      var _a2, _b2;
      const clientId = stateRef.current.clientId;
      if (!clientId) return;
      await ((_b2 = (_a2 = aomiClientRef.current).clearSecrets) == null ? void 0 : _b2.call(
        _a2,
        getCurrentControlSessionId(),
        clientId,
        app
      ));
    },
    [getCurrentControlSessionId]
  );
  const deleteSecret = (0, import_react.useCallback)(
    async (name, app) => {
      const clientId = stateRef.current.clientId;
      if (!clientId) return;
      await aomiClientRef.current.deleteSecret(
        getCurrentControlSessionId(),
        clientId,
        name,
        app
      );
    },
    [getCurrentControlSessionId]
  );
  const listSecrets = (0, import_react.useCallback)(async () => {
    const { by_app } = await aomiClientRef.current.listSecrets(
      getCurrentControlSessionId()
    );
    return by_app;
  }, [getCurrentControlSessionId]);
  const setByok = (0, import_react.useCallback)(
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
          byokKeys: __spreadProps(__spreadValues({}, prev.byokKeys), { [provider]: entry })
        });
        callbacks.current.forEach((cb) => cb(next));
        return next;
      });
      const clientId = stateRef.current.clientId;
      if (clientId) {
        try {
          await aomiClientRef.current.ingestSecrets(
            getCurrentControlSessionId(),
            clientId,
            {
              [`${BYOK_SECRET_PREFIX}${provider}`]: trimmed
            }
          );
        } catch (err) {
          console.error("Failed to ingest BYOK key:", err);
        }
      }
    },
    [getCurrentControlSessionId]
  );
  const removeByok = (0, import_react.useCallback)(
    async (provider) => {
      const clientId = stateRef.current.clientId;
      if (clientId) {
        await aomiClientRef.current.deleteSecret(
          getCurrentControlSessionId(),
          clientId,
          `${BYOK_SECRET_PREFIX}${provider}`
        );
      }
      setStateInternal((prev) => {
        const _a2 = prev.byokKeys, { [provider]: _ } = _a2, rest = __objRest(_a2, [__restKey(provider)]);
        const next = __spreadProps(__spreadValues({}, prev), { byokKeys: rest });
        callbacks.current.forEach((cb) => cb(next));
        return next;
      });
    },
    [getCurrentControlSessionId]
  );
  const getByokKeys = (0, import_react.useCallback)(
    () => stateRef.current.byokKeys,
    []
  );
  const hasByok = (0, import_react.useCallback)((provider) => {
    const keys = stateRef.current.byokKeys;
    if (provider) return provider in keys;
    return Object.keys(keys).length > 0;
  }, []);
  const getAvailableModels = (0, import_react.useCallback)(async () => {
    try {
      const models = await aomiClientRef.current.getModels(
        getCurrentControlSessionId()
      );
      setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), {
        availableModels: models,
        defaultModel: resolveAutoModel(models)
      }));
      return models;
    } catch (error) {
      console.error("Failed to fetch models:", error);
      return [];
    }
  }, [getCurrentControlSessionId]);
  const getAuthorizedApps = (0, import_react.useCallback)(async () => {
    var _a2;
    try {
      const descriptors = await aomiClientRef.current.getApps(
        getCurrentControlSessionId(),
        {
          publicKey: publicKeyRef.current,
          apiKey: (_a2 = stateRef.current.apiKey) != null ? _a2 : void 0
        }
      );
      const names = namesFromDescriptors(descriptors);
      const defaultApp = getDefaultApp(names);
      setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), {
        authorizedApps: names,
        appDescriptors: descriptors,
        defaultApp
      }));
      return names;
    } catch (error) {
      console.error("Failed to fetch apps:", error);
      setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), {
        authorizedApps: ["default"],
        appDescriptors: [{ name: "default" }],
        defaultApp: "default"
      }));
      return ["default"];
    }
  }, [getCurrentControlSessionId]);
  const getCurrentThreadControl = (0, import_react.useCallback)(() => {
    var _a2;
    const metadata = getThreadMetadataRef.current(sessionIdRef.current);
    return (_a2 = metadata == null ? void 0 : metadata.control) != null ? _a2 : initThreadControl();
  }, []);
  const getPreferredThreadControl = (0, import_react.useCallback)(() => {
    const preference = readStoredModelPreference();
    const selection = resolvePreferredModelSelection(
      preference,
      stateRef.current.availableModels,
      stateRef.current.defaultModel
    );
    return __spreadProps(__spreadValues({}, initThreadControl()), {
      model: selection.model,
      modelMode: selection.mode,
      controlDirty: selection.model !== null
    });
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
  const onModelSelect = (0, import_react.useCallback)(
    async (model, options) => {
      var _a2, _b2, _c, _d, _e, _f, _g, _h;
      const threadId = sessionIdRef.current;
      const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(threadId)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
      const isProcessing2 = currentControl.isProcessing;
      const modelMode = (_c = options == null ? void 0 : options.mode) != null ? _c : "manual";
      console.log("[control-context] onModelSelect called", {
        model,
        modelMode,
        isProcessing: isProcessing2,
        threadId
      });
      if (isProcessing2) {
        console.warn("[control-context] Cannot switch model while processing");
        return;
      }
      const app = (_d = resolveAuthorizedApp(
        currentControl.app,
        stateRef.current.authorizedApps,
        stateRef.current.defaultApp
      )) != null ? _d : "default";
      console.log("[control-context] onModelSelect updating metadata", {
        threadId,
        model,
        app,
        currentControl
      });
      updateThreadMetadataRef.current(threadId, {
        control: __spreadProps(__spreadValues({}, currentControl), {
          model,
          modelMode,
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
        const result = await aomiClientRef.current.setModel(threadId, model, {
          app,
          apiKey: (_e = stateRef.current.apiKey) != null ? _e : void 0,
          clientId: (_f = stateRef.current.clientId) != null ? _f : void 0
        });
        console.log("[control-context] onModelSelect backend result", result);
        writeStoredModelPreference({
          mode: modelMode,
          model: modelMode === "manual" ? model : null
        });
        const latestControl = (_h = (_g = getThreadMetadataRef.current(threadId)) == null ? void 0 : _g.control) != null ? _h : currentControl;
        if (latestControl.model === model && latestControl.app === app) {
          updateThreadMetadataRef.current(threadId, {
            control: __spreadProps(__spreadValues({}, latestControl), {
              modelMode,
              controlDirty: false
            })
          });
        }
      } catch (err) {
        console.error("[control-context] setModel failed:", err);
        throw err;
      }
    },
    []
  );
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
      console.warn("[control-context] Cannot switch app while processing");
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
  const syncCurrentThreadControl = (0, import_react.useCallback)(async () => {
    var _a2, _b2, _c, _d, _e, _f, _g;
    const threadId = sessionIdRef.current;
    const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(threadId)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
    if (!currentControl.controlDirty || currentControl.isProcessing || !currentControl.model) {
      return;
    }
    const app = (_c = resolveAuthorizedApp(
      currentControl.app,
      stateRef.current.authorizedApps,
      stateRef.current.defaultApp
    )) != null ? _c : "default";
    await aomiClientRef.current.setModel(threadId, currentControl.model, {
      app,
      apiKey: (_d = stateRef.current.apiKey) != null ? _d : void 0,
      clientId: (_e = stateRef.current.clientId) != null ? _e : void 0
    });
    const latestControl = (_g = (_f = getThreadMetadataRef.current(threadId)) == null ? void 0 : _f.control) != null ? _g : currentControl;
    if (latestControl.model === currentControl.model && latestControl.app === currentControl.app) {
      updateThreadMetadataRef.current(threadId, {
        control: __spreadProps(__spreadValues({}, latestControl), {
          app,
          controlDirty: false
        })
      });
    }
  }, []);
  (0, import_react.useEffect)(() => {
    var _a2;
    const threadId = sessionIdRef.current;
    const metadata = getThreadMetadataRef.current(threadId);
    if (!metadata || metadata.control.isProcessing) return;
    const currentControl = metadata.control;
    let nextControl = null;
    if (currentControl.model === null) {
      const preferred = getPreferredThreadControl();
      if (!preferred.model) return;
      nextControl = __spreadProps(__spreadValues({}, currentControl), {
        model: preferred.model,
        modelMode: preferred.modelMode,
        controlDirty: true
      });
    } else if (state.availableModels.length > 0) {
      const currentMode = (_a2 = currentControl.modelMode) != null ? _a2 : "manual";
      if (currentMode === "auto") {
        const autoModel = getFallbackModel(
          state.availableModels,
          state.defaultModel
        );
        if (autoModel && currentControl.model !== autoModel) {
          nextControl = __spreadProps(__spreadValues({}, currentControl), {
            model: autoModel,
            modelMode: "auto",
            controlDirty: true
          });
        }
      } else if (!state.availableModels.includes(currentControl.model)) {
        const fallbackModel = getFallbackModel(
          state.availableModels,
          state.defaultModel
        );
        if (fallbackModel) {
          nextControl = __spreadProps(__spreadValues({}, currentControl), {
            model: fallbackModel,
            modelMode: "auto",
            controlDirty: true
          });
        }
      }
    }
    if (!nextControl) return;
    updateThreadMetadataRef.current(threadId, {
      control: nextControl
    });
  }, [
    getPreferredThreadControl,
    sessionId,
    state.availableModels,
    state.defaultModel
  ]);
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
        onModelSelect,
        onAppSelect,
        isProcessing,
        markControlSynced,
        syncCurrentThreadControl,
        getPreferredThreadControl,
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
  const paymentRequiredIdRef = (0, import_react3.useRef)(null);
  const showNotification = (0, import_react3.useCallback)((params) => {
    if (params.kind === "payment_required" && paymentRequiredIdRef.current) {
      return paymentRequiredIdRef.current;
    }
    const id = generateId();
    const notification = __spreadProps(__spreadValues({}, params), {
      id,
      timestamp: Date.now()
    });
    if (params.kind === "payment_required") {
      paymentRequiredIdRef.current = id;
    }
    setNotifications((prev) => [notification, ...prev]);
    return id;
  }, []);
  const dismissNotification = (0, import_react3.useCallback)((id) => {
    if (paymentRequiredIdRef.current === id) {
      paymentRequiredIdRef.current = null;
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);
  const clearAll = (0, import_react3.useCallback)(() => {
    paymentRequiredIdRef.current = null;
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

// packages/react/src/contexts/ext-user-context.tsx
var import_react5 = require("react");
var import_client = require("@aomi-labs/client");
var import_client2 = require("@aomi-labs/client");
var import_jsx_runtime5 = require("react/jsx-runtime");
function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return void 0;
  }
  return value;
}
function mergeRecords(previous, incoming) {
  const next = __spreadValues({}, previous);
  for (const [key, value] of Object.entries(incoming)) {
    const prevRecord = asRecord(next[key]);
    const incomingRecord = asRecord(value);
    if (prevRecord && incomingRecord) {
      next[key] = mergeRecords(prevRecord, incomingRecord);
    } else if (value !== void 0) {
      next[key] = value;
    }
  }
  return next;
}
function dropWalletBlocks(state) {
  var _a;
  return (_a = import_client.UserState.normalize({
    connection: { is_connected: false },
    pending: state.pending,
    ext: state.ext,
    preferences: state.preferences
  })) != null ? _a : { connection: { is_connected: false } };
}
function dropAddressScopedState(state) {
  var _a;
  const evm = asRecord(state.evm);
  const nextEvm = evm ? __spreadValues({}, evm) : void 0;
  if (nextEvm) {
    delete nextEvm.aa;
    delete nextEvm.ens_name;
  }
  const next = __spreadValues({}, state);
  if (nextEvm && Object.keys(nextEvm).length > 0) {
    next.evm = nextEvm;
  } else {
    delete next.evm;
  }
  return (_a = import_client.UserState.normalize(next)) != null ? _a : {};
}
function stableStateString(state) {
  var _a;
  return JSON.stringify((_a = import_client.UserState.normalize(state)) != null ? _a : {});
}
var UserContext = (0, import_react5.createContext)(void 0);
function useUser() {
  const context = (0, import_react5.useContext)(UserContext);
  if (!context) {
    throw new Error("useUser must be used within ExtUserProvider");
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
function ExtUserProvider({ children }) {
  const parent = (0, import_react5.useContext)(UserContext);
  if (parent) {
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_jsx_runtime5.Fragment, { children });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ExtUserProviderImpl, { children });
}
function ExtUserProviderImpl({ children }) {
  const [user, setUserState] = (0, import_react5.useState)({
    connection: { is_connected: false }
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
  const setUser = (0, import_react5.useCallback)(
    (data) => {
      setUserState((prev) => {
        var _a, _b, _c;
        const normalizedData = (_a = import_client.UserState.normalize(data)) != null ? _a : {};
        const merged = (_c = import_client.UserState.normalize(
          mergeRecords(
            (_b = import_client.UserState.normalize(prev)) != null ? _b : {},
            normalizedData
          )
        )) != null ? _c : prev;
        let next;
        if (import_client.UserState.isConnected(normalizedData) === false) {
          next = dropWalletBlocks(merged);
        } else {
          const prevAddress = import_client.UserState.address(prev);
          const nextAddress = import_client.UserState.address(merged);
          const addressChanged = prevAddress !== void 0 && nextAddress !== void 0 && prevAddress.toLowerCase() !== nextAddress.toLowerCase();
          next = addressChanged ? dropAddressScopedState(merged) : merged;
        }
        if (stableStateString(prev) === stableStateString(next)) {
          return prev;
        }
        notifyStateChange(next);
        return next;
      });
    },
    [notifyStateChange]
  );
  const addExtValue = (0, import_react5.useCallback)(
    (key, value) => {
      setUserState((prev) => {
        const next = import_client.UserState.withExt(prev, key, value);
        notifyStateChange(next);
        return next;
      });
    },
    [notifyStateChange]
  );
  const removeExtValue = (0, import_react5.useCallback)(
    (key) => {
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
    },
    [notifyStateChange]
  );
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
var import_client7 = require("@aomi-labs/client");

// packages/react/src/runtime/orchestrator.ts
var import_react6 = require("react");
var import_client5 = require("@aomi-labs/client");

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
  get size() {
    return this.sessions.size;
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
  closeIdleExcept(activeThreadId, onBeforeClose) {
    const closedThreadIds = [];
    for (const [threadId, session] of this.sessions) {
      if (threadId === activeThreadId) continue;
      if (session.getIsProcessing()) continue;
      if (session.getIsPolling()) continue;
      if (session.getPendingRequests().length > 0) continue;
      closedThreadIds.push(threadId);
    }
    for (const threadId of closedThreadIds) {
      onBeforeClose == null ? void 0 : onBeforeClose(threadId);
      this.close(threadId);
    }
    return closedThreadIds;
  }
  closeAll() {
    for (const [threadId, session] of this.sessions) {
      session.close();
    }
    this.sessions.clear();
  }
};

// packages/react/src/runtime/utils.ts
var import_client4 = require("@aomi-labs/client");
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
  if (msg.content && msg.content.trim().length > 0) {
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
  if (content.length === 0 && role === "assistant" && !msg.is_streaming) {
    return null;
  }
  const threadMessage = __spreadValues({
    role,
    content
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
    case 143:
      return "monad";
    case 10143:
      return "monad-testnet";
    case 1337:
    case 31337:
      return "testnet";
    case 59141:
      return "linea-sepolia";
    case 59144:
      return "linea";
    default:
      return "testnet";
  }
};
var formatAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Connect Wallet";
var SUPPORTED_CHAINS = [...import_client4.SUPPORTED_CHAINS];
var getChainInfo = (chainId) => chainId === void 0 ? void 0 : SUPPORTED_CHAINS.find((c) => c.id === chainId);

// packages/react/src/runtime/orchestrator.ts
var toErrorMessage = (error) => error instanceof Error ? error.message : "Message failed to send";
var getHttpStatus = (error) => {
  const status = error == null ? void 0 : error.status;
  if (typeof status === "number") return status;
  const message = toErrorMessage(error);
  const match = /\bHTTP\s+(\d{3})\b/i.exec(message);
  return match ? Number(match[1]) : void 0;
};
var isPaymentRequiredError = (error) => getHttpStatus(error) === 402;
var PAYMENT_REQUIRED_MESSAGE = "You're out of funds, please set up a payment method.";
var buildPaymentRequiredMessage = () => ({
  id: `aomi-payment-required-${Date.now()}`,
  role: "assistant",
  content: [
    {
      type: "text",
      text: PAYMENT_REQUIRED_MESSAGE
    }
  ],
  createdAt: /* @__PURE__ */ new Date(),
  metadata: {
    custom: {
      aomiNoticeKind: "payment_required",
      aomiNoticeTitle: "Credits needed"
    }
  }
});
var previewText = (value, max = 80) => {
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= max) return singleLine;
  return `${singleLine.slice(0, max - 1)}\u2026`;
};
var getOptimisticStatus = (message) => {
  var _a, _b;
  const status = (_b = (_a = message.metadata) == null ? void 0 : _a.custom) == null ? void 0 : _b.aomiSendStatus;
  return status === "sending" || status === "sent" || status === "failed" ? status : void 0;
};
var hasUnhydratedOptimisticMessage = (messages) => messages.some((message) => {
  const status = getOptimisticStatus(message);
  return status === "sending" || status === "sent";
});
var withOptimisticStatus = (message, status, error) => {
  var _a, _b;
  const custom = __spreadProps(__spreadValues({}, (_b = (_a = message.metadata) == null ? void 0 : _a.custom) != null ? _b : {}), {
    aomiSendStatus: status
  });
  if (error) {
    custom.aomiSendError = toErrorMessage(error);
  } else {
    delete custom.aomiSendError;
  }
  return __spreadProps(__spreadValues({}, message), {
    metadata: __spreadProps(__spreadValues({}, message.metadata), {
      custom
    })
  });
};
var updateOptimisticMessage = (threadContext, threadId, messageId, status, error) => {
  const messages = threadContext.getThreadMessages(threadId);
  let changed = false;
  const nextMessages = messages.map((message) => {
    if (message.id !== messageId) return message;
    changed = true;
    return withOptimisticStatus(message, status, error);
  });
  if (changed) {
    threadContext.setThreadMessages(threadId, nextMessages);
  }
};
var appendPaymentRequiredMessage = (threadContext, threadId) => {
  var _a, _b;
  const messages = threadContext.getThreadMessages(threadId);
  let hasPaymentNotice = false;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant") continue;
    hasPaymentNotice = ((_b = (_a = message.metadata) == null ? void 0 : _a.custom) == null ? void 0 : _b.aomiNoticeKind) === "payment_required";
    break;
  }
  if (hasPaymentNotice) return;
  threadContext.setThreadMessages(threadId, [
    ...messages,
    buildPaymentRequiredMessage()
  ]);
};
function useRuntimeOrchestrator(aomiClient, options) {
  const threadContext = useThreadContext();
  const threadContextRef = (0, import_react6.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const aomiClientRef = (0, import_react6.useRef)(aomiClient);
  aomiClientRef.current = aomiClient;
  const optionsRef = (0, import_react6.useRef)(options);
  optionsRef.current = options;
  const [isRunning, setIsRunning] = (0, import_react6.useState)(false);
  const sessionManagerRef = (0, import_react6.useRef)(null);
  if (!sessionManagerRef.current) {
    sessionManagerRef.current = new SessionManager(() => aomiClientRef.current);
  }
  const pendingFetches = (0, import_react6.useRef)(/* @__PURE__ */ new Set());
  const initialStatePromises = (0, import_react6.useRef)(/* @__PURE__ */ new Map());
  const hydratedThreadIds = (0, import_react6.useRef)(/* @__PURE__ */ new Set());
  const listenerCleanups = (0, import_react6.useRef)(/* @__PURE__ */ new Map());
  const cleanupSessionListeners = (0, import_react6.useCallback)((threadId) => {
    var _a;
    (_a = listenerCleanups.current.get(threadId)) == null ? void 0 : _a();
    listenerCleanups.current.delete(threadId);
  }, []);
  const closeSession = (0, import_react6.useCallback)(
    (threadId) => {
      var _a;
      cleanupSessionListeners(threadId);
      pendingFetches.current.delete(threadId);
      initialStatePromises.current.delete(threadId);
      hydratedThreadIds.current.delete(threadId);
      (_a = sessionManagerRef.current) == null ? void 0 : _a.close(threadId);
    },
    [cleanupSessionListeners]
  );
  const closeIdleSessionsExcept = (0, import_react6.useCallback)(
    (activeThreadId) => {
      var _a, _b;
      const closedThreadIds = (_b = (_a = sessionManagerRef.current) == null ? void 0 : _a.closeIdleExcept(
        activeThreadId,
        cleanupSessionListeners
      )) != null ? _b : [];
      for (const threadId of closedThreadIds) {
        pendingFetches.current.delete(threadId);
        initialStatePromises.current.delete(threadId);
        hydratedThreadIds.current.delete(threadId);
      }
      return closedThreadIds;
    },
    [cleanupSessionListeners]
  );
  const closeAllSessions = (0, import_react6.useCallback)(() => {
    var _a;
    pendingFetches.current.clear();
    initialStatePromises.current.clear();
    hydratedThreadIds.current.clear();
    for (const threadId of Array.from(listenerCleanups.current.keys())) {
      cleanupSessionListeners(threadId);
    }
    (_a = sessionManagerRef.current) == null ? void 0 : _a.closeAll();
  }, [cleanupSessionListeners]);
  const getSession = (0, import_react6.useCallback)(
    (threadId) => {
      var _a, _b, _c, _d, _e;
      const manager = sessionManagerRef.current;
      const nextOptions = optionsRef.current;
      const nextApp = nextOptions.getApp();
      const nextPublicKey = (_a = nextOptions.getPublicKey) == null ? void 0 : _a.call(nextOptions);
      const nextApiKey = (_c = (_b = nextOptions.getApiKey) == null ? void 0 : _b.call(nextOptions)) != null ? _c : void 0;
      const nextClientId = (_d = nextOptions.getClientId) == null ? void 0 : _d.call(nextOptions);
      const nextUserState = (_e = nextOptions.getUserState) == null ? void 0 : _e.call(nextOptions);
      const existing = manager.get(threadId);
      if (existing) {
        existing.syncRuntimeOptions({
          app: nextApp,
          publicKey: nextPublicKey,
          apiKey: nextApiKey,
          clientId: nextClientId,
          userState: nextUserState
        });
        existing.setSSEActive(
          threadContextRef.current.currentThreadId === threadId
        );
        return existing;
      }
      const session = manager.getOrCreate(threadId, {
        app: nextApp,
        publicKey: nextPublicKey,
        apiKey: nextApiKey,
        clientId: nextClientId,
        clientType: import_client5.CLIENT_TYPE_WEB_UI,
        syncPendingTxRequestsFromUserState: false,
        userState: nextUserState
      });
      session.setSSEActive(threadContextRef.current.currentThreadId === threadId);
      const cleanups = [];
      cleanups.push(
        session.on("messages", (msgs) => {
          const threadMessages = [];
          for (const msg of msgs) {
            const converted = toInboundMessage(msg);
            if (converted) threadMessages.push(converted);
          }
          const existingMessages = threadContextRef.current.getThreadMessages(threadId);
          if (threadMessages.length === 0 && hasUnhydratedOptimisticMessage(existingMessages)) {
            return;
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
            var _a2, _b2;
            return (_b2 = (_a2 = optionsRef.current).onPendingRequestsChange) == null ? void 0 : _b2.call(_a2, requests);
          }
        )
      );
      cleanups.push(
        session.on("title_changed", ({ title }) => {
          threadContextRef.current.updateThreadMetadata(threadId, { title });
        })
      );
      const forwardEvent = (type) => session.on(
        type,
        (payload) => {
          var _a2, _b2;
          (_b2 = (_a2 = optionsRef.current).onEvent) == null ? void 0 : _b2.call(_a2, {
            type,
            payload,
            sessionId: threadId
          });
        }
      );
      cleanups.push(forwardEvent("tool_update"));
      cleanups.push(forwardEvent("tool_complete"));
      cleanups.push(forwardEvent("system_notice"));
      cleanups.push(forwardEvent("system_error"));
      cleanups.push(forwardEvent("async_callback"));
      cleanups.push(forwardEvent("user_state_request"));
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
      var _a, _b, _c;
      const existingPromise = initialStatePromises.current.get(threadId);
      if (existingPromise) {
        return existingPromise;
      }
      const cachedMessages = threadContextRef.current.getThreadMessages(threadId);
      const existingSession = (_a = sessionManagerRef.current) == null ? void 0 : _a.get(threadId);
      if (existingSession && (hydratedThreadIds.current.has(threadId) || cachedMessages.length > 0)) {
        (_c = (_b = optionsRef.current).onPendingRequestsChange) == null ? void 0 : _c.call(
          _b,
          existingSession.getPendingRequests()
        );
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(existingSession.getIsProcessing());
        }
        return;
      }
      const fetchPromise = (async () => {
        var _a2, _b2;
        pendingFetches.current.add(threadId);
        try {
          const session = getSession(threadId);
          await session.fetchCurrentState();
          hydratedThreadIds.current.add(threadId);
          (_b2 = (_a2 = optionsRef.current).onPendingRequestsChange) == null ? void 0 : _b2.call(
            _a2,
            session.getPendingRequests()
          );
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
          initialStatePromises.current.delete(threadId);
        }
      })();
      initialStatePromises.current.set(threadId, fetchPromise);
      return fetchPromise;
    },
    [getSession]
  );
  const sendMessage = (0, import_react6.useCallback)(
    async (text, threadId) => {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      console.debug("[aomi][runtime] sendMessage start", {
        threadId,
        messagePreview: previewText(text)
      });
      const existingMessages = threadContextRef.current.getThreadMessages(threadId);
      const optimisticMessageId = String(existingMessages.length);
      const userMessage = {
        id: optimisticMessageId,
        role: "user",
        content: [{ type: "text", text }],
        createdAt: /* @__PURE__ */ new Date(),
        metadata: {
          custom: {
            aomiOriginalText: text,
            aomiSendStatus: "sending"
          }
        }
      };
      threadContextRef.current.setThreadMessages(threadId, [
        ...existingMessages,
        userMessage
      ]);
      threadContextRef.current.updateThreadMetadata(threadId, {
        lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (threadContextRef.current.currentThreadId === threadId) {
        setIsRunning(true);
      }
      try {
        console.debug("[aomi][runtime] sendMessage preparing thread", {
          threadId
        });
        await ((_b = (_a = optionsRef.current).prepareThreadForSend) == null ? void 0 : _b.call(_a, threadId));
        console.debug("[aomi][runtime] sendMessage prepare complete", {
          threadId
        });
        const session = getSession(threadId);
        console.debug("[aomi][runtime] sendMessage session ready", {
          threadId,
          sessionId: session.sessionId
        });
        await session.sendAsync(text);
        console.debug("[aomi][runtime] sendMessage sendAsync complete", {
          threadId,
          sessionId: session.sessionId,
          isProcessing: session.getIsProcessing(),
          pendingRequestCount: session.getPendingRequests().length
        });
        (_d = (_c = optionsRef.current).onSendSuccess) == null ? void 0 : _d.call(_c, threadId);
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(session.getIsProcessing());
        }
        updateOptimisticMessage(
          threadContextRef.current,
          threadId,
          optimisticMessageId,
          "sent"
        );
        (_f = (_e = optionsRef.current).onPendingRequestsChange) == null ? void 0 : _f.call(
          _e,
          session.getPendingRequests()
        );
      } catch (error) {
        console.error("[aomi][runtime] sendMessage failed", {
          threadId,
          messagePreview: previewText(text),
          error
        });
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(false);
        }
        updateOptimisticMessage(
          threadContextRef.current,
          threadId,
          optimisticMessageId,
          "failed",
          error
        );
        if (isPaymentRequiredError(error)) {
          appendPaymentRequiredMessage(threadContextRef.current, threadId);
        }
        await ((_h = (_g = optionsRef.current).onSendError) == null ? void 0 : _h.call(_g, threadId, error));
        throw error;
      }
    },
    [getSession]
  );
  const cancelGeneration = (0, import_react6.useCallback)(async (threadId) => {
    var _a;
    const session = (_a = sessionManagerRef.current) == null ? void 0 : _a.get(threadId);
    if (session) {
      await session.interrupt();
    }
  }, []);
  (0, import_react6.useEffect)(() => {
    var _a;
    (_a = sessionManagerRef.current) == null ? void 0 : _a.forEach((session, threadId) => {
      session.setSSEActive(threadId === threadContext.currentThreadId);
    });
  }, [threadContext.currentThreadId]);
  (0, import_react6.useEffect)(() => {
    return () => {
      closeAllSessions();
    };
  }, [closeAllSessions]);
  return {
    sessionManager: sessionManagerRef.current,
    getSession,
    isRunning,
    setIsRunning,
    ensureInitialState,
    sendMessage,
    cancelGeneration,
    closeSession,
    closeAllSessions,
    closeIdleSessionsExcept,
    aomiClientRef
  };
}

// packages/react/src/runtime/threadlist-adapter.ts
var sortByLastActiveDesc = ([, metaA], [, metaB]) => {
  const tsA = parseTimestamp(metaA.lastActiveAt);
  const tsB = parseTimestamp(metaB.lastActiveAt);
  return tsB - tsA;
};
function buildThreadLists(threadMetadata, shouldShowThread) {
  const entries = Array.from(threadMetadata.entries()).filter(
    ([threadId, meta]) => !isPlaceholderTitle(meta.title) && shouldShowThread(threadId)
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
  setIsRunning,
  isLoading = false,
  getInitialControl = initThreadControl,
  isRemoteThread = () => true
}) {
  const shouldShowThread = (threadId) => {
    if (isRemoteThread(threadId)) return true;
    return threadContext.getThreadMessages(threadId).some((message) => message.role === "user");
  };
  const { regularThreads, archivedThreads } = buildThreadLists(
    threadContext.allThreadsMetadata,
    shouldShowThread
  );
  const cleanupEmptyLocalThread = () => {
    const prevId = threadContext.currentThreadId;
    if (isRemoteThread(prevId)) return;
    const msgs = threadContext.getThreadMessages(prevId);
    if (msgs.length > 0) return;
    threadContext.setThreadMetadata((prev) => {
      const next = new Map(prev);
      next.delete(prevId);
      return next;
    });
    threadContext.setThreads((prev) => {
      const next = new Map(prev);
      next.delete(prevId);
      return next;
    });
  };
  return {
    threadId: threadContext.currentThreadId,
    isLoading,
    threads: regularThreads,
    archivedThreads,
    onSwitchToNewThread: () => {
      cleanupEmptyLocalThread();
      const threadId = generateUUID();
      threadContext.setThreadMetadata(
        (prev) => new Map(prev).set(threadId, {
          title: "New Chat",
          status: "regular",
          lastActiveAt: (/* @__PURE__ */ new Date()).toISOString(),
          control: getInitialControl()
        })
      );
      threadContext.setThreadMessages(threadId, []);
      threadContext.setCurrentThreadId(threadId);
      setIsRunning(false);
      threadContext.bumpThreadViewKey();
    },
    onSwitchToThread: (threadId) => {
      cleanupEmptyLocalThread();
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
                control: getInitialControl()
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
function useOptionalAomiRuntime() {
  return (0, import_react7.useContext)(AomiRuntimeContext);
}

// packages/react/src/handlers/wallet-handler.ts
var import_react8 = require("react");
function useWalletHandler({
  getSession
}) {
  const [pendingRequests, setPendingRequests] = (0, import_react8.useState)([]);
  const [hasBlockingWalletRequests, setHasBlockingWalletRequests] = (0, import_react8.useState)(false);
  const requestsRef = (0, import_react8.useRef)(pendingRequests);
  const inFlightRequestSetRef = (0, import_react8.useRef)(/* @__PURE__ */ new Set());
  const suppressedRequestSetRef = (0, import_react8.useRef)(/* @__PURE__ */ new Set());
  const syncVisibleRequests = (0, import_react8.useCallback)(() => {
    setPendingRequests(
      requestsRef.current.filter(
        (request) => !suppressedRequestSetRef.current.has(request.id)
      )
    );
    setHasBlockingWalletRequests(
      requestsRef.current.length > 0 || inFlightRequestSetRef.current.size > 0
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
    hasBlockingWalletRequests,
    setRequests,
    startRequest,
    resolveRequest,
    rejectRequest
  };
}

// packages/react/src/runtime/user-state-provider.tsx
var import_react9 = require("react");
var import_client6 = require("@aomi-labs/client");
var import_jsx_runtime6 = require("react/jsx-runtime");
var THREAD_PREFETCH_LIMIT = 5;
var PREFETCH_IDLE_TIMEOUT_MS = 1500;
function scheduleBackgroundTask(task) {
  const runtimeGlobal = globalThis;
  if (typeof runtimeGlobal.requestIdleCallback === "function") {
    const idleId = runtimeGlobal.requestIdleCallback(task, {
      timeout: PREFETCH_IDLE_TIMEOUT_MS
    });
    return () => {
      var _a;
      return (_a = runtimeGlobal.cancelIdleCallback) == null ? void 0 : _a.call(runtimeGlobal, idleId);
    };
  }
  const timeoutId = runtimeGlobal.setTimeout(task, 0);
  return () => runtimeGlobal.clearTimeout(timeoutId);
}
function stableStateString2(state) {
  return JSON.stringify(state != null ? state : {});
}
function normalizeWalletId(value) {
  if (!value) {
    return void 0;
  }
  return value.startsWith("0x") ? value.toLowerCase() : value;
}
function getConnectedWalletId(userState) {
  var _a;
  return (_a = import_client6.UserState.address(userState)) != null ? _a : import_client6.UserState.svmAddress(userState);
}
function useWalletStateSync(context, sessions, remoteThreads) {
  const { getUserState, onUserStateChange, threadContextRef } = context;
  const { aomiClientRef } = sessions;
  const { remoteThreadIdsRef } = remoteThreads;
  const walletSnapshot = (0, import_react9.useCallback)(
    (nextUser) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r;
      return {
        connection: {
          is_connected: (_a = import_client6.UserState.isConnected(nextUser)) != null ? _a : false,
          primary_family: (_b = nextUser.connection) == null ? void 0 : _b.primary_family,
          provider: (_c = import_client6.UserState.walletProvider(nextUser)) != null ? _c : void 0,
          wallet_provider_subject: (_d = import_client6.UserState.walletProviderSubject(nextUser)) != null ? _d : void 0,
          auth_method: (_e = import_client6.UserState.authMethod(nextUser)) != null ? _e : void 0,
          auth_value: (_f = import_client6.UserState.authValue(nextUser)) != null ? _f : void 0,
          auth_verified_at: (_g = import_client6.UserState.authVerifiedAt(nextUser)) != null ? _g : void 0
        },
        evm: {
          address: import_client6.UserState.address(nextUser),
          chain_id: import_client6.UserState.chainId(nextUser),
          ens_name: typeof ((_h = nextUser.evm) == null ? void 0 : _h.ens_name) === "string" ? nextUser.evm.ens_name : void 0,
          aa: {
            mode: (_i = import_client6.UserState.aaMode(nextUser)) != null ? _i : void 0,
            smart_account: (_j = import_client6.UserState.SmartAccount4337(nextUser)) != null ? _j : void 0,
            delegation_7702: (_k = import_client6.UserState.Delegation7702(nextUser)) != null ? _k : void 0
          },
          sponsorship: {
            sponsored: (_l = import_client6.UserState.sponsored(nextUser)) != null ? _l : void 0,
            sponsor_provider: (_m = import_client6.UserState.sponsorProvider(nextUser)) != null ? _m : void 0,
            sponsor_account: (_n = import_client6.UserState.sponsorAccount(nextUser)) != null ? _n : void 0
          }
        },
        svm: {
          address: import_client6.UserState.svmAddress(nextUser),
          cluster: (_o = nextUser.svm) == null ? void 0 : _o.cluster,
          wallet_name: (_p = nextUser.svm) == null ? void 0 : _p.wallet_name,
          transport: (_q = nextUser.svm) == null ? void 0 : _q.transport,
          capabilities: (_r = nextUser.svm) == null ? void 0 : _r.capabilities
        }
      };
    },
    [getUserState]
  );
  const lastWalletStateRef = (0, import_react9.useRef)(walletSnapshot(getUserState()));
  (0, import_react9.useEffect)(() => {
    lastWalletStateRef.current = walletSnapshot(getUserState());
    const unsubscribe = onUserStateChange(async (newUser) => {
      var _a, _b;
      const nextWalletState = walletSnapshot(newUser);
      const prevWalletState = lastWalletStateRef.current;
      const previousAddress = normalizeWalletId((_a = prevWalletState.evm) == null ? void 0 : _a.address);
      const nextAddress = normalizeWalletId((_b = nextWalletState.evm) == null ? void 0 : _b.address);
      if (stableStateString2(prevWalletState) === stableStateString2(nextWalletState)) {
        return;
      }
      lastWalletStateRef.current = nextWalletState;
      if (previousAddress !== void 0 && nextAddress !== void 0 && previousAddress !== nextAddress) {
        return;
      }
      const sessionId = threadContextRef.current.currentThreadId;
      if (!remoteThreadIdsRef.current.has(sessionId)) {
        return;
      }
      const message = JSON.stringify({
        type: "wallet:state_changed",
        payload: nextWalletState
      });
      await aomiClientRef.current.sendSystemMessage(sessionId, message);
    });
    return unsubscribe;
  }, [
    aomiClientRef,
    getUserState,
    onUserStateChange,
    remoteThreadIdsRef,
    threadContextRef,
    walletSnapshot
  ]);
}
function useUserStateRequestResponder(context, sessions) {
  const eventContext = useEventContext();
  const { getUserState, threadContextRef } = context;
  const { getSession } = sessions;
  (0, import_react9.useEffect)(() => {
    const unsubscribe = eventContext.subscribe("user_state_request", () => {
      var _a, _b;
      const sessionId = threadContextRef.current.currentThreadId;
      const session = getSession(sessionId);
      const payload = (_b = (_a = import_client6.UserState.reconcile(session.getUserState(), getUserState())) != null ? _a : session.getUserState()) != null ? _b : getUserState();
      eventContext.sendOutboundSystem({
        type: "user_state_response",
        sessionId,
        payload
      });
    });
    return unsubscribe;
  }, [eventContext, getSession, getUserState, threadContextRef]);
}
function useRemoteThreadListSync(context, sessions, remoteThreads) {
  const [isThreadListLoading, setIsThreadListLoading] = (0, import_react9.useState)(true);
  const prefetchCancelRef = (0, import_react9.useRef)(null);
  const lastConnectedAddressRef = (0, import_react9.useRef)(void 0);
  const {
    getControlState,
    threadContextRef,
    user
  } = context;
  const {
    aomiClientRef,
    closeAllSessions,
    ensureInitialState,
    sessionManager,
    setIsThreadLoading
  } = sessions;
  const {
    remoteThreadIdsRef,
    warmPromisesRef,
    warmedThreadIdsRef,
    warmThread
  } = remoteThreads;
  const connectedAddress = import_client6.UserState.isConnected(user) ? getConnectedWalletId(user) : void 0;
  const scheduleThreadPrefetch = (0, import_react9.useCallback)(
    (threadIds) => {
      var _a;
      (_a = prefetchCancelRef.current) == null ? void 0 : _a.call(prefetchCancelRef);
      const prefetchThreadIds = Array.from(new Set(threadIds)).filter((threadId) => remoteThreadIdsRef.current.has(threadId)).slice(0, THREAD_PREFETCH_LIMIT);
      if (prefetchThreadIds.length === 0) {
        prefetchCancelRef.current = null;
        return;
      }
      let cancelled = false;
      const cancelScheduledTask = scheduleBackgroundTask(() => {
        void Promise.all(
          prefetchThreadIds.map(async (threadId) => {
            if (cancelled || !remoteThreadIdsRef.current.has(threadId)) return;
            if (threadContextRef.current.getThreadMessages(threadId).length > 0) {
              return;
            }
            try {
              await warmThread(threadId);
              if (cancelled || !remoteThreadIdsRef.current.has(threadId)) {
                return;
              }
              await ensureInitialState(threadId);
            } catch (error) {
              console.debug("Failed to prefetch thread:", threadId, error);
            }
          })
        );
      });
      prefetchCancelRef.current = () => {
        cancelled = true;
        cancelScheduledTask();
      };
    },
    [ensureInitialState, remoteThreadIdsRef, threadContextRef, warmThread]
  );
  (0, import_react9.useEffect)(() => {
    var _a, _b;
    const userAddress = connectedAddress;
    const normalizedUserAddress = normalizeWalletId(userAddress);
    const previousAddress = lastConnectedAddressRef.current;
    const walletChanged = previousAddress !== void 0 && normalizedUserAddress !== void 0 && previousAddress !== normalizedUserAddress;
    if (!userAddress) {
      const wasPreviouslyConnected = lastConnectedAddressRef.current !== void 0;
      lastConnectedAddressRef.current = void 0;
      setIsThreadListLoading(false);
      (_a = prefetchCancelRef.current) == null ? void 0 : _a.call(prefetchCancelRef);
      prefetchCancelRef.current = null;
      if (wasPreviouslyConnected) {
        const hadRemoteThreads = remoteThreadIdsRef.current.size > 0;
        const hadSessions = sessionManager.size > 0;
        remoteThreadIdsRef.current.clear();
        warmedThreadIdsRef.current.clear();
        warmPromisesRef.current.clear();
        closeAllSessions();
        if (hadRemoteThreads || hadSessions) {
          threadContextRef.current.resetToDefault();
        }
      }
      return;
    }
    lastConnectedAddressRef.current = normalizedUserAddress;
    const resetThreadId = walletChanged ? threadContextRef.current.resetToDefault() : void 0;
    if (walletChanged) {
      (_b = prefetchCancelRef.current) == null ? void 0 : _b.call(prefetchCancelRef);
      prefetchCancelRef.current = null;
      remoteThreadIdsRef.current.clear();
      warmedThreadIdsRef.current.clear();
      warmPromisesRef.current.clear();
      closeAllSessions();
    }
    let cancelled = false;
    setIsThreadListLoading(true);
    const fetchThreadList = async () => {
      var _a2, _b2, _c;
      try {
        const remoteThreadIdsAtFetchStart = new Set(remoteThreadIdsRef.current);
        const currentContext = threadContextRef.current;
        const controlSessionId = getControlSessionId(
          getControlState().clientId,
          resetThreadId != null ? resetThreadId : currentContext.currentThreadId
        );
        await aomiClientRef.current.ensureAccount(controlSessionId, userAddress);
        const threadList = await aomiClientRef.current.listThreads(
          controlSessionId,
          userAddress
        );
        if (cancelled) return;
        const remoteThreadIds = /* @__PURE__ */ new Set();
        const newMetadata = resetThreadId !== void 0 ? new Map(
          (() => {
            const resetMetadata = threadContextRef.current.getThreadMetadata(resetThreadId);
            return resetMetadata ? [[resetThreadId, resetMetadata]] : [];
          })()
        ) : new Map(currentContext.allThreadsMetadata);
        const baseThreadCount = resetThreadId !== void 0 ? 1 : currentContext.threadCnt;
        let maxChatNum = baseThreadCount;
        for (const thread of threadList) {
          remoteThreadIds.add(thread.session_id);
          const rawTitle = (_a2 = thread.title) != null ? _a2 : "";
          const title = isPlaceholderTitle(rawTitle) ? "" : rawTitle;
          const lastActive = ((_b2 = newMetadata.get(thread.session_id)) == null ? void 0 : _b2.lastActiveAt) || (/* @__PURE__ */ new Date()).toISOString();
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
        for (const threadId of remoteThreadIdsRef.current) {
          if (!remoteThreadIdsAtFetchStart.has(threadId)) {
            remoteThreadIds.add(threadId);
          }
        }
        remoteThreadIdsRef.current = remoteThreadIds;
        warmedThreadIdsRef.current = new Set(
          Array.from(warmedThreadIdsRef.current).filter(
            (threadId) => remoteThreadIds.has(threadId)
          )
        );
        currentContext.setThreadMetadata(newMetadata);
        if (maxChatNum > baseThreadCount) {
          currentContext.setThreadCnt(maxChatNum);
        }
        scheduleThreadPrefetch(threadList.map((thread) => thread.session_id));
        const activeThreadId = threadContextRef.current.currentThreadId;
        if (remoteThreadIds.has(activeThreadId)) {
          setIsThreadLoading(true);
          try {
            await warmThread(activeThreadId);
            if (!cancelled) {
              await ensureInitialState(activeThreadId);
            }
          } finally {
            if (!cancelled) {
              setIsThreadLoading(false);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch thread list:", error);
      } finally {
        if (!cancelled) {
          setIsThreadListLoading(false);
        }
      }
    };
    void fetchThreadList();
    return () => {
      var _a2;
      cancelled = true;
      (_a2 = prefetchCancelRef.current) == null ? void 0 : _a2.call(prefetchCancelRef);
      prefetchCancelRef.current = null;
    };
  }, [
    aomiClientRef,
    closeAllSessions,
    ensureInitialState,
    getControlState,
    remoteThreadIdsRef,
    scheduleThreadPrefetch,
    sessionManager,
    setIsThreadLoading,
    threadContextRef,
    connectedAddress,
    warmPromisesRef,
    warmedThreadIdsRef,
    warmThread
  ]);
  return { isThreadListLoading };
}
function useRuntimeUserStateEffects({
  sessions: {
    aomiClientRef,
    sessionManager,
    getSession,
    closeAllSessions,
    ensureInitialState,
    setIsThreadLoading
  },
  remoteThreads
}) {
  const threadContext = useThreadContext();
  const { user, getUserState, onUserStateChange } = useUser();
  const { getControlState } = useControl();
  const threadContextRef = (0, import_react9.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const context = {
    getControlState,
    getUserState,
    onUserStateChange,
    threadContextRef,
    user
  };
  const sessions = {
    aomiClientRef,
    sessionManager,
    getSession,
    closeAllSessions,
    ensureInitialState,
    setIsThreadLoading
  };
  useWalletStateSync(context, sessions, remoteThreads);
  useUserStateRequestResponder(context, sessions);
  return useRemoteThreadListSync(context, sessions, remoteThreads);
}
function RuntimeUserStateProvider({
  children,
  sessionManager,
  getUserState,
  setUser,
  onUserStateChange
}) {
  const lastSerializedStateRef = (0, import_react9.useRef)("");
  (0, import_react9.useEffect)(() => {
    const applyToSessions = (next) => {
      const serialized = stableStateString2(next);
      if (serialized === lastSerializedStateRef.current) {
        return;
      }
      lastSerializedStateRef.current = serialized;
      sessionManager.forEach((session) => {
        session.resolveUserState(next, { skipEmit: true });
      });
    };
    const sessionListeners = [];
    sessionManager.forEach((session) => {
      const handler = (next) => {
        setUser(next);
      };
      session.on("user_state_updated", handler);
      sessionListeners.push(
        () => session.off("user_state_updated", handler)
      );
    });
    applyToSessions(getUserState());
    const unsubscribe = onUserStateChange((next) => {
      applyToSessions(next);
    });
    return () => {
      unsubscribe();
      sessionListeners.forEach((off) => off());
    };
  }, [getUserState, onUserStateChange, sessionManager, setUser]);
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_jsx_runtime6.Fragment, { children });
}

// packages/react/src/runtime/core.tsx
var import_jsx_runtime7 = require("react/jsx-runtime");
function getConnectedWalletId2(userState) {
  var _a;
  return (_a = import_client7.UserState.address(userState)) != null ? _a : import_client7.UserState.svmAddress(userState);
}
function normalizeWalletIdForStorage(value) {
  if (!value) {
    return void 0;
  }
  return value.startsWith("0x") ? value.toLowerCase() : value;
}
var getHttpStatus2 = (error) => {
  const status = error == null ? void 0 : error.status;
  if (typeof status === "number") return status;
  const message = error instanceof Error ? error.message : String(error);
  const match = /\bHTTP\s+(\d{3})\b/i.exec(message);
  return match ? Number(match[1]) : void 0;
};
function AomiRuntimeCore({
  children,
  aomiClient
}) {
  const threadContext = useThreadContext();
  const eventContext = useEventContext();
  const notificationContext = useNotification();
  const { getUserState } = useUser();
  const {
    getControlState,
    getCurrentThreadApp,
    getPreferredThreadControl,
    syncCurrentThreadControl
  } = useControl();
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
    closeSession,
    closeIdleSessionsExcept,
    closeAllSessions,
    aomiClientRef
  } = useRuntimeOrchestrator(aomiClient, {
    getPublicKey: () => import_client7.UserState.isConnected(getUserState()) ? getConnectedWalletId2(getUserState()) : void 0,
    getUserState,
    getApp: getCurrentThreadApp,
    getApiKey: () => getControlState().apiKey,
    getClientId: () => {
      var _a;
      return (_a = getControlState().clientId) != null ? _a : void 0;
    },
    prepareThreadForSend: async (threadId) => {
      await syncCurrentThreadControl();
      const wasCreated = await ensureBackendThread(threadId);
      if (wasCreated) {
        threadsMaterializedForSendRef.current.add(threadId);
      }
    },
    onSendSuccess: (threadId) => {
      const wasRemote = remoteThreadIdsRef.current.has(threadId);
      remoteThreadIdsRef.current.add(threadId);
      warmedThreadIdsRef.current.add(threadId);
      threadsMaterializedForSendRef.current.delete(threadId);
      if (!wasRemote && threadContextRef.current.currentThreadId === threadId) {
        void syncCurrentThreadControl().catch((error) => {
          console.error("Failed to sync thread controls:", error);
        });
      }
    },
    onSendError: async (threadId, error) => {
      const wasMaterializedForSend = threadsMaterializedForSendRef.current.has(threadId);
      threadsMaterializedForSendRef.current.delete(threadId);
      const httpStatus = getHttpStatus2(error);
      if (httpStatus === 402) {
        notificationContext.showNotification({
          type: "error",
          kind: "payment_required",
          title: "You're out of funds"
        });
      }
      if (httpStatus !== 402 || !wasMaterializedForSend) {
        return;
      }
      try {
        await aomiClientRef.current.deleteThread(threadId);
        remoteThreadIdsRef.current.delete(threadId);
        warmedThreadIdsRef.current.delete(threadId);
      } catch (deleteError) {
        console.error("Failed to delete quota-blocked thread:", deleteError);
      }
    },
    onPendingRequestsChange: walletHandler.setRequests,
    onEvent: (event) => eventContext.dispatch(event)
  });
  sessionManagerRef.current = sessionManager;
  const threadContextRef = (0, import_react10.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const remoteThreadIdsRef = (0, import_react10.useRef)(/* @__PURE__ */ new Set());
  const warmedThreadIdsRef = (0, import_react10.useRef)(/* @__PURE__ */ new Set());
  const warmPromisesRef = (0, import_react10.useRef)(/* @__PURE__ */ new Map());
  const threadsMaterializedForSendRef = (0, import_react10.useRef)(/* @__PURE__ */ new Set());
  const ensuredAccountPublicKeysRef = (0, import_react10.useRef)(/* @__PURE__ */ new Set());
  const [isThreadLoading, setIsThreadLoading] = (0, import_react10.useState)(false);
  const ensureAccountForPublicKey = (0, import_react10.useCallback)(
    async (sessionId, publicKey) => {
      const normalizedPublicKey = normalizeWalletIdForStorage(publicKey);
      if (!normalizedPublicKey) {
        return;
      }
      if (ensuredAccountPublicKeysRef.current.has(normalizedPublicKey)) {
        return;
      }
      await aomiClientRef.current.ensureAccount(sessionId, publicKey);
      ensuredAccountPublicKeysRef.current.add(normalizedPublicKey);
    },
    [aomiClientRef]
  );
  const warmThread = (0, import_react10.useCallback)(
    async (threadId) => {
      if (!remoteThreadIdsRef.current.has(threadId) || warmedThreadIdsRef.current.has(threadId)) {
        return;
      }
      const existingPromise = warmPromisesRef.current.get(threadId);
      if (existingPromise) {
        return existingPromise;
      }
      const warmPromise = (async () => {
        const userState = getUserState();
        if (import_client7.UserState.isConnected(userState)) {
          const publicKey = getConnectedWalletId2(userState);
          if (publicKey) {
            await ensureAccountForPublicKey(threadId, publicKey);
          }
        }
        await aomiClientRef.current.createThread(
          threadId,
          import_client7.UserState.isConnected(userState) ? getConnectedWalletId2(userState) : void 0
        );
        warmedThreadIdsRef.current.add(threadId);
      })();
      warmPromisesRef.current.set(threadId, warmPromise);
      try {
        await warmPromise;
      } finally {
        warmPromisesRef.current.delete(threadId);
      }
    },
    [aomiClientRef, ensureAccountForPublicKey, getUserState]
  );
  const ensureBackendThread = (0, import_react10.useCallback)(
    async (threadId) => {
      if (remoteThreadIdsRef.current.has(threadId)) return false;
      const userState = getUserState();
      if (import_client7.UserState.isConnected(userState)) {
        const publicKey = getConnectedWalletId2(userState);
        if (publicKey) {
          await ensureAccountForPublicKey(threadId, publicKey);
        }
      }
      await aomiClientRef.current.createThread(
        threadId,
        import_client7.UserState.isConnected(userState) ? getConnectedWalletId2(userState) : void 0
      );
      remoteThreadIdsRef.current.add(threadId);
      warmedThreadIdsRef.current.add(threadId);
      return true;
    },
    [aomiClientRef, ensureAccountForPublicKey, getUserState]
  );
  const getRuntimeSession = (0, import_react10.useCallback)(
    (threadId) => {
      var _a, _b;
      return (_b = (_a = sessionManagerRef.current) == null ? void 0 : _a.get(threadId)) != null ? _b : getSession(threadId);
    },
    [getSession]
  );
  const { isThreadListLoading } = useRuntimeUserStateEffects({
    sessions: {
      aomiClientRef,
      sessionManager,
      getSession: getRuntimeSession,
      closeAllSessions,
      ensureInitialState,
      setIsThreadLoading
    },
    remoteThreads: {
      remoteThreadIdsRef,
      warmPromisesRef,
      warmedThreadIdsRef,
      warmThread
    }
  });
  (0, import_react10.useEffect)(() => {
    const threadId = threadContext.currentThreadId;
    closeIdleSessionsExcept(threadId);
    if (!remoteThreadIdsRef.current.has(threadId)) {
      setIsThreadLoading(false);
      return;
    }
    let cancelled = false;
    setIsThreadLoading(true);
    void (async () => {
      try {
        await warmThread(threadId);
        if (!cancelled) {
          await ensureInitialState(threadId);
        }
      } finally {
        if (!cancelled) {
          setIsThreadLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    closeIdleSessionsExcept,
    ensureInitialState,
    threadContext.currentThreadId,
    warmThread
  ]);
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
  const isRemoteThread = (0, import_react10.useCallback)(
    (threadId) => remoteThreadIdsRef.current.has(threadId),
    []
  );
  const threadListAdapter = (0, import_react10.useMemo)(
    () => buildThreadListAdapter({
      aomiClientRef,
      threadContext,
      setIsRunning,
      isLoading: isThreadListLoading,
      getInitialControl: getPreferredThreadControl,
      isRemoteThread
    }),
    [
      aomiClientRef,
      getPreferredThreadControl,
      isRemoteThread,
      isThreadListLoading,
      setIsRunning,
      threadContext,
      threadContext.currentThreadId,
      threadContext.allThreadsMetadata,
      currentMessages
    ]
  );
  (0, import_react10.useEffect)(() => {
    const showToolNotification = (eventType) => (event) => {
      const payload = event.payload;
      const toolName = typeof (payload == null ? void 0 : payload.tool_name) === "string" ? payload.tool_name : void 0;
      if (eventType === "tool_complete" && toolName === "commit_txs") {
        return;
      }
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
    isLoading: isThreadLoading,
    setMessages: (msgs) => threadContext.setThreadMessages(threadContext.currentThreadId, [...msgs]),
    isRunning,
    onNew: async (message) => {
      const text = message.content.filter(
        (part) => part.type === "text"
      ).map((part) => part.text).join("\n");
      if (text) {
        try {
          await orchestratorSendMessage(text, threadContext.currentThreadId);
        } catch (error) {
          console.error("Failed to send message:", error);
        }
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
      closeAllSessions();
    };
  }, [closeAllSessions]);
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
      closeSession(threadId);
      await threadListAdapter.onDelete(threadId);
    },
    [closeSession, threadListAdapter]
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
      hasBlockingWalletRequests: walletHandler.hasBlockingWalletRequests,
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
      setUser: userContext.setUser,
      onUserStateChange: userContext.onUserStateChange,
      children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_react11.AssistantRuntimeProvider, { runtime, children })
    }
  ) });
}

// packages/react/src/runtime/aomi-runtime.tsx
var import_jsx_runtime8 = require("react/jsx-runtime");
function normalizeBackendUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
      return parsed.toString().replace(/\/$/, "");
    }
  } catch (e) {
  }
  return url;
}
function AomiRuntimeProvider({
  children,
  backendUrl = "http://127.0.0.1:8080",
  clientOptions
}) {
  const resolvedClientOptions = (0, import_react12.useMemo)(
    () => __spreadValues({
      logger: {
        debug: (...args) => console.debug(...args)
      }
    }, clientOptions),
    [clientOptions]
  );
  const aomiClient = (0, import_react12.useMemo)(
    () => new import_client8.AomiClient(__spreadValues({
      baseUrl: normalizeBackendUrl(backendUrl)
    }, resolvedClientOptions)),
    [backendUrl, resolvedClientOptions]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ThreadContextProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(NotificationContextProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ExtUserProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(AomiRuntimeInner, { aomiClient, children }) }) }) });
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
      publicKey: import_client8.UserState.isConnected(user) ? (_a = import_client8.UserState.address(user)) != null ? _a : import_client8.UserState.svmAddress(user) : void 0,
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
  AomiRuntimeApiProvider,
  AomiRuntimeProvider,
  ControlContextProvider,
  DISABLED_PROVIDER_STATE,
  EventContextProvider,
  ExtUserProvider,
  MAX_AUTO_FEE_WEI,
  NotificationContextProvider,
  RuntimeUserStateProvider,
  SUPPORTED_CHAINS,
  ThreadContextProvider,
  UserState,
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
  resolveAutoModel,
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
  useOptionalAomiRuntime,
  useThreadContext,
  useUser,
  useWalletHandler
});
//# sourceMappingURL=index.cjs.map