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
  subscribeToUpdates(onUpdate, onError) {
    if (this.updatesEventSource) {
      this.updatesEventSource.close();
    }
    const updatesUrl = new URL("/api/updates", this.backendUrl).toString();
    this.updatesEventSource = new EventSource(updatesUrl);
    this.updatesEventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onUpdate(parsed);
      } catch (error) {
        console.error("Failed to parse system update SSE:", error);
        onError == null ? void 0 : onError(error);
      }
    };
    this.updatesEventSource.onerror = (error) => {
      console.error("System updates SSE error:", error);
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
};

// src/runtime/aomi-runtime.tsx
import { useEffect, useMemo as useMemo3, useRef as useRef3 } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime
} from "@assistant-ui/react";

// src/runtime/hooks.ts
import { createContext, useContext } from "react";
var RuntimeActionsContext = createContext(void 0);
var RuntimeActionsProvider = RuntimeActionsContext.Provider;
function useRuntimeActions() {
  const context = useContext(RuntimeActionsContext);
  if (!context) {
    throw new Error("useRuntimeActions must be used within AomiRuntimeProvider");
  }
  return context;
}

// src/runtime/orchestrator.ts
import { useMemo as useMemo2, useRef as useRef2, useState } from "react";

// src/state/thread-context.tsx
import {
  createContext as createContext2,
  useContext as useContext2,
  useMemo,
  useRef,
  useSyncExternalStore
} from "react";

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
    this.getSnapshot = () => ({
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
    });
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
    this.emit();
  }
};

// src/state/thread-context.tsx
import { jsx } from "react/jsx-runtime";
var ThreadContext = createContext2(null);
function useThreadContext() {
  const context = useContext2(ThreadContext);
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
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = new ThreadStore({ initialThreadId });
  }
  const store = storeRef.current;
  const value = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return /* @__PURE__ */ jsx(ThreadContext.Provider, { value, children });
}
function useCurrentThreadMessages() {
  const { currentThreadId, getThreadMessages } = useThreadContext();
  return useMemo(() => getThreadMessages(currentThreadId), [currentThreadId, getThreadMessages]);
}
function useCurrentThreadMetadata() {
  const { currentThreadId, getThreadMetadata } = useThreadContext();
  return useMemo(() => getThreadMetadata(currentThreadId), [currentThreadId, getThreadMetadata]);
}

