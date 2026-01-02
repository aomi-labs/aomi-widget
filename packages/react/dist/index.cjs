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

// src/index.ts
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

// src/api/client.ts
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
  async fetchState(sessionId) {
    console.log("\u{1F535} [fetchState] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/state?session_id=${encodeURIComponent(sessionId)}`;
    console.log("\u{1F535} [fetchState] URL:", url);
    const response = await fetch(url);
    console.log("\u{1F535} [fetchState] Response status:", response.status, response.statusText);
    if (!response.ok) {
      console.error("\u{1F534} [fetchState] Error:", response.status, response.statusText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log("\u{1F7E2} [fetchState] Success:", data);
    return data;
  }
  async postChatMessage(sessionId, message) {
    console.log("\u{1F535} [postChatMessage] Called with sessionId:", sessionId, "message:", message);
    const result = await postState(this.backendUrl, "/api/chat", {
      message,
      session_id: sessionId
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
  subscribeToUpdates(sessionId, onUpdate, onError) {
    const updatesUrl = new URL("/api/updates", this.backendUrl);
    updatesUrl.searchParams.set("session_id", sessionId);
    const existing = this.updatesEventSources.get(sessionId);
    if (existing) {
      existing.close();
    }
    const updatesEventSource = new EventSource(updatesUrl.toString());
    this.updatesEventSources.set(sessionId, updatesEventSource);
    updatesEventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onUpdate(parsed);
      } catch (error) {
        console.error("Failed to parse system update SSE:", error);
        onError == null ? void 0 : onError(error);
      }
    };
    updatesEventSource.onerror = (error) => {
      console.error("System updates SSE error:", error);
      onError == null ? void 0 : onError(error);
    };
    return () => {
      const current = this.updatesEventSources.get(sessionId);
      if (current === updatesEventSource) {
        current.close();
        this.updatesEventSources.delete(sessionId);
      } else {
        updatesEventSource.close();
      }
    };
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
    const updatesUrl = new URL("/api/updates", this.backendUrl);
    updatesUrl.searchParams.set("session_id", sessionId);
    const existing = this.updatesEventSources.get(sessionId);
    if (existing) {
      existing.close();
    }
    const updatesEventSource = new EventSource(updatesUrl.toString());
    this.updatesEventSources.set(sessionId, updatesEventSource);
    console.log("\u{1F535} [subscribeToUpdatesWithNotification] URL:", updatesUrl.toString());
    updatesEventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onUpdate(parsed);
      } catch (error) {
        console.error("Failed to parse system update SSE:", error);
        onError == null ? void 0 : onError(error);
      }
    };
    updatesEventSource.onerror = (error) => {
      console.error("System updates SSE error:", error);
      onError == null ? void 0 : onError(error);
    };
    return () => {
      const current = this.updatesEventSources.get(sessionId);
      if (current === updatesEventSource) {
        current.close();
        this.updatesEventSources.delete(sessionId);
      } else {
        updatesEventSource.close();
      }
    };
  }
};

// src/runtime/aomi-runtime.tsx
var import_react6 = require("react");
var import_react7 = require("@assistant-ui/react");

// src/runtime/hooks.ts
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

// src/runtime/orchestrator.ts
var import_react3 = require("react");

// src/state/thread-context.tsx
var import_react2 = require("react");

// src/state/thread-store.ts
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

// src/state/thread-context.tsx
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

// src/utils/conversion.ts
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

// src/runtime/utils.ts
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

// src/runtime/backend-state.ts
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

// src/runtime/message-controller.ts
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
    try {
      this.markRunning(threadId, true);
      await this.config.backendApiRef.current.postChatMessage(backendThreadId, text);
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
    const backendState = this.config.backendStateRef.current;
    const pending = dequeuePendingChat(backendState, threadId);
    if (!pending.length) return;
    const backendThreadId = resolveThreadId(backendState, threadId);
    for (const text of pending) {
      try {
        await this.config.backendApiRef.current.postChatMessage(backendThreadId, text);
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

// src/runtime/polling-controller.ts
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
    if (this.intervals.has(threadId)) return;
    const backendThreadId = resolveThreadId(backendState, threadId);
    setThreadRunning(backendState, threadId, true);
    const tick = async () => {
      if (!this.intervals.has(threadId)) {
        return;
      }
      try {
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
  stopAll() {
    for (const threadId of this.intervals.keys()) {
      this.stop(threadId);
    }
  }
  handleState(threadId, state) {
    var _a, _b, _c;
    if (state.session_exists === false) {
      this.stop(threadId);
      return;
    }
    const backendState = this.config.backendStateRef.current;
    const backendThreadId = resolveThreadId(backendState, threadId);
    const hasMessages = ((_b = (_a = state.messages) == null ? void 0 : _a.length) != null ? _b : 0) > 0;
    const hasStreamingMessages = Boolean(
      (_c = state.messages) == null ? void 0 : _c.some((message) => message.is_streaming)
    );
    if (this.handleSystemEvents && state.system_events) {
      this.handleSystemEvents(backendThreadId, threadId, state.system_events);
    }
    this.config.applyMessages(threadId, state.messages);
    const shouldStop = state.is_processing === false || state.is_processing == null && hasMessages && !hasStreamingMessages;
    if (shouldStop) {
      this.stop(threadId);
      return;
    }
  }
};

// src/runtime/orchestrator.ts
function useRuntimeOrchestrator(backendUrl, handleSystemEvents) {
  const threadContext = useThreadContext();
  const threadContextRef = (0, import_react3.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const backendApiRef = (0, import_react3.useRef)(new BackendApi(backendUrl));
  const backendStateRef = (0, import_react3.useRef)(createBakendState());
  const [isRunning, setIsRunning] = (0, import_react3.useState)(false);
  const messageControllerRef = (0, import_react3.useRef)(null);
  const pollingRef = (0, import_react3.useRef)(null);
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
      setGlobalIsRunning: setIsRunning
    });
  }
  const ensureInitialState = (0, import_react3.useCallback)(
    async (threadId) => {
      var _a, _b, _c;
      const backendState = backendStateRef.current;
      const isCurrentThread = threadContextRef.current.currentThreadId === threadId;
      if (shouldSkipInitialFetch(backendState, threadId)) {
        clearSkipInitialFetch(backendState, threadId);
        if (isCurrentThread) {
          setIsRunning(false);
        }
        return;
      }
      if (!isThreadReady(backendState, threadId)) {
        if (isCurrentThread) {
          setIsRunning(false);
        }
        return;
      }
      const backendThreadId = resolveThreadId(backendState, threadId);
      try {
        const state = await backendApiRef.current.fetchState(backendThreadId);
        (_a = messageControllerRef.current) == null ? void 0 : _a.inbound(threadId, state.messages);
        const hasStreamingMessages = Boolean(
          (_b = state.messages) == null ? void 0 : _b.some((message) => message.is_streaming)
        );
        if (handleSystemEvents && state.system_events) {
          handleSystemEvents(backendThreadId, threadId, state.system_events);
        }
        if (state.is_processing || hasStreamingMessages) {
          if (isCurrentThread) {
            setIsRunning(true);
          }
          (_c = pollingRef.current) == null ? void 0 : _c.start(threadId);
        } else {
          if (isCurrentThread) {
            setIsRunning(false);
          }
        }
      } catch (error) {
        console.error("Failed to fetch initial state:", error);
        if (isCurrentThread) {
          setIsRunning(false);
        }
      }
    },
    [backendApiRef, backendStateRef, pollingRef, messageControllerRef, setIsRunning, handleSystemEvents]
  );
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

// src/lib/notification-context.tsx
var import_react4 = require("react");
var import_jsx_runtime2 = require("react/jsx-runtime");
var NotificationContext = (0, import_react4.createContext)(
  void 0
);
function useNotification() {
  const context = (0, import_react4.useContext)(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}
function NotificationProvider({ children }) {
  const [notifications, setNotifications] = (0, import_react4.useState)([]);
  const showNotification = (0, import_react4.useCallback)(
    (notification) => {
      var _a, _b;
      const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newNotification = __spreadProps(__spreadValues({}, notification), {
        id,
        duration: (_a = notification.duration) != null ? _a : 5e3
      });
      setNotifications((prev) => [newNotification, ...prev]);
      const duration = (_b = newNotification.duration) != null ? _b : 5e3;
      if (duration > 0) {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, duration);
      }
    },
    []
  );
  const dismissNotification = (0, import_react4.useCallback)((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    NotificationContext.Provider,
    {
      value: { showNotification, notifications, dismissNotification },
      children
    }
  );
}

// src/utils/wallet.ts
var import_react5 = require("react");
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
  const lastWalletRef = (0, import_react5.useRef)({ isConnected: false });
  (0, import_react5.useEffect)(() => {
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

// src/runtime/wallet-handler.ts
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

// src/runtime/event-controller.ts
var EventController = class {
  constructor(config) {
    this.config = config;
    this.lastEventIdBySession = /* @__PURE__ */ new Map();
    this.eventsInFlight = /* @__PURE__ */ new Set();
    this.updateSubscriptions = /* @__PURE__ */ new Map();
    this.subscribableSessionId = null;
  }
  setSubscribableSessionId(sessionId) {
    this.subscribableSessionId = sessionId;
    this.syncSubscriptions();
  }
  syncSubscriptions() {
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
    const unsubscribe = this.config.backendApiRef.current.subscribeToUpdatesWithNotification(
      sessionId,
      (update) => {
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
    if (this.eventsInFlight.has(sessionId)) return;
    this.eventsInFlight.add(sessionId);
    try {
      let afterId = (_a = this.lastEventIdBySession.get(sessionId)) != null ? _a : 0;
      for (; ; ) {
        const events = await this.config.backendApiRef.current.fetchEventsAfter(
          sessionId,
          afterId,
          200
        );
        if (!events.length) break;
        for (const event of events) {
          const eventId = typeof event.event_id === "number" ? event.event_id : Number(event.event_id);
          if (Number.isFinite(eventId)) afterId = Math.max(afterId, eventId);
          if (event.type === "title_changed" && typeof event.new_title === "string") {
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

// src/runtime/aomi-runtime.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
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
  const threadContextRef = (0, import_react6.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const currentThreadIdRef = (0, import_react6.useRef)(threadContext.currentThreadId);
  (0, import_react6.useEffect)(() => {
    currentThreadIdRef.current = threadContext.currentThreadId;
  }, [threadContext.currentThreadId]);
  const { showNotification } = useNotification();
  const eventControllerRef = (0, import_react6.useRef)(null);
  const walletHandlerRef = (0, import_react6.useRef)(null);
  const {
    backendStateRef,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    ensureInitialState,
    backendApiRef
  } = useRuntimeOrchestrator(backendUrl, (sessionId, threadId, events) => {
    var _a;
    (_a = eventControllerRef.current) == null ? void 0 : _a.handleBackendSystemEvents(sessionId, threadId, events);
  });
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
  (0, import_react6.useEffect)(() => {
    if (polling && eventControllerRef.current) {
      polling.setSystemEventsHandler((sessionId, threadId, events) => {
        var _a;
        (_a = eventControllerRef.current) == null ? void 0 : _a.handleBackendSystemEvents(sessionId, threadId, events);
      });
    }
  }, [polling]);
  const [updateSubscriptionsTick, setUpdateSubscriptionsTick] = (0, import_react6.useState)(0);
  const bumpUpdateSubscriptions = (0, import_react6.useCallback)(() => {
    setUpdateSubscriptionsTick((prev) => prev + 1);
  }, []);
  (0, import_react6.useEffect)(() => {
    void ensureInitialState(threadContext.currentThreadId);
  }, [ensureInitialState, threadContext.currentThreadId]);
  (0, import_react6.useEffect)(() => {
    const threadId = threadContext.currentThreadId;
    const isCurrentlyRunning = isThreadRunning(backendStateRef.current, threadId);
    setIsRunning(isCurrentlyRunning);
  }, [threadContext.currentThreadId, setIsRunning]);
  const currentMessages = threadContext.getThreadMessages(threadContext.currentThreadId);
  (0, import_react6.useEffect)(() => {
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
  const threadListAdapter = (0, import_react6.useMemo)(() => {
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
                await backendApiRef.current.postChatMessage(backendId, text);
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
  (0, import_react6.useEffect)(() => {
    const threadId = threadContext.currentThreadId;
    if (!isTempThreadId(threadId)) return;
    if (!isThreadReady(backendStateRef.current, threadId)) return;
    void messageController.flushPendingChat(threadId);
  }, [messageController, backendStateRef, threadContext.currentThreadId]);
  const runtime = (0, import_react7.useExternalStoreRuntime)({
    messages: currentMessages,
    setMessages: (msgs) => threadContext.setThreadMessages(threadContext.currentThreadId, [...msgs]),
    isRunning,
    onNew: (message) => messageController.outbound(message, threadContext.currentThreadId),
    onCancel: () => messageController.cancel(threadContext.currentThreadId),
    convertMessage: (msg) => msg,
    adapters: { threadList: threadListAdapter }
  });
  (0, import_react6.useEffect)(() => {
    const threadId = threadContext.currentThreadId;
    if (isTempThreadId(threadId)) return;
    const hasUserMessages = currentMessages.some((msg) => msg.role === "user");
    if (hasUserMessages) {
      void messageController.flushPendingSystem(threadId);
    }
  }, [currentMessages, messageController, threadContext.currentThreadId]);
  (0, import_react6.useEffect)(() => {
    return () => {
      var _a;
      polling.stopAll();
      (_a = eventControllerRef.current) == null ? void 0 : _a.cleanup();
    };
  }, [polling]);
  (0, import_react6.useEffect)(() => {
    var _a, _b;
    const backendState = backendStateRef.current;
    const threadId = threadContext.currentThreadId;
    if (isThreadReady(backendState, threadId)) {
      const sessionId = resolveThreadId(backendState, threadId);
      (_a = eventControllerRef.current) == null ? void 0 : _a.setSubscribableSessionId(sessionId);
    } else {
      (_b = eventControllerRef.current) == null ? void 0 : _b.setSubscribableSessionId(null);
    }
  }, [backendStateRef, threadContext.currentThreadId, updateSubscriptionsTick]);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    RuntimeActionsProvider,
    {
      value: {
        sendSystemMessage: (message) => messageController.outboundSystem(threadContext.currentThreadId, message)
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_react7.AssistantRuntimeProvider, { runtime, children })
    }
  );
}
function AomiRuntimeProviderWithNotifications(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(NotificationProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(AomiRuntimeProvider, __spreadValues({}, props)) });
}

// src/lib/utils.ts
var import_clsx = require("clsx");
var import_tailwind_merge = require("tailwind-merge");
function cn(...inputs) {
  return (0, import_tailwind_merge.twMerge)((0, import_clsx.clsx)(inputs));
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