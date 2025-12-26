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

// packages/react/src/runtime/aomi-runtime.tsx
import { useCallback as useCallback3, useEffect, useRef as useRef3 } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime
} from "@assistant-ui/react";

// packages/react/src/runtime/hooks.ts
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

// packages/react/src/runtime/orchestration.ts
import { useCallback, useRef, useState } from "react";

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
    tempToSessionId: /* @__PURE__ */ new Map(),
    skipInitialFetch: /* @__PURE__ */ new Set(),
    pendingChat: /* @__PURE__ */ new Map(),
    pendingSystem: /* @__PURE__ */ new Map(),
    runningThreads: /* @__PURE__ */ new Set(),
    creatingThreadId: null,
    createThreadPromise: null
  };
}
function resolveSessionId(state, threadId) {
  var _a;
  return (_a = state.tempToSessionId.get(threadId)) != null ? _a : threadId;
}
function isSessionReady(state, threadId) {
  if (!isTempThreadId(threadId)) return true;
  return state.tempToSessionId.has(threadId);
}
function setBackendMapping(state, tempId, backendId) {
  state.tempToSessionId.set(tempId, backendId);
}
function getTempIdForSession(state, backendId) {
  for (const [tempId, id] of state.tempToSessionId.entries()) {
    if (id === backendId) return tempId;
  }
  return void 0;
}
function skipFirstFetch(state, threadId) {
  state.skipInitialFetch.add(threadId);
}
function shouldSkipInitialFetch(state, threadId) {
  return state.skipInitialFetch.has(threadId);
}
function clearSkipInitialFetch(state, threadId) {
  state.skipInitialFetch.delete(threadId);
}
function setSessionRunning(state, threadId, running) {
  if (running) {
    state.runningThreads.add(threadId);
  } else {
    state.runningThreads.delete(threadId);
  }
}
function isSessionRunning(state, threadId) {
  return state.runningThreads.has(threadId);
}
function enqueuePendingSession(state, threadId, text) {
  var _a;
  const existing = (_a = state.pendingChat.get(threadId)) != null ? _a : [];
  state.pendingChat.set(threadId, [...existing, text]);
}
function dequeuePendingSession(state, threadId) {
  var _a;
  const pending = (_a = state.pendingChat.get(threadId)) != null ? _a : [];
  state.pendingChat.delete(threadId);
  return pending;
}
function hasPendingSession(state, threadId) {
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
    if (hasPendingSession(backendState, threadId)) {
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
    if (!isSessionReady(backendState, threadId)) {
      this.markRunning(threadId, true);
      enqueuePendingSession(backendState, threadId, text);
      return;
    }
    const sessionId = resolveSessionId(backendState, threadId);
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
  async outboundSystem(threadId, text) {
    const backendState = this.config.backendStateRef.current;
    if (!isSessionReady(backendState, threadId)) return;
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
    const sessionId = resolveSessionId(backendState, threadId);
    this.markRunning(threadId, true);
    try {
      const response = await this.config.backendApiRef.current.postSystemMessage(sessionId, text);
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
  async flushPendingSession(threadId) {
    const backendState = this.config.backendStateRef.current;
    const pending = dequeuePendingSession(backendState, threadId);
    if (!pending.length) return;
    const sessionId = resolveSessionId(backendState, threadId);
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
    const backendState = this.config.backendStateRef.current;
    if (!isSessionReady(backendState, threadId)) return;
    this.config.polling.stop(threadId);
    const sessionId = resolveSessionId(backendState, threadId);
    try {
      await this.config.backendApiRef.current.postInterrupt(sessionId);
      this.markRunning(threadId, false);
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  }
  markRunning(threadId, running) {
    var _a, _b;
    setSessionRunning(this.config.backendStateRef.current, threadId, running);
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
    if (!isSessionReady(backendState, threadId)) return;
    if (this.intervals.has(threadId)) return;
    const sessionId = resolveSessionId(backendState, threadId);
    setSessionRunning(backendState, threadId, true);
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
    setSessionRunning(this.config.backendStateRef.current, threadId, false);
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

// packages/react/src/runtime/orchestration.ts
function useRuntimeOrchestration(backendUrl, threadContextRef) {
  const backendApiRef = useRef(null);
  if (!backendApiRef.current) {
    backendApiRef.current = new BackendApi(backendUrl);
  }
  const backendApi = backendApiRef;
  const backendStateRef = useRef(createBakendState());
  const [isRunning, setIsRunning] = useState(false);
  const messageControllerRef = useRef(null);
  const pollingRef = useRef(null);
  if (!pollingRef.current) {
    pollingRef.current = new PollingController({
      backendApiRef: backendApi,
      backendStateRef,
      // find the right time to run applyMessages
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
      backendApiRef: backendApi,
      backendStateRef,
      threadContextRef,
      polling: pollingRef.current,
      setGlobalIsRunning: setIsRunning
    });
  }
  const syncThreadState = useCallback(
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
      if (!isSessionReady(backendState, threadId)) {
        if (isCurrentThread) {
          setIsRunning(false);
        }
        return;
      }
      const sessionId = resolveSessionId(backendState, threadId);
      try {
        const state = await backendApi.current.fetchState(sessionId);
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
    [
      backendApi,
      backendStateRef,
      pollingRef,
      messageControllerRef,
      setIsRunning,
      threadContextRef
    ]
  );
  return {
    backendStateRef,
    polling: pollingRef.current,
    messageController: messageControllerRef.current,
    isRunning,
    setIsRunning,
    syncThreadState,
    backendApiRef: backendApi
  };
}

// packages/react/src/runtime/thread-list.tsx
import { useCallback as useCallback2, useMemo } from "react";
var sortByLastActiveDesc = ([, metaA], [, metaB]) => {
  const tsA = parseTimestamp2(metaA.lastActiveAt);
  const tsB = parseTimestamp2(metaB.lastActiveAt);
  return tsB - tsA;
};
var DEFAULT_THREAD_TITLE = "New Chat";
var DEFAULT_SESSION_ID = "default-session";
function buildThreadLists(threadMetadata) {
  const entries = Array.from(threadMetadata.entries()).filter(
    ([, meta]) => !isPlaceholderTitle(meta.title)
  );
  const regularThreads = entries.filter(([, meta]) => meta.status === "regular").sort(sortByLastActiveDesc).map(([id, meta]) => ({
    id,
    title: meta.title || DEFAULT_THREAD_TITLE,
    status: "regular"
  }));
  const archivedThreads = entries.filter(([, meta]) => meta.status === "archived").sort(sortByLastActiveDesc).map(([id, meta]) => ({
    id,
    title: meta.title || DEFAULT_THREAD_TITLE,
    status: "archived"
  }));
  return { regularThreads, archivedThreads };
}
function deleteThreadFromContext(context, threadId) {
  context.setThreadMetadata((prev) => {
    const next = new Map(prev);
    next.delete(threadId);
    return next;
  });
  context.setThreads((prev) => {
    const next = new Map(prev);
    next.delete(threadId);
    return next;
  });
}
function clearPendingQueues(backendState, threadId) {
  backendState.pendingChat.delete(threadId);
  backendState.pendingSystem.delete(threadId);
}
function clearPendingThreadState(backendState, threadId) {
  clearPendingQueues(backendState, threadId);
  backendState.tempToSessionId.delete(threadId);
  backendState.skipInitialFetch.delete(threadId);
}
function updateTitleFromBackend(context, threadId, backendTitle) {
  if (!backendTitle || isPlaceholderTitle(backendTitle)) return;
  context.setThreadMetadata((prev) => {
    var _a;
    const next = new Map(prev);
    const existing = next.get(threadId);
    const nextStatus = (existing == null ? void 0 : existing.status) === "archived" ? "archived" : "regular";
    next.set(threadId, {
      title: backendTitle,
      status: nextStatus,
      lastActiveAt: (_a = existing == null ? void 0 : existing.lastActiveAt) != null ? _a : (/* @__PURE__ */ new Date()).toISOString()
    });
    return next;
  });
}
function ensureFallbackThread(context, removedId) {
  if (context.currentThreadId !== removedId) return;
  const firstRegularThread = Array.from(context.threadMetadata.entries()).find(
    ([id, meta]) => meta.status === "regular" && id !== removedId
  );
  if (firstRegularThread) {
    context.setCurrentThreadId(firstRegularThread[0]);
    return;
  }
  context.setThreadMetadata(
    (prev) => new Map(prev).set(DEFAULT_SESSION_ID, {
      title: DEFAULT_THREAD_TITLE,
      status: "regular",
      lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
    })
  );
  context.setThreadMessages(DEFAULT_SESSION_ID, []);
  context.setCurrentThreadId(DEFAULT_SESSION_ID);
}
function useThreadListAdapter({
  backendApiRef,
  backendStateRef,
  currentThreadIdRef,
  polling,
  publicKey,
  setIsRunning,
  threadContext,
  threadContextRef
}) {
  const { regularThreads, archivedThreads } = useMemo(
    () => buildThreadLists(threadContext.threadMetadata),
    [threadContext.threadMetadata]
  );
  const removePendingThread = useCallback2(
    (threadId) => {
      const currentContext = threadContextRef.current;
      deleteThreadFromContext(currentContext, threadId);
      clearPendingThreadState(backendStateRef.current, threadId);
    },
    [backendStateRef, threadContextRef]
  );
  const preparePendingThread = useCallback2(
    (threadId) => {
      const backendState = backendStateRef.current;
      const previousPendingId = backendState.creatingThreadId;
      if (previousPendingId && previousPendingId !== threadId) {
        removePendingThread(previousPendingId);
      }
      backendState.creatingThreadId = threadId;
      clearPendingQueues(backendState, threadId);
      const currentContext = threadContextRef.current;
      currentContext.setThreadMetadata(
        (prev) => new Map(prev).set(threadId, {
          title: DEFAULT_THREAD_TITLE,
          status: "pending",
          lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
        })
      );
      currentContext.setThreadMessages(threadId, []);
      currentContext.setCurrentThreadId(threadId);
      setIsRunning(false);
      currentContext.bumpThreadViewKey();
    },
    [backendStateRef, removePendingThread, setIsRunning, threadContextRef]
  );
  const findPendingThreadId = useCallback2(() => {
    const backendState = backendStateRef.current;
    if (backendState.creatingThreadId) return backendState.creatingThreadId;
    for (const [id, meta] of threadContextRef.current.threadMetadata.entries()) {
      if (meta.status === "pending") return id;
    }
    return null;
  }, [backendStateRef, threadContextRef]);
  const onSwitchToNewThread = useCallback2(async () => {
    var _a;
    const backendState = backendStateRef.current;
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
      skipFirstFetch(backendState, uiThreadId);
      updateTitleFromBackend(threadContextRef.current, uiThreadId, newThread.title);
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
      deleteThreadFromContext(threadContextRef.current, failedId);
      if (backendState.creatingThreadId === failedId) {
        backendState.creatingThreadId = null;
      }
    }).finally(() => {
      backendState.createThreadPromise = null;
    });
    backendState.createThreadPromise = createPromise;
  }, [
    backendApiRef,
    backendStateRef,
    currentThreadIdRef,
    findPendingThreadId,
    polling,
    preparePendingThread,
    publicKey,
    threadContextRef
  ]);
  const onSwitchToThread = useCallback2(
    (threadId) => {
      threadContextRef.current.setCurrentThreadId(threadId);
    },
    [threadContextRef]
  );
  const onRename = useCallback2(
    async (threadId, newTitle) => {
      var _a, _b;
      const currentContext = threadContextRef.current;
      const previousTitle = (_b = (_a = currentContext.getThreadMetadata(threadId)) == null ? void 0 : _a.title) != null ? _b : "";
      const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
      currentContext.updateThreadMetadata(threadId, {
        title: normalizedTitle
      });
      try {
        await backendApiRef.current.renameThread(threadId, newTitle);
      } catch (error) {
        console.error("Failed to rename thread:", error);
        currentContext.updateThreadMetadata(threadId, { title: previousTitle });
      }
    },
    [backendApiRef, threadContextRef]
  );
  const onArchive = useCallback2(
    async (threadId) => {
      const currentContext = threadContextRef.current;
      currentContext.updateThreadMetadata(threadId, { status: "archived" });
      try {
        await backendApiRef.current.archiveThread(threadId);
      } catch (error) {
        console.error("Failed to archive thread:", error);
        currentContext.updateThreadMetadata(threadId, { status: "regular" });
      }
    },
    [backendApiRef, threadContextRef]
  );
  const onUnarchive = useCallback2(
    async (threadId) => {
      const currentContext = threadContextRef.current;
      currentContext.updateThreadMetadata(threadId, { status: "regular" });
      try {
        await backendApiRef.current.unarchiveThread(threadId);
      } catch (error) {
        console.error("Failed to unarchive thread:", error);
        currentContext.updateThreadMetadata(threadId, { status: "archived" });
      }
    },
    [backendApiRef, threadContextRef]
  );
  const onDelete = useCallback2(
    async (threadId) => {
      try {
        await backendApiRef.current.deleteThread(threadId);
        const currentContext = threadContextRef.current;
        deleteThreadFromContext(currentContext, threadId);
        const backendState = backendStateRef.current;
        clearPendingThreadState(backendState, threadId);
        backendState.runningThreads.delete(threadId);
        if (backendState.creatingThreadId === threadId) {
          backendState.creatingThreadId = null;
        }
        ensureFallbackThread(currentContext, threadId);
      } catch (error) {
        console.error("Failed to delete thread:", error);
        throw error;
      }
    },
    [backendApiRef, backendStateRef, threadContextRef]
  );
  return useMemo(
    () => ({
      threadId: threadContext.currentThreadId,
      threads: regularThreads,
      archivedThreads,
      onSwitchToNewThread,
      onSwitchToThread,
      onRename,
      onArchive,
      onUnarchive,
      onDelete
    }),
    [
      archivedThreads,
      onArchive,
      onDelete,
      onRename,
      onSwitchToNewThread,
      onSwitchToThread,
      onUnarchive,
      regularThreads,
      threadContext.currentThreadId
    ]
  );
}
async function fetchThreadListWithPk(publicKey, backendApiRef, threadContextRef) {
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
}

// packages/react/src/state/thread-context.tsx
import { createContext as createContext2, useContext as useContext2, useMemo as useMemo2, useRef as useRef2, useSyncExternalStore } from "react";

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
    this.snapshot = this.createSnapshot();
  }
  createSnapshot() {
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
    this.snapshot = this.createSnapshot();
    this.emit();
  }
};

// packages/react/src/state/thread-context.tsx
import { jsx } from "react/jsx-runtime";
var ThreadContextState = createContext2(null);
function useThreadContext() {
  const context = useContext2(ThreadContextState);
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
  const storeRef = useRef2(null);
  if (!storeRef.current) {
    storeRef.current = new ThreadStore({ initialThreadId });
  }
  const store = storeRef.current;
  const value = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return (
    // Feed the sync value of ThreadStore to child components
    /* @__PURE__ */ jsx(ThreadContextState.Provider, { value, children })
  );
}
function useCurrentThreadMessages() {
  const { currentThreadId, getThreadMessages } = useThreadContext();
  return useMemo2(() => getThreadMessages(currentThreadId), [currentThreadId, getThreadMessages]);
}
function useCurrentThreadMetadata() {
  const { currentThreadId, getThreadMetadata } = useThreadContext();
  return useMemo2(() => getThreadMetadata(currentThreadId), [currentThreadId, getThreadMetadata]);
}

// packages/react/src/runtime/aomi-runtime.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  publicKey
}) {
  const threadContext = useThreadContext();
  const threadContextRef = useRef3(threadContext);
  threadContextRef.current = threadContext;
  const currentThreadId = threadContext.currentThreadId;
  const {
    backendStateRef,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    syncThreadState,
    backendApiRef
  } = useRuntimeOrchestration(backendUrl, threadContextRef);
  const currentThreadIdRef = useRef3(currentThreadId);
  currentThreadIdRef.current = currentThreadId;
  useEffect(() => {
    void syncThreadState(currentThreadId);
  }, [syncThreadState, currentThreadId]);
  useEffect(() => {
    setIsRunning(isSessionRunning(backendStateRef.current, currentThreadId));
  }, [backendStateRef, setIsRunning, currentThreadId]);
  const currentMessages = threadContext.getThreadMessages(currentThreadId);
  useEffect(() => {
    if (!publicKey) return;
    void fetchThreadListWithPk(publicKey, backendApiRef, threadContextRef);
  }, [backendApiRef, publicKey, threadContextRef]);
  const threadListAdapter = useThreadListAdapter({
    backendApiRef,
    backendStateRef,
    currentThreadIdRef,
    polling,
    publicKey,
    setIsRunning,
    threadContext,
    threadContextRef
  });
  useEffect(() => {
    const unsubscribe = backendApiRef.current.subscribeToUpdates((update) => {
      var _a;
      if (update.type !== "TitleChanged") return;
      const sessionId = update.data.session_id;
      const newTitle = update.data.new_title;
      const backendState = backendStateRef.current;
      const targetThreadId = (_a = getTempIdForSession(backendState, sessionId)) != null ? _a : resolveSessionId(backendState, sessionId);
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
    });
    return () => {
      unsubscribe == null ? void 0 : unsubscribe();
    };
  }, [backendApiRef, backendStateRef, threadContext]);
  useEffect(() => {
    if (!isTempThreadId(currentThreadId)) return;
    if (!isSessionReady(backendStateRef.current, currentThreadId)) return;
    void messageController.flushPendingSession(currentThreadId);
  }, [messageController, backendStateRef, currentThreadId]);
  const { setMessages, onNew, onCancel, sendSystemMessage } = useRuntimeCallbacks({
    currentThreadIdRef,
    messageController,
    threadContextRef
  });
  const runtime = useExternalStoreRuntime({
    messages: currentMessages,
    setMessages,
    isRunning,
    onNew,
    onCancel,
    convertMessage: (msg) => msg,
    adapters: { threadList: threadListAdapter }
  });
  useEffect(() => {
    if (isTempThreadId(currentThreadId)) return;
    const hasUserMessages = currentMessages.some((msg) => msg.role === "user");
    if (hasUserMessages) {
      void messageController.flushPendingSystem(currentThreadId);
    }
  }, [currentMessages, messageController, currentThreadId]);
  useEffect(() => {
    return () => {
      polling.stopAll();
    };
  }, [polling]);
  return /* @__PURE__ */ jsx2(RuntimeActionsProvider, { value: { sendSystemMessage }, children: /* @__PURE__ */ jsx2(AssistantRuntimeProvider, { runtime, children }) });
}
function useRuntimeCallbacks({
  currentThreadIdRef,
  messageController,
  threadContextRef
}) {
  const setMessages = useCallback3(
    (messages) => {
      threadContextRef.current.setThreadMessages(currentThreadIdRef.current, [...messages]);
    },
    [currentThreadIdRef, threadContextRef]
  );
  const onNew = useCallback3(
    (message) => messageController.outbound(message, currentThreadIdRef.current),
    [currentThreadIdRef, messageController]
  );
  const onCancel = useCallback3(
    () => messageController.cancel(currentThreadIdRef.current),
    [currentThreadIdRef, messageController]
  );
  const sendSystemMessage = useCallback3(
    (message) => messageController.outboundSystem(currentThreadIdRef.current, message),
    [currentThreadIdRef, messageController]
  );
  return { setMessages, onNew, onCancel, sendSystemMessage };
}

// packages/react/src/utils/wallet.ts
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

// packages/react/src/lib/utils.ts
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
  toInboundSystem as constructSystemMessage,
  toInboundMessage as constructThreadMessage,
  formatAddress,
  getNetworkName,
  useCurrentThreadMessages,
  useCurrentThreadMetadata,
  useRuntimeActions,
  useThreadContext
};
//# sourceMappingURL=index.js.map