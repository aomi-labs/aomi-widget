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
  AomiClient: () => import_client3.AomiClient,
  AomiRuntimeProvider: () => AomiRuntimeProvider,
  ControlContextProvider: () => ControlContextProvider,
  EventContextProvider: () => EventContextProvider,
  NotificationContextProvider: () => NotificationContextProvider,
  SUPPORTED_CHAINS: () => SUPPORTED_CHAINS,
  ThreadContextProvider: () => ThreadContextProvider,
  UserContextProvider: () => UserContextProvider,
  cn: () => cn,
  formatAddress: () => formatAddress,
  getChainInfo: () => getChainInfo,
  getNetworkName: () => getNetworkName,
  initThreadControl: () => initThreadControl,
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
var import_client3 = require("@aomi-labs/client");

// packages/react/src/runtime/aomi-runtime.tsx
var import_react11 = require("react");
var import_client2 = require("@aomi-labs/client");

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
    namespace: null,
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
  backendApi,
  sessionId,
  publicKey,
  getThreadMetadata,
  updateThreadMetadata
}) {
  var _a, _b;
  const [state, setStateInternal] = (0, import_react.useState)(() => ({
    apiKey: null,
    availableModels: [],
    authorizedNamespaces: [],
    defaultModel: null,
    defaultNamespace: null
  }));
  const stateRef = (0, import_react.useRef)(state);
  stateRef.current = state;
  const backendApiRef = (0, import_react.useRef)(backendApi);
  backendApiRef.current = backendApi;
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
    const fetchNamespaces = async () => {
      var _a2, _b2;
      try {
        const namespaces = await backendApiRef.current.getNamespaces(
          sessionIdRef.current,
          { publicKey: publicKeyRef.current, apiKey: (_a2 = stateRef.current.apiKey) != null ? _a2 : void 0 }
        );
        const defaultNs = namespaces.includes("default") ? "default" : (_b2 = namespaces[0]) != null ? _b2 : null;
        setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), {
          authorizedNamespaces: namespaces,
          defaultNamespace: defaultNs
        }));
      } catch (error) {
        console.error("Failed to fetch namespaces:", error);
        setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), {
          authorizedNamespaces: ["default"],
          defaultNamespace: "default"
        }));
      }
    };
    void fetchNamespaces();
  }, [state.apiKey]);
  (0, import_react.useEffect)(() => {
    const fetchModels = async () => {
      try {
        const models = await backendApiRef.current.getModels(
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
  const getAvailableModels = (0, import_react.useCallback)(async () => {
    try {
      const models = await backendApiRef.current.getModels(
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
  const getAuthorizedNamespaces = (0, import_react.useCallback)(async () => {
    var _a2, _b2;
    try {
      const namespaces = await backendApiRef.current.getNamespaces(
        sessionIdRef.current,
        { publicKey: publicKeyRef.current, apiKey: (_a2 = stateRef.current.apiKey) != null ? _a2 : void 0 }
      );
      const defaultNs = namespaces.includes("default") ? "default" : (_b2 = namespaces[0]) != null ? _b2 : null;
      setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), {
        authorizedNamespaces: namespaces,
        defaultNamespace: defaultNs
      }));
      return namespaces;
    } catch (error) {
      console.error("Failed to fetch namespaces:", error);
      setStateInternal((prev) => __spreadProps(__spreadValues({}, prev), {
        authorizedNamespaces: ["default"],
        defaultNamespace: "default"
      }));
      return ["default"];
    }
  }, []);
  const getCurrentThreadControl = (0, import_react.useCallback)(() => {
    var _a2;
    const metadata = getThreadMetadataRef.current(sessionIdRef.current);
    return (_a2 = metadata == null ? void 0 : metadata.control) != null ? _a2 : initThreadControl();
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
    const namespace = (_d = (_c = currentControl.namespace) != null ? _c : stateRef.current.defaultNamespace) != null ? _d : "default";
    console.log("[control-context] onModelSelect updating metadata", {
      threadId,
      model,
      namespace,
      currentControl
    });
    updateThreadMetadataRef.current(threadId, {
      control: __spreadProps(__spreadValues({}, currentControl), {
        model,
        namespace,
        controlDirty: true
      })
    });
    console.log("[control-context] onModelSelect calling backend setModel", {
      threadId,
      model,
      namespace,
      backendUrl: backendApiRef.current
    });
    try {
      const result = await backendApiRef.current.setModel(
        threadId,
        model,
        { namespace, apiKey: (_e = stateRef.current.apiKey) != null ? _e : void 0 }
      );
      console.log("[control-context] onModelSelect backend result", result);
    } catch (err) {
      console.error("[control-context] setModel failed:", err);
      throw err;
    }
  }, []);
  const onNamespaceSelect = (0, import_react.useCallback)((namespace) => {
    var _a2, _b2;
    const threadId = sessionIdRef.current;
    const currentControl = (_b2 = (_a2 = getThreadMetadataRef.current(threadId)) == null ? void 0 : _a2.control) != null ? _b2 : initThreadControl();
    const isProcessing2 = currentControl.isProcessing;
    console.log("[control-context] onNamespaceSelect called", {
      namespace,
      isProcessing: isProcessing2,
      threadId
    });
    if (isProcessing2) {
      console.warn(
        "[control-context] Cannot switch namespace while processing"
      );
      return;
    }
    console.log("[control-context] onNamespaceSelect updating metadata", {
      threadId,
      namespace,
      currentControl
    });
    updateThreadMetadataRef.current(threadId, {
      control: __spreadProps(__spreadValues({}, currentControl), {
        namespace,
        controlDirty: true
      })
    });
    console.log("[control-context] onNamespaceSelect metadata updated");
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
      if ("namespace" in updates && updates.namespace !== void 0 && updates.namespace !== null) {
        onNamespaceSelect(updates.namespace);
      }
    },
    [setApiKey, onNamespaceSelect]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ControlContext.Provider,
    {
      value: {
        state,
        setApiKey,
        getAvailableModels,
        getAuthorizedNamespaces,
        getCurrentThreadControl,
        onModelSelect,
        onNamespaceSelect,
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
var import_client = require("@aomi-labs/client");

// packages/react/src/state/event-buffer.ts
function createEventBuffer() {
  return {
    inboundQueue: [],
    outboundQueue: [],
    sseStatus: "disconnected",
    lastEventId: null,
    subscribers: /* @__PURE__ */ new Map()
  };
}
function enqueueInbound(state, event) {
  state.inboundQueue.push(__spreadProps(__spreadValues({}, event), {
    status: "pending",
    timestamp: Date.now()
  }));
}
function subscribe(state, type, callback) {
  if (!state.subscribers.has(type)) {
    state.subscribers.set(type, /* @__PURE__ */ new Set());
  }
  state.subscribers.get(type).add(callback);
  return () => {
    var _a;
    (_a = state.subscribers.get(type)) == null ? void 0 : _a.delete(callback);
  };
}
function dispatch(state, event) {
  const typeSubscribers = state.subscribers.get(event.type);
  if (typeSubscribers) {
    for (const callback of typeSubscribers) {
      callback(event);
    }
  }
  const allSubscribers = state.subscribers.get("*");
  if (allSubscribers) {
    for (const callback of allSubscribers) {
      callback(event);
    }
  }
}
function setSSEStatus(state, status) {
  state.sseStatus = status;
}

// packages/react/src/contexts/event-context.tsx
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
  backendApi,
  sessionId
}) {
  const bufferRef = (0, import_react2.useRef)(null);
  if (!bufferRef.current) {
    bufferRef.current = createEventBuffer();
  }
  const buffer = bufferRef.current;
  const [sseStatus, setSseStatus] = (0, import_react2.useState)("disconnected");
  (0, import_react2.useEffect)(() => {
    setSSEStatus(buffer, "connecting");
    setSseStatus("connecting");
    const unsubscribe = backendApi.subscribeSSE(
      sessionId,
      (event) => {
        enqueueInbound(buffer, {
          type: event.type,
          sessionId: event.session_id,
          payload: event
        });
        const inboundEvent = {
          type: event.type,
          sessionId: event.session_id,
          payload: event,
          status: "fetched",
          timestamp: Date.now()
        };
        dispatch(buffer, inboundEvent);
      },
      (error) => {
        console.error("SSE error:", error);
        setSSEStatus(buffer, "disconnected");
        setSseStatus("disconnected");
      }
    );
    setSSEStatus(buffer, "connected");
    setSseStatus("connected");
    return () => {
      unsubscribe();
      setSSEStatus(buffer, "disconnected");
      setSseStatus("disconnected");
    };
  }, [backendApi, sessionId, buffer]);
  const subscribeCallback = (0, import_react2.useCallback)(
    (type, callback) => {
      return subscribe(buffer, type, callback);
    },
    [buffer]
  );
  const sendOutbound = (0, import_react2.useCallback)(
    async (event) => {
      try {
        const message = JSON.stringify({
          type: event.type,
          payload: event.payload
        });
        await backendApi.sendSystemMessage(event.sessionId, message);
      } catch (error) {
        console.error("Failed to send outbound event:", error);
      }
    },
    [backendApi]
  );
  const dispatchSystemEvents = (0, import_react2.useCallback)(
    (sessionId2, events) => {
      var _a;
      for (const event of events) {
        let eventType;
        let payload;
        if ((0, import_client.isInlineCall)(event)) {
          eventType = event.InlineCall.type;
          payload = (_a = event.InlineCall.payload) != null ? _a : event.InlineCall;
        } else if ((0, import_client.isSystemNotice)(event)) {
          eventType = "system_notice";
          payload = { message: event.SystemNotice };
        } else if ((0, import_client.isSystemError)(event)) {
          eventType = "system_error";
          payload = { message: event.SystemError };
        } else if ((0, import_client.isAsyncCallback)(event)) {
          eventType = "async_callback";
          payload = event.AsyncCallback;
        } else {
          console.warn("Unknown system event type:", event);
          continue;
        }
        const inboundEvent = {
          type: eventType,
          sessionId: sessionId2,
          payload,
          status: "fetched",
          timestamp: Date.now()
        };
        enqueueInbound(buffer, {
          type: eventType,
          sessionId: sessionId2,
          payload
        });
        dispatch(buffer, inboundEvent);
      }
    },
    [buffer]
  );
  const contextValue = {
    subscribe: subscribeCallback,
    sendOutboundSystem: sendOutbound,
    dispatchInboundSystem: dispatchSystemEvents,
    sseStatus
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
    getUserState: context.getUserState,
    onUserStateChange: context.onUserStateChange
  };
}
function UserContextProvider({ children }) {
  const [user, setUserState] = (0, import_react5.useState)({
    isConnected: false,
    address: void 0,
    chainId: void 0,
    ensName: void 0
  });
  const userRef = (0, import_react5.useRef)(user);
  userRef.current = user;
  const StateChangeCallbacks = (0, import_react5.useRef)(
    /* @__PURE__ */ new Set()
  );
  const setUser = (0, import_react5.useCallback)((data) => {
    setUserState((prev) => {
      const next = __spreadValues(__spreadValues({}, prev), data);
      StateChangeCallbacks.current.forEach((callback) => {
        callback(next);
      });
      return next;
    });
  }, []);
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
        getUserState,
        onUserStateChange
      },
      children
    }
  );
}

// packages/react/src/runtime/core.tsx
var import_react9 = require("react");
var import_react10 = require("@assistant-ui/react");

// packages/react/src/runtime/orchestrator.ts
var import_react6 = require("react");

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

// packages/react/src/state/backend-state.ts
function createBackendState() {
  return {
    runningThreads: /* @__PURE__ */ new Set()
  };
}
function resolveThreadId(_state, threadId) {
  return threadId;
}
function setThreadRunning(state, threadId, running) {
  if (running) {
    state.runningThreads.add(threadId);
  } else {
    state.runningThreads.delete(threadId);
  }
}
function isThreadRunning(state, threadId) {
  return state.runningThreads.has(threadId);
}

// packages/react/src/runtime/message-controller.ts
var MessageController = class {
  constructor(config) {
    this.config = config;
  }
  inbound(threadId, msgs) {
    if (!msgs) return;
    const threadMessages = [];
    for (const msg of msgs) {
      const threadMessage = toInboundMessage(msg);
      if (threadMessage) {
        threadMessages.push(threadMessage);
      }
    }
    this.getThreadContextApi().setThreadMessages(threadId, threadMessages);
  }
  async outbound(message, threadId) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const backendState = this.config.backendStateRef.current;
    const text = message.content.filter(
      (part) => part.type === "text"
    ).map(
      (part) => part.text
    ).join("\n");
    if (!text) return;
    const threadState = this.getThreadContextApi();
    const existingMessages = threadState.getThreadMessages(threadId);
    const userMessage = {
      role: "user",
      content: [{ type: "text", text }],
      createdAt: /* @__PURE__ */ new Date()
    };
    threadState.setThreadMessages(threadId, [...existingMessages, userMessage]);
    threadState.updateThreadMetadata(threadId, {
      lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const backendThreadId = resolveThreadId(backendState, threadId);
    const namespace = this.config.getNamespace();
    const publicKey = (_b = (_a = this.config).getPublicKey) == null ? void 0 : _b.call(_a);
    const apiKey = (_e = (_d = (_c = this.config).getApiKey) == null ? void 0 : _d.call(_c)) != null ? _e : void 0;
    const userState = (_g = (_f = this.config).getUserState) == null ? void 0 : _g.call(_f);
    try {
      this.markRunning(threadId, true);
      const response = await this.config.backendApiRef.current.sendMessage(
        backendThreadId,
        text,
        { namespace, publicKey, apiKey, userState }
      );
      if (response == null ? void 0 : response.messages) {
        this.inbound(threadId, response.messages);
      }
      if (((_h = response == null ? void 0 : response.system_events) == null ? void 0 : _h.length) && this.config.onSyncEvents) {
        this.config.onSyncEvents(backendThreadId, response.system_events);
      }
      if (response == null ? void 0 : response.is_processing) {
        this.config.polling.start(threadId);
      } else if (!this.config.polling.isPolling(threadId)) {
        this.markRunning(threadId, false);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      this.markRunning(threadId, false);
    }
  }
  async cancel(threadId) {
    var _a;
    this.config.polling.stop(threadId);
    const backendState = this.config.backendStateRef.current;
    const backendThreadId = resolveThreadId(backendState, threadId);
    try {
      const response = await this.config.backendApiRef.current.interrupt(backendThreadId);
      if (response == null ? void 0 : response.messages) {
        this.inbound(threadId, response.messages);
      }
      if (((_a = response == null ? void 0 : response.system_events) == null ? void 0 : _a.length) && this.config.onSyncEvents) {
        this.config.onSyncEvents(backendThreadId, response.system_events);
      }
      this.markRunning(threadId, false);
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  }
  markRunning(threadId, running) {
    var _a, _b;
    setThreadRunning(this.config.backendStateRef.current, threadId, running);
    if (this.config.threadContextRef.current.currentThreadId === threadId) {
      (_b = (_a = this.config).setGlobalIsRunning) == null ? void 0 : _b.call(_a, running);
    }
  }
  getThreadContextApi() {
    const { getThreadMessages, setThreadMessages, updateThreadMetadata } = this.config.threadContextRef.current;
    return { getThreadMessages, setThreadMessages, updateThreadMetadata };
  }
};

// packages/react/src/runtime/polling-controller.ts
var PollingController = class {
  constructor(config) {
    this.config = config;
    this.intervals = /* @__PURE__ */ new Map();
    var _a;
    this.intervalMs = (_a = config.intervalMs) != null ? _a : 500;
  }
  start(threadId) {
    var _a, _b;
    const backendState = this.config.backendStateRef.current;
    if (this.intervals.has(threadId)) return;
    const backendThreadId = resolveThreadId(backendState, threadId);
    setThreadRunning(backendState, threadId, true);
    const tick = async () => {
      var _a2, _b2;
      if (!this.intervals.has(threadId)) return;
      try {
        console.log(
          "[PollingController] Fetching state for threadId:",
          threadId
        );
        const userState = (_b2 = (_a2 = this.config).getUserState) == null ? void 0 : _b2.call(_a2);
        const state = await this.config.backendApiRef.current.fetchState(
          backendThreadId,
          userState
        );
        if (!this.intervals.has(threadId)) return;
        this.handleState(threadId, state);
      } catch (error) {
        console.error("Polling error:", error);
        this.stop(threadId);
      }
    };
    const intervalId = setInterval(tick, this.intervalMs);
    this.intervals.set(threadId, intervalId);
    (_b = (_a = this.config).onStart) == null ? void 0 : _b.call(_a, threadId);
  }
  stop(threadId) {
    var _a, _b;
    const intervalId = this.intervals.get(threadId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(threadId);
    }
    setThreadRunning(this.config.backendStateRef.current, threadId, false);
    (_b = (_a = this.config).onStop) == null ? void 0 : _b.call(_a, threadId);
  }
  isPolling(threadId) {
    return this.intervals.has(threadId);
  }
  stopAll() {
    for (const threadId of this.intervals.keys()) {
      this.stop(threadId);
    }
  }
  handleState(threadId, state) {
    var _a;
    if (((_a = state.system_events) == null ? void 0 : _a.length) && this.config.onSyncEvents) {
      const backendState = this.config.backendStateRef.current;
      const sessionId = resolveThreadId(backendState, threadId);
      this.config.onSyncEvents(sessionId, state.system_events);
    }
    this.config.applyMessages(threadId, state.messages);
    if (!state.is_processing) {
      this.stop(threadId);
    }
  }
};

// packages/react/src/runtime/orchestrator.ts
function useRuntimeOrchestrator(backendApi, options) {
  const threadContext = useThreadContext();
  const threadContextRef = (0, import_react6.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const backendApiRef = (0, import_react6.useRef)(backendApi);
  backendApiRef.current = backendApi;
  const backendStateRef = (0, import_react6.useRef)(createBackendState());
  const [isRunning, setIsRunning] = (0, import_react6.useState)(false);
  const messageControllerRef = (0, import_react6.useRef)(null);
  const pollingRef = (0, import_react6.useRef)(null);
  const pendingFetches = (0, import_react6.useRef)(/* @__PURE__ */ new Set());
  if (!pollingRef.current) {
    pollingRef.current = new PollingController({
      backendApiRef,
      backendStateRef,
      applyMessages: (threadId, msgs) => {
        var _a;
        (_a = messageControllerRef.current) == null ? void 0 : _a.inbound(threadId, msgs);
      },
      onSyncEvents: options.onSyncEvents,
      getUserState: options.getUserState,
      onStart: (threadId) => {
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(true);
        }
      },
      onStop: (threadId) => {
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(false);
        }
      }
    });
  }
  if (!messageControllerRef.current) {
    messageControllerRef.current = new MessageController({
      backendApiRef,
      backendStateRef,
      threadContextRef,
      polling: pollingRef.current,
      setGlobalIsRunning: setIsRunning,
      getPublicKey: options.getPublicKey,
      getNamespace: options.getNamespace,
      getApiKey: options.getApiKey,
      getUserState: options.getUserState,
      onSyncEvents: options.onSyncEvents
    });
  }
  const ensureInitialState = (0, import_react6.useCallback)(async (threadId) => {
    var _a, _b, _c, _d;
    if (pendingFetches.current.has(threadId)) return;
    const backendThreadId = resolveThreadId(backendStateRef.current, threadId);
    pendingFetches.current.add(threadId);
    try {
      const userState = (_a = options.getUserState) == null ? void 0 : _a.call(options);
      const state = await backendApiRef.current.fetchState(
        backendThreadId,
        userState
      );
      (_b = messageControllerRef.current) == null ? void 0 : _b.inbound(threadId, state.messages);
      if (((_c = state.system_events) == null ? void 0 : _c.length) && options.onSyncEvents) {
        options.onSyncEvents(backendThreadId, state.system_events);
      }
      if (threadContextRef.current.currentThreadId === threadId) {
        if (state.is_processing) {
          setIsRunning(true);
          (_d = pollingRef.current) == null ? void 0 : _d.start(threadId);
        } else {
          setIsRunning(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch initial state:", error);
      if (threadContextRef.current.currentThreadId === threadId) {
        setIsRunning(false);
      }
    } finally {
      pendingFetches.current.delete(threadId);
    }
  }, []);
  return {
    backendStateRef,
    polling: pollingRef.current,
    messageController: messageControllerRef.current,
    isRunning,
    setIsRunning,
    ensureInitialState,
    backendApiRef
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
  backendApiRef,
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
        await backendApiRef.current.renameThread(threadId, newTitle);
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
        await backendApiRef.current.archiveThread(threadId);
      } catch (error) {
        console.error("Failed to archive thread:", error);
        threadContext.updateThreadMetadata(threadId, { status: "regular" });
      }
    },
    onUnarchive: async (threadId) => {
      threadContext.updateThreadMetadata(threadId, { status: "regular" });
      try {
        await backendApiRef.current.unarchiveThread(threadId);
      } catch (error) {
        console.error("Failed to unarchive thread:", error);
        threadContext.updateThreadMetadata(threadId, { status: "archived" });
      }
    },
    onDelete: async (threadId) => {
      try {
        await backendApiRef.current.deleteThread(threadId);
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

// packages/react/src/state/wallet-buffer.ts
function createWalletBuffer() {
  return { queue: [], nextId: 1 };
}
function enqueue(buffer, kind, payload) {
  const request = {
    id: `wreq-${buffer.nextId++}`,
    kind,
    payload,
    status: "pending",
    timestamp: Date.now()
  };
  buffer.queue.push(request);
  return request;
}
function dequeue(buffer, id) {
  const index = buffer.queue.findIndex((r) => r.id === id);
  if (index === -1) return null;
  return buffer.queue.splice(index, 1)[0];
}
function markProcessing(buffer, id) {
  const request = buffer.queue.find((r) => r.id === id);
  if (!request || request.status !== "pending") return false;
  request.status = "processing";
  return true;
}
function getAll(buffer) {
  return [...buffer.queue];
}

// packages/react/src/handlers/wallet-handler.ts
function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  return value;
}
function getToolArgs(payload) {
  const root = asRecord(payload);
  const nestedArgs = asRecord(root == null ? void 0 : root.args);
  return nestedArgs != null ? nestedArgs : root != null ? root : {};
}
function parseChainId(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  if (trimmed.startsWith("0x")) {
    const parsedHex = Number.parseInt(trimmed.slice(2), 16);
    return Number.isFinite(parsedHex) ? parsedHex : void 0;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : void 0;
}
function normalizeTxPayload(payload) {
  var _a, _b, _c;
  const root = asRecord(payload);
  const args = getToolArgs(payload);
  const ctx = asRecord(root == null ? void 0 : root.ctx);
  const to = typeof args.to === "string" ? args.to : void 0;
  if (!to) return null;
  const valueRaw = args.value;
  const value = typeof valueRaw === "string" ? valueRaw : typeof valueRaw === "number" && Number.isFinite(valueRaw) ? String(Math.trunc(valueRaw)) : void 0;
  const data = typeof args.data === "string" ? args.data : void 0;
  const chainId = (_c = (_b = (_a = parseChainId(args.chainId)) != null ? _a : parseChainId(args.chain_id)) != null ? _b : parseChainId(ctx == null ? void 0 : ctx.user_chain_id)) != null ? _c : parseChainId(ctx == null ? void 0 : ctx.userChainId);
  return {
    to,
    value,
    data,
    chainId
  };
}
function normalizeEip712Payload(payload) {
  var _a;
  const args = getToolArgs(payload);
  const typedDataRaw = (_a = args.typed_data) != null ? _a : args.typedData;
  let typedData;
  if (typeof typedDataRaw === "string") {
    try {
      const parsed = JSON.parse(typedDataRaw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        typedData = parsed;
      }
    } catch (e) {
      typedData = void 0;
    }
  } else if (typedDataRaw && typeof typedDataRaw === "object" && !Array.isArray(typedDataRaw)) {
    typedData = typedDataRaw;
  }
  const description = typeof args.description === "string" ? args.description : void 0;
  return {
    typed_data: typedData,
    description
  };
}
function useWalletHandler({
  sessionId,
  onRequestComplete
}) {
  const { subscribe: subscribe2, sendOutboundSystem: sendOutbound } = useEventContext();
  const bufferRef = (0, import_react8.useRef)(createWalletBuffer());
  const [pendingRequests, setPendingRequests] = (0, import_react8.useState)([]);
  const syncState = (0, import_react8.useCallback)(() => {
    setPendingRequests(getAll(bufferRef.current));
  }, []);
  (0, import_react8.useEffect)(() => {
    const unsubscribe = subscribe2(
      "wallet_tx_request",
      (event) => {
        const payload = normalizeTxPayload(event.payload);
        if (!payload) {
          console.warn("[aomi][wallet] Ignoring tx request with invalid payload", event.payload);
          return;
        }
        enqueue(bufferRef.current, "transaction", payload);
        syncState();
      }
    );
    return unsubscribe;
  }, [subscribe2, syncState]);
  (0, import_react8.useEffect)(() => {
    const unsubscribe = subscribe2(
      "wallet_eip712_request",
      (event) => {
        var _a;
        const payload = normalizeEip712Payload((_a = event.payload) != null ? _a : {});
        enqueue(bufferRef.current, "eip712_sign", payload);
        syncState();
      }
    );
    return unsubscribe;
  }, [subscribe2, syncState]);
  const startProcessingCb = (0, import_react8.useCallback)(
    (id) => {
      markProcessing(bufferRef.current, id);
      syncState();
    },
    [syncState]
  );
  const resolveRequest = (0, import_react8.useCallback)(
    (id, result) => {
      var _a;
      const removed = dequeue(bufferRef.current, id);
      if (!removed) return;
      let outbound;
      if (removed.kind === "transaction") {
        outbound = sendOutbound({
          type: "wallet:tx_complete",
          sessionId,
          payload: {
            txHash: (_a = result.txHash) != null ? _a : "",
            status: "success",
            amount: result.amount
          }
        });
      } else {
        const eip712Payload = removed.payload;
        outbound = sendOutbound({
          type: "wallet_eip712_response",
          sessionId,
          payload: {
            status: "success",
            signature: result.signature,
            description: eip712Payload.description
          }
        });
      }
      outbound.then(() => onRequestComplete == null ? void 0 : onRequestComplete());
      syncState();
    },
    [sendOutbound, sessionId, syncState, onRequestComplete]
  );
  const rejectRequest = (0, import_react8.useCallback)(
    (id, error) => {
      const removed = dequeue(bufferRef.current, id);
      if (!removed) return;
      let outbound;
      if (removed.kind === "transaction") {
        outbound = sendOutbound({
          type: "wallet:tx_complete",
          sessionId,
          payload: {
            txHash: "",
            status: "failed"
          }
        });
      } else {
        const eip712Payload = removed.payload;
        outbound = sendOutbound({
          type: "wallet_eip712_response",
          sessionId,
          payload: {
            status: "failed",
            error: error != null ? error : "EIP-712 signing failed",
            description: eip712Payload.description
          }
        });
      }
      outbound.then(() => onRequestComplete == null ? void 0 : onRequestComplete());
      syncState();
    },
    [sendOutbound, sessionId, syncState, onRequestComplete]
  );
  return {
    pendingRequests,
    startProcessing: startProcessingCb,
    resolveRequest,
    rejectRequest
  };
}

// packages/react/src/runtime/core.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
function AomiRuntimeCore({
  children,
  backendApi
}) {
  const threadContext = useThreadContext();
  const eventContext = useEventContext();
  const notificationContext = useNotification();
  const { dispatchInboundSystem: dispatchSystemEvents } = eventContext;
  const { user, onUserStateChange, getUserState } = useUser();
  const { getControlState, getCurrentThreadControl } = useControl();
  const {
    backendStateRef,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    ensureInitialState,
    backendApiRef
  } = useRuntimeOrchestrator(backendApi, {
    onSyncEvents: dispatchSystemEvents,
    getPublicKey: () => getUserState().address,
    getUserState,
    getNamespace: () => {
      var _a, _b;
      return (_b = (_a = getCurrentThreadControl().namespace) != null ? _a : getControlState().defaultNamespace) != null ? _b : "default";
    },
    getApiKey: () => getControlState().apiKey
  });
  (0, import_react9.useEffect)(() => {
    const unsubscribe = onUserStateChange(async (newUser) => {
      const sessionId = threadContext.currentThreadId;
      const message = JSON.stringify({
        type: "wallet:state_changed",
        payload: {
          address: newUser.address,
          chainId: newUser.chainId,
          isConnected: newUser.isConnected,
          ensName: newUser.ensName
        }
      });
      await backendApiRef.current.sendSystemMessage(sessionId, message);
    });
    return unsubscribe;
  }, [onUserStateChange, backendApiRef, threadContext.currentThreadId]);
  const threadContextRef = (0, import_react9.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const currentThreadIdRef = (0, import_react9.useRef)(threadContext.currentThreadId);
  (0, import_react9.useEffect)(() => {
    currentThreadIdRef.current = threadContext.currentThreadId;
  }, [threadContext.currentThreadId]);
  const onWalletRequestComplete = (0, import_react9.useCallback)(() => {
    polling.start(currentThreadIdRef.current);
  }, [polling]);
  const walletHandler = useWalletHandler({
    sessionId: threadContext.currentThreadId,
    onRequestComplete: onWalletRequestComplete
  });
  (0, import_react9.useEffect)(() => {
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
  (0, import_react9.useEffect)(() => {
    void ensureInitialState(threadContext.currentThreadId);
  }, [ensureInitialState, threadContext.currentThreadId]);
  (0, import_react9.useEffect)(() => {
    const threadId = threadContext.currentThreadId;
    setIsRunning(isThreadRunning(backendStateRef.current, threadId));
  }, [backendStateRef, setIsRunning, threadContext.currentThreadId]);
  (0, import_react9.useEffect)(() => {
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
  (0, import_react9.useEffect)(() => {
    const userAddress = user.address;
    if (!userAddress) return;
    const fetchThreadList = async () => {
      var _a, _b, _c;
      try {
        const threadList = await backendApiRef.current.listThreads(userAddress);
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
  }, [user.address, backendApiRef]);
  const threadListAdapter = (0, import_react9.useMemo)(
    () => buildThreadListAdapter({
      backendStateRef,
      backendApiRef,
      threadContext,
      currentThreadIdRef,
      polling,
      userAddress: user.address,
      setIsRunning,
      getNamespace: () => {
        var _a, _b;
        return (_b = (_a = getCurrentThreadControl().namespace) != null ? _a : getControlState().defaultNamespace) != null ? _b : "default";
      },
      getApiKey: () => getControlState().apiKey,
      getUserState
    }),
    [
      backendApiRef,
      polling,
      user.address,
      backendStateRef,
      setIsRunning,
      threadContext,
      threadContext.currentThreadId,
      threadContext.allThreadsMetadata,
      getControlState,
      getUserState
    ]
  );
  (0, import_react9.useEffect)(() => {
    const backendState = backendStateRef.current;
    const unsubscribe = eventContext.subscribe("title_changed", (event) => {
      const sessionId = event.sessionId;
      const payload = event.payload;
      const newTitle = payload == null ? void 0 : payload.new_title;
      if (typeof newTitle !== "string") return;
      const targetThreadId = resolveThreadId(backendState, sessionId);
      const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
      if (process.env.NODE_ENV !== "production") {
        console.debug("[aomi][sse] title_changed", {
          sessionId,
          newTitle,
          normalizedTitle,
          currentThreadId: threadContextRef.current.currentThreadId,
          targetThreadId
        });
      }
      threadContextRef.current.setThreadMetadata((prev) => {
        var _a, _b;
        const next = new Map(prev);
        const existing = next.get(targetThreadId);
        const nextStatus = (existing == null ? void 0 : existing.status) === "archived" ? "archived" : "regular";
        next.set(targetThreadId, {
          title: normalizedTitle,
          status: nextStatus,
          lastActiveAt: (_a = existing == null ? void 0 : existing.lastActiveAt) != null ? _a : (/* @__PURE__ */ new Date()).toISOString(),
          control: (_b = existing == null ? void 0 : existing.control) != null ? _b : initThreadControl()
        });
        return next;
      });
    });
    return unsubscribe;
  }, [eventContext, backendStateRef]);
  (0, import_react9.useEffect)(() => {
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
  (0, import_react9.useEffect)(() => {
    const unsubscribe = eventContext.subscribe("system_notice", (event) => {
      const payload = event.payload;
      const message = payload == null ? void 0 : payload.message;
    });
    return unsubscribe;
  }, [eventContext, notificationContext]);
  const runtime = (0, import_react10.useExternalStoreRuntime)({
    messages: currentMessages,
    setMessages: (msgs) => threadContext.setThreadMessages(threadContext.currentThreadId, [...msgs]),
    isRunning,
    onNew: (message) => messageController.outbound(message, threadContext.currentThreadId),
    onCancel: () => messageController.cancel(threadContext.currentThreadId),
    convertMessage: (msg) => msg,
    adapters: { threadList: threadListAdapter }
  });
  (0, import_react9.useEffect)(() => {
    return () => {
      polling.stopAll();
    };
  }, [polling]);
  const userContext = useUser();
  const sendMessage = (0, import_react9.useCallback)(
    async (text) => {
      const appendMessage = {
        role: "user",
        content: [{ type: "text", text }]
      };
      await messageController.outbound(
        appendMessage,
        threadContext.currentThreadId
      );
    },
    [messageController, threadContext.currentThreadId]
  );
  const cancelGeneration = (0, import_react9.useCallback)(() => {
    messageController.cancel(threadContext.currentThreadId);
  }, [messageController, threadContext.currentThreadId]);
  const getMessages = (0, import_react9.useCallback)(
    (threadId) => {
      const id = threadId != null ? threadId : threadContext.currentThreadId;
      return threadContext.getThreadMessages(id);
    },
    [threadContext]
  );
  const createThread = (0, import_react9.useCallback)(async () => {
    await threadListAdapter.onSwitchToNewThread();
    return threadContextRef.current.currentThreadId;
  }, [threadListAdapter]);
  const deleteThread = (0, import_react9.useCallback)(
    async (threadId) => {
      await threadListAdapter.onDelete(threadId);
    },
    [threadListAdapter]
  );
  const renameThread = (0, import_react9.useCallback)(
    async (threadId, title) => {
      await threadListAdapter.onRename(threadId, title);
    },
    [threadListAdapter]
  );
  const archiveThread = (0, import_react9.useCallback)(
    async (threadId) => {
      await threadListAdapter.onArchive(threadId);
    },
    [threadListAdapter]
  );
  const selectThread = (0, import_react9.useCallback)(
    (threadId) => {
      if (threadContext.allThreadsMetadata.has(threadId)) {
        threadListAdapter.onSwitchToThread(threadId);
      } else {
        void threadListAdapter.onSwitchToNewThread();
      }
    },
    [threadContext.allThreadsMetadata, threadListAdapter]
  );
  const aomiRuntimeApi = (0, import_react9.useMemo)(
    () => ({
      // User API
      user: userContext.user,
      getUserState: userContext.getUserState,
      setUser: userContext.setUser,
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
      startWalletRequest: walletHandler.startProcessing,
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
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(AomiRuntimeApiProvider, { value: aomiRuntimeApi, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_react10.AssistantRuntimeProvider, { runtime, children }) });
}

// packages/react/src/runtime/aomi-runtime.tsx
var import_jsx_runtime7 = require("react/jsx-runtime");
function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080"
}) {
  const backendApi = (0, import_react11.useMemo)(() => new import_client2.AomiClient({ baseUrl: backendUrl }), [backendUrl]);
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ThreadContextProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(NotificationContextProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(UserContextProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(AomiRuntimeInner, { backendApi, children }) }) }) });
}
function AomiRuntimeInner({
  children,
  backendApi
}) {
  var _a;
  const threadContext = useThreadContext();
  const { user } = useUser();
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
    ControlContextProvider,
    {
      backendApi,
      sessionId: threadContext.currentThreadId,
      publicKey: (_a = user.address) != null ? _a : void 0,
      getThreadMetadata: threadContext.getThreadMetadata,
      updateThreadMetadata: threadContext.updateThreadMetadata,
      children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        EventContextProvider,
        {
          backendApi,
          sessionId: threadContext.currentThreadId,
          children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(AomiRuntimeCore, { backendApi, children })
        }
      )
    }
  );
}

// packages/react/src/handlers/notification-handler.ts
var import_react12 = require("react");
var notificationIdCounter2 = 0;
function generateNotificationId() {
  return `notif-${Date.now()}-${++notificationIdCounter2}`;
}
function useNotificationHandler({
  onNotification
} = {}) {
  const { subscribe: subscribe2 } = useEventContext();
  const [notifications, setNotifications] = (0, import_react12.useState)([]);
  (0, import_react12.useEffect)(() => {
    const unsubscribe = subscribe2("notification", (event) => {
      var _a, _b;
      const payload = event.payload;
      const notification = {
        id: generateNotificationId(),
        type: (_a = payload.type) != null ? _a : "notification",
        title: (_b = payload.title) != null ? _b : "Notification",
        body: payload.body,
        handled: false,
        timestamp: event.timestamp,
        sessionId: event.sessionId
      };
      setNotifications((prev) => [notification, ...prev]);
      onNotification == null ? void 0 : onNotification(notification);
    });
    return unsubscribe;
  }, [subscribe2, onNotification]);
  const unhandledCount = notifications.filter((n) => !n.handled).length;
  const markHandled = (0, import_react12.useCallback)((id) => {
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