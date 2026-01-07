"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/react/src/index.ts
var index_exports = {};
__export(index_exports, {
  AomiRuntimeProvider: () => AomiRuntimeProvider,
  AomiRuntimeProviderWithNotifications: () => AomiRuntimeProviderWithNotifications,
  BackendApi: () => BackendApi,
  NotificationProvider: () => NotificationProvider,
  RuntimeActionsProvider: () => RuntimeActionsProvider,
  ThreadContextProvider: () => ThreadContextProvider,
  WalletSystemMessageEmitter: () => WalletSystemMessageEmitter,
  cn: () => cn,
  constructSystemMessage: () => toInboundSystem,
  constructThreadMessage: () => toInboundMessage,
  formatAddress: () => formatAddress,
  getNetworkName: () => getNetworkName,
  normalizeWalletError: () => normalizeWalletError,
  pickInjectedProvider: () => pickInjectedProvider,
  toHexQuantity: () => toHexQuantity,
  useCurrentThreadMessages: () => useCurrentThreadMessages,
  useCurrentThreadMetadata: () => useCurrentThreadMetadata,
  useNotification: () => useNotification,
  useRuntimeActions: () => useRuntimeActions,
  useThreadContext: () => useThreadContext
});
module.exports = __toCommonJS(index_exports);

