#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
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
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/cli/errors.ts
function fatal(message) {
  const RED = "\x1B[31m";
  const DIM2 = "\x1B[2m";
  const RESET2 = "\x1B[0m";
  const lines = message.split("\n");
  const [headline, ...details] = lines;
  console.error(`${RED}\u274C ${headline}${RESET2}`);
  for (const detail of details) {
    if (!detail.trim()) {
      console.error("");
      continue;
    }
    console.error(`${DIM2}${detail}${RESET2}`);
  }
  throw new CliExit(1);
}
var CliExit;
var init_errors = __esm({
  "src/cli/errors.ts"() {
    "use strict";
    CliExit = class extends Error {
      constructor(code) {
        super();
        this.code = code;
      }
    };
  }
});

// src/chains.ts
import { mainnet, polygon, arbitrum, optimism, base, sepolia } from "viem/chains";
var SUPPORTED_CHAIN_IDS, CHAIN_NAMES, ALCHEMY_CHAIN_SLUGS, CHAINS_BY_ID;
var init_chains = __esm({
  "src/chains.ts"() {
    "use strict";
    SUPPORTED_CHAIN_IDS = [1, 137, 42161, 8453, 10, 11155111];
    CHAIN_NAMES = {
      1: "Ethereum",
      137: "Polygon",
      42161: "Arbitrum One",
      8453: "Base",
      10: "Optimism",
      11155111: "Sepolia"
    };
    ALCHEMY_CHAIN_SLUGS = {
      1: "eth-mainnet",
      137: "polygon-mainnet",
      42161: "arb-mainnet",
      8453: "base-mainnet",
      10: "opt-mainnet",
      11155111: "eth-sepolia"
    };
    CHAINS_BY_ID = {
      1: mainnet,
      137: polygon,
      42161: arbitrum,
      10: optimism,
      8453: base,
      11155111: sepolia
    };
  }
});

// src/sse.ts
function extractSseData(rawEvent) {
  const dataLines = rawEvent.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart());
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
  logger
}) {
  const subscriptions = /* @__PURE__ */ new Map();
  const subscribe = (sessionId, onUpdate, onError) => {
    const existing = subscriptions.get(sessionId);
    const listener = { onUpdate, onError };
    if (existing) {
      existing.listeners.add(listener);
      logger == null ? void 0 : logger.debug("[aomi][sse] listener added", {
        sessionId,
        listeners: existing.listeners.size
      });
      return () => {
        existing.listeners.delete(listener);
        logger == null ? void 0 : logger.debug("[aomi][sse] listener removed", {
          sessionId,
          listeners: existing.listeners.size
        });
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
        var _a3;
        subscription.stopped = true;
        if (subscription.retryTimer) {
          clearTimeout(subscription.retryTimer);
          subscription.retryTimer = null;
        }
        (_a3 = subscription.abortController) == null ? void 0 : _a3.abort();
        subscription.abortController = null;
        logger == null ? void 0 : logger.debug("[aomi][sse] stop", {
          sessionId,
          reason,
          retries: subscription.retries
        });
      }
    };
    const scheduleRetry = () => {
      if (subscription.stopped) return;
      subscription.retries += 1;
      const delayMs = Math.min(500 * 2 ** (subscription.retries - 1), 1e4);
      logger == null ? void 0 : logger.debug("[aomi][sse] retry scheduled", {
        sessionId,
        delayMs,
        retries: subscription.retries
      });
      subscription.retryTimer = setTimeout(() => {
        void open();
      }, delayMs);
    };
    const open = async () => {
      var _a3;
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
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error(
            `SSE HTTP ${response.status}: ${response.statusText}`
          );
        }
        if (!response.body) {
          throw new Error("SSE response missing body");
        }
        subscription.retries = 0;
        await readSseStream(response.body, controller.signal, (data) => {
          var _a4, _b;
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (error) {
            for (const item of subscription.listeners) {
              (_a4 = item.onError) == null ? void 0 : _a4.call(item, error);
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
        logger == null ? void 0 : logger.debug("[aomi][sse] stream ended", {
          sessionId,
          aborted: controller.signal.aborted,
          stopped: subscription.stopped,
          durationMs: Date.now() - openedAt
        });
      } catch (error) {
        if (!controller.signal.aborted && !subscription.stopped) {
          for (const item of subscription.listeners) {
            (_a3 = item.onError) == null ? void 0 : _a3.call(item, error);
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
      logger == null ? void 0 : logger.debug("[aomi][sse] listener removed", {
        sessionId,
        listeners: subscription.listeners.size
      });
      if (subscription.listeners.size === 0) {
        subscription.stop("unsubscribe");
        if (subscriptions.get(sessionId) === subscription) {
          subscriptions.delete(sessionId);
        }
      }
    };
  };
  return { subscribe };
}
var init_sse = __esm({
  "src/sse.ts"() {
    "use strict";
  }
});

// src/client.ts
function joinApiPath(baseUrl, path) {
  const normalizedBase = baseUrl === "/" ? "" : baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}` || normalizedPath;
}
function buildApiUrl(baseUrl, path, query) {
  const url = joinApiPath(baseUrl, path);
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === void 0) continue;
    params.set(key, value);
  }
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}
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
async function postState(baseUrl, path, payload, sessionId, apiKey) {
  const query = toQueryString(payload);
  const url = `${baseUrl}${path}${query}`;
  const headers = new Headers(withSessionHeader(sessionId));
  if (apiKey) {
    headers.set(API_KEY_HEADER, apiKey);
  }
  const response = await fetch(url, {
    method: "POST",
    headers
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}
var SESSION_ID_HEADER, API_KEY_HEADER, AomiClient;
var init_client = __esm({
  "src/client.ts"() {
    "use strict";
    init_sse();
    SESSION_ID_HEADER = "X-Session-Id";
    API_KEY_HEADER = "X-API-Key";
    AomiClient = class {
      constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/+$/, "");
        this.apiKey = options.apiKey;
        this.logger = options.logger;
        this.sseSubscriber = createSseSubscriber({
          backendUrl: this.baseUrl,
          getHeaders: (sessionId) => withSessionHeader(sessionId, { Accept: "text/event-stream" }),
          logger: this.logger
        });
      }
      // ===========================================================================
      // Chat & State
      // ===========================================================================
      /**
       * Fetch current session state (messages, processing status, title).
       */
      async fetchState(sessionId, userState, clientId) {
        const url = buildApiUrl(this.baseUrl, "/api/state", {
          user_state: userState ? JSON.stringify(userState) : void 0,
          client_id: clientId
        });
        const response = await fetch(url, {
          headers: withSessionHeader(sessionId)
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      }
      /**
       * Send a chat message and return updated session state.
       */
      async sendMessage(sessionId, message, options) {
        var _a3, _b;
        const app = (_a3 = options == null ? void 0 : options.app) != null ? _a3 : "default";
        const apiKey = (_b = options == null ? void 0 : options.apiKey) != null ? _b : this.apiKey;
        const payload = { message, app };
        if (options == null ? void 0 : options.publicKey) {
          payload.public_key = options.publicKey;
        }
        if (options == null ? void 0 : options.userState) {
          payload.user_state = JSON.stringify(options.userState);
        }
        if (options == null ? void 0 : options.clientId) {
          payload.client_id = options.clientId;
        }
        return postState(
          this.baseUrl,
          "/api/chat",
          payload,
          sessionId,
          apiKey
        );
      }
      /**
       * Send a system-level message (e.g. wallet state changes, context switches).
       */
      async sendSystemMessage(sessionId, message) {
        return postState(
          this.baseUrl,
          "/api/system",
          { message },
          sessionId
        );
      }
      /**
       * Interrupt the AI's current response.
       */
      async interrupt(sessionId) {
        return postState(
          this.baseUrl,
          "/api/interrupt",
          {},
          sessionId
        );
      }
      // ===========================================================================
      // Secrets
      // ===========================================================================
      /**
       * Ingest secrets for a client. Returns opaque `$SECRET:<name>` handles.
       * Call this once at page load (or when secrets change) with a stable
       * client_id for the browser tab. The same client_id should be passed
       * to `sendMessage` / `fetchState` so sessions get associated.
       */
      async ingestSecrets(clientId, secrets) {
        const url = joinApiPath(this.baseUrl, "/api/secrets");
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_id: clientId, secrets })
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      }
      /**
       * Clear all secrets for a client (e.g. on page unload or logout).
       */
      async clearSecrets(clientId) {
        const url = buildApiUrl(this.baseUrl, "/api/secrets", {
          client_id: clientId
        });
        const response = await fetch(url, { method: "DELETE" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      }
      // ===========================================================================
      // SSE (Real-time Updates)
      // ===========================================================================
      /**
       * Subscribe to real-time SSE updates for a session.
       * Automatically reconnects with exponential backoff on disconnects.
       * Returns an unsubscribe function.
       */
      subscribeSSE(sessionId, onUpdate, onError) {
        return this.sseSubscriber.subscribe(sessionId, onUpdate, onError);
      }
      // ===========================================================================
      // Thread / Session Management
      // ===========================================================================
      /**
       * List all threads for a wallet address.
       */
      async listThreads(publicKey) {
        const url = buildApiUrl(this.baseUrl, "/api/sessions", {
          public_key: publicKey
        });
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch threads: HTTP ${response.status}`);
        }
        return await response.json();
      }
      /**
       * Get a single thread by ID.
       */
      async getThread(sessionId) {
        const url = buildApiUrl(
          this.baseUrl,
          `/api/sessions/${encodeURIComponent(sessionId)}`
        );
        const response = await fetch(url, {
          headers: withSessionHeader(sessionId)
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      }
      /**
       * Create a new thread. The client generates the session ID.
       */
      async createThread(threadId, publicKey) {
        const body = {};
        if (publicKey) body.public_key = publicKey;
        const url = buildApiUrl(this.baseUrl, "/api/sessions");
        const response = await fetch(url, {
          method: "POST",
          headers: withSessionHeader(threadId, {
            "Content-Type": "application/json"
          }),
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          throw new Error(`Failed to create thread: HTTP ${response.status}`);
        }
        return await response.json();
      }
      /**
       * Delete a thread by ID.
       */
      async deleteThread(sessionId) {
        const url = buildApiUrl(
          this.baseUrl,
          `/api/sessions/${encodeURIComponent(sessionId)}`
        );
        const response = await fetch(url, {
          method: "DELETE",
          headers: withSessionHeader(sessionId)
        });
        if (!response.ok) {
          throw new Error(`Failed to delete thread: HTTP ${response.status}`);
        }
      }
      /**
       * Rename a thread.
       */
      async renameThread(sessionId, newTitle) {
        const url = buildApiUrl(
          this.baseUrl,
          `/api/sessions/${encodeURIComponent(sessionId)}`
        );
        const response = await fetch(url, {
          method: "PATCH",
          headers: withSessionHeader(sessionId, {
            "Content-Type": "application/json"
          }),
          body: JSON.stringify({ title: newTitle })
        });
        if (!response.ok) {
          throw new Error(`Failed to rename thread: HTTP ${response.status}`);
        }
      }
      /**
       * Archive a thread.
       */
      async archiveThread(sessionId) {
        const url = buildApiUrl(
          this.baseUrl,
          `/api/sessions/${encodeURIComponent(sessionId)}/archive`
        );
        const response = await fetch(url, {
          method: "POST",
          headers: withSessionHeader(sessionId)
        });
        if (!response.ok) {
          throw new Error(`Failed to archive thread: HTTP ${response.status}`);
        }
      }
      /**
       * Unarchive a thread.
       */
      async unarchiveThread(sessionId) {
        const url = buildApiUrl(
          this.baseUrl,
          `/api/sessions/${encodeURIComponent(sessionId)}/unarchive`
        );
        const response = await fetch(url, {
          method: "POST",
          headers: withSessionHeader(sessionId)
        });
        if (!response.ok) {
          throw new Error(`Failed to unarchive thread: HTTP ${response.status}`);
        }
      }
      // ===========================================================================
      // System Events
      // ===========================================================================
      /**
       * Get system events for a session.
       */
      async getSystemEvents(sessionId, count) {
        const url = buildApiUrl(this.baseUrl, "/api/events", {
          count: count !== void 0 ? String(count) : void 0
        });
        const response = await fetch(url, {
          headers: withSessionHeader(sessionId)
        });
        if (!response.ok) {
          if (response.status === 404) return [];
          throw new Error(`Failed to get system events: HTTP ${response.status}`);
        }
        return await response.json();
      }
      // ===========================================================================
      // Control API
      // ===========================================================================
      /**
       * Get available apps.
       */
      async getApps(sessionId, options) {
        var _a3;
        const url = buildApiUrl(this.baseUrl, "/api/control/apps", {
          public_key: options == null ? void 0 : options.publicKey
        });
        const apiKey = (_a3 = options == null ? void 0 : options.apiKey) != null ? _a3 : this.apiKey;
        const headers = new Headers(withSessionHeader(sessionId));
        if (apiKey) {
          headers.set(API_KEY_HEADER, apiKey);
        }
        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error(`Failed to get apps: HTTP ${response.status}`);
        }
        return await response.json();
      }
      /**
       * Get available models.
       */
      async getModels(sessionId, options) {
        var _a3;
        const url = buildApiUrl(this.baseUrl, "/api/control/models");
        const apiKey = (_a3 = options == null ? void 0 : options.apiKey) != null ? _a3 : this.apiKey;
        const headers = new Headers(withSessionHeader(sessionId));
        if (apiKey) {
          headers.set(API_KEY_HEADER, apiKey);
        }
        const response = await fetch(url, {
          headers
        });
        if (!response.ok) {
          throw new Error(`Failed to get models: HTTP ${response.status}`);
        }
        return await response.json();
      }
      /**
       * Set the model for a session.
       */
      async setModel(sessionId, rig, options) {
        var _a3;
        const apiKey = (_a3 = options == null ? void 0 : options.apiKey) != null ? _a3 : this.apiKey;
        const payload = { rig };
        if (options == null ? void 0 : options.app) {
          payload.app = options.app;
        }
        return postState(this.baseUrl, "/api/control/model", payload, sessionId, apiKey);
      }
      // ===========================================================================
      // Batch Simulation
      // ===========================================================================
      /**
       * Simulate transactions as an atomic batch.
       * Each tx sees state changes from previous txs (e.g., approve → swap).
       * Sends full tx payloads — the backend does not look up by ID.
       */
      async simulateBatch(sessionId, transactions, options) {
        const url = joinApiPath(this.baseUrl, "/api/simulate");
        const headers = new Headers(
          withSessionHeader(sessionId, { "Content-Type": "application/json" })
        );
        if (this.apiKey) {
          headers.set(API_KEY_HEADER, this.apiKey);
        }
        const payload = {
          transactions,
          from: options == null ? void 0 : options.from,
          chain_id: options == null ? void 0 : options.chainId
        };
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new Error(`HTTP ${response.status}: ${response.statusText}${body ? `
${body}` : ""}`);
        }
        return await response.json();
      }
    };
  }
});

// src/types.ts
function addUserStateExt(userState, key, value) {
  const currentExt = userState["ext"];
  const extRecord = typeof currentExt === "object" && currentExt !== null && !Array.isArray(currentExt) ? currentExt : {};
  return __spreadProps(__spreadValues({}, userState), {
    ext: __spreadProps(__spreadValues({}, extRecord), {
      [key]: value
    })
  });
}
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
var CLIENT_TYPE_TS_CLI;
var init_types = __esm({
  "src/types.ts"() {
    "use strict";
    CLIENT_TYPE_TS_CLI = "ts_cli";
  }
});

// src/event.ts
function unwrapSystemEvent(event) {
  var _a3;
  if (isInlineCall(event)) {
    return {
      type: event.InlineCall.type,
      payload: (_a3 = event.InlineCall.payload) != null ? _a3 : event.InlineCall
    };
  }
  if (isSystemNotice(event)) {
    return {
      type: "system_notice",
      payload: { message: event.SystemNotice }
    };
  }
  if (isSystemError(event)) {
    return {
      type: "system_error",
      payload: { message: event.SystemError }
    };
  }
  if (isAsyncCallback(event)) {
    return {
      type: "async_callback",
      payload: event.AsyncCallback
    };
  }
  return null;
}
var TypedEventEmitter;
var init_event = __esm({
  "src/event.ts"() {
    "use strict";
    init_types();
    TypedEventEmitter = class {
      constructor() {
        this.listeners = /* @__PURE__ */ new Map();
      }
      on(type, handler) {
        let set = this.listeners.get(type);
        if (!set) {
          set = /* @__PURE__ */ new Set();
          this.listeners.set(type, set);
        }
        set.add(handler);
        return () => {
          set.delete(handler);
          if (set.size === 0) {
            this.listeners.delete(type);
          }
        };
      }
      once(type, handler) {
        const wrapper = ((payload) => {
          unsub();
          handler(payload);
        });
        const unsub = this.on(type, wrapper);
        return unsub;
      }
      emit(type, payload) {
        const typeSet = this.listeners.get(type);
        if (typeSet) {
          for (const handler of typeSet) {
            handler(payload);
          }
        }
        if (type !== "*") {
          const wildcardSet = this.listeners.get("*");
          if (wildcardSet) {
            for (const handler of wildcardSet) {
              handler({ type, payload });
            }
          }
        }
      }
      off(type, handler) {
        const set = this.listeners.get(type);
        if (set) {
          set.delete(handler);
          if (set.size === 0) {
            this.listeners.delete(type);
          }
        }
      }
      removeAllListeners() {
        this.listeners.clear();
      }
    };
  }
});

