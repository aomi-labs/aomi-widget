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

// src/index.ts
import { AomiClient as AomiClient2 } from "@aomi-labs/client";
import {
  toViemSignTypedDataArgs,
  hydrateTxPayloadFromUserState,
  toAAWalletCalls,
  toAAWalletCall,
  appendFeeCallToPayload,
  buildFeeAAWalletCall,
  normalizeSimulatedFee,
  MAX_AUTO_FEE_WEI,
  executeWalletCalls,
  DISABLED_PROVIDER_STATE,
  parseChainId,
  aaModeFromExecutionKind,
  toViemSignMessageArgs,
  normalizeAppDescriptor,
  appIdentityKey
} from "@aomi-labs/client";

// src/runtime/aomi-runtime.tsx
import { useMemo as useMemo3 } from "react";
import {
  AomiClient
} from "@aomi-labs/client";

// src/contexts/control-context.tsx
import {
  createContext,
  useCallback as useCallback5,
  useContext,
  useEffect as useEffect5,
  useRef
} from "react";

// src/utils/client-session.ts
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

// src/control/api-key.ts
import { useCallback, useEffect, useState } from "react";
var API_KEY_STORAGE_KEY = "aomi_secret_key";
function useApiKeyImpl() {
  const [apiKey, setApiKeyInternal] = useState(null);
  useEffect(() => {
    var _a;
    try {
      const stored = (_a = globalThis.localStorage) == null ? void 0 : _a.getItem(API_KEY_STORAGE_KEY);
      if (stored) setApiKeyInternal(stored);
    } catch (e) {
    }
  }, []);
  useEffect(() => {
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
  const setApiKey = useCallback((next) => {
    setApiKeyInternal(next === "" ? null : next);
  }, []);
  return {
    state: { apiKey },
    actions: { setApiKey }
  };
}

// src/control/byok.ts
import { useCallback as useCallback2, useEffect as useEffect2, useState as useState2 } from "react";
var BYOK_KEYS_STORAGE_KEY = "aomi_byok_keys";
var BYOK_SECRET_PREFIX = "PROVIDER_KEY:";
function useByokImpl({
  aomiClientRef,
  clientIdRef,
  getControlSessionId: getControlSessionId2
}) {
  const [byokKeys, setByokKeys] = useState2({});
  useEffect2(() => {
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
  useEffect2(() => {
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
  useEffect2(() => {
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
  const ingestSecrets = useCallback2(
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
  const clearSecrets = useCallback2(
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
  const deleteSecret = useCallback2(
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
  const listSecrets = useCallback2(async () => {
    var _a;
    const { by_app } = await aomiClientRef.current.listSecrets(
      getControlSessionId2(),
      (_a = clientIdRef.current) != null ? _a : void 0
    );
    return by_app;
  }, [aomiClientRef, clientIdRef, getControlSessionId2]);
  const setByok = useCallback2(
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
  const removeByok = useCallback2(
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
  const getByokKeys = useCallback2(
    () => byokKeys,
    [byokKeys]
  );
  const hasByok = useCallback2(
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

// src/control/auth-endpoints.ts
import { useCallback as useCallback3, useEffect as useEffect3, useState as useState3 } from "react";

// src/utils/model-selection.ts
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

// src/control/auth-endpoints.ts
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
  apiKey,
  appPlatforms
}) {
  const appPlatformsKey = Array.isArray(appPlatforms) ? appPlatforms.join("\0") : appPlatforms != null ? appPlatforms : "";
  const [availableModels, setAvailableModels] = useState3([]);
  const [defaultModel, setDefaultModel] = useState3(null);
  const [authorizedApps, setAuthorizedApps] = useState3([]);
  const [appDescriptors, setAppDescriptors] = useState3([]);
  const [defaultApp, setDefaultApp] = useState3(null);
  useEffect3(() => {
    const fetchApps = async () => {
      var _a;
      try {
        const descriptors = await aomiClientRef.current.getApps(
          getControlSessionId2(),
          {
            apiKey: (_a = apiKeyRef.current) != null ? _a : void 0,
            platforms: appPlatforms
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
  }, [aomiClientRef, getControlSessionId2, apiKey, appPlatformsKey]);
  useEffect3(() => {
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
  const getAvailableModels = useCallback3(async () => {
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
  const getAuthorizedApps = useCallback3(async () => {
    var _a;
    try {
      const descriptors = await aomiClientRef.current.getApps(
        getControlSessionId2(),
        {
          apiKey: (_a = apiKeyRef.current) != null ? _a : void 0,
          platforms: appPlatforms
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
  }, [aomiClientRef, apiKeyRef, getControlSessionId2, appPlatformsKey]);
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

// src/control/per-thread-control.ts
import { useCallback as useCallback4, useEffect as useEffect4 } from "react";

// src/utils/uuid.ts
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

// src/state/thread-store.ts
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
    applicationId: null,
    controlDirty: false,
    isProcessing: false,
    turnPhase: "idle"
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

// src/control/per-thread-control.ts
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
function normalizeApplicationId(value) {
  if (typeof value === "number")
    return Number.isSafeInteger(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
}
function sameApplicationId(left, right) {
  var _a, _b;
  return ((_a = normalizeApplicationId(left)) == null ? void 0 : _a.toString()) === ((_b = normalizeApplicationId(right)) == null ? void 0 : _b.toString());
}
function findAuthorizedDescriptor(app, applicationId, descriptors) {
  var _a, _b;
  const scopedId = normalizeApplicationId(applicationId);
  if (scopedId !== null) {
    return (_a = descriptors.find(
      (descriptor) => descriptor.name === app && sameApplicationId(descriptor.applicationId, scopedId)
    )) != null ? _a : null;
  }
  return (_b = descriptors.find(
    (descriptor) => descriptor.name === app && normalizeApplicationId(descriptor.applicationId) === null
  )) != null ? _b : null;
}
function resolveAuthorizedApp(app, applicationId, authorizedApps, appDescriptors, defaultApp) {
  var _a;
  if (app) {
    const scopedId = normalizeApplicationId(applicationId);
    const exact = findAuthorizedDescriptor(app, applicationId, appDescriptors);
    if (exact) return exact;
    const nameRequiresApplicationId = appDescriptors.some(
      (descriptor) => descriptor.name === app && normalizeApplicationId(descriptor.applicationId) !== null
    );
    if (scopedId === null && !nameRequiresApplicationId && authorizedApps.includes(app)) {
      return { name: app, applicationId: null };
    }
  }
  if (!defaultApp) return null;
  return (_a = findAuthorizedDescriptor(defaultApp, null, appDescriptors)) != null ? _a : {
    name: defaultApp
  };
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
  appDescriptorsRef,
  defaultAppRef,
  sessionId
}) {
  var _a, _b;
  const currentMeta = getThreadMetadataRef.current(sessionId);
  const isProcessing = (_b = (_a = currentMeta == null ? void 0 : currentMeta.control) == null ? void 0 : _a.isProcessing) != null ? _b : false;
  const getCurrentThreadControl = useCallback4(() => {
    var _a2;
    const metadata = getThreadMetadataRef.current(sessionIdRef.current);
    return (_a2 = metadata == null ? void 0 : metadata.control) != null ? _a2 : initThreadControl();
  }, []);
  const getPreferredThreadControl = useCallback4(() => {
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
  const getCurrentThreadApp = useCallback4(() => {
    var _a2, _b2, _c, _d;
    const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(sessionIdRef.current)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
    return (_d = (_c = resolveAuthorizedApp(
      currentControl.app,
      currentControl.applicationId,
      authorizedAppsRef.current,
      appDescriptorsRef.current,
      defaultAppRef.current
    )) == null ? void 0 : _c.name) != null ? _d : "default";
  }, []);
  const getCurrentThreadApplicationId = useCallback4(() => {
    var _a2, _b2, _c, _d;
    const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(sessionIdRef.current)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
    return (_d = (_c = resolveAuthorizedApp(
      currentControl.app,
      currentControl.applicationId,
      authorizedAppsRef.current,
      appDescriptorsRef.current,
      defaultAppRef.current
    )) == null ? void 0 : _c.applicationId) != null ? _d : null;
  }, []);
  const onModelSelect = useCallback4(
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
      const selectedApp = (_d = resolveAuthorizedApp(
        currentControl.app,
        currentControl.applicationId,
        authorizedAppsRef.current,
        appDescriptorsRef.current,
        defaultAppRef.current
      )) != null ? _d : { name: "default" };
      updateThreadMetadataRef.current(threadId, {
        control: __spreadProps(__spreadValues({}, currentControl), {
          model,
          modelMode,
          app: selectedApp.name,
          applicationId: normalizeApplicationId(selectedApp.applicationId),
          controlDirty: true
        })
      });
      try {
        await aomiClientRef.current.setModel(threadId, model, {
          app: selectedApp.name,
          applicationId: normalizeApplicationId(selectedApp.applicationId),
          apiKey: (_e = apiKeyRef.current) != null ? _e : void 0,
          clientId: (_f = clientIdRef.current) != null ? _f : void 0
        });
        writeStoredModelPreference({
          mode: modelMode,
          model: modelMode === "manual" ? model : null
        });
        const latestControl = (_h = (_g = getThreadMetadataRef.current(threadId)) == null ? void 0 : _g.control) != null ? _h : currentControl;
        if (latestControl.model === model && latestControl.app === selectedApp.name && sameApplicationId(
          latestControl.applicationId,
          selectedApp.applicationId
        )) {
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
  const onAppSelect = useCallback4(
    (app, options) => {
      var _a2, _b2, _c, _d, _e, _f;
      const threadId = sessionIdRef.current;
      const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(threadId)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
      if (currentControl.isProcessing) {
        console.warn("[per-thread-control] Cannot switch app while processing");
        return;
      }
      const descriptor = resolveAuthorizedApp(
        app,
        (_c = options == null ? void 0 : options.applicationId) != null ? _c : null,
        authorizedAppsRef.current,
        appDescriptorsRef.current,
        null
      );
      const hasAuthData = authorizedAppsRef.current.length > 0 || appDescriptorsRef.current.length > 0;
      if (hasAuthData && !descriptor) {
        console.warn("[per-thread-control] Cannot select unauthorized app", {
          app
        });
        return;
      }
      updateThreadMetadataRef.current(threadId, {
        control: __spreadProps(__spreadValues({}, currentControl), {
          app: (_d = descriptor == null ? void 0 : descriptor.name) != null ? _d : app,
          applicationId: normalizeApplicationId(
            (_f = (_e = options == null ? void 0 : options.applicationId) != null ? _e : descriptor == null ? void 0 : descriptor.applicationId) != null ? _f : null
          ),
          controlDirty: true
        })
      });
    },
    []
  );
  const markControlSynced = useCallback4(() => {
    var _a2, _b2;
    const threadId = sessionIdRef.current;
    const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(threadId)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
    if (currentControl.controlDirty) {
      updateThreadMetadataRef.current(threadId, {
        control: __spreadProps(__spreadValues({}, currentControl), { controlDirty: false })
      });
    }
  }, []);
  const syncCurrentThreadControl = useCallback4(async (options) => {
    var _a2, _b2, _c, _d, _e, _f, _g;
    const threadId = sessionIdRef.current;
    const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(threadId)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
    if (!currentControl.controlDirty || !(options == null ? void 0 : options.ignoreProcessing) && currentControl.isProcessing || !currentControl.model) {
      return;
    }
    const selectedApp = (_c = resolveAuthorizedApp(
      currentControl.app,
      currentControl.applicationId,
      authorizedAppsRef.current,
      appDescriptorsRef.current,
      defaultAppRef.current
    )) != null ? _c : { name: "default" };
    await aomiClientRef.current.setModel(threadId, currentControl.model, {
      app: selectedApp.name,
      applicationId: normalizeApplicationId(selectedApp.applicationId),
      apiKey: (_d = apiKeyRef.current) != null ? _d : void 0,
      clientId: (_e = clientIdRef.current) != null ? _e : void 0
    });
    const latestControl = (_g = (_f = getThreadMetadataRef.current(threadId)) == null ? void 0 : _f.control) != null ? _g : currentControl;
    if (latestControl.model === currentControl.model && latestControl.app === currentControl.app && sameApplicationId(
      latestControl.applicationId,
      currentControl.applicationId
    )) {
      updateThreadMetadataRef.current(threadId, {
        control: __spreadProps(__spreadValues({}, latestControl), {
          app: selectedApp.name,
          applicationId: normalizeApplicationId(selectedApp.applicationId),
          controlDirty: false
        })
      });
    }
  }, []);
  useEffect4(() => {
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
      getCurrentThreadApplicationId,
      getPreferredThreadControl,
      onModelSelect,
      onAppSelect,
      markControlSynced,
      syncCurrentThreadControl
    },
    isProcessing
  };
}

// src/contexts/control-context.tsx
import { jsx } from "react/jsx-runtime";
var ControlContext = createContext(null);
function useControl() {
  const ctx = useContext(ControlContext);
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
      getCurrentThreadApplicationId: ctx.getCurrentThreadApplicationId,
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
  updateThreadMetadata,
  appPlatforms
}) {
  const aomiClientRef = useRef(aomiClient);
  aomiClientRef.current = aomiClient;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const getThreadMetadataRef = useRef(getThreadMetadata);
  getThreadMetadataRef.current = getThreadMetadata;
  const updateThreadMetadataRef = useRef(updateThreadMetadata);
  updateThreadMetadataRef.current = updateThreadMetadata;
  const clientIdRef = useRef(null);
  if (clientIdRef.current === null) {
    clientIdRef.current = getOrCreateClientId();
  }
  useEffect5(() => {
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
  const apiKeyRef = useRef(apiKey.state.apiKey);
  apiKeyRef.current = apiKey.state.apiKey;
  const getCurrentControlSessionId = useCallback5(
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
    apiKey: apiKey.state.apiKey,
    appPlatforms
  });
  const availableModelsRef = useRef(authEndpoints.state.availableModels);
  availableModelsRef.current = authEndpoints.state.availableModels;
  const defaultModelRef = useRef(authEndpoints.state.defaultModel);
  defaultModelRef.current = authEndpoints.state.defaultModel;
  const authorizedAppsRef = useRef(authEndpoints.state.authorizedApps);
  authorizedAppsRef.current = authEndpoints.state.authorizedApps;
  const appDescriptorsRef = useRef(authEndpoints.state.appDescriptors);
  appDescriptorsRef.current = authEndpoints.state.appDescriptors;
  const defaultAppRef = useRef(authEndpoints.state.defaultApp);
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
    appDescriptorsRef,
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
  const aggregateStateRef = useRef(aggregateState);
  aggregateStateRef.current = aggregateState;
  const getControlState = useCallback5(() => aggregateStateRef.current, []);
  const api = __spreadValues(__spreadValues(__spreadValues(__spreadValues({
    state: aggregateState,
    isProcessing: perThread.isProcessing,
    getControlState
  }, apiKey.actions), byok.actions), authEndpoints.actions), perThread.actions);
  return /* @__PURE__ */ jsx(ControlContext.Provider, { value: api, children });
}

// src/contexts/event-context.tsx
import {
  createContext as createContext2,
  useCallback as useCallback6,
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
  const { getCurrentThreadApp } = useControl();
  const subscribersRef = useRef2(/* @__PURE__ */ new Map());
  const subscribe = useCallback6(
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
  const dispatchEvent = useCallback6((event) => {
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
  const sendOutbound = useCallback6(
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
  return /* @__PURE__ */ jsx2(EventContextState.Provider, { value: contextValue, children });
}

// src/contexts/notification-context.tsx
import {
  createContext as createContext3,
  useCallback as useCallback7,
  useContext as useContext3,
  useRef as useRef3,
  useState as useState4
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
  const [notifications, setNotifications] = useState4([]);
  const paymentRequiredIdRef = useRef3(null);
  const showNotification = useCallback7((params) => {
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
  const dismissNotification = useCallback7((id) => {
    if (paymentRequiredIdRef.current === id) {
      paymentRequiredIdRef.current = null;
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);
  const clearAll = useCallback7(() => {
    paymentRequiredIdRef.current = null;
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

// src/contexts/thread-context.tsx
import {
  createContext as createContext4,
  useContext as useContext4,
  useMemo,
  useRef as useRef4,
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
  const storeRef = useRef4(null);
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

// src/contexts/ext-user-context.tsx
import {
  createContext as createContext5,
  useCallback as useCallback8,
  useContext as useContext5,
  useRef as useRef5,
  useState as useState5
} from "react";
import { UserState } from "@aomi-labs/client";
import { UserState as UserState2 } from "@aomi-labs/client";
import { Fragment, jsx as jsx5 } from "react/jsx-runtime";
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
  return (_a = UserState.normalize({
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
  return (_a = UserState.normalize(next)) != null ? _a : {};
}
function stableStateString(state) {
  var _a;
  return JSON.stringify((_a = UserState.normalize(state)) != null ? _a : {});
}
var UserContext = createContext5(void 0);
function useUser() {
  const context = useContext5(UserContext);
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
  const parent = useContext5(UserContext);
  if (parent) {
    return /* @__PURE__ */ jsx5(Fragment, { children });
  }
  return /* @__PURE__ */ jsx5(ExtUserProviderImpl, { children });
}
function ExtUserProviderImpl({ children }) {
  const [user, setUserState] = useState5({
    connection: { is_connected: false }
  });
  const userRef = useRef5(user);
  userRef.current = user;
  const StateChangeCallbacks = useRef5(
    /* @__PURE__ */ new Set()
  );
  const notifyStateChange = useCallback8((next) => {
    queueMicrotask(() => {
      StateChangeCallbacks.current.forEach((callback) => {
        callback(next);
      });
    });
  }, []);
  const setUser = useCallback8(
    (data) => {
      setUserState((prev) => {
        var _a, _b, _c;
        const normalizedData = (_a = UserState.normalize(data)) != null ? _a : {};
        const merged = (_c = UserState.normalize(
          mergeRecords(
            (_b = UserState.normalize(prev)) != null ? _b : {},
            normalizedData
          )
        )) != null ? _c : prev;
        let next;
        if (UserState.isConnected(normalizedData) === false) {
          next = dropWalletBlocks(merged);
        } else {
          const prevAddress = UserState.address(prev);
          const nextAddress = UserState.address(merged);
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
  const addExtValue = useCallback8(
    (key, value) => {
      setUserState((prev) => {
        const next = UserState.withExt(prev, key, value);
        notifyStateChange(next);
        return next;
      });
    },
    [notifyStateChange]
  );
  const removeExtValue = useCallback8(
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
  const getUserState = useCallback8(() => userRef.current, []);
  const onUserStateChange = useCallback8(
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

// src/runtime/core.tsx
import { useCallback as useCallback12, useEffect as useEffect8, useMemo as useMemo2, useRef as useRef9, useState as useState9 } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime
} from "@assistant-ui/react";

// src/runtime/orchestrator.ts
import { useCallback as useCallback9, useEffect as useEffect6, useRef as useRef6, useState as useState6 } from "react";
import { CLIENT_TYPE_WEB_UI } from "@aomi-labs/client";

// src/runtime/session-manager.ts
import {
  Session as ClientSession
} from "@aomi-labs/client";
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

// src/runtime/utils.ts
import {
  SUPPORTED_CHAINS as CLIENT_SUPPORTED_CHAINS
} from "@aomi-labs/client";
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
var SUPPORTED_CHAINS = [...CLIENT_SUPPORTED_CHAINS];
var getChainInfo = (chainId) => chainId === void 0 ? void 0 : SUPPORTED_CHAINS.find((c) => c.id === chainId);

// src/runtime/merge-turns.ts
var hasNoticeKind = (message) => {
  var _a, _b;
  return Boolean(
    (_b = (_a = message.metadata) == null ? void 0 : _a.custom) == null ? void 0 : _b.aomiNoticeKind
  );
};
var isMergeableAssistant = (message) => message.role === "assistant" && !hasNoticeKind(message);
var toContentParts = (content) => {
  if (typeof content === "string") {
    return content.length > 0 ? [{ type: "text", text: content }] : [];
  }
  return [...content];
};
var reindexToolCallIds = (message, messageIndex) => {
  if (typeof message.content === "string") return message;
  let changed = false;
  const content = message.content.map((part, i) => {
    if (part.type === "tool-call") {
      changed = true;
      return __spreadProps(__spreadValues({}, part), { toolCallId: `aomi-tc-${messageIndex}-${i}` });
    }
    return part;
  });
  return changed ? __spreadProps(__spreadValues({}, message), { content }) : message;
};
function mergeAssistantTurns(messages) {
  const out = [];
  let run = [];
  const flush = () => {
    if (run.length === 0) return;
    if (run.length === 1) {
      out.push(run[0]);
    } else {
      const first = run[0];
      const mergedContent = [];
      for (const message of run) {
        mergedContent.push(...toContentParts(message.content));
      }
      out.push(__spreadProps(__spreadValues({}, first), {
        content: mergedContent
      }));
    }
    run = [];
  };
  for (const message of messages) {
    if (isMergeableAssistant(message)) {
      run.push(message);
    } else {
      flush();
      out.push(message);
    }
  }
  flush();
  return out.map((message, index) => reindexToolCallIds(message, index));
}

// src/runtime/orchestrator.ts
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
var updateTurnPhase = (threadContext, threadId, turnPhase) => {
  const metadata = threadContext.getThreadMetadata(threadId);
  if (!metadata || metadata.control.turnPhase === turnPhase) return;
  threadContext.updateThreadMetadata(threadId, {
    control: __spreadProps(__spreadValues({}, metadata.control), {
      turnPhase
    })
  });
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
  const threadContextRef = useRef6(threadContext);
  threadContextRef.current = threadContext;
  const aomiClientRef = useRef6(aomiClient);
  aomiClientRef.current = aomiClient;
  const optionsRef = useRef6(options);
  optionsRef.current = options;
  const [isRunning, setIsRunning] = useState6(false);
  const sessionManagerRef = useRef6(null);
  if (!sessionManagerRef.current) {
    sessionManagerRef.current = new SessionManager(() => aomiClientRef.current);
  }
  const pendingFetches = useRef6(/* @__PURE__ */ new Set());
  const initialStatePromises = useRef6(/* @__PURE__ */ new Map());
  const hydratedThreadIds = useRef6(/* @__PURE__ */ new Set());
  const listenerCleanups = useRef6(/* @__PURE__ */ new Map());
  const cleanupSessionListeners = useCallback9((threadId) => {
    var _a;
    (_a = listenerCleanups.current.get(threadId)) == null ? void 0 : _a();
    listenerCleanups.current.delete(threadId);
  }, []);
  const closeSession = useCallback9(
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
  const closeIdleSessionsExcept = useCallback9(
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
  const closeAllSessions = useCallback9(() => {
    var _a;
    pendingFetches.current.clear();
    initialStatePromises.current.clear();
    hydratedThreadIds.current.clear();
    for (const threadId of Array.from(listenerCleanups.current.keys())) {
      cleanupSessionListeners(threadId);
    }
    (_a = sessionManagerRef.current) == null ? void 0 : _a.closeAll();
  }, [cleanupSessionListeners]);
  const getSession = useCallback9(
    (threadId) => {
      var _a, _b, _c, _d, _e;
      const manager = sessionManagerRef.current;
      const nextOptions = optionsRef.current;
      const nextApp = nextOptions.getApp();
      const nextApplicationId = (_a = nextOptions.getApplicationId) == null ? void 0 : _a.call(nextOptions);
      const nextApiKey = (_c = (_b = nextOptions.getApiKey) == null ? void 0 : _b.call(nextOptions)) != null ? _c : void 0;
      const nextClientId = (_d = nextOptions.getClientId) == null ? void 0 : _d.call(nextOptions);
      const nextUserState = (_e = nextOptions.getUserState) == null ? void 0 : _e.call(nextOptions);
      const existing = manager.get(threadId);
      if (existing) {
        existing.syncRuntimeOptions({
          app: nextApp,
          applicationId: nextApplicationId,
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
        applicationId: nextApplicationId,
        apiKey: nextApiKey,
        clientId: nextClientId,
        clientType: CLIENT_TYPE_WEB_UI,
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
          threadContextRef.current.setThreadMessages(
            threadId,
            mergeAssistantTurns(threadMessages)
          );
        })
      );
      cleanups.push(
        session.on("processing_start", () => {
          updateTurnPhase(threadContextRef.current, threadId, "working");
          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(true);
          }
        })
      );
      cleanups.push(
        session.on("processing_end", () => {
          updateTurnPhase(threadContextRef.current, threadId, "idle");
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
  const ensureInitialState = useCallback9(
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
  const sendMessage = useCallback9(
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
      updateTurnPhase(threadContextRef.current, threadId, "submitting");
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
        if (!session.getIsProcessing()) {
          updateTurnPhase(threadContextRef.current, threadId, "idle");
        }
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
        updateTurnPhase(threadContextRef.current, threadId, "idle");
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
  const cancelGeneration = useCallback9(async (threadId) => {
    var _a;
    const session = (_a = sessionManagerRef.current) == null ? void 0 : _a.get(threadId);
    if (session) {
      await session.interrupt();
    } else {
      updateTurnPhase(threadContextRef.current, threadId, "idle");
    }
  }, []);
  useEffect6(() => {
    var _a;
    (_a = sessionManagerRef.current) == null ? void 0 : _a.forEach((session, threadId) => {
      session.setSSEActive(threadId === threadContext.currentThreadId);
    });
  }, [threadContext.currentThreadId]);
  useEffect6(() => {
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

// src/runtime/threadlist-adapter.ts
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

// src/interface.tsx
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
function useOptionalAomiRuntime() {
  return useContext6(AomiRuntimeContext);
}

// src/handlers/wallet-handler.ts
import { useCallback as useCallback10, useRef as useRef7, useState as useState7 } from "react";
function useWalletHandler({
  getSession
}) {
  const [pendingRequests, setPendingRequests] = useState7([]);
  const [hasBlockingWalletRequests, setHasBlockingWalletRequests] = useState7(false);
  const requestsRef = useRef7(pendingRequests);
  const inFlightRequestSetRef = useRef7(/* @__PURE__ */ new Set());
  const suppressedRequestSetRef = useRef7(/* @__PURE__ */ new Set());
  const syncVisibleRequests = useCallback10(() => {
    setPendingRequests(
      requestsRef.current.filter(
        (request) => !suppressedRequestSetRef.current.has(request.id)
      )
    );
    setHasBlockingWalletRequests(
      requestsRef.current.length > 0 || inFlightRequestSetRef.current.size > 0
    );
  }, []);
  const setRequests = useCallback10(
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
  const startRequest = useCallback10(
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
  const resolveRequest = useCallback10(
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
  const rejectRequest = useCallback10(
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

// src/runtime/user-state-provider.tsx
import {
  useCallback as useCallback11,
  useEffect as useEffect7,
  useRef as useRef8,
  useState as useState8
} from "react";
import { UserState as UserStateHelpers } from "@aomi-labs/client";

// src/runtime/http-status.ts
function getHttpStatus2(error) {
  const status = error == null ? void 0 : error.status;
  if (typeof status === "number") return status;
  const message = error instanceof Error ? error.message : String(error);
  const match = /\bHTTP\s+(\d{3})\b/i.exec(message);
  return match ? Number(match[1]) : void 0;
}

// src/runtime/user-state-provider.tsx
import { Fragment as Fragment2, jsx as jsx6 } from "react/jsx-runtime";
var THREAD_PREFETCH_LIMIT = 5;
var PREFETCH_IDLE_TIMEOUT_MS = 1500;
var THREAD_LIST_AUTH_RETRY_BUDGET_MS = 3e4;
var THREAD_LIST_AUTH_RETRY_BASE_DELAY_MS = 300;
var THREAD_LIST_AUTH_RETRY_MAX_DELAY_MS = 2e3;
var THREAD_LIST_AUTH_RETRY_BACKOFF_FACTOR = 1.7;
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
function delay(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}
function stableStateString2(state) {
  return JSON.stringify(state != null ? state : {});
}
function normalizeWalletId(value) {
  if (!value) return void 0;
  return value.startsWith("0x") ? value.toLowerCase() : value;
}
function useWalletStateSync(context, sessions, remoteThreads) {
  const {
    getCurrentThreadApp,
    getUserState,
    onUserStateChange,
    threadContextRef
  } = context;
  const { aomiClientRef } = sessions;
  const { remoteThreadIdsRef } = remoteThreads;
  const walletSnapshot = useCallback11(
    (nextUser) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r;
      return {
        connection: {
          is_connected: (_a = UserStateHelpers.isConnected(nextUser)) != null ? _a : false,
          primary_family: (_b = nextUser.connection) == null ? void 0 : _b.primary_family,
          provider: (_c = UserStateHelpers.walletProvider(nextUser)) != null ? _c : void 0,
          wallet_provider_subject: (_d = UserStateHelpers.walletProviderSubject(nextUser)) != null ? _d : void 0,
          auth_method: (_e = UserStateHelpers.authMethod(nextUser)) != null ? _e : void 0,
          auth_value: (_f = UserStateHelpers.authValue(nextUser)) != null ? _f : void 0,
          auth_verified_at: (_g = UserStateHelpers.authVerifiedAt(nextUser)) != null ? _g : void 0
        },
        evm: {
          address: UserStateHelpers.address(nextUser),
          chain_id: UserStateHelpers.chainId(nextUser),
          ens_name: typeof ((_h = nextUser.evm) == null ? void 0 : _h.ens_name) === "string" ? nextUser.evm.ens_name : void 0,
          aa: {
            mode: (_i = UserStateHelpers.aaMode(nextUser)) != null ? _i : void 0,
            smart_account: (_j = UserStateHelpers.SmartAccount4337(nextUser)) != null ? _j : void 0,
            delegation_7702: (_k = UserStateHelpers.Delegation7702(nextUser)) != null ? _k : void 0
          },
          sponsorship: {
            sponsored: (_l = UserStateHelpers.sponsored(nextUser)) != null ? _l : void 0,
            sponsor_provider: (_m = UserStateHelpers.sponsorProvider(nextUser)) != null ? _m : void 0,
            sponsor_account: (_n = UserStateHelpers.sponsorAccount(nextUser)) != null ? _n : void 0
          }
        },
        svm: {
          address: UserStateHelpers.svmAddress(nextUser),
          cluster: (_o = nextUser.svm) == null ? void 0 : _o.cluster,
          wallet_name: (_p = nextUser.svm) == null ? void 0 : _p.wallet_name,
          transport: (_q = nextUser.svm) == null ? void 0 : _q.transport,
          capabilities: (_r = nextUser.svm) == null ? void 0 : _r.capabilities
        }
      };
    },
    [getUserState]
  );
  const lastWalletStateRef = useRef8(walletSnapshot(getUserState()));
  useEffect7(() => {
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
    remoteThreadIdsRef,
    threadContextRef,
    walletSnapshot
  ]);
}
function useUserStateRequestResponder(context, sessions) {
  const eventContext = useEventContext();
  const { getUserState, threadContextRef } = context;
  const { getSession } = sessions;
  useEffect7(() => {
    const unsubscribe = eventContext.subscribe("user_state_request", () => {
      var _a, _b;
      const sessionId = threadContextRef.current.currentThreadId;
      const session = getSession(sessionId);
      const payload = (_b = (_a = UserStateHelpers.reconcile(session.getUserState(), getUserState())) != null ? _a : session.getUserState()) != null ? _b : getUserState();
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
  const [isThreadListLoading, setIsThreadListLoading] = useState8(true);
  const [threadListError, setThreadListError] = useState8(false);
  const prefetchCancelRef = useRef8(null);
  const wasConnectedRef = useRef8(false);
  const { getControlState, threadContextRef, user } = context;
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
  const isConnected = UserStateHelpers.isConnected(user) === true;
  const listThreadsWithAuthRetry = useCallback11(
    async (sessionId, isCancelled) => {
      let nextDelay = THREAD_LIST_AUTH_RETRY_BASE_DELAY_MS;
      let waitedMs = 0;
      for (; ; ) {
        try {
          return await aomiClientRef.current.listThreads(sessionId);
        } catch (error) {
          if (isCancelled() || getHttpStatus2(error) !== 401 || waitedMs >= THREAD_LIST_AUTH_RETRY_BUDGET_MS) {
            throw error;
          }
          await delay(nextDelay);
          waitedMs += nextDelay;
          nextDelay = Math.min(
            Math.round(nextDelay * THREAD_LIST_AUTH_RETRY_BACKOFF_FACTOR),
            THREAD_LIST_AUTH_RETRY_MAX_DELAY_MS
          );
        }
      }
    },
    [aomiClientRef]
  );
  const scheduleThreadPrefetch = useCallback11(
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
  useEffect7(() => {
    var _a;
    if (!isConnected) {
      const wasPreviouslyConnected = wasConnectedRef.current;
      wasConnectedRef.current = false;
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
    wasConnectedRef.current = true;
    let cancelled = false;
    setIsThreadListLoading(true);
    setThreadListError(false);
    const fetchThreadList = async () => {
      var _a2, _b, _c;
      try {
        const remoteThreadIdsAtFetchStart = new Set(remoteThreadIdsRef.current);
        const currentContext = threadContextRef.current;
        const controlSessionId = getControlSessionId(
          getControlState().clientId,
          currentContext.currentThreadId
        );
        const threadList = await listThreadsWithAuthRetry(
          controlSessionId,
          () => cancelled
        );
        if (cancelled) return;
        const remoteThreadIds = /* @__PURE__ */ new Set();
        const newMetadata = new Map(currentContext.allThreadsMetadata);
        const baseThreadCount = currentContext.threadCnt;
        let maxChatNum = baseThreadCount;
        for (const thread of threadList) {
          remoteThreadIds.add(thread.session_id);
          const rawTitle = (_a2 = thread.title) != null ? _a2 : "";
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
        if (!cancelled) {
          setThreadListError(true);
        }
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
    closeAllSessions,
    ensureInitialState,
    getControlState,
    listThreadsWithAuthRetry,
    remoteThreadIdsRef,
    scheduleThreadPrefetch,
    sessionManager,
    setIsThreadLoading,
    threadContextRef,
    isConnected,
    warmPromisesRef,
    warmedThreadIdsRef,
    warmThread
  ]);
  return { isThreadListLoading, threadListError };
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
  const { getControlState, getCurrentThreadApp } = useControl();
  const threadContextRef = useRef8(threadContext);
  threadContextRef.current = threadContext;
  const context = {
    getControlState,
    getCurrentThreadApp,
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
  const lastSerializedStateRef = useRef8("");
  useEffect7(() => {
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
  }, [getUserState, onUserStateChange, sessionManager, setUser]);
  return /* @__PURE__ */ jsx6(Fragment2, { children });
}

// src/runtime/core.tsx
import { jsx as jsx7 } from "react/jsx-runtime";
function AomiRuntimeCore({
  children,
  aomiClient,
  applicationId
}) {
  const threadContext = useThreadContext();
  const eventContext = useEventContext();
  const notificationContext = useNotification();
  const { getUserState } = useUser();
  const {
    getControlState,
    getCurrentThreadApplicationId,
    getCurrentThreadApp,
    getPreferredThreadControl,
    syncCurrentThreadControl
  } = useControl();
  const sessionManagerRef = useRef9(null);
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
    getUserState,
    getApp: getCurrentThreadApp,
    getApplicationId: () => {
      var _a;
      return (_a = getCurrentThreadApplicationId()) != null ? _a : applicationId;
    },
    getApiKey: () => getControlState().apiKey,
    getClientId: () => {
      var _a;
      return (_a = getControlState().clientId) != null ? _a : void 0;
    },
    prepareThreadForSend: async (threadId) => {
      const wasCreated = await ensureBackendThread(threadId);
      if (wasCreated) {
        threadsMaterializedForSendRef.current.add(threadId);
      }
      await syncCurrentThreadControl({ ignoreProcessing: true });
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
  const threadContextRef = useRef9(threadContext);
  threadContextRef.current = threadContext;
  const remoteThreadIdsRef = useRef9(/* @__PURE__ */ new Set());
  const warmedThreadIdsRef = useRef9(/* @__PURE__ */ new Set());
  const warmPromisesRef = useRef9(/* @__PURE__ */ new Map());
  const threadsMaterializedForSendRef = useRef9(/* @__PURE__ */ new Set());
  const [isThreadLoading, setIsThreadLoading] = useState9(false);
  const warmThread = useCallback12(
    async (threadId) => {
      if (!remoteThreadIdsRef.current.has(threadId) || warmedThreadIdsRef.current.has(threadId)) {
        return;
      }
      const existingPromise = warmPromisesRef.current.get(threadId);
      if (existingPromise) {
        return existingPromise;
      }
      const warmPromise = (async () => {
        await aomiClientRef.current.createThread(threadId);
        warmedThreadIdsRef.current.add(threadId);
      })();
      warmPromisesRef.current.set(threadId, warmPromise);
      try {
        await warmPromise;
      } finally {
        warmPromisesRef.current.delete(threadId);
      }
    },
    [aomiClientRef]
  );
  const ensureBackendThread = useCallback12(
    async (threadId) => {
      if (remoteThreadIdsRef.current.has(threadId)) return false;
      await aomiClientRef.current.createThread(threadId);
      remoteThreadIdsRef.current.add(threadId);
      warmedThreadIdsRef.current.add(threadId);
      return true;
    },
    [aomiClientRef]
  );
  const getRuntimeSession = useCallback12(
    (threadId) => {
      var _a, _b;
      return (_b = (_a = sessionManagerRef.current) == null ? void 0 : _a.get(threadId)) != null ? _b : getSession(threadId);
    },
    [getSession]
  );
  const { isThreadListLoading, threadListError } = useRuntimeUserStateEffects({
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
  useEffect8(() => {
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
  useEffect8(() => {
    var _a;
    const threadId = threadContext.currentThreadId;
    const currentMeta = threadContext.getThreadMetadata(threadId);
    const nextTurnPhase = isRunning ? (_a = currentMeta == null ? void 0 : currentMeta.control.turnPhase) != null ? _a : "working" : "idle";
    if (currentMeta && (currentMeta.control.isProcessing !== isRunning || currentMeta.control.turnPhase !== nextTurnPhase)) {
      threadContext.updateThreadMetadata(threadId, {
        control: __spreadProps(__spreadValues({}, currentMeta.control), {
          isProcessing: isRunning,
          turnPhase: nextTurnPhase
        })
      });
    }
  }, [isRunning, threadContext]);
  const currentMessages = threadContext.getThreadMessages(
    threadContext.currentThreadId
  );
  const isRemoteThread = useCallback12(
    (threadId) => remoteThreadIdsRef.current.has(threadId),
    []
  );
  const threadListAdapter = useMemo2(
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
  useEffect8(() => {
    const unsubscribe = eventContext.subscribe("system_notice", (_event) => {
    });
    return unsubscribe;
  }, [eventContext, notificationContext]);
  const runtime = useExternalStoreRuntime({
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
  useEffect8(() => {
    return () => {
      closeAllSessions();
    };
  }, [closeAllSessions]);
  const userContext = useUser();
  const sendMessage = useCallback12(
    async (text) => {
      await orchestratorSendMessage(text, threadContext.currentThreadId);
    },
    [orchestratorSendMessage, threadContext.currentThreadId]
  );
  const cancelGeneration = useCallback12(() => {
    void orchestratorCancel(threadContext.currentThreadId);
  }, [orchestratorCancel, threadContext.currentThreadId]);
  const getMessages = useCallback12(
    (threadId) => {
      const id = threadId != null ? threadId : threadContext.currentThreadId;
      return threadContext.getThreadMessages(id);
    },
    [threadContext]
  );
  const createThread = useCallback12(async () => {
    await threadListAdapter.onSwitchToNewThread();
    return threadContextRef.current.currentThreadId;
  }, [threadListAdapter]);
  const deleteThread = useCallback12(
    async (threadId) => {
      closeSession(threadId);
      await threadListAdapter.onDelete(threadId);
    },
    [closeSession, threadListAdapter]
  );
  const renameThread = useCallback12(
    async (threadId, title) => {
      await threadListAdapter.onRename(threadId, title);
    },
    [threadListAdapter]
  );
  const archiveThread = useCallback12(
    async (threadId) => {
      await threadListAdapter.onArchive(threadId);
    },
    [threadListAdapter]
  );
  const selectThread = useCallback12(
    (threadId) => {
      if (threadContext.allThreadsMetadata.has(threadId)) {
        threadListAdapter.onSwitchToThread(threadId);
      } else {
        void threadListAdapter.onSwitchToNewThread();
      }
    },
    [threadContext.allThreadsMetadata, threadListAdapter]
  );
  const simulateBatchTransactions = useCallback12(
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
      threadListError,
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
      threadListError,
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
  return /* @__PURE__ */ jsx7(AomiRuntimeApiProvider, { value: aomiRuntimeApi, children: /* @__PURE__ */ jsx7(
    RuntimeUserStateProvider,
    {
      sessionManager,
      getUserState: userContext.getUserState,
      setUser: userContext.setUser,
      onUserStateChange: userContext.onUserStateChange,
      children: /* @__PURE__ */ jsx7(AssistantRuntimeProvider, { runtime, children })
    }
  ) });
}

// src/runtime/aomi-runtime.tsx
import { jsx as jsx8 } from "react/jsx-runtime";
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
  applicationId,
  appPlatforms,
  clientOptions
}) {
  const resolvedClientOptions = useMemo3(
    () => __spreadValues({
      logger: {
        debug: (...args) => console.debug(...args)
      }
    }, clientOptions),
    [clientOptions]
  );
  const aomiClient = useMemo3(
    () => new AomiClient(__spreadValues({
      baseUrl: normalizeBackendUrl(backendUrl)
    }, resolvedClientOptions)),
    [backendUrl, resolvedClientOptions]
  );
  return /* @__PURE__ */ jsx8(ThreadContextProvider, { children: /* @__PURE__ */ jsx8(NotificationContextProvider, { children: /* @__PURE__ */ jsx8(ExtUserProvider, { children: /* @__PURE__ */ jsx8(
    AomiRuntimeInner,
    {
      aomiClient,
      applicationId,
      appPlatforms,
      children
    }
  ) }) }) });
}
function AomiRuntimeInner({
  children,
  aomiClient,
  applicationId,
  appPlatforms
}) {
  const threadContext = useThreadContext();
  return /* @__PURE__ */ jsx8(
    ControlContextProvider,
    {
      aomiClient,
      sessionId: threadContext.currentThreadId,
      getThreadMetadata: threadContext.getThreadMetadata,
      updateThreadMetadata: threadContext.updateThreadMetadata,
      appPlatforms,
      children: /* @__PURE__ */ jsx8(
        EventContextProvider,
        {
          aomiClient,
          sessionId: threadContext.currentThreadId,
          children: /* @__PURE__ */ jsx8(AomiRuntimeCore, { aomiClient, applicationId, children })
        }
      )
    }
  );
}

// src/handlers/notification-handler.ts
import { useCallback as useCallback13, useEffect as useEffect9, useState as useState10 } from "react";
var notificationIdCounter2 = 0;
function generateNotificationId() {
  return `notif-${Date.now()}-${++notificationIdCounter2}`;
}
function useNotificationHandler({
  onNotification
} = {}) {
  const { subscribe } = useEventContext();
  const [notifications, setNotifications] = useState10([]);
  useEffect9(() => {
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
  const markHandled = useCallback13((id) => {
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
  UserState2 as UserState,
  aaModeFromExecutionKind,
  appIdentityKey,
  appendFeeCallToPayload,
  buildFeeAAWalletCall,
  cn,
  executeWalletCalls,
  formatAddress,
  getChainInfo,
  getNetworkName,
  hydrateTxPayloadFromUserState,
  initThreadControl,
  normalizeAppDescriptor,
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
};
//# sourceMappingURL=index.js.map