// packages/react/src/api/client.ts
function toQueryString(payload) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value === void 0 || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
async function postState(backendUrl, path, payload) {
  const query = toQueryString(payload);
  const url = `${backendUrl}${path}${query}`;
  console.log("\u{1F535} [postState] URL:", url);
  console.log("\u{1F535} [postState] Payload:", payload);
  const response = await fetch(url, {
    method: "POST"
  });
  console.log("\u{1F535} [postState] Response status:", response.status);
  if (!response.ok) {
    console.error("\u{1F534} [postState] Error:", response.status, response.statusText);
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  console.log("\u{1F7E2} [postState] Success:", data);
  return data;
}
var BackendApi = class {
  constructor(backendUrl) {
    this.backendUrl = backendUrl;
    this.connectionStatus = false;
    this.eventSource = null;
    this.updatesEventSources = /* @__PURE__ */ new Map();
  }
  async fetchState(sessionId, options) {
    console.log("\u{1F535} [fetchState] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/state?session_id=${encodeURIComponent(sessionId)}`;
    console.log("\u{1F535} [fetchState] URL:", url);
    const response = await fetch(url, { signal: options == null ? void 0 : options.signal });
    console.log("\u{1F535} [fetchState] Response status:", response.status, response.statusText);
    if (!response.ok) {
      console.error("\u{1F534} [fetchState] Error:", response.status, response.statusText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log("\u{1F7E2} [fetchState] Success:", data);
    return data;
  }
  async postChatMessage(sessionId, message, publicKey) {
    console.log("\u{1F535} [postChatMessage] Called with sessionId:", sessionId, "message:", message);
    const result = await postState(this.backendUrl, "/api/chat", {
      message,
      session_id: sessionId,
      public_key: publicKey
    });
    console.log("\u{1F7E2} [postChatMessage] Success:", result);
    return result;
  }
  async postSystemMessage(sessionId, message) {
    console.log("\u{1F535} [postSystemMessage] Called with sessionId:", sessionId, "message:", message);
    const result = await postState(this.backendUrl, "/api/system", {
      message,
      session_id: sessionId
    });
    console.log("\u{1F7E2} [postSystemMessage] Success:", result);
    return result;
  }
  async postInterrupt(sessionId) {
    console.log("\u{1F535} [postInterrupt] Called with sessionId:", sessionId);
    const result = await postState(this.backendUrl, "/api/interrupt", {
      session_id: sessionId
    });
    console.log("\u{1F7E2} [postInterrupt] Success:", result);
    return result;
  }
  disconnectSSE() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.setConnectionStatus(false);
  }
  setConnectionStatus(on) {
    this.connectionStatus = on;
  }
  async connectSSE(sessionId, publicKey) {
    this.disconnectSSE();
    try {
      const url = new URL(`${this.backendUrl}/api/chat/stream`);
      url.searchParams.set("session_id", sessionId);
      if (publicKey) {
        url.searchParams.set("public_key", publicKey);
      }
      this.eventSource = new EventSource(url.toString());
      this.eventSource.onopen = () => {
        console.log("\u{1F310} SSE connection opened to:", url.toString());
        this.setConnectionStatus(true);
      };
      this.eventSource.onmessage = (event) => {
        try {
          JSON.parse(event.data);
        } catch (error) {
          console.error("Failed to parse SSE data:", error);
        }
      };
      this.eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);
      };
    } catch (error) {
      console.error("Failed to establish SSE connection:", error);
      this.handleConnectionError(sessionId, publicKey);
    }
  }
  handleConnectionError(sessionId, publicKey) {
    this.setConnectionStatus(false);
    let attempt = 0;
    const total = 3;
    if (attempt < total) {
      attempt++;
      console.log(`Attempting to reconnect (${attempt}/${total})...`);
      setTimeout(() => {
        this.connectSSE(sessionId, publicKey);
      }, 100);
    } else {
      console.error("Max reconnection attempts reached");
      this.setConnectionStatus(false);
    }
  }
  subscribeToUpdatesInternal(sessionId, onUpdate, onError, logLabel) {
    const updatesUrl = new URL("/api/updates", this.backendUrl);
    updatesUrl.searchParams.set("session_id", sessionId);
    const updatesUrlString = updatesUrl.toString();
    const existing = this.updatesEventSources.get(sessionId);
    if (existing) {
      existing.cleanup();
      this.updatesEventSources.delete(sessionId);
    }
    const subscription = {
      eventSource: null,
      retries: 0,
      retryTimer: null,
      stopped: false,
      cleanup: () => {
        subscription.stopped = true;
        if (subscription.retryTimer) {
          clearTimeout(subscription.retryTimer);
          subscription.retryTimer = null;
        }
        if (subscription.eventSource) {
          subscription.eventSource.close();
          subscription.eventSource = null;
        }
      }
    };
    const scheduleRetry = () => {
      subscription.retries += 1;
      const delayMs = Math.min(500 * 2 ** (subscription.retries - 1), 1e4);
      console.warn(
        `\u{1F501} [${logLabel}] retrying in ${delayMs}ms (attempt ${subscription.retries})`,
        { sessionId }
      );
      subscription.retryTimer = setTimeout(() => {
        open();
      }, delayMs);
    };
    const open = () => {
      if (subscription.stopped) return;
      if (subscription.retryTimer) {
        clearTimeout(subscription.retryTimer);
        subscription.retryTimer = null;
      }
      if (subscription.eventSource) {
        subscription.eventSource.close();
      }
      const updatesEventSource = new EventSource(updatesUrlString);
      subscription.eventSource = updatesEventSource;
      console.log(`\u{1F514} [updates] subscribed`, updatesUrlString);
      updatesEventSource.onopen = () => {
        subscription.retries = 0;
        console.log("\u{1F514} [updates] open", updatesUrlString);
      };
      updatesEventSource.onmessage = (event) => {
        try {
          console.log("\u{1F514} [updates] message", { url: updatesUrlString, data: event.data });
          const parsed = JSON.parse(event.data);
          onUpdate(parsed);
        } catch (error) {
          console.error("Failed to parse system update SSE:", error);
          onError == null ? void 0 : onError(error);
        }
      };
      updatesEventSource.onerror = (error) => {
        console.error("System updates SSE error:", {
          url: updatesUrlString,
          readyState: updatesEventSource.readyState,
          error
        });
        onError == null ? void 0 : onError(error);
        if (subscription.stopped) return;
        updatesEventSource.close();
        scheduleRetry();
      };
    };
    this.updatesEventSources.set(sessionId, subscription);
    open();
    return () => {
      const current = this.updatesEventSources.get(sessionId);
      if (current === subscription) {
        current.cleanup();
        this.updatesEventSources.delete(sessionId);
      } else {
        subscription.cleanup();
      }
    };
  }
  subscribeToUpdates(sessionId, onUpdate, onError) {
    return this.subscribeToUpdatesInternal(
      sessionId,
      onUpdate,
      onError,
      "subscribeToUpdates"
    );
  }
  async fetchThreads(publicKey) {
    console.log("\u{1F535} [fetchThreads] Called with publicKey:", publicKey);
    const url = `${this.backendUrl}/api/sessions?public_key=${encodeURIComponent(publicKey)}`;
    console.log("\u{1F535} [fetchThreads] URL:", url);
    const response = await fetch(url);
    console.log("\u{1F535} [fetchThreads] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [fetchThreads] Error:", response.status);
      throw new Error(`Failed to fetch threads: HTTP ${response.status}`);
    }
    const data = await response.json();
    console.log("\u{1F7E2} [fetchThreads] Success:", data);
    return data;
  }
  async createThread(publicKey, title) {
    console.log("\u{1F535} [createThread] Called with publicKey:", publicKey, "title:", title);
    const body = {};
    if (publicKey) {
      body.public_key = publicKey;
    }
    if (title) {
      body.title = title;
    }
    console.log("\u{1F535} [createThread] Request body:", body);
    const url = `${this.backendUrl}/api/sessions`;
    console.log("\u{1F535} [createThread] URL:", url);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    console.log("\u{1F535} [createThread] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [createThread] Error:", response.status);
      throw new Error(`Failed to create thread: HTTP ${response.status}`);
    }
    const data = await response.json();
    console.log("\u{1F7E2} [createThread] Success:", data);
    return data;
  }
  async archiveThread(sessionId) {
    console.log("\u{1F535} [archiveThread] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/archive`;
    console.log("\u{1F535} [archiveThread] URL:", url);
    const response = await fetch(url, { method: "POST" });
    console.log("\u{1F535} [archiveThread] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [archiveThread] Error:", response.status);
      throw new Error(`Failed to archive thread: HTTP ${response.status}`);
    }
    console.log("\u{1F7E2} [archiveThread] Success");
  }
  async unarchiveThread(sessionId) {
    console.log("\u{1F535} [unarchiveThread] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/unarchive`;
    console.log("\u{1F535} [unarchiveThread] URL:", url);
    const response = await fetch(url, { method: "POST" });
    console.log("\u{1F535} [unarchiveThread] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [unarchiveThread] Error:", response.status);
      throw new Error(`Failed to unarchive thread: HTTP ${response.status}`);
    }
    console.log("\u{1F7E2} [unarchiveThread] Success");
  }
  async deleteThread(sessionId) {
    console.log("\u{1F535} [deleteThread] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    console.log("\u{1F535} [deleteThread] URL:", url);
    const response = await fetch(url, { method: "DELETE" });
    console.log("\u{1F535} [deleteThread] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [deleteThread] Error:", response.status);
      throw new Error(`Failed to delete thread: HTTP ${response.status}`);
    }
    console.log("\u{1F7E2} [deleteThread] Success");
  }
  async renameThread(sessionId, newTitle) {
    console.log("\u{1F535} [renameThread] Called with sessionId:", sessionId, "newTitle:", newTitle);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    console.log("\u{1F535} [renameThread] URL:", url);
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle })
    });
    console.log("\u{1F535} [renameThread] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [renameThread] Error:", response.status);
      throw new Error(`Failed to rename thread: HTTP ${response.status}`);
    }
    console.log("\u{1F7E2} [renameThread] Success");
  }
  async fetchEventsAfter(sessionId, afterId = 0, limit = 100) {
    const url = new URL("/api/events", this.backendUrl);
    url.searchParams.set("session_id", sessionId);
    if (afterId > 0) url.searchParams.set("after_id", String(afterId));
    if (limit) url.searchParams.set("limit", String(limit));
    console.log("\u{1F535} [fetchEventsAfter] URL:", url.toString());
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch events: HTTP ${response.status}`);
    }
    return await response.json();
  }
  subscribeToUpdatesWithNotification(sessionId, onUpdate, onError) {
    return this.subscribeToUpdatesInternal(
      sessionId,
      onUpdate,
      onError,
      "subscribeToUpdatesWithNotification"
    );
  }
};

// packages/react/src/runtime/aomi-runtime.tsx
var import_react10 = require("react");
var import_react11 = require("@assistant-ui/react");

// packages/react/src/runtime/hooks.ts
var import_react = require("react");
var RuntimeActionsContext = (0, import_react.createContext)(void 0);
var RuntimeActionsProvider = RuntimeActionsContext.Provider;
function useRuntimeActions() {
  const context = (0, import_react.useContext)(RuntimeActionsContext);
  if (!context) {
    throw new Error("useRuntimeActions must be used within AomiRuntimeProvider");
  }
  return context;
}

// packages/react/src/runtime/orchestrator.ts
var import_react3 = require("react");

// packages/react/src/state/thread-context.tsx
var import_react2 = require("react");

// packages/react/src/state/thread-store.ts
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
      const nextMetadata = this.resolveStateAction(updater, this.state.threadMetadata);
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
      const nextMetadata = new Map(this.state.threadMetadata);
      nextMetadata.set(threadId, __spreadValues(__spreadValues({}, existing), updates));
      this.updateState({ threadMetadata: nextMetadata });
    };
    var _a;
    const initialThreadId = (_a = options == null ? void 0 : options.initialThreadId) != null ? _a : crypto.randomUUID();
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
            status: "pending",
            lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
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
        lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
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
      threads: this.state.threads,
      setThreads: this.setThreads,
      threadMetadata: this.state.threadMetadata,
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

// packages/react/src/state/thread-context.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var ThreadContextState = (0, import_react2.createContext)(null);
function useThreadContext() {
  const context = (0, import_react2.useContext)(ThreadContextState);
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
  const storeRef = (0, import_react2.useRef)(null);
  if (!storeRef.current) {
    storeRef.current = new ThreadStore({ initialThreadId });
  }
  const store = storeRef.current;
  const value = (0, import_react2.useSyncExternalStore)(store.subscribe, store.getSnapshot);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThreadContextState.Provider, { value, children });
}
function useCurrentThreadMessages() {
  const { currentThreadId, getThreadMessages } = useThreadContext();
  return (0, import_react2.useMemo)(() => getThreadMessages(currentThreadId), [currentThreadId, getThreadMessages]);
}
function useCurrentThreadMetadata() {
  const { currentThreadId, getThreadMetadata } = useThreadContext();
  return (0, import_react2.useMemo)(() => getThreadMetadata(currentThreadId), [currentThreadId, getThreadMetadata]);
}

// packages/react/src/utils/conversion.ts
function toInboundMessage(msg) {
  var _a;
  if (msg.sender === "system") return null;
  const content = [];
  const role = msg.sender === "user" ? "user" : "assistant";
  if (msg.content) {
    content.push({ type: "text", text: msg.content });
  }
  const [topic, toolContent] = (_a = parseToolStream(msg.tool_stream)) != null ? _a : [];
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
function toInboundSystem(msg) {
  var _a;
  const [topic] = (_a = parseToolStream(msg.tool_stream)) != null ? _a : [];
  const messageText = topic || msg.content || "";
  const timestamp = parseTimestamp(msg.timestamp);
  if (!messageText.trim()) return null;
  return __spreadValues({
    role: "system",
    content: [{ type: "text", text: messageText }]
  }, timestamp && { createdAt: timestamp });
}
function parseTimestamp(timestamp) {
  if (!timestamp) return void 0;
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.valueOf()) ? void 0 : parsed;
}
function parseToolStream(toolStream) {
  if (!toolStream) return null;
  if (Array.isArray(toolStream) && toolStream.length === 2) {
    const [topic, content] = toolStream;
    return [String(topic), content];
  }
  if (typeof toolStream === "object") {
    const topic = toolStream.topic;
    const content = toolStream.content;
    return topic ? [String(topic), String(content)] : null;
  }
  return null;
}

// packages/react/src/runtime/utils.ts
var isTempThreadId = (id) => id.startsWith("temp-");
var parseTimestamp2 = (value) => {
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

// packages/react/src/runtime/backend-state.ts
function createBakendState() {
  return {
    tempToBackendId: /* @__PURE__ */ new Map(),
    skipInitialFetch: /* @__PURE__ */ new Set(),
    pendingChat: /* @__PURE__ */ new Map(),
    pendingSystem: /* @__PURE__ */ new Map(),
    runningThreads: /* @__PURE__ */ new Set(),
    creatingThreadId: null,
    createThreadPromise: null
  };
}
function resolveThreadId(state, threadId) {
  var _a;
  return (_a = state.tempToBackendId.get(threadId)) != null ? _a : threadId;
}
function isThreadReady(state, threadId) {
  if (!isTempThreadId(threadId)) return true;
  return state.tempToBackendId.has(threadId);
}
function setBackendMapping(state, tempId, backendId) {
  state.tempToBackendId.set(tempId, backendId);
}
function findTempIdForBackendId(state, backendId) {
  for (const [tempId, id] of state.tempToBackendId.entries()) {
    if (id === backendId) return tempId;
  }
  return void 0;
}
function markSkipInitialFetch(state, threadId) {
  state.skipInitialFetch.add(threadId);
}
function shouldSkipInitialFetch(state, threadId) {
  return state.skipInitialFetch.has(threadId);
}
function clearSkipInitialFetch(state, threadId) {
  state.skipInitialFetch.delete(threadId);
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
function enqueuePendingChat(state, threadId, text) {
  var _a;
  const existing = (_a = state.pendingChat.get(threadId)) != null ? _a : [];
  state.pendingChat.set(threadId, [...existing, text]);
}
function dequeuePendingChat(state, threadId) {
  var _a;
  const pending = (_a = state.pendingChat.get(threadId)) != null ? _a : [];
  state.pendingChat.delete(threadId);
  return pending;
}
function hasPendingChat(state, threadId) {
  var _a, _b;
  return ((_b = (_a = state.pendingChat.get(threadId)) == null ? void 0 : _a.length) != null ? _b : 0) > 0;
}
function enqueuePendingSystem(state, threadId, text) {
  var _a;
  const existing = (_a = state.pendingSystem.get(threadId)) != null ? _a : [];
  state.pendingSystem.set(threadId, [...existing, text]);
}
function dequeuePendingSystem(state, threadId) {
  var _a;
  const pending = (_a = state.pendingSystem.get(threadId)) != null ? _a : [];
  state.pendingSystem.delete(threadId);
  return pending;
}

// packages/react/src/runtime/message-controller.ts
var MessageController = class {
  constructor(config) {
    this.config = config;
  }
  inbound(threadId, msgs) {
    const backendState = this.config.backendStateRef.current;
    if (!msgs) return;
    if (hasPendingChat(backendState, threadId)) {
      return;
    }
    const threadMessages = [];
    for (const msg of msgs) {
      if (msg.sender === "system") {
        const systemMessage = toInboundSystem(msg);
        if (systemMessage) {
          threadMessages.push(systemMessage);
        }
        continue;
      }
      const threadMessage = toInboundMessage(msg);
      if (threadMessage) {
        threadMessages.push(threadMessage);
      }
    }
    this.getThreadContextApi().setThreadMessages(threadId, threadMessages);
  }
  async outbound(message, threadId) {
    var _a, _b;
    const backendState = this.config.backendStateRef.current;
    const text = message.content.filter((part) => part.type === "text").map((part) => part.text).join("\n");
    if (!text) return;
    const threadState = this.getThreadContextApi();
    const existingMessages = threadState.getThreadMessages(threadId);
    const userMessage = {
      role: "user",
      content: [{ type: "text", text }],
      createdAt: /* @__PURE__ */ new Date()
    };
    threadState.setThreadMessages(threadId, [...existingMessages, userMessage]);
    threadState.updateThreadMetadata(threadId, { lastActiveAt: (/* @__PURE__ */ new Date()).toISOString() });
    if (!isThreadReady(backendState, threadId)) {
      this.markRunning(threadId, true);
      enqueuePendingChat(backendState, threadId, text);
      return;
    }
    const backendThreadId = resolveThreadId(backendState, threadId);
    const publicKey = (_b = (_a = this.config).getPublicKey) == null ? void 0 : _b.call(_a);
    try {
      this.markRunning(threadId, true);
      if (publicKey) {
        await this.config.backendApiRef.current.postChatMessage(
          backendThreadId,
          text,
          publicKey
        );
      } else {
        await this.config.backendApiRef.current.postChatMessage(backendThreadId, text);
      }
      await this.flushPendingSystem(threadId);
      this.config.polling.start(threadId);
    } catch (error) {
      console.error("Failed to send message:", error);
      this.markRunning(threadId, false);
    }
  }
  async outboundSystem(threadId, text) {
    const backendState = this.config.backendStateRef.current;
    if (!isThreadReady(backendState, threadId)) return;
    const threadMessages = this.getThreadContextApi().getThreadMessages(threadId);
    const hasUserMessages = threadMessages.some((msg) => msg.role === "user");
    if (!hasUserMessages) {
      enqueuePendingSystem(backendState, threadId, text);
      return;
    }
    await this.outboundSystemInner(threadId, text);
  }
  async outboundSystemInner(threadId, text) {
    const backendState = this.config.backendStateRef.current;
    const threadState = this.getThreadContextApi();
    const backendThreadId = resolveThreadId(backendState, threadId);
    this.markRunning(threadId, true);
    try {
      const response = await this.config.backendApiRef.current.postSystemMessage(backendThreadId, text);
      if (response.res) {
        const systemMessage = toInboundSystem(response.res);
        if (systemMessage) {
          const updatedMessages = [...threadState.getThreadMessages(threadId), systemMessage];
          threadState.setThreadMessages(threadId, updatedMessages);
        }
      }
      await this.flushPendingSystem(threadId);
      this.config.polling.start(threadId);
    } catch (error) {
      console.error("Failed to send system message:", error);
      this.markRunning(threadId, false);
    }
  }
  async flushPendingSystem(threadId) {
    const backendState = this.config.backendStateRef.current;
    const pending = dequeuePendingSystem(backendState, threadId);
    if (!pending.length) return;
    for (const pendingMessage of pending) {
      await this.outboundSystemInner(threadId, pendingMessage);
    }
  }
  async flushPendingChat(threadId) {
    var _a, _b;
    const backendState = this.config.backendStateRef.current;
    const pending = dequeuePendingChat(backendState, threadId);
    if (!pending.length) return;
    const backendThreadId = resolveThreadId(backendState, threadId);
    const publicKey = (_b = (_a = this.config).getPublicKey) == null ? void 0 : _b.call(_a);
    for (const text of pending) {
      try {
        if (publicKey) {
          await this.config.backendApiRef.current.postChatMessage(
            backendThreadId,
            text,
            publicKey
          );
        } else {
          await this.config.backendApiRef.current.postChatMessage(backendThreadId, text);
        }
      } catch (error) {
        console.error("Failed to send queued message:", error);
      }
    }
    this.config.polling.start(threadId);
  }
  async cancel(threadId) {
    const backendState = this.config.backendStateRef.current;
    if (!isThreadReady(backendState, threadId)) return;
    this.config.polling.stop(threadId);
    const backendThreadId = resolveThreadId(backendState, threadId);
    try {
      await this.config.backendApiRef.current.postInterrupt(backendThreadId);
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
    this.handleSystemEvents = config.handleSystemEvents;
  }
  setSystemEventsHandler(handler) {
    this.handleSystemEvents = handler;
  }
  start(threadId) {
    const backendState = this.config.backendStateRef.current;
    if (!isThreadReady(backendState, threadId)) return;
    if (this.intervals.has(threadId)) {
      return;
    }
    const backendThreadId = resolveThreadId(backendState, threadId);
    setThreadRunning(backendState, threadId, true);
    const tick = async () => {
      if (!this.intervals.has(threadId)) {
        return;
      }
      try {
        console.log("\u{1F535} [PollingController] Fetching state for threadId:", threadId);
        const state = await this.config.backendApiRef.current.fetchState(backendThreadId);
        if (!this.intervals.has(threadId)) {
          return;
        }
        this.handleState(threadId, state);
      } catch (error) {
        console.error("Polling error:", error);
        this.stop(threadId);
      }
    };
    const intervalId = setInterval(tick, this.intervalMs);
    this.intervals.set(threadId, intervalId);
    if (this.config.onStart) {
      this.config.onStart(threadId);
    }
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
    if (state.session_exists === false) {
      this.stop(threadId);
      return;
    }
    const backendState = this.config.backendStateRef.current;
    const backendThreadId = resolveThreadId(backendState, threadId);
    if (this.handleSystemEvents && state.system_events) {
      this.handleSystemEvents(backendThreadId, threadId, state.system_events);
    }
    this.config.applyMessages(threadId, state.messages);
    if (!state.is_processing) {
      this.stop(threadId);
    }
  }
};

// packages/react/src/runtime/orchestrator.ts
function useRuntimeOrchestrator(backendUrl, options) {
  const threadContext = useThreadContext();
  const threadContextRef = (0, import_react3.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const backendApiRef = (0, import_react3.useRef)(new BackendApi(backendUrl));
  const backendStateRef = (0, import_react3.useRef)(createBakendState());
  const [isRunning, setIsRunning] = (0, import_react3.useState)(false);
  const messageControllerRef = (0, import_react3.useRef)(null);
  const pollingRef = (0, import_react3.useRef)(null);
  const systemEventsHandlerRef = (0, import_react3.useRef)(null);
  const inFlightRef = (0, import_react3.useRef)(/* @__PURE__ */ new Map());
  if (!pollingRef.current) {
    pollingRef.current = new PollingController({
      backendApiRef,
      backendStateRef,
      applyMessages: (threadId, msgs) => {
        var _a;
        (_a = messageControllerRef.current) == null ? void 0 : _a.inbound(threadId, msgs);
      },
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
      getPublicKey: options == null ? void 0 : options.getPublicKey
    });
  }
  const setSystemEventsHandler = (0, import_react3.useCallback)((handler) => {
    var _a;
    systemEventsHandlerRef.current = handler;
    (_a = pollingRef.current) == null ? void 0 : _a.setSystemEventsHandler(handler != null ? handler : void 0);
  }, []);
  (0, import_react3.useEffect)(() => {
    return () => {
      for (const controller of inFlightRef.current.values()) {
        controller.abort();
      }
      inFlightRef.current.clear();
    };
  }, []);
  const ensureInitialState = (0, import_react3.useCallback)(
    async (threadId) => {
      var _a, _b;
      const backendState = backendStateRef.current;
      if (shouldSkipInitialFetch(backendState, threadId)) {
        clearSkipInitialFetch(backendState, threadId);
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(false);
        }
        return;
      }
      if (!isThreadReady(backendState, threadId)) {
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(false);
        }
        return;
      }
      if (inFlightRef.current.has(threadId)) {
        return;
      }
      const backendThreadId = resolveThreadId(backendState, threadId);
      const controller = new AbortController();
      inFlightRef.current.set(threadId, controller);
      try {
        console.log("\u{1F535} [Orchestrator] Fetching initial state for threadId:", threadId);
        const state = await backendApiRef.current.fetchState(backendThreadId, {
          signal: controller.signal
        });
        (_a = messageControllerRef.current) == null ? void 0 : _a.inbound(threadId, state.messages);
        if (systemEventsHandlerRef.current && state.system_events) {
          systemEventsHandlerRef.current(backendThreadId, threadId, state.system_events);
        }
        if (state.is_processing) {
          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(true);
          }
          (_b = pollingRef.current) == null ? void 0 : _b.start(threadId);
        } else {
          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(false);
          }
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Failed to fetch initial state:", error);
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(false);
        }
      } finally {
        if (inFlightRef.current.get(threadId) === controller) {
          inFlightRef.current.delete(threadId);
        }
      }
    },
    [backendApiRef, backendStateRef, pollingRef, messageControllerRef, setIsRunning]
  );
  return {
    backendStateRef,
    polling: pollingRef.current,
    messageController: messageControllerRef.current,
    isRunning,
    setIsRunning,
    ensureInitialState,
    setSystemEventsHandler,
    backendApiRef
  };
}

// packages/react/src/lib/notification-context.tsx
var import_react8 = require("react");

// node_modules/.pnpm/sonner@1.7.4_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/sonner/dist/index.mjs
var import_react4 = __toESM(require("react"), 1);
var import_react_dom = __toESM(require("react-dom"), 1);
var import_react5 = __toESM(require("react"), 1);
var import_react6 = __toESM(require("react"), 1);
var import_react7 = __toESM(require("react"), 1);
var jt = (n) => {
  switch (n) {
    case "success":
      return ee;
    case "info":
      return ae;
    case "warning":
      return oe;
    case "error":
      return se;
    default:
      return null;
  }
};
var te = Array(12).fill(0);
var Yt = ({ visible: n, className: e }) => import_react5.default.createElement("div", { className: ["sonner-loading-wrapper", e].filter(Boolean).join(" "), "data-visible": n }, import_react5.default.createElement("div", { className: "sonner-spinner" }, te.map((t, a) => import_react5.default.createElement("div", { className: "sonner-loading-bar", key: `spinner-bar-${a}` }))));
var ee = import_react5.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", height: "20", width: "20" }, import_react5.default.createElement("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z", clipRule: "evenodd" }));
var oe = import_react5.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor", height: "20", width: "20" }, import_react5.default.createElement("path", { fillRule: "evenodd", d: "M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z", clipRule: "evenodd" }));
var ae = import_react5.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", height: "20", width: "20" }, import_react5.default.createElement("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z", clipRule: "evenodd" }));
var se = import_react5.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", height: "20", width: "20" }, import_react5.default.createElement("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z", clipRule: "evenodd" }));
var Ot = import_react5.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }, import_react5.default.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), import_react5.default.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" }));
var Ft = () => {
  let [n, e] = import_react6.default.useState(document.hidden);
  return import_react6.default.useEffect(() => {
    let t = () => {
      e(document.hidden);
    };
    return document.addEventListener("visibilitychange", t), () => window.removeEventListener("visibilitychange", t);
  }, []), n;
};
var bt = 1;
var yt = class {
  constructor() {
    this.subscribe = (e) => (this.subscribers.push(e), () => {
      let t = this.subscribers.indexOf(e);
      this.subscribers.splice(t, 1);
    });
    this.publish = (e) => {
      this.subscribers.forEach((t) => t(e));
    };
    this.addToast = (e) => {
      this.publish(e), this.toasts = [...this.toasts, e];
    };
    this.create = (e) => {
      var S;
      let _a = e, { message: t } = _a, a = __objRest(_a, ["message"]), u = typeof (e == null ? void 0 : e.id) == "number" || ((S = e.id) == null ? void 0 : S.length) > 0 ? e.id : bt++, f = this.toasts.find((g) => g.id === u), w = e.dismissible === void 0 ? true : e.dismissible;
      return this.dismissedToasts.has(u) && this.dismissedToasts.delete(u), f ? this.toasts = this.toasts.map((g) => g.id === u ? (this.publish(__spreadProps(__spreadValues(__spreadValues({}, g), e), { id: u, title: t })), __spreadProps(__spreadValues(__spreadValues({}, g), e), { id: u, dismissible: w, title: t })) : g) : this.addToast(__spreadProps(__spreadValues({ title: t }, a), { dismissible: w, id: u })), u;
    };
    this.dismiss = (e) => (this.dismissedToasts.add(e), e || this.toasts.forEach((t) => {
      this.subscribers.forEach((a) => a({ id: t.id, dismiss: true }));
    }), this.subscribers.forEach((t) => t({ id: e, dismiss: true })), e);
    this.message = (e, t) => this.create(__spreadProps(__spreadValues({}, t), { message: e }));
    this.error = (e, t) => this.create(__spreadProps(__spreadValues({}, t), { message: e, type: "error" }));
    this.success = (e, t) => this.create(__spreadProps(__spreadValues({}, t), { type: "success", message: e }));
    this.info = (e, t) => this.create(__spreadProps(__spreadValues({}, t), { type: "info", message: e }));
    this.warning = (e, t) => this.create(__spreadProps(__spreadValues({}, t), { type: "warning", message: e }));
    this.loading = (e, t) => this.create(__spreadProps(__spreadValues({}, t), { type: "loading", message: e }));
    this.promise = (e, t) => {
      if (!t) return;
      let a;
      t.loading !== void 0 && (a = this.create(__spreadProps(__spreadValues({}, t), { promise: e, type: "loading", message: t.loading, description: typeof t.description != "function" ? t.description : void 0 })));
      let u = e instanceof Promise ? e : e(), f = a !== void 0, w, S = u.then(async (i) => {
        if (w = ["resolve", i], import_react7.default.isValidElement(i)) f = false, this.create({ id: a, type: "default", message: i });
        else if (ie(i) && !i.ok) {
          f = false;
          let T = typeof t.error == "function" ? await t.error(`HTTP error! status: ${i.status}`) : t.error, F = typeof t.description == "function" ? await t.description(`HTTP error! status: ${i.status}`) : t.description;
          this.create({ id: a, type: "error", message: T, description: F });
        } else if (t.success !== void 0) {
          f = false;
          let T = typeof t.success == "function" ? await t.success(i) : t.success, F = typeof t.description == "function" ? await t.description(i) : t.description;
          this.create({ id: a, type: "success", message: T, description: F });
        }
      }).catch(async (i) => {
        if (w = ["reject", i], t.error !== void 0) {
          f = false;
          let D = typeof t.error == "function" ? await t.error(i) : t.error, T = typeof t.description == "function" ? await t.description(i) : t.description;
          this.create({ id: a, type: "error", message: D, description: T });
        }
      }).finally(() => {
        var i;
        f && (this.dismiss(a), a = void 0), (i = t.finally) == null || i.call(t);
      }), g = () => new Promise((i, D) => S.then(() => w[0] === "reject" ? D(w[1]) : i(w[1])).catch(D));
      return typeof a != "string" && typeof a != "number" ? { unwrap: g } : Object.assign(a, { unwrap: g });
    };
    this.custom = (e, t) => {
      let a = (t == null ? void 0 : t.id) || bt++;
      return this.create(__spreadValues({ jsx: e(a), id: a }, t)), a;
    };
    this.getActiveToasts = () => this.toasts.filter((e) => !this.dismissedToasts.has(e.id));
    this.subscribers = [], this.toasts = [], this.dismissedToasts = /* @__PURE__ */ new Set();
  }
};
var v = new yt();
var ne = (n, e) => {
  let t = (e == null ? void 0 : e.id) || bt++;
  return v.addToast(__spreadProps(__spreadValues({ title: n }, e), { id: t })), t;
};
var ie = (n) => n && typeof n == "object" && "ok" in n && typeof n.ok == "boolean" && "status" in n && typeof n.status == "number";
var le = ne;
var ce = () => v.toasts;
var de = () => v.getActiveToasts();
var ue = Object.assign(le, { success: v.success, info: v.info, warning: v.warning, error: v.error, custom: v.custom, message: v.message, promise: v.promise, dismiss: v.dismiss, loading: v.loading }, { getHistory: ce, getToasts: de });
function wt(n, { insertAt: e } = {}) {
  if (!n || typeof document == "undefined") return;
  let t = document.head || document.getElementsByTagName("head")[0], a = document.createElement("style");
  a.type = "text/css", e === "top" && t.firstChild ? t.insertBefore(a, t.firstChild) : t.appendChild(a), a.styleSheet ? a.styleSheet.cssText = n : a.appendChild(document.createTextNode(n));
}
wt(`:where(html[dir="ltr"]),:where([data-sonner-toaster][dir="ltr"]){--toast-icon-margin-start: -3px;--toast-icon-margin-end: 4px;--toast-svg-margin-start: -1px;--toast-svg-margin-end: 0px;--toast-button-margin-start: auto;--toast-button-margin-end: 0;--toast-close-button-start: 0;--toast-close-button-end: unset;--toast-close-button-transform: translate(-35%, -35%)}:where(html[dir="rtl"]),:where([data-sonner-toaster][dir="rtl"]){--toast-icon-margin-start: 4px;--toast-icon-margin-end: -3px;--toast-svg-margin-start: 0px;--toast-svg-margin-end: -1px;--toast-button-margin-start: 0;--toast-button-margin-end: auto;--toast-close-button-start: unset;--toast-close-button-end: 0;--toast-close-button-transform: translate(35%, -35%)}:where([data-sonner-toaster]){position:fixed;width:var(--width);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;--gray1: hsl(0, 0%, 99%);--gray2: hsl(0, 0%, 97.3%);--gray3: hsl(0, 0%, 95.1%);--gray4: hsl(0, 0%, 93%);--gray5: hsl(0, 0%, 90.9%);--gray6: hsl(0, 0%, 88.7%);--gray7: hsl(0, 0%, 85.8%);--gray8: hsl(0, 0%, 78%);--gray9: hsl(0, 0%, 56.1%);--gray10: hsl(0, 0%, 52.3%);--gray11: hsl(0, 0%, 43.5%);--gray12: hsl(0, 0%, 9%);--border-radius: 8px;box-sizing:border-box;padding:0;margin:0;list-style:none;outline:none;z-index:999999999;transition:transform .4s ease}:where([data-sonner-toaster][data-lifted="true"]){transform:translateY(-10px)}@media (hover: none) and (pointer: coarse){:where([data-sonner-toaster][data-lifted="true"]){transform:none}}:where([data-sonner-toaster][data-x-position="right"]){right:var(--offset-right)}:where([data-sonner-toaster][data-x-position="left"]){left:var(--offset-left)}:where([data-sonner-toaster][data-x-position="center"]){left:50%;transform:translate(-50%)}:where([data-sonner-toaster][data-y-position="top"]){top:var(--offset-top)}:where([data-sonner-toaster][data-y-position="bottom"]){bottom:var(--offset-bottom)}:where([data-sonner-toast]){--y: translateY(100%);--lift-amount: calc(var(--lift) * var(--gap));z-index:var(--z-index);position:absolute;opacity:0;transform:var(--y);filter:blur(0);touch-action:none;transition:transform .4s,opacity .4s,height .4s,box-shadow .2s;box-sizing:border-box;outline:none;overflow-wrap:anywhere}:where([data-sonner-toast][data-styled="true"]){padding:16px;background:var(--normal-bg);border:1px solid var(--normal-border);color:var(--normal-text);border-radius:var(--border-radius);box-shadow:0 4px 12px #0000001a;width:var(--width);font-size:13px;display:flex;align-items:center;gap:6px}:where([data-sonner-toast]:focus-visible){box-shadow:0 4px 12px #0000001a,0 0 0 2px #0003}:where([data-sonner-toast][data-y-position="top"]){top:0;--y: translateY(-100%);--lift: 1;--lift-amount: calc(1 * var(--gap))}:where([data-sonner-toast][data-y-position="bottom"]){bottom:0;--y: translateY(100%);--lift: -1;--lift-amount: calc(var(--lift) * var(--gap))}:where([data-sonner-toast]) :where([data-description]){font-weight:400;line-height:1.4;color:inherit}:where([data-sonner-toast]) :where([data-title]){font-weight:500;line-height:1.5;color:inherit}:where([data-sonner-toast]) :where([data-icon]){display:flex;height:16px;width:16px;position:relative;justify-content:flex-start;align-items:center;flex-shrink:0;margin-left:var(--toast-icon-margin-start);margin-right:var(--toast-icon-margin-end)}:where([data-sonner-toast][data-promise="true"]) :where([data-icon])>svg{opacity:0;transform:scale(.8);transform-origin:center;animation:sonner-fade-in .3s ease forwards}:where([data-sonner-toast]) :where([data-icon])>*{flex-shrink:0}:where([data-sonner-toast]) :where([data-icon]) svg{margin-left:var(--toast-svg-margin-start);margin-right:var(--toast-svg-margin-end)}:where([data-sonner-toast]) :where([data-content]){display:flex;flex-direction:column;gap:2px}[data-sonner-toast][data-styled=true] [data-button]{border-radius:4px;padding-left:8px;padding-right:8px;height:24px;font-size:12px;color:var(--normal-bg);background:var(--normal-text);margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end);border:none;cursor:pointer;outline:none;display:flex;align-items:center;flex-shrink:0;transition:opacity .4s,box-shadow .2s}:where([data-sonner-toast]) :where([data-button]):focus-visible{box-shadow:0 0 0 2px #0006}:where([data-sonner-toast]) :where([data-button]):first-of-type{margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end)}:where([data-sonner-toast]) :where([data-cancel]){color:var(--normal-text);background:rgba(0,0,0,.08)}:where([data-sonner-toast][data-theme="dark"]) :where([data-cancel]){background:rgba(255,255,255,.3)}:where([data-sonner-toast]) :where([data-close-button]){position:absolute;left:var(--toast-close-button-start);right:var(--toast-close-button-end);top:0;height:20px;width:20px;display:flex;justify-content:center;align-items:center;padding:0;color:var(--gray12);border:1px solid var(--gray4);transform:var(--toast-close-button-transform);border-radius:50%;cursor:pointer;z-index:1;transition:opacity .1s,background .2s,border-color .2s}[data-sonner-toast] [data-close-button]{background:var(--gray1)}:where([data-sonner-toast]) :where([data-close-button]):focus-visible{box-shadow:0 4px 12px #0000001a,0 0 0 2px #0003}:where([data-sonner-toast]) :where([data-disabled="true"]){cursor:not-allowed}:where([data-sonner-toast]):hover :where([data-close-button]):hover{background:var(--gray2);border-color:var(--gray5)}:where([data-sonner-toast][data-swiping="true"]):before{content:"";position:absolute;left:-50%;right:-50%;height:100%;z-index:-1}:where([data-sonner-toast][data-y-position="top"][data-swiping="true"]):before{bottom:50%;transform:scaleY(3) translateY(50%)}:where([data-sonner-toast][data-y-position="bottom"][data-swiping="true"]):before{top:50%;transform:scaleY(3) translateY(-50%)}:where([data-sonner-toast][data-swiping="false"][data-removed="true"]):before{content:"";position:absolute;inset:0;transform:scaleY(2)}:where([data-sonner-toast]):after{content:"";position:absolute;left:0;height:calc(var(--gap) + 1px);bottom:100%;width:100%}:where([data-sonner-toast][data-mounted="true"]){--y: translateY(0);opacity:1}:where([data-sonner-toast][data-expanded="false"][data-front="false"]){--scale: var(--toasts-before) * .05 + 1;--y: translateY(calc(var(--lift-amount) * var(--toasts-before))) scale(calc(-1 * var(--scale)));height:var(--front-toast-height)}:where([data-sonner-toast])>*{transition:opacity .4s}:where([data-sonner-toast][data-expanded="false"][data-front="false"][data-styled="true"])>*{opacity:0}:where([data-sonner-toast][data-visible="false"]){opacity:0;pointer-events:none}:where([data-sonner-toast][data-mounted="true"][data-expanded="true"]){--y: translateY(calc(var(--lift) * var(--offset)));height:var(--initial-height)}:where([data-sonner-toast][data-removed="true"][data-front="true"][data-swipe-out="false"]){--y: translateY(calc(var(--lift) * -100%));opacity:0}:where([data-sonner-toast][data-removed="true"][data-front="false"][data-swipe-out="false"][data-expanded="true"]){--y: translateY(calc(var(--lift) * var(--offset) + var(--lift) * -100%));opacity:0}:where([data-sonner-toast][data-removed="true"][data-front="false"][data-swipe-out="false"][data-expanded="false"]){--y: translateY(40%);opacity:0;transition:transform .5s,opacity .2s}:where([data-sonner-toast][data-removed="true"][data-front="false"]):before{height:calc(var(--initial-height) + 20%)}[data-sonner-toast][data-swiping=true]{transform:var(--y) translateY(var(--swipe-amount-y, 0px)) translate(var(--swipe-amount-x, 0px));transition:none}[data-sonner-toast][data-swiped=true]{user-select:none}[data-sonner-toast][data-swipe-out=true][data-y-position=bottom],[data-sonner-toast][data-swipe-out=true][data-y-position=top]{animation-duration:.2s;animation-timing-function:ease-out;animation-fill-mode:forwards}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=left]{animation-name:swipe-out-left}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=right]{animation-name:swipe-out-right}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=up]{animation-name:swipe-out-up}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=down]{animation-name:swipe-out-down}@keyframes swipe-out-left{0%{transform:var(--y) translate(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translate(calc(var(--swipe-amount-x) - 100%));opacity:0}}@keyframes swipe-out-right{0%{transform:var(--y) translate(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translate(calc(var(--swipe-amount-x) + 100%));opacity:0}}@keyframes swipe-out-up{0%{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) - 100%));opacity:0}}@keyframes swipe-out-down{0%{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) + 100%));opacity:0}}@media (max-width: 600px){[data-sonner-toaster]{position:fixed;right:var(--mobile-offset-right);left:var(--mobile-offset-left);width:100%}[data-sonner-toaster][dir=rtl]{left:calc(var(--mobile-offset-left) * -1)}[data-sonner-toaster] [data-sonner-toast]{left:0;right:0;width:calc(100% - var(--mobile-offset-left) * 2)}[data-sonner-toaster][data-x-position=left]{left:var(--mobile-offset-left)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--mobile-offset-bottom)}[data-sonner-toaster][data-y-position=top]{top:var(--mobile-offset-top)}[data-sonner-toaster][data-x-position=center]{left:var(--mobile-offset-left);right:var(--mobile-offset-right);transform:none}}[data-sonner-toaster][data-theme=light]{--normal-bg: #fff;--normal-border: var(--gray4);--normal-text: var(--gray12);--success-bg: hsl(143, 85%, 96%);--success-border: hsl(145, 92%, 91%);--success-text: hsl(140, 100%, 27%);--info-bg: hsl(208, 100%, 97%);--info-border: hsl(221, 91%, 91%);--info-text: hsl(210, 92%, 45%);--warning-bg: hsl(49, 100%, 97%);--warning-border: hsl(49, 91%, 91%);--warning-text: hsl(31, 92%, 45%);--error-bg: hsl(359, 100%, 97%);--error-border: hsl(359, 100%, 94%);--error-text: hsl(360, 100%, 45%)}[data-sonner-toaster][data-theme=light] [data-sonner-toast][data-invert=true]{--normal-bg: #000;--normal-border: hsl(0, 0%, 20%);--normal-text: var(--gray1)}[data-sonner-toaster][data-theme=dark] [data-sonner-toast][data-invert=true]{--normal-bg: #fff;--normal-border: var(--gray3);--normal-text: var(--gray12)}[data-sonner-toaster][data-theme=dark]{--normal-bg: #000;--normal-bg-hover: hsl(0, 0%, 12%);--normal-border: hsl(0, 0%, 20%);--normal-border-hover: hsl(0, 0%, 25%);--normal-text: var(--gray1);--success-bg: hsl(150, 100%, 6%);--success-border: hsl(147, 100%, 12%);--success-text: hsl(150, 86%, 65%);--info-bg: hsl(215, 100%, 6%);--info-border: hsl(223, 100%, 12%);--info-text: hsl(216, 87%, 65%);--warning-bg: hsl(64, 100%, 6%);--warning-border: hsl(60, 100%, 12%);--warning-text: hsl(46, 87%, 65%);--error-bg: hsl(358, 76%, 10%);--error-border: hsl(357, 89%, 16%);--error-text: hsl(358, 100%, 81%)}[data-sonner-toaster][data-theme=dark] [data-sonner-toast] [data-close-button]{background:var(--normal-bg);border-color:var(--normal-border);color:var(--normal-text)}[data-sonner-toaster][data-theme=dark] [data-sonner-toast] [data-close-button]:hover{background:var(--normal-bg-hover);border-color:var(--normal-border-hover)}[data-rich-colors=true][data-sonner-toast][data-type=success],[data-rich-colors=true][data-sonner-toast][data-type=success] [data-close-button]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=info],[data-rich-colors=true][data-sonner-toast][data-type=info] [data-close-button]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning],[data-rich-colors=true][data-sonner-toast][data-type=warning] [data-close-button]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=error],[data-rich-colors=true][data-sonner-toast][data-type=error] [data-close-button]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}.sonner-loading-wrapper{--size: 16px;height:var(--size);width:var(--size);position:absolute;inset:0;z-index:10}.sonner-loading-wrapper[data-visible=false]{transform-origin:center;animation:sonner-fade-out .2s ease forwards}.sonner-spinner{position:relative;top:50%;left:50%;height:var(--size);width:var(--size)}.sonner-loading-bar{animation:sonner-spin 1.2s linear infinite;background:var(--gray11);border-radius:6px;height:8%;left:-10%;position:absolute;top:-3.9%;width:24%}.sonner-loading-bar:nth-child(1){animation-delay:-1.2s;transform:rotate(.0001deg) translate(146%)}.sonner-loading-bar:nth-child(2){animation-delay:-1.1s;transform:rotate(30deg) translate(146%)}.sonner-loading-bar:nth-child(3){animation-delay:-1s;transform:rotate(60deg) translate(146%)}.sonner-loading-bar:nth-child(4){animation-delay:-.9s;transform:rotate(90deg) translate(146%)}.sonner-loading-bar:nth-child(5){animation-delay:-.8s;transform:rotate(120deg) translate(146%)}.sonner-loading-bar:nth-child(6){animation-delay:-.7s;transform:rotate(150deg) translate(146%)}.sonner-loading-bar:nth-child(7){animation-delay:-.6s;transform:rotate(180deg) translate(146%)}.sonner-loading-bar:nth-child(8){animation-delay:-.5s;transform:rotate(210deg) translate(146%)}.sonner-loading-bar:nth-child(9){animation-delay:-.4s;transform:rotate(240deg) translate(146%)}.sonner-loading-bar:nth-child(10){animation-delay:-.3s;transform:rotate(270deg) translate(146%)}.sonner-loading-bar:nth-child(11){animation-delay:-.2s;transform:rotate(300deg) translate(146%)}.sonner-loading-bar:nth-child(12){animation-delay:-.1s;transform:rotate(330deg) translate(146%)}@keyframes sonner-fade-in{0%{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}@keyframes sonner-fade-out{0%{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.8)}}@keyframes sonner-spin{0%{opacity:1}to{opacity:.15}}@media (prefers-reduced-motion){[data-sonner-toast],[data-sonner-toast]>*,.sonner-loading-bar{transition:none!important;animation:none!important}}.sonner-loader{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);transform-origin:center;transition:opacity .2s,transform .2s}.sonner-loader[data-visible=false]{opacity:0;transform:scale(.8) translate(-50%,-50%)}
`);
function tt(n) {
  return n.label !== void 0;
}
var pe = 3;
var me = "32px";
var ge = "16px";
var Wt = 4e3;
var he = 356;
var be = 14;
var ye = 20;
var we = 200;
function M(...n) {
  return n.filter(Boolean).join(" ");
}
function xe(n) {
  let [e, t] = n.split("-"), a = [];
  return e && a.push(e), t && a.push(t), a;
}
var ve = (n) => {
  var Dt, Pt, Nt, Bt, Ct, kt, It, Mt, Ht, At, Lt;
  let { invert: e, toast: t, unstyled: a, interacting: u, setHeights: f, visibleToasts: w, heights: S, index: g, toasts: i, expanded: D, removeToast: T, defaultRichColors: F, closeButton: et, style: ut, cancelButtonStyle: ft, actionButtonStyle: l, className: ot = "", descriptionClassName: at = "", duration: X, position: st, gap: pt, loadingIcon: rt, expandByDefault: B, classNames: s, icons: P, closeButtonAriaLabel: nt = "Close toast", pauseWhenPageIsHidden: it } = n, [Y, C] = import_react4.default.useState(null), [lt, J] = import_react4.default.useState(null), [W, H] = import_react4.default.useState(false), [A, mt] = import_react4.default.useState(false), [L, z] = import_react4.default.useState(false), [ct, d] = import_react4.default.useState(false), [h, y] = import_react4.default.useState(false), [R, j] = import_react4.default.useState(0), [p, _] = import_react4.default.useState(0), O = import_react4.default.useRef(t.duration || X || Wt), G = import_react4.default.useRef(null), k = import_react4.default.useRef(null), Vt = g === 0, Ut = g + 1 <= w, N = t.type, V = t.dismissible !== false, Kt = t.className || "", Xt = t.descriptionClassName || "", dt = import_react4.default.useMemo(() => S.findIndex((r) => r.toastId === t.id) || 0, [S, t.id]), Jt = import_react4.default.useMemo(() => {
    var r;
    return (r = t.closeButton) != null ? r : et;
  }, [t.closeButton, et]), Tt = import_react4.default.useMemo(() => t.duration || X || Wt, [t.duration, X]), gt = import_react4.default.useRef(0), U = import_react4.default.useRef(0), St = import_react4.default.useRef(0), K = import_react4.default.useRef(null), [Gt, Qt] = st.split("-"), Rt = import_react4.default.useMemo(() => S.reduce((r, m, c) => c >= dt ? r : r + m.height, 0), [S, dt]), Et = Ft(), qt = t.invert || e, ht = N === "loading";
  U.current = import_react4.default.useMemo(() => dt * pt + Rt, [dt, Rt]), import_react4.default.useEffect(() => {
    O.current = Tt;
  }, [Tt]), import_react4.default.useEffect(() => {
    H(true);
  }, []), import_react4.default.useEffect(() => {
    let r = k.current;
    if (r) {
      let m = r.getBoundingClientRect().height;
      return _(m), f((c) => [{ toastId: t.id, height: m, position: t.position }, ...c]), () => f((c) => c.filter((b) => b.toastId !== t.id));
    }
  }, [f, t.id]), import_react4.default.useLayoutEffect(() => {
    if (!W) return;
    let r = k.current, m = r.style.height;
    r.style.height = "auto";
    let c = r.getBoundingClientRect().height;
    r.style.height = m, _(c), f((b) => b.find((x) => x.toastId === t.id) ? b.map((x) => x.toastId === t.id ? __spreadProps(__spreadValues({}, x), { height: c }) : x) : [{ toastId: t.id, height: c, position: t.position }, ...b]);
  }, [W, t.title, t.description, f, t.id]);
  let $ = import_react4.default.useCallback(() => {
    mt(true), j(U.current), f((r) => r.filter((m) => m.toastId !== t.id)), setTimeout(() => {
      T(t);
    }, we);
  }, [t, T, f, U]);
  import_react4.default.useEffect(() => {
    if (t.promise && N === "loading" || t.duration === 1 / 0 || t.type === "loading") return;
    let r;
    return D || u || it && Et ? (() => {
      if (St.current < gt.current) {
        let b = (/* @__PURE__ */ new Date()).getTime() - gt.current;
        O.current = O.current - b;
      }
      St.current = (/* @__PURE__ */ new Date()).getTime();
    })() : (() => {
      O.current !== 1 / 0 && (gt.current = (/* @__PURE__ */ new Date()).getTime(), r = setTimeout(() => {
        var b;
        (b = t.onAutoClose) == null || b.call(t, t), $();
      }, O.current));
    })(), () => clearTimeout(r);
  }, [D, u, t, N, it, Et, $]), import_react4.default.useEffect(() => {
    t.delete && $();
  }, [$, t.delete]);
  function Zt() {
    var r, m, c;
    return P != null && P.loading ? import_react4.default.createElement("div", { className: M(s == null ? void 0 : s.loader, (r = t == null ? void 0 : t.classNames) == null ? void 0 : r.loader, "sonner-loader"), "data-visible": N === "loading" }, P.loading) : rt ? import_react4.default.createElement("div", { className: M(s == null ? void 0 : s.loader, (m = t == null ? void 0 : t.classNames) == null ? void 0 : m.loader, "sonner-loader"), "data-visible": N === "loading" }, rt) : import_react4.default.createElement(Yt, { className: M(s == null ? void 0 : s.loader, (c = t == null ? void 0 : t.classNames) == null ? void 0 : c.loader), visible: N === "loading" });
  }
  return import_react4.default.createElement("li", { tabIndex: 0, ref: k, className: M(ot, Kt, s == null ? void 0 : s.toast, (Dt = t == null ? void 0 : t.classNames) == null ? void 0 : Dt.toast, s == null ? void 0 : s.default, s == null ? void 0 : s[N], (Pt = t == null ? void 0 : t.classNames) == null ? void 0 : Pt[N]), "data-sonner-toast": "", "data-rich-colors": (Nt = t.richColors) != null ? Nt : F, "data-styled": !(t.jsx || t.unstyled || a), "data-mounted": W, "data-promise": !!t.promise, "data-swiped": h, "data-removed": A, "data-visible": Ut, "data-y-position": Gt, "data-x-position": Qt, "data-index": g, "data-front": Vt, "data-swiping": L, "data-dismissible": V, "data-type": N, "data-invert": qt, "data-swipe-out": ct, "data-swipe-direction": lt, "data-expanded": !!(D || B && W), style: __spreadValues(__spreadValues({ "--index": g, "--toasts-before": g, "--z-index": i.length - g, "--offset": `${A ? R : U.current}px`, "--initial-height": B ? "auto" : `${p}px` }, ut), t.style), onDragEnd: () => {
    z(false), C(null), K.current = null;
  }, onPointerDown: (r) => {
    ht || !V || (G.current = /* @__PURE__ */ new Date(), j(U.current), r.target.setPointerCapture(r.pointerId), r.target.tagName !== "BUTTON" && (z(true), K.current = { x: r.clientX, y: r.clientY }));
  }, onPointerUp: () => {
    var x, Q, q, Z;
    if (ct || !V) return;
    K.current = null;
    let r = Number(((x = k.current) == null ? void 0 : x.style.getPropertyValue("--swipe-amount-x").replace("px", "")) || 0), m = Number(((Q = k.current) == null ? void 0 : Q.style.getPropertyValue("--swipe-amount-y").replace("px", "")) || 0), c = (/* @__PURE__ */ new Date()).getTime() - ((q = G.current) == null ? void 0 : q.getTime()), b = Y === "x" ? r : m, I = Math.abs(b) / c;
    if (Math.abs(b) >= ye || I > 0.11) {
      j(U.current), (Z = t.onDismiss) == null || Z.call(t, t), J(Y === "x" ? r > 0 ? "right" : "left" : m > 0 ? "down" : "up"), $(), d(true), y(false);
      return;
    }
    z(false), C(null);
  }, onPointerMove: (r) => {
    var Q, q, Z, zt;
    if (!K.current || !V || ((Q = window.getSelection()) == null ? void 0 : Q.toString().length) > 0) return;
    let c = r.clientY - K.current.y, b = r.clientX - K.current.x, I = (q = n.swipeDirections) != null ? q : xe(st);
    !Y && (Math.abs(b) > 1 || Math.abs(c) > 1) && C(Math.abs(b) > Math.abs(c) ? "x" : "y");
    let x = { x: 0, y: 0 };
    Y === "y" ? (I.includes("top") || I.includes("bottom")) && (I.includes("top") && c < 0 || I.includes("bottom") && c > 0) && (x.y = c) : Y === "x" && (I.includes("left") || I.includes("right")) && (I.includes("left") && b < 0 || I.includes("right") && b > 0) && (x.x = b), (Math.abs(x.x) > 0 || Math.abs(x.y) > 0) && y(true), (Z = k.current) == null || Z.style.setProperty("--swipe-amount-x", `${x.x}px`), (zt = k.current) == null || zt.style.setProperty("--swipe-amount-y", `${x.y}px`);
  } }, Jt && !t.jsx ? import_react4.default.createElement("button", { "aria-label": nt, "data-disabled": ht, "data-close-button": true, onClick: ht || !V ? () => {
  } : () => {
    var r;
    $(), (r = t.onDismiss) == null || r.call(t, t);
  }, className: M(s == null ? void 0 : s.closeButton, (Bt = t == null ? void 0 : t.classNames) == null ? void 0 : Bt.closeButton) }, (Ct = P == null ? void 0 : P.close) != null ? Ct : Ot) : null, t.jsx || (0, import_react4.isValidElement)(t.title) ? t.jsx ? t.jsx : typeof t.title == "function" ? t.title() : t.title : import_react4.default.createElement(import_react4.default.Fragment, null, N || t.icon || t.promise ? import_react4.default.createElement("div", { "data-icon": "", className: M(s == null ? void 0 : s.icon, (kt = t == null ? void 0 : t.classNames) == null ? void 0 : kt.icon) }, t.promise || t.type === "loading" && !t.icon ? t.icon || Zt() : null, t.type !== "loading" ? t.icon || (P == null ? void 0 : P[N]) || jt(N) : null) : null, import_react4.default.createElement("div", { "data-content": "", className: M(s == null ? void 0 : s.content, (It = t == null ? void 0 : t.classNames) == null ? void 0 : It.content) }, import_react4.default.createElement("div", { "data-title": "", className: M(s == null ? void 0 : s.title, (Mt = t == null ? void 0 : t.classNames) == null ? void 0 : Mt.title) }, typeof t.title == "function" ? t.title() : t.title), t.description ? import_react4.default.createElement("div", { "data-description": "", className: M(at, Xt, s == null ? void 0 : s.description, (Ht = t == null ? void 0 : t.classNames) == null ? void 0 : Ht.description) }, typeof t.description == "function" ? t.description() : t.description) : null), (0, import_react4.isValidElement)(t.cancel) ? t.cancel : t.cancel && tt(t.cancel) ? import_react4.default.createElement("button", { "data-button": true, "data-cancel": true, style: t.cancelButtonStyle || ft, onClick: (r) => {
    var m, c;
    tt(t.cancel) && V && ((c = (m = t.cancel).onClick) == null || c.call(m, r), $());
  }, className: M(s == null ? void 0 : s.cancelButton, (At = t == null ? void 0 : t.classNames) == null ? void 0 : At.cancelButton) }, t.cancel.label) : null, (0, import_react4.isValidElement)(t.action) ? t.action : t.action && tt(t.action) ? import_react4.default.createElement("button", { "data-button": true, "data-action": true, style: t.actionButtonStyle || l, onClick: (r) => {
    var m, c;
    tt(t.action) && ((c = (m = t.action).onClick) == null || c.call(m, r), !r.defaultPrevented && $());
  }, className: M(s == null ? void 0 : s.actionButton, (Lt = t == null ? void 0 : t.classNames) == null ? void 0 : Lt.actionButton) }, t.action.label) : null));
};
function _t() {
  if (typeof window == "undefined" || typeof document == "undefined") return "ltr";
  let n = document.documentElement.getAttribute("dir");
  return n === "auto" || !n ? window.getComputedStyle(document.documentElement).direction : n;
}
function Te(n, e) {
  let t = {};
  return [n, e].forEach((a, u) => {
    let f = u === 1, w = f ? "--mobile-offset" : "--offset", S = f ? ge : me;
    function g(i) {
      ["top", "right", "bottom", "left"].forEach((D) => {
        t[`${w}-${D}`] = typeof i == "number" ? `${i}px` : i;
      });
    }
    typeof a == "number" || typeof a == "string" ? g(a) : typeof a == "object" ? ["top", "right", "bottom", "left"].forEach((i) => {
      a[i] === void 0 ? t[`${w}-${i}`] = S : t[`${w}-${i}`] = typeof a[i] == "number" ? `${a[i]}px` : a[i];
    }) : g(S);
  }), t;
}
var $e = (0, import_react4.forwardRef)(function(e, t) {
  let { invert: a, position: u = "bottom-right", hotkey: f = ["altKey", "KeyT"], expand: w, closeButton: S, className: g, offset: i, mobileOffset: D, theme: T = "light", richColors: F, duration: et, style: ut, visibleToasts: ft = pe, toastOptions: l, dir: ot = _t(), gap: at = be, loadingIcon: X, icons: st, containerAriaLabel: pt = "Notifications", pauseWhenPageIsHidden: rt } = e, [B, s] = import_react4.default.useState([]), P = import_react4.default.useMemo(() => Array.from(new Set([u].concat(B.filter((d) => d.position).map((d) => d.position)))), [B, u]), [nt, it] = import_react4.default.useState([]), [Y, C] = import_react4.default.useState(false), [lt, J] = import_react4.default.useState(false), [W, H] = import_react4.default.useState(T !== "system" ? T : typeof window != "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"), A = import_react4.default.useRef(null), mt = f.join("+").replace(/Key/g, "").replace(/Digit/g, ""), L = import_react4.default.useRef(null), z = import_react4.default.useRef(false), ct = import_react4.default.useCallback((d) => {
    s((h) => {
      var y;
      return (y = h.find((R) => R.id === d.id)) != null && y.delete || v.dismiss(d.id), h.filter(({ id: R }) => R !== d.id);
    });
  }, []);
  return import_react4.default.useEffect(() => v.subscribe((d) => {
    if (d.dismiss) {
      s((h) => h.map((y) => y.id === d.id ? __spreadProps(__spreadValues({}, y), { delete: true }) : y));
      return;
    }
    setTimeout(() => {
      import_react_dom.default.flushSync(() => {
        s((h) => {
          let y = h.findIndex((R) => R.id === d.id);
          return y !== -1 ? [...h.slice(0, y), __spreadValues(__spreadValues({}, h[y]), d), ...h.slice(y + 1)] : [d, ...h];
        });
      });
    });
  }), []), import_react4.default.useEffect(() => {
    if (T !== "system") {
      H(T);
      return;
    }
    if (T === "system" && (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? H("dark") : H("light")), typeof window == "undefined") return;
    let d = window.matchMedia("(prefers-color-scheme: dark)");
    try {
      d.addEventListener("change", ({ matches: h }) => {
        H(h ? "dark" : "light");
      });
    } catch (h) {
      d.addListener(({ matches: y }) => {
        try {
          H(y ? "dark" : "light");
        } catch (R) {
          console.error(R);
        }
      });
    }
  }, [T]), import_react4.default.useEffect(() => {
    B.length <= 1 && C(false);
  }, [B]), import_react4.default.useEffect(() => {
    let d = (h) => {
      var R, j;
      f.every((p) => h[p] || h.code === p) && (C(true), (R = A.current) == null || R.focus()), h.code === "Escape" && (document.activeElement === A.current || (j = A.current) != null && j.contains(document.activeElement)) && C(false);
    };
    return document.addEventListener("keydown", d), () => document.removeEventListener("keydown", d);
  }, [f]), import_react4.default.useEffect(() => {
    if (A.current) return () => {
      L.current && (L.current.focus({ preventScroll: true }), L.current = null, z.current = false);
    };
  }, [A.current]), import_react4.default.createElement("section", { ref: t, "aria-label": `${pt} ${mt}`, tabIndex: -1, "aria-live": "polite", "aria-relevant": "additions text", "aria-atomic": "false", suppressHydrationWarning: true }, P.map((d, h) => {
    var j;
    let [y, R] = d.split("-");
    return B.length ? import_react4.default.createElement("ol", { key: d, dir: ot === "auto" ? _t() : ot, tabIndex: -1, ref: A, className: g, "data-sonner-toaster": true, "data-theme": W, "data-y-position": y, "data-lifted": Y && B.length > 1 && !w, "data-x-position": R, style: __spreadValues(__spreadValues({ "--front-toast-height": `${((j = nt[0]) == null ? void 0 : j.height) || 0}px`, "--width": `${he}px`, "--gap": `${at}px` }, ut), Te(i, D)), onBlur: (p) => {
      z.current && !p.currentTarget.contains(p.relatedTarget) && (z.current = false, L.current && (L.current.focus({ preventScroll: true }), L.current = null));
    }, onFocus: (p) => {
      p.target instanceof HTMLElement && p.target.dataset.dismissible === "false" || z.current || (z.current = true, L.current = p.relatedTarget);
    }, onMouseEnter: () => C(true), onMouseMove: () => C(true), onMouseLeave: () => {
      lt || C(false);
    }, onDragEnd: () => C(false), onPointerDown: (p) => {
      p.target instanceof HTMLElement && p.target.dataset.dismissible === "false" || J(true);
    }, onPointerUp: () => J(false) }, B.filter((p) => !p.position && h === 0 || p.position === d).map((p, _) => {
      var O, G;
      return import_react4.default.createElement(ve, { key: p.id, icons: st, index: _, toast: p, defaultRichColors: F, duration: (O = l == null ? void 0 : l.duration) != null ? O : et, className: l == null ? void 0 : l.className, descriptionClassName: l == null ? void 0 : l.descriptionClassName, invert: a, visibleToasts: ft, closeButton: (G = l == null ? void 0 : l.closeButton) != null ? G : S, interacting: lt, position: d, style: l == null ? void 0 : l.style, unstyled: l == null ? void 0 : l.unstyled, classNames: l == null ? void 0 : l.classNames, cancelButtonStyle: l == null ? void 0 : l.cancelButtonStyle, actionButtonStyle: l == null ? void 0 : l.actionButtonStyle, removeToast: ct, toasts: B.filter((k) => k.position == p.position), heights: nt.filter((k) => k.position == p.position), setHeights: it, expandByDefault: w, gap: at, loadingIcon: X, expanded: Y, pauseWhenPageIsHidden: rt, swipeDirections: e.swipeDirections });
    })) : null;
  }));
});

// packages/react/src/lib/utils.ts
var import_clsx = require("clsx");
var import_tailwind_merge = require("tailwind-merge");
function cn(...inputs) {
  return (0, import_tailwind_merge.twMerge)((0, import_clsx.clsx)(inputs));
}

// packages/react/src/components/ui/sonner.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function Toaster(_a) {
  var _b = _a, { className, toastOptions } = _b, props = __objRest(_b, ["className", "toastOptions"]);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    $e,
    __spreadValues({
      className: cn("toaster group", className),
      toastOptions: __spreadValues({
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
        }
      }, toastOptions)
    }, props)
  );
}

// packages/react/src/lib/notification-context.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var NotificationContext = (0, import_react8.createContext)(
  void 0
);
function useNotification() {
  const context = (0, import_react8.useContext)(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}
function NotificationProvider({ children }) {
  const [notifications, setNotifications] = (0, import_react8.useState)([]);
  const showNotification = (0, import_react8.useCallback)(
    (notification) => {
      var _a, _b;
      const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newNotification = __spreadProps(__spreadValues({}, notification), {
        id,
        duration: (_a = notification.duration) != null ? _a : 5e3
      });
      setNotifications((prev) => [newNotification, ...prev]);
      const duration = (_b = newNotification.duration) != null ? _b : 5e3;
      const toastDuration = duration <= 0 ? Infinity : duration;
      const toastOptions = {
        id,
        description: newNotification.message,
        duration: toastDuration
      };
      if (newNotification.type === "success") {
        ue.success(newNotification.title, toastOptions);
      } else if (newNotification.type === "error") {
        ue.error(newNotification.title, toastOptions);
      } else {
        ue(newNotification.title, toastOptions);
      }
      if (duration > 0) {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, duration);
      }
    },
    []
  );
  const dismissNotification = (0, import_react8.useCallback)((id) => {
    ue.dismiss(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    NotificationContext.Provider,
    {
      value: { showNotification, notifications, dismissNotification },
      children: [
        children,
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Toaster, { position: "top-right" })
      ]
    }
  );
}

// packages/react/src/utils/wallet.ts
var import_react9 = require("react");
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
function normalizeWalletError(error) {
  var _a, _b, _c, _d, _e, _f, _g;
  const e = error;
  const cause = (_a = e == null ? void 0 : e.cause) != null ? _a : null;
  const code = (_b = typeof (e == null ? void 0 : e.code) === "number" ? e.code : void 0) != null ? _b : typeof (cause == null ? void 0 : cause.code) === "number" ? cause.code : void 0;
  const name = (_c = typeof (e == null ? void 0 : e.name) === "string" ? e.name : void 0) != null ? _c : typeof (cause == null ? void 0 : cause.name) === "string" ? cause.name : void 0;
  const msg = (_g = (_f = (_e = (_d = typeof (e == null ? void 0 : e.shortMessage) === "string" ? e.shortMessage : void 0) != null ? _d : typeof (cause == null ? void 0 : cause.shortMessage) === "string" ? cause.shortMessage : void 0) != null ? _e : typeof (e == null ? void 0 : e.message) === "string" ? e.message : void 0) != null ? _f : typeof (cause == null ? void 0 : cause.message) === "string" ? cause.message : void 0) != null ? _g : "Unknown wallet error";
  const rejected = code === 4001 || name === "UserRejectedRequestError" || name === "RejectedRequestError" || /user rejected|rejected the request|denied|request rejected|canceled|cancelled/i.test(
    msg
  );
  return { rejected, message: msg };
}
function toHexQuantity(value) {
  const trimmed = value.trim();
  const asBigInt = BigInt(trimmed);
  return `0x${asBigInt.toString(16)}`;
}
async function pickInjectedProvider(publicKey) {
  const ethereum = globalThis.ethereum;
  if (!(ethereum == null ? void 0 : ethereum.request)) return void 0;
  const candidates = Array.isArray(ethereum.providers) ? ethereum.providers.filter(
    (p) => !!(p == null ? void 0 : p.request)
  ) : [ethereum];
  const target = publicKey == null ? void 0 : publicKey.toLowerCase();
  if (target) {
    for (const candidate of candidates) {
      try {
        const accounts = await candidate.request({
          method: "eth_accounts"
        });
        const list = Array.isArray(accounts) ? accounts.map((a) => String(a).toLowerCase()) : [];
        if (list.includes(target)) return candidate;
      } catch (e) {
      }
    }
  }
  return candidates[0];
}
function WalletSystemMessageEmitter({
  wallet
}) {
  const { sendSystemMessage } = useRuntimeActions();
  const lastWalletRef = (0, import_react9.useRef)({ isConnected: false });
  (0, import_react9.useEffect)(() => {
    const prev = lastWalletRef.current;
    const { address, chainId, isConnected } = wallet;
    const normalizedAddress = address == null ? void 0 : address.toLowerCase();
    if (isConnected && normalizedAddress && chainId && (!prev.isConnected || prev.address !== normalizedAddress)) {
      const networkName = getNetworkName(chainId);
      const message = `User connected wallet with address ${normalizedAddress} on ${networkName} network (Chain ID: ${chainId}). Ready to help with transactions.`;
      console.log(message);
      void sendSystemMessage(message);
      lastWalletRef.current = {
        isConnected: true,
        address: normalizedAddress,
        chainId
      };
      return;
    }
    if (!isConnected && prev.isConnected) {
      void sendSystemMessage("Wallet disconnected by user.");
      console.log("Wallet disconnected by user.");
      lastWalletRef.current = { isConnected: false };
      return;
    }
    if (isConnected && normalizedAddress && chainId && prev.isConnected && prev.address === normalizedAddress && prev.chainId !== chainId) {
      const networkName = getNetworkName(chainId);
      const message = `User switched wallet to ${networkName} network (Chain ID: ${chainId}).`;
      console.log(message);
      void sendSystemMessage(message);
      lastWalletRef.current = {
        isConnected: true,
        address: normalizedAddress,
        chainId
      };
    }
  }, [wallet, sendSystemMessage]);
  return null;
}

// packages/react/src/runtime/wallet-handler.ts
var WalletHandler = class {
  constructor(config) {
    this.config = config;
    this.handledRequests = /* @__PURE__ */ new Set();
    this.queue = [];
    this.inFlight = false;
  }
  handleRequest(sessionId, threadId, request) {
    if (this.config.getCurrentThreadId() !== threadId) return;
    const description = request.description || request.topic || "Wallet transaction requested";
    this.config.showNotification({
      type: "notice",
      iconType: "wallet",
      title: "Transaction Request",
      message: description
    });
    this.enqueue(sessionId, threadId, request);
    void this.drain();
  }
  enqueue(sessionId, threadId, request) {
    var _a;
    const key = `${sessionId}:${(_a = request.timestamp) != null ? _a : JSON.stringify(request)}`;
    if (this.handledRequests.has(key)) return;
    this.handledRequests.add(key);
    this.queue.push({ sessionId, threadId, request });
  }
  async drain() {
    var _a, _b, _c;
    if (this.inFlight) return;
    const next = this.queue.shift();
    if (!next) return;
    this.inFlight = true;
    try {
      if (this.config.onWalletTxRequest) {
        const txHash2 = await this.config.onWalletTxRequest(next.request, {
          sessionId: next.sessionId,
          threadId: next.threadId,
          publicKey: this.config.publicKey
        });
        this.config.showNotification({
          type: "success",
          iconType: "transaction",
          title: "Transaction Sent",
          message: `Hash: ${txHash2}`
        });
        await this.config.backendApiRef.current.postSystemMessage(
          next.sessionId,
          `Transaction sent: ${txHash2}`
        );
        await this.refreshThreadIfCurrent(next.sessionId, next.threadId);
        return;
      }
      const activeProvider = await pickInjectedProvider(this.config.publicKey);
      if (!(activeProvider == null ? void 0 : activeProvider.request)) {
        this.config.showNotification({
          type: "error",
          iconType: "wallet",
          title: "Wallet Not Found",
          message: "No wallet provider found (window.ethereum missing)."
        });
        await this.config.backendApiRef.current.postSystemMessage(
          next.sessionId,
          "No wallet provider found (window.ethereum missing)."
        );
        return;
      }
      const accounts = await activeProvider.request({
        method: "eth_accounts"
      });
      const addresses = Array.isArray(accounts) ? accounts.map(String) : [];
      const from = this.config.publicKey || addresses[0];
      if (!from) {
        await activeProvider.request({ method: "eth_requestAccounts" });
      }
      const fromAddress = this.config.publicKey || await activeProvider.request({ method: "eth_accounts" });
      const resolvedFrom = this.config.publicKey || (Array.isArray(fromAddress) ? String((_a = fromAddress[0]) != null ? _a : "") : "");
      if (!resolvedFrom) {
        this.config.showNotification({
          type: "error",
          iconType: "wallet",
          title: "Wallet Not Connected",
          message: "Please connect a wallet to sign the requested transaction."
        });
        await this.config.backendApiRef.current.postSystemMessage(
          next.sessionId,
          "Wallet is not connected; please connect a wallet to sign the requested transaction."
        );
        return;
      }
      const gas = (_c = (_b = next.request.gas) != null ? _b : next.request.gas_limit) != null ? _c : void 0;
      let valueHex;
      let gasHex;
      try {
        valueHex = toHexQuantity(next.request.value);
        if (gas) gasHex = toHexQuantity(gas);
      } catch (error) {
        this.config.showNotification({
          type: "error",
          iconType: "transaction",
          title: "Invalid Transaction",
          message: error.message
        });
        await this.config.backendApiRef.current.postSystemMessage(
          next.sessionId,
          `Invalid wallet transaction request payload: ${error.message}`
        );
        return;
      }
      const txParams = __spreadValues({
        from: resolvedFrom,
        to: next.request.to,
        value: valueHex,
        data: next.request.data
      }, gasHex ? { gas: gasHex } : {});
      const txHash = await activeProvider.request({
        method: "eth_sendTransaction",
        params: [txParams]
      });
      this.config.showNotification({
        type: "success",
        title: "Transaction sent",
        message: `Transaction hash: ${txHash}`
      });
      await this.config.backendApiRef.current.postSystemMessage(
        next.sessionId,
        `Transaction sent: ${txHash}`
      );
      await this.refreshThreadIfCurrent(next.sessionId, next.threadId);
    } catch (error) {
      const normalized = normalizeWalletError(error);
      const final = normalized.rejected ? "Transaction rejected by user." : `Transaction failed: ${normalized.message}`;
      this.config.showNotification({
        type: normalized.rejected ? "notice" : "error",
        iconType: normalized.rejected ? "transaction" : "error",
        title: normalized.rejected ? "Transaction Rejected" : "Transaction Failed",
        message: normalized.rejected ? "Transaction was rejected by user." : normalized.message
      });
      try {
        await this.config.backendApiRef.current.postSystemMessage(
          next.sessionId,
          final
        );
        await this.refreshThreadIfCurrent(next.sessionId, next.threadId);
      } catch (postError) {
        console.error("Failed to report wallet tx result to backend:", postError);
      }
    } finally {
      this.inFlight = false;
      void this.drain();
    }
  }
  async refreshThreadIfCurrent(sessionId, threadId) {
    if (this.config.getCurrentThreadId() !== threadId) return;
    try {
      const state = await this.config.backendApiRef.current.fetchState(sessionId);
      this.config.applySessionMessagesToThread(threadId, state.messages);
    } catch (refreshError) {
      console.error("Failed to refresh state after wallet tx:", refreshError);
    }
  }
};

// packages/react/src/runtime/event-controller.ts
var EventController = class {
  constructor(config) {
    this.config = config;
    this.lastEventIdBySession = /* @__PURE__ */ new Map();
    this.eventsInFlight = /* @__PURE__ */ new Set();
    this.updateSubscriptions = /* @__PURE__ */ new Map();
    this.subscribableSessionId = null;
  }
  setSubscribableSessionId(sessionId) {
    console.log("\u{1F514} [updates] setSubscribableSessionId", { sessionId });
    this.subscribableSessionId = sessionId;
    this.syncSubscriptions();
  }
  syncSubscriptions() {
    console.log("\u{1F514} [updates] syncSubscriptions", {
      subscribableSessionId: this.subscribableSessionId,
      active: Array.from(this.updateSubscriptions.keys())
    });
    const nextSessions = /* @__PURE__ */ new Set();
    if (this.subscribableSessionId) {
      nextSessions.add(this.subscribableSessionId);
    }
    for (const sessionId of this.updateSubscriptions.keys()) {
      if (!nextSessions.has(sessionId)) {
        this.removeSubscription(sessionId);
      }
    }
    for (const sessionId of nextSessions) {
      this.ensureSubscription(sessionId);
    }
  }
  ensureSubscription(sessionId) {
    if (this.updateSubscriptions.has(sessionId)) return;
    console.log("\u{1F514} [updates] ensureSubscription", { sessionId });
    const unsubscribe = this.config.backendApiRef.current.subscribeToUpdates(
      sessionId,
      (update) => {
        console.log("\u{1F514} [updates] event_available", {
          sessionId: update.session_id,
          eventId: update.event_id,
          eventType: update.event_type
        });
        if (update.type !== "event_available") return;
        void this.drainEvents(update.session_id);
      },
      (error) => {
        console.error("Failed to handle system update SSE:", error);
      }
    );
    this.updateSubscriptions.set(sessionId, unsubscribe);
  }
  removeSubscription(sessionId) {
    const unsubscribe = this.updateSubscriptions.get(sessionId);
    if (!unsubscribe) return;
    unsubscribe();
    this.updateSubscriptions.delete(sessionId);
  }
  async drainEvents(sessionId) {
    var _a;
    if (this.eventsInFlight.has(sessionId)) {
      console.log("\u23F3 [events] drain already in flight", { sessionId });
      return;
    }
    this.eventsInFlight.add(sessionId);
    try {
      let afterId = (_a = this.lastEventIdBySession.get(sessionId)) != null ? _a : 0;
      console.log("\u{1F4E5} [events] start drain", { sessionId, afterId });
      for (; ; ) {
        const requestAfterId = afterId;
        const events = await this.config.backendApiRef.current.fetchEventsAfter(
          sessionId,
          requestAfterId,
          200
        );
        console.log("\u{1F4E5} [events] fetched batch", {
          sessionId,
          afterId: requestAfterId,
          count: events.length
        });
        if (!events.length) break;
        for (const event of events) {
          const eventId = typeof event.event_id === "number" ? event.event_id : Number(event.event_id);
          if (Number.isFinite(eventId)) afterId = Math.max(afterId, eventId);
          if (event.type === "title_changed" && typeof event.new_title === "string") {
            console.log("\u{1F3F7}\uFE0F [events] title_changed", {
              sessionId,
              eventId,
              newTitle: event.new_title
            });
            this.applyTitleChanged(sessionId, event.new_title);
          }
          if (event.type === "wallet_tx_request") {
            const payload = event.payload;
            if (payload && typeof payload === "object") {
              const req = payload;
              if (typeof req.to === "string" && typeof req.value === "string" && typeof req.data === "string") {
                const threadId = findTempIdForBackendId(
                  this.config.backendStateRef.current,
                  sessionId
                ) || sessionId;
                this.config.handleWalletTxRequest(
                  sessionId,
                  threadId,
                  req
                );
              }
            }
          }
        }
        if (events.length < 200) break;
      }
      console.log("\u{1F4E5} [events] drain complete", { sessionId, afterId });
      this.lastEventIdBySession.set(sessionId, afterId);
    } catch (error) {
      console.error("Failed to fetch async events:", error);
    } finally {
      this.eventsInFlight.delete(sessionId);
    }
  }
  applyTitleChanged(sessionId, newTitle) {
    const backendState = this.config.backendStateRef.current;
    const tempId = findTempIdForBackendId(backendState, sessionId);
    const threadIdToUpdate = tempId || sessionId;
    console.log("\u{1F3F7}\uFE0F [title] applying", {
      sessionId,
      threadId: threadIdToUpdate,
      newTitle
    });
    this.config.setThreadMetadata((prev) => {
      var _a;
      const next = new Map(prev);
      const existing = next.get(threadIdToUpdate);
      const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
      const nextStatus = (existing == null ? void 0 : existing.status) === "archived" ? "archived" : "regular";
      next.set(threadIdToUpdate, {
        title: normalizedTitle,
        status: nextStatus,
        lastActiveAt: (_a = existing == null ? void 0 : existing.lastActiveAt) != null ? _a : (/* @__PURE__ */ new Date()).toISOString()
      });
      return next;
    });
    if (!isPlaceholderTitle(newTitle) && backendState.creatingThreadId === threadIdToUpdate) {
      backendState.creatingThreadId = null;
    }
  }
  handleBackendSystemEvents(sessionId, threadId, rawEvents) {
    if (!(rawEvents == null ? void 0 : rawEvents.length)) return;
    for (const raw of rawEvents) {
      const parsed = this.parseBackendSystemEvent(raw);
      if (!parsed) continue;
      if ("InlineDisplay" in parsed) {
        const payload = parsed.InlineDisplay;
        if (!payload || typeof payload !== "object") continue;
        const type = payload.type;
        if (type !== "wallet_tx_request") continue;
        const requestValue = payload.payload;
        if (!requestValue || typeof requestValue !== "object") continue;
        const req = requestValue;
        if (typeof req.to !== "string" || typeof req.value !== "string" || typeof req.data !== "string") {
          continue;
        }
        this.config.handleWalletTxRequest(
          sessionId,
          threadId,
          req
        );
      }
      if ("SystemError" in parsed) {
        this.config.showNotification({
          type: "error",
          iconType: "error",
          title: "Error",
          message: parsed.SystemError
        });
      }
      if ("SystemNotice" in parsed) {
        this.config.showNotification({
          type: "notice",
          iconType: "notice",
          title: "Notice",
          message: parsed.SystemNotice
        });
      }
    }
  }
  parseBackendSystemEvent(value) {
    if (!value || typeof value !== "object") return null;
    const entries = Object.entries(value);
    if (entries.length !== 1) return null;
    const [key, payload] = entries[0];
    switch (key) {
      case "InlineDisplay":
        return { InlineDisplay: payload };
      case "SystemNotice":
        return {
          SystemNotice: typeof payload === "string" ? payload : String(payload)
        };
      case "SystemError":
        return {
          SystemError: typeof payload === "string" ? payload : String(payload)
        };
      case "AsyncUpdate":
        return { AsyncUpdate: payload };
      default:
        return null;
    }
  }
  cleanup() {
    for (const unsubscribe of this.updateSubscriptions.values()) {
      unsubscribe();
    }
    this.updateSubscriptions.clear();
  }
};

// packages/react/src/runtime/aomi-runtime.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
var sortByLastActiveDesc = ([, metaA], [, metaB]) => {
  const tsA = parseTimestamp2(metaA.lastActiveAt);
  const tsB = parseTimestamp2(metaB.lastActiveAt);
  return tsB - tsA;
};
function buildThreadLists(threadMetadata) {
  const entries = Array.from(threadMetadata.entries()).filter(
    ([, meta]) => !isPlaceholderTitle(meta.title)
  );
  const regularThreads = entries.filter(([, meta]) => meta.status === "regular").sort(sortByLastActiveDesc).map(([id, meta]) => ({
    id,
    title: meta.title || "New Chat",
    status: "regular"
  }));
  const archivedThreads = entries.filter(([, meta]) => meta.status === "archived").sort(sortByLastActiveDesc).map(([id, meta]) => ({
    id,
    title: meta.title || "New Chat",
    status: "archived"
  }));
  return { regularThreads, archivedThreads };
}
function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  publicKey,
  onWalletTxRequest
}) {
  const threadContext = useThreadContext();
  const threadContextRef = (0, import_react10.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const currentThreadIdRef = (0, import_react10.useRef)(threadContext.currentThreadId);
  (0, import_react10.useEffect)(() => {
    currentThreadIdRef.current = threadContext.currentThreadId;
  }, [threadContext.currentThreadId]);
  const publicKeyRef = (0, import_react10.useRef)(publicKey);
  (0, import_react10.useEffect)(() => {
    publicKeyRef.current = publicKey;
  }, [publicKey]);
  const getPublicKey = (0, import_react10.useCallback)(() => publicKeyRef.current, []);
  const lastSubscribedThreadRef = (0, import_react10.useRef)(null);
  const { showNotification } = useNotification();
  const eventControllerRef = (0, import_react10.useRef)(null);
  const walletHandlerRef = (0, import_react10.useRef)(null);
  const {
    backendStateRef,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    ensureInitialState,
    setSystemEventsHandler,
    backendApiRef
  } = useRuntimeOrchestrator(backendUrl, { getPublicKey });
  if (!walletHandlerRef.current) {
    walletHandlerRef.current = new WalletHandler({
      backendApiRef,
      onWalletTxRequest,
      publicKey,
      showNotification,
      applySessionMessagesToThread: (threadId, msgs) => {
        messageController.inbound(threadId, msgs);
      },
      getCurrentThreadId: () => currentThreadIdRef.current
    });
  }
  if (!eventControllerRef.current) {
    eventControllerRef.current = new EventController({
      backendApiRef,
      backendStateRef,
      showNotification,
      handleWalletTxRequest: (sessionId, threadId, request) => {
        var _a;
        (_a = walletHandlerRef.current) == null ? void 0 : _a.handleRequest(sessionId, threadId, request);
      },
      setThreadMetadata: threadContext.setThreadMetadata
    });
  }
  const handleSystemEvents = (0, import_react10.useCallback)(
    (sessionId, threadId, events) => {
      var _a;
      (_a = eventControllerRef.current) == null ? void 0 : _a.handleBackendSystemEvents(sessionId, threadId, events);
    },
    []
  );
  (0, import_react10.useEffect)(() => {
    setSystemEventsHandler(handleSystemEvents);
    return () => {
      setSystemEventsHandler(null);
    };
  }, [handleSystemEvents, setSystemEventsHandler]);
  const [updateSubscriptionsTick, setUpdateSubscriptionsTick] = (0, import_react10.useState)(0);
  const bumpUpdateSubscriptions = (0, import_react10.useCallback)(() => {
    setUpdateSubscriptionsTick((prev) => prev + 1);
  }, []);
  (0, import_react10.useEffect)(() => {
    void ensureInitialState(threadContext.currentThreadId);
  }, [ensureInitialState, threadContext.currentThreadId]);
  (0, import_react10.useEffect)(() => {
    const threadId = threadContext.currentThreadId;
    const isCurrentlyRunning = isThreadRunning(backendStateRef.current, threadId);
    setIsRunning(isCurrentlyRunning);
  }, [threadContext.currentThreadId, setIsRunning]);
  const currentMessages = threadContext.getThreadMessages(threadContext.currentThreadId);
  (0, import_react10.useEffect)(() => {
    if (!publicKey) return;
    const fetchThreadList = async () => {
      var _a, _b;
      try {
        const threadList = await backendApiRef.current.fetchThreads(publicKey);
        const currentContext = threadContextRef.current;
        const newMetadata = new Map(currentContext.threadMetadata);
        let maxChatNum = currentContext.threadCnt;
        for (const thread of threadList) {
          const rawTitle = (_a = thread.title) != null ? _a : "";
          const title = isPlaceholderTitle(rawTitle) ? "" : rawTitle;
          const lastActive = thread.last_active_at || thread.updated_at || thread.created_at || ((_b = newMetadata.get(thread.session_id)) == null ? void 0 : _b.lastActiveAt) || (/* @__PURE__ */ new Date()).toISOString();
          newMetadata.set(thread.session_id, {
            title,
            status: thread.is_archived ? "archived" : "regular",
            lastActiveAt: lastActive
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
  }, [publicKey]);
  const threadListAdapter = (0, import_react10.useMemo)(() => {
    const backendState = backendStateRef.current;
    const { regularThreads, archivedThreads } = buildThreadLists(threadContext.threadMetadata);
    const preparePendingThread = (threadId) => {
      const previousPendingId = backendState.creatingThreadId;
      if (previousPendingId && previousPendingId !== threadId) {
        threadContext.setThreadMetadata((prev) => {
          const next = new Map(prev);
          next.delete(previousPendingId);
          return next;
        });
        threadContext.setThreads((prev) => {
          const next = new Map(prev);
          next.delete(previousPendingId);
          return next;
        });
        backendState.pendingChat.delete(previousPendingId);
        backendState.pendingSystem.delete(previousPendingId);
        backendState.tempToBackendId.delete(previousPendingId);
        backendState.skipInitialFetch.delete(previousPendingId);
      }
      backendState.creatingThreadId = threadId;
      backendState.pendingChat.delete(threadId);
      backendState.pendingSystem.delete(threadId);
      threadContext.setThreadMetadata(
        (prev) => new Map(prev).set(threadId, {
          title: "New Chat",
          status: "pending",
          lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
        })
      );
      threadContext.setThreadMessages(threadId, []);
      threadContext.setCurrentThreadId(threadId);
      setIsRunning(false);
      threadContext.bumpThreadViewKey();
    };
    const findPendingThreadId = () => {
      if (backendState.creatingThreadId) return backendState.creatingThreadId;
      for (const [id, meta] of threadContext.threadMetadata.entries()) {
        if (meta.status === "pending") return id;
      }
      return null;
    };
    return {
      threadId: threadContext.currentThreadId,
      threads: regularThreads,
      archivedThreads,
      onSwitchToNewThread: async () => {
        var _a;
        const previousThreadId = currentThreadIdRef.current;
        polling.stopAll();
        if (isRunning && isThreadReady(backendState, previousThreadId)) {
          const backendId = resolveThreadId(backendState, previousThreadId);
          void backendApiRef.current.postInterrupt(backendId);
        }
        const pendingId = findPendingThreadId();
        if (pendingId) {
          preparePendingThread(pendingId);
          return;
        }
        if (backendState.createThreadPromise) {
          preparePendingThread((_a = backendState.creatingThreadId) != null ? _a : `temp-${crypto.randomUUID()}`);
          return;
        }
        const tempId = `temp-${crypto.randomUUID()}`;
        preparePendingThread(tempId);
        const createPromise = backendApiRef.current.createThread(publicKey, void 0).then(async (newThread) => {
          var _a2;
          const uiThreadId = (_a2 = backendState.creatingThreadId) != null ? _a2 : tempId;
          const backendId = newThread.session_id;
          setBackendMapping(backendState, uiThreadId, backendId);
          markSkipInitialFetch(backendState, uiThreadId);
          bumpUpdateSubscriptions();
          const backendTitle = newThread.title;
          if (backendTitle && !isPlaceholderTitle(backendTitle)) {
            threadContext.setThreadMetadata((prev) => {
              var _a3;
              const next = new Map(prev);
              const existing = next.get(uiThreadId);
              const nextStatus = (existing == null ? void 0 : existing.status) === "archived" ? "archived" : "regular";
              next.set(uiThreadId, {
                title: backendTitle,
                status: nextStatus,
                lastActiveAt: (_a3 = existing == null ? void 0 : existing.lastActiveAt) != null ? _a3 : (/* @__PURE__ */ new Date()).toISOString()
              });
              return next;
            });
          }
          if (backendState.creatingThreadId === uiThreadId) {
            backendState.creatingThreadId = null;
          }
          const pendingMessages = backendState.pendingChat.get(uiThreadId);
          if (pendingMessages == null ? void 0 : pendingMessages.length) {
            backendState.pendingChat.delete(uiThreadId);
            for (const text of pendingMessages) {
              try {
                const activePublicKey = publicKeyRef.current;
                if (activePublicKey) {
                  await backendApiRef.current.postChatMessage(
                    backendId,
                    text,
                    activePublicKey
                  );
                } else {
                  await backendApiRef.current.postChatMessage(backendId, text);
                }
              } catch (error) {
                console.error("Failed to send queued message:", error);
              }
            }
            if (currentThreadIdRef.current === uiThreadId) {
              polling == null ? void 0 : polling.start(uiThreadId);
            }
          }
        }).catch((error) => {
          var _a2;
          console.error("Failed to create new thread:", error);
          const failedId = (_a2 = backendState.creatingThreadId) != null ? _a2 : tempId;
          threadContext.setThreadMetadata((prev) => {
            const next = new Map(prev);
            next.delete(failedId);
            return next;
          });
          threadContext.setThreads((prev) => {
            const next = new Map(prev);
            next.delete(failedId);
            return next;
          });
          if (backendState.creatingThreadId === failedId) {
            backendState.creatingThreadId = null;
          }
        }).finally(() => {
          backendState.createThreadPromise = null;
        });
        backendState.createThreadPromise = createPromise;
      },
      onSwitchToThread: (threadId) => {
        const previousThreadId = currentThreadIdRef.current;
        polling.stopAll();
        if (isRunning && isThreadReady(backendState, previousThreadId)) {
          const backendId = resolveThreadId(backendState, previousThreadId);
          void backendApiRef.current.postInterrupt(backendId);
        }
        threadContext.setCurrentThreadId(threadId);
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
          threadContext.updateThreadMetadata(threadId, { title: previousTitle });
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
          backendState.pendingChat.delete(threadId);
          backendState.pendingSystem.delete(threadId);
          backendState.tempToBackendId.delete(threadId);
          backendState.skipInitialFetch.delete(threadId);
          backendState.runningThreads.delete(threadId);
          if (backendState.creatingThreadId === threadId) {
            backendState.creatingThreadId = null;
          }
          if (threadContext.currentThreadId === threadId) {
            const firstRegularThread = Array.from(threadContext.threadMetadata.entries()).find(
              ([id, meta]) => meta.status === "regular" && id !== threadId
            );
            if (firstRegularThread) {
              threadContext.setCurrentThreadId(firstRegularThread[0]);
            } else {
              const defaultId = "default-session";
              threadContext.setThreadMetadata(
                (prev) => new Map(prev).set(defaultId, {
                  title: "New Chat",
                  status: "regular",
                  lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
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
  }, [
    backendApiRef,
    polling,
    publicKey,
    backendStateRef,
    setIsRunning,
    threadContext,
    threadContext.currentThreadId,
    threadContext.threadMetadata,
    bumpUpdateSubscriptions
  ]);
  (0, import_react10.useEffect)(() => {
    const threadId = threadContext.currentThreadId;
    if (!isTempThreadId(threadId)) return;
    if (!isThreadReady(backendStateRef.current, threadId)) return;
    void messageController.flushPendingChat(threadId);
  }, [messageController, backendStateRef, threadContext.currentThreadId]);
  const runtime = (0, import_react11.useExternalStoreRuntime)({
    messages: currentMessages,
    setMessages: (msgs) => threadContext.setThreadMessages(threadContext.currentThreadId, [...msgs]),
    isRunning,
    onNew: (message) => messageController.outbound(message, threadContext.currentThreadId),
    onCancel: () => messageController.cancel(threadContext.currentThreadId),
    convertMessage: (msg) => msg,
    adapters: { threadList: threadListAdapter }
  });
  (0, import_react10.useEffect)(() => {
    const threadId = threadContext.currentThreadId;
    if (isTempThreadId(threadId)) return;
    const hasUserMessages = currentMessages.some((msg) => msg.role === "user");
    if (hasUserMessages) {
      void messageController.flushPendingSystem(threadId);
    }
  }, [currentMessages, messageController, threadContext.currentThreadId]);
  (0, import_react10.useEffect)(() => {
    return () => {
      var _a;
      polling.stopAll();
      (_a = eventControllerRef.current) == null ? void 0 : _a.cleanup();
    };
  }, [polling]);
  (0, import_react10.useEffect)(() => {
    var _a, _b, _c;
    const backendState = backendStateRef.current;
    const threadId = threadContext.currentThreadId;
    const isReady = isThreadReady(backendState, threadId);
    if (!isReady) {
      lastSubscribedThreadRef.current = null;
      (_a = eventControllerRef.current) == null ? void 0 : _a.setSubscribableSessionId(null);
      return;
    }
    const isCurrentlyRunning = isThreadRunning(backendState, threadId);
    if (isCurrentlyRunning) {
      const sessionId = resolveThreadId(backendState, threadId);
      (_b = eventControllerRef.current) == null ? void 0 : _b.setSubscribableSessionId(sessionId);
      lastSubscribedThreadRef.current = threadId;
      return;
    }
    if (lastSubscribedThreadRef.current !== threadId) {
      (_c = eventControllerRef.current) == null ? void 0 : _c.setSubscribableSessionId(null);
    }
  }, [backendStateRef, threadContext.currentThreadId, updateSubscriptionsTick, isRunning]);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    RuntimeActionsProvider,
    {
      value: {
        sendSystemMessage: (message) => messageController.outboundSystem(threadContext.currentThreadId, message)
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react11.AssistantRuntimeProvider, { runtime, children })
    }
  );
}
function AomiRuntimeProviderWithNotifications(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(NotificationProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(AomiRuntimeProvider, __spreadValues({}, props)) });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AomiRuntimeProvider,
  AomiRuntimeProviderWithNotifications,
  BackendApi,
  NotificationProvider,
  RuntimeActionsProvider,
  ThreadContextProvider,
  WalletSystemMessageEmitter,
  cn,
  constructSystemMessage,
  constructThreadMessage,
  formatAddress,
  getNetworkName,
  normalizeWalletError,
  pickInjectedProvider,
  toHexQuantity,
  useCurrentThreadMessages,
  useCurrentThreadMetadata,
  useNotification,
  useRuntimeActions,
  useThreadContext
});
//# sourceMappingURL=index.cjs.map