// src/wallet-utils.ts
import { getAddress } from "viem";
function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  return value;
}
function getToolArgs(payload) {
  var _a3;
  const root2 = asRecord(payload);
  const nestedArgs = asRecord(root2 == null ? void 0 : root2.args);
  return (_a3 = nestedArgs != null ? nestedArgs : root2) != null ? _a3 : {};
}
function parseChainId2(value) {
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
function normalizeAddress(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  try {
    return getAddress(trimmed);
  } catch (e) {
    if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
      return getAddress(trimmed.toLowerCase());
    }
    return void 0;
  }
}
function normalizeTxPayload(payload) {
  var _a3, _b, _c;
  const root2 = asRecord(payload);
  const args = getToolArgs(payload);
  const ctx = asRecord(root2 == null ? void 0 : root2.ctx);
  const to = normalizeAddress(args.to);
  if (!to) return null;
  const valueRaw = args.value;
  const value = typeof valueRaw === "string" ? valueRaw : typeof valueRaw === "number" && Number.isFinite(valueRaw) ? String(Math.trunc(valueRaw)) : void 0;
  const data = typeof args.data === "string" ? args.data : void 0;
  const chainId = (_c = (_b = (_a3 = parseChainId2(args.chainId)) != null ? _a3 : parseChainId2(args.chain_id)) != null ? _b : parseChainId2(ctx == null ? void 0 : ctx.user_chain_id)) != null ? _c : parseChainId2(ctx == null ? void 0 : ctx.userChainId);
  return { to, value, data, chainId };
}
function normalizeEip712Payload(payload) {
  var _a3;
  const args = getToolArgs(payload);
  const typedDataRaw = (_a3 = args.typed_data) != null ? _a3 : args.typedData;
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
  return { typed_data: typedData, description };
}
function toAAWalletCall(payload, defaultChainId = 1) {
  var _a3, _b;
  return {
    to: payload.to,
    value: BigInt((_a3 = payload.value) != null ? _a3 : "0"),
    data: payload.data ? payload.data : void 0,
    chainId: (_b = payload.chainId) != null ? _b : defaultChainId
  };
}
function toViemSignTypedDataArgs(payload) {
  var _a3;
  const typedData = payload.typed_data;
  const primaryType = typeof (typedData == null ? void 0 : typedData.primaryType) === "string" && typedData.primaryType.trim().length > 0 ? typedData.primaryType : void 0;
  if (!typedData || !primaryType) {
    return null;
  }
  return {
    domain: asRecord(typedData.domain),
    types: Object.fromEntries(
      Object.entries((_a3 = typedData.types) != null ? _a3 : {}).filter(
        ([typeName]) => typeName !== "EIP712Domain"
      )
    ),
    primaryType,
    message: asRecord(typedData.message)
  };
}
var init_wallet_utils = __esm({
  "src/wallet-utils.ts"() {
    "use strict";
  }
});

// src/session.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => sortJson(entry));
  }
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = sortJson(value[key]);
      return acc;
    }, {});
  }
  return value;
}
function isSubsetMatch(expected, actual) {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || expected.length !== actual.length) {
      return false;
    }
    return expected.every(
      (entry, index) => isSubsetMatch(entry, actual[index])
    );
  }
  if (expected && typeof expected === "object") {
    if (!actual || typeof actual !== "object" || Array.isArray(actual)) {
      return false;
    }
    return Object.entries(expected).every(
      ([key, value]) => isSubsetMatch(value, actual[key])
    );
  }
  return expected === actual;
}
var ClientSession;
var init_session = __esm({
  "src/session.ts"() {
    "use strict";
    init_client();
    init_types();
    init_event();
    init_event();
    init_wallet_utils();
    ClientSession = class extends TypedEventEmitter {
      constructor(clientOrOptions, sessionOptions) {
        var _a3, _b, _c, _d, _e;
        super();
        // Internal state
        this.pollTimer = null;
        this.unsubscribeSSE = null;
        this._isProcessing = false;
        this._backendWasProcessing = false;
        this.walletRequests = [];
        this.walletRequestNextId = 1;
        this._messages = [];
        this.closed = false;
        // For send() blocking behavior
        this.pendingResolve = null;
        this.client = clientOrOptions instanceof AomiClient ? clientOrOptions : new AomiClient(clientOrOptions);
        this.sessionId = (_a3 = sessionOptions == null ? void 0 : sessionOptions.sessionId) != null ? _a3 : crypto.randomUUID();
        this.app = (_b = sessionOptions == null ? void 0 : sessionOptions.app) != null ? _b : "default";
        this.publicKey = sessionOptions == null ? void 0 : sessionOptions.publicKey;
        this.apiKey = sessionOptions == null ? void 0 : sessionOptions.apiKey;
        this.userState = (sessionOptions == null ? void 0 : sessionOptions.clientType) ? addUserStateExt((_c = sessionOptions == null ? void 0 : sessionOptions.userState) != null ? _c : {}, "client_type", sessionOptions.clientType) : sessionOptions == null ? void 0 : sessionOptions.userState;
        this.clientId = (_d = sessionOptions == null ? void 0 : sessionOptions.clientId) != null ? _d : crypto.randomUUID();
        this.pollIntervalMs = (_e = sessionOptions == null ? void 0 : sessionOptions.pollIntervalMs) != null ? _e : 500;
        this.logger = sessionOptions == null ? void 0 : sessionOptions.logger;
        this.unsubscribeSSE = this.client.subscribeSSE(
          this.sessionId,
          (event) => this.handleSSEEvent(event),
          (error) => this.emit("error", { error })
        );
      }
      // ===========================================================================
      // Public API — Chat
      // ===========================================================================
      /**
       * Send a message and wait for the AI to finish processing.
       *
       * The returned promise resolves when `is_processing` becomes `false` AND
       * there are no pending wallet requests. If a wallet request arrives
       * mid-processing, polling continues but the promise pauses until the
       * request is resolved or rejected via `resolve()` / `reject()`.
       */
      async send(message) {
        this.assertOpen();
        const response = await this.client.sendMessage(this.sessionId, message, {
          app: this.app,
          publicKey: this.publicKey,
          apiKey: this.apiKey,
          userState: this.userState,
          clientId: this.clientId
        });
        this.assertUserStateAligned(response.user_state);
        this.applyState(response);
        if (!response.is_processing && this.walletRequests.length === 0) {
          return { messages: this._messages, title: this._title };
        }
        this._isProcessing = true;
        this.emit("processing_start", void 0);
        return new Promise((resolve) => {
          this.pendingResolve = resolve;
          this.startPolling();
        });
      }
      /**
       * Send a message without waiting for completion.
       * Polling starts in the background; listen to events for updates.
       */
      async sendAsync(message) {
        this.assertOpen();
        const response = await this.client.sendMessage(this.sessionId, message, {
          app: this.app,
          publicKey: this.publicKey,
          apiKey: this.apiKey,
          userState: this.userState,
          clientId: this.clientId
        });
        this.assertUserStateAligned(response.user_state);
        this.applyState(response);
        if (response.is_processing) {
          this._isProcessing = true;
          this.emit("processing_start", void 0);
          this.startPolling();
        }
        return response;
      }
      // ===========================================================================
      // Public API — Wallet Request Resolution
      // ===========================================================================
      /**
       * Resolve a pending wallet request (transaction or EIP-712 signing).
       * Sends the result to the backend and resumes polling.
       */
      async resolve(requestId, result) {
        var _a3;
        const req = this.removeWalletRequest(requestId);
        if (!req) {
          throw new Error(`No pending wallet request with id "${requestId}"`);
        }
        if (req.kind === "transaction") {
          await this.sendSystemEvent("wallet:tx_complete", {
            txHash: (_a3 = result.txHash) != null ? _a3 : "",
            status: "success",
            amount: result.amount
          });
        } else {
          const eip712Payload = req.payload;
          await this.sendSystemEvent("wallet_eip712_response", {
            status: "success",
            signature: result.signature,
            description: eip712Payload.description
          });
        }
        if (this._isProcessing) {
          this.startPolling();
        }
      }
      /**
       * Reject a pending wallet request.
       * Sends an error to the backend and resumes polling.
       */
      async reject(requestId, reason) {
        const req = this.removeWalletRequest(requestId);
        if (!req) {
          throw new Error(`No pending wallet request with id "${requestId}"`);
        }
        if (req.kind === "transaction") {
          await this.sendSystemEvent("wallet:tx_complete", {
            txHash: "",
            status: "failed"
          });
        } else {
          const eip712Payload = req.payload;
          await this.sendSystemEvent("wallet_eip712_response", {
            status: "failed",
            error: reason != null ? reason : "Request rejected",
            description: eip712Payload.description
          });
        }
        if (this._isProcessing) {
          this.startPolling();
        }
      }
      // ===========================================================================
      // Public API — Control
      // ===========================================================================
      /**
       * Cancel the AI's current response.
       */
      async interrupt() {
        this.stopPolling();
        const response = await this.client.interrupt(this.sessionId);
        this.applyState(response);
        this._isProcessing = false;
        this.emit("processing_end", void 0);
        this.resolvePending();
      }
      /**
       * Close the session. Stops polling, unsubscribes SSE, removes all listeners.
       * The session cannot be used after closing.
       */
      close() {
        var _a3;
        if (this.closed) return;
        this.closed = true;
        this.stopPolling();
        (_a3 = this.unsubscribeSSE) == null ? void 0 : _a3.call(this);
        this.unsubscribeSSE = null;
        this.resolvePending();
        this.removeAllListeners();
      }
      // ===========================================================================
      // Public API — Accessors
      // ===========================================================================
      /** Current messages in the session. */
      getMessages() {
        return this._messages;
      }
      /** Current session title. */
      getTitle() {
        return this._title;
      }
      /** Pending wallet requests waiting for resolve/reject. */
      getPendingRequests() {
        return [...this.walletRequests];
      }
      /** Whether the AI is currently processing. */
      getIsProcessing() {
        return this._isProcessing;
      }
      resolveUserState(userState) {
        this.userState = userState;
        const address = userState["address"];
        if (typeof address === "string" && address.length > 0) {
          this.publicKey = address;
        }
      }
      setClientType(clientType) {
        var _a3;
        this.resolveUserState(addUserStateExt((_a3 = this.userState) != null ? _a3 : {}, "client_type", clientType));
      }
      addExtValue(key, value) {
        var _a3;
        const current = (_a3 = this.userState) != null ? _a3 : {};
        const currentExt = isRecord(current["ext"]) ? current["ext"] : {};
        this.resolveUserState(__spreadProps(__spreadValues({}, current), {
          ext: __spreadProps(__spreadValues({}, currentExt), {
            [key]: value
          })
        }));
      }
      removeExtValue(key) {
        if (!this.userState) return;
        const currentExt = this.userState["ext"];
        if (!isRecord(currentExt)) return;
        const nextExt = __spreadValues({}, currentExt);
        delete nextExt[key];
        const nextState = __spreadValues({}, this.userState);
        if (Object.keys(nextExt).length === 0) {
          delete nextState["ext"];
        } else {
          nextState["ext"] = nextExt;
        }
        this.resolveUserState(nextState);
      }
      resolveWallet(address, chainId) {
        this.resolveUserState({ address, chainId: chainId != null ? chainId : 1, isConnected: true });
      }
      async syncUserState() {
        this.assertOpen();
        const state = await this.client.fetchState(this.sessionId, this.userState, this.clientId);
        this.assertUserStateAligned(state.user_state);
        this.applyState(state);
        return state;
      }
      // ===========================================================================
      // Public API — Polling Control
      // ===========================================================================
      /** Whether the session is currently polling for state updates. */
      getIsPolling() {
        return this.pollTimer !== null;
      }
      /**
       * Fetch the current state from the backend (one-shot).
       * Automatically starts polling if the backend is processing.
       */
      async fetchCurrentState() {
        this.assertOpen();
        const state = await this.client.fetchState(
          this.sessionId,
          this.userState,
          this.clientId
        );
        this.assertUserStateAligned(state.user_state);
        this.applyState(state);
        if (state.is_processing && !this.pollTimer) {
          this._isProcessing = true;
          this.emit("processing_start", void 0);
          this.startPolling();
        } else if (!state.is_processing) {
          this._isProcessing = false;
        }
      }
      /**
       * Start polling for state updates. Idempotent — no-op if already polling.
       * Useful for resuming polling after resolving a wallet request.
       */
      startPolling() {
        var _a3;
        if (this.pollTimer || this.closed) return;
        this._backendWasProcessing = true;
        (_a3 = this.logger) == null ? void 0 : _a3.debug("[session] polling started", this.sessionId);
        this.pollTimer = setInterval(() => {
          void this.pollTick();
        }, this.pollIntervalMs);
      }
      /** Stop polling for state updates. Idempotent — no-op if not polling. */
      stopPolling() {
        var _a3;
        if (this.pollTimer) {
          clearInterval(this.pollTimer);
          this.pollTimer = null;
          (_a3 = this.logger) == null ? void 0 : _a3.debug("[session] polling stopped", this.sessionId);
        }
      }
      async pollTick() {
        var _a3;
        if (!this.pollTimer) return;
        try {
          const state = await this.client.fetchState(
            this.sessionId,
            this.userState,
            this.clientId
          );
          if (!this.pollTimer) return;
          this.assertUserStateAligned(state.user_state);
          this.applyState(state);
          if (this._backendWasProcessing && !state.is_processing) {
            this.emit("backend_idle", void 0);
          }
          this._backendWasProcessing = !!state.is_processing;
          if (!state.is_processing && this.walletRequests.length === 0) {
            this.stopPolling();
            this._isProcessing = false;
            this.emit("processing_end", void 0);
            this.resolvePending();
          }
        } catch (error) {
          (_a3 = this.logger) == null ? void 0 : _a3.debug("[session] poll error", error);
          this.emit("error", { error });
        }
      }
      // ===========================================================================
      // Internal — State Application
      // ===========================================================================
      applyState(state) {
        var _a3;
        if (state.messages) {
          this._messages = state.messages;
          this.emit("messages", this._messages);
        }
        if (state.title) {
          this._title = state.title;
        }
        if ((_a3 = state.system_events) == null ? void 0 : _a3.length) {
          this.dispatchSystemEvents(state.system_events);
        }
      }
      dispatchSystemEvents(events) {
        var _a3;
        for (const event of events) {
          const unwrapped = unwrapSystemEvent(event);
          if (!unwrapped) continue;
          if (unwrapped.type === "wallet_tx_request") {
            const payload = normalizeTxPayload(unwrapped.payload);
            if (payload) {
              const req = this.enqueueWalletRequest("transaction", payload);
              this.emit("wallet_tx_request", req);
            }
          } else if (unwrapped.type === "wallet_eip712_request") {
            const payload = normalizeEip712Payload((_a3 = unwrapped.payload) != null ? _a3 : {});
            const req = this.enqueueWalletRequest("eip712_sign", payload);
            this.emit("wallet_eip712_request", req);
          } else if (unwrapped.type === "system_notice" || unwrapped.type === "system_error" || unwrapped.type === "async_callback") {
            this.emit(
              unwrapped.type,
              unwrapped.payload
            );
          }
        }
      }
      // ===========================================================================
      // Internal — SSE Handling
      // ===========================================================================
      handleSSEEvent(event) {
        if (event.type === "title_changed" && event.new_title) {
          this._title = event.new_title;
          this.emit("title_changed", { title: event.new_title });
        } else if (event.type === "tool_update") {
          this.emit("tool_update", event);
        } else if (event.type === "tool_complete") {
          this.emit("tool_complete", event);
        }
      }
      // ===========================================================================
      // Internal — Wallet Request Queue
      // ===========================================================================
      enqueueWalletRequest(kind, payload) {
        const req = {
          id: `wreq-${this.walletRequestNextId++}`,
          kind,
          payload,
          timestamp: Date.now()
        };
        this.walletRequests.push(req);
        return req;
      }
      removeWalletRequest(id) {
        const idx = this.walletRequests.findIndex((r) => r.id === id);
        if (idx === -1) return null;
        return this.walletRequests.splice(idx, 1)[0];
      }
      // ===========================================================================
      // Internal — Helpers
      // ===========================================================================
      async sendSystemEvent(type, payload) {
        const message = JSON.stringify({ type, payload });
        await this.client.sendSystemMessage(this.sessionId, message);
      }
      resolvePending() {
        if (this.pendingResolve) {
          const resolve = this.pendingResolve;
          this.pendingResolve = null;
          resolve({ messages: this._messages, title: this._title });
        }
      }
      assertOpen() {
        if (this.closed) {
          throw new Error("Session is closed");
        }
      }
      assertUserStateAligned(actualUserState) {
        if (!this.userState || !actualUserState) {
          return;
        }
        if (!isSubsetMatch(this.userState, actualUserState)) {
          const expected = JSON.stringify(sortJson(this.userState));
          const actual = JSON.stringify(sortJson(actualUserState));
          console.warn(
            `[session] Backend user_state mismatch (non-fatal). expected subset=${expected} actual=${actual}`
          );
        }
      }
    };
  }
});

