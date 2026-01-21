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
  AomiRuntimeProvider: () => AomiRuntimeProvider,
  BackendApi: () => BackendApi,
  RuntimeActionsProvider: () => RuntimeActionsProvider,
  ThreadContextProvider: () => ThreadContextProvider,
  useCurrentThreadMessages: () => useCurrentThreadMessages,
  useCurrentThreadMetadata: () => useCurrentThreadMetadata,
  useEventContext: () => useEventContext,
  useNotificationHandler: () => useNotificationHandler,
  useRuntimeActions: () => useRuntimeActions,
  useThreadContext: () => useThreadContext,
  useWalletHandler: () => useWalletHandler
});
module.exports = __toCommonJS(index_exports);

// packages/react/src/backend/client.ts
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
    this.updatesEventSource = null;
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
  subscribeSSE(sessionId, onUpdate, onError) {
    if (this.updatesEventSource) {
      this.updatesEventSource.close();
    }
    const url = new URL("/api/updates", this.backendUrl);
    url.searchParams.set("session_id", sessionId);
    this.updatesEventSource = new EventSource(url.toString());
    this.updatesEventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onUpdate(parsed);
      } catch (error) {
        console.error("Failed to parse SSE event:", error);
        onError == null ? void 0 : onError(error);
      }
    };
    this.updatesEventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      onError == null ? void 0 : onError(error);
    };
    return () => {
      if (this.updatesEventSource) {
        this.updatesEventSource.close();
        this.updatesEventSource = null;
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
  async getSystemEvents(sessionId) {
    console.log("\u{1F535} [getSystemEvents] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/events?session_id=${encodeURIComponent(sessionId)}`;
    console.log("\u{1F535} [getSystemEvents] URL:", url);
    const response = await fetch(url);
    console.log("\u{1F535} [getSystemEvents] Response status:", response.status);
    if (!response.ok) {
      if (response.status === 404) {
        console.log("\u{1F7E1} [getSystemEvents] Session not found, returning empty");
        return [];
      }
      console.error("\u{1F534} [getSystemEvents] Error:", response.status);
      throw new Error(`Failed to get system events: HTTP ${response.status}`);
    }
    const data = await response.json();
    console.log("\u{1F7E2} [getSystemEvents] Success:", data);
    return data;
  }
};

// packages/react/src/runtime/aomi-runtime.tsx
var import_react5 = require("react");
var import_react6 = require("@assistant-ui/react");

// packages/react/src/contexts/runtime-actions.ts
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

// packages/react/src/contexts/event-context.tsx
var import_react2 = require("react");

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
var import_jsx_runtime = require("react/jsx-runtime");
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
  }, [backendApi, buffer, sessionId]);
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
        await backendApi.postSystemMessage(event.sessionId, message);
      } catch (error) {
        console.error("Failed to send outbound event:", error);
      }
    },
    [backendApi]
  );
  const contextValue = {
    subscribe: subscribeCallback,
    sendOutbound,
    sseStatus
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EventContextState.Provider, { value: contextValue, children });
}

// packages/react/src/runtime/orchestrator.ts
var import_react4 = require("react");

// packages/react/src/contexts/thread-context.tsx
var import_react3 = require("react");

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

// packages/react/src/contexts/thread-context.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var ThreadContextState = (0, import_react3.createContext)(null);
function useThreadContext() {
  const context = (0, import_react3.useContext)(ThreadContextState);
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
  const storeRef = (0, import_react3.useRef)(null);
  if (!storeRef.current) {
    storeRef.current = new ThreadStore({ initialThreadId });
  }
  const store = storeRef.current;
  const value = (0, import_react3.useSyncExternalStore)(store.subscribe, store.getSnapshot);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ThreadContextState.Provider, { value, children });
}
function useCurrentThreadMessages() {
  const { currentThreadId, getThreadMessages } = useThreadContext();
  return (0, import_react3.useMemo)(() => getThreadMessages(currentThreadId), [currentThreadId, getThreadMessages]);
}
function useCurrentThreadMetadata() {
  const { currentThreadId, getThreadMetadata } = useThreadContext();
  return (0, import_react3.useMemo)(() => getThreadMetadata(currentThreadId), [currentThreadId, getThreadMetadata]);
}

