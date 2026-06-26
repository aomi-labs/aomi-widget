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
  AomiClient: () => import_client8.AomiClient,
  AomiRuntimeApiProvider: () => AomiRuntimeApiProvider,
  AomiRuntimeProvider: () => AomiRuntimeProvider,
  ControlContextProvider: () => ControlContextProvider,
  DISABLED_PROVIDER_STATE: () => import_client9.DISABLED_PROVIDER_STATE,
  EventContextProvider: () => EventContextProvider,
  ExtUserProvider: () => ExtUserProvider,
  MAX_AUTO_FEE_WEI: () => import_client9.MAX_AUTO_FEE_WEI,
  NotificationContextProvider: () => NotificationContextProvider,
  RuntimeUserStateProvider: () => RuntimeUserStateProvider,
  SUPPORTED_CHAINS: () => SUPPORTED_CHAINS,
  ThreadContextProvider: () => ThreadContextProvider,
  UserState: () => import_client2.UserState,
  aaModeFromExecutionKind: () => import_client9.aaModeFromExecutionKind,
  appendFeeCallToPayload: () => import_client9.appendFeeCallToPayload,
  buildFeeAAWalletCall: () => import_client9.buildFeeAAWalletCall,
  cn: () => cn,
  executeWalletCalls: () => import_client9.executeWalletCalls,
  formatAddress: () => formatAddress,
  getChainInfo: () => getChainInfo,
  getNetworkName: () => getNetworkName,
  hydrateTxPayloadFromUserState: () => import_client9.hydrateTxPayloadFromUserState,
  initThreadControl: () => initThreadControl,
  normalizeSimulatedFee: () => import_client9.normalizeSimulatedFee,
  parseChainId: () => import_client9.parseChainId,
  resolveAutoModel: () => resolveAutoModel,
  toAAWalletCall: () => import_client9.toAAWalletCall,
  toAAWalletCalls: () => import_client9.toAAWalletCalls,
  toViemSignMessageArgs: () => import_client9.toViemSignMessageArgs,
  toViemSignTypedDataArgs: () => import_client9.toViemSignTypedDataArgs,
  useAomiRuntime: () => useAomiRuntime,
  useApiKey: () => useApiKey,
  useAuthEndpoints: () => useAuthEndpoints,
  useByok: () => useByok,
  useControl: () => useControl,
  useCurrentThreadMessages: () => useCurrentThreadMessages,
  useCurrentThreadMetadata: () => useCurrentThreadMetadata,
  useEventContext: () => useEventContext,
  useNotification: () => useNotification,
  useNotificationHandler: () => useNotificationHandler,
  useOptionalAomiRuntime: () => useOptionalAomiRuntime,
  usePerThreadControl: () => usePerThreadControl,
  useThreadContext: () => useThreadContext,
  useUser: () => useUser,
  useWalletHandler: () => useWalletHandler
});
module.exports = __toCommonJS(index_exports);
var import_client8 = require("@aomi-labs/client");
var import_client9 = require("@aomi-labs/client");

// packages/react/src/runtime/aomi-runtime.tsx
var import_react16 = require("react");
var import_client7 = require("@aomi-labs/client");

// packages/react/src/contexts/control-context.tsx
var import_react5 = require("react");

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

// packages/react/src/control/api-key.ts
var import_react = require("react");
var API_KEY_STORAGE_KEY = "aomi_secret_key";
function useApiKeyImpl() {
  const [apiKey, setApiKeyInternal] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    var _a;
    try {
      const stored = (_a = globalThis.localStorage) == null ? void 0 : _a.getItem(API_KEY_STORAGE_KEY);
      if (stored) setApiKeyInternal(stored);
    } catch (e) {
    }
  }, []);
  (0, import_react.useEffect)(() => {
    var _a, _b;
    try {
      if (apiKey) {
        (_a = globalThis.localStorage) == null ? void 0 : _a.setItem(API_KEY_STORAGE_KEY, apiKey);
      } else {
        (_b = globalThis.localStorage) == null ? void 0 : _b.removeItem(API_KEY_STORAGE_KEY);
      }
    } catch (e) {
    }
  }, [apiKey]);
  const setApiKey = (0, import_react.useCallback)((next) => {
    setApiKeyInternal(next === "" ? null : next);
  }, []);
  return {
    state: { apiKey },
    actions: { setApiKey }
  };
}

// packages/react/src/control/byok.ts
var import_react2 = require("react");
var BYOK_KEYS_STORAGE_KEY = "aomi_byok_keys";
var BYOK_SECRET_PREFIX = "PROVIDER_KEY:";
function useByokImpl({
  aomiClientRef,
  clientIdRef,
  getControlSessionId: getControlSessionId2
}) {
  const [byokKeys, setByokKeys] = (0, import_react2.useState)({});
  (0, import_react2.useEffect)(() => {
    var _a;
    try {
      const raw = (_a = globalThis.localStorage) == null ? void 0 : _a.getItem(BYOK_KEYS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setByokKeys(parsed);
      }
    } catch (e) {
    }
  }, []);
  (0, import_react2.useEffect)(() => {
    var _a, _b;
    try {
      if (Object.keys(byokKeys).length > 0) {
        (_a = globalThis.localStorage) == null ? void 0 : _a.setItem(
          BYOK_KEYS_STORAGE_KEY,
          JSON.stringify(byokKeys)
        );
      } else {
        (_b = globalThis.localStorage) == null ? void 0 : _b.removeItem(BYOK_KEYS_STORAGE_KEY);
      }
    } catch (e) {
    }
  }, [byokKeys]);
  (0, import_react2.useEffect)(() => {
    const clientId = clientIdRef.current;
    if (!clientId) return;
    if (Object.keys(byokKeys).length === 0) return;
    const secrets = {};
    for (const [provider, entry] of Object.entries(byokKeys)) {
      secrets[`${BYOK_SECRET_PREFIX}${provider}`] = entry.apiKey;
    }
    void aomiClientRef.current.ingestSecrets(getControlSessionId2(), clientId, secrets).catch((err) => {
      console.error("Failed to auto-ingest BYOK keys:", err);
    });
  }, [aomiClientRef, byokKeys, getControlSessionId2]);
  const ingestSecrets = (0, import_react2.useCallback)(
    async (secrets, app) => {
      const clientId = clientIdRef.current;
      if (!clientId) throw new Error("clientId not initialized");
      const { handles } = await aomiClientRef.current.ingestSecrets(
        getControlSessionId2(),
        clientId,
        secrets,
        app
      );
      return handles;
    },
    [aomiClientRef, clientIdRef, getControlSessionId2]
  );
  const clearSecrets = (0, import_react2.useCallback)(
    async (app) => {
      var _a, _b;
      const clientId = clientIdRef.current;
      if (!clientId) return;
      await ((_b = (_a = aomiClientRef.current).clearSecrets) == null ? void 0 : _b.call(
        _a,
        getControlSessionId2(),
        clientId,
        app
      ));
    },
    [aomiClientRef, clientIdRef, getControlSessionId2]
  );
  const deleteSecret = (0, import_react2.useCallback)(
    async (name, app) => {
      const clientId = clientIdRef.current;
      if (!clientId) return;
      await aomiClientRef.current.deleteSecret(
        getControlSessionId2(),
        clientId,
        name,
        app
      );
    },
    [aomiClientRef, clientIdRef, getControlSessionId2]
  );
  const listSecrets = (0, import_react2.useCallback)(async () => {
    var _a;
    const { by_app } = await aomiClientRef.current.listSecrets(
      getControlSessionId2(),
      (_a = clientIdRef.current) != null ? _a : void 0
    );
    return by_app;
  }, [aomiClientRef, clientIdRef, getControlSessionId2]);
  const setByok = (0, import_react2.useCallback)(
    async (provider, apiKey, label) => {
      const trimmed = apiKey.trim();
      if (!trimmed) return;
      const entry = {
        apiKey: trimmed,
        keyPrefix: trimmed.slice(0, 7),
        label
      };
      setByokKeys((prev) => __spreadProps(__spreadValues({}, prev), { [provider]: entry }));
      const clientId = clientIdRef.current;
      if (clientId) {
        try {
          await aomiClientRef.current.ingestSecrets(
            getControlSessionId2(),
            clientId,
            { [`${BYOK_SECRET_PREFIX}${provider}`]: trimmed }
          );
        } catch (err) {
          console.error("Failed to ingest BYOK key:", err);
        }
      }
    },
    [aomiClientRef, clientIdRef, getControlSessionId2]
  );
  const removeByok = (0, import_react2.useCallback)(
    async (provider) => {
      const clientId = clientIdRef.current;
      if (clientId) {
        await aomiClientRef.current.deleteSecret(
          getControlSessionId2(),
          clientId,
          `${BYOK_SECRET_PREFIX}${provider}`
        );
      }
      setByokKeys((prev) => {
        const _a = prev, { [provider]: _ } = _a, rest = __objRest(_a, [__restKey(provider)]);
        return rest;
      });
    },
    [aomiClientRef, clientIdRef, getControlSessionId2]
  );
  const getByokKeys = (0, import_react2.useCallback)(
    () => byokKeys,
    [byokKeys]
  );
  const hasByok = (0, import_react2.useCallback)(
    (provider) => {
      if (provider) return provider in byokKeys;
      return Object.keys(byokKeys).length > 0;
    },
    [byokKeys]
  );
  return {
    state: { byokKeys },
    actions: {
      setByok,
      removeByok,
      getByokKeys,
      hasByok,
      ingestSecrets,
      clearSecrets,
      deleteSecret,
      listSecrets
    }
  };
}

