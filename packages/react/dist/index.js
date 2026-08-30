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
  toAAWalletCalls,
  toAAWalletCall,
  appendFeeCallToPayload,
  buildFeeAAWalletCall,
  normalizeSimulatedFee,
  MAX_AUTO_FEE_WEI,
  executeWalletCalls,
  parseChainId,
  aaModeFromExecutionKind,
  toViemSignMessageArgs,
  normalizeAppDescriptor,
  appIdentityKey
} from "@aomi-labs/client";

// src/runtime/aomi-runtime.tsx
import { useMemo as useMemo4 } from "react";
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
import { secretNamesFrom } from "@aomi-labs/client";
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
    async (secrets) => {
      const clientId = clientIdRef.current;
      if (!clientId) throw new Error("clientId not initialized");
      const { handles } = await aomiClientRef.current.ingestSecrets(
        getControlSessionId2(),
        clientId,
        secrets
      );
      return handles;
    },
    [aomiClientRef, clientIdRef, getControlSessionId2]
  );
  const clearSecrets = useCallback2(
    async () => {
      var _a, _b;
      const clientId = clientIdRef.current;
      if (!clientId) return;
      await ((_b = (_a = aomiClientRef.current).clearSecrets) == null ? void 0 : _b.call(
        _a,
        getControlSessionId2(),
        clientId
      ));
    },
    [aomiClientRef, clientIdRef, getControlSessionId2]
  );
  const deleteSecret = useCallback2(
    async (name) => {
      const clientId = clientIdRef.current;
      if (!clientId) return;
      await aomiClientRef.current.deleteSecret(
        getControlSessionId2(),
        clientId,
        name
      );
    },
    [aomiClientRef, clientIdRef, getControlSessionId2]
  );
  const listSecrets = useCallback2(async () => {
    var _a;
    const response = await aomiClientRef.current.listSecrets(
      getControlSessionId2(),
      (_a = clientIdRef.current) != null ? _a : void 0
    );
    return secretNamesFrom(response);
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
  /^gpt-5\.6[- ]terra/i,
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
  appPlatforms,
  applicationId
}) {
  var _a;
  const appPlatformsKey = Array.isArray(appPlatforms) ? appPlatforms.join("\0") : appPlatforms != null ? appPlatforms : "";
  const appId = (_a = applicationId == null ? void 0 : applicationId.toString()) != null ? _a : "";
  const [availableModels, setAvailableModels] = useState3([]);
  const [defaultModel, setDefaultModel] = useState3(null);
  const [authorizedApps, setAuthorizedApps] = useState3([]);
  const [appDescriptors, setAppDescriptors] = useState3([]);
  const [defaultApp, setDefaultApp] = useState3(null);
  const getAvailableModels = useCallback3(async () => {
    try {
      const models = await aomiClientRef.current.getModels(
        getControlSessionId2(),
        { applicationId: appId }
      );
      setAvailableModels(models);
      setDefaultModel(resolveAutoModel(models));
      return models;
    } catch (error) {
      console.error("Failed to fetch models:", error);
      return [];
    }
  }, [aomiClientRef, getControlSessionId2, appId]);
  const getAuthorizedApps = useCallback3(async () => {
    var _a2;
    try {
      const descriptors = await aomiClientRef.current.getApps(
        getControlSessionId2(),
        {
          apiKey: (_a2 = apiKeyRef.current) != null ? _a2 : void 0,
          platforms: appPlatforms,
          applicationId: appId
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
  }, [aomiClientRef, apiKeyRef, getControlSessionId2, appPlatformsKey, appId]);
  useEffect3(() => {
    void getAvailableModels();
  }, [getAvailableModels]);
  useEffect3(() => {
    void getAuthorizedApps();
  }, [getAuthorizedApps, apiKey]);
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

// src/utils/env.ts
import { safeEnv } from "@aomi-labs/client";

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
var threadLogEnv = safeEnv(() => process.env.NODE_ENV);
var shouldLogThreadUpdates = threadLogEnv !== void 0 && threadLogEnv !== "production";
function initThreadControl() {
  return {
    model: null,
    modelMode: "auto",
    app: null,
    applicationId: null,
    controlDirty: false
  };
}
var initialMetadata = () => ({
  title: "New Chat",
  status: "regular",
  lastActiveAt: (/* @__PURE__ */ new Date()).toISOString(),
  control: initThreadControl()
});
var logThreadMetadataChange = (source, threadId, previous, next) => {
  if (!shouldLogThreadUpdates || !previous && !next) return;
  if (!previous || !next || previous.title !== next.title || previous.status !== next.status || previous.lastActiveAt !== next.lastActiveAt) {
    console.debug(`[aomi][thread:${source}]`, {
      threadId,
      previous,
      next
    });
  }
};
var ThreadStore = class {
  constructor(options) {
    this.listeners = /* @__PURE__ */ new Set();
    this.subscribe = (listener) => {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
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
      this.updateState({
        threadCnt: typeof updater === "function" ? updater(this.state.threadCnt) : updater
      });
    };
    this.setThreadMetadata = (updater) => {
      const previous = this.state.threadMetadata;
      const resolved = typeof updater === "function" ? updater(previous) : updater;
      const threadMetadata = new Map(resolved);
      for (const [threadId, next] of threadMetadata) {
        logThreadMetadataChange(
          "setThreadMetadata",
          threadId,
          previous.get(threadId),
          next
        );
      }
      for (const [threadId, value] of previous) {
        if (!threadMetadata.has(threadId)) {
          logThreadMetadataChange(
            "setThreadMetadata",
            threadId,
            value,
            void 0
          );
        }
      }
      this.updateState({ threadMetadata });
    };
    this.getThreadMetadata = (threadId) => this.state.threadMetadata.get(threadId);
    this.updateThreadMetadata = (threadId, updates) => {
      const previous = this.state.threadMetadata.get(threadId);
      if (!previous) return;
      const next = __spreadValues(__spreadValues({}, previous), updates);
      const threadMetadata = new Map(this.state.threadMetadata);
      threadMetadata.set(threadId, next);
      logThreadMetadataChange("updateThreadMetadata", threadId, previous, next);
      this.updateState({ threadMetadata });
    };
    this.resetToDefault = () => {
      const currentThreadId = generateUUID();
      this.state = {
        currentThreadId,
        threadViewKey: this.state.threadViewKey + 1,
        threadCnt: 1,
        threadMetadata: /* @__PURE__ */ new Map([[currentThreadId, initialMetadata()]])
      };
      this.snapshot = this.buildSnapshot();
      for (const listener of this.listeners) listener();
      return currentThreadId;
    };
    var _a;
    const currentThreadId = (_a = options == null ? void 0 : options.initialThreadId) != null ? _a : generateUUID();
    this.state = {
      currentThreadId,
      threadViewKey: 0,
      threadCnt: 1,
      threadMetadata: /* @__PURE__ */ new Map([[currentThreadId, initialMetadata()]])
    };
    this.snapshot = this.buildSnapshot();
  }
  buildSnapshot() {
    return {
      currentThreadId: this.state.currentThreadId,
      setCurrentThreadId: this.setCurrentThreadId,
      threadViewKey: this.state.threadViewKey,
      bumpThreadViewKey: this.bumpThreadViewKey,
      allThreadsMetadata: this.state.threadMetadata,
      setThreadMetadata: this.setThreadMetadata,
      threadCnt: this.state.threadCnt,
      setThreadCnt: this.setThreadCnt,
      getThreadMetadata: this.getThreadMetadata,
      updateThreadMetadata: this.updateThreadMetadata,
      resetToDefault: this.resetToDefault
    };
  }
  updateState(partial) {
    this.state = __spreadValues(__spreadValues({}, this.state), partial);
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }
  ensureThreadExists(threadId) {
    if (this.state.threadMetadata.has(threadId)) return;
    const threadMetadata = new Map(this.state.threadMetadata);
    threadMetadata.set(threadId, initialMetadata());
    this.state = __spreadProps(__spreadValues({}, this.state), { threadMetadata });
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
  sessionIdRef,
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
  const getCurrentThreadControl = useCallback4(() => {
    var _a;
    const metadata = getThreadMetadataRef.current(sessionIdRef.current);
    return (_a = metadata == null ? void 0 : metadata.control) != null ? _a : initThreadControl();
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
    var _a, _b, _c, _d;
    const currentControl = (_b = (_a = getThreadMetadataRef.current(sessionIdRef.current)) == null ? void 0 : _a.control) != null ? _b : initThreadControl();
    return (_d = (_c = resolveAuthorizedApp(
      currentControl.app,
      currentControl.applicationId,
      authorizedAppsRef.current,
      appDescriptorsRef.current,
      defaultAppRef.current
    )) == null ? void 0 : _c.name) != null ? _d : "default";
  }, []);
  const getCurrentThreadApplicationId = useCallback4(() => {
    var _a, _b, _c, _d;
    const currentControl = (_b = (_a = getThreadMetadataRef.current(sessionIdRef.current)) == null ? void 0 : _a.control) != null ? _b : initThreadControl();
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
      var _a, _b, _c, _d;
      const threadId = sessionIdRef.current;
      const currentControl = (_b = (_a = getThreadMetadataRef.current(threadId)) == null ? void 0 : _a.control) != null ? _b : initThreadControl();
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
      writeStoredModelPreference({
        mode: modelMode,
        model: modelMode === "manual" ? model : null
      });
    },
    []
  );
  const onAppSelect = useCallback4(
    (app, options) => {
      var _a, _b, _c, _d, _e, _f;
      const threadId = sessionIdRef.current;
      const currentControl = (_b = (_a = getThreadMetadataRef.current(threadId)) == null ? void 0 : _a.control) != null ? _b : initThreadControl();
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
    var _a, _b;
    const threadId = sessionIdRef.current;
    const currentControl = (_b = (_a = getThreadMetadataRef.current(threadId)) == null ? void 0 : _a.control) != null ? _b : initThreadControl();
    if (currentControl.controlDirty) {
      updateThreadMetadataRef.current(threadId, {
        control: __spreadProps(__spreadValues({}, currentControl), { controlDirty: false })
      });
    }
  }, []);
  useEffect4(() => {
    var _a;
    const threadId = sessionIdRef.current;
    const metadata = getThreadMetadataRef.current(threadId);
    if (!metadata) return;
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
      const currentMode = (_a = currentControl.modelMode) != null ? _a : "manual";
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
    getCurrentThreadControl,
    getCurrentThreadApp,
    getCurrentThreadApplicationId,
    getPreferredThreadControl,
    onModelSelect,
    onAppSelect,
    markControlSynced
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
    actions: {
      getCurrentThreadControl: ctx.getCurrentThreadControl,
      getCurrentThreadApp: ctx.getCurrentThreadApp,
      getCurrentThreadApplicationId: ctx.getCurrentThreadApplicationId,
      getPreferredThreadControl: ctx.getPreferredThreadControl,
      onModelSelect: ctx.onModelSelect,
      onAppSelect: ctx.onAppSelect,
      markControlSynced: ctx.markControlSynced
    }
  };
}
function ControlContextProvider({
  children,
  aomiClient,
  sessionId,
  getThreadMetadata,
  updateThreadMetadata,
  appPlatforms,
  applicationId
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
    appPlatforms,
    applicationId
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
    sessionIdRef,
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
    getControlState
  }, apiKey.actions), byok.actions), authEndpoints.actions), perThread);
  return /* @__PURE__ */ jsx(ControlContext.Provider, { value: api, children });
}

// src/contexts/notification-context.tsx
import {
  createContext as createContext2,
  useCallback as useCallback6,
  useContext as useContext2,
  useRef as useRef2,
  useState as useState4
} from "react";
import { jsx as jsx2 } from "react/jsx-runtime";
var NotificationContext = createContext2(null);
function useNotification() {
  const context = useContext2(NotificationContext);
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
  const paymentRequiredIdRef = useRef2(null);
  const showNotification = useCallback6((params) => {
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
  const dismissNotification = useCallback6((id) => {
    if (paymentRequiredIdRef.current === id) {
      paymentRequiredIdRef.current = null;
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);
  const clearAll = useCallback6(() => {
    paymentRequiredIdRef.current = null;
    setNotifications([]);
  }, []);
  const value = {
    notifications,
    showNotification,
    dismissNotification,
    clearAll
  };
  return /* @__PURE__ */ jsx2(NotificationContext.Provider, { value, children });
}

// src/contexts/thread-context.tsx
import {
  createContext as createContext3,
  useContext as useContext3,
  useMemo,
  useRef as useRef3,
  useSyncExternalStore
} from "react";
import { jsx as jsx3 } from "react/jsx-runtime";
var ThreadContextState = createContext3(null);
function useThreadContext() {
  const context = useContext3(ThreadContextState);
  if (!context) {
    throw new Error("useThreadContext must be used within ThreadContextProvider");
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
  return /* @__PURE__ */ jsx3(ThreadContextState.Provider, { value, children });
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
  createContext as createContext4,
  useCallback as useCallback7,
  useContext as useContext4,
  useRef as useRef4,
  useState as useState5
} from "react";
import { UserState } from "@aomi-labs/client";
import { UserState as UserState2 } from "@aomi-labs/client";
import { Fragment, jsx as jsx4 } from "react/jsx-runtime";
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
  const chainId = UserState.chainId(state);
  return __spreadValues(__spreadValues(__spreadValues({
    connection: { is_connected: false }
  }, chainId === void 0 ? {} : { evm: { chain_id: chainId } }), state.ext === void 0 ? {} : { ext: state.ext }), state.preferences === void 0 ? {} : { preferences: state.preferences });
}
function dropAddressScopedState(state) {
  const evm = asRecord(state.evm);
  const nextEvm = evm ? __spreadValues({}, evm) : void 0;
  if (nextEvm) {
    delete nextEvm.ens_name;
  }
  const next = __spreadValues({}, state);
  if (nextEvm && Object.keys(nextEvm).length > 0) {
    next.evm = nextEvm;
  } else {
    delete next.evm;
  }
  return next;
}
function stableStateString(state) {
  return JSON.stringify(state);
}
var UserContext = createContext4(void 0);
function useUser() {
  const context = useContext4(UserContext);
  if (!context) {
    throw new Error("useUser must be used within ExtUserProvider");
  }
  return {
    user: context.user,
    setUser: context.setUser,
    addExtValue: context.addExtValue,
    removeExtValue: context.removeExtValue,
    getUserState: context.getUserState
  };
}
function ExtUserProvider({ children }) {
  const parent = useContext4(UserContext);
  if (parent) {
    return /* @__PURE__ */ jsx4(Fragment, { children });
  }
  return /* @__PURE__ */ jsx4(ExtUserProviderImpl, { children });
}
function ExtUserProviderImpl({ children }) {
  const [user, setUserState] = useState5({
    connection: { is_connected: false }
  });
  const userRef = useRef4(user);
  userRef.current = user;
  const setUser = useCallback7(
    (data) => {
      setUserState((prev) => {
        const incoming = data;
        const merged = mergeRecords(prev, incoming);
        let next;
        if (UserState.isConnected(incoming) === false) {
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
        return next;
      });
    },
    []
  );
  const addExtValue = useCallback7(
    (key, value) => {
      setUserState((prev) => {
        const next = UserState.withExt(prev, key, value);
        return next;
      });
    },
    []
  );
  const removeExtValue = useCallback7(
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
        return next;
      });
    },
    []
  );
  const getUserState = useCallback7(() => userRef.current, []);
  return /* @__PURE__ */ jsx4(
    UserContext.Provider,
    {
      value: {
        user,
        setUser,
        addExtValue,
        removeExtValue,
        getUserState
      },
      children
    }
  );
}

// src/runtime/core.tsx
import { useCallback as useCallback11, useEffect as useEffect8, useMemo as useMemo3, useRef as useRef7, useState as useState7 } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime
} from "@assistant-ui/react";

// src/runtime/orchestrator.ts
import {
  useCallback as useCallback8,
  useEffect as useEffect6,
  useRef as useRef5,
  useSyncExternalStore as useSyncExternalStore2
} from "react";
import {
  CLIENT_TYPE_WEB_UI,
  UserState as UserStateValue
} from "@aomi-labs/client";

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
  closeAll() {
    for (const [threadId, session] of this.sessions) {
      session.close();
    }
    this.sessions.clear();
  }
};

// src/runtime/orchestrator.ts
function useRuntimeOrchestrator(aomiClient, options) {
  const threads = useThreadContext();
  const threadsRef = useRef5(threads);
  threadsRef.current = threads;
  const clientRef = useRef5(aomiClient);
  clientRef.current = aomiClient;
  const optionsRef = useRef5(options);
  optionsRef.current = options;
  const managerRef = useRef5(null);
  const hydrated = useRef5(/* @__PURE__ */ new Set());
  const hydration = useRef5(/* @__PURE__ */ new Map());
  const sessionSubscriptions = useRef5(/* @__PURE__ */ new Map());
  if (!managerRef.current) {
    managerRef.current = new SessionManager(() => clientRef.current);
  }
  const sessionManager = managerRef.current;
  const getSession = useCallback8(
    (threadId) => {
      var _a, _b, _c, _d;
      const runtime = optionsRef.current;
      const getUserState = () => UserStateValue.withExt(
        runtime.getUserState(),
        "client_type",
        CLIENT_TYPE_WEB_UI
      );
      const sessionOptions = {
        app: runtime.getApp(),
        model: (_a = runtime.getModel) == null ? void 0 : _a.call(runtime),
        applicationId: (_b = runtime.getApplicationId) == null ? void 0 : _b.call(runtime),
        clientId: (_c = runtime.getClientId) == null ? void 0 : _c.call(runtime),
        getUserState,
        actions: (_d = runtime.getActions) == null ? void 0 : _d.call(runtime)
      };
      const existing = sessionManager.get(threadId);
      if (existing) {
        existing.syncRuntimeOptions(sessionOptions);
        return existing;
      }
      const session = sessionManager.getOrCreate(threadId, sessionOptions);
      sessionSubscriptions.current.set(
        threadId,
        session.subscribe(() => {
          const snapshot2 = session.getSnapshot();
          const metadata = threadsRef.current.getThreadMetadata(threadId);
          if (snapshot2.title && (metadata == null ? void 0 : metadata.title) !== snapshot2.title) {
            threadsRef.current.updateThreadMetadata(threadId, {
              title: snapshot2.title
            });
          }
        })
      );
      return session;
    },
    [sessionManager]
  );
  const closeSession = useCallback8(
    (threadId) => {
      var _a;
      (_a = sessionSubscriptions.current.get(threadId)) == null ? void 0 : _a();
      sessionSubscriptions.current.delete(threadId);
      hydrated.current.delete(threadId);
      hydration.current.delete(threadId);
      sessionManager.close(threadId);
    },
    [sessionManager]
  );
  const closeAllSessions = useCallback8(() => {
    for (const unsubscribe of sessionSubscriptions.current.values()) {
      unsubscribe();
    }
    sessionSubscriptions.current.clear();
    hydrated.current.clear();
    hydration.current.clear();
    sessionManager.closeAll();
  }, [sessionManager]);
  const ensureInitialState = useCallback8(
    (threadId) => {
      if (hydrated.current.has(threadId)) return Promise.resolve();
      const pending = hydration.current.get(threadId);
      if (pending) return pending;
      const request = getSession(threadId).fetchCurrentState().then(() => {
        hydrated.current.add(threadId);
      }).finally(() => hydration.current.delete(threadId));
      hydration.current.set(threadId, request);
      return request;
    },
    [getSession]
  );
  const sendMessage = useCallback8(
    async (text, threadId) => {
      var _a, _b, _c, _d, _e, _f;
      try {
        await ((_b = (_a = optionsRef.current).prepareThreadForSend) == null ? void 0 : _b.call(_a, threadId));
        const session = getSession(threadId);
        await session.sendAsync(text);
        threadsRef.current.updateThreadMetadata(threadId, {
          lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        (_d = (_c = optionsRef.current).onSendSuccess) == null ? void 0 : _d.call(_c, threadId);
      } catch (error) {
        await ((_f = (_e = optionsRef.current).onSendError) == null ? void 0 : _f.call(_e, threadId, error));
        throw error;
      }
    },
    [getSession]
  );
  const cancelGeneration = useCallback8(async (threadId) => {
    var _a;
    await ((_a = sessionManager.get(threadId)) == null ? void 0 : _a.interrupt());
  }, [sessionManager]);
  const currentSession = getSession(threads.currentThreadId);
  const snapshot = useSyncExternalStore2(
    currentSession.subscribe,
    currentSession.getSnapshot,
    currentSession.getSnapshot
  );
  useEffect6(() => closeAllSessions, [closeAllSessions]);
  return {
    sessionManager,
    currentSession,
    snapshot,
    getSession,
    ensureInitialState,
    sendMessage,
    cancelGeneration,
    closeSession,
    closeAllSessions,
    aomiClientRef: clientRef
  };
}

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
function toInboundMessage(msg, rawIndex = 0) {
  var _a;
  if (msg.sender === "system") {
    return null;
  }
  if (msg.sender === "notice") {
    return {
      id: noticeMessageId(msg, rawIndex),
      role: "assistant",
      content: [{ type: "text", text: (_a = msg.content) != null ? _a : "" }],
      createdAt: /* @__PURE__ */ new Date(),
      metadata: {
        custom: {
          aomiNoticeKind: "error",
          aomiNoticeTitle: "Error"
        }
      }
    };
  }
  return buildInboundMessage(msg);
}
function noticeMessageId(msg, index) {
  var _a;
  return `aomi-notice-${(_a = msg.message_key) != null ? _a : `idx-${index}`}`;
}
function buildInboundMessage(msg) {
  const content = [];
  const role = msg.sender === "user" ? "user" : "assistant";
  if (msg.content && msg.content.trim().length > 0) {
    content.push({ type: "text", text: msg.content });
  }
  if (content.length === 0 && role === "assistant" && !msg.is_streaming) {
    return null;
  }
  const threadMessage = {
    role,
    content,
    createdAt: new Date(parseTimestamp(msg.occurred_at))
  };
  return threadMessage;
}
var toolPart = (event) => {
  var _a;
  return {
    type: "tool-call",
    toolCallId: (_a = event.call_id) != null ? _a : event.id,
    toolName: event.tool_name,
    args: void 0,
    result: event.result
  };
};
function projectAssistantMessages(events) {
  var _a, _b, _c;
  const output = [];
  const assistantTurns = /* @__PURE__ */ new Map();
  const standaloneMessages = /* @__PURE__ */ new Map();
  const assistantTurn = (event) => {
    var _a2;
    const key = (_a2 = event.turn_id) != null ? _a2 : `event:${event.event_id}`;
    const existing = assistantTurns.get(key);
    if (existing) return existing;
    const projection = {
      message: {
        id: `turn:${key}`,
        role: "assistant",
        content: [],
        createdAt: new Date(parseTimestamp(event.occurred_at))
      },
      parts: [],
      textParts: /* @__PURE__ */ new Map(),
      toolParts: /* @__PURE__ */ new Map()
    };
    assistantTurns.set(key, projection);
    output.push(projection);
    return projection;
  };
  for (const event of events) {
    if (event.type === "message") {
      if (event.sender === "system") continue;
      if (event.sender === "agent") {
        const projection = assistantTurn(event);
        const key2 = (_a = event.message_key) != null ? _a : event.event_id;
        const index2 = projection.textParts.get(key2);
        const part = { type: "text", text: event.content };
        if (index2 === void 0) {
          projection.textParts.set(key2, projection.parts.length);
          projection.parts.push(part);
        } else {
          projection.parts[index2] = part;
        }
        continue;
      }
      const projected = toInboundMessage(event, output.length);
      if (!projected) continue;
      const key = (_b = event.message_key) != null ? _b : event.event_id;
      const index = standaloneMessages.get(key);
      if (index === void 0) {
        standaloneMessages.set(key, output.length);
        output.push(projected);
      } else {
        output[index] = projected;
      }
      continue;
    }
    if ((event.type === "tool_update" || event.type === "tool_complete") && event.tool_name !== "task") {
      const projection = assistantTurn(event);
      const key = (_c = event.call_id) != null ? _c : event.id;
      const index = projection.toolParts.get(key);
      const part = toolPart(event);
      if (index === void 0) {
        projection.toolParts.set(key, projection.parts.length);
        projection.parts.push(part);
      } else {
        projection.parts[index] = part;
      }
    }
  }
  return output.map((entry) => {
    if (!("parts" in entry)) return entry;
    return __spreadProps(__spreadValues({}, entry.message), {
      content: entry.parts
    });
  }).filter(
    (message) => typeof message.content === "string" || message.content.length > 0
  );
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
    case 4326:
      return "megaeth";
    case 5042002:
      return "arc-testnet";
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
  isLoading = false,
  getInitialControl = initThreadControl,
  isRemoteThread = () => true
}) {
  const shouldShowThread = (threadId) => {
    return isRemoteThread(threadId);
  };
  const { regularThreads, archivedThreads } = buildThreadLists(
    threadContext.allThreadsMetadata,
    shouldShowThread
  );
  const cleanupEmptyLocalThread = () => {
    const prevId = threadContext.currentThreadId;
    if (isRemoteThread(prevId)) return;
    threadContext.setThreadMetadata((prev) => {
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
      const currentThreadId = threadContext.currentThreadId;
      if (!isRemoteThread(currentThreadId)) return;
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
      threadContext.setCurrentThreadId(threadId);
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
        await aomiClientRef.current.agent.sessions.update(threadId, {
          title: newTitle
        });
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
        await aomiClientRef.current.agent.sessions.update(threadId, {
          archived: true
        });
      } catch (error) {
        console.error("Failed to archive thread:", error);
        threadContext.updateThreadMetadata(threadId, { status: "regular" });
      }
    },
    onUnarchive: async (threadId) => {
      threadContext.updateThreadMetadata(threadId, { status: "regular" });
      try {
        await aomiClientRef.current.agent.sessions.update(threadId, {
          archived: false
        });
      } catch (error) {
        console.error("Failed to unarchive thread:", error);
        threadContext.updateThreadMetadata(threadId, { status: "archived" });
      }
    },
    onDelete: async (threadId) => {
      try {
        await aomiClientRef.current.agent.sessions.delete(threadId);
        threadContext.setThreadMetadata((prev) => {
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
import { createContext as createContext5, useContext as useContext5 } from "react";
var AomiRuntimeContext = createContext5(null);
var AomiRuntimeApiProvider = AomiRuntimeContext.Provider;
function useAomiRuntime() {
  const context = useContext5(AomiRuntimeContext);
  if (!context) {
    throw new Error(
      "useAomiRuntime must be used within AomiRuntimeProvider. Wrap your app with <AomiRuntimeProvider>...</AomiRuntimeProvider>"
    );
  }
  return context;
}
function useOptionalAomiRuntime() {
  return useContext5(AomiRuntimeContext);
}

// src/actions/use-actions.ts
import { useCallback as useCallback9, useMemo as useMemo2, useSyncExternalStore as useSyncExternalStore3 } from "react";
var NO_ACTIONS = [];
var NO_ATTEMPTS = /* @__PURE__ */ new Map();
function useActions(session) {
  const subscribe = useCallback9(
    (listener) => {
      var _a;
      return (_a = session == null ? void 0 : session.subscribe(listener)) != null ? _a : (() => void 0);
    },
    [session]
  );
  const getActions = useCallback9(
    () => {
      var _a;
      return (_a = session == null ? void 0 : session.getSnapshot().actions) != null ? _a : NO_ACTIONS;
    },
    [session]
  );
  const actions = useSyncExternalStore3(subscribe, getActions, getActions);
  const getAttempts = useCallback9(
    () => {
      var _a;
      return (_a = session == null ? void 0 : session.getSnapshot().actionAttempts) != null ? _a : NO_ATTEMPTS;
    },
    [session]
  );
  const actionAttempts = useSyncExternalStore3(
    subscribe,
    getAttempts,
    getAttempts
  );
  const pendingActions = useMemo2(
    () => actions.filter((action) => action.state === "pending"),
    [actions]
  );
  return {
    pendingActions,
    actionAttempts,
    hasBlockingActions: pendingActions.length > 0 || Boolean(session == null ? void 0 : session.actions.isBlocking()),
    executeAction: (id) => requireSession(session).actions.execute(id).then(() => void 0),
    respondToAction: (id, result) => requireSession(session).actions.submitResult(id, result).then(() => void 0),
    rejectAction: (id, reason) => requireSession(session).actions.reject(id, reason).then(() => void 0)
  };
}
function requireSession(session) {
  if (!session) throw new Error("No ClientSession is available");
  return session;
}

// src/runtime/thread-list-sync.ts
import {
  useCallback as useCallback10,
  useEffect as useEffect7,
  useRef as useRef6,
  useState as useState6
} from "react";
import { UserState as UserStateHelpers } from "@aomi-labs/client";

// src/runtime/http-status.ts
function getHttpStatus(error) {
  const status = error == null ? void 0 : error.status;
  if (typeof status === "number") return status;
  const message = error instanceof Error ? error.message : String(error);
  const match = /\bHTTP\s+(\d{3})\b/i.exec(message);
  return match ? Number(match[1]) : void 0;
}

// src/runtime/thread-list-sync.ts
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
function useWalletStateNotifications(user) {
  const { showNotification } = useNotification();
  const walletSnapshot = useCallback10(
    (nextUser) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i;
      return {
        connection: {
          // Serialize exactly the backend ProviderState. FE-local and account
          // identity fields are deliberately not forwarded here.
          is_connected: (_a = UserStateHelpers.isConnected(nextUser)) != null ? _a : false,
          provider: (_b = UserStateHelpers.provider(nextUser)) != null ? _b : void 0,
          provider_label: typeof ((_c = nextUser.connection) == null ? void 0 : _c.provider_label) === "string" ? nextUser.connection.provider_label : void 0,
          auth_method: (_d = UserStateHelpers.authMethod(nextUser)) != null ? _d : void 0
        },
        evm: {
          address: UserStateHelpers.address(nextUser),
          chain_id: UserStateHelpers.chainId(nextUser),
          ens_name: typeof ((_e = nextUser.evm) == null ? void 0 : _e.ens_name) === "string" ? nextUser.evm.ens_name : void 0
        },
        svm: {
          address: UserStateHelpers.svmAddress(nextUser),
          cluster: (_f = nextUser.svm) == null ? void 0 : _f.cluster,
          wallet_name: (_g = nextUser.svm) == null ? void 0 : _g.wallet_name,
          transport: (_h = nextUser.svm) == null ? void 0 : _h.transport,
          capabilities: (_i = nextUser.svm) == null ? void 0 : _i.capabilities
        }
      };
    },
    []
  );
  const lastWalletStateRef = useRef6(walletSnapshot(user));
  useEffect7(() => {
    const nextWalletState = walletSnapshot(user);
    const prevWalletState = lastWalletStateRef.current;
    if (stableStateString2(prevWalletState) === stableStateString2(nextWalletState)) {
      return;
    }
    lastWalletStateRef.current = nextWalletState;
    const wasConnected = prevWalletState.connection.is_connected;
    const isConnected = nextWalletState.connection.is_connected;
    if (wasConnected !== isConnected) {
      showNotification({
        type: "wallet",
        title: isConnected ? "Wallet connected" : "Wallet disconnected"
      });
    }
  }, [showNotification, user, walletSnapshot]);
}
function useRemoteThreadListSync(context, sessions, remoteThreads, accountSessionAvailable, threadPersistence) {
  const [isThreadListLoading, setIsThreadListLoading] = useState6(true);
  const [threadListError, setThreadListError] = useState6(false);
  const prefetchCancelRef = useRef6(null);
  const hadThreadAccessRef = useRef6(false);
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
  const canLoadThreads = isConnected || accountSessionAvailable;
  const restoredThreadId = threadPersistence == null ? void 0 : threadPersistence.restoredThreadId;
  const listThreadsWithAuthRetry = useCallback10(
    async (_sessionId, isCancelled) => {
      let nextDelay = THREAD_LIST_AUTH_RETRY_BASE_DELAY_MS;
      let waitedMs = 0;
      for (; ; ) {
        try {
          return await aomiClientRef.current.agent.sessions.all();
        } catch (error) {
          if (isCancelled() || getHttpStatus(error) !== 401 || waitedMs >= THREAD_LIST_AUTH_RETRY_BUDGET_MS) {
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
  const scheduleThreadPrefetch = useCallback10(
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
            var _a2;
            if (cancelled || !remoteThreadIdsRef.current.has(threadId)) return;
            if ((_a2 = sessionManager.get(threadId)) == null ? void 0 : _a2.getSnapshot().messages.length) {
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
    [ensureInitialState, remoteThreadIdsRef, sessionManager, warmThread]
  );
  useEffect7(() => {
    var _a, _b;
    if (!canLoadThreads) {
      const previouslyHadThreadAccess = hadThreadAccessRef.current;
      hadThreadAccessRef.current = false;
      setIsThreadListLoading(false);
      (_a = prefetchCancelRef.current) == null ? void 0 : _a.call(prefetchCancelRef);
      prefetchCancelRef.current = null;
      if (previouslyHadThreadAccess) {
        const hadRemoteThreads = remoteThreadIdsRef.current.size > 0;
        const hadSessions = sessionManager.size > 0;
        remoteThreadIdsRef.current.clear();
        warmedThreadIdsRef.current.clear();
        warmPromisesRef.current.clear();
        closeAllSessions();
        if (hadRemoteThreads || hadSessions) {
          threadContextRef.current.resetToDefault();
          (_b = threadPersistence == null ? void 0 : threadPersistence.onInvalidRestoredThread) == null ? void 0 : _b.call(threadPersistence);
        }
      }
      return;
    }
    hadThreadAccessRef.current = true;
    let cancelled = false;
    setIsThreadListLoading(true);
    setThreadListError(false);
    const fetchThreadList = async () => {
      var _a2, _b2, _c, _d, _e;
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
        const previousMetadata = currentContext.allThreadsMetadata;
        const newMetadata = /* @__PURE__ */ new Map();
        const baseThreadCount = currentContext.threadCnt;
        let maxChatNum = baseThreadCount;
        for (const thread of threadList) {
          remoteThreadIds.add(thread.id);
          const rawTitle = (_a2 = thread.title) != null ? _a2 : "";
          const title = isPlaceholderTitle(rawTitle) ? "" : rawTitle;
          const serverLastActiveAt = thread.updatedAt;
          const lastActive = (serverLastActiveAt != null ? serverLastActiveAt : (_b2 = previousMetadata.get(thread.id)) == null ? void 0 : _b2.lastActiveAt) || (/* @__PURE__ */ new Date()).toISOString();
          const existingControl = (_c = previousMetadata.get(thread.id)) == null ? void 0 : _c.control;
          newMetadata.set(thread.id, {
            title,
            status: thread.archived ? "archived" : "regular",
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
        for (const [threadId, metadata] of previousMetadata.entries()) {
          if (!newMetadata.has(threadId)) {
            newMetadata.set(threadId, metadata);
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
        scheduleThreadPrefetch(threadList.map((thread) => thread.id));
        const activeThreadId = threadContextRef.current.currentThreadId;
        let threadIdToLoad = activeThreadId;
        const activeHasUserMessage = Boolean(
          (_d = sessionManager.get(activeThreadId)) == null ? void 0 : _d.getSnapshot().messages.some((message) => message.sender === "user")
        );
        if (restoredThreadId && activeThreadId === restoredThreadId && !remoteThreadIds.has(activeThreadId) && !activeHasUserMessage) {
          (_e = threadPersistence == null ? void 0 : threadPersistence.onInvalidRestoredThread) == null ? void 0 : _e.call(threadPersistence);
          currentContext.setThreadMetadata((prev) => {
            const next = new Map(prev);
            next.delete(activeThreadId);
            return next;
          });
          const fallbackThread = threadList.filter((thread) => !thread.archived).sort((a, b) => b.updatedAt - a.updatedAt)[0];
          if (fallbackThread) {
            threadIdToLoad = fallbackThread.id;
            currentContext.setCurrentThreadId(fallbackThread.id);
            currentContext.bumpThreadViewKey();
          } else {
            threadIdToLoad = currentContext.resetToDefault();
          }
        }
        if (remoteThreadIds.has(threadIdToLoad)) {
          setIsThreadLoading(true);
          try {
            await warmThread(threadIdToLoad);
            if (!cancelled) {
              await ensureInitialState(threadIdToLoad);
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
    canLoadThreads,
    closeAllSessions,
    ensureInitialState,
    getControlState,
    listThreadsWithAuthRetry,
    remoteThreadIdsRef,
    scheduleThreadPrefetch,
    sessionManager,
    setIsThreadLoading,
    threadContextRef,
    restoredThreadId,
    threadPersistence,
    warmPromisesRef,
    warmedThreadIdsRef,
    warmThread
  ]);
  return { isThreadListLoading, threadListError };
}
function useThreadListSync({
  sessions: {
    aomiClientRef,
    sessionManager,
    closeAllSessions,
    ensureInitialState,
    setIsThreadLoading
  },
  remoteThreads,
  accountSessionAvailable = false,
  threadPersistence
}) {
  const threadContext = useThreadContext();
  const { user } = useUser();
  const { getControlState } = useControl();
  const threadContextRef = useRef6(threadContext);
  threadContextRef.current = threadContext;
  const context = {
    getControlState,
    threadContextRef,
    user
  };
  const sessions = {
    aomiClientRef,
    sessionManager,
    closeAllSessions,
    ensureInitialState,
    setIsThreadLoading
  };
  useWalletStateNotifications(user);
  return useRemoteThreadListSync(
    context,
    sessions,
    remoteThreads,
    accountSessionAvailable,
    threadPersistence
  );
}

// src/runtime/thread-persistence.ts
var THREAD_PERSISTENCE_KEY_PREFIX = "aomi:lastThread";
var DEFAULT_SCOPE = "default";
var normalizeKeyPart = (value) => {
  if (value === null || value === void 0) return DEFAULT_SCOPE;
  const text = String(value).trim();
  return text.length > 0 ? text : DEFAULT_SCOPE;
};
function buildThreadPersistenceKey({
  backendUrl,
  applicationId,
  scope
}) {
  return [
    THREAD_PERSISTENCE_KEY_PREFIX,
    normalizeKeyPart(backendUrl),
    normalizeKeyPart(applicationId),
    normalizeKeyPart(scope)
  ].join(":");
}
function readPersistedThreadId(storageKey) {
  var _a, _b;
  try {
    const threadId = (_b = (_a = globalThis.localStorage) == null ? void 0 : _a.getItem(storageKey)) == null ? void 0 : _b.trim();
    return threadId && threadId.length > 0 ? threadId : null;
  } catch (e) {
    return null;
  }
}
function writePersistedThreadId(storageKey, threadId) {
  var _a;
  try {
    (_a = globalThis.localStorage) == null ? void 0 : _a.setItem(storageKey, threadId);
  } catch (e) {
  }
}
function clearPersistedThreadId(storageKey) {
  var _a;
  try {
    (_a = globalThis.localStorage) == null ? void 0 : _a.removeItem(storageKey);
  } catch (e) {
  }
}

// src/runtime/core.tsx
import { jsx as jsx5 } from "react/jsx-runtime";
function appendMessageText(message) {
  return message.content.filter(
    (part) => part.type === "text"
  ).map((part) => part.text).join("\n");
}
function AomiRuntimeCore({
  children,
  aomiClient,
  applicationId,
  actions: actionCapabilities,
  accountSessionAvailable = false,
  restoredThreadId,
  threadPersistenceKey
}) {
  const threadContext = useThreadContext();
  const notificationContext = useNotification();
  const { getUserState } = useUser();
  const {
    getControlState,
    getCurrentThreadControl,
    getCurrentThreadApplicationId,
    getCurrentThreadApp,
    getPreferredThreadControl,
    markControlSynced
  } = useControl();
  const {
    sessionManager,
    currentSession,
    snapshot,
    getSession,
    ensureInitialState,
    sendMessage: orchestratorSendMessage,
    cancelGeneration: orchestratorCancel,
    closeSession,
    closeAllSessions,
    aomiClientRef
  } = useRuntimeOrchestrator(aomiClient, {
    getUserState,
    getApp: getCurrentThreadApp,
    getModel: () => getCurrentThreadControl().model,
    getApplicationId: () => {
      var _a;
      return (_a = getCurrentThreadApplicationId()) != null ? _a : applicationId;
    },
    getClientId: () => {
      var _a;
      return (_a = getControlState().clientId) != null ? _a : void 0;
    },
    getActions: () => actionCapabilities,
    onSendSuccess: (threadId) => {
      const wasRemote = remoteThreadIdsRef.current.has(threadId);
      remoteThreadIdsRef.current.add(threadId);
      warmedThreadIdsRef.current.add(threadId);
      if (threadPersistenceKey) {
        writePersistedThreadId(threadPersistenceKey, threadId);
      }
      if (!wasRemote && threadContextRef.current.currentThreadId === threadId) {
        markControlSynced();
      }
    },
    onSendError: (_threadId, error) => {
      const httpStatus = getHttpStatus(error);
      if (httpStatus === 402) {
        notificationContext.showNotification({
          type: "error",
          kind: "payment_required",
          title: "You're out of funds"
        });
      }
    }
  });
  const actions = useActions(currentSession);
  const isRunning = snapshot.isSubmitting || snapshot.turnState === "processing";
  const threadContextRef = useRef7(threadContext);
  threadContextRef.current = threadContext;
  const remoteThreadIdsRef = useRef7(/* @__PURE__ */ new Set());
  const warmedThreadIdsRef = useRef7(/* @__PURE__ */ new Set());
  const warmPromisesRef = useRef7(/* @__PURE__ */ new Map());
  const [isThreadLoading, setIsThreadLoading] = useState7(false);
  const warmThread = useCallback11(async (threadId) => {
    if (!remoteThreadIdsRef.current.has(threadId) || warmedThreadIdsRef.current.has(threadId)) {
      return;
    }
    warmedThreadIdsRef.current.add(threadId);
  }, []);
  const getRuntimeSession = useCallback11(
    (threadId) => {
      var _a;
      return (_a = sessionManager.get(threadId)) != null ? _a : getSession(threadId);
    },
    [getSession, sessionManager]
  );
  const threadPersistence = useMemo3(
    () => ({
      restoredThreadId,
      onInvalidRestoredThread: () => {
        if (threadPersistenceKey) {
          clearPersistedThreadId(threadPersistenceKey);
        }
      }
    }),
    [restoredThreadId, threadPersistenceKey]
  );
  const { isThreadListLoading, threadListError } = useThreadListSync({
    sessions: {
      aomiClientRef,
      sessionManager,
      closeAllSessions,
      ensureInitialState,
      setIsThreadLoading
    },
    remoteThreads: {
      remoteThreadIdsRef,
      warmPromisesRef,
      warmedThreadIdsRef,
      warmThread
    },
    accountSessionAvailable,
    threadPersistence
  });
  useEffect8(() => {
    const threadId = threadContext.currentThreadId;
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
    ensureInitialState,
    threadContext.currentThreadId,
    warmThread
  ]);
  const currentMessages = useMemo3(
    () => projectAssistantMessages(snapshot.events),
    [snapshot.events]
  );
  useEffect8(() => {
    if (!threadPersistenceKey) return;
    const threadId = threadContext.currentThreadId;
    if (!remoteThreadIdsRef.current.has(threadId)) {
      return;
    }
    writePersistedThreadId(threadPersistenceKey, threadId);
  }, [
    threadContext.allThreadsMetadata,
    threadContext.currentThreadId,
    threadPersistenceKey
  ]);
  const threadListAdapter = useMemo3(
    () => buildThreadListAdapter({
      aomiClientRef,
      threadContext,
      isLoading: isThreadListLoading,
      getInitialControl: getPreferredThreadControl,
      isRemoteThread: (threadId) => remoteThreadIdsRef.current.has(threadId)
    }),
    [
      aomiClientRef,
      getPreferredThreadControl,
      isThreadListLoading,
      threadContext,
      threadContext.currentThreadId,
      threadContext.allThreadsMetadata,
      currentMessages
    ]
  );
  const runtime = useExternalStoreRuntime({
    messages: currentMessages,
    isLoading: isThreadLoading,
    isRunning,
    onNew: async (message) => {
      const text = appendMessageText(message);
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
      warmPromisesRef.current.clear();
      closeAllSessions();
    };
  }, [closeAllSessions]);
  const userContext = useUser();
  const sendMessage = useCallback11(
    async (text) => {
      await orchestratorSendMessage(text, threadContext.currentThreadId);
    },
    [orchestratorSendMessage, threadContext.currentThreadId]
  );
  const cancelGeneration = useCallback11(() => {
    void orchestratorCancel(threadContext.currentThreadId);
  }, [orchestratorCancel, threadContext.currentThreadId]);
  const getMessages = useCallback11(
    (threadId) => {
      const id = threadId != null ? threadId : threadContext.currentThreadId;
      const session = sessionManager.get(id);
      if (!session) return [];
      return projectAssistantMessages(session.getSnapshot().events);
    },
    [threadContext]
  );
  const createThread = useCallback11(async () => {
    await threadListAdapter.onSwitchToNewThread();
    return threadContextRef.current.currentThreadId;
  }, [threadListAdapter]);
  const deleteThread = useCallback11(
    async (threadId) => {
      closeSession(threadId);
      await threadListAdapter.onDelete(threadId);
      remoteThreadIdsRef.current.delete(threadId);
      warmedThreadIdsRef.current.delete(threadId);
      warmPromisesRef.current.delete(threadId);
      const nextThreadId = threadContextRef.current.currentThreadId;
      if (!remoteThreadIdsRef.current.has(nextThreadId) && threadPersistenceKey) {
        clearPersistedThreadId(threadPersistenceKey);
      }
    },
    [closeSession, threadListAdapter, threadPersistenceKey]
  );
  const selectThread = useCallback11(
    (threadId) => {
      if (threadContext.allThreadsMetadata.has(threadId)) {
        threadListAdapter.onSwitchToThread(threadId);
      } else {
        void threadListAdapter.onSwitchToNewThread();
      }
    },
    [threadContext.allThreadsMetadata, threadListAdapter]
  );
  const simulateBatchTransactions = useCallback11(
    async (transactions, options) => {
      const session = getRuntimeSession(threadContext.currentThreadId);
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
    [getRuntimeSession, threadContext.currentThreadId]
  );
  const aomiRuntimeApi = useMemo3(
    () => ({
      // User API
      user: userContext.user,
      getUserState: userContext.getUserState,
      setUser: userContext.setUser,
      addExtValue: userContext.addExtValue,
      removeExtValue: userContext.removeExtValue,
      // Thread API
      currentThreadId: threadContext.currentThreadId,
      threadViewKey: threadContext.threadViewKey,
      threadMetadata: threadContext.allThreadsMetadata,
      threadListError,
      getThreadMetadata: threadContext.getThreadMetadata,
      createThread,
      deleteThread,
      renameThread: (threadId, title) => threadListAdapter.onRename(threadId, title),
      archiveThread: (threadId) => threadListAdapter.onArchive(threadId),
      selectThread,
      // Chat API
      isRunning,
      isSubmitting: snapshot.isSubmitting,
      getMessages,
      sendMessage,
      cancelGeneration,
      // Notification API
      notifications: notificationContext.notifications,
      showNotification: notificationContext.showNotification,
      dismissNotification: notificationContext.dismissNotification,
      clearAllNotifications: notificationContext.clearAll,
      // Action API
      pendingActions: actions.pendingActions,
      actionAttempts: actions.actionAttempts,
      hasBlockingActions: actions.hasBlockingActions,
      executeAction: actions.executeAction,
      respondToAction: actions.respondToAction,
      rejectAction: actions.rejectAction,
      simulateBatchTransactions,
      events: snapshot.events,
      turnState: snapshot.turnState
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
      threadListAdapter,
      selectThread,
      isRunning,
      snapshot.isSubmitting,
      getMessages,
      sendMessage,
      cancelGeneration,
      notificationContext,
      actions,
      simulateBatchTransactions,
      snapshot.events,
      snapshot.turnState
    ]
  );
  return /* @__PURE__ */ jsx5(AomiRuntimeApiProvider, { value: aomiRuntimeApi, children: /* @__PURE__ */ jsx5(AssistantRuntimeProvider, { runtime, children }) });
}

// src/runtime/aomi-runtime.tsx
import { jsx as jsx6 } from "react/jsx-runtime";
function AomiRuntimeProvider({
  children,
  backendUrl = "http://127.0.0.1:8080",
  applicationId,
  appPlatforms,
  clientOptions,
  actions,
  accountSessionAvailable = false,
  initialThreadId,
  persistThread = true,
  threadPersistenceKey,
  threadPersistenceScope
}) {
  const resolvedThreadPersistenceKey = useMemo4(() => {
    if (!persistThread) return null;
    return threadPersistenceKey != null ? threadPersistenceKey : buildThreadPersistenceKey({
      backendUrl,
      applicationId,
      scope: threadPersistenceScope
    });
  }, [
    applicationId,
    backendUrl,
    persistThread,
    threadPersistenceKey,
    threadPersistenceScope
  ]);
  const restoredThreadId = useMemo4(() => {
    var _a;
    if (initialThreadId) return initialThreadId;
    if (!resolvedThreadPersistenceKey) return void 0;
    return (_a = readPersistedThreadId(resolvedThreadPersistenceKey)) != null ? _a : void 0;
  }, [initialThreadId, resolvedThreadPersistenceKey]);
  const resolvedClientOptions = useMemo4(
    () => __spreadValues({
      logger: {
        debug: (...args) => console.debug(...args)
      }
    }, clientOptions),
    [clientOptions]
  );
  const aomiClient = useMemo4(
    () => new AomiClient(__spreadValues({
      baseUrl: backendUrl
    }, resolvedClientOptions)),
    [backendUrl, resolvedClientOptions]
  );
  return /* @__PURE__ */ jsx6(ThreadContextProvider, { initialThreadId: restoredThreadId, children: /* @__PURE__ */ jsx6(NotificationContextProvider, { children: /* @__PURE__ */ jsx6(ExtUserProvider, { children: /* @__PURE__ */ jsx6(
    AomiRuntimeInner,
    {
      aomiClient,
      applicationId,
      appPlatforms,
      accountSessionAvailable,
      actions,
      restoredThreadId,
      threadPersistenceKey: resolvedThreadPersistenceKey,
      children
    }
  ) }) }) });
}
function AomiRuntimeInner({
  children,
  aomiClient,
  applicationId,
  appPlatforms,
  accountSessionAvailable,
  actions,
  restoredThreadId,
  threadPersistenceKey
}) {
  const threadContext = useThreadContext();
  return /* @__PURE__ */ jsx6(
    ControlContextProvider,
    {
      aomiClient,
      sessionId: threadContext.currentThreadId,
      getThreadMetadata: threadContext.getThreadMetadata,
      updateThreadMetadata: threadContext.updateThreadMetadata,
      appPlatforms,
      applicationId,
      children: /* @__PURE__ */ jsx6(
        AomiRuntimeCore,
        {
          aomiClient,
          applicationId,
          accountSessionAvailable,
          actions,
          restoredThreadId,
          threadPersistenceKey,
          children
        }
      )
    }
  );
}

// src/runtime/task-runs.ts
import { useMemo as useMemo5 } from "react";
var EMPTY_TASK_RUNS = Object.freeze({});
var isTaskEvent = (event) => event.type === "task_started" || event.type === "task_phase" || event.type === "task_activity" || event.type === "task_completed";
var emptyRun = (event) => ({
  agentId: event.agent_id,
  callId: event.call_id,
  label: "",
  app: "",
  status: "running",
  startedAt: event.occurred_at,
  steps: []
});
var insertStep = (steps, event) => {
  if (steps.some((step2) => step2.childSeq === event.child_seq)) return steps;
  const step = event.kind === "note" ? { kind: "note", text: event.text, childSeq: event.child_seq } : {
    kind: "tool_call",
    toolName: event.tool_name,
    args: event.args,
    resultPreview: event.result_preview,
    childSeq: event.child_seq
  };
  return [...steps, step].sort((left, right) => left.childSeq - right.childSeq);
};
function selectTaskRuns(events) {
  return events.filter(isTaskEvent).reduce(
    (runs, event) => {
      var _a, _b;
      const current = (_a = runs[event.agent_id]) != null ? _a : emptyRun(event);
      switch (event.type) {
        case "task_started":
          runs[event.agent_id] = __spreadProps(__spreadValues({}, current), {
            callId: event.call_id,
            label: (_b = event.label) != null ? _b : "",
            app: event.app,
            startedAt: event.occurred_at
          });
          break;
        case "task_phase":
          runs[event.agent_id] = __spreadProps(__spreadValues({}, current), {
            app: event.app,
            phase: event.phase,
            elapsedMs: event.elapsed_ms
          });
          break;
        case "task_activity":
          runs[event.agent_id] = __spreadProps(__spreadValues({}, current), {
            steps: insertStep(current.steps, event)
          });
          break;
        case "task_completed":
          runs[event.agent_id] = __spreadProps(__spreadValues({}, current), {
            status: event.status,
            message: event.message,
            stagedCount: event.staged_count,
            stepCount: event.steps,
            durationMs: event.duration_ms
          });
          break;
      }
      return runs;
    },
    {}
  );
}
function useThreadTaskRuns() {
  const { events } = useAomiRuntime();
  return useMemo5(() => selectTaskRuns(events), [events]);
}
function useTaskRun(agentId) {
  const runs = useThreadTaskRuns();
  return agentId ? runs[agentId] : void 0;
}
export {
  AomiClient2 as AomiClient,
  AomiRuntimeApiProvider,
  AomiRuntimeProvider,
  ControlContextProvider,
  EMPTY_TASK_RUNS,
  ExtUserProvider,
  MAX_AUTO_FEE_WEI,
  NotificationContextProvider,
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
  initThreadControl,
  normalizeAppDescriptor,
  normalizeSimulatedFee,
  parseChainId,
  projectAssistantMessages,
  resolveAutoModel,
  selectTaskRuns,
  toAAWalletCall,
  toAAWalletCalls,
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
  useActions,
  useAomiRuntime,
  useApiKey,
  useAuthEndpoints,
  useByok,
  useControl,
  useCurrentThreadMetadata,
  useNotification,
  useOptionalAomiRuntime,
  usePerThreadControl,
  useTaskRun,
  useThreadContext,
  useThreadTaskRuns,
  useUser
};
//# sourceMappingURL=index.js.map