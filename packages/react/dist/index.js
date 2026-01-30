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

// src/backend/sse.ts
function extractSseData(rawEvent) {
  const dataLines = rawEvent
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart());
  if (!dataLines.length) return null;
  return dataLines.join("\n");
}
async function readSseStream(stream, signal, onMessage) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r/g, "");
      let separatorIndex = buffer.indexOf("\n\n");
      while (separatorIndex >= 0) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        const data = extractSseData(rawEvent);
        if (data) {
          onMessage(data);
        }
        separatorIndex = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}
function createSseSubscriber({
  backendUrl,
  getHeaders,
  shouldLog = process.env.NODE_ENV !== "production",
}) {
  const subscriptions = /* @__PURE__ */ new Map();
  const subscribe2 = (sessionId, onUpdate, onError) => {
    const existing = subscriptions.get(sessionId);
    const listener = { onUpdate, onError };
    if (existing) {
      existing.listeners.add(listener);
      if (shouldLog) {
        console.debug("[aomi][sse] listener added", {
          sessionId,
          listeners: existing.listeners.size,
        });
      }
      return () => {
        existing.listeners.delete(listener);
        if (shouldLog) {
          console.debug("[aomi][sse] listener removed", {
            sessionId,
            listeners: existing.listeners.size,
          });
        }
        if (existing.listeners.size === 0) {
          existing.stop("unsubscribe");
          if (subscriptions.get(sessionId) === existing) {
            subscriptions.delete(sessionId);
          }
        }
      };
    }
    const subscription = {
      abortController: null,
      retries: 0,
      retryTimer: null,
      stopped: false,
      listeners: /* @__PURE__ */ new Set([listener]),
      stop: (reason) => {
        var _a;
        subscription.stopped = true;
        if (subscription.retryTimer) {
          clearTimeout(subscription.retryTimer);
          subscription.retryTimer = null;
        }
        (_a = subscription.abortController) == null ? void 0 : _a.abort();
        subscription.abortController = null;
        if (shouldLog) {
          console.debug("[aomi][sse] stop", {
            sessionId,
            reason,
            retries: subscription.retries,
          });
        }
      },
    };
    const scheduleRetry = () => {
      if (subscription.stopped) return;
      subscription.retries += 1;
      const delayMs = Math.min(500 * 2 ** (subscription.retries - 1), 1e4);
      if (shouldLog) {
        console.debug("[aomi][sse] retry scheduled", {
          sessionId,
          delayMs,
          retries: subscription.retries,
        });
      }
      subscription.retryTimer = setTimeout(() => {
        void open();
      }, delayMs);
    };
    const open = async () => {
      var _a;
      if (subscription.stopped) return;
      if (subscription.retryTimer) {
        clearTimeout(subscription.retryTimer);
        subscription.retryTimer = null;
      }
      const controller = new AbortController();
      subscription.abortController = controller;
      const openedAt = Date.now();
      try {
        const response = await fetch(`${backendUrl}/api/updates`, {
          headers: getHeaders(sessionId),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            `SSE HTTP ${response.status}: ${response.statusText}`,
          );
        }
        if (!response.body) {
          throw new Error("SSE response missing body");
        }
        subscription.retries = 0;
        await readSseStream(response.body, controller.signal, (data) => {
          var _a2, _b;
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (error) {
            for (const item of subscription.listeners) {
              (_a2 = item.onError) == null ? void 0 : _a2.call(item, error);
            }
            return;
          }
          for (const item of subscription.listeners) {
            try {
              item.onUpdate(parsed);
            } catch (error) {
              (_b = item.onError) == null ? void 0 : _b.call(item, error);
            }
          }
        });
        if (shouldLog) {
          console.debug("[aomi][sse] stream ended", {
            sessionId,
            aborted: controller.signal.aborted,
            stopped: subscription.stopped,
            durationMs: Date.now() - openedAt,
          });
        }
      } catch (error) {
        if (!controller.signal.aborted && !subscription.stopped) {
          for (const item of subscription.listeners) {
            (_a = item.onError) == null ? void 0 : _a.call(item, error);
          }
        }
      }
      if (!subscription.stopped) {
        scheduleRetry();
      }
    };
    subscriptions.set(sessionId, subscription);
    void open();
    return () => {
      subscription.listeners.delete(listener);
      if (shouldLog) {
        console.debug("[aomi][sse] listener removed", {
          sessionId,
          listeners: subscription.listeners.size,
        });
      }
      if (subscription.listeners.size === 0) {
        subscription.stop("unsubscribe");
        if (subscriptions.get(sessionId) === subscription) {
          subscriptions.delete(sessionId);
        }
      }
    };
  };
  return { subscribe: subscribe2 };
}

