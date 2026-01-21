var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value,
      })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

// src/backend/client.ts
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
  console.log("[postState] URL:", url);
  console.log("[postState] Payload:", payload);
  const response = await fetch(url, {
    method: "POST",
  });
  console.log("[postState] Response status:", response.status);
  if (!response.ok) {
    console.error("[postState] Error:", response.status, response.statusText);
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  console.log("[postState] Success:", data);
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
    console.log("[fetchState] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/state?session_id=${encodeURIComponent(sessionId)}`;
    console.log("[fetchState] URL:", url);
    const response = await fetch(url, {
      signal: options == null ? void 0 : options.signal,
    });
    console.log(
      "[fetchState] Response status:",
      response.status,
      response.statusText,
    );
    if (!response.ok) {
      console.error(
        "[fetchState] Error:",
        response.status,
        response.statusText,
      );
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log("[fetchState] Success:", data);
    return data;
  }
  async postChatMessage(sessionId, message, publicKey) {
    console.log(
      "[postChatMessage] Called with sessionId:",
      sessionId,
      "message:",
      message,
    );
    const result = await postState(this.backendUrl, "/api/chat", {
      message,
      session_id: sessionId,
      public_key: publicKey,
    });
    console.log("[postChatMessage] Success:", result);
    return result;
  }
  async postSystemMessage(sessionId, message) {
    console.log(
      "[postSystemMessage] Called with sessionId:",
      sessionId,
      "message:",
      message,
    );
    const result = await postState(this.backendUrl, "/api/system", {
      message,
      session_id: sessionId,
    });
    console.log("[postSystemMessage] Success:", result);
    return result;
  }
  async postInterrupt(sessionId) {
    console.log("[postInterrupt] Called with sessionId:", sessionId);
    const result = await postState(this.backendUrl, "/api/interrupt", {
      session_id: sessionId,
    });
    console.log("[postInterrupt] Success:", result);
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
        console.log("SSE connection opened to:", url.toString());
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
  /**
   * Subscribe to SSE updates for a session with automatic reconnection.
   * Returns an unsubscribe function.
   */
  subscribeSSE(sessionId, onUpdate, onError) {
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
      },
    };
    const scheduleRetry = () => {
      subscription.retries += 1;
      const delayMs = Math.min(500 * 2 ** (subscription.retries - 1), 1e4);
      console.warn(
        `[SSE] retrying in ${delayMs}ms (attempt ${subscription.retries})`,
        { sessionId },
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
      console.log("[SSE] subscribed", updatesUrlString);
      updatesEventSource.onopen = () => {
        subscription.retries = 0;
        console.log("[SSE] open", updatesUrlString);
      };
      updatesEventSource.onmessage = (event) => {
        try {
          console.log("[SSE] message", {
            url: updatesUrlString,
            data: event.data,
          });
          const parsed = JSON.parse(event.data);
          onUpdate(parsed);
        } catch (error) {
          console.error("Failed to parse SSE event:", error);
          onError == null ? void 0 : onError(error);
        }
      };
      updatesEventSource.onerror = (error) => {
        console.error("SSE connection error:", {
          url: updatesUrlString,
          readyState: updatesEventSource.readyState,
          error,
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
  async fetchThreads(publicKey) {
    console.log("[fetchThreads] Called with publicKey:", publicKey);
    const url = `${this.backendUrl}/api/sessions?public_key=${encodeURIComponent(publicKey)}`;
    console.log("[fetchThreads] URL:", url);
    const response = await fetch(url);
    console.log("[fetchThreads] Response status:", response.status);
    if (!response.ok) {
      console.error("[fetchThreads] Error:", response.status);
      throw new Error(`Failed to fetch threads: HTTP ${response.status}`);
    }
    const data = await response.json();
    console.log("[fetchThreads] Success:", data);
    return data;
  }
  async fetchThread(sessionId) {
    console.log("[fetchThread] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    console.log("[fetchThread] URL:", url);
    const response = await fetch(url);
    console.log(
      "[fetchThread] Response status:",
      response.status,
      response.statusText,
    );
    if (!response.ok) {
      console.error(
        "[fetchThread] Error:",
        response.status,
        response.statusText,
      );
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log("[fetchThread] Success:", data);
    return data;
  }
  async createThread(publicKey, title) {
    console.log(
      "[createThread] Called with publicKey:",
      publicKey,
      "title:",
      title,
    );
    const body = {};
    if (publicKey) {
      body.public_key = publicKey;
    }
    if (title) {
      body.title = title;
    }
    console.log("[createThread] Request body:", body);
    const url = `${this.backendUrl}/api/sessions`;
    console.log("[createThread] URL:", url);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    console.log("[createThread] Response status:", response.status);
    if (!response.ok) {
      console.error("[createThread] Error:", response.status);
      throw new Error(`Failed to create thread: HTTP ${response.status}`);
    }
    const data = await response.json();
    console.log("[createThread] Success:", data);
    return data;
  }
  async archiveThread(sessionId) {
    console.log("[archiveThread] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/archive`;
    console.log("[archiveThread] URL:", url);
    const response = await fetch(url, { method: "POST" });
    console.log("[archiveThread] Response status:", response.status);
    if (!response.ok) {
      console.error("[archiveThread] Error:", response.status);
      throw new Error(`Failed to archive thread: HTTP ${response.status}`);
    }
    console.log("[archiveThread] Success");
  }
  async unarchiveThread(sessionId) {
    console.log("[unarchiveThread] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/unarchive`;
    console.log("[unarchiveThread] URL:", url);
    const response = await fetch(url, { method: "POST" });
    console.log("[unarchiveThread] Response status:", response.status);
    if (!response.ok) {
      console.error("[unarchiveThread] Error:", response.status);
      throw new Error(`Failed to unarchive thread: HTTP ${response.status}`);
    }
    console.log("[unarchiveThread] Success");
  }
  async deleteThread(sessionId) {
    console.log("[deleteThread] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    console.log("[deleteThread] URL:", url);
    const response = await fetch(url, { method: "DELETE" });
    console.log("[deleteThread] Response status:", response.status);
    if (!response.ok) {
      console.error("[deleteThread] Error:", response.status);
      throw new Error(`Failed to delete thread: HTTP ${response.status}`);
    }
    console.log("[deleteThread] Success");
  }
  async renameThread(sessionId, newTitle) {
    console.log(
      "[renameThread] Called with sessionId:",
      sessionId,
      "newTitle:",
      newTitle,
    );
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    console.log("[renameThread] URL:", url);
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    console.log("[renameThread] Response status:", response.status);
    if (!response.ok) {
      console.error("[renameThread] Error:", response.status);
      throw new Error(`Failed to rename thread: HTTP ${response.status}`);
    }
    console.log("[renameThread] Success");
  }
  async getSystemEvents(sessionId) {
    console.log("[getSystemEvents] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/events?session_id=${encodeURIComponent(sessionId)}`;
    console.log("[getSystemEvents] URL:", url);
    const response = await fetch(url);
    console.log("[getSystemEvents] Response status:", response.status);
    if (!response.ok) {
      if (response.status === 404) {
        console.log("[getSystemEvents] Session not found, returning empty");
        return [];
      }
      console.error("[getSystemEvents] Error:", response.status);
      throw new Error(`Failed to get system events: HTTP ${response.status}`);
    }
    const data = await response.json();
    console.log("[getSystemEvents] Success:", data);
    return data;
  }
  /**
   * Fetch events after a specific event ID (for pagination/cursor-based fetching).
   */
  async fetchEventsAfter(sessionId, afterId = 0, limit = 100) {
    const url = new URL("/api/events", this.backendUrl);
    url.searchParams.set("session_id", sessionId);
    if (afterId > 0) url.searchParams.set("after_id", String(afterId));
    if (limit) url.searchParams.set("limit", String(limit));
    console.log("[fetchEventsAfter] URL:", url.toString());
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch events: HTTP ${response.status}`);
    }
    return await response.json();
  }
};

// src/runtime/aomi-runtime.tsx
import {
  useEffect as useEffect3,
  useMemo as useMemo2,
  useRef as useRef4,
} from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/react";

// src/contexts/event-context.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// src/state/event-buffer.ts
function createEventBuffer() {
  return {
    inboundQueue: [],
    outboundQueue: [],
    sseStatus: "disconnected",
    lastEventId: null,
    subscribers: /* @__PURE__ */ new Map(),
  };
}
function enqueueInbound(state, event) {
  state.inboundQueue.push(
    __spreadProps(__spreadValues({}, event), {
      status: "pending",
      timestamp: Date.now(),
    }),
  );
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

// src/contexts/event-context.tsx
import { jsx } from "react/jsx-runtime";
var EventContextState = createContext(null);
function useEventContext() {
  const context = useContext(EventContextState);
  if (!context) {
    throw new Error(
      "useEventContext must be used within EventContextProvider. Wrap your app with <EventContextProvider>...</EventContextProvider>",
    );
  }
  return context;
}
function EventContextProvider({ children, backendApi, sessionId }) {
  const bufferRef = useRef(null);
  if (!bufferRef.current) {
    bufferRef.current = createEventBuffer();
  }
  const buffer = bufferRef.current;
  const [sseStatus, setSseStatus] = useState("disconnected");
  useEffect(() => {
    setSSEStatus(buffer, "connecting");
    setSseStatus("connecting");
    const unsubscribe = backendApi.subscribeSSE(
      sessionId,
      (event) => {
        enqueueInbound(buffer, {
          type: event.type,
          sessionId: event.session_id,
          payload: event,
        });
        const inboundEvent = {
          type: event.type,
          sessionId: event.session_id,
          payload: event,
          status: "fetched",
          timestamp: Date.now(),
        };
        dispatch(buffer, inboundEvent);
      },
      (error) => {
        console.error("SSE error:", error);
        setSSEStatus(buffer, "disconnected");
        setSseStatus("disconnected");
      },
    );
    setSSEStatus(buffer, "connected");
    setSseStatus("connected");
    return () => {
      unsubscribe();
      setSSEStatus(buffer, "disconnected");
      setSseStatus("disconnected");
    };
  }, [backendApi, buffer, sessionId]);
  const subscribeCallback = useCallback(
    (type, callback) => {
      return subscribe(buffer, type, callback);
    },
    [buffer],
  );
  const sendOutbound = useCallback(
    async (event) => {
      try {
        const message = JSON.stringify({
          type: event.type,
          payload: event.payload,
        });
        await backendApi.postSystemMessage(event.sessionId, message);
      } catch (error) {
        console.error("Failed to send outbound event:", error);
      }
    },
    [backendApi],
  );
  const contextValue = {
    subscribe: subscribeCallback,
    sendOutbound,
    sseStatus,
  };
  return /* @__PURE__ */ jsx(EventContextState.Provider, {
    value: contextValue,
    children,
  });
}

// src/runtime/orchestrator.ts
import {
  useCallback as useCallback2,
  useEffect as useEffect2,
  useRef as useRef3,
  useState as useState2,
} from "react";

// src/contexts/thread-context.tsx
import {
  createContext as createContext2,
  useContext as useContext2,
  useMemo,
  useRef as useRef2,
  useSyncExternalStore,
} from "react";
import { jsx as jsx2 } from "react/jsx-runtime";
var ThreadContextState = createContext2(null);
function useThreadContext() {
  const context = useContext2(ThreadContextState);
  if (!context) {
    throw new Error(
      "useThreadContext must be used within ThreadContextProvider. Wrap your app with <ThreadContextProvider>...</ThreadContextProvider>",
    );
  }
  return context;
}

// src/runtime/utils.ts
var isTempThreadId = (id) => id.startsWith("temp-");
var parseTimestamp = (value) => {
  if (value === void 0 || value === null) return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? (value < 1e12 ? value * 1e3 : value) : 0;
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
  const normalized =
    (_a = title == null ? void 0 : title.trim()) != null ? _a : "";
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
  const [topic, toolContent] =
    (_a = parseToolResult(msg.tool_result)) != null ? _a : [];
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
      })(),
    });
  }
  const threadMessage = __spreadValues(
    {
      role,
      content: content.length > 0 ? content : [{ type: "text", text: "" }],
    },
    msg.timestamp && { createdAt: new Date(msg.timestamp) },
  );
  return threadMessage;
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

// src/state/backend-state.ts
function createBakendState() {
  return {
    tempToBackendId: /* @__PURE__ */ new Map(),
    skipInitialFetch: /* @__PURE__ */ new Set(),
    pendingChat: /* @__PURE__ */ new Map(),
    runningThreads: /* @__PURE__ */ new Set(),
    creatingThreadId: null,
    createThreadPromise: null,
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
  return (
    ((_b =
      (_a = state.pendingChat.get(threadId)) == null ? void 0 : _a.length) !=
    null
      ? _b
      : 0) > 0
  );
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
    const text = message.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
    if (!text) return;
    const threadState = this.getThreadContextApi();
    const existingMessages = threadState.getThreadMessages(threadId);
    const userMessage = {
      role: "user",
      content: [{ type: "text", text }],
      createdAt: /* @__PURE__ */ new Date(),
    };
    threadState.setThreadMessages(threadId, [...existingMessages, userMessage]);
    threadState.updateThreadMetadata(threadId, {
      lastActiveAt: /* @__PURE__ */ new Date().toISOString(),
    });
    if (!isThreadReady(backendState, threadId)) {
      this.markRunning(threadId, true);
      enqueuePendingChat(backendState, threadId, text);
      return;
    }
    const backendThreadId = resolveThreadId(backendState, threadId);
    const publicKey =
      (_b = (_a = this.config).getPublicKey) == null ? void 0 : _b.call(_a);
    try {
      this.markRunning(threadId, true);
      const response = publicKey
        ? await this.config.backendApiRef.current.postChatMessage(
            backendThreadId,
            text,
            publicKey,
          )
        : await this.config.backendApiRef.current.postChatMessage(
            backendThreadId,
            text,
          );
      if (response == null ? void 0 : response.messages) {
        this.inbound(threadId, response.messages);
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
  async flushPendingChat(threadId) {
    var _a, _b;
    const backendState = this.config.backendStateRef.current;
    const pending = dequeuePendingChat(backendState, threadId);
    if (!pending.length) return;
    const backendThreadId = resolveThreadId(backendState, threadId);
    const publicKey =
      (_b = (_a = this.config).getPublicKey) == null ? void 0 : _b.call(_a);
    for (const text of pending) {
      try {
        if (publicKey) {
          await this.config.backendApiRef.current.postChatMessage(
            backendThreadId,
            text,
            publicKey,
          );
        } else {
          await this.config.backendApiRef.current.postChatMessage(
            backendThreadId,
            text,
          );
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
      (_b = (_a = this.config).setGlobalIsRunning) == null
        ? void 0
        : _b.call(_a, running);
    }
  }
  getThreadContextApi() {
    const { getThreadMessages, setThreadMessages, updateThreadMetadata } =
      this.config.threadContextRef.current;
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
        console.log(
          "[PollingController] Fetching state for threadId:",
          threadId,
        );
        const state =
          await this.config.backendApiRef.current.fetchState(backendThreadId);
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
    this.config.applyMessages(threadId, state.messages);
    if (!state.is_processing) {
      this.stop(threadId);
    }
  }
};

// src/runtime/orchestrator.ts
function useRuntimeOrchestrator(backendUrl, options) {
  const threadContext = useThreadContext();
  const threadContextRef = useRef3(threadContext);
  threadContextRef.current = threadContext;
  const backendApiRef = useRef3(new BackendApi(backendUrl));
  const backendStateRef = useRef3(createBakendState());
  const [isRunning, setIsRunning] = useState2(false);
  const messageControllerRef = useRef3(null);
  const pollingRef = useRef3(null);
  const systemEventsHandlerRef = useRef3(null);
  const inFlightRef = useRef3(/* @__PURE__ */ new Map());
  if (!pollingRef.current) {
    pollingRef.current = new PollingController({
      backendApiRef,
      backendStateRef,
      applyMessages: (threadId, msgs) => {
        var _a;
        (_a = messageControllerRef.current) == null
          ? void 0
          : _a.inbound(threadId, msgs);
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
      },
    });
  }
  if (!messageControllerRef.current) {
    messageControllerRef.current = new MessageController({
      backendApiRef,
      backendStateRef,
      threadContextRef,
      polling: pollingRef.current,
      setGlobalIsRunning: setIsRunning,
      getPublicKey: options == null ? void 0 : options.getPublicKey,
    });
  }
  const setSystemEventsHandler = useCallback2((handler) => {
    var _a;
    systemEventsHandlerRef.current = handler;
    (_a = pollingRef.current) == null
      ? void 0
      : _a.setSystemEventsHandler(handler != null ? handler : void 0);
  }, []);
  useEffect2(() => {
    return () => {
      for (const controller of inFlightRef.current.values()) {
        controller.abort();
      }
      inFlightRef.current.clear();
    };
  }, []);
  const ensureInitialState = useCallback2(
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
        console.log(
          "[Orchestrator] Fetching initial state for threadId:",
          threadId,
        );
        const state = await backendApiRef.current.fetchState(backendThreadId, {
          signal: controller.signal,
        });
        (_a = messageControllerRef.current) == null
          ? void 0
          : _a.inbound(threadId, state.messages);
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
    [
      backendApiRef,
      backendStateRef,
      pollingRef,
      messageControllerRef,
      setIsRunning,
    ],
  );
  return {
    backendStateRef,
    polling: pollingRef.current,
    messageController: messageControllerRef.current,
    isRunning,
    setIsRunning,
    ensureInitialState,
    setSystemEventsHandler,
    backendApiRef,
  };
}

// src/runtime/aomi-runtime.tsx
import { jsx as jsx3 } from "react/jsx-runtime";
var sortByLastActiveDesc = ([, metaA], [, metaB]) => {
  const tsA = parseTimestamp(metaA.lastActiveAt);
  const tsB = parseTimestamp(metaB.lastActiveAt);
  return tsB - tsA;
};
function buildThreadLists(threadMetadata) {
  const entries = Array.from(threadMetadata.entries()).filter(
    ([, meta]) => !isPlaceholderTitle(meta.title),
  );
  const regularThreads = entries
    .filter(([, meta]) => meta.status === "regular")
    .sort(sortByLastActiveDesc)
    .map(([id, meta]) => ({
      id,
      title: meta.title || "New Chat",
      status: "regular",
    }));
  const archivedThreads = entries
    .filter(([, meta]) => meta.status === "archived")
    .sort(sortByLastActiveDesc)
    .map(([id, meta]) => ({
      id,
      title: meta.title || "New Chat",
      status: "archived",
    }));
  return { regularThreads, archivedThreads };
}
function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  publicKey,
}) {
  const threadContext = useThreadContext();
  const {
    backendStateRef,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    ensureInitialState,
    backendApiRef,
  } = useRuntimeOrchestrator(backendUrl);
  const threadContextRef = useRef4(threadContext);
  threadContextRef.current = threadContext;
  const currentThreadIdRef = useRef4(threadContext.currentThreadId);
  useEffect3(() => {
    currentThreadIdRef.current = threadContext.currentThreadId;
  }, [threadContext.currentThreadId]);
  useEffect3(() => {
    void ensureInitialState(threadContext.currentThreadId);
  }, [ensureInitialState, threadContext.currentThreadId]);
  useEffect3(() => {
    const threadId = threadContext.currentThreadId;
    setIsRunning(isThreadRunning(backendStateRef.current, threadId));
  }, [backendStateRef, setIsRunning, threadContext.currentThreadId]);
  const currentMessages = threadContext.getThreadMessages(
    threadContext.currentThreadId,
  );
  useEffect3(() => {
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
          const lastActive =
            thread.last_active_at ||
            thread.updated_at ||
            thread.created_at ||
            ((_b = newMetadata.get(thread.session_id)) == null
              ? void 0
              : _b.lastActiveAt) ||
            /* @__PURE__ */ new Date().toISOString();
          newMetadata.set(thread.session_id, {
            title,
            status: thread.is_archived ? "archived" : "regular",
            lastActiveAt: lastActive,
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
  }, [publicKey, backendApiRef]);
  const threadListAdapter = useMemo2(() => {
    const backendState = backendStateRef.current;
    const { regularThreads, archivedThreads } = buildThreadLists(
      threadContext.threadMetadata,
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
      threadContext.setThreadMetadata((prev) =>
        new Map(prev).set(threadId, {
          title: "New Chat",
          status: "pending",
          lastActiveAt: /* @__PURE__ */ new Date().toISOString(),
        }),
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
            (_a = backendState.creatingThreadId) != null
              ? _a
              : `temp-${crypto.randomUUID()}`,
          );
          return;
        }
        const tempId = `temp-${crypto.randomUUID()}`;
        preparePendingThread(tempId);
        const createPromise = backendApiRef.current
          .createThread(publicKey, void 0)
          .then(async (newThread) => {
            var _a2;
            const uiThreadId =
              (_a2 = backendState.creatingThreadId) != null ? _a2 : tempId;
            const backendId = newThread.session_id;
            setBackendMapping(backendState, uiThreadId, backendId);
            markSkipInitialFetch(backendState, uiThreadId);
            const backendTitle = newThread.title;
            if (backendTitle && !isPlaceholderTitle(backendTitle)) {
              threadContext.setThreadMetadata((prev) => {
                var _a3;
                const next = new Map(prev);
                const existing = next.get(uiThreadId);
                const nextStatus =
                  (existing == null ? void 0 : existing.status) === "archived"
                    ? "archived"
                    : "regular";
                next.set(uiThreadId, {
                  title: backendTitle,
                  status: nextStatus,
                  lastActiveAt:
                    (_a3 = existing == null ? void 0 : existing.lastActiveAt) !=
                    null
                      ? _a3
                      : /* @__PURE__ */ new Date().toISOString(),
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
          })
          .catch((error) => {
            var _a2;
            console.error("Failed to create new thread:", error);
            const failedId =
              (_a2 = backendState.creatingThreadId) != null ? _a2 : tempId;
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
          })
          .finally(() => {
            backendState.createThreadPromise = null;
          });
        backendState.createThreadPromise = createPromise;
      },
      onSwitchToThread: (threadId) => {
        threadContext.setCurrentThreadId(threadId);
      },
      onRename: async (threadId, newTitle) => {
        var _a, _b;
        const previousTitle =
          (_b =
            (_a = threadContext.getThreadMetadata(threadId)) == null
              ? void 0
              : _a.title) != null
            ? _b
            : "";
        const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
        threadContext.updateThreadMetadata(threadId, {
          title: normalizedTitle,
        });
        try {
          await backendApiRef.current.renameThread(threadId, newTitle);
        } catch (error) {
          console.error("Failed to rename thread:", error);
          threadContext.updateThreadMetadata(threadId, {
            title: previousTitle,
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
              threadContext.threadMetadata.entries(),
            ).find(
              ([id, meta]) => meta.status === "regular" && id !== threadId,
            );
            if (firstRegularThread) {
              threadContext.setCurrentThreadId(firstRegularThread[0]);
            } else {
              const defaultId = "default-session";
              threadContext.setThreadMetadata((prev) =>
                new Map(prev).set(defaultId, {
                  title: "New Chat",
                  status: "regular",
                  lastActiveAt: /* @__PURE__ */ new Date().toISOString(),
                }),
              );
              threadContext.setThreadMessages(defaultId, []);
              threadContext.setCurrentThreadId(defaultId);
            }
          }
        } catch (error) {
          console.error("Failed to delete thread:", error);
          throw error;
        }
      },
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
  ]);
  useEffect3(() => {
    const currentSessionId = threadContext.currentThreadId;
    const unsubscribe = backendApiRef.current.subscribeSSE(
      currentSessionId,
      (event) => {
        var _a;
        const eventType = event.type;
        const sessionId = event.session_id;
        if (eventType === "title_changed") {
          const newTitle = event.new_title;
          const backendState = backendStateRef.current;
          const targetThreadId =
            (_a = findTempIdForBackendId(backendState, sessionId)) != null
              ? _a
              : resolveThreadId(backendState, sessionId);
          const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
          threadContext.setThreadMetadata((prev) => {
            var _a2;
            const next = new Map(prev);
            const existing = next.get(targetThreadId);
            const nextStatus =
              (existing == null ? void 0 : existing.status) === "archived"
                ? "archived"
                : "regular";
            next.set(targetThreadId, {
              title: normalizedTitle,
              status: nextStatus,
              lastActiveAt:
                (_a2 = existing == null ? void 0 : existing.lastActiveAt) !=
                null
                  ? _a2
                  : /* @__PURE__ */ new Date().toISOString(),
            });
            return next;
          });
          if (
            !isPlaceholderTitle(newTitle) &&
            backendState.creatingThreadId === targetThreadId
          ) {
            backendState.creatingThreadId = null;
          }
        }
      },
    );
    return () => {
      unsubscribe == null ? void 0 : unsubscribe();
    };
  }, [
    backendApiRef,
    backendStateRef,
    threadContext,
    threadContext.currentThreadId,
  ]);
  useEffect3(() => {
    const threadId = threadContext.currentThreadId;
    if (!isTempThreadId(threadId)) return;
    if (!isThreadReady(backendStateRef.current, threadId)) return;
    void messageController.flushPendingChat(threadId);
  }, [messageController, backendStateRef, threadContext.currentThreadId]);
  const runtime = useExternalStoreRuntime({
    messages: currentMessages,
    setMessages: (msgs) =>
      threadContext.setThreadMessages(threadContext.currentThreadId, [...msgs]),
    isRunning,
    onNew: (message) =>
      messageController.outbound(message, threadContext.currentThreadId),
    onCancel: () => messageController.cancel(threadContext.currentThreadId),
    convertMessage: (msg) => msg,
    adapters: { threadList: threadListAdapter },
  });
  useEffect3(() => {
    return () => {
      polling.stopAll();
    };
  }, [polling]);
  return /* @__PURE__ */ jsx3(EventContextProvider, {
    backendApi: backendApiRef.current,
    sessionId: threadContext.currentThreadId,
    children: /* @__PURE__ */ jsx3(AssistantRuntimeProvider, {
      runtime,
      children,
    }),
  });
}

// src/handlers/wallet-handler.ts
import {
  useCallback as useCallback3,
  useEffect as useEffect4,
  useState as useState3,
} from "react";
function useWalletHandler({ sessionId, onTxRequest }) {
  const { subscribe: subscribe2, sendOutbound } = useEventContext();
  const [pendingTxRequests, setPendingTxRequests] = useState3([]);
  useEffect4(() => {
    const unsubscribe = subscribe2("wallet:tx_request", (event) => {
      const request = event.payload;
      setPendingTxRequests((prev) => [...prev, request]);
      onTxRequest == null ? void 0 : onTxRequest(request);
    });
    return unsubscribe;
  }, [subscribe2, onTxRequest]);
  const sendTxComplete = useCallback3(
    (tx) => {
      sendOutbound({
        type: "wallet:tx_complete",
        sessionId,
        payload: tx,
        priority: "high",
      });
    },
    [sendOutbound, sessionId],
  );
  const sendConnectionChange = useCallback3(
    (status, address) => {
      sendOutbound({
        type:
          status === "connected" ? "wallet:connected" : "wallet:disconnected",
        sessionId,
        payload: { status, address },
        priority: "normal",
      });
    },
    [sendOutbound, sessionId],
  );
  const clearTxRequest = useCallback3((index) => {
    setPendingTxRequests((prev) => prev.filter((_, i) => i !== index));
  }, []);
  return {
    sendTxComplete,
    sendConnectionChange,
    pendingTxRequests,
    clearTxRequest,
  };
}

// src/handlers/notification-handler.ts
import {
  useCallback as useCallback4,
  useEffect as useEffect5,
  useState as useState4,
} from "react";
var notificationIdCounter = 0;
function generateNotificationId() {
  return `notif-${Date.now()}-${++notificationIdCounter}`;
}
function useNotificationHandler({ onNotification } = {}) {
  const { subscribe: subscribe2 } = useEventContext();
  const [notifications, setNotifications] = useState4([]);
  useEffect5(() => {
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
        sessionId: event.sessionId,
      };
      setNotifications((prev) => [notification, ...prev]);
      onNotification == null ? void 0 : onNotification(notification);
    });
    return unsubscribe;
  }, [subscribe2, onNotification]);
  const unhandledCount = notifications.filter((n) => !n.handled).length;
  const markHandled = useCallback4((id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? __spreadProps(__spreadValues({}, n), { handled: true })
          : n,
      ),
    );
  }, []);
  return {
    notifications,
    unhandledCount,
    markDone: markHandled,
  };
}
export {
  AomiRuntimeProvider,
  BackendApi,
  EventContextProvider,
  useEventContext,
  useNotificationHandler,
  useWalletHandler,
};
//# sourceMappingURL=index.js.map