// src/cli/state.ts
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "fs";
import { basename, join } from "path";
import { homedir, tmpdir } from "os";
function ensureStorageDirs() {
  mkdirSync(SESSIONS_DIR, { recursive: true });
}
function parseSessionFileLocalId(filename) {
  const match = filename.match(/^session-(\d+)\.json$/);
  if (!match) return null;
  const localId = parseInt(match[1], 10);
  return Number.isNaN(localId) ? null : localId;
}
function toSessionFilePath(localId) {
  return join(SESSIONS_DIR, `${SESSION_FILE_PREFIX}${localId}${SESSION_FILE_SUFFIX}`);
}
function toCliSessionState(stored) {
  return {
    sessionId: stored.sessionId,
    clientId: stored.clientId,
    baseUrl: stored.baseUrl,
    app: stored.app,
    model: stored.model,
    apiKey: stored.apiKey,
    publicKey: stored.publicKey,
    chainId: stored.chainId,
    pendingTxs: stored.pendingTxs,
    signedTxs: stored.signedTxs,
    secretHandles: stored.secretHandles
  };
}
function readStoredSession(path) {
  var _a3;
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.sessionId !== "string" || typeof parsed.baseUrl !== "string") {
      return null;
    }
    const fallbackLocalId = (_a3 = parseSessionFileLocalId(basename(path))) != null ? _a3 : 0;
    return {
      sessionId: parsed.sessionId,
      clientId: parsed.clientId,
      baseUrl: parsed.baseUrl,
      app: parsed.app,
      model: parsed.model,
      apiKey: parsed.apiKey,
      publicKey: parsed.publicKey,
      chainId: parsed.chainId,
      pendingTxs: parsed.pendingTxs,
      signedTxs: parsed.signedTxs,
      secretHandles: parsed.secretHandles,
      localId: typeof parsed.localId === "number" && parsed.localId > 0 ? parsed.localId : fallbackLocalId,
      createdAt: typeof parsed.createdAt === "number" && parsed.createdAt > 0 ? parsed.createdAt : Date.now(),
      updatedAt: typeof parsed.updatedAt === "number" && parsed.updatedAt > 0 ? parsed.updatedAt : Date.now()
    };
  } catch (e) {
    return null;
  }
}
function readActiveLocalId() {
  try {
    if (!existsSync(ACTIVE_SESSION_FILE)) return null;
    const raw = readFileSync(ACTIVE_SESSION_FILE, "utf-8").trim();
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? null : parsed;
  } catch (e) {
    return null;
  }
}
function writeActiveLocalId(localId) {
  try {
    if (localId === null) {
      if (existsSync(ACTIVE_SESSION_FILE)) {
        rmSync(ACTIVE_SESSION_FILE);
      }
      return;
    }
    ensureStorageDirs();
    writeFileSync(ACTIVE_SESSION_FILE, String(localId));
  } catch (e) {
  }
}
function readAllStoredSessions() {
  try {
    ensureStorageDirs();
    const filenames = readdirSync(SESSIONS_DIR).map((name) => ({ name, localId: parseSessionFileLocalId(name) })).filter(
      (entry) => entry.localId !== null
    ).sort((a, b) => a.localId - b.localId);
    const sessions = [];
    for (const entry of filenames) {
      const path = join(SESSIONS_DIR, entry.name);
      const stored = readStoredSession(path);
      if (stored) {
        sessions.push(stored);
      }
    }
    return sessions;
  } catch (e) {
    return [];
  }
}
function getNextLocalId(sessions) {
  const maxLocalId = sessions.reduce((max, session) => {
    return session.localId > max ? session.localId : max;
  }, 0);
  return maxLocalId + 1;
}
function migrateLegacyStateIfNeeded() {
  if (_migrationDone) return;
  _migrationDone = true;
  if (!existsSync(LEGACY_STATE_FILE)) return;
  const existing = readAllStoredSessions();
  if (existing.length > 0) {
    return;
  }
  try {
    const raw = readFileSync(LEGACY_STATE_FILE, "utf-8");
    const legacy = JSON.parse(raw);
    if (!legacy.sessionId || !legacy.baseUrl) {
      return;
    }
    const now = Date.now();
    const migrated = __spreadProps(__spreadValues({}, legacy), {
      localId: 1,
      createdAt: now,
      updatedAt: now
    });
    ensureStorageDirs();
    writeFileSync(toSessionFilePath(1), JSON.stringify(migrated, null, 2));
    writeActiveLocalId(1);
    rmSync(LEGACY_STATE_FILE);
  } catch (e) {
  }
}
function resolveStoredSession(selector, sessions) {
  var _a3, _b;
  const trimmed = selector.trim();
  if (!trimmed) return null;
  const localMatch = trimmed.match(/^(?:session-)?(\d+)$/);
  if (localMatch) {
    const localId = parseInt(localMatch[1], 10);
    if (!Number.isNaN(localId)) {
      return (_a3 = sessions.find((session) => session.localId === localId)) != null ? _a3 : null;
    }
  }
  return (_b = sessions.find((session) => session.sessionId === trimmed)) != null ? _b : null;
}
function toStoredSessionRecord(stored) {
  return {
    localId: stored.localId,
    sessionId: stored.sessionId,
    path: toSessionFilePath(stored.localId),
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
    state: toCliSessionState(stored)
  };
}
function getActiveStateFilePath() {
  migrateLegacyStateIfNeeded();
  const sessions = readAllStoredSessions();
  const activeLocalId = readActiveLocalId();
  if (activeLocalId === null) return null;
  const active = sessions.find((session) => session.localId === activeLocalId);
  return active ? toSessionFilePath(active.localId) : null;
}
function listStoredSessions() {
  migrateLegacyStateIfNeeded();
  return readAllStoredSessions().map(toStoredSessionRecord);
}
function setActiveSession(selector) {
  migrateLegacyStateIfNeeded();
  const sessions = readAllStoredSessions();
  const target = resolveStoredSession(selector, sessions);
  if (!target) return null;
  writeActiveLocalId(target.localId);
  return toStoredSessionRecord(target);
}
function deleteStoredSession(selector) {
  var _a3, _b;
  migrateLegacyStateIfNeeded();
  const sessions = readAllStoredSessions();
  const target = resolveStoredSession(selector, sessions);
  if (!target) return null;
  const targetPath = toSessionFilePath(target.localId);
  try {
    if (existsSync(targetPath)) {
      rmSync(targetPath);
    }
  } catch (e) {
    return null;
  }
  const activeLocalId = readActiveLocalId();
  if (activeLocalId === target.localId) {
    const remaining = readAllStoredSessions().sort((a, b) => b.updatedAt - a.updatedAt);
    writeActiveLocalId((_b = (_a3 = remaining[0]) == null ? void 0 : _a3.localId) != null ? _b : null);
  }
  return toStoredSessionRecord(target);
}
function readState() {
  var _a3;
  migrateLegacyStateIfNeeded();
  const sessions = readAllStoredSessions();
  if (sessions.length === 0) return null;
  const activeLocalId = readActiveLocalId();
  if (activeLocalId === null) {
    return null;
  }
  const active = (_a3 = sessions.find((session) => session.localId === activeLocalId)) != null ? _a3 : null;
  if (!active) {
    writeActiveLocalId(null);
    return null;
  }
  return toCliSessionState(active);
}
function writeState(state) {
  var _a3, _b;
  migrateLegacyStateIfNeeded();
  ensureStorageDirs();
  const sessions = readAllStoredSessions();
  const activeLocalId = readActiveLocalId();
  const existingBySessionId = sessions.find(
    (session) => session.sessionId === state.sessionId
  );
  const existingByActive = activeLocalId !== null ? sessions.find((session) => session.localId === activeLocalId) : void 0;
  const existing = existingBySessionId != null ? existingBySessionId : existingByActive;
  const now = Date.now();
  const localId = (_a3 = existing == null ? void 0 : existing.localId) != null ? _a3 : getNextLocalId(sessions);
  const createdAt = (_b = existing == null ? void 0 : existing.createdAt) != null ? _b : now;
  const payload = __spreadProps(__spreadValues({}, state), {
    localId,
    createdAt,
    updatedAt: now
  });
  writeFileSync(toSessionFilePath(localId), JSON.stringify(payload, null, 2));
  writeActiveLocalId(localId);
}
function clearState() {
  migrateLegacyStateIfNeeded();
  writeActiveLocalId(null);
}
var SESSION_FILE_PREFIX, SESSION_FILE_SUFFIX, _a, LEGACY_STATE_FILE, _a2, STATE_ROOT_DIR, SESSIONS_DIR, ACTIVE_SESSION_FILE, _migrationDone;
var init_state = __esm({
  "src/cli/state.ts"() {
    "use strict";
    SESSION_FILE_PREFIX = "session-";
    SESSION_FILE_SUFFIX = ".json";
    LEGACY_STATE_FILE = join(
      (_a = process.env.XDG_RUNTIME_DIR) != null ? _a : tmpdir(),
      "aomi-session.json"
    );
    STATE_ROOT_DIR = (_a2 = process.env.AOMI_STATE_DIR) != null ? _a2 : join(homedir(), ".aomi");
    SESSIONS_DIR = join(STATE_ROOT_DIR, "sessions");
    ACTIVE_SESSION_FILE = join(STATE_ROOT_DIR, "active-session.txt");
    _migrationDone = false;
  }
});

// src/cli/user-state.ts
function buildCliUserState(publicKey, chainId) {
  const userState = {};
  if (publicKey !== void 0) {
    userState.address = publicKey;
    userState.isConnected = true;
  }
  if (chainId !== void 0) {
    userState.chainId = chainId;
  }
  return addUserStateExt(userState, "client_type", CLIENT_TYPE_TS_CLI);
}
var init_user_state = __esm({
  "src/cli/user-state.ts"() {
    "use strict";
    init_types();
  }
});