// packages/react/src/control/auth-endpoints.ts
var import_react3 = require("react");

// packages/react/src/utils/model-selection.ts
var PREFERRED_DEFAULT_MODEL_PATTERNS = [
  /^claude.*opus.*4[.-]?8/i,
  /^claude.*4[.-]?8.*opus/i,
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

// packages/react/src/control/auth-endpoints.ts
function getDefaultApp(apps) {
  var _a;
  return apps.includes("default") ? "default" : (_a = apps[0]) != null ? _a : null;
}
function namesFromDescriptors(apps) {
  return apps.map((a) => a.name);
}
function useAuthEndpointsImpl({
  aomiClientRef,
  apiKeyRef,
  getControlSessionId: getControlSessionId2,
  apiKey
}) {
  const [availableModels, setAvailableModels] = (0, import_react3.useState)([]);
  const [defaultModel, setDefaultModel] = (0, import_react3.useState)(null);
  const [authorizedApps, setAuthorizedApps] = (0, import_react3.useState)([]);
  const [appDescriptors, setAppDescriptors] = (0, import_react3.useState)([]);
  const [defaultApp, setDefaultApp] = (0, import_react3.useState)(null);
  (0, import_react3.useEffect)(() => {
    const fetchApps = async () => {
      var _a;
      try {
        const descriptors = await aomiClientRef.current.getApps(
          getControlSessionId2(),
          {
            apiKey: (_a = apiKeyRef.current) != null ? _a : void 0
          }
        );
        const names = namesFromDescriptors(descriptors);
        setAuthorizedApps(names);
        setAppDescriptors(descriptors);
        setDefaultApp(getDefaultApp(names));
      } catch (error) {
        console.error("Failed to fetch apps:", error);
        setAuthorizedApps(["default"]);
        setAppDescriptors([{ name: "default" }]);
        setDefaultApp("default");
      }
    };
    void fetchApps();
  }, [aomiClientRef, getControlSessionId2, apiKey]);
  (0, import_react3.useEffect)(() => {
    const fetchModels = async () => {
      try {
        const models = await aomiClientRef.current.getModels(
          getControlSessionId2()
        );
        setAvailableModels(models);
        setDefaultModel(resolveAutoModel(models));
      } catch (error) {
        console.error("Failed to fetch models:", error);
      }
    };
    void fetchModels();
  }, [aomiClientRef, getControlSessionId2]);
  const getAvailableModels = (0, import_react3.useCallback)(async () => {
    try {
      const models = await aomiClientRef.current.getModels(
        getControlSessionId2()
      );
      setAvailableModels(models);
      setDefaultModel(resolveAutoModel(models));
      return models;
    } catch (error) {
      console.error("Failed to fetch models:", error);
      return [];
    }
  }, [aomiClientRef, getControlSessionId2]);
  const getAuthorizedApps = (0, import_react3.useCallback)(async () => {
    var _a;
    try {
      const descriptors = await aomiClientRef.current.getApps(
        getControlSessionId2(),
        {
          apiKey: (_a = apiKeyRef.current) != null ? _a : void 0
        }
      );
      const names = namesFromDescriptors(descriptors);
      setAuthorizedApps(names);
      setAppDescriptors(descriptors);
      setDefaultApp(getDefaultApp(names));
      return names;
    } catch (error) {
      console.error("Failed to fetch apps:", error);
      setAuthorizedApps(["default"]);
      setAppDescriptors([{ name: "default" }]);
      setDefaultApp("default");
      return ["default"];
    }
  }, [aomiClientRef, apiKeyRef, getControlSessionId2]);
  return {
    state: {
      availableModels,
      defaultModel,
      authorizedApps,
      appDescriptors,
      defaultApp
    },
    actions: { getAvailableModels, getAuthorizedApps }
  };
}

// packages/react/src/control/per-thread-control.ts
var import_react4 = require("react");

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

// packages/react/src/control/per-thread-control.ts
var MODEL_SELECTION_STORAGE_KEY = "aomi_model_selection";
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
  if (app && authorizedApps.includes(app)) return app;
  return defaultApp;
}
function usePerThreadControlImpl({
  aomiClientRef,
  sessionIdRef,
  apiKeyRef,
  clientIdRef,
  getThreadMetadataRef,
  updateThreadMetadataRef,
  availableModels,
  defaultModel,
  availableModelsRef,
  defaultModelRef,
  authorizedAppsRef,
  defaultAppRef,
  sessionId
}) {
  var _a, _b;
  const currentMeta = getThreadMetadataRef.current(sessionId);
  const isProcessing = (_b = (_a = currentMeta == null ? void 0 : currentMeta.control) == null ? void 0 : _a.isProcessing) != null ? _b : false;
  const getCurrentThreadControl = (0, import_react4.useCallback)(() => {
    var _a2;
    const metadata = getThreadMetadataRef.current(sessionIdRef.current);
    return (_a2 = metadata == null ? void 0 : metadata.control) != null ? _a2 : initThreadControl();
  }, []);
  const getPreferredThreadControl = (0, import_react4.useCallback)(() => {
    const preference = readStoredModelPreference();
    const selection = resolvePreferredModelSelection(
      preference,
      availableModelsRef.current,
      defaultModelRef.current
    );
    return __spreadProps(__spreadValues({}, initThreadControl()), {
      model: selection.model,
      modelMode: selection.mode,
      controlDirty: selection.model !== null
    });
  }, []);
  const getCurrentThreadApp = (0, import_react4.useCallback)(() => {
    var _a2, _b2, _c;
    const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(sessionIdRef.current)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
    return (_c = resolveAuthorizedApp(
      currentControl.app,
      authorizedAppsRef.current,
      defaultAppRef.current
    )) != null ? _c : "default";
  }, []);
  const onModelSelect = (0, import_react4.useCallback)(
    async (model, options) => {
      var _a2, _b2, _c, _d, _e, _f, _g, _h;
      const threadId = sessionIdRef.current;
      const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(threadId)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
      if (currentControl.isProcessing) {
        console.warn(
          "[per-thread-control] Cannot switch model while processing"
        );
        return;
      }
      const modelMode = (_c = options == null ? void 0 : options.mode) != null ? _c : "manual";
      const app = (_d = resolveAuthorizedApp(
        currentControl.app,
        authorizedAppsRef.current,
        defaultAppRef.current
      )) != null ? _d : "default";
      updateThreadMetadataRef.current(threadId, {
        control: __spreadProps(__spreadValues({}, currentControl), {
          model,
          modelMode,
          app,
          controlDirty: true
        })
      });
      try {
        await aomiClientRef.current.setModel(threadId, model, {
          app,
          apiKey: (_e = apiKeyRef.current) != null ? _e : void 0,
          clientId: (_f = clientIdRef.current) != null ? _f : void 0
        });
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
        console.error("[per-thread-control] setModel failed:", err);
        throw err;
      }
    },
    []
  );
  const onAppSelect = (0, import_react4.useCallback)((app) => {
    var _a2, _b2;
    const threadId = sessionIdRef.current;
    const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(threadId)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
    if (currentControl.isProcessing) {
      console.warn("[per-thread-control] Cannot switch app while processing");
      return;
    }
    if (authorizedAppsRef.current.length > 0 && !authorizedAppsRef.current.includes(app)) {
      console.warn("[per-thread-control] Cannot select unauthorized app", {
        app
      });
      return;
    }
    updateThreadMetadataRef.current(threadId, {
      control: __spreadProps(__spreadValues({}, currentControl), {
        app,
        controlDirty: true
      })
    });
  }, []);
  const markControlSynced = (0, import_react4.useCallback)(() => {
    var _a2, _b2;
    const threadId = sessionIdRef.current;
    const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(threadId)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
    if (currentControl.controlDirty) {
      updateThreadMetadataRef.current(threadId, {
        control: __spreadProps(__spreadValues({}, currentControl), { controlDirty: false })
      });
    }
  }, []);
  const syncCurrentThreadControl = (0, import_react4.useCallback)(async () => {
    var _a2, _b2, _c, _d, _e, _f, _g;
    const threadId = sessionIdRef.current;
    const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(threadId)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
    if (!currentControl.controlDirty || currentControl.isProcessing || !currentControl.model) {
      return;
    }
    const app = (_c = resolveAuthorizedApp(
      currentControl.app,
      authorizedAppsRef.current,
      defaultAppRef.current
    )) != null ? _c : "default";
    await aomiClientRef.current.setModel(threadId, currentControl.model, {
      app,
      apiKey: (_d = apiKeyRef.current) != null ? _d : void 0,
      clientId: (_e = clientIdRef.current) != null ? _e : void 0
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
  (0, import_react4.useEffect)(() => {
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
    } else if (availableModels.length > 0) {
      const currentMode = (_a2 = currentControl.modelMode) != null ? _a2 : "manual";
      if (currentMode === "auto") {
        const autoModel = getFallbackModel(availableModels, defaultModel);
        if (autoModel && currentControl.model !== autoModel) {
          nextControl = __spreadProps(__spreadValues({}, currentControl), {
            model: autoModel,
            modelMode: "auto",
            controlDirty: true
          });
        }
      } else if (!availableModels.includes(currentControl.model)) {
        const fallbackModel = getFallbackModel(availableModels, defaultModel);
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
    updateThreadMetadataRef.current(threadId, { control: nextControl });
  }, [getPreferredThreadControl, sessionId, availableModels, defaultModel]);
  return {
    actions: {
      getCurrentThreadControl,
      getCurrentThreadApp,
      getPreferredThreadControl,
      onModelSelect,
      onAppSelect,
      markControlSynced,
      syncCurrentThreadControl
    },
    isProcessing
  };
}

// packages/react/src/contexts/control-context.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var ControlContext = (0, import_react5.createContext)(null);
function useControl() {
  const ctx = (0, import_react5.useContext)(ControlContext);
  if (!ctx) {
    throw new Error("useControl must be used within ControlContextProvider");
  }
  return ctx;
}
function useApiKey() {
  const ctx = useControl();
  return {
    state: { apiKey: ctx.state.apiKey, clientId: ctx.state.clientId },
    actions: { setApiKey: ctx.setApiKey }
  };
}
function useByok() {
  const ctx = useControl();
  return {
    state: { byokKeys: ctx.state.byokKeys },
    actions: {
      setByok: ctx.setByok,
      removeByok: ctx.removeByok,
      getByokKeys: ctx.getByokKeys,
      hasByok: ctx.hasByok,
      ingestSecrets: ctx.ingestSecrets,
      clearSecrets: ctx.clearSecrets,
      deleteSecret: ctx.deleteSecret,
      listSecrets: ctx.listSecrets
    }
  };
}
function useAuthEndpoints() {
  const ctx = useControl();
  return {
    state: {
      availableModels: ctx.state.availableModels,
      defaultModel: ctx.state.defaultModel,
      authorizedApps: ctx.state.authorizedApps,
      appDescriptors: ctx.state.appDescriptors,
      defaultApp: ctx.state.defaultApp
    },
    actions: {
      getAvailableModels: ctx.getAvailableModels,
      getAuthorizedApps: ctx.getAuthorizedApps
    }
  };
}
function usePerThreadControl() {
  const ctx = useControl();
  return {
    isProcessing: ctx.isProcessing,
    actions: {
      getCurrentThreadControl: ctx.getCurrentThreadControl,
      getCurrentThreadApp: ctx.getCurrentThreadApp,
      getPreferredThreadControl: ctx.getPreferredThreadControl,
      onModelSelect: ctx.onModelSelect,
      onAppSelect: ctx.onAppSelect,
      markControlSynced: ctx.markControlSynced,
      syncCurrentThreadControl: ctx.syncCurrentThreadControl
    }
  };
}
function ControlContextProvider({
  children,
  aomiClient,
  sessionId,
  getThreadMetadata,
  updateThreadMetadata
}) {
  const aomiClientRef = (0, import_react5.useRef)(aomiClient);
  aomiClientRef.current = aomiClient;
  const sessionIdRef = (0, import_react5.useRef)(sessionId);
  sessionIdRef.current = sessionId;
  const getThreadMetadataRef = (0, import_react5.useRef)(getThreadMetadata);
  getThreadMetadataRef.current = getThreadMetadata;
  const updateThreadMetadataRef = (0, import_react5.useRef)(updateThreadMetadata);
  updateThreadMetadataRef.current = updateThreadMetadata;
  const clientIdRef = (0, import_react5.useRef)(null);
  if (clientIdRef.current === null) {
    clientIdRef.current = getOrCreateClientId();
  }
  (0, import_react5.useEffect)(() => {
    var _a;
    try {
      if (clientIdRef.current) {
        (_a = globalThis.localStorage) == null ? void 0 : _a.setItem(
          CLIENT_ID_STORAGE_KEY,
          clientIdRef.current
        );
      }
    } catch (e) {
    }
  }, []);
  const apiKey = useApiKeyImpl();
  const apiKeyRef = (0, import_react5.useRef)(apiKey.state.apiKey);
  apiKeyRef.current = apiKey.state.apiKey;
  const getCurrentControlSessionId = (0, import_react5.useCallback)(
    () => getControlSessionId(clientIdRef.current, sessionIdRef.current),
    []
  );
  const byok = useByokImpl({
    aomiClientRef,
    clientIdRef,
    getControlSessionId: getCurrentControlSessionId
  });
  const authEndpoints = useAuthEndpointsImpl({
    aomiClientRef,
    apiKeyRef,
    getControlSessionId: getCurrentControlSessionId,
    apiKey: apiKey.state.apiKey
  });
  const availableModelsRef = (0, import_react5.useRef)(authEndpoints.state.availableModels);
  availableModelsRef.current = authEndpoints.state.availableModels;
  const defaultModelRef = (0, import_react5.useRef)(authEndpoints.state.defaultModel);
  defaultModelRef.current = authEndpoints.state.defaultModel;
  const authorizedAppsRef = (0, import_react5.useRef)(authEndpoints.state.authorizedApps);
  authorizedAppsRef.current = authEndpoints.state.authorizedApps;
  const defaultAppRef = (0, import_react5.useRef)(authEndpoints.state.defaultApp);
  defaultAppRef.current = authEndpoints.state.defaultApp;
  const perThread = usePerThreadControlImpl({
    aomiClientRef,
    sessionIdRef,
    apiKeyRef,
    clientIdRef,
    getThreadMetadataRef,
    updateThreadMetadataRef,
    availableModels: authEndpoints.state.availableModels,
    defaultModel: authEndpoints.state.defaultModel,
    availableModelsRef,
    defaultModelRef,
    authorizedAppsRef,
    defaultAppRef,
    sessionId
  });
  const aggregateState = {
    apiKey: apiKey.state.apiKey,
    clientId: clientIdRef.current,
    byokKeys: byok.state.byokKeys,
    availableModels: authEndpoints.state.availableModels,
    defaultModel: authEndpoints.state.defaultModel,
    authorizedApps: authEndpoints.state.authorizedApps,
    appDescriptors: authEndpoints.state.appDescriptors,
    defaultApp: authEndpoints.state.defaultApp
  };
  const aggregateStateRef = (0, import_react5.useRef)(aggregateState);
  aggregateStateRef.current = aggregateState;
  const getControlState = (0, import_react5.useCallback)(() => aggregateStateRef.current, []);
  const api = __spreadValues(__spreadValues(__spreadValues(__spreadValues({
    state: aggregateState,
    isProcessing: perThread.isProcessing,
    getControlState
  }, apiKey.actions), byok.actions), authEndpoints.actions), perThread.actions);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ControlContext.Provider, { value: api, children });
}

// packages/react/src/contexts/event-context.tsx
var import_react6 = require("react");
var import_jsx_runtime2 = require("react/jsx-runtime");
var EventContextState = (0, import_react6.createContext)(null);
function useEventContext() {
  const context = (0, import_react6.useContext)(EventContextState);
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
  const { getCurrentThreadApp } = useControl();
  const subscribersRef = (0, import_react6.useRef)(/* @__PURE__ */ new Map());
  const subscribe = (0, import_react6.useCallback)(
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
  const dispatchEvent = (0, import_react6.useCallback)((event) => {
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
  const sendOutbound = (0, import_react6.useCallback)(
    async (event) => {
      try {
        const message = JSON.stringify({
          type: event.type,
          payload: event.payload
        });
        await aomiClient.sendSystemMessage(event.sessionId, message, {
          app: getCurrentThreadApp()
        });
      } catch (error) {
        console.error("Failed to send outbound event:", error);
      }
    },
    [aomiClient, getCurrentThreadApp]
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
var import_react7 = require("react");
var import_jsx_runtime3 = require("react/jsx-runtime");
var NotificationContext = (0, import_react7.createContext)(null);
function useNotification() {
  const context = (0, import_react7.useContext)(NotificationContext);
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
  const [notifications, setNotifications] = (0, import_react7.useState)([]);
  const paymentRequiredIdRef = (0, import_react7.useRef)(null);
  const showNotification = (0, import_react7.useCallback)((params) => {
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
  const dismissNotification = (0, import_react7.useCallback)((id) => {
    if (paymentRequiredIdRef.current === id) {
      paymentRequiredIdRef.current = null;
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);
  const clearAll = (0, import_react7.useCallback)(() => {
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
var import_react8 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
var ThreadContextState = (0, import_react8.createContext)(null);
function useThreadContext() {
  const context = (0, import_react8.useContext)(ThreadContextState);
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
  const storeRef = (0, import_react8.useRef)(null);
  if (!storeRef.current) {
    storeRef.current = new ThreadStore({ initialThreadId });
  }
  const store = storeRef.current;
  const value = (0, import_react8.useSyncExternalStore)(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ThreadContextState.Provider, { value, children });
}
function useCurrentThreadMessages() {
  const { currentThreadId, getThreadMessages } = useThreadContext();
  return (0, import_react8.useMemo)(
    () => getThreadMessages(currentThreadId),
    [currentThreadId, getThreadMessages]
  );
}
function useCurrentThreadMetadata() {
  const { currentThreadId, getThreadMetadata } = useThreadContext();
  return (0, import_react8.useMemo)(
    () => getThreadMetadata(currentThreadId),
    [currentThreadId, getThreadMetadata]
  );
}

// packages/react/src/contexts/ext-user-context.tsx
var import_react9 = require("react");
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
var UserContext = (0, import_react9.createContext)(void 0);
function useUser() {
  const context = (0, import_react9.useContext)(UserContext);
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
  const parent = (0, import_react9.useContext)(UserContext);
  if (parent) {
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_jsx_runtime5.Fragment, { children });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ExtUserProviderImpl, { children });
}
function ExtUserProviderImpl({ children }) {
  const [user, setUserState] = (0, import_react9.useState)({
    connection: { is_connected: false }
  });
  const userRef = (0, import_react9.useRef)(user);
  userRef.current = user;
  const StateChangeCallbacks = (0, import_react9.useRef)(
    /* @__PURE__ */ new Set()
  );
  const notifyStateChange = (0, import_react9.useCallback)((next) => {
    queueMicrotask(() => {
      StateChangeCallbacks.current.forEach((callback) => {
        callback(next);
      });
    });
  }, []);
  const setUser = (0, import_react9.useCallback)(
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
  const addExtValue = (0, import_react9.useCallback)(
    (key, value) => {
      setUserState((prev) => {
        const next = import_client.UserState.withExt(prev, key, value);
        notifyStateChange(next);
        return next;
      });
    },
    [notifyStateChange]
  );
  const removeExtValue = (0, import_react9.useCallback)(
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
  const getUserState = (0, import_react9.useCallback)(() => userRef.current, []);
  const onUserStateChange = (0, import_react9.useCallback)(
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
var import_react14 = require("react");
var import_react15 = require("@assistant-ui/react");

// packages/react/src/runtime/orchestrator.ts
var import_react10 = require("react");
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

// packages/react/src/runtime/thread-registry.ts
var ThreadRegistry = class {
  constructor(clientFactory) {
    /** Threads the backend already knows about (from /threads list or createThread). */
    this.remoteThreads = /* @__PURE__ */ new Set();
    /** Threads whose initial state has been fetched at least once this session. */
    this.hydratedThreads = /* @__PURE__ */ new Set();
    /** Threads where the backend record was created specifically to receive a send. */
    this.materializedForSend = /* @__PURE__ */ new Set();
    /** Active in-flight initial-state fetches, keyed by thread id (for dedup). */
    this.initialStatePromises = /* @__PURE__ */ new Map();
    /** Currently-pending fetches (subset of above, kept separately for diagnostics). */
    this.pendingFetches = /* @__PURE__ */ new Set();
    this.listenerCleanups = /* @__PURE__ */ new Map();
    this.sessionManager = new SessionManager(clientFactory);
  }
  // ===========================================================================
  // Listener cleanup wiring (used by orchestrator when binding session events)
  // ===========================================================================
  setListenerCleanup(threadId, cleanup) {
    var _a;
    (_a = this.listenerCleanups.get(threadId)) == null ? void 0 : _a();
    this.listenerCleanups.set(threadId, cleanup);
  }
  runAndDropListeners(threadId) {
    var _a;
    (_a = this.listenerCleanups.get(threadId)) == null ? void 0 : _a();
    this.listenerCleanups.delete(threadId);
  }
  // ===========================================================================
  // Per-thread teardown
  // ===========================================================================
  /**
   * Close a single thread's session and drop its session-scoped bookkeeping.
   * Keeps `remoteThreads` and `materializedForSend` (structural facts about the
   * thread itself, unaffected by whether a Session instance is alive).
   */
  closeSession(threadId) {
    this.runAndDropListeners(threadId);
    this.hydratedThreads.delete(threadId);
    this.initialStatePromises.delete(threadId);
    this.pendingFetches.delete(threadId);
    this.sessionManager.close(threadId);
  }
  /**
   * Forget every record for a thread (delete-thread flow). Closes the session
   * and also wipes structural facts. After this the registry behaves as though
   * the thread never existed.
   */
  forget(threadId) {
    this.closeSession(threadId);
    this.remoteThreads.delete(threadId);
    this.materializedForSend.delete(threadId);
  }
  // ===========================================================================
  // Multi-thread sweeps
  // ===========================================================================
  /**
   * Close every session that isn't the active one AND isn't busy (processing,
   * polling, or holding pending wallet requests). Returns ids closed so callers
   * can react if they need to.
   */
  closeIdleSessionsExcept(activeThreadId) {
    const closed = this.sessionManager.closeIdleExcept(
      activeThreadId,
      (id) => this.runAndDropListeners(id)
    );
    for (const id of closed) {
      this.hydratedThreads.delete(id);
      this.initialStatePromises.delete(id);
      this.pendingFetches.delete(id);
    }
    return closed;
  }
  /**
   * Close every session and drop all session-scoped state. Used on unmount.
   * Structural facts (remoteThreads, materializedForSend) are preserved so a
   * remount can reuse what the user already had.
   */
  closeAllSessions() {
    this.hydratedThreads.clear();
    this.initialStatePromises.clear();
    this.pendingFetches.clear();
    for (const cleanup of this.listenerCleanups.values()) cleanup();
    this.listenerCleanups.clear();
    this.sessionManager.closeAll();
  }
  // ===========================================================================
  // Full reset
  // ===========================================================================
  /**
   * Wipe everything. Used when the user disconnects every wallet — we no
   * longer have a stable identity to bind threads to.
   */
  reset() {
    this.remoteThreads.clear();
    this.materializedForSend.clear();
    this.closeAllSessions();
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
  const threadContextRef = (0, import_react10.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const aomiClientRef = (0, import_react10.useRef)(aomiClient);
  aomiClientRef.current = aomiClient;
  const optionsRef = (0, import_react10.useRef)(options);
  optionsRef.current = options;
  const [isRunning, setIsRunning] = (0, import_react10.useState)(false);
  const registryRef = (0, import_react10.useRef)(null);
  if (!registryRef.current) {
    registryRef.current = new ThreadRegistry(() => aomiClientRef.current);
  }
  const registry = registryRef.current;
  const closeSession = (0, import_react10.useCallback)(
    (threadId) => {
      registry.closeSession(threadId);
    },
    [registry]
  );
  const closeIdleSessionsExcept = (0, import_react10.useCallback)(
    (activeThreadId) => registry.closeIdleSessionsExcept(activeThreadId),
    [registry]
  );
  const closeAllSessions = (0, import_react10.useCallback)(() => {
    registry.closeAllSessions();
  }, [registry]);
  const getSession = (0, import_react10.useCallback)(
    (threadId) => {
      var _a, _b, _c, _d;
      const manager = registry.sessionManager;
      const nextOptions = optionsRef.current;
      const nextApp = nextOptions.getApp();
      const nextApiKey = (_b = (_a = nextOptions.getApiKey) == null ? void 0 : _a.call(nextOptions)) != null ? _b : void 0;
      const nextClientId = (_c = nextOptions.getClientId) == null ? void 0 : _c.call(nextOptions);
      const nextUserState = (_d = nextOptions.getUserState) == null ? void 0 : _d.call(nextOptions);
      const existing = manager.get(threadId);
      if (existing) {
        existing.syncRuntimeOptions({
          app: nextApp,
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
        apiKey: nextApiKey,
        clientId: nextClientId,
        clientType: import_client5.CLIENT_TYPE_WEB_UI,
        syncPendingTxRequestsFromUserState: false,
        userState: nextUserState
      });
      session.setSSEActive(
        threadContextRef.current.currentThreadId === threadId
      );
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
      registry.setListenerCleanup(threadId, () => {
        for (const cleanup of cleanups) cleanup();
      });
      return session;
    },
    // Stable deps — registry instance is stable for the lifetime of the hook
    [registry]
  );
  const ensureInitialState = (0, import_react10.useCallback)(
    async (threadId) => {
      var _a, _b, _c, _d;
      const existingPromise = registry.initialStatePromises.get(threadId);
      if (existingPromise) {
        return existingPromise;
      }
      const cachedMessages = threadContextRef.current.getThreadMessages(threadId);
      const hasCachedMessages = cachedMessages.length > 0;
      const isHydrated = registry.hydratedThreads.has(threadId);
      if (hasCachedMessages || isHydrated) {
        const session = registry.sessionManager.get(threadId);
        if (session) {
          (_b = (_a = optionsRef.current).onPendingRequestsChange) == null ? void 0 : _b.call(
            _a,
            session.getPendingRequests()
          );
          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(session.getIsProcessing());
          }
        } else {
          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(false);
          }
          (_d = (_c = optionsRef.current).onPendingRequestsChange) == null ? void 0 : _d.call(_c, []);
        }
        return;
      }
      const fetchPromise = (async () => {
        var _a2, _b2;
        registry.pendingFetches.add(threadId);
        try {
          const session = getSession(threadId);
          await session.fetchCurrentState();
          registry.hydratedThreads.add(threadId);
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
          registry.pendingFetches.delete(threadId);
          registry.initialStatePromises.delete(threadId);
        }
      })();
      registry.initialStatePromises.set(threadId, fetchPromise);
      return fetchPromise;
    },
    [getSession]
  );
  const sendMessage = (0, import_react10.useCallback)(
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
  const cancelGeneration = (0, import_react10.useCallback)(
    async (threadId) => {
      const session = registry.sessionManager.get(threadId);
      if (session) {
        await session.interrupt();
      }
    },
    [registry]
  );
  (0, import_react10.useEffect)(() => {
    registry.sessionManager.forEach((session, threadId) => {
      session.setSSEActive(threadId === threadContext.currentThreadId);
    });
  }, [registry, threadContext.currentThreadId]);
  (0, import_react10.useEffect)(() => {
    return () => {
      closeAllSessions();
    };
  }, [closeAllSessions]);
  return {
    registry,
    sessionManager: registry.sessionManager,
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
var import_react11 = require("react");
var AomiRuntimeContext = (0, import_react11.createContext)(null);
var AomiRuntimeApiProvider = AomiRuntimeContext.Provider;
function useAomiRuntime() {
  const context = (0, import_react11.useContext)(AomiRuntimeContext);
  if (!context) {
    throw new Error(
      "useAomiRuntime must be used within AomiRuntimeProvider. Wrap your app with <AomiRuntimeProvider>...</AomiRuntimeProvider>"
    );
  }
  return context;
}
function useOptionalAomiRuntime() {
  return (0, import_react11.useContext)(AomiRuntimeContext);
}

// packages/react/src/handlers/wallet-handler.ts
var import_react12 = require("react");
function useWalletHandler({
  getSession
}) {
  const [pendingRequests, setPendingRequests] = (0, import_react12.useState)([]);
  const [hasBlockingWalletRequests, setHasBlockingWalletRequests] = (0, import_react12.useState)(false);
  const requestsRef = (0, import_react12.useRef)(pendingRequests);
  const inFlightRequestSetRef = (0, import_react12.useRef)(/* @__PURE__ */ new Set());
  const suppressedRequestSetRef = (0, import_react12.useRef)(/* @__PURE__ */ new Set());
  const syncVisibleRequests = (0, import_react12.useCallback)(() => {
    setPendingRequests(
      requestsRef.current.filter(
        (request) => !suppressedRequestSetRef.current.has(request.id)
      )
    );
    setHasBlockingWalletRequests(
      requestsRef.current.length > 0 || inFlightRequestSetRef.current.size > 0
    );
  }, []);
  const setRequests = (0, import_react12.useCallback)(
    (requests) => {
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
    },
    [syncVisibleRequests]
  );
  const startRequest = (0, import_react12.useCallback)(
    (id) => {
      if (!requestsRef.current.some((request) => request.id === id)) {
        return;
      }
      inFlightRequestSetRef.current.add(id);
      suppressedRequestSetRef.current.add(id);
      syncVisibleRequests();
    },
    [syncVisibleRequests]
  );
  const resolveRequest = (0, import_react12.useCallback)(
    async (id, result) => {
      const session = getSession();
      if (!session) {
        console.error(
          "[wallet-handler] No session available to resolve request"
        );
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
  const rejectRequest = (0, import_react12.useCallback)(
    async (id, error) => {
      const session = getSession();
      if (!session) {
        console.error(
          "[wallet-handler] No session available to reject request"
        );
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
var import_react13 = require("react");
var import_client6 = require("@aomi-labs/client");
var import_jsx_runtime6 = require("react/jsx-runtime");
function stableStateString2(state) {
  return JSON.stringify(state != null ? state : {});
}
function normalizeWalletId(value) {
  if (!value) {
    return void 0;
  }
  return value.startsWith("0x") ? value.toLowerCase() : value;
}
function getLegacySessionPublicKey(userState) {
  var _a;
  const address = import_client6.UserState.address(userState);
  if (!(address == null ? void 0 : address.startsWith("0x"))) {
    return void 0;
  }
  if (import_client6.UserState.chainId(userState) === void 0 && !((_a = userState.evm) == null ? void 0 : _a.address)) {
    return void 0;
  }
  return address;
}
function useWalletStateSync(context, aomiClientRef, registry) {
  const {
    getCurrentThreadApp,
    getUserState,
    onUserStateChange,
    threadContextRef
  } = context;
  const walletSnapshot = (0, import_react13.useCallback)(
    (nextUser) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q;
      return {
        connection: {
          is_connected: (_a = import_client6.UserState.isConnected(nextUser)) != null ? _a : false,
          provider: (_b = import_client6.UserState.walletProvider(nextUser)) != null ? _b : void 0,
          wallet_provider_subject: (_c = import_client6.UserState.walletProviderSubject(nextUser)) != null ? _c : void 0,
          auth_method: (_d = import_client6.UserState.authMethod(nextUser)) != null ? _d : void 0,
          auth_value: (_e = import_client6.UserState.authValue(nextUser)) != null ? _e : void 0,
          auth_verified_at: (_f = import_client6.UserState.authVerifiedAt(nextUser)) != null ? _f : void 0
        },
        evm: {
          address: import_client6.UserState.address(nextUser),
          chain_id: import_client6.UserState.chainId(nextUser),
          ens_name: typeof ((_g = nextUser.evm) == null ? void 0 : _g.ens_name) === "string" ? nextUser.evm.ens_name : void 0,
          aa: {
            mode: (_h = import_client6.UserState.aaMode(nextUser)) != null ? _h : void 0,
            smart_account: (_i = import_client6.UserState.SmartAccount4337(nextUser)) != null ? _i : void 0,
            delegation_7702: (_j = import_client6.UserState.Delegation7702(nextUser)) != null ? _j : void 0
          },
          sponsorship: {
            sponsored: (_k = import_client6.UserState.sponsored(nextUser)) != null ? _k : void 0,
            sponsor_provider: (_l = import_client6.UserState.sponsorProvider(nextUser)) != null ? _l : void 0,
            sponsor_account: (_m = import_client6.UserState.sponsorAccount(nextUser)) != null ? _m : void 0
          }
        },
        svm: {
          address: import_client6.UserState.svmAddress(nextUser),
          cluster: (_n = nextUser.svm) == null ? void 0 : _n.cluster,
          wallet_name: (_o = nextUser.svm) == null ? void 0 : _o.wallet_name,
          transport: (_p = nextUser.svm) == null ? void 0 : _p.transport,
          capabilities: (_q = nextUser.svm) == null ? void 0 : _q.capabilities
        }
      };
    },
    [getUserState]
  );
  const lastWalletStateRef = (0, import_react13.useRef)(walletSnapshot(getUserState()));
  (0, import_react13.useEffect)(() => {
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
      if (!registry.remoteThreads.has(sessionId)) {
        return;
      }
      const message = JSON.stringify({
        type: "wallet:state_changed",
        payload: nextWalletState
      });
      await aomiClientRef.current.sendSystemMessage(sessionId, message, {
        app: getCurrentThreadApp()
      });
    });
    return unsubscribe;
  }, [
    aomiClientRef,
    getCurrentThreadApp,
    getUserState,
    onUserStateChange,
    registry,
    threadContextRef,
    walletSnapshot
  ]);
}
function useUserStateRequestResponder(context, getSession) {
  const eventContext = useEventContext();
  const { getUserState, threadContextRef } = context;
  (0, import_react13.useEffect)(() => {
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
function useRemoteThreadListSync(context, options) {
  const [isThreadListLoading, setIsThreadListLoading] = (0, import_react13.useState)(true);
  const prefetchCancelRef = (0, import_react13.useRef)(null);
  const lastConnectedAddressRef = (0, import_react13.useRef)(void 0);
  const { getControlState, getUserState, threadContextRef, user } = context;
  const {
    registry,
    aomiClientRef,
    closeAllSessions,
    ensureInitialState,
    setIsThreadLoading
  } = options;
  const connectedAddress = import_client6.UserState.isConnected(user) ? getLegacySessionPublicKey(user) : void 0;
  const scheduleThreadPrefetch = (0, import_react13.useCallback)((_threadIds) => {
    var _a;
    (_a = prefetchCancelRef.current) == null ? void 0 : _a.call(prefetchCancelRef);
    prefetchCancelRef.current = null;
  }, []);
  (0, import_react13.useEffect)(() => {
    var _a, _b;
    const userAddress = connectedAddress;
    const normalizedUserAddress = normalizeWalletId(userAddress);
    const previousAddress = lastConnectedAddressRef.current;
    const isConnected = import_client6.UserState.isConnected(user) === true;
    const walletChanged = previousAddress !== void 0 && normalizedUserAddress !== void 0 && previousAddress !== normalizedUserAddress;
    if (!userAddress) {
      if (isConnected) {
        lastConnectedAddressRef.current = void 0;
        setIsThreadListLoading(false);
        return;
      }
      const wasPreviouslyConnected = lastConnectedAddressRef.current !== void 0;
      lastConnectedAddressRef.current = void 0;
      setIsThreadListLoading(false);
      (_a = prefetchCancelRef.current) == null ? void 0 : _a.call(prefetchCancelRef);
      prefetchCancelRef.current = null;
      if (wasPreviouslyConnected) {
        const hadRemoteThreads = registry.remoteThreads.size > 0;
        const hadSessions = registry.sessionManager.size > 0;
        registry.reset();
        if (hadRemoteThreads || hadSessions) {
          threadContextRef.current.resetToDefault();
        }
      }
      return;
    }
    lastConnectedAddressRef.current = normalizedUserAddress;
    if (walletChanged) {
      (_b = prefetchCancelRef.current) == null ? void 0 : _b.call(prefetchCancelRef);
      prefetchCancelRef.current = null;
      registry.reset();
    }
    let cancelled = false;
    setIsThreadListLoading(true);
    const fetchThreadList = async () => {
      var _a2, _b2, _c;
      try {
        const remoteThreadIdsAtFetchStart = new Set(registry.remoteThreads);
        const currentContext = threadContextRef.current;
        const controlSessionId = getControlSessionId(
          getControlState().clientId,
          currentContext.currentThreadId
        );
        const threadList = await aomiClientRef.current.listThreads(controlSessionId);
        if (cancelled) return;
        const remoteThreadIds = /* @__PURE__ */ new Set();
        const newMetadata = new Map(currentContext.allThreadsMetadata);
        const baseThreadCount = currentContext.threadCnt;
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
        for (const threadId of registry.remoteThreads) {
          if (!remoteThreadIdsAtFetchStart.has(threadId)) {
            remoteThreadIds.add(threadId);
          }
        }
        registry.remoteThreads.clear();
        for (const id of remoteThreadIds) registry.remoteThreads.add(id);
        currentContext.setThreadMetadata(newMetadata);
        if (maxChatNum > baseThreadCount) {
          currentContext.setThreadCnt(maxChatNum);
        }
        scheduleThreadPrefetch(threadList.map((thread) => thread.session_id));
        const activeThreadId = threadContextRef.current.currentThreadId;
        if (remoteThreadIds.has(activeThreadId)) {
          setIsThreadLoading(true);
          try {
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
    ensureInitialState,
    getControlState,
    registry,
    scheduleThreadPrefetch,
    setIsThreadLoading,
    threadContextRef,
    connectedAddress
  ]);
  return { isThreadListLoading };
}
function useRuntimeUserStateEffects(options) {
  const { registry, aomiClientRef, getSession } = options;
  const threadContext = useThreadContext();
  const { user, getUserState, onUserStateChange } = useUser();
  const { getControlState, getCurrentThreadApp } = useControl();
  const threadContextRef = (0, import_react13.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const context = {
    getControlState,
    getCurrentThreadApp,
    getUserState,
    onUserStateChange,
    threadContextRef,
    user
  };
  useWalletStateSync(context, aomiClientRef, registry);
  useUserStateRequestResponder(context, getSession);
  return useRemoteThreadListSync(context, options);
}
function RuntimeUserStateProvider({
  children,
  registry,
  getUserState,
  setUser,
  onUserStateChange
}) {
  const lastSerializedStateRef = (0, import_react13.useRef)("");
  (0, import_react13.useEffect)(() => {
    const applyToSessions = (next) => {
      const serialized = stableStateString2(next);
      if (serialized === lastSerializedStateRef.current) {
        return;
      }
      lastSerializedStateRef.current = serialized;
      registry.sessionManager.forEach((session) => {
        session.resolveUserState(next, { skipEmit: true });
      });
    };
    const sessionListeners = [];
    registry.sessionManager.forEach((session) => {
      const handler = (next) => {
        setUser(next);
      };
      session.on("user_state_updated", handler);
      sessionListeners.push(() => session.off("user_state_updated", handler));
    });
    applyToSessions(getUserState());
    const unsubscribe = onUserStateChange((next) => {
      applyToSessions(next);
    });
    return () => {
      unsubscribe();
      sessionListeners.forEach((off) => off());
    };
  }, [getUserState, onUserStateChange, registry, setUser]);
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_jsx_runtime6.Fragment, { children });
}

// packages/react/src/runtime/core.tsx
var import_jsx_runtime7 = require("react/jsx-runtime");
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
  const registryRef = (0, import_react14.useRef)(null);
  const walletHandler = useWalletHandler({
    getSession: () => {
      var _a;
      return (_a = registryRef.current) == null ? void 0 : _a.sessionManager.get(threadContext.currentThreadId);
    }
  });
  const {
    registry,
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
        registry.materializedForSend.add(threadId);
      }
    },
    onSendSuccess: (threadId) => {
      const wasRemote = registry.remoteThreads.has(threadId);
      registry.remoteThreads.add(threadId);
      registry.materializedForSend.delete(threadId);
      if (!wasRemote && threadContextRef.current.currentThreadId === threadId) {
        void syncCurrentThreadControl().catch((error) => {
          console.error("Failed to sync thread controls:", error);
        });
      }
    },
    onSendError: async (threadId, error) => {
      const wasMaterializedForSend = registry.materializedForSend.has(threadId);
      registry.materializedForSend.delete(threadId);
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
        registry.remoteThreads.delete(threadId);
      } catch (deleteError) {
        console.error("Failed to delete quota-blocked thread:", deleteError);
      }
    },
    onPendingRequestsChange: walletHandler.setRequests,
    onEvent: (event) => eventContext.dispatch(event)
  });
  registryRef.current = registry;
  const threadContextRef = (0, import_react14.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const [isThreadLoading, setIsThreadLoading] = (0, import_react14.useState)(false);
  const ensureBackendThread = (0, import_react14.useCallback)(
    async (threadId) => {
      if (registry.remoteThreads.has(threadId)) return false;
      await aomiClientRef.current.createThread(threadId);
      registry.remoteThreads.add(threadId);
      return true;
    },
    [aomiClientRef, registry]
  );
  const { isThreadListLoading } = useRuntimeUserStateEffects({
    registry,
    aomiClientRef,
    getSession,
    closeAllSessions,
    ensureInitialState,
    setIsThreadLoading
  });
  (0, import_react14.useEffect)(() => {
    const threadId = threadContext.currentThreadId;
    closeIdleSessionsExcept(threadId);
    if (!registry.remoteThreads.has(threadId)) {
      setIsThreadLoading(false);
      return;
    }
    const hasCachedMessages = threadContext.getThreadMessages(threadId).length > 0;
    let cancelled = false;
    if (!hasCachedMessages) {
      setIsThreadLoading(true);
    }
    void (async () => {
      try {
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
    registry,
    threadContext,
    threadContext.currentThreadId
  ]);
  (0, import_react14.useEffect)(() => {
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
  const isRemoteThread = (0, import_react14.useCallback)(
    (threadId) => registry.remoteThreads.has(threadId),
    [registry]
  );
  const threadListAdapter = (0, import_react14.useMemo)(
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
  (0, import_react14.useEffect)(() => {
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
  (0, import_react14.useEffect)(() => {
    const unsubscribe = eventContext.subscribe("system_notice", (_event) => {
    });
    return unsubscribe;
  }, [eventContext, notificationContext]);
  const runtime = (0, import_react15.useExternalStoreRuntime)({
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
  (0, import_react14.useEffect)(() => {
    return () => {
      closeAllSessions();
    };
  }, [closeAllSessions]);
  const userContext = useUser();
  const sendMessage = (0, import_react14.useCallback)(
    async (text) => {
      await orchestratorSendMessage(text, threadContext.currentThreadId);
    },
    [orchestratorSendMessage, threadContext.currentThreadId]
  );
  const cancelGeneration = (0, import_react14.useCallback)(() => {
    void orchestratorCancel(threadContext.currentThreadId);
  }, [orchestratorCancel, threadContext.currentThreadId]);
  const getMessages = (0, import_react14.useCallback)(
    (threadId) => {
      const id = threadId != null ? threadId : threadContext.currentThreadId;
      return threadContext.getThreadMessages(id);
    },
    [threadContext]
  );
  const createThread = (0, import_react14.useCallback)(async () => {
    await threadListAdapter.onSwitchToNewThread();
    return threadContextRef.current.currentThreadId;
  }, [threadListAdapter]);
  const deleteThread = (0, import_react14.useCallback)(
    async (threadId) => {
      closeSession(threadId);
      await threadListAdapter.onDelete(threadId);
    },
    [closeSession, threadListAdapter]
  );
  const renameThread = (0, import_react14.useCallback)(
    async (threadId, title) => {
      await threadListAdapter.onRename(threadId, title);
    },
    [threadListAdapter]
  );
  const archiveThread = (0, import_react14.useCallback)(
    async (threadId) => {
      await threadListAdapter.onArchive(threadId);
    },
    [threadListAdapter]
  );
  const selectThread = (0, import_react14.useCallback)(
    (threadId) => {
      if (threadContext.allThreadsMetadata.has(threadId)) {
        threadListAdapter.onSwitchToThread(threadId);
      } else {
        void threadListAdapter.onSwitchToNewThread();
      }
    },
    [threadContext.allThreadsMetadata, threadListAdapter]
  );
  const simulateBatchTransactions = (0, import_react14.useCallback)(
    async (transactions, options) => {
      var _a;
      const session = (_a = registry.sessionManager.get(threadContext.currentThreadId)) != null ? _a : getSession(threadContext.currentThreadId);
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
    [getSession, registry, threadContext.currentThreadId]
  );
  const aomiRuntimeApi = (0, import_react14.useMemo)(
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
      registry,
      getUserState: userContext.getUserState,
      setUser: userContext.setUser,
      onUserStateChange: userContext.onUserStateChange,
      children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_react15.AssistantRuntimeProvider, { runtime, children })
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
  const resolvedClientOptions = (0, import_react16.useMemo)(
    () => __spreadValues({
      logger: {
        debug: (...args) => console.debug(...args)
      }
    }, clientOptions),
    [clientOptions]
  );
  const aomiClient = (0, import_react16.useMemo)(
    () => new import_client7.AomiClient(__spreadValues({
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
  const threadContext = useThreadContext();
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
    ControlContextProvider,
    {
      aomiClient,
      sessionId: threadContext.currentThreadId,
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
var import_react17 = require("react");
var notificationIdCounter2 = 0;
function generateNotificationId() {
  return `notif-${Date.now()}-${++notificationIdCounter2}`;
}
function useNotificationHandler({
  onNotification
} = {}) {
  const { subscribe } = useEventContext();
  const [notifications, setNotifications] = (0, import_react17.useState)([]);
  (0, import_react17.useEffect)(() => {
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
  const markHandled = (0, import_react17.useCallback)((id) => {
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
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
  useAomiRuntime,
  useApiKey,
  useAuthEndpoints,
  useByok,
  useControl,
  useCurrentThreadMessages,
  useCurrentThreadMetadata,
  useEventContext,
  useNotification,
  useNotificationHandler,
  useOptionalAomiRuntime,
  usePerThreadControl,
  useThreadContext,
  useUser,
  useWalletHandler
});
//# sourceMappingURL=index.cjs.map