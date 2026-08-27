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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AOMI_TASK_EVENT_TYPES: () => import_client12.AOMI_TASK_EVENT_TYPES,
  AomiClient: () => import_client10.AomiClient,
  AomiRuntimeApiProvider: () => AomiRuntimeApiProvider,
  AomiRuntimeProvider: () => AomiRuntimeProvider,
  ControlContextProvider: () => ControlContextProvider,
  EMPTY_TASK_RUNS: () => EMPTY_TASK_RUNS,
  EventContextProvider: () => EventContextProvider,
  ExtUserProvider: () => ExtUserProvider,
  MAX_AUTO_FEE_WEI: () => import_client11.MAX_AUTO_FEE_WEI,
  NotificationContextProvider: () => NotificationContextProvider,
  RuntimeUserStateProvider: () => RuntimeUserStateProvider,
  SUPPORTED_CHAINS: () => SUPPORTED_CHAINS,
  ThreadContextProvider: () => ThreadContextProvider,
  UserState: () => import_client4.UserState,
  aaModeFromExecutionKind: () => import_client11.aaModeFromExecutionKind,
  appIdentityKey: () => import_client11.appIdentityKey,
  appendFeeCallToPayload: () => import_client11.appendFeeCallToPayload,
  buildFeeAAWalletCall: () => import_client11.buildFeeAAWalletCall,
  cn: () => cn,
  executeWalletCalls: () => import_client11.executeWalletCalls,
  formatAddress: () => formatAddress,
  getChainInfo: () => getChainInfo,
  getNetworkName: () => getNetworkName,
  initThreadControl: () => initThreadControl,
  isAomiTaskEventType: () => import_client12.isAomiTaskEventType,
  normalizeAppDescriptor: () => import_client11.normalizeAppDescriptor,
  normalizeSimulatedFee: () => import_client11.normalizeSimulatedFee,
  parseAomiTaskEvent: () => import_client12.parseAomiTaskEvent,
  parseChainId: () => import_client11.parseChainId,
  readTaskPartAgentId: () => readTaskPartAgentId,
  reduceTaskRuns: () => reduceTaskRuns,
  resolveAutoModel: () => resolveAutoModel,
  toAAWalletCall: () => import_client11.toAAWalletCall,
  toAAWalletCalls: () => import_client11.toAAWalletCalls,
  toViemSignMessageArgs: () => import_client11.toViemSignMessageArgs,
  toViemSignTypedDataArgs: () => import_client11.toViemSignTypedDataArgs,
  useActionHandler: () => useActionHandler,
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
  useTaskRun: () => useTaskRun,
  useThreadContext: () => useThreadContext,
  useThreadTaskRuns: () => useThreadTaskRuns,
  useUser: () => useUser
});
module.exports = __toCommonJS(index_exports);
var import_client10 = require("@aomi-labs/client");
var import_client11 = require("@aomi-labs/client");

// src/runtime/aomi-runtime.tsx
var import_react16 = require("react");
var import_client9 = require("@aomi-labs/client");

// src/contexts/control-context.tsx
var import_react5 = require("react");

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