// src/backend/client.ts
var SESSION_ID_HEADER = "X-Session-Id";
function toQueryString(payload) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value === void 0 || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
function withSessionHeader(sessionId, init) {
  const headers = new Headers(init);
  headers.set(SESSION_ID_HEADER, sessionId);
  return headers;
}
async function postState(backendUrl, path, payload, sessionId) {
  const query = toQueryString(payload);
  const url = `${backendUrl}${path}${query}`;
  const response = await fetch(url, {
    method: "POST",
    headers: withSessionHeader(sessionId),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}
var BackendApi = class {
  constructor(backendUrl) {
    this.backendUrl = backendUrl;
    this.sseSubscriber = createSseSubscriber({
      backendUrl,
      getHeaders: (sessionId) =>
        withSessionHeader(sessionId, { Accept: "text/event-stream" }),
    });
  }
  async fetchState(sessionId, userState) {
    const url = new URL("/api/state", this.backendUrl);
    if (userState) {
      url.searchParams.set("user_state", JSON.stringify(userState));
    }
    const response = await fetch(url.toString(), {
      headers: withSessionHeader(sessionId),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }
  async postChatMessage(sessionId, message, publicKey) {
    return postState(
      this.backendUrl,
      "/api/chat",
      {
        message,
        public_key: publicKey,
      },
      sessionId,
    );
  }
  async postSystemMessage(sessionId, message) {
    return postState(
      this.backendUrl,
      "/api/system",
      {
        message,
      },
      sessionId,
    );
  }
  async postInterrupt(sessionId) {
    return postState(this.backendUrl, "/api/interrupt", {}, sessionId);
  }
  /**
   * Subscribe to SSE updates for a session.
   * Uses fetch streaming and reconnects on disconnects.
   * Returns an unsubscribe function.
   */
  subscribeSSE(sessionId, onUpdate, onError) {
    return this.sseSubscriber.subscribe(sessionId, onUpdate, onError);
  }
  async fetchThreads(publicKey) {
    const url = `${this.backendUrl}/api/sessions?public_key=${encodeURIComponent(publicKey)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch threads: HTTP ${response.status}`);
    }
    return await response.json();
  }
  async fetchThread(sessionId) {
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    const response = await fetch(url, {
      headers: withSessionHeader(sessionId),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }
  async createThread(threadId, publicKey) {
    const body = {};
    if (publicKey) body.public_key = publicKey;
    const url = `${this.backendUrl}/api/sessions`;
    const response = await fetch(url, {
      method: "POST",
      headers: withSessionHeader(threadId, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Failed to create thread: HTTP ${response.status}`);
    }
    return await response.json();
  }
  async archiveThread(sessionId) {
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/archive`;
    const response = await fetch(url, {
      method: "POST",
      headers: withSessionHeader(sessionId),
    });
    if (!response.ok) {
      throw new Error(`Failed to archive thread: HTTP ${response.status}`);
    }
  }
  async unarchiveThread(sessionId) {
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/unarchive`;
    const response = await fetch(url, {
      method: "POST",
      headers: withSessionHeader(sessionId),
    });
    if (!response.ok) {
      throw new Error(`Failed to unarchive thread: HTTP ${response.status}`);
    }
  }
  async deleteThread(sessionId) {
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: withSessionHeader(sessionId),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete thread: HTTP ${response.status}`);
    }
  }
  async renameThread(sessionId, newTitle) {
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: withSessionHeader(sessionId, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ title: newTitle }),
    });
    if (!response.ok) {
      throw new Error(`Failed to rename thread: HTTP ${response.status}`);
    }
  }
  async getSystemEvents(sessionId, count) {
    const url = new URL("/api/events", this.backendUrl);
    if (count !== void 0) {
      url.searchParams.set("count", String(count));
    }
    const response = await fetch(url.toString(), {
      headers: withSessionHeader(sessionId),
    });
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Failed to get system events: HTTP ${response.status}`);
    }
    return await response.json();
  }
  // fetchEventsAfter removed: /api/events only supports count now
};

// src/runtime/aomi-runtime.tsx
import { useMemo as useMemo3 } from "react";

// src/contexts/control-context.tsx
import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
} from "react";
import { jsx } from "react/jsx-runtime";
var API_KEY_STORAGE_KEY = "aomi_api_key";
var ControlContext = createContext(null);
function useControl() {
  const ctx = useContext(ControlContext);
  if (!ctx) {
    throw new Error("useControl must be used within ControlContextProvider");
  }
  return ctx;
}
function ControlContextProvider({
  children,
  initialModels = [],
  initialNamespaces = [],
  defaultModelId,
  defaultNamespace,
}) {
  const [state, setState] = useState(() => ({
    modelId: defaultModelId != null ? defaultModelId : null,
    availableModels: initialModels,
    namespace: defaultNamespace != null ? defaultNamespace : null,
    availableNamespaces: initialNamespaces,
    apiKey:
      typeof window !== "undefined"
        ? localStorage.getItem(API_KEY_STORAGE_KEY)
        : null,
  }));
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (state.apiKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, state.apiKey);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }, [state.apiKey]);
  const setModelId = useCallback((id) => {
    setState((prev) =>
      __spreadProps(__spreadValues({}, prev), { modelId: id }),
    );
  }, []);
  const setAvailableModels = useCallback((models) => {
    setState((prev) =>
      __spreadProps(__spreadValues({}, prev), { availableModels: models }),
    );
  }, []);
  const setNamespace = useCallback((ns) => {
    setState((prev) =>
      __spreadProps(__spreadValues({}, prev), { namespace: ns }),
    );
  }, []);
  const setAvailableNamespaces = useCallback((namespaces) => {
    setState((prev) =>
      __spreadProps(__spreadValues({}, prev), {
        availableNamespaces: namespaces,
      }),
    );
  }, []);
  const setApiKey = useCallback((key) => {
    setState((prev) =>
      __spreadProps(__spreadValues({}, prev), { apiKey: key }),
    );
  }, []);
  const clearApiKey = useCallback(() => {
    setState((prev) =>
      __spreadProps(__spreadValues({}, prev), { apiKey: null }),
    );
  }, []);
  return /* @__PURE__ */ jsx(ControlContext.Provider, {
    value: {
      state,
      setModelId,
      setAvailableModels,
      setNamespace,
      setAvailableNamespaces,
      setApiKey,
      clearApiKey,
    },
    children,
  });
}

// src/contexts/event-context.tsx
import {
  createContext as createContext2,
  useCallback as useCallback2,
  useContext as useContext2,
  useEffect as useEffect2,
  useRef,
  useState as useState2,
} from "react";

// src/backend/types.ts
function isInlineCall(event) {
  return "InlineCall" in event;
}
function isSystemNotice(event) {
  return "SystemNotice" in event;
}
function isSystemError(event) {
  return "SystemError" in event;
}
function isAsyncCallback(event) {
  return "AsyncCallback" in event;
}

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
import { jsx as jsx2 } from "react/jsx-runtime";
var EventContextState = createContext2(null);
function useEventContext() {
  const context = useContext2(EventContextState);
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
  const [sseStatus, setSseStatus] = useState2("disconnected");
  useEffect2(() => {
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
  }, [backendApi, sessionId, buffer]);
  const subscribeCallback = useCallback2(
    (type, callback) => {
      return subscribe(buffer, type, callback);
    },
    [buffer],
  );
  const sendOutbound = useCallback2(
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
  const dispatchSystemEvents = useCallback2(
    (sessionId2, events) => {
      var _a;
      for (const event of events) {
        let eventType;
        let payload;
        if (isInlineCall(event)) {
          eventType = event.InlineCall.type;
          payload =
            (_a = event.InlineCall.payload) != null ? _a : event.InlineCall;
        } else if (isSystemNotice(event)) {
          eventType = "system_notice";
          payload = { message: event.SystemNotice };
        } else if (isSystemError(event)) {
          eventType = "system_error";
          payload = { message: event.SystemError };
        } else if (isAsyncCallback(event)) {
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
          timestamp: Date.now(),
        };
        enqueueInbound(buffer, {
          type: eventType,
          sessionId: sessionId2,
          payload,
        });
        dispatch(buffer, inboundEvent);
      }
    },
    [buffer],
  );
  const contextValue = {
    subscribe: subscribeCallback,
    sendOutboundSystem: sendOutbound,
    dispatchInboundSystem: dispatchSystemEvents,
    sseStatus,
  };
  return /* @__PURE__ */ jsx2(EventContextState.Provider, {
    value: contextValue,
    children,
  });
}

// src/contexts/notification-context.tsx
import {
  createContext as createContext3,
  useCallback as useCallback3,
  useContext as useContext3,
  useState as useState3,
} from "react";
import { jsx as jsx3 } from "react/jsx-runtime";
var NotificationContext = createContext3(null);
function useNotification() {
  const context = useContext3(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within NotificationContextProvider",
    );
  }
  return context;
}
var notificationIdCounter = 0;
function generateId() {
  return `notif-${Date.now()}-${++notificationIdCounter}`;
}
function NotificationContextProvider({ children }) {
  const [notifications, setNotifications] = useState3([]);
  const showNotification = useCallback3((params) => {
    const id = generateId();
    const notification = __spreadProps(__spreadValues({}, params), {
      id,
      timestamp: Date.now(),
    });
    setNotifications((prev) => [notification, ...prev]);
    return id;
  }, []);
  const dismissNotification = useCallback3((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);
  const clearAll = useCallback3(() => {
    setNotifications([]);
  }, []);
  const value = {
    notifications,
    showNotification,
    dismissNotification,
    clearAll,
  };
  return /* @__PURE__ */ jsx3(NotificationContext.Provider, {
    value,
    children,
  });
}

// src/contexts/thread-context.tsx
import {
  createContext as createContext4,
  useContext as useContext4,
  useMemo,
  useRef as useRef2,
  useSyncExternalStore,
} from "react";

// src/state/thread-store.ts
var shouldLogThreadUpdates = process.env.NODE_ENV !== "production";
var logThreadMetadataChange = (source, threadId, prev, next) => {
  if (!shouldLogThreadUpdates) return;
  if (!prev && !next) return;
  if (!prev || !next) {
    console.debug(`[aomi][thread:${source}]`, { threadId, prev, next });
    return;
  }
  if (
    prev.title !== next.title ||
    prev.status !== next.status ||
    prev.lastActiveAt !== next.lastActiveAt
  ) {
    console.debug(`[aomi][thread:${source}]`, { threadId, prev, next });
  }
};
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
          next,
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
    const initialThreadId =
      (_a = options == null ? void 0 : options.initialThreadId) != null
        ? _a
        : crypto.randomUUID();
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
            lastActiveAt: /* @__PURE__ */ new Date().toISOString(),
          },
        ],
      ]),
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
        lastActiveAt: /* @__PURE__ */ new Date().toISOString(),
      });
      this.state = __spreadProps(__spreadValues({}, this.state), {
        threadMetadata: nextMetadata,
      });
    }
    if (!this.state.threads.has(threadId)) {
      const nextThreads = new Map(this.state.threads);
      nextThreads.set(threadId, []);
      this.state = __spreadProps(__spreadValues({}, this.state), {
        threads: nextThreads,
      });
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
    };
  }
};

// src/contexts/thread-context.tsx
import { jsx as jsx4 } from "react/jsx-runtime";
var ThreadContextState = createContext4(null);
function useThreadContext() {
  const context = useContext4(ThreadContextState);
  if (!context) {
    throw new Error(
      "useThreadContext must be used within ThreadContextProvider. Wrap your app with <ThreadContextProvider>...</ThreadContextProvider>",
    );
  }
  return context;
}
function ThreadContextProvider({ children, initialThreadId }) {
  const storeRef = useRef2(null);
  if (!storeRef.current) {
    storeRef.current = new ThreadStore({ initialThreadId });
  }
  const store = storeRef.current;
  const value = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  return /* @__PURE__ */ jsx4(ThreadContextState.Provider, { value, children });
}
function useCurrentThreadMessages() {
  const { currentThreadId, getThreadMessages } = useThreadContext();
  return useMemo(
    () => getThreadMessages(currentThreadId),
    [currentThreadId, getThreadMessages],
  );
}
function useCurrentThreadMetadata() {
  const { currentThreadId, getThreadMetadata } = useThreadContext();
  return useMemo(
    () => getThreadMetadata(currentThreadId),
    [currentThreadId, getThreadMetadata],
  );
}

// src/contexts/user-context.tsx
import {
  createContext as createContext5,
  useCallback as useCallback4,
  useContext as useContext5,
  useRef as useRef3,
  useState as useState4,
} from "react";
import { jsx as jsx5 } from "react/jsx-runtime";
var UserContext = createContext5(void 0);
function useUser() {
  const context = useContext5(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserContextProvider");
  }
  return {
    user: context.user,
    setUser: context.setUser,
    getUserState: context.getUserState,
    onUserStateChange: context.onUserStateChange,
  };
}
function UserContextProvider({ children }) {
  const [user, setUserState] = useState4({
    isConnected: false,
    address: void 0,
    chainId: void 0,
    ensName: void 0,
  });
  const userRef = useRef3(user);
  userRef.current = user;
  const StateChangeCallbacks = useRef3(/* @__PURE__ */ new Set());
  const setUser = useCallback4((data) => {
    setUserState((prev) => {
      const next = __spreadValues(__spreadValues({}, prev), data);
      StateChangeCallbacks.current.forEach((callback) => {
        callback(next);
      });
      return next;
    });
  }, []);
  const getUserState = useCallback4(() => userRef.current, []);
  const onUserStateChange = useCallback4((callback) => {
    StateChangeCallbacks.current.add(callback);
    return () => {
      StateChangeCallbacks.current.delete(callback);
    };
  }, []);
  return /* @__PURE__ */ jsx5(UserContext.Provider, {
    value: {
      user,
      setUser,
      getUserState,
      onUserStateChange,
    },
    children,
  });
}

// src/runtime/core.tsx
import {
  useCallback as useCallback6,
  useEffect as useEffect3,
  useMemo as useMemo2,
  useRef as useRef5,
} from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/react";

// src/runtime/orchestrator.ts
import {
  useCallback as useCallback5,
  useRef as useRef4,
  useState as useState5,
} from "react";

// src/runtime/utils.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
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
var formatAddress = (addr) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Connect Wallet";

// src/state/backend-state.ts
function createBackendState() {
  return {
    skipInitialFetch: /* @__PURE__ */ new Set(),
    pendingChat: /* @__PURE__ */ new Map(),
    runningThreads: /* @__PURE__ */ new Set(),
    creatingThreadId: null,
    createThreadPromise: null,
  };
}
function resolveThreadId(state, threadId) {
  return threadId;
}
function isThreadReady(state, threadId) {
  return state.creatingThreadId !== threadId;
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
    var _a, _b, _c;
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
      if (
        ((_c = response == null ? void 0 : response.system_events) == null
          ? void 0
          : _c.length) &&
        this.config.onSyncEvents
      ) {
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
    var _a;
    const backendState = this.config.backendStateRef.current;
    if (!isThreadReady(backendState, threadId)) return;
    this.config.polling.stop(threadId);
    const backendThreadId = resolveThreadId(backendState, threadId);
    try {
      const response =
        await this.config.backendApiRef.current.postInterrupt(backendThreadId);
      if (response == null ? void 0 : response.messages) {
        this.inbound(threadId, response.messages);
      }
      if (
        ((_a = response == null ? void 0 : response.system_events) == null
          ? void 0
          : _a.length) &&
        this.config.onSyncEvents
      ) {
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
  }
  start(threadId) {
    var _a, _b;
    const backendState = this.config.backendStateRef.current;
    if (!isThreadReady(backendState, threadId)) return;
    if (this.intervals.has(threadId)) return;
    const backendThreadId = resolveThreadId(backendState, threadId);
    setThreadRunning(backendState, threadId, true);
    const tick = async () => {
      var _a2, _b2;
      if (!this.intervals.has(threadId)) return;
      try {
        console.log(
          "[PollingController] Fetching state for threadId:",
          threadId,
        );
        const userState =
          (_b2 = (_a2 = this.config).getUserState) == null
            ? void 0
            : _b2.call(_a2);
        const state = await this.config.backendApiRef.current.fetchState(
          backendThreadId,
          userState,
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
    if (
      ((_a = state.system_events) == null ? void 0 : _a.length) &&
      this.config.onSyncEvents
    ) {
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

// src/runtime/orchestrator.ts
function useRuntimeOrchestrator(backendApi, options) {
  const threadContext = useThreadContext();
  const threadContextRef = useRef4(threadContext);
  threadContextRef.current = threadContext;
  const backendApiRef = useRef4(backendApi);
  backendApiRef.current = backendApi;
  const backendStateRef = useRef4(createBackendState());
  const [isRunning, setIsRunning] = useState5(false);
  const messageControllerRef = useRef4(null);
  const pollingRef = useRef4(null);
  const pendingFetches = useRef4(/* @__PURE__ */ new Set());
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
      onSyncEvents: options == null ? void 0 : options.onSyncEvents,
      getUserState: options == null ? void 0 : options.getUserState,
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
      onSyncEvents: options == null ? void 0 : options.onSyncEvents,
    });
  }
  const ensureInitialState = useCallback5(async (threadId) => {
    var _a, _b, _c, _d;
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
    if (pendingFetches.current.has(threadId)) return;
    const backendThreadId = resolveThreadId(backendState, threadId);
    pendingFetches.current.add(threadId);
    try {
      const userState =
        (_a = options == null ? void 0 : options.getUserState) == null
          ? void 0
          : _a.call(options);
      const state = await backendApiRef.current.fetchState(
        backendThreadId,
        userState,
      );
      (_b = messageControllerRef.current) == null
        ? void 0
        : _b.inbound(threadId, state.messages);
      if (
        ((_c = state.system_events) == null ? void 0 : _c.length) &&
        (options == null ? void 0 : options.onSyncEvents)
      ) {
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
    backendApiRef,
  };
}

// src/runtime/threadlist-adapter.ts
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
    .filter(([, meta]) => meta.status !== "archived")
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
function buildThreadListAdapter({
  backendStateRef,
  backendApiRef,
  threadContext,
  currentThreadIdRef,
  polling,
  userAddress,
  setIsRunning,
}) {
  const backendState = backendStateRef.current;
  const { regularThreads, archivedThreads } = buildThreadLists(
    threadContext.allThreadsMetadata,
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
    for (const [id, meta] of threadContext.allThreadsMetadata.entries()) {
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
            : crypto.randomUUID(),
        );
        return;
      }
      const threadId = crypto.randomUUID();
      preparePendingThread(threadId);
      const createPromise = backendApiRef.current
        .createThread(threadId, userAddress)
        .then(async (newThread) => {
          var _a2;
          const uiThreadId =
            (_a2 = backendState.creatingThreadId) != null ? _a2 : threadId;
          const backendId = newThread.session_id;
          if (uiThreadId !== backendId) {
            console.warn("[aomi][thread] backend id mismatch", {
              uiThreadId,
              backendId,
            });
          }
          markSkipInitialFetch(backendState, uiThreadId);
          threadContext.setThreadMetadata((prev) => {
            var _a3, _b;
            const next = new Map(prev);
            const existing = next.get(uiThreadId);
            const nextStatus =
              (existing == null ? void 0 : existing.status) === "archived"
                ? "archived"
                : "regular";
            next.set(uiThreadId, {
              title:
                (_a3 = existing == null ? void 0 : existing.title) != null
                  ? _a3
                  : "New Chat",
              status: nextStatus,
              lastActiveAt:
                (_b = existing == null ? void 0 : existing.lastActiveAt) != null
                  ? _b
                  : /* @__PURE__ */ new Date().toISOString(),
            });
            return next;
          });
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
            (_a2 = backendState.creatingThreadId) != null ? _a2 : threadId;
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
        backendState.skipInitialFetch.delete(threadId);
        backendState.runningThreads.delete(threadId);
        if (backendState.creatingThreadId === threadId) {
          backendState.creatingThreadId = null;
        }
        if (threadContext.currentThreadId === threadId) {
          const firstRegularThread = Array.from(
            threadContext.allThreadsMetadata.entries(),
          ).find(([id, meta]) => meta.status === "regular" && id !== threadId);
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
}

// src/interface.tsx
import {
  createContext as createContext6,
  useContext as useContext6,
} from "react";
var AomiRuntimeContext = createContext6(null);
var AomiRuntimeApiProvider = AomiRuntimeContext.Provider;
function useAomiRuntime() {
  const context = useContext6(AomiRuntimeContext);
  if (!context) {
    throw new Error(
      "useAomiRuntime must be used within AomiRuntimeProvider. Wrap your app with <AomiRuntimeProvider>...</AomiRuntimeProvider>",
    );
  }
  return context;
}

// src/runtime/core.tsx
import { jsx as jsx6 } from "react/jsx-runtime";
function AomiRuntimeCore({ children, backendApi }) {
  const threadContext = useThreadContext();
  const eventContext = useEventContext();
  const notificationContext = useNotification();
  const { dispatchInboundSystem: dispatchSystemEvents } = eventContext;
  const { user, onUserStateChange, getUserState } = useUser();
  const {
    backendStateRef,
    polling,
    messageController,
    isRunning,
    setIsRunning,
    ensureInitialState,
    backendApiRef,
  } = useRuntimeOrchestrator(backendApi, {
    onSyncEvents: dispatchSystemEvents,
    getPublicKey: () => getUserState().address,
    getUserState,
  });
  useEffect3(() => {
    const unsubscribe = onUserStateChange(async (newUser) => {
      const sessionId = threadContext.currentThreadId;
      const message = JSON.stringify({
        type: "wallet:state_changed",
        payload: {
          address: newUser.address,
          chainId: newUser.chainId,
          isConnected: newUser.isConnected,
          ensName: newUser.ensName,
        },
      });
      await backendApiRef.current.postSystemMessage(sessionId, message);
    });
    return unsubscribe;
  }, [onUserStateChange, backendApiRef, threadContext.currentThreadId]);
  const threadContextRef = useRef5(threadContext);
  threadContextRef.current = threadContext;
  const currentThreadIdRef = useRef5(threadContext.currentThreadId);
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
  const resolvedSessionId = useMemo2(
    () =>
      resolveThreadId(backendStateRef.current, threadContext.currentThreadId),
    [
      backendStateRef,
      threadContext.currentThreadId,
      threadContext.allThreadsMetadata,
    ],
  );
  useEffect3(() => {
    const userAddress = user.address;
    if (!userAddress) return;
    const fetchThreadList = async () => {
      var _a, _b;
      try {
        const threadList =
          await backendApiRef.current.fetchThreads(userAddress);
        const currentContext = threadContextRef.current;
        const newMetadata = new Map(currentContext.allThreadsMetadata);
        let maxChatNum = currentContext.threadCnt;
        for (const thread of threadList) {
          const rawTitle = (_a = thread.title) != null ? _a : "";
          const title = isPlaceholderTitle(rawTitle) ? "" : rawTitle;
          const lastActive =
            ((_b = newMetadata.get(thread.session_id)) == null
              ? void 0
              : _b.lastActiveAt) || /* @__PURE__ */ new Date().toISOString();
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
  }, [user.address, backendApiRef]);
  const threadListAdapter = useMemo2(
    () =>
      buildThreadListAdapter({
        backendStateRef,
        backendApiRef,
        threadContext,
        currentThreadIdRef,
        polling,
        userAddress: user.address,
        setIsRunning,
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
    ],
  );
  useEffect3(() => {
    const backendState = backendStateRef.current;
    const currentSessionId = threadContext.currentThreadId;
    if (process.env.NODE_ENV !== "production") {
      console.debug("[aomi][sse] subscribe", {
        currentSessionId,
        resolvedSessionId,
        hasMapping: currentSessionId !== resolvedSessionId,
      });
    }
    const unsubscribe = backendApiRef.current.subscribeSSE(
      resolvedSessionId,
      (event) => {
        const eventType = event.type;
        const sessionId = event.session_id;
        if (eventType === "title_changed") {
          const newTitle = event.new_title;
          const targetThreadId = resolveThreadId(backendState, sessionId);
          const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
          if (process.env.NODE_ENV !== "production") {
            console.debug("[aomi][sse] title_changed", {
              sessionId,
              newTitle,
              normalizedTitle,
              currentThreadId: threadContextRef.current.currentThreadId,
              targetThreadId,
              hasMapping: sessionId !== targetThreadId,
              creatingThreadId: backendState.creatingThreadId,
            });
          }
          threadContextRef.current.setThreadMetadata((prev) => {
            var _a;
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
                (_a = existing == null ? void 0 : existing.lastActiveAt) != null
                  ? _a
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
    threadContext.currentThreadId,
    resolvedSessionId,
  ]);
  useEffect3(() => {
    const threadId = threadContext.currentThreadId;
    if (!isThreadReady(backendStateRef.current, threadId)) return;
    void messageController.flushPendingChat(threadId);
  }, [messageController, backendStateRef, threadContext.currentThreadId]);
  useEffect3(() => {
    const showToolNotification = (eventType) => (event) => {
      const payload = event.payload;
      const toolName =
        typeof (payload == null ? void 0 : payload.tool_name) === "string"
          ? payload.tool_name
          : void 0;
      const title = toolName
        ? `${eventType === "tool_update" ? "Tool update" : "Tool complete"}: ${toolName}`
        : eventType === "tool_update"
          ? "Tool update"
          : "Tool complete";
      const message =
        typeof (payload == null ? void 0 : payload.message) === "string"
          ? payload.message
          : typeof (payload == null ? void 0 : payload.result) === "string"
            ? payload.result
            : void 0;
      notificationContext.showNotification({
        type: "notice",
        title,
        message,
      });
    };
    const unsubscribeUpdate = eventContext.subscribe(
      "tool_update",
      showToolNotification("tool_update"),
    );
    const unsubscribeComplete = eventContext.subscribe(
      "tool_complete",
      showToolNotification("tool_complete"),
    );
    return () => {
      unsubscribeUpdate();
      unsubscribeComplete();
    };
  }, [eventContext, notificationContext]);
  useEffect3(() => {
    const unsubscribe = eventContext.subscribe("system_notice", (event) => {
      const payload = event.payload;
      const message = payload == null ? void 0 : payload.message;
      notificationContext.showNotification({
        type: "notice",
        title: "System notice",
        message,
      });
    });
    return unsubscribe;
  }, [eventContext, notificationContext]);
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
  const userContext = useUser();
  const sendMessage = useCallback6(
    async (text) => {
      const appendMessage = {
        role: "user",
        content: [{ type: "text", text }],
      };
      await messageController.outbound(
        appendMessage,
        threadContext.currentThreadId,
      );
    },
    [messageController, threadContext.currentThreadId],
  );
  const cancelGeneration = useCallback6(() => {
    messageController.cancel(threadContext.currentThreadId);
  }, [messageController, threadContext.currentThreadId]);
  const getMessages = useCallback6(
    (threadId) => {
      const id = threadId != null ? threadId : threadContext.currentThreadId;
      return threadContext.getThreadMessages(id);
    },
    [threadContext],
  );
  const createThread = useCallback6(async () => {
    await threadListAdapter.onSwitchToNewThread();
    return threadContextRef.current.currentThreadId;
  }, [threadListAdapter]);
  const deleteThread = useCallback6(
    async (threadId) => {
      await threadListAdapter.onDelete(threadId);
    },
    [threadListAdapter],
  );
  const renameThread = useCallback6(
    async (threadId, title) => {
      await threadListAdapter.onRename(threadId, title);
    },
    [threadListAdapter],
  );
  const archiveThread = useCallback6(
    async (threadId) => {
      await threadListAdapter.onArchive(threadId);
    },
    [threadListAdapter],
  );
  const selectThread = useCallback6(
    (threadId) => {
      if (threadContext.allThreadsMetadata.has(threadId)) {
        threadListAdapter.onSwitchToThread(threadId);
      } else {
        void threadListAdapter.onSwitchToNewThread();
      }
    },
    [threadContext.allThreadsMetadata, threadListAdapter],
  );
  const aomiRuntimeApi = useMemo2(
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
      // Event API
      subscribe: eventContext.subscribe,
      sendSystemCommand: eventContext.sendOutboundSystem,
      sseStatus: eventContext.sseStatus,
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
      eventContext,
    ],
  );
  return /* @__PURE__ */ jsx6(AomiRuntimeApiProvider, {
    value: aomiRuntimeApi,
    children: /* @__PURE__ */ jsx6(AssistantRuntimeProvider, {
      runtime,
      children,
    }),
  });
}

// src/runtime/aomi-runtime.tsx
import { jsx as jsx7 } from "react/jsx-runtime";
function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  initialModels,
  initialNamespaces,
  defaultModelId,
  defaultNamespace,
}) {
  const backendApi = useMemo3(() => new BackendApi(backendUrl), [backendUrl]);
  return /* @__PURE__ */ jsx7(ThreadContextProvider, {
    children: /* @__PURE__ */ jsx7(NotificationContextProvider, {
      children: /* @__PURE__ */ jsx7(UserContextProvider, {
        children: /* @__PURE__ */ jsx7(ControlContextProvider, {
          initialModels,
          initialNamespaces,
          defaultModelId,
          defaultNamespace,
          children: /* @__PURE__ */ jsx7(AomiRuntimeInner, {
            backendApi,
            children,
          }),
        }),
      }),
    }),
  });
}
function AomiRuntimeInner({ children, backendApi }) {
  const threadContext = useThreadContext();
  return /* @__PURE__ */ jsx7(EventContextProvider, {
    backendApi,
    sessionId: threadContext.currentThreadId,
    children: /* @__PURE__ */ jsx7(AomiRuntimeCore, { backendApi, children }),
  });
}

// src/handlers/wallet-handler.ts
import {
  useCallback as useCallback7,
  useEffect as useEffect4,
  useState as useState6,
} from "react";
function useWalletHandler({ sessionId, onTxRequest }) {
  const { subscribe: subscribe2, sendOutboundSystem: sendOutbound } =
    useEventContext();
  const { setUser, getUserState } = useUser();
  const [pendingTxRequests, setPendingTxRequests] = useState6([]);
  useEffect4(() => {
    const unsubscribe = subscribe2("wallet_tx_request", (event) => {
      const request = event.payload;
      setPendingTxRequests((prev) => [...prev, request]);
      onTxRequest == null ? void 0 : onTxRequest(request);
    });
    return unsubscribe;
  }, [subscribe2, onTxRequest]);
  useEffect4(() => {
    const unsubscribe = subscribe2("user_state_request", (event) => {
      sendOutbound({
        type: "user_state_response",
        sessionId,
        payload: getUserState(),
      });
    });
    return unsubscribe;
  }, [subscribe2, onTxRequest]);
  const sendTxComplete = useCallback7(
    (tx) => {
      sendOutbound({
        type: "wallet:tx_complete",
        sessionId,
        payload: tx,
      });
    },
    [sendOutbound, sessionId],
  );
  const sendConnectionChange = useCallback7(
    (status, address, chainId) => {
      if (status === "connected") {
        setUser({
          isConnected: true,
          address,
          chainId,
        });
      } else {
        setUser({
          isConnected: false,
          address: void 0,
          chainId: void 0,
        });
      }
      sendOutbound({
        type:
          status === "connected" ? "wallet:connected" : "wallet:disconnected",
        sessionId,
        payload: { status, address },
      });
    },
    [setUser, sendOutbound, sessionId],
  );
  const clearTxRequest = useCallback7((index) => {
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
  useCallback as useCallback8,
  useEffect as useEffect5,
  useState as useState7,
} from "react";
var notificationIdCounter2 = 0;
function generateNotificationId() {
  return `notif-${Date.now()}-${++notificationIdCounter2}`;
}
function useNotificationHandler({ onNotification } = {}) {
  const { subscribe: subscribe2 } = useEventContext();
  const [notifications, setNotifications] = useState7([]);
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
  const markHandled = useCallback8((id) => {
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

// src/components/wallet-button.tsx
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useEffect as useEffect6 } from "react";
import { jsx as jsx8 } from "react/jsx-runtime";
var WalletButton = ({
  className,
  connectLabel = "Connect Wallet",
  onConnectionChange,
}) => {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { setUser } = useUser();
  useEffect6(() => {
    setUser({
      address: address != null ? address : void 0,
      chainId: chainId != null ? chainId : void 0,
      isConnected,
    });
    onConnectionChange == null ? void 0 : onConnectionChange(isConnected);
  }, [address, chainId, isConnected, setUser, onConnectionChange]);
  const handleClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      }
    }
  };
  return /* @__PURE__ */ jsx8("button", {
    type: "button",
    onClick: handleClick,
    className,
    "aria-label": isConnected ? "Disconnect wallet" : "Connect wallet",
    children: isConnected && address ? formatAddress(address) : connectLabel,
  });
};
export {
  AomiRuntimeProvider,
  BackendApi,
  ControlContextProvider,
  EventContextProvider,
  NotificationContextProvider,
  ThreadContextProvider,
  UserContextProvider,
  WalletButton,
  cn,
  formatAddress,
  getNetworkName,
  useAomiRuntime,
  useControl,
  useCurrentThreadMessages,
  useCurrentThreadMetadata,
  useEventContext,
  useNotification,
  useNotificationHandler,
  useThreadContext,
  useUser,
  useWalletHandler,
};
//# sourceMappingURL=index.js.map