// src/utils/conversion.ts
function constructThreadMessage(msg) {
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
function constructSystemMessage(msg) {
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

// src/runtime/message-controller.ts
var MessageController = class {
  constructor(config) {
    this.config = config;
  }
  applyBackendMessages(threadId, msgs) {
    if (!msgs) return;
    if (this.config.registry.hasPendingSession(threadId)) {
      return;
    }
    const threadMessages = [];
    for (const msg of msgs) {
      if (msg.sender === "system") {
        const systemMessage = constructSystemMessage(msg);
        if (systemMessage) {
          threadMessages.push(systemMessage);
        }
        continue;
      }
      const threadMessage = constructThreadMessage(msg);
      if (threadMessage) {
        threadMessages.push(threadMessage);
      }
    }
    this.config.registry.setThreadMessages(threadId, threadMessages);
  }
  async sendChat(message, threadId) {
    const text = message.content.filter((part) => part.type === "text").map((part) => part.text).join("\n");
    if (!text) return;
    const existingMessages = this.config.registry.getThreadMessages(threadId);
    const userMessage = {
      role: "user",
      content: [{ type: "text", text }],
      createdAt: /* @__PURE__ */ new Date()
    };
    this.config.registry.setThreadMessages(threadId, [...existingMessages, userMessage]);
    this.config.registry.updateThreadMetadata(threadId, { lastActiveAt: (/* @__PURE__ */ new Date()).toISOString() });
    if (!this.config.registry.isSessionReady(threadId)) {
      this.markRunning(threadId, true);
      this.config.registry.enqueuePendingSession(threadId, text);
      return;
    }
    const sessionId = this.config.registry.resolveSessionId(threadId);
    try {
      this.markRunning(threadId, true);
      await this.config.backendApiRef.current.postChatMessage(sessionId, text);
      await this.flushPendingSystem(threadId);
      this.config.polling.start(threadId);
    } catch (error) {
      console.error("Failed to send message:", error);
      this.markRunning(threadId, false);
    }
  }
  async sendSystemMessage(threadId, text) {
    if (!this.config.registry.isSessionReady(threadId)) return;
    const threadMessages = this.config.registry.getThreadMessages(threadId);
    const hasUserMessages = threadMessages.some((msg) => msg.role === "user");
    if (!hasUserMessages) {
      this.config.registry.enqueuePendingSystem(threadId, text);
      return;
    }
    await this.sendSystemMessageNow(threadId, text);
  }
  async sendSystemMessageNow(threadId, text) {
    const sessionId = this.config.registry.resolveSessionId(threadId);
    this.markRunning(threadId, true);
    try {
      const response = await this.config.backendApiRef.current.postSystemMessage(sessionId, text);
      if (response.res) {
        const systemMessage = constructSystemMessage(response.res);
        if (systemMessage) {
          const updatedMessages = [...this.config.registry.getThreadMessages(threadId), systemMessage];
          this.config.registry.setThreadMessages(threadId, updatedMessages);
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
    const pending = this.config.registry.dequeuePendingSystem(threadId);
    if (!pending.length) return;
    for (const pendingMessage of pending) {
      await this.sendSystemMessageNow(threadId, pendingMessage);
    }
  }
  async flushPendingSession(threadId) {
    const pending = this.config.registry.dequeuePendingSession(threadId);
    if (!pending.length) return;
    const sessionId = this.config.registry.resolveSessionId(threadId);
    for (const text of pending) {
      try {
        await this.config.backendApiRef.current.postChatMessage(sessionId, text);
      } catch (error) {
        console.error("Failed to send queued message:", error);
      }
    }
    this.config.polling.start(threadId);
  }
  async cancel(threadId) {
    if (!this.config.registry.isSessionReady(threadId)) return;
    this.config.polling.stop(threadId);
    const sessionId = this.config.registry.resolveSessionId(threadId);
    try {
      await this.config.backendApiRef.current.postInterrupt(sessionId);
      this.markRunning(threadId, false);
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  }
  markRunning(threadId, running) {
    var _a, _b;
    this.config.registry.setIsRunning(threadId, running);
    (_b = (_a = this.config).setGlobalIsRunning) == null ? void 0 : _b.call(_a, running);
  }
};

// src/runtime/polling-controller.ts
var PollingController = class {
  constructor(config) {
    this.config = config;
    this.intervals = /* @__PURE__ */ new Map();
    var _a;
    this.intervalMs = (_a = config.intervalMs) != null ? _a : 500;
  }
  start(threadId) {
    if (!this.config.registry.isSessionReady(threadId)) return;
    if (this.intervals.has(threadId)) return;
    const sessionId = this.config.registry.resolveSessionId(threadId);
    this.config.registry.setIsRunning(threadId, true);
    const tick = async () => {
      try {
        const state = await this.config.backendApiRef.current.fetchState(sessionId);
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
    this.config.registry.setIsRunning(threadId, false);
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

// src/runtime/thread-store.ts
function createThreadState(id, metadata, messages = []) {
  var _a, _b, _c;
  return {
    id,
    metadata: {
      title: (_a = metadata == null ? void 0 : metadata.title) != null ? _a : "New Chat",
      status: (_b = metadata == null ? void 0 : metadata.status) != null ? _b : "regular",
      lastActiveAt: (_c = metadata == null ? void 0 : metadata.lastActiveAt) != null ? _c : (/* @__PURE__ */ new Date()).toISOString()
    },
    messages,
    pendingChatQueue: [],
    pendingSystemQueue: [],
    isRunning: false
  };
}

// src/runtime/thread-registry.ts
var ThreadRegistry = class {
  constructor(deps) {
    this.deps = deps;
    this.stores = /* @__PURE__ */ new Map();
    this.tempToSessionId = /* @__PURE__ */ new Map();
    this.skipInitialFetch = /* @__PURE__ */ new Set();
    this.isRunningByThread = /* @__PURE__ */ new Map();
    this.pendingChat = /* @__PURE__ */ new Map();
    this.pendingSystem = /* @__PURE__ */ new Map();
    this.threadListApi = {
      getCurrentThreadId: () => this.deps.getCurrentThreadId(),
      setCurrentThreadId: (id) => this.deps.setCurrentThreadId(id),
      threadMetadata: this.deps.threadMetadata,
      setThreadMetadata: this.deps.setThreadMetadata,
      setThreads: this.deps.setThreads,
      setThreadMessages: (threadId, messages) => this.deps.setThreadMessages(threadId, messages),
      updateThreadMetadata: (threadId, updates) => this.deps.updateThreadMetadata(threadId, updates),
      threadCnt: this.deps.threadCnt,
      setThreadCnt: this.deps.setThreadCnt
    };
  }
  getThreadListApi() {
    return this.threadListApi;
  }
  ensure(threadId, metadata) {
    if (!this.stores.has(threadId)) {
      const messages = this.deps.getThreadMessages(threadId);
      const meta = this.deps.threadMetadata.get(threadId);
      const store = createThreadState(threadId, meta != null ? meta : metadata, messages);
      this.stores.set(threadId, store);
    }
    return this.stores.get(threadId);
  }
  get(threadId) {
    return this.stores.get(threadId);
  }
  resolveSessionId(threadId) {
    var _a;
    return (_a = this.tempToSessionId.get(threadId)) != null ? _a : threadId;
  }
  setBackendMapping(tempId, backendId) {
    this.tempToSessionId.set(tempId, backendId);
  }
  getTempIdForSession(backendId) {
    for (const [tempId, id] of this.tempToSessionId.entries()) {
      if (id === backendId) return tempId;
    }
    return void 0;
  }
  getTempToBackendMap() {
    return this.tempToSessionId;
  }
  isSessionReady(threadId) {
    if (!threadId.startsWith("temp-")) return true;
    return this.tempToSessionId.has(threadId);
  }
  skipFirstFetch(threadId) {
    this.skipInitialFetch.add(threadId);
  }
  shouldSkipInitialFetch(threadId) {
    return this.skipInitialFetch.has(threadId);
  }
  clearSkipInitialFetch(threadId) {
    this.skipInitialFetch.delete(threadId);
  }
  getSkipInitialFetchSet() {
    return this.skipInitialFetch;
  }
  setThreadMessages(threadId, messages) {
    this.deps.setThreadMessages(threadId, messages);
    const store = this.ensure(threadId);
    store.messages = messages;
  }
  getThreadMessages(threadId) {
    const store = this.ensure(threadId);
    store.messages = this.deps.getThreadMessages(threadId);
    return store.messages;
  }
  updateThreadMetadata(threadId, updates) {
    this.deps.updateThreadMetadata(threadId, updates);
    const store = this.ensure(threadId);
    store.metadata = __spreadValues(__spreadValues({}, store.metadata), updates);
  }
  setThreadMetadata(updater) {
    this.deps.setThreadMetadata(updater);
  }
  setThreads(updater) {
    this.deps.setThreads(updater);
  }
  getCurrentThreadId() {
    return this.deps.getCurrentThreadId();
  }
  setCurrentThreadId(threadId) {
    this.deps.setCurrentThreadId(threadId);
  }
  setIsRunning(threadId, running) {
    if (running) {
      this.isRunningByThread.set(threadId, true);
    } else {
      this.isRunningByThread.delete(threadId);
    }
  }
  isRunning(threadId) {
    var _a;
    return (_a = this.isRunningByThread.get(threadId)) != null ? _a : false;
  }
  enqueuePendingSession(threadId, text) {
    var _a;
    const existing = (_a = this.pendingChat.get(threadId)) != null ? _a : [];
    this.pendingChat.set(threadId, [...existing, text]);
  }
  dequeuePendingSession(threadId) {
    var _a;
    const pending = (_a = this.pendingChat.get(threadId)) != null ? _a : [];
    this.pendingChat.delete(threadId);
    return pending;
  }
  hasPendingSession(threadId) {
    var _a, _b;
    return ((_b = (_a = this.pendingChat.get(threadId)) == null ? void 0 : _a.length) != null ? _b : 0) > 0;
  }
  getPendingChatMap() {
    return this.pendingChat;
  }
  enqueuePendingSystem(threadId, text) {
    var _a;
    const existing = (_a = this.pendingSystem.get(threadId)) != null ? _a : [];
    this.pendingSystem.set(threadId, [...existing, text]);
  }
  dequeuePendingSystem(threadId) {
    var _a;
    const pending = (_a = this.pendingSystem.get(threadId)) != null ? _a : [];
    this.pendingSystem.delete(threadId);
    return pending;
  }
  hasPendingSystem(threadId) {
    var _a, _b;
    return ((_b = (_a = this.pendingSystem.get(threadId)) == null ? void 0 : _a.length) != null ? _b : 0) > 0;
  }
  getPendingSystemMap() {
    return this.pendingSystem;
  }
};

// src/runtime/orchestrator.ts
function useRuntimeOrchestrator(backendUrl) {
  const threadContext = useThreadContext();
  const backendApiRef = useRef2(new BackendApi(backendUrl));
  const [isRunning, setIsRunning] = useState(false);
  const registry = useMemo2(
    () => new ThreadRegistry({
      getThreadMessages: threadContext.getThreadMessages,
      setThreadMessages: threadContext.setThreadMessages,
      updateThreadMetadata: threadContext.updateThreadMetadata,
      setThreadMetadata: threadContext.setThreadMetadata,
      setThreadCnt: threadContext.setThreadCnt,
      setThreads: threadContext.setThreads,
      threadCnt: threadContext.threadCnt,
      threadMetadata: threadContext.threadMetadata,
      getCurrentThreadId: () => threadContext.currentThreadId,
      setCurrentThreadId: threadContext.setCurrentThreadId
    }),
    [
      threadContext.getThreadMessages,
      threadContext.setThreadMessages,
      threadContext.updateThreadMetadata,
      threadContext.setThreadMetadata,
      threadContext.setThreadCnt,
      threadContext.setThreads,
      threadContext.threadCnt,
      threadContext.threadMetadata,
      threadContext.currentThreadId,
      threadContext.setCurrentThreadId
    ]
  );
  const polling = useMemo2(
    () => new PollingController({
      backendApiRef,
      registry,
      applyMessages: (threadId, msgs) => {
        var _a;
        (_a = messageControllerRef.current) == null ? void 0 : _a.applyBackendMessages(threadId, msgs);
      },
      onStop: () => setIsRunning(false)
    }),
    [registry]
  );
  const messageControllerRef = useRef2(null);
  const messageController = useMemo2(() => {
    const controller = new MessageController({
      backendApiRef,
      registry,
      polling,
      setGlobalIsRunning: setIsRunning
    });
    messageControllerRef.current = controller;
    return controller;
  }, [polling, registry]);
  const ensureInitialState = useMemo2(
    () => async (threadId) => {
      if (registry.shouldSkipInitialFetch(threadId)) {
        registry.clearSkipInitialFetch(threadId);
        setIsRunning(false);
        return;
      }
      if (!registry.isSessionReady(threadId)) {
        setIsRunning(false);
        return;
      }
      const sessionId = registry.resolveSessionId(threadId);
      try {
        const state = await backendApiRef.current.fetchState(sessionId);
        messageController.applyBackendMessages(threadId, state.messages);
        if (state.is_processing) {
          setIsRunning(true);
          polling.start(threadId);
        } else {
          setIsRunning(false);
        }
      } catch (error) {
        console.error("Failed to fetch initial state:", error);
        setIsRunning(false);
      }
    },
    [backendApiRef, messageController, polling, registry]
  );
  return {
    registry,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    ensureInitialState,
    backendApiRef
  };
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

// src/runtime/thread-list-adapter.ts
function createThreadListAdapter({
  currentThreadId,
  currentThreadIdRef,
  threadMetadata,
  setThreadMetadata,
  setThreads,
  setThreadMessages,
  setCurrentThreadId,
  setIsRunning,
  bumpThreadViewKey,
  findPendingThreadId,
  creatingThreadIdRef,
  createThreadPromiseRef,
  pendingChatMessagesRef,
  pendingSystemMessagesRef,
  tempToSessionIdRef,
  skipInitialFetchRef,
  backendApiRef,
  publicKey,
  threadCnt,
  resolveSessionId,
  startPolling,
  updateThreadMetadata
}) {
  const sortByLastActiveDesc = ([, metaA], [, metaB]) => {
    const tsA = parseTimestamp2(metaA.lastActiveAt);
    const tsB = parseTimestamp2(metaB.lastActiveAt);
    return tsB - tsA;
  };
  const regularThreads = Array.from(threadMetadata.entries()).filter(([_, meta]) => meta.status === "regular").filter(([_, meta]) => !isPlaceholderTitle(meta.title)).sort(sortByLastActiveDesc).map(([id, meta]) => ({
    id,
    title: meta.title || "New Chat",
    status: "regular"
  }));
  const archivedThreadsArray = Array.from(threadMetadata.entries()).filter(([_, meta]) => meta.status === "archived").filter(([_, meta]) => !isPlaceholderTitle(meta.title)).sort(sortByLastActiveDesc).map(([id, meta]) => ({
    id,
    title: meta.title || "New Chat",
    status: "archived"
  }));
  return {
    threadId: currentThreadId,
    threads: regularThreads,
    archivedThreads: archivedThreadsArray,
    onSwitchToNewThread: async () => {
      var _a;
      const preparePendingThread = (newId) => {
        const previousPendingId = creatingThreadIdRef.current;
        if (previousPendingId && previousPendingId !== newId) {
          setThreadMetadata((prev) => {
            const next = new Map(prev);
            next.delete(previousPendingId);
            return next;
          });
          setThreads((prev) => {
            const next = new Map(prev);
            next.delete(previousPendingId);
            return next;
          });
          pendingChatMessagesRef.current.delete(previousPendingId);
          pendingSystemMessagesRef.current.delete(previousPendingId);
          tempToSessionIdRef.current.delete(previousPendingId);
          skipInitialFetchRef.current.delete(previousPendingId);
        }
        creatingThreadIdRef.current = newId;
        pendingChatMessagesRef.current.delete(newId);
        pendingSystemMessagesRef.current.delete(newId);
        setThreadMetadata(
          (prev) => new Map(prev).set(newId, {
            title: "New Chat",
            status: "pending",
            lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
          })
        );
        setThreadMessages(newId, []);
        setCurrentThreadId(newId);
        setIsRunning(false);
        bumpThreadViewKey();
      };
      const existingPendingId = findPendingThreadId();
      if (existingPendingId) {
        preparePendingThread(existingPendingId);
        return;
      }
      if (createThreadPromiseRef.current) {
        preparePendingThread((_a = creatingThreadIdRef.current) != null ? _a : `temp-${crypto.randomUUID()}`);
        return;
      }
      const tempId = `temp-${crypto.randomUUID()}`;
      preparePendingThread(tempId);
      const createPromise = backendApiRef.current.createThread(publicKey, void 0).then(async (newThread) => {
        var _a2;
        const uiThreadId = (_a2 = creatingThreadIdRef.current) != null ? _a2 : tempId;
        const backendId = newThread.session_id;
        tempToSessionIdRef.current.set(uiThreadId, backendId);
        skipInitialFetchRef.current.add(uiThreadId);
        const backendTitle = newThread.title;
        if (backendTitle && !isPlaceholderTitle(backendTitle)) {
          setThreadMetadata((prev) => {
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
          if (creatingThreadIdRef.current === uiThreadId) {
            creatingThreadIdRef.current = null;
          }
        }
        const pendingMessages = pendingChatMessagesRef.current.get(uiThreadId);
        if (pendingMessages == null ? void 0 : pendingMessages.length) {
          pendingChatMessagesRef.current.delete(uiThreadId);
          for (const text of pendingMessages) {
            try {
              await backendApiRef.current.postChatMessage(backendId, text);
            } catch (error) {
              console.error("Failed to send queued message:", error);
            }
          }
          if (currentThreadIdRef.current === uiThreadId) {
            startPolling();
          }
        }
      }).catch((error) => {
        var _a2;
        console.error("Failed to create new thread:", error);
        const failedId = (_a2 = creatingThreadIdRef.current) != null ? _a2 : tempId;
        setThreadMetadata((prev) => {
          const next = new Map(prev);
          next.delete(failedId);
          return next;
        });
        setThreads((prev) => {
          const next = new Map(prev);
          next.delete(failedId);
          return next;
        });
        if (creatingThreadIdRef.current === failedId) {
          creatingThreadIdRef.current = null;
        }
      }).finally(() => {
        createThreadPromiseRef.current = null;
      });
      createThreadPromiseRef.current = createPromise;
    },
    onSwitchToThread: (threadId) => {
      setCurrentThreadId(threadId);
    },
    onRename: async (threadId, newTitle) => {
      updateThreadMetadata(threadId, { title: isPlaceholderTitle(newTitle) ? "" : newTitle });
      try {
        await backendApiRef.current.renameThread(threadId, newTitle);
      } catch (error) {
        console.error("Failed to rename thread:", error);
      }
    },
    onArchive: async (threadId) => {
      updateThreadMetadata(threadId, { status: "archived" });
      try {
        await backendApiRef.current.archiveThread(threadId);
      } catch (error) {
        console.error("Failed to archive thread:", error);
        updateThreadMetadata(threadId, { status: "regular" });
      }
    },
    onUnarchive: async (threadId) => {
      updateThreadMetadata(threadId, { status: "regular" });
      try {
        await backendApiRef.current.unarchiveThread(threadId);
      } catch (error) {
        console.error("Failed to unarchive thread:", error);
        updateThreadMetadata(threadId, { status: "archived" });
      }
    },
    onDelete: async (threadId) => {
      try {
        await backendApiRef.current.deleteThread(threadId);
        setThreadMetadata((prev) => {
          const next = new Map(prev);
          next.delete(threadId);
          return next;
        });
        setThreads((prev) => {
          const next = new Map(prev);
          next.delete(threadId);
          return next;
        });
        if (currentThreadId === threadId) {
          const firstRegularThread = Array.from(threadMetadata.entries()).find(
            ([id, meta]) => meta.status === "regular" && id !== threadId
          );
          if (firstRegularThread) {
            setCurrentThreadId(firstRegularThread[0]);
          } else {
            const defaultId = "default-session";
            setThreadMetadata(
              (prev) => new Map(prev).set(defaultId, {
                title: "New Chat",
                status: "regular",
                lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
              })
            );
            setThreadMessages(defaultId, []);
            setCurrentThreadId(defaultId);
          }
        }
      } catch (error) {
        console.error("Failed to delete thread:", error);
        throw error;
      }
    }
  };
}

// src/runtime/aomi-runtime.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  publicKey
}) {
  const threadContext = useThreadContext();
  const {
    registry,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    ensureInitialState,
    backendApiRef
  } = useRuntimeOrchestrator(backendUrl);
  const currentThreadIdRef = useRef3(threadContext.currentThreadId);
  useEffect(() => {
    currentThreadIdRef.current = threadContext.currentThreadId;
  }, [threadContext.currentThreadId]);
  const pendingChatMessagesRef = useRef3(registry.getPendingChatMap());
  const pendingSystemMessagesRef = useRef3(registry.getPendingSystemMap());
  const tempToSessionIdRef = useRef3(registry.getTempToBackendMap());
  const skipInitialFetchRef = useRef3(registry.getSkipInitialFetchSet());
  const creatingThreadIdRef = useRef3(null);
  const createThreadPromiseRef = useRef3(null);
  useEffect(() => {
    void ensureInitialState(threadContext.currentThreadId);
  }, [ensureInitialState, threadContext.currentThreadId]);
  const threadListAdapter = useMemo3(() => {
    const threadListApi = registry.getThreadListApi();
    return createThreadListAdapter(__spreadProps(__spreadValues({}, threadListApi), {
      currentThreadId: threadContext.currentThreadId,
      currentThreadIdRef,
      setIsRunning,
      bumpThreadViewKey: threadContext.bumpThreadViewKey,
      findPendingThreadId: () => {
        if (creatingThreadIdRef.current) return creatingThreadIdRef.current;
        for (const [id, meta] of threadListApi.threadMetadata.entries()) {
          if (meta.status === "pending") return id;
        }
        return null;
      },
      creatingThreadIdRef,
      createThreadPromiseRef,
      pendingChatMessagesRef,
      pendingSystemMessagesRef,
      tempToSessionIdRef,
      skipInitialFetchRef,
      backendApiRef,
      publicKey,
      resolveSessionId: (threadId) => registry.resolveSessionId(threadId),
      startPolling: (threadId) => polling.start(threadId != null ? threadId : threadContext.currentThreadId),
      updateThreadMetadata: threadListApi.updateThreadMetadata
    }));
  }, [
    backendApiRef,
    polling,
    publicKey,
    registry,
    setIsRunning,
    threadContext.bumpThreadViewKey,
    threadContext.currentThreadId
  ]);
  useEffect(() => {
    const unsubscribe = backendApiRef.current.subscribeToUpdates((update) => {
      var _a;
      if (update.type !== "TitleChanged") return;
      const sessionId = update.data.session_id;
      const newTitle = update.data.new_title;
      const targetThreadId = (_a = registry.getTempIdForSession(sessionId)) != null ? _a : registry.resolveSessionId(sessionId);
      const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
      threadContext.updateThreadMetadata(targetThreadId, {
        title: normalizedTitle
      });
      if (!isPlaceholderTitle(newTitle) && creatingThreadIdRef.current === targetThreadId) {
        creatingThreadIdRef.current = null;
      }
    });
    return () => {
      unsubscribe == null ? void 0 : unsubscribe();
    };
  }, [backendApiRef, registry, threadContext]);
  useEffect(() => {
    const threadId = currentThreadIdRef.current;
    if (!isTempThreadId(threadId)) return;
    if (!registry.isSessionReady(threadId)) return;
    void messageController.flushPendingSystem(threadId);
    void messageController.flushPendingSession(threadId);
  }, [messageController, registry]);
  const runtime = useExternalStoreRuntime({
    messages: threadContext.getThreadMessages(threadContext.currentThreadId),
    isRunning,
    onNew: (message) => messageController.sendChat(message, threadContext.currentThreadId),
    onCancel: () => messageController.cancel(threadContext.currentThreadId),
    convertMessage: (msg) => msg,
    adapters: { threadList: threadListAdapter }
  });
  return /* @__PURE__ */ jsx2(
    RuntimeActionsProvider,
    {
      value: {
        sendSystemMessage: (message) => messageController.sendSystemMessage(threadContext.currentThreadId, message)
      },
      children: /* @__PURE__ */ jsx2(AssistantRuntimeProvider, { runtime, children })
    }
  );
}

// src/utils/wallet.ts
import { useEffect as useEffect2, useRef as useRef4 } from "react";
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
function WalletSystemMessageEmitter({ wallet }) {
  const { sendSystemMessage } = useRuntimeActions();
  const lastWalletRef = useRef4({ isConnected: false });
  useEffect2(() => {
    const prev = lastWalletRef.current;
    const { address, chainId, isConnected } = wallet;
    const normalizedAddress = address == null ? void 0 : address.toLowerCase();
    if (isConnected && normalizedAddress && chainId && (!prev.isConnected || prev.address !== normalizedAddress)) {
      const networkName = getNetworkName(chainId);
      const message = `User connected wallet with address ${normalizedAddress} on ${networkName} network (Chain ID: ${chainId}). Ready to help with transactions.`;
      console.log(message);
      void sendSystemMessage(message);
      lastWalletRef.current = { isConnected: true, address: normalizedAddress, chainId };
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
      lastWalletRef.current = { isConnected: true, address: normalizedAddress, chainId };
    }
  }, [wallet, sendSystemMessage]);
  return null;
}

// src/lib/utils.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
export {
  AomiRuntimeProvider,
  BackendApi,
  RuntimeActionsProvider,
  ThreadContextProvider,
  WalletSystemMessageEmitter,
  cn,
  constructSystemMessage,
  constructThreadMessage,
  formatAddress,
  getNetworkName,
  useCurrentThreadMessages,
  useCurrentThreadMetadata,
  useRuntimeActions,
  useThreadContext
};
//# sourceMappingURL=index.js.map