// src/cli/cli-session.ts
var CliSession;
var init_cli_session = __esm({
  "src/cli/cli-session.ts"() {
    "use strict";
    init_session();
    init_state();
    init_user_state();
    init_errors();
    CliSession = class _CliSession {
      constructor(state) {
        this.state = state;
      }
      // ---------------------------------------------------------------------------
      // Static factories
      // ---------------------------------------------------------------------------
      /** Load the active session from disk. Returns null if none exists. */
      static load() {
        const state = readState();
        return state ? new _CliSession(state) : null;
      }
      /** Load existing session or create a fresh one from config. */
      static loadOrCreate(config) {
        if (config.freshSession) {
          return _CliSession.create(config);
        }
        const existing = _CliSession.load();
        if (existing) {
          existing.mergeConfig(config);
          return existing;
        }
        return _CliSession.create(config);
      }
      /** Create a fresh session and persist it. */
      static create(config) {
        const state = {
          sessionId: crypto.randomUUID(),
          clientId: crypto.randomUUID(),
          baseUrl: config.baseUrl,
          app: config.app,
          model: config.model,
          apiKey: config.apiKey,
          publicKey: config.publicKey,
          chainId: config.chain
        };
        const cli = new _CliSession(state);
        cli.save();
        return cli;
      }
      // ---------------------------------------------------------------------------
      // Read-only accessors
      // ---------------------------------------------------------------------------
      get sessionId() {
        return this.state.sessionId;
      }
      get baseUrl() {
        return this.state.baseUrl;
      }
      get app() {
        return this.state.app;
      }
      get model() {
        return this.state.model;
      }
      get apiKey() {
        return this.state.apiKey;
      }
      get publicKey() {
        return this.state.publicKey;
      }
      get chainId() {
        return this.state.chainId;
      }
      get clientId() {
        return this.state.clientId;
      }
      get pendingTxs() {
        var _a3;
        return (_a3 = this.state.pendingTxs) != null ? _a3 : [];
      }
      get signedTxs() {
        var _a3;
        return (_a3 = this.state.signedTxs) != null ? _a3 : [];
      }
      get secretHandles() {
        var _a3;
        return (_a3 = this.state.secretHandles) != null ? _a3 : {};
      }
      // ---------------------------------------------------------------------------
      // Mutators (auto-persist)
      // ---------------------------------------------------------------------------
      /** Apply config overrides (baseUrl, app, apiKey, publicKey, chain). Only persists if something changed. */
      mergeConfig(config) {
        let changed = false;
        if (config.baseUrl !== this.state.baseUrl) {
          this.state.baseUrl = config.baseUrl;
          changed = true;
        }
        if (config.app !== this.state.app) {
          this.state.app = config.app;
          changed = true;
        }
        if (config.apiKey !== void 0 && config.apiKey !== this.state.apiKey) {
          this.state.apiKey = config.apiKey;
          changed = true;
        }
        if (config.publicKey !== void 0 && config.publicKey !== this.state.publicKey) {
          this.state.publicKey = config.publicKey;
          changed = true;
        }
        if (config.chain !== void 0 && config.chain !== this.state.chainId) {
          this.state.chainId = config.chain;
          changed = true;
        }
        if (!this.state.clientId) {
          this.state.clientId = crypto.randomUUID();
          changed = true;
        }
        if (changed) this.save();
      }
      setModel(model) {
        this.state.model = model;
        this.save();
      }
      setPublicKey(key) {
        this.state.publicKey = key;
        this.save();
      }
      setChainId(id) {
        this.state.chainId = id;
        this.save();
      }
      addSecretHandles(handles) {
        var _a3;
        this.state.secretHandles = __spreadValues(__spreadValues({}, (_a3 = this.state.secretHandles) != null ? _a3 : {}), handles);
        this.save();
      }
      clearSecretHandles() {
        this.state.secretHandles = {};
        this.save();
      }
      /** Ensure clientId exists, generate if absent. Returns the clientId. */
      ensureClientId() {
        if (!this.state.clientId) {
          this.state.clientId = crypto.randomUUID();
          this.save();
        }
        return this.state.clientId;
      }
      // ---------------------------------------------------------------------------
      // Transaction methods (auto-persist)
      // ---------------------------------------------------------------------------
      /** Add a pending tx with dedup. Returns null if duplicate. */
      addPendingTx(tx) {
        if (!this.state.pendingTxs) this.state.pendingTxs = [];
        const isDuplicate = this.state.pendingTxs.some(
          (existing) => existing.kind === tx.kind && existing.to === tx.to && existing.data === tx.data && existing.value === tx.value && existing.chainId === tx.chainId
        );
        if (isDuplicate) return null;
        const pending = __spreadProps(__spreadValues({}, tx), {
          id: this.getNextTxId()
        });
        this.state.pendingTxs.push(pending);
        this.save();
        return pending;
      }
      removePendingTx(id) {
        if (!this.state.pendingTxs) return null;
        const idx = this.state.pendingTxs.findIndex((tx) => tx.id === id);
        if (idx === -1) return null;
        const [removed] = this.state.pendingTxs.splice(idx, 1);
        this.save();
        return removed;
      }
      addSignedTx(tx) {
        if (!this.state.signedTxs) this.state.signedTxs = [];
        this.state.signedTxs.push(tx);
        this.save();
      }
      /** Get a pending tx by ID, or fatal() if not found. */
      requirePendingTx(txId) {
        var _a3;
        const pending = (_a3 = this.state.pendingTxs) != null ? _a3 : [];
        const tx = pending.find((t) => t.id === txId);
        if (!tx) {
          const available = pending.map((t) => t.id).join(", ") || "(none)";
          fatal(`Transaction "${txId}" not found.
Available: ${available}`);
        }
        return tx;
      }
      /** Get multiple pending txs by ID, or fatal() if any missing or duplicates. */
      requirePendingTxs(txIds) {
        const uniqueIds = Array.from(new Set(txIds));
        if (uniqueIds.length !== txIds.length) {
          fatal("Duplicate transaction IDs are not allowed in a single `aomi sign` call.");
        }
        return uniqueIds.map((txId) => this.requirePendingTx(txId));
      }
      // ---------------------------------------------------------------------------
      // Bridge to ClientSession
      // ---------------------------------------------------------------------------
      /** Build a ClientSession from the current state. */
      createClientSession() {
        const session = new ClientSession(
          { baseUrl: this.state.baseUrl, apiKey: this.state.apiKey },
          {
            sessionId: this.state.sessionId,
            clientId: this.state.clientId,
            app: this.state.app,
            apiKey: this.state.apiKey,
            publicKey: this.state.publicKey
          }
        );
        session.resolveUserState(buildCliUserState(this.state.publicKey, this.state.chainId));
        return session;
      }
      /** Snapshot of the raw state (for backward compat or serialization). */
      toState() {
        return __spreadValues({}, this.state);
      }
      /** Re-read state from disk (e.g. after another process may have written). */
      reload() {
        const fresh = readState();
        if (fresh) {
          this.state = fresh;
        }
      }
      // ---------------------------------------------------------------------------
      // Internal
      // ---------------------------------------------------------------------------
      save() {
        writeState(this.state);
      }
      getNextTxId() {
        var _a3, _b;
        const allIds = [
          ...(_a3 = this.state.pendingTxs) != null ? _a3 : [],
          ...(_b = this.state.signedTxs) != null ? _b : []
        ].map((tx) => {
          const match = tx.id.match(/^tx-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        });
        const max = allIds.length > 0 ? Math.max(...allIds) : 0;
        return `tx-${max + 1}`;
      }
    };
  }
});

// src/cli/output.ts
function printDataFileLocation() {
  const activeFile = getActiveStateFilePath();
  if (activeFile) {
    console.log(`Data stored at ${activeFile} \u{1F4DD}`);
    return;
  }
  console.log(`Data stored under ${STATE_ROOT_DIR} \u{1F4DD}`);
}
function printToolUpdate(event) {
  var _a3;
  const name = getToolNameFromEvent(event);
  const status = (_a3 = event.status) != null ? _a3 : "running";
  console.log(`${DIM}\u{1F527} [tool] ${name}: ${status}${RESET}`);
}
function printToolComplete(event) {
  const name = getToolNameFromEvent(event);
  const result = getToolResultFromEvent(event);
  const line = formatToolResultLine(name, result);
  console.log(line);
}
function printToolResultLine(name, result) {
  console.log(formatToolResultLine(name, result));
}
function getToolNameFromEvent(event) {
  var _a3, _b;
  return (_b = (_a3 = event.tool_name) != null ? _a3 : event.name) != null ? _b : "unknown";
}
function getToolResultFromEvent(event) {
  var _a3;
  return (_a3 = event.result) != null ? _a3 : event.output;
}
function toToolResultKey(name, result) {
  return `${name}
${result != null ? result : ""}`;
}
function getMessageToolResults(messages, startAt = 0) {
  const results = [];
  for (let i = startAt; i < messages.length; i++) {
    const toolResult = messages[i].tool_result;
    if (!toolResult) {
      continue;
    }
    const [name, result] = toolResult;
    if (!name || typeof result !== "string") {
      continue;
    }
    results.push({ name, result });
  }
  return results;
}
function isAlwaysVisibleTool(name) {
  const normalized = name.toLowerCase();
  if (normalized.includes("encode_and_simulate") || normalized.includes("encode-and-simulate") || normalized.includes("encode_and_view") || normalized.includes("encode-and-view")) {
    return true;
  }
  if (normalized.startsWith("simulate ")) {
    return true;
  }
  return false;
}
function printNewAgentMessages(messages, lastPrintedCount) {
  const agentMessages = messages.filter(
    (message) => message.sender === "agent" || message.sender === "assistant"
  );
  let handled = lastPrintedCount;
  for (let i = lastPrintedCount; i < agentMessages.length; i++) {
    const message = agentMessages[i];
    if (message.is_streaming) {
      break;
    }
    if (message.content) {
      console.log(`${CYAN}\u{1F916} ${message.content}${RESET}`);
    }
    handled = i + 1;
  }
  return handled;
}
function formatLogContent(content) {
  if (!content) return null;
  const trimmed = content.trim();
  return trimmed.length > 0 ? trimmed : null;
}
function formatToolResultPreview(result, maxLength = 200) {
  const normalized = result.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}\u2026`;
}
function formatToolResultLine(name, result) {
  if (!result) {
    return `${GREEN}\u2714 [tool] ${name} done${RESET}`;
  }
  return `${GREEN}\u2714 [tool] ${name} \u2192 ${formatToolResultPreview(result, 120)}${RESET}`;
}
var DIM, CYAN, YELLOW, GREEN, RESET;
var init_output = __esm({
  "src/cli/output.ts"() {
    "use strict";
    init_state();
    DIM = "\x1B[2m";
    CYAN = "\x1B[36m";
    YELLOW = "\x1B[33m";
    GREEN = "\x1B[32m";
    RESET = "\x1B[0m";
  }
});

// src/cli/context.ts
function createControlClient(config) {
  return new AomiClient({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey
  });
}
async function ingestSecretsForSession(config, cli, client) {
  const secrets = config.secrets;
  if (Object.keys(secrets).length === 0) return {};
  const clientId = cli.ensureClientId();
  const response = await client.ingestSecrets(
    clientId,
    secrets
  );
  cli.addSecretHandles(response.handles);
  return response.handles;
}
async function applyRequestedModelIfPresent(config, cli, session) {
  const requestedModel = config.model;
  if (!requestedModel || requestedModel === cli.model) {
    return;
  }
  await session.client.setModel(cli.sessionId, requestedModel, {
    app: cli.app,
    apiKey: cli.apiKey
  });
  cli.setModel(requestedModel);
}
var init_context = __esm({
  "src/cli/context.ts"() {
    "use strict";
    init_client();
  }
});

// src/cli/transactions.ts
function walletRequestToPendingTx(request) {
  if (request.kind === "transaction") {
    const payload2 = request.payload;
    return {
      kind: "transaction",
      to: payload2.to,
      value: payload2.value,
      data: payload2.data,
      chainId: payload2.chainId,
      timestamp: request.timestamp,
      payload: request.payload
    };
  }
  const payload = request.payload;
  return {
    kind: "eip712_sign",
    description: payload.description,
    timestamp: request.timestamp,
    payload: request.payload
  };
}
function pendingTxToCallList(tx) {
  if (tx.kind !== "transaction" || !tx.to) {
    throw new Error("pending_transaction_missing_call_data");
  }
  return [
    toAAWalletCall({
      to: tx.to,
      value: tx.value,
      data: tx.data,
      chainId: tx.chainId
    })
  ];
}
function toSignedTransactionRecord(tx, execution, from, chainId, timestamp, aaProvider, aaMode) {
  return {
    id: tx.id,
    kind: "transaction",
    txHash: execution.txHash,
    txHashes: execution.txHashes,
    executionKind: execution.executionKind,
    aaProvider,
    aaMode,
    batched: execution.batched,
    sponsored: execution.sponsored,
    AAAddress: execution.AAAddress,
    delegationAddress: execution.delegationAddress,
    from,
    to: tx.to,
    value: tx.value,
    chainId,
    timestamp
  };
}
function formatTxLine(tx, prefix) {
  var _a3;
  const parts = [`${prefix} ${tx.id}`];
  if (tx.kind === "transaction") {
    parts.push(`to: ${(_a3 = tx.to) != null ? _a3 : "?"}`);
    if (tx.value) parts.push(`value: ${tx.value}`);
    if (tx.chainId) parts.push(`chain: ${tx.chainId}`);
    if (tx.data) parts.push(`data: ${tx.data.slice(0, 20)}...`);
  } else {
    parts.push("eip712");
    if (tx.description) parts.push(tx.description);
  }
  parts.push(`(${new Date(tx.timestamp).toLocaleTimeString()})`);
  return parts.join("  ");
}
function formatSignedTxLine(tx, prefix) {
  var _a3;
  const parts = [`${prefix} ${tx.id}`];
  if (tx.kind === "eip712_sign") {
    parts.push(`sig: ${(_a3 = tx.signature) == null ? void 0 : _a3.slice(0, 20)}...`);
    if (tx.description) parts.push(tx.description);
  } else {
    parts.push(`hash: ${tx.txHash}`);
    if (tx.executionKind) parts.push(`exec: ${tx.executionKind}`);
    if (tx.aaProvider) parts.push(`provider: ${tx.aaProvider}`);
    if (tx.aaMode) parts.push(`mode: ${tx.aaMode}`);
    if (tx.txHashes && tx.txHashes.length > 1) {
      parts.push(`txs: ${tx.txHashes.length}`);
    }
    if (tx.sponsored) parts.push("sponsored");
    if (tx.AAAddress) parts.push(`aa: ${tx.AAAddress}`);
    if (tx.delegationAddress) parts.push(`delegation: ${tx.delegationAddress}`);
    if (tx.to) parts.push(`to: ${tx.to}`);
    if (tx.value) parts.push(`value: ${tx.value}`);
  }
  parts.push(`(${new Date(tx.timestamp).toLocaleTimeString()})`);
  return parts.join("  ");
}
var init_transactions = __esm({
  "src/cli/transactions.ts"() {
    "use strict";
    init_wallet_utils();
  }
});

// src/cli/commands/chat.ts
var chat_exports = {};
__export(chat_exports, {
  chatCommand: () => chatCommand
});
async function chatCommand(config, message, verbose) {
  if (!message) {
    fatal("Usage: aomi chat <message>");
  }
  const cli = CliSession.loadOrCreate(config);
  const session = cli.createClientSession();
  try {
    await ingestSecretsForSession(config, cli, session.client);
    await applyRequestedModelIfPresent(config, cli, session);
    const capturedRequests = [];
    let printedAgentCount = 0;
    const seenToolResults = /* @__PURE__ */ new Set();
    session.on("wallet_tx_request", (request) => capturedRequests.push(request));
    session.on(
      "wallet_eip712_request",
      (request) => capturedRequests.push(request)
    );
    session.on("tool_complete", (event) => {
      const name = getToolNameFromEvent(event);
      const result = getToolResultFromEvent(event);
      const key = toToolResultKey(name, result);
      seenToolResults.add(key);
      if (verbose || isAlwaysVisibleTool(name)) {
        printToolComplete(event);
      }
    });
    session.on("tool_update", (event) => {
      if (verbose) {
        printToolUpdate(event);
      }
    });
    if (verbose) {
      session.on("processing_start", () => {
        console.log(`${DIM}\u23F3 Processing\u2026${RESET}`);
      });
      session.on("system_notice", ({ message: msg }) => {
        console.log(`${YELLOW}\u{1F4E2} ${msg}${RESET}`);
      });
      session.on("system_error", ({ message: msg }) => {
        console.log(`\x1B[31m\u274C ${msg}${RESET}`);
      });
    }
    await session.sendAsync(message);
    const allMessages = session.getMessages();
    let seedIdx = allMessages.length;
    for (let i = allMessages.length - 1; i >= 0; i--) {
      if (allMessages[i].sender === "user") {
        seedIdx = i;
        break;
      }
    }
    printedAgentCount = allMessages.slice(0, seedIdx).filter(
      (entry) => entry.sender === "agent" || entry.sender === "assistant"
    ).length;
    if (verbose) {
      printedAgentCount = printNewAgentMessages(
        allMessages,
        printedAgentCount
      );
      session.on("messages", (messages) => {
        printedAgentCount = printNewAgentMessages(messages, printedAgentCount);
      });
    }
    if (session.getIsProcessing()) {
      await new Promise((resolve) => {
        session.on("backend_idle", () => resolve());
        session.on("processing_end", () => resolve());
      });
    }
    const messageToolResults = getMessageToolResults(
      session.getMessages(),
      seedIdx + 1
    );
    if (verbose) {
      for (const tool of messageToolResults) {
        const key = toToolResultKey(tool.name, tool.result);
        if (seenToolResults.has(key)) {
          continue;
        }
        printToolResultLine(tool.name, tool.result);
      }
    } else {
      for (const tool of messageToolResults) {
        const key = toToolResultKey(tool.name, tool.result);
        if (seenToolResults.has(key)) {
          continue;
        }
        if (isAlwaysVisibleTool(tool.name)) {
          printToolResultLine(tool.name, tool.result);
        }
      }
    }
    if (verbose) {
      printedAgentCount = printNewAgentMessages(
        session.getMessages(),
        printedAgentCount
      );
      console.log(`${DIM}\u2705 Done${RESET}`);
    }
    for (const request of capturedRequests) {
      const pending = cli.addPendingTx(walletRequestToPendingTx(request));
      if (!pending) {
        console.log("\u26A0\uFE0F  Duplicate wallet request skipped");
        continue;
      }
      console.log(`\u26A1 Wallet request queued: ${pending.id}`);
      if (request.kind === "transaction") {
        const payload = request.payload;
        console.log(`   to:    ${payload.to}`);
        if (payload.value) console.log(`   value: ${payload.value}`);
        if (payload.chainId) console.log(`   chain: ${payload.chainId}`);
      } else {
        const payload = request.payload;
        if (payload.description) {
          console.log(`   desc:  ${payload.description}`);
        }
      }
    }
    if (!verbose) {
      const agentMessages = session.getMessages().filter(
        (entry) => entry.sender === "agent" || entry.sender === "assistant"
      );
      const last = agentMessages[agentMessages.length - 1];
      if (last == null ? void 0 : last.content) {
        console.log(last.content);
      } else if (capturedRequests.length === 0) {
        console.log("(no response)");
      }
    }
    if (capturedRequests.length > 0) {
      console.log(
        "\nRun `aomi tx` to see pending transactions, `aomi sign <id>` to sign."
      );
    }
  } finally {
    session.close();
  }
}
var init_chat = __esm({
  "src/cli/commands/chat.ts"() {
    "use strict";
    init_cli_session();
    init_output();
    init_context();
    init_errors();
    init_transactions();
  }
});

// src/aa/types.ts
function getAAChainConfig(config, calls, chainsById) {
  if (!config.enabled || calls.length === 0) {
    return null;
  }
  const chainIds = Array.from(new Set(calls.map((call) => call.chainId)));
  if (chainIds.length !== 1) {
    return null;
  }
  const chainId = chainIds[0];
  if (!chainsById[chainId]) {
    return null;
  }
  const chainConfig = config.chains.find((item) => item.chainId === chainId);
  if (!(chainConfig == null ? void 0 : chainConfig.enabled)) {
    return null;
  }
  if (calls.length > 1 && !chainConfig.allowBatching) {
    return null;
  }
  return chainConfig;
}
function buildAAExecutionPlan(config, chainConfig) {
  const mode = chainConfig.supportedModes.includes(chainConfig.defaultMode) ? chainConfig.defaultMode : chainConfig.supportedModes[0];
  if (!mode) {
    throw new Error(`No smart account mode configured for chain ${chainConfig.chainId}`);
  }
  return {
    provider: config.provider,
    chainId: chainConfig.chainId,
    mode,
    batchingEnabled: chainConfig.allowBatching,
    sponsorship: chainConfig.sponsorship,
    fallbackToEoa: config.fallbackToEoa
  };
}
var DEFAULT_AA_CONFIG, DISABLED_PROVIDER_STATE;
var init_types2 = __esm({
  "src/aa/types.ts"() {
    "use strict";
    DEFAULT_AA_CONFIG = {
      enabled: true,
      provider: "alchemy",
      fallbackToEoa: true,
      chains: [
        {
          chainId: 1,
          enabled: true,
          defaultMode: "7702",
          supportedModes: ["4337", "7702"],
          allowBatching: true,
          sponsorship: "optional"
        },
        {
          chainId: 137,
          enabled: true,
          defaultMode: "4337",
          supportedModes: ["4337", "7702"],
          allowBatching: true,
          sponsorship: "optional"
        },
        {
          chainId: 42161,
          enabled: true,
          defaultMode: "4337",
          supportedModes: ["4337", "7702"],
          allowBatching: true,
          sponsorship: "optional"
        },
        {
          chainId: 10,
          enabled: true,
          defaultMode: "4337",
          supportedModes: ["4337", "7702"],
          allowBatching: true,
          sponsorship: "optional"
        },
        {
          chainId: 8453,
          enabled: true,
          defaultMode: "4337",
          supportedModes: ["4337", "7702"],
          allowBatching: true,
          sponsorship: "optional"
        }
      ]
    };
    DISABLED_PROVIDER_STATE = {
      resolved: null,
      account: void 0,
      pending: false,
      error: null
    };
  }
});

// src/aa/execute.ts
async function executeWalletCalls(params) {
  const {
    callList,
    currentChainId,
    capabilities,
    localPrivateKey,
    providerState,
    sendCallsSyncAsync,
    sendTransactionAsync,
    switchChainAsync,
    chainsById,
    getPreferredRpcUrl: getPreferredRpcUrl2
  } = params;
  if (providerState.resolved && providerState.account) {
    return executeViaAA(callList, providerState);
  }
  if (providerState.resolved && providerState.error && !providerState.resolved.fallbackToEoa) {
    throw providerState.error;
  }
  return executeViaEoa({
    callList,
    currentChainId,
    capabilities,
    localPrivateKey,
    sendCallsSyncAsync,
    sendTransactionAsync,
    switchChainAsync,
    chainsById,
    getPreferredRpcUrl: getPreferredRpcUrl2
  });
}
async function executeViaAA(callList, providerState) {
  var _a3;
  const account = providerState.account;
  const resolved = providerState.resolved;
  if (!account || !resolved) {
    throw (_a3 = providerState.error) != null ? _a3 : new Error("smart_account_unavailable");
  }
  const callsPayload = callList.map(({ to, value, data }) => ({ to, value, data }));
  const receipt = callList.length > 1 ? await account.sendBatchTransaction(callsPayload) : await account.sendTransaction(callsPayload[0]);
  const txHash = receipt.transactionHash;
  const providerPrefix = account.provider.toLowerCase();
  let delegationAddress = account.mode === "7702" ? account.delegationAddress : void 0;
  if (account.mode === "7702" && !delegationAddress) {
    delegationAddress = await resolve7702Delegation(txHash, callList);
  }
  return {
    txHash,
    txHashes: [txHash],
    executionKind: `${providerPrefix}_${account.mode}`,
    batched: callList.length > 1,
    sponsored: resolved.sponsorship !== "disabled",
    AAAddress: account.AAAddress,
    delegationAddress
  };
}
async function resolve7702Delegation(txHash, callList) {
  var _a3, _b, _c, _d;
  try {
    const { createPublicClient, http: http2 } = await import("viem");
    const chainId = (_a3 = callList[0]) == null ? void 0 : _a3.chainId;
    if (!chainId) return void 0;
    const chain = CHAINS_BY_ID[chainId];
    if (!chain) return void 0;
    const client = createPublicClient({ chain, transport: http2() });
    const tx = await client.getTransaction({ hash: txHash });
    const authList = tx.authorizationList;
    const target = (_d = (_b = authList == null ? void 0 : authList[0]) == null ? void 0 : _b.address) != null ? _d : (_c = authList == null ? void 0 : authList[0]) == null ? void 0 : _c.contractAddress;
    if (target) {
      return target;
    }
  } catch (e) {
  }
  return void 0;
}
async function executeViaEoa({
  callList,
  currentChainId,
  capabilities,
  localPrivateKey,
  sendCallsSyncAsync,
  sendTransactionAsync,
  switchChainAsync,
  chainsById,
  getPreferredRpcUrl: getPreferredRpcUrl2
}) {
  var _a3, _b;
  const { createPublicClient, createWalletClient: createWalletClient2, http: http2 } = await import("viem");
  const { privateKeyToAccount: privateKeyToAccount5 } = await import("viem/accounts");
  const hashes = [];
  if (localPrivateKey) {
    for (const call of callList) {
      const chain = chainsById[call.chainId];
      if (!chain) {
        throw new Error(`Unsupported chain ${call.chainId}`);
      }
      const rpcUrl = getPreferredRpcUrl2(chain);
      if (!rpcUrl) {
        throw new Error(`No RPC for chain ${call.chainId}`);
      }
      const account = privateKeyToAccount5(localPrivateKey);
      const walletClient = createWalletClient2({
        account,
        chain,
        transport: http2(rpcUrl)
      });
      const hash = await walletClient.sendTransaction({
        account,
        to: call.to,
        value: call.value,
        data: call.data
      });
      const publicClient = createPublicClient({
        chain,
        transport: http2(rpcUrl)
      });
      await publicClient.waitForTransactionReceipt({ hash });
      hashes.push(hash);
    }
    return {
      txHash: hashes[hashes.length - 1],
      txHashes: hashes,
      executionKind: "eoa",
      batched: hashes.length > 1,
      sponsored: false
    };
  }
  const chainIds = Array.from(new Set(callList.map((call) => call.chainId)));
  if (chainIds.length > 1) {
    throw new Error("mixed_chain_bundle_not_supported");
  }
  const chainId = chainIds[0];
  if (currentChainId !== chainId) {
    await switchChainAsync({ chainId });
  }
  const chainCaps = capabilities == null ? void 0 : capabilities[`eip155:${chainId}`];
  const atomicStatus = (_a3 = chainCaps == null ? void 0 : chainCaps.atomic) == null ? void 0 : _a3.status;
  const canUseSendCalls = atomicStatus === "supported" || atomicStatus === "ready";
  if (canUseSendCalls) {
    const batchResult = await sendCallsSyncAsync({
      calls: callList.map(({ to, value, data }) => ({ to, value, data })),
      capabilities: {
        atomic: {
          required: true
        }
      }
    });
    const receipts = (_b = batchResult.receipts) != null ? _b : [];
    for (const receipt of receipts) {
      if (receipt.transactionHash) {
        hashes.push(receipt.transactionHash);
      }
    }
  } else {
    for (const call of callList) {
      const hash = await sendTransactionAsync({
        chainId: call.chainId,
        to: call.to,
        value: call.value,
        data: call.data
      });
      hashes.push(hash);
    }
  }
  return {
    txHash: hashes[hashes.length - 1],
    txHashes: hashes,
    executionKind: "eoa",
    batched: hashes.length > 1,
    sponsored: false
  };
}
var init_execute = __esm({
  "src/aa/execute.ts"() {
    "use strict";
    init_chains();
  }
});

// src/aa/alchemy/provider.ts
var init_provider = __esm({
  "src/aa/alchemy/provider.ts"() {
    "use strict";
    init_types2();
  }
});

// src/aa/adapt.ts
function adaptSmartAccount(account) {
  const delegationAddress = account.mode === "7702" && account.delegationAddress && account.smartAccountAddress && account.delegationAddress.toLowerCase() === account.smartAccountAddress.toLowerCase() ? void 0 : account.delegationAddress;
  return {
    provider: account.provider,
    mode: account.mode,
    AAAddress: account.smartAccountAddress,
    delegationAddress,
    sendTransaction: async (call) => {
      const receipt = await account.sendTransaction(call);
      return { transactionHash: receipt.transactionHash };
    },
    sendBatchTransaction: async (calls) => {
      const receipt = await account.sendBatchTransaction(calls);
      return { transactionHash: receipt.transactionHash };
    }
  };
}
var init_adapt = __esm({
  "src/aa/adapt.ts"() {
    "use strict";
  }
});

// src/aa/owner.ts
import { privateKeyToAccount } from "viem/accounts";
function getDirectOwnerParams(owner) {
  return {
    kind: "ready",
    ownerParams: {
      para: void 0,
      signer: privateKeyToAccount(owner.privateKey)
    }
  };
}
function getParaSessionOwnerParams(owner) {
  if (owner.signer) {
    return {
      kind: "ready",
      ownerParams: __spreadValues({
        para: owner.session,
        signer: owner.signer
      }, owner.address ? { address: owner.address } : {})
    };
  }
  return {
    kind: "ready",
    ownerParams: __spreadValues({
      para: owner.session
    }, owner.address ? { address: owner.address } : {})
  };
}
function getSessionOwnerParams(owner) {
  switch (owner.adapter) {
    case "para":
      return getParaSessionOwnerParams(owner);
    default:
      return { kind: "unsupported_adapter", adapter: owner.adapter };
  }
}
function getOwnerParams(owner) {
  if (!owner) {
    return { kind: "missing" };
  }
  switch (owner.kind) {
    case "direct":
      return getDirectOwnerParams(owner);
    case "session":
      return getSessionOwnerParams(owner);
  }
}
function getMissingOwnerState(resolved, provider) {
  return {
    resolved,
    account: null,
    pending: false,
    error: new Error(
      `${provider} AA account creation requires a direct owner or a supported session owner.`
    )
  };
}
function getUnsupportedAdapterState(resolved, adapter) {
  return {
    resolved,
    account: null,
    pending: false,
    error: new Error(`Session adapter "${adapter}" is not implemented.`)
  };
}
var init_owner = __esm({
  "src/aa/owner.ts"() {
    "use strict";
  }
});

// src/aa/alchemy/create.ts
import { privateKeyToAccount as privateKeyToAccount2 } from "viem/accounts";
function alchemyRpcUrl(chainId, apiKey) {
  var _a3;
  const slug = (_a3 = ALCHEMY_CHAIN_SLUGS[chainId]) != null ? _a3 : "eth-mainnet";
  return `https://${slug}.g.alchemy.com/v2/${apiKey}`;
}
function aaDebug(message, fields) {
  if (!AA_DEBUG_ENABLED) return;
  if (fields) {
    console.debug(`[aomi][aa][alchemy] ${message}`, fields);
    return;
  }
  console.debug(`[aomi][aa][alchemy] ${message}`);
}
function extractExistingAccountAddress(error) {
  var _a3;
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/Account with address (0x[a-fA-F0-9]{40}) already exists/);
  return (_a3 = match == null ? void 0 : match[1]) != null ? _a3 : null;
}
function deriveAlchemy4337AccountId(address) {
  var _a3;
  const hex = address.toLowerCase().slice(2).padEnd(32, "0").slice(0, 32).split("");
  const namespace = ["4", "3", "3", "7", "5", "a", "a", "b"];
  for (let i = 0; i < namespace.length; i += 1) {
    hex[i] = namespace[i];
  }
  hex[12] = "4";
  const variant = Number.parseInt((_a3 = hex[16]) != null ? _a3 : "0", 16);
  hex[16] = (variant & 3 | 8).toString(16);
  return [
    hex.slice(0, 8).join(""),
    hex.slice(8, 12).join(""),
    hex.slice(12, 16).join(""),
    hex.slice(16, 20).join(""),
    hex.slice(20, 32).join("")
  ].join("-");
}
async function createAlchemyAAState(options) {
  var _a3, _b;
  const {
    chain,
    owner,
    callList,
    mode,
    sponsored = true
  } = options;
  const chainConfig = getAAChainConfig(DEFAULT_AA_CONFIG, callList, {
    [chain.id]: chain
  });
  if (!chainConfig) {
    throw new Error(`AA is not configured for chain ${chain.id}.`);
  }
  const effectiveMode = mode != null ? mode : chainConfig.defaultMode;
  const plan = buildAAExecutionPlan(
    __spreadProps(__spreadValues({}, DEFAULT_AA_CONFIG), { provider: "alchemy" }),
    __spreadProps(__spreadValues({}, chainConfig), { defaultMode: effectiveMode })
  );
  const gasPolicyId = sponsored ? (_b = options.gasPolicyId) != null ? _b : (_a3 = process.env.ALCHEMY_GAS_POLICY_ID) == null ? void 0 : _a3.trim() : void 0;
  const execution = __spreadProps(__spreadValues({}, plan), {
    mode: effectiveMode,
    sponsorship: gasPolicyId ? plan.sponsorship : "disabled",
    fallbackToEoa: false
  });
  const ownerParams = getOwnerParams(owner);
  if (ownerParams.kind === "missing") {
    return getMissingOwnerState(execution, "alchemy");
  }
  if (ownerParams.kind === "unsupported_adapter") {
    return getUnsupportedAdapterState(execution, ownerParams.adapter);
  }
  if (owner.kind === "direct") {
    const directParams = {
      resolved: execution,
      chain,
      privateKey: owner.privateKey,
      apiKey: options.apiKey,
      proxyBaseUrl: options.proxyBaseUrl,
      gasPolicyId
    };
    try {
      return await (execution.mode === "7702" ? createAlchemy7702State(directParams) : createAlchemy4337State(directParams));
    } catch (error) {
      return {
        resolved: execution,
        account: null,
        pending: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  if (!options.apiKey) {
    return {
      resolved: execution,
      account: null,
      pending: false,
      error: new Error(
        "Alchemy AA with session/adapter owner requires ALCHEMY_API_KEY."
      )
    };
  }
  try {
    const { createAlchemySmartAccount } = await import("@getpara/aa-alchemy");
    const smartAccount = await createAlchemySmartAccount(__spreadProps(__spreadValues({}, ownerParams.ownerParams), {
      apiKey: options.apiKey,
      gasPolicyId,
      chain,
      rpcUrl: options.rpcUrl,
      mode: execution.mode
    }));
    if (!smartAccount) {
      return {
        resolved: execution,
        account: null,
        pending: false,
        error: new Error("Alchemy AA account could not be initialized.")
      };
    }
    return {
      resolved: execution,
      account: adaptSmartAccount(smartAccount),
      pending: false,
      error: null
    };
  } catch (error) {
    return {
      resolved: execution,
      account: null,
      pending: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
async function createAlchemy4337State(params) {
  const { createSmartWalletClient, alchemyWalletTransport } = await import("@alchemy/wallet-apis");
  const transport = params.proxyBaseUrl ? alchemyWalletTransport({ url: params.proxyBaseUrl }) : alchemyWalletTransport({ apiKey: params.apiKey });
  const signer = privateKeyToAccount2(params.privateKey);
  const alchemyClient = createSmartWalletClient(__spreadValues({
    transport,
    chain: params.chain,
    signer
  }, params.gasPolicyId ? { paymaster: { policyId: params.gasPolicyId } } : {}));
  const signerAddress = signer.address;
  const accountId = deriveAlchemy4337AccountId(signerAddress);
  aaDebug("4337:requestAccount:start", {
    signerAddress,
    chainId: params.chain.id,
    accountId,
    hasGasPolicyId: Boolean(params.gasPolicyId)
  });
  let account;
  try {
    account = await alchemyClient.requestAccount({
      signerAddress,
      id: accountId,
      creationHint: {
        accountType: "sma-b",
        createAdditional: true
      }
    });
  } catch (error) {
    const existingAccountAddress = extractExistingAccountAddress(error);
    if (!existingAccountAddress) {
      throw error;
    }
    aaDebug("4337:requestAccount:existing-account", {
      existingAccountAddress
    });
    account = await alchemyClient.requestAccount({
      accountAddress: existingAccountAddress
    });
  }
  const accountAddress = account.address;
  aaDebug("4337:requestAccount:done", { signerAddress, accountAddress });
  const sendCalls = async (calls) => {
    var _a3, _b, _c, _d;
    aaDebug("4337:sendCalls:start", {
      signerAddress,
      accountAddress,
      chainId: params.chain.id,
      callCount: calls.length,
      hasGasPolicyId: Boolean(params.gasPolicyId)
    });
    try {
      const result = await alchemyClient.sendCalls({
        account: accountAddress,
        calls
      });
      aaDebug("4337:sendCalls:submitted", { callId: result.id });
      const status = await alchemyClient.waitForCallsStatus({ id: result.id });
      const transactionHash = (_b = (_a3 = status.receipts) == null ? void 0 : _a3[0]) == null ? void 0 : _b.transactionHash;
      aaDebug("4337:sendCalls:receipt", {
        callId: result.id,
        hasTransactionHash: Boolean(transactionHash),
        receipts: (_d = (_c = status.receipts) == null ? void 0 : _c.length) != null ? _d : 0
      });
      if (!transactionHash) {
        throw new Error("Alchemy Wallets API did not return a transaction hash.");
      }
      return { transactionHash };
    } catch (error) {
      aaDebug("4337:sendCalls:error", {
        signerAddress,
        accountAddress,
        chainId: params.chain.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  };
  const smartAccount = {
    provider: "alchemy",
    mode: "4337",
    AAAddress: accountAddress,
    sendTransaction: async (call) => sendCalls([call]),
    sendBatchTransaction: async (calls) => sendCalls(calls)
  };
  return {
    resolved: params.resolved,
    account: smartAccount,
    pending: false,
    error: null
  };
}
async function createAlchemy7702State(params) {
  const { createWalletClient: createWalletClient2, createPublicClient, http: http2 } = await import("viem");
  const { encodeExecuteData } = await import("viem/experimental/erc7821");
  if (params.gasPolicyId) {
    aaDebug(
      "7702:gas-policy-ignored",
      { gasPolicyId: params.gasPolicyId }
    );
    console.warn(
      "\u26A0\uFE0F  Gas policy is not supported for raw EIP-7702 transactions. The signer's EOA pays gas directly."
    );
  }
  const signer = privateKeyToAccount2(params.privateKey);
  const signerAddress = signer.address;
  let rpcUrl;
  if (params.proxyBaseUrl) {
    rpcUrl = params.proxyBaseUrl;
  } else if (params.apiKey) {
    rpcUrl = alchemyRpcUrl(params.chain.id, params.apiKey);
  }
  const walletClient = createWalletClient2({
    account: signer,
    chain: params.chain,
    transport: http2(rpcUrl)
  });
  const publicClient = createPublicClient({
    chain: params.chain,
    transport: http2(rpcUrl)
  });
  const send7702 = async (calls) => {
    aaDebug("7702:send:start", {
      signerAddress,
      chainId: params.chain.id,
      callCount: calls.length,
      calls: calls.map((call) => {
        var _a3;
        return {
          to: call.to,
          value: call.value.toString(),
          data: (_a3 = call.data) != null ? _a3 : "0x"
        };
      })
    });
    const authorization = await walletClient.signAuthorization({
      contractAddress: ALCHEMY_7702_DELEGATION_ADDRESS
    });
    aaDebug("7702:authorization-signed", {
      contractAddress: ALCHEMY_7702_DELEGATION_ADDRESS
    });
    const data = encodeExecuteData({
      calls: calls.map((call) => {
        var _a3;
        return {
          to: call.to,
          value: call.value,
          data: (_a3 = call.data) != null ? _a3 : "0x"
        };
      })
    });
    aaDebug("7702:calldata-encoded", { dataLength: data.length });
    const gasEstimate = await publicClient.estimateGas({
      account: signer,
      to: signerAddress,
      data,
      authorizationList: [authorization]
    });
    const gas = gasEstimate + EIP_7702_AUTH_GAS_OVERHEAD;
    aaDebug("7702:gas-estimated", {
      estimate: gasEstimate.toString(),
      total: gas.toString()
    });
    const hash = await walletClient.sendTransaction({
      to: signerAddress,
      data,
      gas,
      authorizationList: [authorization]
    });
    aaDebug("7702:tx-sent", { hash });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    aaDebug("7702:tx-confirmed", {
      hash,
      status: receipt.status,
      gasUsed: receipt.gasUsed.toString()
    });
    if (receipt.status === "reverted") {
      throw new Error(`EIP-7702 transaction reverted: ${hash}`);
    }
    return { transactionHash: hash };
  };
  const smartAccount = {
    provider: "alchemy",
    mode: "7702",
    AAAddress: signerAddress,
    delegationAddress: ALCHEMY_7702_DELEGATION_ADDRESS,
    sendTransaction: async (call) => send7702([call]),
    sendBatchTransaction: async (calls) => send7702(calls)
  };
  return {
    resolved: params.resolved,
    account: smartAccount,
    pending: false,
    error: null
  };
}
var ALCHEMY_7702_DELEGATION_ADDRESS, AA_DEBUG_ENABLED, EIP_7702_AUTH_GAS_OVERHEAD;
var init_create = __esm({
  "src/aa/alchemy/create.ts"() {
    "use strict";
    init_adapt();
    init_types2();
    init_owner();
    init_chains();
    ALCHEMY_7702_DELEGATION_ADDRESS = "0x69007702764179f14F51cdce752f4f775d74E139";
    AA_DEBUG_ENABLED = process.env.AOMI_AA_DEBUG === "1";
    EIP_7702_AUTH_GAS_OVERHEAD = BigInt(25e3);
  }
});

// src/aa/alchemy/index.ts
var init_alchemy = __esm({
  "src/aa/alchemy/index.ts"() {
    "use strict";
    init_provider();
    init_create();
  }
});

// src/aa/pimlico/resolve.ts
var init_resolve = __esm({
  "src/aa/pimlico/resolve.ts"() {
    "use strict";
    init_types2();
  }
});

// src/aa/pimlico/provider.ts
var init_provider2 = __esm({
  "src/aa/pimlico/provider.ts"() {
    "use strict";
    init_types2();
    init_resolve();
  }
});

// src/aa/pimlico/create.ts
import { privateKeyToAccount as privateKeyToAccount3 } from "viem/accounts";
function pimDebug(message, fields) {
  if (!AA_DEBUG_ENABLED2) return;
  if (fields) {
    console.debug(`[aomi][aa][pimlico] ${message}`, fields);
    return;
  }
  console.debug(`[aomi][aa][pimlico] ${message}`);
}
async function createPimlicoAAState(options) {
  var _a3, _b;
  const { chain, owner, callList, mode } = options;
  const chainConfig = getAAChainConfig(DEFAULT_AA_CONFIG, callList, {
    [chain.id]: chain
  });
  if (!chainConfig) {
    throw new Error(`AA is not configured for chain ${chain.id}.`);
  }
  const effectiveMode = mode != null ? mode : chainConfig.defaultMode;
  const plan = buildAAExecutionPlan(
    __spreadProps(__spreadValues({}, DEFAULT_AA_CONFIG), { provider: "pimlico" }),
    __spreadProps(__spreadValues({}, chainConfig), { defaultMode: effectiveMode })
  );
  const apiKey = (_b = options.apiKey) != null ? _b : (_a3 = process.env.PIMLICO_API_KEY) == null ? void 0 : _a3.trim();
  if (!apiKey) {
    throw new Error("Pimlico AA requires PIMLICO_API_KEY.");
  }
  const execution = __spreadProps(__spreadValues({}, plan), {
    mode: effectiveMode,
    fallbackToEoa: false
  });
  const ownerParams = getOwnerParams(owner);
  if (ownerParams.kind === "missing") {
    return getMissingOwnerState(execution, "pimlico");
  }
  if (ownerParams.kind === "unsupported_adapter") {
    return getUnsupportedAdapterState(execution, ownerParams.adapter);
  }
  if (owner.kind === "direct") {
    try {
      return await createPimlicoDirectState({
        resolved: execution,
        chain,
        privateKey: owner.privateKey,
        rpcUrl: options.rpcUrl,
        apiKey,
        mode: effectiveMode
      });
    } catch (error) {
      return {
        resolved: execution,
        account: null,
        pending: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  try {
    const { createPimlicoSmartAccount } = await import("@getpara/aa-pimlico");
    const smartAccount = await createPimlicoSmartAccount(__spreadProps(__spreadValues({}, ownerParams.ownerParams), {
      apiKey,
      chain,
      rpcUrl: options.rpcUrl,
      mode: execution.mode
    }));
    if (!smartAccount) {
      return {
        resolved: execution,
        account: null,
        pending: false,
        error: new Error("Pimlico AA account could not be initialized.")
      };
    }
    return {
      resolved: execution,
      account: adaptSmartAccount(smartAccount),
      pending: false,
      error: null
    };
  } catch (error) {
    return {
      resolved: execution,
      account: null,
      pending: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
function buildPimlicoRpcUrl(chain, apiKey) {
  const slug = chain.name.toLowerCase().replace(/\s+/g, "-");
  return `https://api.pimlico.io/v2/${slug}/rpc?apikey=${apiKey}`;
}
async function createPimlicoDirectState(params) {
  const { createSmartAccountClient } = await import("permissionless");
  const { toSimpleSmartAccount } = await import("permissionless/accounts");
  const { createPimlicoClient } = await import("permissionless/clients/pimlico");
  const { createPublicClient, http: http2 } = await import("viem");
  const { entryPoint07Address } = await import("viem/account-abstraction");
  const signer = privateKeyToAccount3(params.privateKey);
  const signerAddress = signer.address;
  const pimlicoRpcUrl = buildPimlicoRpcUrl(params.chain, params.apiKey);
  pimDebug("4337:start", {
    signerAddress,
    chainId: params.chain.id,
    pimlicoRpcUrl: pimlicoRpcUrl.replace(params.apiKey, "***")
  });
  const publicClient = createPublicClient({
    chain: params.chain,
    transport: http2(params.rpcUrl)
  });
  const paymasterClient = createPimlicoClient({
    entryPoint: { address: entryPoint07Address, version: "0.7" },
    transport: http2(pimlicoRpcUrl)
  });
  const smartAccount = await toSimpleSmartAccount({
    client: publicClient,
    owner: signer,
    entryPoint: { address: entryPoint07Address, version: "0.7" }
  });
  const accountAddress = smartAccount.address;
  pimDebug("4337:account-created", {
    signerAddress,
    accountAddress
  });
  const smartAccountClient = createSmartAccountClient({
    account: smartAccount,
    chain: params.chain,
    paymaster: paymasterClient,
    bundlerTransport: http2(pimlicoRpcUrl),
    userOperation: {
      estimateFeesPerGas: async () => {
        const gasPrice = await paymasterClient.getUserOperationGasPrice();
        return gasPrice.fast;
      }
    }
  });
  const sendCalls = async (calls) => {
    pimDebug("4337:send:start", {
      accountAddress,
      chainId: params.chain.id,
      callCount: calls.length
    });
    const hash = await smartAccountClient.sendTransaction({
      account: smartAccount,
      calls: calls.map((c) => {
        var _a3;
        return {
          to: c.to,
          value: c.value,
          data: (_a3 = c.data) != null ? _a3 : "0x"
        };
      })
    });
    pimDebug("4337:send:userOpHash", { hash });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash
    });
    pimDebug("4337:send:confirmed", {
      transactionHash: receipt.transactionHash,
      status: receipt.status
    });
    return { transactionHash: receipt.transactionHash };
  };
  const account = {
    provider: "pimlico",
    mode: "4337",
    AAAddress: accountAddress,
    sendTransaction: async (call) => sendCalls([call]),
    sendBatchTransaction: async (calls) => sendCalls(calls)
  };
  return {
    resolved: params.resolved,
    account,
    pending: false,
    error: null
  };
}
var AA_DEBUG_ENABLED2;
var init_create2 = __esm({
  "src/aa/pimlico/create.ts"() {
    "use strict";
    init_adapt();
    init_types2();
    init_owner();
    AA_DEBUG_ENABLED2 = process.env.AOMI_AA_DEBUG === "1";
  }
});

// src/aa/pimlico/index.ts
var init_pimlico = __esm({
  "src/aa/pimlico/index.ts"() {
    "use strict";
    init_resolve();
    init_provider2();
    init_create2();
  }
});

// src/aa/create.ts
async function createAAProviderState(options) {
  if (options.provider === "alchemy") {
    return createAlchemyAAState({
      chain: options.chain,
      owner: options.owner,
      rpcUrl: options.rpcUrl,
      callList: options.callList,
      mode: options.mode,
      apiKey: options.apiKey,
      gasPolicyId: options.gasPolicyId,
      sponsored: options.sponsored,
      proxyBaseUrl: options.proxyBaseUrl
    });
  }
  return createPimlicoAAState({
    chain: options.chain,
    owner: options.owner,
    rpcUrl: options.rpcUrl,
    callList: options.callList,
    mode: options.mode,
    apiKey: options.apiKey
  });
}
var init_create3 = __esm({
  "src/aa/create.ts"() {
    "use strict";
    init_create();
    init_create2();
  }
});

// src/aa/index.ts
var init_aa = __esm({
  "src/aa/index.ts"() {
    "use strict";
    init_types2();
    init_execute();
    init_alchemy();
    init_pimlico();
    init_adapt();
    init_create3();
  }
});

// src/cli/execution.ts
function callsContainTokenOperations(calls) {
  return calls.some(
    (call) => call.data && ERC20_SELECTORS.has(call.data.slice(0, 10).toLowerCase())
  );
}
function maybeOverride4337ForTokenOps(params) {
  const { mode, callList, chain, explicitMode } = params;
  if (mode !== "4337" || !callsContainTokenOperations(callList)) {
    return { mode, warned: false };
  }
  const chainConfig = getAAChainConfig(DEFAULT_AA_CONFIG, callList, {
    [chain.id]: chain
  });
  if ((chainConfig == null ? void 0 : chainConfig.supportedModes.includes("7702")) && !explicitMode) {
    console.log(
      "\u26A0\uFE0F  4337 batch contains ERC-20 calls but tokens are in your EOA, not the 4337 smart account."
    );
    console.log("   Switching to 7702 (EOA keeps smart-account capabilities, no token transfer needed).");
    return { mode: "7702", warned: true };
  }
  console.log(
    "\u26A0\uFE0F  4337 batch contains ERC-20 calls. Tokens must be in the smart account, not your EOA."
  );
  console.log(
    "   This batch may revert. Consider transferring tokens to the smart account first."
  );
  return { mode, warned: true };
}
function resolveMode(chain, callList, explicitMode) {
  var _a3;
  const chainConfig = getAAChainConfig(DEFAULT_AA_CONFIG, callList, {
    [chain.id]: chain
  });
  const baseMode = (_a3 = explicitMode != null ? explicitMode : chainConfig == null ? void 0 : chainConfig.defaultMode) != null ? _a3 : "7702";
  const { mode } = maybeOverride4337ForTokenOps({
    mode: baseMode,
    callList,
    chain,
    explicitMode: Boolean(explicitMode)
  });
  return mode;
}
function resolveCliExecutionDecision(params) {
  var _a3, _b;
  const { config, chain, callList } = params;
  if (config.execution === "eoa") {
    return { execution: "eoa" };
  }
  const pimlicoKey = (_a3 = process.env.PIMLICO_API_KEY) == null ? void 0 : _a3.trim();
  const alchemyKey = (_b = process.env.ALCHEMY_API_KEY) == null ? void 0 : _b.trim();
  if (pimlicoKey && config.aaProvider === "pimlico") {
    const aaMode2 = resolveMode(chain, callList, config.aaMode);
    return { execution: "aa", provider: "pimlico", aaMode: aaMode2, apiKey: pimlicoKey };
  }
  if (alchemyKey) {
    const aaMode2 = resolveMode(chain, callList, config.aaMode);
    return { execution: "aa", provider: "alchemy", aaMode: aaMode2, apiKey: alchemyKey };
  }
  const aaMode = resolveMode(chain, callList, config.aaMode);
  return { execution: "aa", provider: "alchemy", aaMode, proxy: true };
}
function getAlternativeAAMode(decision) {
  if (decision.execution !== "aa") return null;
  const alt = decision.aaMode === "7702" ? "4337" : "7702";
  return __spreadProps(__spreadValues({}, decision), { aaMode: alt });
}
async function createCliProviderState(params) {
  const { decision, chain, privateKey, rpcUrl, callList, baseUrl } = params;
  if (decision.execution === "eoa") {
    return DISABLED_PROVIDER_STATE;
  }
  const chainSlug = ALCHEMY_CHAIN_SLUGS[chain.id];
  const proxyBaseUrl = decision.proxy && chainSlug ? `${baseUrl}/aa/v1/${chainSlug}` : void 0;
  return createAAProviderState({
    provider: decision.provider,
    chain,
    owner: { kind: "direct", privateKey },
    rpcUrl,
    callList,
    mode: decision.aaMode,
    apiKey: decision.apiKey,
    proxyBaseUrl
  });
}
function describeExecutionDecision(decision) {
  if (decision.execution === "eoa") {
    return "eoa";
  }
  const suffix = decision.proxy ? ", proxy" : "";
  return `aa (${decision.provider}, ${decision.aaMode}${suffix})`;
}
var ERC20_SELECTORS;
var init_execution = __esm({
  "src/cli/execution.ts"() {
    "use strict";
    init_aa();
    init_chains();
    ERC20_SELECTORS = /* @__PURE__ */ new Set([
      "0x095ea7b3",
      // approve(address,uint256)
      "0xa9059cbb",
      // transfer(address,uint256)
      "0x23b872dd"
      // transferFrom(address,address,uint256)
    ]);
  }
});

// src/cli/commands/wallet.ts
var wallet_exports = {};
__export(wallet_exports, {
  signCommand: () => signCommand,
  txCommand: () => txCommand
});
import { createWalletClient, http } from "viem";
import { privateKeyToAccount as privateKeyToAccount4 } from "viem/accounts";
import * as viemChains from "viem/chains";
import { getAddress as getAddress2 } from "viem";
function validateAndBuildFeeCall(fee, chainId) {
  let recipient;
  try {
    recipient = getAddress2(fee.recipient);
  } catch (e) {
    throw new Error(
      `Invalid fee recipient address from backend: ${fee.recipient}`
    );
  }
  const amountWei = BigInt(fee.amount_wei);
  if (amountWei <= /* @__PURE__ */ BigInt("0")) {
    throw new Error(`Invalid fee amount: ${fee.amount_wei}`);
  }
  if (amountWei > MAX_AUTO_FEE_WEI) {
    const feeEth2 = (Number(amountWei) / 1e18).toFixed(6);
    throw new Error(
      `Fee of ${feeEth2} ETH exceeds safety limit of ${Number(MAX_AUTO_FEE_WEI) / 1e18} ETH. Aborting.`
    );
  }
  const feeEth = (Number(amountWei) / 1e18).toFixed(6);
  console.log(`Fee:     ${feeEth} ETH \u2192 ${recipient}`);
  return toAAWalletCall({
    to: recipient,
    value: fee.amount_wei,
    chainId
  });
}
function txCommand() {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  const pending = [...cli.pendingTxs];
  const signed = [...cli.signedTxs];
  if (pending.length === 0 && signed.length === 0) {
    console.log("No transactions.");
    printDataFileLocation();
    return;
  }
  if (pending.length > 0) {
    console.log(`Pending (${pending.length}):`);
    for (const tx of pending) {
      console.log(formatTxLine(tx, "  \u23F3"));
    }
  }
  if (signed.length > 0) {
    if (pending.length > 0) console.log();
    console.log(`Signed (${signed.length}):`);
    for (const tx of signed) {
      console.log(formatSignedTxLine(tx, "  \u2705"));
    }
  }
  printDataFileLocation();
}
function resolveChain(targetChainId, rpcUrl) {
  var _a3;
  return (_a3 = Object.values(viemChains).find(
    (candidate) => typeof candidate === "object" && candidate !== null && "id" in candidate && candidate.id === targetChainId
  )) != null ? _a3 : {
    id: targetChainId,
    name: `Chain ${targetChainId}`,
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrls: {
      default: {
        http: rpcUrl ? [rpcUrl] : []
      }
    }
  };
}
function getPreferredRpcUrl(chain, override) {
  var _a3, _b, _c;
  return (_c = (_b = override != null ? override : chain.rpcUrls.default.http[0]) != null ? _b : (_a3 = chain.rpcUrls.public) == null ? void 0 : _a3.http[0]) != null ? _c : "";
}
async function executeCliTransaction(params) {
  const { privateKey, currentChainId, chainsById, rpcUrl, providerState, callList } = params;
  const unsupportedWalletMethod = async () => {
    throw new Error("wallet_client_path_unavailable_in_cli_private_key_mode");
  };
  return executeWalletCalls({
    callList,
    currentChainId,
    capabilities: void 0,
    localPrivateKey: privateKey,
    providerState,
    sendCallsSyncAsync: unsupportedWalletMethod,
    sendTransactionAsync: unsupportedWalletMethod,
    switchChainAsync: async () => void 0,
    chainsById,
    getPreferredRpcUrl: (resolvedChain) => getPreferredRpcUrl(resolvedChain, rpcUrl)
  });
}
async function signCommand(config, txIds) {
  var _a3, _b, _c, _d;
  if (txIds.length === 0) {
    fatal(
      "Usage: aomi sign <tx-id> [<tx-id> ...]\nRun `aomi tx` to see pending transaction IDs."
    );
  }
  const privateKey = config.privateKey;
  if (!privateKey) {
    fatal(
      [
        "Private key required for `aomi sign`.",
        "Pass one of:",
        "  --private-key <hex-key>",
        "  PRIVATE_KEY=<hex-key> aomi sign <tx-id>"
      ].join("\n")
    );
  }
  const cli = CliSession.load();
  if (!cli) {
    fatal("No active session. Run `aomi chat` first.");
  }
  cli.mergeConfig(config);
  const pendingTxs = cli.requirePendingTxs(txIds);
  const session = cli.createClientSession();
  try {
    const account = privateKeyToAccount4(privateKey);
    if (cli.publicKey && account.address.toLowerCase() !== cli.publicKey.toLowerCase()) {
      console.log(
        `\u26A0\uFE0F  Signer ${account.address} differs from session public key ${cli.publicKey}`
      );
      console.log("   Updating session to match the signing key...");
    }
    const rpcUrl = config.chainRpcUrl;
    const resolvedChainIds = pendingTxs.map((tx) => {
      var _a4, _b2;
      return (_b2 = (_a4 = tx.chainId) != null ? _a4 : cli.chainId) != null ? _b2 : 1;
    });
    const primaryChainId = resolvedChainIds[0];
    const chain = resolveChain(primaryChainId, rpcUrl);
    const resolvedRpcUrl = getPreferredRpcUrl(chain, rpcUrl);
    const chainsById = Object.fromEntries(
      Array.from(new Set(resolvedChainIds)).map((chainId) => [
        chainId,
        resolveChain(chainId, rpcUrl)
      ])
    );
    console.log(`Signer:  ${account.address}`);
    console.log(`IDs:     ${pendingTxs.map((tx) => tx.id).join(", ")}`);
    let signedRecords = [];
    let backendNotifications = [];
    if (pendingTxs.every((tx) => tx.kind === "transaction")) {
      console.log(`Kind:    transaction${pendingTxs.length > 1 ? " (batch)" : ""}`);
      for (const tx of pendingTxs) {
        console.log(`Tx:      ${tx.id} -> ${tx.to}`);
        if (tx.value) console.log(`Value:   ${tx.value}`);
        if ((_a3 = tx.chainId) != null ? _a3 : cli.chainId) console.log(`Chain:   ${(_b = tx.chainId) != null ? _b : cli.chainId}`);
        if (tx.data) {
          console.log(`Data:    ${tx.data.slice(0, 40)}...`);
        }
      }
      console.log();
      const callList = pendingTxs.flatMap(
        (tx, index) => pendingTxToCallList(__spreadProps(__spreadValues({}, tx), {
          chainId: resolvedChainIds[index]
        }))
      );
      if (callList.length > 1 && rpcUrl && new Set(callList.map((call) => call.chainId)).size > 1) {
        fatal("A single `--rpc-url` override cannot be used for a mixed-chain multi-sign request.");
      }
      let simFee;
      try {
        const simResponse = await session.client.simulateBatch(
          cli.sessionId,
          pendingTxs.map((tx) => {
            var _a4, _b2;
            return {
              to: (_a4 = tx.to) != null ? _a4 : "",
              value: tx.value,
              data: tx.data,
              label: (_b2 = tx.description) != null ? _b2 : tx.id
            };
          }),
          {
            from: account.address,
            chainId: primaryChainId
          }
        );
        const { result: sim } = simResponse;
        if (!sim.batch_success) {
          const failed = sim.steps.find((s) => !s.success);
          console.log(
            `\x1B[31m\u274C Simulation failed at step ${(_c = failed == null ? void 0 : failed.step) != null ? _c : "?"}: ${(_d = failed == null ? void 0 : failed.revert_reason) != null ? _d : "unknown"}${RESET}`
          );
        }
        simFee = sim.fee;
      } catch (e) {
        if (e instanceof CliExit) throw e;
        console.log(
          `${DIM}Simulation unavailable, skipping fee injection.${RESET}`
        );
      }
      if (simFee) {
        const feeCall = validateAndBuildFeeCall(simFee, primaryChainId);
        callList.push(feeCall);
      }
      const decision = resolveCliExecutionDecision({
        config,
        chain,
        callList
      });
      console.log(`Exec:    ${describeExecutionDecision(decision)}`);
      let finalDecision = decision;
      let execution;
      const runWithDecision = async (d) => {
        const ps = await createCliProviderState({
          decision: d,
          chain,
          privateKey,
          rpcUrl: rpcUrl != null ? rpcUrl : "",
          callList
        });
        return executeCliTransaction({
          privateKey,
          currentChainId: primaryChainId,
          chainsById,
          rpcUrl,
          providerState: ps,
          callList
        });
      };
      try {
        execution = await runWithDecision(decision);
      } catch (primaryError) {
        const alt = getAlternativeAAMode(decision);
        if (!alt) throw primaryError;
        const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
        console.log(`AA ${decision.execution === "aa" ? decision.aaMode : "execution"} failed: ${primaryMsg}`);
        console.log(`Retrying with ${alt.execution === "aa" ? alt.aaMode : "eoa"}...`);
        try {
          execution = await runWithDecision(alt);
          finalDecision = alt;
        } catch (retryError) {
          const retryMsg = retryError instanceof Error ? retryError.message : String(retryError);
          fatal(
            `\u274C AA execution failed with both modes.
  ${decision.execution === "aa" ? decision.aaMode : ""}: ${primaryMsg}
  ${alt.execution === "aa" ? alt.aaMode : ""}: ${retryMsg}
Use \`--eoa\` to sign without account abstraction.`
          );
        }
      }
      console.log(`\u2705 Sent! Hash: ${execution.txHash}`);
      if (execution.txHashes.length > 1) {
        console.log(`Count:   ${execution.txHashes.length}`);
      }
      if (execution.sponsored) {
        console.log("Gas:     sponsored");
      }
      if (execution.AAAddress) {
        console.log(`AA:      ${execution.AAAddress}`);
      }
      if (execution.delegationAddress) {
        console.log(`Deleg:   ${execution.delegationAddress}`);
      }
      signedRecords = pendingTxs.map(
        (tx, index) => toSignedTransactionRecord(
          tx,
          execution,
          account.address,
          resolvedChainIds[index],
          Date.now(),
          finalDecision.execution === "aa" ? finalDecision.provider : void 0,
          finalDecision.execution === "aa" ? finalDecision.aaMode : void 0
        )
      );
      backendNotifications = pendingTxs.map(() => ({
        type: "wallet:tx_complete",
        payload: { txHash: execution.txHash, status: "success" }
      }));
    } else {
      if (pendingTxs.length > 1) {
        fatal("Batch signing is only supported for transaction requests, not EIP-712 requests.");
      }
      const pendingTx = pendingTxs[0];
      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(resolvedRpcUrl)
      });
      const signArgs = toViemSignTypedDataArgs(
        pendingTx.payload
      );
      if (!signArgs) {
        fatal("EIP-712 request is missing typed_data payload.");
      }
      if (pendingTx.description) {
        console.log(`Desc:    ${pendingTx.description}`);
      }
      console.log(`Type:    ${signArgs.primaryType}`);
      console.log();
      const signature = await walletClient.signTypedData(signArgs);
      console.log(`\u2705 Signed! Signature: ${signature.slice(0, 20)}...`);
      signedRecords = [{
        id: pendingTx.id,
        kind: "eip712_sign",
        signature,
        from: account.address,
        description: pendingTx.description,
        timestamp: Date.now()
      }];
      backendNotifications = [{
        type: "wallet_eip712_response",
        payload: {
          status: "success",
          signature,
          description: pendingTx.description
        }
      }];
    }
    cli.setPublicKey(account.address);
    session.resolveWallet(account.address, primaryChainId);
    await session.syncUserState();
    for (const txId of txIds) {
      cli.removePendingTx(txId);
    }
    for (const signedRecord of signedRecords) {
      cli.addSignedTx(signedRecord);
    }
    for (const backendNotification of backendNotifications) {
      await session.client.sendSystemMessage(
        cli.sessionId,
        JSON.stringify(backendNotification)
      );
    }
    console.log("Backend notified.");
  } catch (err) {
    if (err instanceof CliExit) throw err;
    const errMsg = err instanceof Error ? err.message : String(err);
    fatal(`\u274C Signing failed: ${errMsg}`);
  } finally {
    session.close();
  }
}
var MAX_AUTO_FEE_WEI;
var init_wallet = __esm({
  "src/cli/commands/wallet.ts"() {
    "use strict";
    init_aa();
    init_wallet_utils();
    init_cli_session();
    init_errors();
    init_execution();
    init_output();
    init_transactions();
    MAX_AUTO_FEE_WEI = BigInt("50000000000000000");
  }
});

// src/cli/commands/simulate.ts
var simulate_exports = {};
__export(simulate_exports, {
  simulateCommand: () => simulateCommand
});
async function simulateCommand(txIds) {
  var _a3, _b, _c;
  const cli = CliSession.load();
  if (!cli) {
    fatal("No active session. Run `aomi chat` first.");
  }
  if (txIds.length === 0) {
    fatal("Usage: aomi simulate <tx-id> [<tx-id> ...]\nRun `aomi tx` to see available IDs.");
  }
  const pendingTxs = txIds.map((txId) => cli.requirePendingTx(txId));
  console.log(
    `${DIM}Simulating ${txIds.length} transaction(s) as atomic batch...${RESET}`
  );
  const client = new AomiClient({
    baseUrl: cli.baseUrl,
    apiKey: cli.apiKey
  });
  const transactions = pendingTxs.map((tx) => {
    var _a4, _b2;
    return {
      to: (_a4 = tx.to) != null ? _a4 : "",
      value: tx.value,
      data: tx.data,
      label: (_b2 = tx.description) != null ? _b2 : tx.id
    };
  });
  const response = await client.simulateBatch(
    cli.sessionId,
    transactions,
    {
      from: (_a3 = cli.publicKey) != null ? _a3 : void 0,
      chainId: (_b = cli.chainId) != null ? _b : void 0
    }
  );
  const { result } = response;
  const modeLabel = result.stateful ? "stateful (Anvil snapshot)" : "stateless (independent eth_call)";
  console.log(`
Batch simulation (${modeLabel}):`);
  console.log(`From: ${result.from} | Network: ${result.network}
`);
  for (const step of result.steps) {
    const icon = step.success ? `${GREEN}\u2713${RESET}` : `\x1B[31m\u2717${RESET}`;
    const label = step.label || `Step ${step.step}`;
    const gasInfo = step.gas_used ? ` | gas: ${step.gas_used.toLocaleString()}` : "";
    console.log(`  ${icon} ${step.step}. ${label}`);
    console.log(`    ${DIM}to: ${step.tx.to} | value: ${step.tx.value_eth} ETH${gasInfo}${RESET}`);
    if (!step.success && step.revert_reason) {
      console.log(`    \x1B[31mRevert: ${step.revert_reason}${RESET}`);
    }
  }
  if (result.total_gas) {
    console.log(`
${DIM}Total gas: ${result.total_gas.toLocaleString()}${RESET}`);
  }
  if (result.fee) {
    const feeEth = (Number(result.fee.amount_wei) / 1e18).toFixed(6);
    console.log(
      `Service fee: ${feeEth} ETH \u2192 ${result.fee.recipient}`
    );
  }
  console.log();
  if (result.batch_success) {
    console.log(
      `${GREEN}All steps passed.${RESET} Run \`aomi sign ${txIds.join(" ")}\` to execute.`
    );
  } else {
    const failed = result.steps.find((s) => !s.success);
    console.log(
      `\x1B[31mBatch failed at step ${(_c = failed == null ? void 0 : failed.step) != null ? _c : "?"}.${RESET} Fix the issue and re-queue, or run \`aomi sign\` on the successful prefix.`
    );
  }
}
var init_simulate = __esm({
  "src/cli/commands/simulate.ts"() {
    "use strict";
    init_client();
    init_cli_session();
    init_errors();
    init_output();
  }
});

// src/cli/tables.ts
function truncateCell(value, maxWidth) {
  if (value.length <= maxWidth) return value;
  return `${value.slice(0, maxWidth - 1)}\u2026`;
}
function padRight(value, width) {
  return value.padEnd(width, " ");
}
function estimateTokenCount(messages) {
  var _a3;
  let totalChars = 0;
  for (const message of messages) {
    const content = formatLogContent(message.content);
    if (content) {
      totalChars += content.length + 1;
    }
    if ((_a3 = message.tool_result) == null ? void 0 : _a3[1]) {
      totalChars += message.tool_result[1].length;
    }
  }
  return Math.round(totalChars / 4);
}
function toPendingTxMetadata(tx) {
  var _a3, _b, _c, _d;
  return {
    id: tx.id,
    kind: tx.kind,
    to: (_a3 = tx.to) != null ? _a3 : null,
    value: (_b = tx.value) != null ? _b : null,
    chainId: (_c = tx.chainId) != null ? _c : null,
    description: (_d = tx.description) != null ? _d : null,
    timestamp: new Date(tx.timestamp).toISOString()
  };
}
function toSignedTxMetadata(tx) {
  var _a3, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
  return {
    id: tx.id,
    kind: tx.kind,
    txHash: (_a3 = tx.txHash) != null ? _a3 : null,
    txHashes: (_b = tx.txHashes) != null ? _b : null,
    executionKind: (_c = tx.executionKind) != null ? _c : null,
    aaProvider: (_d = tx.aaProvider) != null ? _d : null,
    aaMode: (_e = tx.aaMode) != null ? _e : null,
    batched: (_f = tx.batched) != null ? _f : null,
    sponsored: (_g = tx.sponsored) != null ? _g : null,
    AAAddress: (_h = tx.AAAddress) != null ? _h : null,
    delegationAddress: (_i = tx.delegationAddress) != null ? _i : null,
    signature: (_j = tx.signature) != null ? _j : null,
    from: (_k = tx.from) != null ? _k : null,
    to: (_l = tx.to) != null ? _l : null,
    value: (_m = tx.value) != null ? _m : null,
    chainId: (_n = tx.chainId) != null ? _n : null,
    description: (_o = tx.description) != null ? _o : null,
    timestamp: new Date(tx.timestamp).toISOString()
  };
}
function printKeyValueTable(rows, color = CYAN) {
  const labels = rows.map(([label]) => label);
  const values = rows.map(
    ([, value]) => truncateCell(value, MAX_TABLE_VALUE_WIDTH)
  );
  const keyWidth = Math.max("field".length, ...labels.map((label) => label.length));
  const valueWidth = Math.max("value".length, ...values.map((value) => value.length));
  const border = `+${"-".repeat(keyWidth + 2)}+${"-".repeat(valueWidth + 2)}+`;
  console.log(`${color}${border}${RESET}`);
  console.log(
    `${color}| ${padRight("field", keyWidth)} | ${padRight("value", valueWidth)} |${RESET}`
  );
  console.log(`${color}${border}${RESET}`);
  for (let i = 0; i < rows.length; i++) {
    console.log(
      `${color}| ${padRight(labels[i], keyWidth)} | ${padRight(values[i], valueWidth)} |${RESET}`
    );
    console.log(`${color}${border}${RESET}`);
  }
}
function printTransactionTable(pendingTxs, signedTxs, color = GREEN) {
  const rows = [
    ...pendingTxs.map((tx) => ({
      status: "pending",
      metadata: toPendingTxMetadata(tx)
    })),
    ...signedTxs.map((tx) => ({
      status: "signed",
      metadata: toSignedTxMetadata(tx)
    }))
  ];
  if (rows.length === 0) {
    console.log(`${YELLOW}No transactions in local CLI state.${RESET}`);
    return;
  }
  const visibleRows = rows.slice(0, MAX_TX_ROWS);
  const statusWidth = Math.max(
    "status".length,
    ...visibleRows.map((row) => row.status.length)
  );
  const jsonCells = visibleRows.map(
    (row) => truncateCell(JSON.stringify(row.metadata), MAX_TX_JSON_WIDTH)
  );
  const jsonWidth = Math.max("metadata_json".length, ...jsonCells.map((v) => v.length));
  const border = `+${"-".repeat(statusWidth + 2)}+${"-".repeat(jsonWidth + 2)}+`;
  console.log(`${color}${border}${RESET}`);
  console.log(
    `${color}| ${padRight("status", statusWidth)} | ${padRight("metadata_json", jsonWidth)} |${RESET}`
  );
  console.log(`${color}${border}${RESET}`);
  for (let i = 0; i < visibleRows.length; i++) {
    console.log(
      `${color}| ${padRight(visibleRows[i].status, statusWidth)} | ${padRight(jsonCells[i], jsonWidth)} |${RESET}`
    );
    console.log(`${color}${border}${RESET}`);
  }
  if (rows.length > MAX_TX_ROWS) {
    const omitted = rows.length - MAX_TX_ROWS;
    console.log(`${DIM}${omitted} transaction rows omitted${RESET}`);
  }
}
var MAX_TABLE_VALUE_WIDTH, MAX_TX_JSON_WIDTH, MAX_TX_ROWS;
var init_tables = __esm({
  "src/cli/tables.ts"() {
    "use strict";
    init_output();
    MAX_TABLE_VALUE_WIDTH = 72;
    MAX_TX_JSON_WIDTH = 96;
    MAX_TX_ROWS = 8;
  }
});

// src/cli/commands/sessions.ts
var sessions_exports = {};
__export(sessions_exports, {
  deleteSessionCommand: () => deleteSessionCommand,
  newSessionCommand: () => newSessionCommand,
  resumeSessionCommand: () => resumeSessionCommand,
  sessionsCommand: () => sessionsCommand
});
async function fetchRemoteSessionStats(record) {
  var _a3, _b;
  const client = new AomiClient({
    baseUrl: record.state.baseUrl,
    apiKey: record.state.apiKey
  });
  try {
    const apiState = await client.fetchState(record.sessionId, void 0, record.state.clientId);
    const messages = (_a3 = apiState.messages) != null ? _a3 : [];
    return {
      topic: (_b = apiState.title) != null ? _b : "Untitled Session",
      messageCount: messages.length,
      tokenCountEstimate: estimateTokenCount(messages),
      toolCalls: messages.filter((msg) => Boolean(msg.tool_result)).length
    };
  } catch (e) {
    return null;
  }
}
function printSessionSummary(record, stats, isActive) {
  var _a3, _b, _c;
  const pendingTxs = (_a3 = record.state.pendingTxs) != null ? _a3 : [];
  const signedTxs = (_b = record.state.signedTxs) != null ? _b : [];
  const header = isActive ? `\u{1F9F5} Session id: ${record.sessionId} (session-${record.localId}, active)` : `\u{1F9F5} Session id: ${record.sessionId} (session-${record.localId})`;
  console.log(`${YELLOW}------ ${header} ------${RESET}`);
  printKeyValueTable([
    ["\u{1F9E0} topic", (_c = stats == null ? void 0 : stats.topic) != null ? _c : "Unavailable (fetch failed)"],
    ["\u{1F4AC} msg count", stats ? String(stats.messageCount) : "n/a"],
    [
      "\u{1F9EE} token count",
      stats ? `${stats.tokenCountEstimate} (estimated)` : "n/a"
    ],
    ["\u{1F6E0} tool calls", stats ? String(stats.toolCalls) : "n/a"],
    [
      "\u{1F4B8} transactions",
      `${pendingTxs.length + signedTxs.length} (${pendingTxs.length} pending, ${signedTxs.length} signed)`
    ]
  ]);
  console.log();
  console.log(`${YELLOW}\u{1F4BE} Transactions metadata (JSON):${RESET}`);
  printTransactionTable(pendingTxs, signedTxs);
}
async function sessionsCommand(_config) {
  var _a3;
  const sessions = listStoredSessions().sort((a, b) => b.updatedAt - a.updatedAt);
  if (sessions.length === 0) {
    console.log("No local sessions.");
    printDataFileLocation();
    return;
  }
  const activeSessionId = (_a3 = CliSession.load()) == null ? void 0 : _a3.sessionId;
  const statsResults = await Promise.all(
    sessions.map((record) => fetchRemoteSessionStats(record))
  );
  for (let i = 0; i < sessions.length; i++) {
    printSessionSummary(
      sessions[i],
      statsResults[i],
      sessions[i].sessionId === activeSessionId
    );
    if (i < sessions.length - 1) {
      console.log();
    }
  }
  printDataFileLocation();
}
function newSessionCommand(config) {
  const cli = CliSession.create(config);
  console.log(`Active session set to ${cli.sessionId} (new).`);
  printDataFileLocation();
}
function resumeSessionCommand(selector) {
  const resumed = setActiveSession(selector);
  if (!resumed) {
    fatal(`No local session found for selector "${selector}".`);
  }
  console.log(`Active session set to ${resumed.sessionId} (session-${resumed.localId}).`);
  printDataFileLocation();
}
function deleteSessionCommand(selector) {
  const deleted = deleteStoredSession(selector);
  if (!deleted) {
    fatal(`No local session found for selector "${selector}".`);
  }
  console.log(`Deleted local session ${deleted.sessionId} (session-${deleted.localId}).`);
  const active = CliSession.load();
  if (active) {
    console.log(`Active session: ${active.sessionId}`);
  } else {
    console.log("No active session");
  }
  printDataFileLocation();
}
var init_sessions = __esm({
  "src/cli/commands/sessions.ts"() {
    "use strict";
    init_client();
    init_cli_session();
    init_errors();
    init_output();
    init_state();
    init_tables();
  }
});

// src/cli/commands/control.ts
var control_exports = {};
__export(control_exports, {
  appsCommand: () => appsCommand,
  chainsCommand: () => chainsCommand,
  currentAppCommand: () => currentAppCommand,
  currentModelCommand: () => currentModelCommand,
  eventsCommand: () => eventsCommand,
  modelsCommand: () => modelsCommand,
  setModelCommand: () => setModelCommand,
  statusCommand: () => statusCommand
});
async function statusCommand(config) {
  var _a3, _b, _c, _d, _e, _f;
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  cli.mergeConfig(config);
  const session = cli.createClientSession();
  try {
    const apiState = await session.client.fetchState(cli.sessionId, void 0, cli.clientId);
    console.log(
      JSON.stringify(
        {
          sessionId: cli.sessionId,
          baseUrl: cli.baseUrl,
          app: cli.app,
          model: (_a3 = cli.model) != null ? _a3 : null,
          chainId: (_b = cli.chainId) != null ? _b : null,
          isProcessing: (_c = apiState.is_processing) != null ? _c : false,
          messageCount: (_e = (_d = apiState.messages) == null ? void 0 : _d.length) != null ? _e : 0,
          title: (_f = apiState.title) != null ? _f : null,
          pendingTxs: cli.pendingTxs.length,
          signedTxs: cli.signedTxs.length
        },
        null,
        2
      )
    );
    printDataFileLocation();
  } finally {
    session.close();
  }
}
async function eventsCommand(config) {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    return;
  }
  cli.mergeConfig(config);
  const session = cli.createClientSession();
  try {
    const events = await session.client.getSystemEvents(cli.sessionId);
    console.log(JSON.stringify(events, null, 2));
  } finally {
    session.close();
  }
}
async function appsCommand(config) {
  var _a3, _b, _c;
  const client = createControlClient(config);
  const cli = CliSession.load();
  const sessionId = (_a3 = cli == null ? void 0 : cli.sessionId) != null ? _a3 : crypto.randomUUID();
  const apps = await client.getApps(sessionId, {
    publicKey: config.publicKey,
    apiKey: (_b = config.apiKey) != null ? _b : cli == null ? void 0 : cli.apiKey
  });
  if (apps.length === 0) {
    console.log("No apps available.");
    return;
  }
  const currentApp = (_c = cli == null ? void 0 : cli.app) != null ? _c : config.app;
  for (const app of apps) {
    const marker = currentApp === app ? "  (current)" : "";
    console.log(`${app}${marker}`);
  }
}
async function modelsCommand(config) {
  var _a3, _b;
  const client = createControlClient(config);
  const cli = CliSession.load();
  const sessionId = (_a3 = cli == null ? void 0 : cli.sessionId) != null ? _a3 : crypto.randomUUID();
  const models = await client.getModels(sessionId, {
    apiKey: (_b = config.apiKey) != null ? _b : cli == null ? void 0 : cli.apiKey
  });
  if (models.length === 0) {
    console.log("No models available.");
    return;
  }
  for (const model of models) {
    const marker = (cli == null ? void 0 : cli.model) === model ? "  (current)" : "";
    console.log(`${model}${marker}`);
  }
}
function currentAppCommand() {
  var _a3;
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  console.log((_a3 = cli.app) != null ? _a3 : "(default)");
  printDataFileLocation();
}
function currentModelCommand() {
  var _a3;
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  console.log((_a3 = cli.model) != null ? _a3 : "(default backend model)");
  printDataFileLocation();
}
async function setModelCommand(config, model) {
  const cli = CliSession.loadOrCreate(config);
  const session = cli.createClientSession();
  try {
    await session.client.setModel(cli.sessionId, model, {
      app: cli.app,
      apiKey: cli.apiKey
    });
    cli.setModel(model);
    console.log(`Model set to ${model}`);
    printDataFileLocation();
  } finally {
    session.close();
  }
}
function chainsCommand() {
  var _a3;
  const cli = CliSession.load();
  const currentChainId = cli == null ? void 0 : cli.chainId;
  for (const id of SUPPORTED_CHAIN_IDS) {
    const name = (_a3 = CHAIN_NAMES[id]) != null ? _a3 : `Chain ${id}`;
    const aaChain = DEFAULT_AA_CONFIG.chains.find((c) => c.chainId === id);
    const aaInfo = (aaChain == null ? void 0 : aaChain.enabled) ? `  AA: ${aaChain.defaultMode} (${aaChain.supportedModes.join(", ")})` : "";
    const marker = currentChainId === id ? "  (current)" : "";
    console.log(`${id}  ${name}${aaInfo}${marker}`);
  }
}
var init_control = __esm({
  "src/cli/commands/control.ts"() {
    "use strict";
    init_chains();
    init_cli_session();
    init_context();
    init_output();
    init_types2();
  }
});

// src/cli/commands/history.ts
var history_exports = {};
__export(history_exports, {
  closeCommand: () => closeCommand,
  logCommand: () => logCommand
});
async function logCommand(config) {
  var _a3, _b, _c;
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  cli.mergeConfig(config);
  const session = cli.createClientSession();
  try {
    const apiState = await session.client.fetchState(cli.sessionId, void 0, cli.clientId);
    const messages = (_a3 = apiState.messages) != null ? _a3 : [];
    const pendingTxs = [...cli.pendingTxs];
    const signedTxs = [...cli.signedTxs];
    const toolCalls = messages.filter((msg) => Boolean(msg.tool_result)).length;
    const tokenCountEstimate = estimateTokenCount(messages);
    const topic = (_b = apiState.title) != null ? _b : "Untitled Session";
    if (messages.length === 0) {
      console.log("No messages in this session.");
      printDataFileLocation();
      return;
    }
    console.log(`------ Session id: ${cli.sessionId} ------`);
    printKeyValueTable([
      ["topic", topic],
      ["msg count", String(messages.length)],
      ["token count", `${tokenCountEstimate} (estimated)`],
      ["tool calls", String(toolCalls)],
      [
        "transactions",
        `${pendingTxs.length + signedTxs.length} (${pendingTxs.length} pending, ${signedTxs.length} signed)`
      ]
    ]);
    console.log("Transactions metadata (JSON):");
    printTransactionTable(pendingTxs, signedTxs);
    console.log("-------------------- Messages --------------------");
    for (const msg of messages) {
      const content = formatLogContent(msg.content);
      let time = "";
      if (msg.timestamp) {
        const raw = msg.timestamp;
        const numeric = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
        const date = !Number.isNaN(numeric) ? new Date(numeric < 1e12 ? numeric * 1e3 : numeric) : new Date(raw);
        time = Number.isNaN(date.getTime()) ? "" : `${DIM}${date.toLocaleTimeString()}${RESET} `;
      }
      const sender = (_c = msg.sender) != null ? _c : "unknown";
      if (sender === "user") {
        if (content) {
          console.log(`${time}${CYAN}\u{1F464} You:${RESET} ${content}`);
        }
      } else if (sender === "agent" || sender === "assistant") {
        if (msg.tool_result) {
          const [toolName, result] = msg.tool_result;
          console.log(
            `${time}${GREEN}\u{1F527} [${toolName}]${RESET} ${formatToolResultPreview(result)}`
          );
        }
        if (content) {
          console.log(`${time}${CYAN}\u{1F916} Agent:${RESET} ${content}`);
        }
      } else if (sender === "system") {
        if (content && !content.startsWith("Response of system endpoint:")) {
          console.log(`${time}${YELLOW}\u2699\uFE0F  System:${RESET} ${content}`);
        }
      } else {
        if (content) {
          console.log(`${time}${DIM}[${sender}]${RESET} ${content}`);
        }
      }
    }
    console.log(`
${DIM}\u2014 ${messages.length} messages \u2014${RESET}`);
    printDataFileLocation();
  } finally {
    session.close();
  }
}
function closeCommand(config) {
  const cli = CliSession.load();
  if (cli) {
    cli.mergeConfig(config);
    const session = cli.createClientSession();
    session.close();
  }
  clearState();
  console.log("Session closed");
}
var init_history = __esm({
  "src/cli/commands/history.ts"() {
    "use strict";
    init_cli_session();
    init_output();
    init_state();
    init_tables();
  }
});

// src/cli/commands/secrets.ts
var secrets_exports = {};
__export(secrets_exports, {
  clearSecretsCommand: () => clearSecretsCommand,
  ingestSecretsCommand: () => ingestSecretsCommand,
  listSecretsCommand: () => listSecretsCommand
});
async function ingestSecretsCommand(config) {
  const secretEntries = Object.entries(config.secrets);
  if (secretEntries.length === 0) {
    fatal("Usage: aomi secret add NAME=value [NAME=value ...]");
  }
  const cli = CliSession.loadOrCreate(config);
  const session = cli.createClientSession();
  try {
    const handles = await ingestSecretsForSession(config, cli, session.client);
    const names = Object.keys(handles).sort();
    console.log(
      `Configured ${names.length} secret${names.length === 1 ? "" : "s"} for session ${cli.sessionId}.`
    );
    for (const name of names) {
      console.log(`${name}  ${handles[name]}`);
    }
    printDataFileLocation();
  } finally {
    session.close();
  }
}
function listSecretsCommand() {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  const handles = cli.secretHandles;
  const names = Object.keys(handles).sort();
  if (names.length === 0) {
    console.log("No secrets configured.");
    printDataFileLocation();
    return;
  }
  for (const name of names) {
    console.log(`${name}  ${handles[name]}`);
  }
  printDataFileLocation();
}
async function clearSecretsCommand(config) {
  const cli = CliSession.loadOrCreate(config);
  const clientId = cli.clientId;
  if (!clientId) {
    console.log("No secrets configured.");
    printDataFileLocation();
    return;
  }
  const session = cli.createClientSession();
  try {
    await session.client.clearSecrets(clientId);
    cli.clearSecretHandles();
    console.log("Cleared all secrets for the active session.");
    printDataFileLocation();
  } finally {
    session.close();
  }
}
var init_secrets = __esm({
  "src/cli/commands/secrets.ts"() {
    "use strict";
    init_cli_session();
    init_context();
    init_errors();
    init_output();
  }
});

// src/cli/main.ts
import { runMain } from "citty";

// src/cli/root.ts
import { defineCommand as defineCommand8 } from "citty";

// src/cli/commands/defs/chat.ts
import { defineCommand } from "citty";

// src/cli/commands/defs/shared.ts
init_errors();

// src/cli/validation.ts
init_chains();
init_errors();
function parseChainId(value) {
  if (value === void 0) return void 0;
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return void 0;
  if (!SUPPORTED_CHAIN_IDS.includes(n)) {
    const list = SUPPORTED_CHAIN_IDS.map(
      (id) => `  ${id} (${CHAIN_NAMES[id]})`
    ).join("\n");
    fatal(`Unsupported chain ID: ${n}
Supported chains:
${list}`);
  }
  return n;
}
function normalizePrivateKey(value) {
  if (value === void 0) return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}
function parseAAProvider(value) {
  if (value === void 0 || value.trim() === "") return void 0;
  if (value === "alchemy" || value === "pimlico") {
    return value;
  }
  fatal("Unsupported AA provider. Use `alchemy` or `pimlico`.");
}
function parseAAMode(value) {
  if (value === void 0 || value.trim() === "") return void 0;
  if (value === "4337" || value === "7702") {
    return value;
  }
  fatal("Unsupported AA mode. Use `4337` or `7702`.");
}

// src/cli/commands/defs/shared.ts
var globalArgs = {
  "backend-url": {
    type: "string",
    description: "Backend URL (default: https://api.aomi.dev)"
  },
  "api-key": {
    type: "string",
    description: "API key for non-default apps"
  },
  app: {
    type: "string",
    description: 'App (default: "default")'
  },
  model: {
    type: "string",
    description: "Set the active model for this session"
  },
  "new-session": {
    type: "boolean",
    description: "Create a fresh active session for this command"
  },
  chain: {
    type: "string",
    description: "Active chain for chat/session context"
  },
  "public-key": {
    type: "string",
    description: "Wallet address (so the agent knows your wallet)"
  },
  "private-key": {
    type: "string",
    description: "Hex private key for signing"
  },
  "rpc-url": {
    type: "string",
    description: "RPC URL for transaction submission"
  }
};
function str(value) {
  return typeof value === "string" && value.trim() ? value : void 0;
}
function resolveExecution(args) {
  const flagAA = args.aa === true;
  const flagEoa = args.eoa === true;
  if (flagAA && flagEoa) {
    fatal("Choose only one of `--aa` or `--eoa`.");
  }
  if (flagEoa) return "eoa";
  if (flagAA || str(args["aa-provider"]) !== void 0 || str(args["aa-mode"]) !== void 0) {
    return "aa";
  }
  return void 0;
}
function buildCliConfig(args) {
  var _a3, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
  const execution = resolveExecution(args);
  const aaProvider = parseAAProvider(
    (_a3 = str(args["aa-provider"])) != null ? _a3 : process.env.AOMI_AA_PROVIDER
  );
  const aaMode = parseAAMode(
    (_b = str(args["aa-mode"])) != null ? _b : process.env.AOMI_AA_MODE
  );
  if (execution === "eoa" && (aaProvider || aaMode)) {
    fatal("`--aa-provider` and `--aa-mode` cannot be used with `--eoa`.");
  }
  return {
    baseUrl: (_d = (_c = str(args["backend-url"])) != null ? _c : process.env.AOMI_BACKEND_URL) != null ? _d : "https://api.aomi.dev",
    apiKey: (_e = str(args["api-key"])) != null ? _e : process.env.AOMI_API_KEY,
    app: (_g = (_f = str(args.app)) != null ? _f : process.env.AOMI_APP) != null ? _g : "default",
    model: (_h = str(args.model)) != null ? _h : process.env.AOMI_MODEL,
    freshSession: args["new-session"] === true,
    publicKey: (_i = str(args["public-key"])) != null ? _i : process.env.AOMI_PUBLIC_KEY,
    privateKey: normalizePrivateKey(
      (_j = str(args["private-key"])) != null ? _j : process.env.PRIVATE_KEY
    ),
    chainRpcUrl: (_k = str(args["rpc-url"])) != null ? _k : process.env.CHAIN_RPC_URL,
    chain: parseChainId((_l = str(args.chain)) != null ? _l : process.env.AOMI_CHAIN_ID),
    secrets: {},
    execution,
    aaProvider,
    aaMode
  };
}
function getPositionals(args) {
  const positionals = args._;
  if (!Array.isArray(positionals)) {
    return [];
  }
  return positionals.filter((value) => typeof value === "string");
}

// src/cli/commands/defs/chat.ts
var chatDef = defineCommand({
  meta: { name: "chat", description: "Send a message and print the response" },
  args: __spreadProps(__spreadValues({}, globalArgs), {
    verbose: {
      type: "boolean",
      alias: "v",
      description: "Stream agent responses, tool calls, and events live"
    },
    message: {
      type: "positional",
      description: "Message to send",
      required: false
    }
  }),
  async run({ args }) {
    var _a3;
    const { chatCommand: chatCommand2 } = await Promise.resolve().then(() => (init_chat(), chat_exports));
    await chatCommand2(buildCliConfig(args), (_a3 = args.message) != null ? _a3 : "", args.verbose === true);
  }
});

// src/cli/commands/defs/tx.ts
import { defineCommand as defineCommand2 } from "citty";
var txListDef = defineCommand2({
  meta: { name: "list", description: "List pending and signed transactions" },
  args: {},
  async run() {
    const { txCommand: txCommand2 } = await Promise.resolve().then(() => (init_wallet(), wallet_exports));
    txCommand2();
  }
});
var txSimulateDef = defineCommand2({
  meta: { name: "simulate", description: "Simulate a batch of pending transactions" },
  args: {
    txIds: {
      type: "positional",
      description: "Transaction IDs to simulate",
      required: false
    }
  },
  async run({ args }) {
    const { simulateCommand: simulateCommand2 } = await Promise.resolve().then(() => (init_simulate(), simulate_exports));
    const txIds = getPositionals(args);
    await simulateCommand2(txIds);
  }
});
var txSignDef = defineCommand2({
  meta: { name: "sign", description: "Sign and submit pending transactions" },
  args: __spreadProps(__spreadValues({}, globalArgs), {
    eoa: {
      type: "boolean",
      description: "Force plain EOA execution, skip AA even if configured"
    },
    aa: {
      type: "boolean",
      description: "Force AA execution, error if provider not configured (default: auto-detect)"
    },
    "aa-provider": {
      type: "string",
      description: "AA provider override: alchemy | pimlico"
    },
    "aa-mode": {
      type: "string",
      description: "AA mode override: 4337 | 7702"
    },
    txIds: {
      type: "positional",
      description: "Transaction IDs to sign",
      required: false
    }
  }),
  async run({ args }) {
    const { signCommand: signCommand2 } = await Promise.resolve().then(() => (init_wallet(), wallet_exports));
    const txIds = getPositionals(args);
    await signCommand2(buildCliConfig(args), txIds);
  }
});
var txDef = defineCommand2({
  meta: { name: "tx", description: "Transaction management" },
  subCommands: {
    list: txListDef,
    simulate: txSimulateDef,
    sign: txSignDef
  }
});

// src/cli/commands/defs/session.ts
import { defineCommand as defineCommand3 } from "citty";
var sessionListDef = defineCommand3({
  meta: { name: "list", description: "List local sessions with metadata" },
  args: {},
  async run() {
    const { sessionsCommand: sessionsCommand2 } = await Promise.resolve().then(() => (init_sessions(), sessions_exports));
    await sessionsCommand2(buildCliConfig({}));
  }
});
var sessionNewDef = defineCommand3({
  meta: { name: "new", description: "Start a fresh session and make it active" },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { newSessionCommand: newSessionCommand2 } = await Promise.resolve().then(() => (init_sessions(), sessions_exports));
    newSessionCommand2(buildCliConfig(args));
  }
});
var sessionResumeDef = defineCommand3({
  meta: { name: "resume", description: "Resume a local session" },
  args: {
    id: {
      type: "positional",
      description: "Session ID or session-N",
      required: true
    }
  },
  async run({ args }) {
    const { resumeSessionCommand: resumeSessionCommand2 } = await Promise.resolve().then(() => (init_sessions(), sessions_exports));
    resumeSessionCommand2(args.id);
  }
});
var sessionDeleteDef = defineCommand3({
  meta: { name: "delete", description: "Delete a local session" },
  args: {
    id: {
      type: "positional",
      description: "Session ID or session-N",
      required: true
    }
  },
  async run({ args }) {
    const { deleteSessionCommand: deleteSessionCommand2 } = await Promise.resolve().then(() => (init_sessions(), sessions_exports));
    deleteSessionCommand2(args.id);
  }
});
var sessionStatusDef = defineCommand3({
  meta: { name: "status", description: "Show current session state" },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { statusCommand: statusCommand2 } = await Promise.resolve().then(() => (init_control(), control_exports));
    await statusCommand2(buildCliConfig(args));
  }
});
var sessionLogDef = defineCommand3({
  meta: { name: "log", description: "Show conversation history" },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { logCommand: logCommand2 } = await Promise.resolve().then(() => (init_history(), history_exports));
    await logCommand2(buildCliConfig(args));
  }
});
var sessionEventsDef = defineCommand3({
  meta: { name: "events", description: "List system events" },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { eventsCommand: eventsCommand2 } = await Promise.resolve().then(() => (init_control(), control_exports));
    await eventsCommand2(buildCliConfig(args));
  }
});
var sessionCloseDef = defineCommand3({
  meta: { name: "close", description: "Close the current session" },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { closeCommand: closeCommand2 } = await Promise.resolve().then(() => (init_history(), history_exports));
    closeCommand2(buildCliConfig(args));
  }
});
var sessionDef = defineCommand3({
  meta: { name: "session", description: "Session management" },
  subCommands: {
    list: sessionListDef,
    new: sessionNewDef,
    resume: sessionResumeDef,
    delete: sessionDeleteDef,
    status: sessionStatusDef,
    log: sessionLogDef,
    events: sessionEventsDef,
    close: sessionCloseDef
  }
});

// src/cli/commands/defs/model.ts
import { defineCommand as defineCommand4 } from "citty";
var modelListDef = defineCommand4({
  meta: { name: "list", description: "List models available to the current backend" },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { modelsCommand: modelsCommand2 } = await Promise.resolve().then(() => (init_control(), control_exports));
    await modelsCommand2(buildCliConfig(args));
  }
});
var modelSetDef = defineCommand4({
  meta: { name: "set", description: "Set the active model for the current session" },
  args: __spreadProps(__spreadValues({}, globalArgs), {
    rig: {
      type: "positional",
      description: "Model rig name",
      required: true
    }
  }),
  async run({ args }) {
    const { setModelCommand: setModelCommand2 } = await Promise.resolve().then(() => (init_control(), control_exports));
    await setModelCommand2(buildCliConfig(args), args.rig);
  }
});
var modelCurrentDef = defineCommand4({
  meta: { name: "current", description: "Show current model" },
  args: {},
  async run() {
    const { currentModelCommand: currentModelCommand2 } = await Promise.resolve().then(() => (init_control(), control_exports));
    currentModelCommand2();
  }
});
var modelDef = defineCommand4({
  meta: { name: "model", description: "Model management" },
  subCommands: {
    list: modelListDef,
    set: modelSetDef,
    current: modelCurrentDef
  }
});

// src/cli/commands/defs/app.ts
import { defineCommand as defineCommand5 } from "citty";
var appListDef = defineCommand5({
  meta: { name: "list", description: "List available apps" },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { appsCommand: appsCommand2 } = await Promise.resolve().then(() => (init_control(), control_exports));
    await appsCommand2(buildCliConfig(args));
  }
});
var appCurrentDef = defineCommand5({
  meta: { name: "current", description: "Show the current app" },
  args: {},
  async run() {
    const { currentAppCommand: currentAppCommand2 } = await Promise.resolve().then(() => (init_control(), control_exports));
    currentAppCommand2();
  }
});
var appDef = defineCommand5({
  meta: { name: "app", description: "App management" },
  subCommands: {
    list: appListDef,
    current: appCurrentDef
  }
});

// src/cli/commands/defs/chain.ts
import { defineCommand as defineCommand6 } from "citty";
var chainListDef = defineCommand6({
  meta: { name: "list", description: "List supported chains" },
  args: {},
  async run() {
    const { chainsCommand: chainsCommand2 } = await Promise.resolve().then(() => (init_control(), control_exports));
    chainsCommand2();
  }
});
var chainDef = defineCommand6({
  meta: { name: "chain", description: "Chain information" },
  subCommands: {
    list: chainListDef
  }
});

// src/cli/commands/defs/secret.ts
init_errors();
import { defineCommand as defineCommand7 } from "citty";
var secretListDef = defineCommand7({
  meta: { name: "list", description: "List configured secrets for the active session" },
  args: {},
  async run() {
    const { listSecretsCommand: listSecretsCommand2 } = await Promise.resolve().then(() => (init_secrets(), secrets_exports));
    listSecretsCommand2();
  }
});
var secretClearDef = defineCommand7({
  meta: { name: "clear", description: "Clear all secrets for the active session" },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { clearSecretsCommand: clearSecretsCommand2 } = await Promise.resolve().then(() => (init_secrets(), secrets_exports));
    await clearSecretsCommand2(buildCliConfig(args));
  }
});
var secretAddDef = defineCommand7({
  meta: { name: "add", description: "Add one or more secrets (NAME=value)" },
  args: __spreadProps(__spreadValues({}, globalArgs), {
    secret: {
      type: "positional",
      description: "Secret in NAME=value format",
      required: false
    }
  }),
  async run({ args }) {
    const { ingestSecretsCommand: ingestSecretsCommand2 } = await Promise.resolve().then(() => (init_secrets(), secrets_exports));
    const config = buildCliConfig(args);
    const secretArgs = getPositionals(args);
    if (secretArgs.length === 0) {
      fatal("Usage: aomi secret add NAME=value [NAME=value ...]");
    }
    for (const secret of secretArgs) {
      const eqIdx = secret.indexOf("=");
      if (eqIdx <= 0) {
        fatal(
          `Invalid secret "${secret}". Use NAME=value format.
Usage: aomi secret add NAME=value [NAME=value ...]`
        );
      }
      config.secrets[secret.slice(0, eqIdx)] = secret.slice(eqIdx + 1);
    }
    await ingestSecretsCommand2(config);
  }
});
var secretDef = defineCommand7({
  meta: { name: "secret", description: "Secret management" },
  subCommands: {
    list: secretListDef,
    clear: secretClearDef,
    add: secretAddDef
  }
});

// package.json
var package_default = {
  name: "@aomi-labs/client",
  version: "0.1.23",
  description: "Platform-agnostic TypeScript client for the Aomi backend API",
  type: "module",
  main: "./dist/index.cjs",
  module: "./dist/index.js",
  types: "./dist/index.d.ts",
  bin: {
    aomi: "./dist/cli.js"
  },
  exports: {
    ".": {
      import: {
        types: "./dist/index.d.ts",
        default: "./dist/index.js"
      },
      require: {
        types: "./dist/index.d.cts",
        default: "./dist/index.cjs"
      }
    }
  },
  files: [
    "dist",
    "skills",
    "README.md"
  ],
  scripts: {
    build: "tsup",
    "clean:dist": "rm -rf dist"
  },
  dependencies: {
    "@alchemy/wallet-apis": "5.0.0-beta.22",
    "@getpara/aa-alchemy": "2.21.0",
    "@getpara/aa-pimlico": "2.21.0",
    citty: "^0.2.2",
    permissionless: "^0.3.5",
    viem: "^2.47.11"
  }
};

// src/cli/root.ts
var root = defineCommand8({
  meta: {
    name: "aomi",
    version: package_default.version,
    description: "CLI client for Aomi on-chain agent"
  },
  args: __spreadValues({}, globalArgs),
  subCommands: {
    chat: chatDef,
    tx: txDef,
    session: sessionDef,
    model: modelDef,
    app: appDef,
    chain: chainDef,
    secret: secretDef
  }
});

// src/cli/main.ts
init_errors();
function isPnpmExecWrapper() {
  var _a3, _b;
  const npmCommand = (_a3 = process.env.npm_command) != null ? _a3 : "";
  const userAgent = (_b = process.env.npm_config_user_agent) != null ? _b : "";
  return npmCommand === "exec" && userAgent.includes("pnpm/");
}
async function runCli(argv = process.argv) {
  const strictExit = process.env.AOMI_CLI_STRICT_EXIT === "1";
  try {
    await runMain(root, { rawArgs: argv.slice(2) });
  } catch (err) {
    if (err instanceof CliExit) {
      if (!strictExit && isPnpmExecWrapper()) {
        return;
      }
      process.exit(err.code);
      return;
    }
    const RED = "\x1B[31m";
    const RESET2 = "\x1B[0m";
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${RED}\u274C ${message}${RESET2}`);
    process.exit(1);
  }
}

// src/cli.ts
void runCli();