// src/control/byok.ts
var import_react2 = require("react");
var import_client = require("@aomi-labs/client");
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
  const clearSecrets = (0, import_react2.useCallback)(
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
  const deleteSecret = (0, import_react2.useCallback)(
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
  const listSecrets = (0, import_react2.useCallback)(async () => {
    var _a;
    const response = await aomiClientRef.current.listSecrets(
      getControlSessionId2(),
      (_a = clientIdRef.current) != null ? _a : void 0
    );
    return (0, import_client.secretNamesFrom)(response);
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

// src/control/auth-endpoints.ts
var import_react3 = require("react");

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
  const [availableModels, setAvailableModels] = (0, import_react3.useState)([]);
  const [defaultModel, setDefaultModel] = (0, import_react3.useState)(null);
  const [authorizedApps, setAuthorizedApps] = (0, import_react3.useState)([]);
  const [appDescriptors, setAppDescriptors] = (0, import_react3.useState)([]);
  const [defaultApp, setDefaultApp] = (0, import_react3.useState)(null);
  const getAvailableModels = (0, import_react3.useCallback)(async () => {
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
  const getAuthorizedApps = (0, import_react3.useCallback)(async () => {
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
  (0, import_react3.useEffect)(() => {
    void getAvailableModels();
  }, [getAvailableModels]);
  (0, import_react3.useEffect)(() => {
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
var import_react4 = require("react");

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

// src/utils/env.ts
var import_client2 = require("@aomi-labs/client");

// src/state/thread-store.ts
var threadLogEnv = (0, import_client2.safeEnv)(() => process.env.NODE_ENV);
var shouldLogThreadUpdates = threadLogEnv !== void 0 && threadLogEnv !== "production";
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
var EMPTY_TASK_RUNS = Object.freeze({});
var toStatus = (status) => {
  switch (status) {
    case "failed":
    case "stalled":
    case "cancelled":
    case "completed":
      return status;
    default:
      return "completed";
  }
};
var toStep = (event) => {
  var _a, _b;
  return event.kind === "note" ? { kind: "note", text: (_a = event.text) != null ? _a : "", childSeq: event.child_seq } : __spreadValues(__spreadValues({
    kind: "tool_call",
    toolName: (_b = event.tool_name) != null ? _b : "unknown",
    childSeq: event.child_seq
  }, event.args !== void 0 ? { args: event.args } : null), event.result_preview !== void 0 ? { resultPreview: event.result_preview } : null);
};
var insertStep = (steps, step) => {
  let index = steps.length;
  for (let i = steps.length - 1; i >= 0; i--) {
    const existing = steps[i];
    if (existing.childSeq === step.childSeq) return steps;
    if (existing.childSeq < step.childSeq) break;
    index = i;
  }
  const next = steps.slice();
  next.splice(index, 0, step);
  return next;
};
var initTaskRun = (agentId, callId, startedAt) => ({
  agentId,
  callId,
  label: "",
  app: null,
  status: "running",
  startedAt,
  steps: []
});
function reduceTaskRuns(runs, event, now = Date.now()) {
  var _a, _b;
  const agentId = event.agent_id;
  if (!agentId) return runs;
  const existing = runs[agentId];
  if (event.type === "task_started") {
    const app = (_a = event.app) != null ? _a : null;
    const label = (_b = event.label) != null ? _b : "";
    if (existing) {
      if (existing.label === label && existing.app === app && existing.callId === event.call_id) {
        return runs;
      }
      return __spreadProps(__spreadValues({}, runs), {
        [agentId]: __spreadProps(__spreadValues({}, existing), { label, app, callId: event.call_id })
      });
    }
    return __spreadProps(__spreadValues({}, runs), {
      [agentId]: __spreadProps(__spreadValues({}, initTaskRun(agentId, event.call_id, now)), {
        label,
        app
      })
    });
  }
  if (event.type === "task_activity") {
    const base2 = existing != null ? existing : initTaskRun(agentId, event.call_id, now);
    const steps = insertStep(base2.steps, toStep(event));
    if (existing && steps === existing.steps) return runs;
    return __spreadProps(__spreadValues({}, runs), { [agentId]: __spreadProps(__spreadValues({}, base2), { steps }) });
  }
  const base = existing != null ? existing : initTaskRun(agentId, event.call_id, now);
  const next = __spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadProps(__spreadValues({}, base), {
    status: toStatus(event.status)
  }), event.message !== void 0 ? { message: event.message } : null), event.staged_count !== void 0 ? { stagedCount: event.staged_count } : null), event.steps !== void 0 ? { stepCount: event.steps } : null), event.duration_ms !== void 0 ? { durationMs: event.duration_ms } : null);
  if (existing && existing.status === next.status && existing.message === next.message && existing.stagedCount === next.stagedCount && existing.stepCount === next.stepCount && existing.durationMs === next.durationMs) {
    return runs;
  }
  return __spreadProps(__spreadValues({}, runs), { [agentId]: next });
}
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
    this.getThreadTaskRuns = (threadId) => {
      var _a;
      return (_a = this.state.threadTaskRuns.get(threadId)) != null ? _a : EMPTY_TASK_RUNS;
    };
    /**
     * Fold a delegation SSE event into the thread's task-run sidecar. No-ops when
     * the reducer returns the same object (replayed / duplicate events), so an
     * SSE replay after reconnect never re-renders the trace.
     */
    this.applyTaskEvent = (threadId, event) => {
      var _a;
      const current = (_a = this.state.threadTaskRuns.get(threadId)) != null ? _a : EMPTY_TASK_RUNS;
      const next = reduceTaskRuns(current, event);
      if (next === current) return;
      const nextTaskRuns = new Map(this.state.threadTaskRuns);
      nextTaskRuns.set(threadId, next);
      this.updateState({ threadTaskRuns: nextTaskRuns });
    };
    this.clearThreadTaskRuns = (threadId) => {
      if (!this.state.threadTaskRuns.has(threadId)) return;
      const nextTaskRuns = new Map(this.state.threadTaskRuns);
      nextTaskRuns.delete(threadId);
      this.updateState({ threadTaskRuns: nextTaskRuns });
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
        ]),
        threadTaskRuns: /* @__PURE__ */ new Map()
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
      ]),
      threadTaskRuns: /* @__PURE__ */ new Map()
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
      allThreadTaskRuns: this.state.threadTaskRuns,
      getThreadTaskRuns: this.getThreadTaskRuns,
      applyTaskEvent: this.applyTaskEvent,
      clearThreadTaskRuns: this.clearThreadTaskRuns,
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
  const getCurrentThreadApplicationId = (0, import_react4.useCallback)(() => {
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
  const onModelSelect = (0, import_react4.useCallback)(
    async (model, options) => {
      var _a2, _b2, _c, _d;
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
      writeStoredModelPreference({
        mode: modelMode,
        model: modelMode === "manual" ? model : null
      });
    },
    []
  );
  const onAppSelect = (0, import_react4.useCallback)(
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
  const syncCurrentThreadControl = (0, import_react4.useCallback)(
    async (options) => {
      void options;
    },
    []
  );
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
  appPlatforms,
  applicationId
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
    apiKey: apiKey.state.apiKey,
    appPlatforms,
    applicationId
  });
  const availableModelsRef = (0, import_react5.useRef)(authEndpoints.state.availableModels);
  availableModelsRef.current = authEndpoints.state.availableModels;
  const defaultModelRef = (0, import_react5.useRef)(authEndpoints.state.defaultModel);
  defaultModelRef.current = authEndpoints.state.defaultModel;
  const authorizedAppsRef = (0, import_react5.useRef)(authEndpoints.state.authorizedApps);
  authorizedAppsRef.current = authEndpoints.state.authorizedApps;
  const appDescriptorsRef = (0, import_react5.useRef)(authEndpoints.state.appDescriptors);
  appDescriptorsRef.current = authEndpoints.state.appDescriptors;
  const defaultAppRef = (0, import_react5.useRef)(authEndpoints.state.defaultApp);
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

// src/contexts/event-context.tsx
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
function EventContextProvider({ children }) {
  const subscribersRef = (0, import_react6.useRef)(/* @__PURE__ */ new Map());
  const subscribe = (0, import_react6.useCallback)((type, callback) => {
    const subs = subscribersRef.current;
    if (!subs.has(type)) {
      subs.set(type, /* @__PURE__ */ new Set());
    }
    subs.get(type).add(callback);
    return () => {
      var _a;
      (_a = subs.get(type)) == null ? void 0 : _a.delete(callback);
    };
  }, []);
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
  const contextValue = {
    subscribe,
    dispatch: dispatchEvent,
    // SSE is managed by ClientSession now — status is always "connected"
    // when sessions are active. Individual session status can be queried
    // from the session manager if needed.
    sseStatus: "connected"
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(EventContextState.Provider, { value: contextValue, children });
}

// src/contexts/notification-context.tsx
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

// src/contexts/thread-context.tsx
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
function useThreadTaskRuns(threadId) {
  const { currentThreadId, allThreadTaskRuns } = useThreadContext();
  const resolvedThreadId = threadId != null ? threadId : currentThreadId;
  return (0, import_react8.useMemo)(
    () => {
      var _a;
      return (_a = allThreadTaskRuns.get(resolvedThreadId)) != null ? _a : EMPTY_TASK_RUNS;
    },
    [allThreadTaskRuns, resolvedThreadId]
  );
}
function useTaskRun(agentId, threadId) {
  const taskRuns = useThreadTaskRuns(threadId);
  return agentId ? taskRuns[agentId] : void 0;
}

// src/contexts/ext-user-context.tsx
var import_react9 = require("react");
var import_client3 = require("@aomi-labs/client");
var import_client4 = require("@aomi-labs/client");
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
  const chainId = import_client3.UserState.chainId(state);
  return (_a = import_client3.UserState.normalize({
    connection: { is_connected: false },
    evm: chainId === void 0 ? void 0 : { chain_id: chainId },
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
  return (_a = import_client3.UserState.normalize(next)) != null ? _a : {};
}
function stableStateString(state) {
  var _a;
  return JSON.stringify((_a = import_client3.UserState.normalize(state)) != null ? _a : {});
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
        const normalizedData = (_a = import_client3.UserState.normalize(data)) != null ? _a : {};
        const merged = (_c = import_client3.UserState.normalize(
          mergeRecords(
            (_b = import_client3.UserState.normalize(prev)) != null ? _b : {},
            normalizedData
          )
        )) != null ? _c : prev;
        let next;
        if (import_client3.UserState.isConnected(normalizedData) === false) {
          next = dropWalletBlocks(merged);
        } else {
          const prevAddress = import_client3.UserState.address(prev);
          const nextAddress = import_client3.UserState.address(merged);
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
        const next = import_client3.UserState.withExt(prev, key, value);
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

// src/runtime/core.tsx
var import_react14 = require("react");
var import_react15 = require("@assistant-ui/react");

// src/runtime/orchestrator.ts
var import_react10 = require("react");
var import_client7 = require("@aomi-labs/client");

// src/runtime/session-manager.ts
var import_client5 = require("@aomi-labs/client");
var SessionManager = class {
  constructor(clientFactory) {
    this.clientFactory = clientFactory;
    this.sessions = /* @__PURE__ */ new Map();
  }
  getOrCreate(threadId, opts) {
    let session = this.sessions.get(threadId);
    if (session) return session;
    session = new import_client5.Session(this.clientFactory(), __spreadProps(__spreadValues({}, opts), {
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
      if (session.getPendingActions().length > 0) continue;
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
var import_client6 = require("@aomi-labs/client");
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
var SYSTEM_ENDPOINT_ECHO_PREFIX = "Response of system endpoint:";
var SVM_COMPLETE_TYPES = /* @__PURE__ */ new Set([
  "wallet::solana_sign_complete",
  "wallet::solana_send_complete",
  "wallet::solana_sign_and_send_complete"
]);
function collectTxOutcomes(messages) {
  var _a;
  let evm = null;
  let svm = null;
  let svmByTx = null;
  for (const msg of messages) {
    if (msg.sender !== "system" || !((_a = msg.content) == null ? void 0 : _a.startsWith(SYSTEM_ENDPOINT_ECHO_PREFIX))) {
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(
        msg.content.slice(SYSTEM_ENDPOINT_ECHO_PREFIX.length)
      );
    } catch (e) {
      continue;
    }
    if (typeof parsed !== "object" || parsed === null) continue;
    const type = parsed.type;
    const payload = parsed.payload;
    if (typeof payload !== "object" || payload === null) continue;
    if (type === "wallet:tx_complete") {
      const { status, txHash, error, pending_tx_ids } = payload;
      if (status !== "success" && status !== "failed") continue;
      if (!Array.isArray(pending_tx_ids)) continue;
      for (const id of pending_tx_ids) {
        if (typeof id !== "number" || !Number.isInteger(id)) continue;
        evm != null ? evm : evm = /* @__PURE__ */ new Map();
        evm.set(id, __spreadValues(__spreadValues({
          status
        }, typeof txHash === "string" && txHash && { txHash }), typeof error === "string" && error && { error }));
      }
      continue;
    }
    if (typeof type === "string" && SVM_COMPLETE_TYPES.has(type)) {
      const { status, signature, error, pending_solana_id, unsigned_tx } = payload;
      const mapped = status === "signed" || status === "submitted" ? "success" : status === "rejected" || status === "failed" ? "failed" : null;
      if (mapped === null) continue;
      const outcome = __spreadValues(__spreadValues({
        status: mapped
      }, typeof signature === "string" && signature && { txHash: signature }), typeof error === "string" && error && { error });
      if (typeof pending_solana_id === "number" && Number.isInteger(pending_solana_id)) {
        svm != null ? svm : svm = /* @__PURE__ */ new Map();
        svm.set(pending_solana_id, outcome);
      }
      if (typeof unsigned_tx === "string" && unsigned_tx) {
        svmByTx != null ? svmByTx : svmByTx = /* @__PURE__ */ new Map();
        svmByTx.set(unsigned_tx, outcome);
      }
    }
  }
  if (!evm && !svm && !svmByTx) return null;
  return {
    evm: evm != null ? evm : /* @__PURE__ */ new Map(),
    svm: svm != null ? svm : /* @__PURE__ */ new Map(),
    svmByTx: svmByTx != null ? svmByTx : /* @__PURE__ */ new Map()
  };
}
function toInboundMessage(msg, txOutcomes, rawIndex = 0) {
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
  return buildInboundMessage(msg, txOutcomes);
}
function noticeMessageId(msg, index) {
  var _a;
  return `aomi-notice-${(_a = msg.message_key) != null ? _a : `idx-${index}`}`;
}
var TASK_TOOL_NAME = "task";
function readTaskPartAgentId(part) {
  var _a, _b, _c;
  const custom = (_c = (_b = (_a = part == null ? void 0 : part.metadata) == null ? void 0 : _a.custom) == null ? void 0 : _b.aomiTask) == null ? void 0 : _c.agentId;
  return typeof custom === "string" && custom.length > 0 ? custom : void 0;
}
var asPlainObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
var readTaskAgentId = (result) => {
  var _a;
  const agentId = (_a = asPlainObject(result)) == null ? void 0 : _a.agent_id;
  return typeof agentId === "string" && agentId.length > 0 ? agentId : void 0;
};
function buildInboundMessage(msg, txOutcomes) {
  var _a, _b;
  const content = [];
  const role = msg.sender === "user" ? "user" : "assistant";
  if (msg.content && msg.content.trim().length > 0) {
    content.push({ type: "text", text: msg.content });
  }
  const [topic, toolContent] = (_a = parseToolResult(msg.tool_result)) != null ? _a : [];
  const toolName = ((_b = msg.tool_name) == null ? void 0 : _b.trim()) || topic;
  if (toolName && toolContent) {
    const result = (() => {
      try {
        return JSON.parse(toolContent);
      } catch (e) {
        return { args: toolContent };
      }
    })();
    const agentId = toolName === TASK_TOOL_NAME ? readTaskAgentId(result) : void 0;
    content.push(__spreadValues({
      type: "tool-call",
      toolCallId: `tool_${Date.now()}`,
      toolName,
      args: asPlainObject(msg.tool_arguments),
      result: (() => {
        const parsed = result;
        if (txOutcomes && typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          const record = parsed;
          const outcome = typeof record.pending_tx_id === "number" ? txOutcomes.evm.get(record.pending_tx_id) : typeof record.pending_solana_id === "number" ? txOutcomes.svm.get(record.pending_solana_id) : typeof record.unsigned_tx === "string" ? txOutcomes.svmByTx.get(record.unsigned_tx) : void 0;
          if (outcome) {
            return __spreadProps(__spreadValues({}, record), { tx_outcome: outcome });
          }
        }
        return parsed;
      })()
    }, agentId ? {
      metadata: {
        custom: { aomiTask: { agentId } }
      }
    } : null));
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
var SUPPORTED_CHAINS = [...import_client6.SUPPORTED_CHAINS];
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
var hasToolCallPart = (message) => toContentParts(message.content).some(
  (part) => part.type === "tool-call"
);
var isTextPart = (part) => part.type === "text" && typeof part.text === "string";
var collapseExactlyRepeatedText = (text) => {
  const trimmed = text.trim();
  for (let len = Math.floor(trimmed.length / 2); len >= 20; len--) {
    const prefix = trimmed.slice(0, len);
    const suffix = trimmed.slice(trimmed.length - len);
    const middle = trimmed.slice(len, trimmed.length - len);
    if (prefix === suffix && middle.trim().length === 0) {
      return collapseExactlyRepeatedText(suffix);
    }
  }
  return trimmed;
};
var normalizeTextOnlyMessage = (message) => {
  const parts = toContentParts(message.content);
  if (parts.length === 0 || parts.some((part) => !isTextPart(part))) {
    return message;
  }
  return __spreadProps(__spreadValues({}, message), {
    content: [
      {
        type: "text",
        text: collapseExactlyRepeatedText(
          parts.filter(isTextPart).map((part) => part.text).join("\n\n")
        )
      }
    ]
  });
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
      out.push(normalizeTextOnlyMessage(run[0]));
    } else if (!run.some(hasToolCallPart)) {
      out.push(normalizeTextOnlyMessage(run[run.length - 1]));
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
var MESSAGE_PROJECTION_STORAGE_PREFIX = "aomi:message-projection:v1:";
var getMessageProjectionStorageKey = (threadId) => `${MESSAGE_PROJECTION_STORAGE_PREFIX}${threadId}`;
var readMessageProjection = (threadId) => {
  if (typeof window === "undefined") return null;
  const key = getMessageProjectionStorageKey(threadId);
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.ranges) || parsed.ranges.some(
      (range) => !Number.isSafeInteger(range.start) || range.start < 0 || range.end !== null && (!Number.isSafeInteger(range.end) || range.end < range.start)
    )) {
      throw new Error("Invalid message projection");
    }
    return parsed;
  } catch (e) {
    window.localStorage.removeItem(key);
    return null;
  }
};
var writeMessageProjection = (threadId, projection) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    getMessageProjectionStorageKey(threadId),
    JSON.stringify(projection)
  );
};
var clearMessageProjection = (threadId) => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getMessageProjectionStorageKey(threadId));
};
var selectProjectedMessageEntries = (messages, projection) => {
  if (!projection) {
    return messages.map((message, rawIndex) => ({ message, rawIndex }));
  }
  return projection.ranges.flatMap((range) => {
    var _a;
    const end = Math.min((_a = range.end) != null ? _a : messages.length, messages.length);
    const entries = [];
    for (let rawIndex = range.start; rawIndex < end; rawIndex += 1) {
      const message = messages[rawIndex];
      if (message) entries.push({ message, rawIndex });
    }
    return entries;
  });
};
var projectInboundMessages = (messages, projection) => {
  const txOutcomes = collectTxOutcomes(messages);
  const projectedMessages = [];
  for (const { message, rawIndex } of selectProjectedMessageEntries(
    messages,
    projection
  )) {
    const converted = toInboundMessage(message, txOutcomes, rawIndex);
    if (converted) projectedMessages.push(converted);
  }
  return mergeAssistantTurns(projectedMessages);
};
var truncateProjectionBefore = (projection, rawIndex) => {
  var _a, _b;
  const sourceRanges = (_a = projection == null ? void 0 : projection.ranges) != null ? _a : [
    { start: 0, end: null }
  ];
  const prefix = [];
  for (const range of sourceRanges) {
    const rangeEnd = (_b = range.end) != null ? _b : Number.POSITIVE_INFINITY;
    if (rawIndex >= rangeEnd) {
      prefix.push(range);
      continue;
    }
    if (rawIndex > range.start) {
      prefix.push({ start: range.start, end: rawIndex });
    }
    break;
  }
  return prefix;
};
var SUBMITTING_TO_WORKING_GRACE_MS = 300;
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
var TURN_ERROR_MESSAGE = "This app hit an error and couldn't respond.";
var buildNoticeMessage = (kind, title, text) => ({
  id: `aomi-${kind}-${Date.now()}`,
  role: "assistant",
  content: [{ type: "text", text }],
  createdAt: /* @__PURE__ */ new Date(),
  metadata: {
    custom: {
      aomiNoticeKind: kind,
      aomiNoticeTitle: title
    }
  }
});
var buildPaymentRequiredMessage = () => buildNoticeMessage(
  "payment_required",
  "Credits needed",
  PAYMENT_REQUIRED_MESSAGE
);
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
  if ((metadata == null ? void 0 : metadata.control.turnPhase) === turnPhase) {
    return;
  }
  if (!metadata) {
    threadContext.setThreadMetadata((all) => {
      const next = new Map(all);
      next.set(threadId, {
        title: "New Chat",
        status: "regular",
        lastActiveAt: (/* @__PURE__ */ new Date()).toISOString(),
        control: __spreadProps(__spreadValues({}, initThreadControl()), {
          turnPhase
        })
      });
      return next;
    });
    return;
  }
  threadContext.updateThreadMetadata(threadId, {
    control: __spreadProps(__spreadValues({}, metadata.control), {
      turnPhase
    })
  });
};
var appendNoticeMessage = (threadContext, threadId, message) => {
  var _a, _b, _c, _d;
  const kind = (_b = (_a = message.metadata) == null ? void 0 : _a.custom) == null ? void 0 : _b.aomiNoticeKind;
  const messages = threadContext.getThreadMessages(threadId);
  let hasNotice = false;
  for (let i = messages.length - 1; i >= 0; i--) {
    const existing = messages[i];
    if (existing.role !== "assistant") continue;
    hasNotice = ((_d = (_c = existing.metadata) == null ? void 0 : _c.custom) == null ? void 0 : _d.aomiNoticeKind) === kind;
    break;
  }
  if (hasNotice) return;
  threadContext.setThreadMessages(threadId, [...messages, message]);
};
var buildTurnErrorMessage = () => buildNoticeMessage("error", "Error", TURN_ERROR_MESSAGE);
var appendPaymentRequiredMessage = (threadContext, threadId) => appendNoticeMessage(threadContext, threadId, buildPaymentRequiredMessage());
function useRuntimeOrchestrator(aomiClient, options) {
  const threadContext = useThreadContext();
  const threadContextRef = (0, import_react10.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const aomiClientRef = (0, import_react10.useRef)(aomiClient);
  aomiClientRef.current = aomiClient;
  const optionsRef = (0, import_react10.useRef)(options);
  optionsRef.current = options;
  const [isRunning, setIsRunning] = (0, import_react10.useState)(false);
  const sessionManagerRef = (0, import_react10.useRef)(null);
  if (!sessionManagerRef.current) {
    sessionManagerRef.current = new SessionManager(() => aomiClientRef.current);
  }
  const pendingFetches = (0, import_react10.useRef)(/* @__PURE__ */ new Set());
  const initialStatePromises = (0, import_react10.useRef)(/* @__PURE__ */ new Map());
  const hydratedThreadIds = (0, import_react10.useRef)(/* @__PURE__ */ new Set());
  const messageProjections = (0, import_react10.useRef)(/* @__PURE__ */ new Map());
  const loadedMessageProjectionIds = (0, import_react10.useRef)(/* @__PURE__ */ new Set());
  const listenerCleanups = (0, import_react10.useRef)(/* @__PURE__ */ new Map());
  const getMessageProjection = (0, import_react10.useCallback)((threadId) => {
    var _a;
    if (!loadedMessageProjectionIds.current.has(threadId)) {
      loadedMessageProjectionIds.current.add(threadId);
      const stored = readMessageProjection(threadId);
      if (stored) messageProjections.current.set(threadId, stored);
    }
    return (_a = messageProjections.current.get(threadId)) != null ? _a : null;
  }, []);
  const setMessageProjection = (0, import_react10.useCallback)(
    (threadId, projection) => {
      loadedMessageProjectionIds.current.add(threadId);
      messageProjections.current.set(threadId, projection);
      writeMessageProjection(threadId, projection);
    },
    []
  );
  const deleteMessageProjection = (0, import_react10.useCallback)((threadId) => {
    loadedMessageProjectionIds.current.delete(threadId);
    messageProjections.current.delete(threadId);
    clearMessageProjection(threadId);
  }, []);
  const cleanupSessionListeners = (0, import_react10.useCallback)((threadId) => {
    var _a;
    (_a = listenerCleanups.current.get(threadId)) == null ? void 0 : _a();
    listenerCleanups.current.delete(threadId);
  }, []);
  const closeSession = (0, import_react10.useCallback)(
    (threadId) => {
      var _a;
      cleanupSessionListeners(threadId);
      pendingFetches.current.delete(threadId);
      initialStatePromises.current.delete(threadId);
      hydratedThreadIds.current.delete(threadId);
      deleteMessageProjection(threadId);
      (_a = sessionManagerRef.current) == null ? void 0 : _a.close(threadId);
    },
    [cleanupSessionListeners, deleteMessageProjection]
  );
  const closeIdleSessionsExcept = (0, import_react10.useCallback)(
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
  const closeAllSessions = (0, import_react10.useCallback)(() => {
    var _a;
    pendingFetches.current.clear();
    initialStatePromises.current.clear();
    hydratedThreadIds.current.clear();
    messageProjections.current.clear();
    loadedMessageProjectionIds.current.clear();
    for (const threadId of Array.from(listenerCleanups.current.keys())) {
      cleanupSessionListeners(threadId);
    }
    (_a = sessionManagerRef.current) == null ? void 0 : _a.closeAll();
  }, [cleanupSessionListeners]);
  const getSession = (0, import_react10.useCallback)(
    (threadId) => {
      var _a, _b, _c, _d, _e;
      const manager = sessionManagerRef.current;
      const nextOptions = optionsRef.current;
      const nextApp = nextOptions.getApp();
      const nextModel = (_b = (_a = nextOptions.getModel) == null ? void 0 : _a.call(nextOptions)) != null ? _b : void 0;
      const nextApplicationId = (_c = nextOptions.getApplicationId) == null ? void 0 : _c.call(nextOptions);
      const nextClientId = (_d = nextOptions.getClientId) == null ? void 0 : _d.call(nextOptions);
      const nextUserState = (_e = nextOptions.getUserState) == null ? void 0 : _e.call(nextOptions);
      const existing = manager.get(threadId);
      if (existing) {
        existing.syncRuntimeOptions({
          app: nextApp,
          model: nextModel,
          applicationId: nextApplicationId,
          clientId: nextClientId,
          userState: nextUserState
        });
        return existing;
      }
      const session = manager.getOrCreate(threadId, {
        app: nextApp,
        model: nextModel,
        applicationId: nextApplicationId,
        clientId: nextClientId,
        clientType: import_client7.CLIENT_TYPE_WEB_UI,
        userState: nextUserState
      });
      const cleanups = [];
      cleanups.push(
        session.on("messages", (msgs) => {
          const projection = getMessageProjection(threadId);
          const threadMessages = projectInboundMessages(msgs, projection);
          const existingMessages = threadContextRef.current.getThreadMessages(threadId);
          if (threadMessages.length === 0 && hasUnhydratedOptimisticMessage(existingMessages)) {
            return;
          }
          threadContextRef.current.setThreadMessages(threadId, threadMessages);
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
          "actions_changed",
          (actions) => {
            var _a2, _b2;
            return (_b2 = (_a2 = optionsRef.current).onActionsChange) == null ? void 0 : _b2.call(_a2, actions);
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
      cleanups.push(forwardEvent("tool_complete"));
      const forwardTaskEvent = (type) => session.on(type, (event) => {
        var _a2, _b2;
        const task = (0, import_client7.parseAomiTaskEvent)(event);
        if (!task) return;
        threadContextRef.current.applyTaskEvent(threadId, task);
        (_b2 = (_a2 = optionsRef.current).onEvent) == null ? void 0 : _b2.call(_a2, {
          type,
          payload: event,
          sessionId: threadId
        });
      });
      cleanups.push(forwardTaskEvent("task_started"));
      cleanups.push(forwardTaskEvent("task_activity"));
      cleanups.push(forwardTaskEvent("task_completed"));
      cleanups.push(forwardEvent("system_error"));
      listenerCleanups.current.set(threadId, () => {
        for (const cleanup of cleanups) cleanup();
      });
      return session;
    },
    // Stable deps — option getters are refs
    [getMessageProjection]
  );
  const ensureInitialState = (0, import_react10.useCallback)(
    async (threadId) => {
      var _a, _b, _c;
      const existingPromise = initialStatePromises.current.get(threadId);
      if (existingPromise) {
        return existingPromise;
      }
      const cachedMessages = threadContextRef.current.getThreadMessages(threadId);
      const existingSession = (_a = sessionManagerRef.current) == null ? void 0 : _a.get(threadId);
      if (existingSession && (hydratedThreadIds.current.has(threadId) || cachedMessages.length > 0)) {
        (_c = (_b = optionsRef.current).onActionsChange) == null ? void 0 : _c.call(
          _b,
          existingSession.getActions()
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
          (_b2 = (_a2 = optionsRef.current).onActionsChange) == null ? void 0 : _b2.call(
            _a2,
            session.getActions()
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
      threadContextRef.current.clearThreadTaskRuns(threadId);
      updateTurnPhase(threadContextRef.current, threadId, "submitting");
      const submittingFallbackTimer = setTimeout(() => {
        const metadata = threadContextRef.current.getThreadMetadata(threadId);
        if ((metadata == null ? void 0 : metadata.control.turnPhase) !== "submitting") return;
        updateTurnPhase(threadContextRef.current, threadId, "working");
      }, SUBMITTING_TO_WORKING_GRACE_MS);
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
        clearTimeout(submittingFallbackTimer);
        console.debug("[aomi][runtime] sendMessage sendAsync complete", {
          threadId,
          sessionId: session.sessionId,
          isProcessing: session.getIsProcessing(),
          pendingActionCount: session.getPendingActions().length
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
        (_f = (_e = optionsRef.current).onActionsChange) == null ? void 0 : _f.call(
          _e,
          session.getActions()
        );
      } catch (error) {
        clearTimeout(submittingFallbackTimer);
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
  const regenerateMessage = (0, import_react10.useCallback)(
    async (threadId, messageId, replacementText) => {
      var _a;
      const visibleMessages = threadContextRef.current.getThreadMessages(threadId);
      const explicitIndex = visibleMessages.findIndex(
        (message) => message.id === messageId
      );
      const numericIndex = explicitIndex === -1 && messageId !== null && /^\d+$/.test(messageId) ? Number(messageId) : -1;
      let userMessageIndex = explicitIndex !== -1 ? explicitIndex : numericIndex;
      if (userMessageIndex < 0 || userMessageIndex >= visibleMessages.length) {
        throw new Error("Message to regenerate was not found.");
      }
      while (userMessageIndex >= 0 && ((_a = visibleMessages[userMessageIndex]) == null ? void 0 : _a.role) !== "user") {
        userMessageIndex -= 1;
      }
      const userMessage = visibleMessages[userMessageIndex];
      if (!userMessage || userMessage.role !== "user") {
        throw new Error("Regeneration requires a user message.");
      }
      const originalText = typeof userMessage.content === "string" ? userMessage.content.trim() : userMessage.content.filter(
        (part) => part.type === "text"
      ).map((part) => part.text).join("\n").trim();
      const nextText = (replacementText == null ? void 0 : replacementText.trim()) || originalText;
      if (!nextText) {
        throw new Error("Regeneration requires message text.");
      }
      const session = getSession(threadId);
      const rawMessages = session.getMessages();
      const currentProjection = getMessageProjection(threadId);
      const userOrdinal = visibleMessages.slice(0, userMessageIndex + 1).filter((message) => message.role === "user").length;
      const targetEntry = selectProjectedMessageEntries(
        rawMessages,
        currentProjection
      ).filter(({ message }) => message.sender === "user")[userOrdinal - 1];
      if (!targetEntry) {
        throw new Error("Backend message to regenerate was not found.");
      }
      const nextProjection = {
        ranges: [
          ...truncateProjectionBefore(currentProjection, targetEntry.rawIndex),
          { start: rawMessages.length, end: null }
        ]
      };
      setMessageProjection(threadId, nextProjection);
      threadContextRef.current.setThreadMessages(
        threadId,
        projectInboundMessages(rawMessages, nextProjection)
      );
      await sendMessage(nextText, threadId);
    },
    [getMessageProjection, getSession, sendMessage, setMessageProjection]
  );
  const cancelGeneration = (0, import_react10.useCallback)(async (threadId) => {
    var _a;
    const session = (_a = sessionManagerRef.current) == null ? void 0 : _a.get(threadId);
    if (session) {
      await session.interrupt();
    } else {
      updateTurnPhase(threadContextRef.current, threadId, "idle");
    }
  }, []);
  (0, import_react10.useEffect)(() => {
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
    regenerateMessage,
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
      const currentThreadId = threadContext.currentThreadId;
      if (!isRemoteThread(currentThreadId) && threadContext.getThreadMessages(currentThreadId).length === 0) {
        return;
      }
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

// src/handlers/action-handler.ts
var import_react12 = require("react");
function useActionHandler({
  getSession
}) {
  const [pendingActions, setPendingActions] = (0, import_react12.useState)([]);
  const [hasBlockingActions, setHasBlockingActions] = (0, import_react12.useState)(false);
  const actionsRef = (0, import_react12.useRef)(pendingActions);
  const inFlight = (0, import_react12.useRef)(/* @__PURE__ */ new Set());
  const suppressed = (0, import_react12.useRef)(/* @__PURE__ */ new Set());
  const sync = (0, import_react12.useCallback)(() => {
    setPendingActions(
      actionsRef.current.filter((action) => !suppressed.current.has(action.id))
    );
    setHasBlockingActions(actionsRef.current.length > 0 || inFlight.current.size > 0);
  }, []);
  const setActions = (0, import_react12.useCallback)(
    (actions) => {
      const pending = actions.filter((action) => action.state === "pending");
      const ids = new Set(pending.map((action) => action.id));
      for (const id of suppressed.current) {
        if (!ids.has(id) && !inFlight.current.has(id)) suppressed.current.delete(id);
      }
      const preserved = actionsRef.current.filter(
        (action) => inFlight.current.has(action.id) && !ids.has(action.id)
      );
      actionsRef.current = [...pending, ...preserved];
      sync();
    },
    [sync]
  );
  const startAction = (0, import_react12.useCallback)(
    (id) => {
      if (!actionsRef.current.some((action) => action.id === id)) return;
      inFlight.current.add(id);
      suppressed.current.add(id);
      sync();
    },
    [sync]
  );
  const finish = (0, import_react12.useCallback)(
    (id) => {
      actionsRef.current = actionsRef.current.filter((action) => action.id !== id);
      inFlight.current.delete(id);
      sync();
    },
    [sync]
  );
  const respondToAction = (0, import_react12.useCallback)(
    async (id, result) => {
      const session = getSession();
      if (!session) throw new Error("No session available to respond to Action");
      startAction(id);
      try {
        await session.respondToAction(id, result);
      } finally {
        finish(id);
      }
    },
    [finish, getSession, startAction]
  );
  const rejectAction = (0, import_react12.useCallback)(
    async (id, reason) => {
      const session = getSession();
      if (!session) throw new Error("No session available to reject Action");
      startAction(id);
      try {
        await session.rejectAction(id, reason);
      } finally {
        finish(id);
      }
    },
    [finish, getSession, startAction]
  );
  const dismissAction = (0, import_react12.useCallback)(
    (id) => {
      actionsRef.current = actionsRef.current.filter((action) => action.id !== id);
      inFlight.current.delete(id);
      suppressed.current.add(id);
      sync();
    },
    [sync]
  );
  return {
    pendingActions,
    hasBlockingActions,
    setActions,
    startAction,
    dismissAction,
    respondToAction,
    rejectAction
  };
}

// src/runtime/user-state-provider.tsx
var import_react13 = require("react");
var import_client8 = require("@aomi-labs/client");

// src/runtime/http-status.ts
function getHttpStatus2(error) {
  const status = error == null ? void 0 : error.status;
  if (typeof status === "number") return status;
  const message = error instanceof Error ? error.message : String(error);
  const match = /\bHTTP\s+(\d{3})\b/i.exec(message);
  return match ? Number(match[1]) : void 0;
}

// src/runtime/user-state-provider.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
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
function useWalletStateNotifications(context) {
  const { showNotification } = useNotification();
  const { getUserState, onUserStateChange } = context;
  const walletSnapshot = (0, import_react13.useCallback)(
    (nextUser) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i;
      return {
        connection: {
          // Serialize exactly the backend ProviderState. FE-local and account
          // identity fields are deliberately not forwarded here.
          is_connected: (_a = import_client8.UserState.isConnected(nextUser)) != null ? _a : false,
          provider: (_b = import_client8.UserState.walletProvider(nextUser)) != null ? _b : void 0,
          provider_label: typeof ((_c = nextUser.connection) == null ? void 0 : _c.provider_label) === "string" ? nextUser.connection.provider_label : void 0,
          auth_method: (_d = import_client8.UserState.authMethod(nextUser)) != null ? _d : void 0
        },
        evm: {
          address: import_client8.UserState.address(nextUser),
          chain_id: import_client8.UserState.chainId(nextUser),
          ens_name: typeof ((_e = nextUser.evm) == null ? void 0 : _e.ens_name) === "string" ? nextUser.evm.ens_name : void 0
        },
        svm: {
          address: import_client8.UserState.svmAddress(nextUser),
          cluster: (_f = nextUser.svm) == null ? void 0 : _f.cluster,
          wallet_name: (_g = nextUser.svm) == null ? void 0 : _g.wallet_name,
          transport: (_h = nextUser.svm) == null ? void 0 : _h.transport,
          capabilities: (_i = nextUser.svm) == null ? void 0 : _i.capabilities
        }
      };
    },
    [getUserState]
  );
  const lastWalletStateRef = (0, import_react13.useRef)(walletSnapshot(getUserState()));
  (0, import_react13.useEffect)(() => {
    lastWalletStateRef.current = walletSnapshot(getUserState());
    const unsubscribe = onUserStateChange((newUser) => {
      const nextWalletState = walletSnapshot(newUser);
      const prevWalletState = lastWalletStateRef.current;
      const wasConnected = prevWalletState.connection.is_connected;
      const isConnected = nextWalletState.connection.is_connected;
      if (stableStateString2(prevWalletState) === stableStateString2(nextWalletState)) {
        return;
      }
      lastWalletStateRef.current = nextWalletState;
      if (wasConnected !== isConnected) {
        showNotification({
          type: "wallet",
          title: isConnected ? "Wallet connected" : "Wallet disconnected"
        });
      }
    });
    return unsubscribe;
  }, [getUserState, onUserStateChange, showNotification, walletSnapshot]);
}
function useRemoteThreadListSync(context, sessions, remoteThreads, accountSessionAvailable, threadPersistence) {
  const [isThreadListLoading, setIsThreadListLoading] = (0, import_react13.useState)(true);
  const [threadListError, setThreadListError] = (0, import_react13.useState)(false);
  const prefetchCancelRef = (0, import_react13.useRef)(null);
  const hadThreadAccessRef = (0, import_react13.useRef)(false);
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
  const isConnected = import_client8.UserState.isConnected(user) === true;
  const canLoadThreads = isConnected || accountSessionAvailable;
  const restoredThreadId = threadPersistence == null ? void 0 : threadPersistence.restoredThreadId;
  const listThreadsWithAuthRetry = (0, import_react13.useCallback)(
    async (_sessionId, isCancelled) => {
      let nextDelay = THREAD_LIST_AUTH_RETRY_BASE_DELAY_MS;
      let waitedMs = 0;
      for (; ; ) {
        try {
          return await aomiClientRef.current.agent.sessions.all();
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
  const scheduleThreadPrefetch = (0, import_react13.useCallback)(
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
  (0, import_react13.useEffect)(() => {
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
      var _a2, _b2, _c, _d;
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
        const activeMessages = currentContext.getThreadMessages(activeThreadId);
        const activeHasUserMessage = activeMessages.some(
          (message) => message.role === "user"
        );
        if (restoredThreadId && activeThreadId === restoredThreadId && !remoteThreadIds.has(activeThreadId) && !activeHasUserMessage) {
          (_d = threadPersistence == null ? void 0 : threadPersistence.onInvalidRestoredThread) == null ? void 0 : _d.call(threadPersistence);
          currentContext.setThreadMetadata((prev) => {
            const next = new Map(prev);
            next.delete(activeThreadId);
            return next;
          });
          currentContext.setThreads((prev) => {
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
function useRuntimeUserStateEffects({
  sessions: {
    aomiClientRef,
    sessionManager,
    getSession,
    closeAllSessions,
    ensureInitialState,
    setIsThreadLoading
  },
  remoteThreads,
  accountSessionAvailable = false,
  threadPersistence
}) {
  const threadContext = useThreadContext();
  const { user, getUserState, onUserStateChange } = useUser();
  const { getControlState } = useControl();
  const threadContextRef = (0, import_react13.useRef)(threadContext);
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
  useWalletStateNotifications(context);
  return useRemoteThreadListSync(
    context,
    sessions,
    remoteThreads,
    accountSessionAvailable,
    threadPersistence
  );
}
function RuntimeUserStateProvider({
  children,
  sessionManager,
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
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_jsx_runtime6.Fragment, { children });
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
var import_jsx_runtime7 = require("react/jsx-runtime");
function appendMessageText(message) {
  return message.content.filter(
    (part) => part.type === "text"
  ).map((part) => part.text).join("\n");
}
function AomiRuntimeCore({
  children,
  aomiClient,
  applicationId,
  accountSessionAvailable = false,
  restoredThreadId,
  threadPersistenceKey
}) {
  const threadContext = useThreadContext();
  const eventContext = useEventContext();
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
  const sessionManagerRef = (0, import_react14.useRef)(null);
  const actionHandler = useActionHandler({
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
    regenerateMessage: orchestratorRegenerateMessage,
    cancelGeneration: orchestratorCancel,
    closeSession,
    closeIdleSessionsExcept,
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
      const httpStatus = getHttpStatus2(error);
      if (httpStatus === 402) {
        notificationContext.showNotification({
          type: "error",
          kind: "payment_required",
          title: "You're out of funds"
        });
      }
    },
    onActionsChange: actionHandler.setActions,
    onEvent: (event) => eventContext.dispatch(event)
  });
  sessionManagerRef.current = sessionManager;
  const threadContextRef = (0, import_react14.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const remoteThreadIdsRef = (0, import_react14.useRef)(/* @__PURE__ */ new Set());
  const warmedThreadIdsRef = (0, import_react14.useRef)(/* @__PURE__ */ new Set());
  const warmPromisesRef = (0, import_react14.useRef)(/* @__PURE__ */ new Map());
  const [isThreadLoading, setIsThreadLoading] = (0, import_react14.useState)(false);
  const warmThread = (0, import_react14.useCallback)(async (threadId) => {
    if (!remoteThreadIdsRef.current.has(threadId) || warmedThreadIdsRef.current.has(threadId)) {
      return;
    }
    warmedThreadIdsRef.current.add(threadId);
  }, []);
  const getRuntimeSession = (0, import_react14.useCallback)(
    (threadId) => {
      var _a, _b;
      return (_b = (_a = sessionManagerRef.current) == null ? void 0 : _a.get(threadId)) != null ? _b : getSession(threadId);
    },
    [getSession]
  );
  const threadPersistence = (0, import_react14.useMemo)(
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
    },
    accountSessionAvailable,
    threadPersistence
  });
  (0, import_react14.useEffect)(() => {
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
  (0, import_react14.useEffect)(() => {
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
  (0, import_react14.useEffect)(() => {
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
  const threadListAdapter = (0, import_react14.useMemo)(
    () => buildThreadListAdapter({
      aomiClientRef,
      threadContext,
      setIsRunning,
      isLoading: isThreadListLoading,
      getInitialControl: getPreferredThreadControl,
      isRemoteThread: (threadId) => remoteThreadIdsRef.current.has(threadId)
    }),
    [
      aomiClientRef,
      getPreferredThreadControl,
      isThreadListLoading,
      setIsRunning,
      threadContext,
      threadContext.currentThreadId,
      threadContext.allThreadsMetadata,
      currentMessages
    ]
  );
  (0, import_react14.useEffect)(() => {
    const getMessage = (payload) => {
      if (!payload || typeof payload !== "object") return null;
      const message = payload.message;
      return typeof message === "string" && message.trim() ? message.trim() : null;
    };
    const unsubscribeNotice = eventContext.subscribe(
      "system_notice",
      (event) => {
        const message = getMessage(event.payload);
        if (!message) return;
        notificationContext.showNotification({
          type: "notice",
          title: "System notice",
          message
        });
      }
    );
    const unsubscribeError = eventContext.subscribe("system_error", (event) => {
      const message = getMessage(event.payload);
      if (!message) return;
      notificationContext.showNotification({
        type: "error",
        title: "Error",
        message
      });
      appendNoticeMessage(
        threadContextRef.current,
        event.sessionId,
        buildTurnErrorMessage()
      );
    });
    return () => {
      unsubscribeNotice();
      unsubscribeError();
    };
  }, [eventContext, notificationContext.showNotification]);
  const runtime = (0, import_react15.useExternalStoreRuntime)({
    messages: currentMessages,
    isLoading: isThreadLoading,
    setMessages: (msgs) => threadContext.setThreadMessages(threadContext.currentThreadId, [...msgs]),
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
    onEdit: async (message) => {
      var _a;
      try {
        await orchestratorRegenerateMessage(
          threadContext.currentThreadId,
          (_a = message.sourceId) != null ? _a : message.parentId,
          appendMessageText(message)
        );
      } catch (error) {
        console.error("Failed to edit message:", error);
      }
    },
    onReload: async (parentId) => {
      try {
        await orchestratorRegenerateMessage(
          threadContext.currentThreadId,
          parentId
        );
      } catch (error) {
        console.error("Failed to reload message:", error);
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
      warmPromisesRef.current.clear();
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
      threadListError,
      getThreadMetadata: threadContext.getThreadMetadata,
      createThread,
      deleteThread,
      renameThread: (threadId, title) => threadListAdapter.onRename(threadId, title),
      archiveThread: (threadId) => threadListAdapter.onArchive(threadId),
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
      // Action API
      pendingActions: actionHandler.pendingActions,
      hasBlockingActions: actionHandler.hasBlockingActions,
      startAction: actionHandler.startAction,
      dismissAction: actionHandler.dismissAction,
      respondToAction: actionHandler.respondToAction,
      rejectAction: actionHandler.rejectAction,
      simulateBatchTransactions,
      // Event API
      subscribe: eventContext.subscribe,
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
      threadListAdapter,
      selectThread,
      isRunning,
      getMessages,
      sendMessage,
      cancelGeneration,
      notificationContext,
      actionHandler,
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
      children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_react15.AssistantRuntimeProvider, { runtime, children })
    }
  ) });
}

// src/runtime/aomi-runtime.tsx
var import_jsx_runtime8 = require("react/jsx-runtime");
function AomiRuntimeProvider({
  children,
  backendUrl = "http://127.0.0.1:8080",
  applicationId,
  appPlatforms,
  clientOptions,
  accountSessionAvailable = false,
  initialThreadId,
  persistThread = true,
  threadPersistenceKey,
  threadPersistenceScope
}) {
  const resolvedThreadPersistenceKey = (0, import_react16.useMemo)(() => {
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
  const restoredThreadId = (0, import_react16.useMemo)(() => {
    var _a;
    if (initialThreadId) return initialThreadId;
    if (!resolvedThreadPersistenceKey) return void 0;
    return (_a = readPersistedThreadId(resolvedThreadPersistenceKey)) != null ? _a : void 0;
  }, [initialThreadId, resolvedThreadPersistenceKey]);
  const resolvedClientOptions = (0, import_react16.useMemo)(
    () => __spreadValues({
      logger: {
        debug: (...args) => console.debug(...args)
      }
    }, clientOptions),
    [clientOptions]
  );
  const aomiClient = (0, import_react16.useMemo)(
    () => new import_client9.AomiClient(__spreadValues({
      baseUrl: backendUrl
    }, resolvedClientOptions)),
    [backendUrl, resolvedClientOptions]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ThreadContextProvider, { initialThreadId: restoredThreadId, children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(NotificationContextProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ExtUserProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
    AomiRuntimeInner,
    {
      aomiClient,
      applicationId,
      appPlatforms,
      accountSessionAvailable,
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
  restoredThreadId,
  threadPersistenceKey
}) {
  const threadContext = useThreadContext();
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
    ControlContextProvider,
    {
      aomiClient,
      sessionId: threadContext.currentThreadId,
      getThreadMetadata: threadContext.getThreadMetadata,
      updateThreadMetadata: threadContext.updateThreadMetadata,
      appPlatforms,
      applicationId,
      children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(EventContextProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        AomiRuntimeCore,
        {
          aomiClient,
          applicationId,
          accountSessionAvailable,
          restoredThreadId,
          threadPersistenceKey,
          children
        }
      ) })
    }
  );
}

// src/handlers/notification-handler.ts
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

// src/index.ts
var import_client12 = require("@aomi-labs/client");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AOMI_TASK_EVENT_TYPES,
  AomiClient,
  AomiRuntimeApiProvider,
  AomiRuntimeProvider,
  ControlContextProvider,
  EMPTY_TASK_RUNS,
  EventContextProvider,
  ExtUserProvider,
  MAX_AUTO_FEE_WEI,
  NotificationContextProvider,
  RuntimeUserStateProvider,
  SUPPORTED_CHAINS,
  ThreadContextProvider,
  UserState,
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
  isAomiTaskEventType,
  normalizeAppDescriptor,
  normalizeSimulatedFee,
  parseAomiTaskEvent,
  parseChainId,
  readTaskPartAgentId,
  reduceTaskRuns,
  resolveAutoModel,
  toAAWalletCall,
  toAAWalletCalls,
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
  useActionHandler,
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
  useTaskRun,
  useThreadContext,
  useThreadTaskRuns,
  useUser
});
//# sourceMappingURL=index.cjs.map