// packages/react/src/runtime/utils.ts
var isTempThreadId = (id) => id.startsWith("temp-");
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
  if (msg.tool_stream && Array.isArray(msg.tool_stream)) {
    const [topic, content] = msg.tool_stream;
    return [String(topic), String(content != null ? content : "")];
  }
  return parseToolResult(msg.tool_result);
}
function parseToolResult(toolResult) {
  if (!toolResult) return null;
  if (Array.isArray(toolResult) && toolResult.length === 2) {
    const [topic, content] = toolResult;
    return [String(topic), content];
  }
  if (typeof toolResult === "object") {
    const topic = toolResult.topic;
    const content = toolResult.content;
    return topic ? [String(topic), String(content)] : null;
  }
  return null;
}

// packages/react/src/state/backend-state.ts
function createBakendState() {
  return {
    tempToBackendId: /* @__PURE__ */ new Map(),
    skipInitialFetch: /* @__PURE__ */ new Set(),
    pendingChat: /* @__PURE__ */ new Map(),
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
      this.config.polling.start(threadId);
    } catch (error) {
      console.error("Failed to send message:", error);
      this.markRunning(threadId, false);
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

// packages/react/src/runtime/polling-controller.ts
var PollingController = class {
  constructor(config) {
    this.config = config;
    this.intervals = /* @__PURE__ */ new Map();
    var _a;
    this.intervalMs = (_a = config.intervalMs) != null ? _a : 500;
  }
  start(threadId) {
    const backendState = this.config.backendStateRef.current;
    if (!isThreadReady(backendState, threadId)) return;
    if (this.intervals.has(threadId)) return;
    const backendThreadId = resolveThreadId(backendState, threadId);
    setThreadRunning(backendState, threadId, true);
    const tick = async () => {
      try {
        const state = await this.config.backendApiRef.current.fetchState(backendThreadId);
        this.handleState(threadId, state);
      } catch (error) {
        console.error("Polling error:", error);
        this.stop(threadId);
      }
    };
    const intervalId = setInterval(tick, this.intervalMs);
    this.intervals.set(threadId, intervalId);
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
    if (state.session_exists === false) {
      this.stop(threadId);
      return;
    }
    this.config.applyMessages(threadId, state.messages);
    if (!state.is_processing) {
      this.stop(threadId);
    }
  }
};

// packages/react/src/runtime/orchestrator.ts
function useRuntimeOrchestrator(backendUrl) {
  const threadContext = useThreadContext();
  const threadContextRef = (0, import_react4.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const backendApiRef = (0, import_react4.useRef)(new BackendApi(backendUrl));
  const backendStateRef = (0, import_react4.useRef)(createBakendState());
  const [isRunning, setIsRunning] = (0, import_react4.useState)(false);
  const messageControllerRef = (0, import_react4.useRef)(null);
  const pollingRef = (0, import_react4.useRef)(null);
  if (!pollingRef.current) {
    pollingRef.current = new PollingController({
      backendApiRef,
      backendStateRef,
      applyMessages: (threadId, msgs) => {
        var _a;
        (_a = messageControllerRef.current) == null ? void 0 : _a.inbound(threadId, msgs);
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
  const ensureInitialState = (0, import_react4.useCallback)(
    async (threadId) => {
      var _a, _b;
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
        if (state.is_processing) {
          if (isCurrentThread) {
            setIsRunning(true);
          }
          (_b = pollingRef.current) == null ? void 0 : _b.start(threadId);
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
    [backendApiRef, backendStateRef, pollingRef, messageControllerRef, setIsRunning]
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

// packages/react/src/runtime/aomi-runtime.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var sortByLastActiveDesc = ([, metaA], [, metaB]) => {
  const tsA = parseTimestamp(metaA.lastActiveAt);
  const tsB = parseTimestamp(metaB.lastActiveAt);
  return tsB - tsA;
};
function buildThreadLists(threadMetadata) {
  const entries = Array.from(threadMetadata.entries()).filter(
    ([, meta]) => !isPlaceholderTitle(meta.title)
  );
  const regularThreads = entries.filter(([, meta]) => meta.status === "regular").sort(sortByLastActiveDesc).map(
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
function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  publicKey
}) {
  const threadContext = useThreadContext();
  const {
    backendStateRef,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    ensureInitialState,
    backendApiRef
  } = useRuntimeOrchestrator(backendUrl);
  const threadContextRef = (0, import_react5.useRef)(threadContext);
  threadContextRef.current = threadContext;
  const currentThreadIdRef = (0, import_react5.useRef)(threadContext.currentThreadId);
  (0, import_react5.useEffect)(() => {
    currentThreadIdRef.current = threadContext.currentThreadId;
  }, [threadContext.currentThreadId]);
  (0, import_react5.useEffect)(() => {
    void ensureInitialState(threadContext.currentThreadId);
  }, [ensureInitialState, threadContext.currentThreadId]);
  (0, import_react5.useEffect)(() => {
    const threadId = threadContext.currentThreadId;
    setIsRunning(isThreadRunning(backendStateRef.current, threadId));
  }, [backendStateRef, setIsRunning, threadContext.currentThreadId]);
  const currentMessages = threadContext.getThreadMessages(
    threadContext.currentThreadId
  );
  (0, import_react5.useEffect)(() => {
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
  const threadListAdapter = (0, import_react5.useMemo)(() => {
    const backendState = backendStateRef.current;
    const { regularThreads, archivedThreads } = buildThreadLists(
      threadContext.threadMetadata
    );
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
        backendState.tempToBackendId.delete(previousPendingId);
        backendState.skipInitialFetch.delete(previousPendingId);
      }
      backendState.creatingThreadId = threadId;
      backendState.pendingChat.delete(threadId);
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
        const pendingId = findPendingThreadId();
        if (pendingId) {
          preparePendingThread(pendingId);
          return;
        }
        if (backendState.createThreadPromise) {
          preparePendingThread(
            (_a = backendState.creatingThreadId) != null ? _a : `temp-${crypto.randomUUID()}`
          );
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
          backendState.pendingChat.delete(threadId);
          backendState.tempToBackendId.delete(threadId);
          backendState.skipInitialFetch.delete(threadId);
          backendState.runningThreads.delete(threadId);
          if (backendState.creatingThreadId === threadId) {
            backendState.creatingThreadId = null;
          }
          if (threadContext.currentThreadId === threadId) {
            const firstRegularThread = Array.from(
              threadContext.threadMetadata.entries()
            ).find(
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
    threadContext.threadMetadata
  ]);
  (0, import_react5.useEffect)(() => {
    const currentSessionId = threadContext.currentThreadId;
    const unsubscribe = backendApiRef.current.subscribeSSE(
      currentSessionId,
      (event) => {
        var _a;
        const eventType = event.type;
        const sessionId = event.session_id;
        if (eventType === "title_changed") {
          const newTitle = event.new_title;
          if (!newTitle) return;
          const backendState = backendStateRef.current;
          const targetThreadId = (_a = findTempIdForBackendId(backendState, sessionId)) != null ? _a : resolveThreadId(backendState, sessionId);
          const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
          threadContext.setThreadMetadata((prev) => {
            var _a2;
            const next = new Map(prev);
            const existing = next.get(targetThreadId);
            const nextStatus = (existing == null ? void 0 : existing.status) === "archived" ? "archived" : "regular";
            next.set(targetThreadId, {
              title: normalizedTitle,
              status: nextStatus,
              lastActiveAt: (_a2 = existing == null ? void 0 : existing.lastActiveAt) != null ? _a2 : (/* @__PURE__ */ new Date()).toISOString()
            });
            return next;
          });
          if (!isPlaceholderTitle(newTitle) && backendState.creatingThreadId === targetThreadId) {
            backendState.creatingThreadId = null;
          }
        }
      }
    );
    return () => {
      unsubscribe == null ? void 0 : unsubscribe();
    };
  }, [
    backendApiRef,
    backendStateRef,
    threadContext,
    threadContext.currentThreadId
  ]);
  (0, import_react5.useEffect)(() => {
    const threadId = threadContext.currentThreadId;
    if (!isTempThreadId(threadId)) return;
    if (!isThreadReady(backendStateRef.current, threadId)) return;
    void messageController.flushPendingChat(threadId);
  }, [messageController, backendStateRef, threadContext.currentThreadId]);
  const runtime = (0, import_react6.useExternalStoreRuntime)({
    messages: currentMessages,
    setMessages: (msgs) => threadContext.setThreadMessages(threadContext.currentThreadId, [...msgs]),
    isRunning,
    onNew: (message) => messageController.outbound(message, threadContext.currentThreadId),
    onCancel: () => messageController.cancel(threadContext.currentThreadId),
    convertMessage: (msg) => msg,
    adapters: { threadList: threadListAdapter }
  });
  (0, import_react5.useEffect)(() => {
    return () => {
      polling.stopAll();
    };
  }, [polling]);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    EventContextProvider,
    {
      backendApi: backendApiRef.current,
      sessionId: threadContext.currentThreadId,
      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(RuntimeActionsProvider, { value: {}, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_react6.AssistantRuntimeProvider, { runtime, children }) })
    }
  );
}

// packages/react/src/handlers/wallet-handler.ts
var import_react7 = require("react");
function useWalletHandler({
  sessionId,
  onTxRequest
}) {
  const { subscribe: subscribe2, sendOutbound } = useEventContext();
  const [pendingTxRequests, setPendingTxRequests] = (0, import_react7.useState)([]);
  (0, import_react7.useEffect)(() => {
    const unsubscribe = subscribe2("wallet:tx_request", (event) => {
      const request = event.payload;
      setPendingTxRequests((prev) => [...prev, request]);
      onTxRequest == null ? void 0 : onTxRequest(request);
    });
    return unsubscribe;
  }, [subscribe2, onTxRequest]);
  const sendTxComplete = (0, import_react7.useCallback)(
    (tx) => {
      sendOutbound({
        type: "wallet:tx_complete",
        sessionId,
        payload: tx,
        priority: "high"
      });
    },
    [sendOutbound, sessionId]
  );
  const sendConnectionChange = (0, import_react7.useCallback)(
    (status, address) => {
      sendOutbound({
        type: status === "connected" ? "wallet:connected" : "wallet:disconnected",
        sessionId,
        payload: { status, address },
        priority: "normal"
      });
    },
    [sendOutbound, sessionId]
  );
  const clearTxRequest = (0, import_react7.useCallback)((index) => {
    setPendingTxRequests((prev) => prev.filter((_, i) => i !== index));
  }, []);
  return {
    sendTxComplete,
    sendConnectionChange,
    pendingTxRequests,
    clearTxRequest
  };
}

// packages/react/src/handlers/notification-handler.ts
var import_react8 = require("react");
var notificationIdCounter = 0;
function generateNotificationId() {
  return `notif-${Date.now()}-${++notificationIdCounter}`;
}
function useNotificationHandler({
  onNotification
} = {}) {
  const { subscribe: subscribe2 } = useEventContext();
  const [notifications, setNotifications] = (0, import_react8.useState)([]);
  (0, import_react8.useEffect)(() => {
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
  const markHandled = (0, import_react8.useCallback)((id) => {
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
  AomiRuntimeProvider,
  BackendApi,
  RuntimeActionsProvider,
  ThreadContextProvider,
  useCurrentThreadMessages,
  useCurrentThreadMetadata,
  useEventContext,
  useNotificationHandler,
  useRuntimeActions,
  useThreadContext,
  useWalletHandler
});
//# sourceMappingURL=index.cjs.map