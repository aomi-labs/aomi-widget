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

// src/types.ts
var CLIENT_TYPE_TS_CLI = "ts_cli";
var CLIENT_TYPE_WEB_UI = "web_ui";
var USER_STATE_KEY_ALIASES = {
  chainId: "chain_id",
  isConnected: "is_connected",
  ensName: "ens_name",
  pendingTxs: "pending_txs",
  pendingEip712s: "pending_eip712s",
  nextId: "next_id"
};
function parseUserStateChainId(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return void 0;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : void 0;
}
var UserState;
((UserState2) => {
  function normalize(userState) {
    var _a;
    if (!userState) {
      return void 0;
    }
    const normalized = {};
    for (const [key, value] of Object.entries(userState)) {
      const normalizedKey = (_a = USER_STATE_KEY_ALIASES[key]) != null ? _a : key;
      if (normalizedKey in normalized) {
        continue;
      }
      normalized[normalizedKey] = value;
    }
    return normalized;
  }
  UserState2.normalize = normalize;
  function address(userState) {
    const normalized = normalize(userState);
    const address2 = normalized == null ? void 0 : normalized.address;
    return typeof address2 === "string" && address2.length > 0 ? address2 : void 0;
  }
  UserState2.address = address;
  function chainId(userState) {
    const normalized = normalize(userState);
    return parseUserStateChainId(normalized == null ? void 0 : normalized.chain_id);
  }
  UserState2.chainId = chainId;
  function isConnected(userState) {
    const normalized = normalize(userState);
    const isConnected2 = normalized == null ? void 0 : normalized.is_connected;
    return typeof isConnected2 === "boolean" ? isConnected2 : void 0;
  }
  UserState2.isConnected = isConnected;
  function withExt(userState, key, value) {
    var _a;
    const normalizedUserState = (_a = normalize(userState)) != null ? _a : {};
    const currentExt = normalizedUserState["ext"];
    const extRecord = typeof currentExt === "object" && currentExt !== null && !Array.isArray(currentExt) ? currentExt : {};
    return __spreadProps(__spreadValues({}, normalizedUserState), {
      ext: __spreadProps(__spreadValues({}, extRecord), {
        [key]: value
      })
    });
  }
  UserState2.withExt = withExt;
})(UserState || (UserState = {}));
function addUserStateExt(userState, key, value) {
  return UserState.withExt(userState, key, value);
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
        var _a;
        subscription.stopped = true;
        if (subscription.retryTimer) {
          clearTimeout(subscription.retryTimer);
          subscription.retryTimer = null;
        }
        (_a = subscription.abortController) == null ? void 0 : _a.abort();
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
        logger == null ? void 0 : logger.debug("[aomi][sse] stream ended", {
          sessionId,
          aborted: controller.signal.aborted,
          stopped: subscription.stopped,
          durationMs: Date.now() - openedAt
        });
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

// src/client.ts
var SESSION_ID_HEADER = "X-Session-Id";
var API_KEY_HEADER = "X-API-Key";
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
var AomiClient = class {
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
    const normalizedUserState = UserState.normalize(userState);
    const url = buildApiUrl(this.baseUrl, "/api/state", {
      user_state: normalizedUserState ? JSON.stringify(normalizedUserState) : void 0,
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
    var _a, _b;
    const app = (_a = options == null ? void 0 : options.app) != null ? _a : "default";
    const apiKey = (_b = options == null ? void 0 : options.apiKey) != null ? _b : this.apiKey;
    const normalizedUserState = UserState.normalize(options == null ? void 0 : options.userState);
    const payload = { message, app };
    if (options == null ? void 0 : options.publicKey) {
      payload.public_key = options.publicKey;
    }
    if (normalizedUserState) {
      payload.user_state = JSON.stringify(normalizedUserState);
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
  /**
   * Remove a single secret for a client.
   */
  async deleteSecret(clientId, name) {
    const url = buildApiUrl(
      this.baseUrl,
      `/api/secrets/${encodeURIComponent(name)}`,
      {
        client_id: clientId
      }
    );
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
    var _a;
    const url = buildApiUrl(this.baseUrl, "/api/control/apps", {
      public_key: options == null ? void 0 : options.publicKey
    });
    const apiKey = (_a = options == null ? void 0 : options.apiKey) != null ? _a : this.apiKey;
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
    var _a;
    const url = buildApiUrl(this.baseUrl, "/api/control/models");
    const apiKey = (_a = options == null ? void 0 : options.apiKey) != null ? _a : this.apiKey;
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
    var _a;
    const apiKey = (_a = options == null ? void 0 : options.apiKey) != null ? _a : this.apiKey;
    const payload = { rig };
    if (options == null ? void 0 : options.app) {
      payload.app = options.app;
    }
    if (options == null ? void 0 : options.clientId) {
      payload.client_id = options.clientId;
    }
    return postState(this.baseUrl, "/api/control/model", payload, sessionId, apiKey);
  }
  /**
   * List BYOK provider keys bound to the current session's client.
   */
  async listProviderKeys(sessionId) {
    var _a;
    const url = buildApiUrl(this.baseUrl, "/api/control/provider-keys");
    const response = await fetch(url, {
      headers: withSessionHeader(sessionId)
    });
    if (!response.ok) {
      throw new Error(`Failed to get provider keys: HTTP ${response.status}`);
    }
    const data = await response.json();
    return (_a = data.provider_keys) != null ? _a : [];
  }
  /**
   * Save or replace a BYOK provider key for the client bound to this session.
   */
  async saveProviderKey(sessionId, provider, apiKey, label) {
    const url = joinApiPath(this.baseUrl, "/api/control/provider-keys");
    const response = await fetch(url, {
      method: "POST",
      headers: withSessionHeader(sessionId, {
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        provider,
        api_key: apiKey,
        label
      })
    });
    if (!response.ok) {
      throw new Error(`Failed to save provider key: HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.key;
  }
  /**
   * Delete a BYOK provider key for the client bound to this session.
   */
  async deleteProviderKey(sessionId, provider) {
    const url = buildApiUrl(
      this.baseUrl,
      `/api/control/provider-keys/${encodeURIComponent(provider)}`
    );
    const response = await fetch(url, {
      method: "DELETE",
      headers: withSessionHeader(sessionId)
    });
    if (!response.ok) {
      throw new Error(`Failed to delete provider key: HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.deleted;
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

// src/event.ts
var TypedEventEmitter = class {
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
function unwrapSystemEvent(event) {
  var _a;
  if (isInlineCall(event)) {
    return {
      type: event.InlineCall.type,
      payload: (_a = event.InlineCall.payload) != null ? _a : event.InlineCall
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

// src/wallet-utils.ts
import { getAddress } from "viem";
function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  return value;
}
function getToolArgs(payload) {
  var _a;
  const root = asRecord(payload);
  const nestedArgs = asRecord(root == null ? void 0 : root.args);
  return (_a = nestedArgs != null ? nestedArgs : root) != null ? _a : {};
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
function parseTxIds(value) {
  if (!Array.isArray(value)) return [];
  const parsed = value.map((entry) => parsePendingId(entry)).filter((entry) => typeof entry === "number");
  const unique = Array.from(new Set(parsed));
  unique.sort((left, right) => left - right);
  return unique;
}
function parsePendingId(value) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : void 0;
}
function parseValue(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return void 0;
}
function normalizeAaPreference(value) {
  if (typeof value !== "string") return void 0;
  const normalized = value.trim().toLowerCase();
  if (normalized === "auto" || normalized === "eip4337" || normalized === "eip7702" || normalized === "none") {
    return normalized;
  }
  return void 0;
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
  var _a, _b, _c, _d, _e, _f;
  const root = asRecord(payload);
  const args = getToolArgs(payload);
  const ctx = asRecord(root == null ? void 0 : root.ctx);
  const txIds = parseTxIds((_a = args.tx_ids) != null ? _a : args.txIds);
  if (txIds.length === 0) return null;
  const to = normalizeAddress(args.to);
  const value = parseValue(args.value);
  const data = typeof args.data === "string" ? args.data : void 0;
  const chainId = (_d = (_c = (_b = parseChainId(args.chainId)) != null ? _b : parseChainId(args.chain_id)) != null ? _c : parseChainId(ctx == null ? void 0 : ctx.user_chain_id)) != null ? _d : parseChainId(ctx == null ? void 0 : ctx.userChainId);
  const requestId = typeof args.tx_id === "string" ? args.tx_id : typeof args.txId === "string" ? args.txId : void 0;
  const aaPreference = (_f = normalizeAaPreference((_e = args.aa_preference) != null ? _e : args.aaPreference)) != null ? _f : "auto";
  const txId = txIds.length === 1 ? txIds[0] : void 0;
  return { to, value, data, chainId, txId, txIds, aaPreference, requestId };
}
function hydrateTxPayloadFromUserState(payload, userState, options) {
  var _a, _b, _c, _d, _e, _f, _g;
  const strict = (options == null ? void 0 : options.strict) === true;
  const txIds = Array.isArray(payload.txIds) && payload.txIds.length > 0 ? payload.txIds : payload.txId !== void 0 ? [payload.txId] : [];
  if (txIds.length === 0) {
    if (strict) {
      throw new Error("pending_tx_not_found");
    }
    return payload;
  }
  const normalizedUserState = asRecord(userState);
  const pendingTxsRaw = asRecord(normalizedUserState == null ? void 0 : normalizedUserState.pending_txs);
  if (!pendingTxsRaw) {
    if (strict) {
      throw new Error("pending_tx_not_found");
    }
    return payload;
  }
  const calls = [];
  for (const txId of txIds) {
    const pendingEntry = asRecord(pendingTxsRaw[String(txId)]);
    if (!pendingEntry) {
      if (strict) {
        throw new Error("pending_tx_not_found");
      }
      continue;
    }
    const to = normalizeAddress(pendingEntry.to);
    if (!to) {
      if (strict) {
        throw new Error("pending_transaction_missing_call_data");
      }
      continue;
    }
    calls.push({
      txId,
      to,
      value: parseValue(pendingEntry.value),
      data: typeof pendingEntry.data === "string" ? pendingEntry.data : void 0,
      chainId: (_b = (_a = parseChainId(pendingEntry.chain_id)) != null ? _a : parseChainId(pendingEntry.chainId)) != null ? _b : parseChainId(payload.chainId),
      from: typeof pendingEntry.from === "string" ? pendingEntry.from : void 0,
      gas: typeof pendingEntry.gas === "string" ? pendingEntry.gas : void 0,
      description: typeof pendingEntry.label === "string" ? pendingEntry.label : typeof pendingEntry.description === "string" ? pendingEntry.description : void 0
    });
  }
  if (calls.length === 0) {
    if (strict) {
      throw new Error("pending_tx_not_found");
    }
    return payload;
  }
  const first = calls[0];
  return __spreadProps(__spreadValues({}, payload), {
    txIds,
    txId: (_c = payload.txId) != null ? _c : first.txId,
    to: (_d = payload.to) != null ? _d : first.to,
    value: (_e = payload.value) != null ? _e : first.value,
    data: (_f = payload.data) != null ? _f : first.data,
    chainId: (_g = payload.chainId) != null ? _g : first.chainId,
    calls
  });
}
function normalizeEip712Payload(payload) {
  var _a, _b, _c, _d;
  const args = getToolArgs(payload);
  const typedDataRaw = (_b = (_a = args.typed_data) != null ? _a : args["712_typed_data"]) != null ? _b : args.typedData;
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
  const eip712Id = (_d = (_c = parsePendingId(args.eip712Id)) != null ? _c : parsePendingId(args.pending_eip712_id)) != null ? _d : parsePendingId(args.pendingEip712Id);
  return { typed_data: typedData, description, eip712Id };
}
function toAAWalletCalls(payload, defaultChainId = 1) {
  var _a, _b;
  const calls = ((_a = payload.calls) == null ? void 0 : _a.length) ? payload.calls : payload.to ? [
    {
      txId: (_b = payload.txId) != null ? _b : 0,
      to: payload.to,
      value: payload.value,
      data: payload.data,
      chainId: payload.chainId
    }
  ] : [];
  if (calls.length === 0) {
    throw new Error("pending_transaction_missing_call_data");
  }
  return calls.map((call) => {
    var _a2, _b2, _c;
    return {
      to: call.to,
      value: BigInt((_a2 = call.value) != null ? _a2 : "0"),
      data: call.data ? call.data : void 0,
      chainId: (_c = (_b2 = call.chainId) != null ? _b2 : payload.chainId) != null ? _c : defaultChainId
    };
  });
}
function toAAWalletCall(payload, defaultChainId = 1) {
  return toAAWalletCalls(payload, defaultChainId)[0];
}
function toViemSignTypedDataArgs(payload) {
  var _a;
  const typedData = payload.typed_data;
  const primaryType = typeof (typedData == null ? void 0 : typedData.primaryType) === "string" && typedData.primaryType.trim().length > 0 ? typedData.primaryType : void 0;
  if (!typedData || !primaryType) {
    return null;
  }
  return {
    domain: asRecord(typedData.domain),
    types: Object.fromEntries(
      Object.entries((_a = typedData.types) != null ? _a : {}).filter(
        ([typeName]) => typeName !== "EIP712Domain"
      )
    ),
    primaryType,
    message: asRecord(typedData.message)
  };
}

// src/session.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNil(value) {
  return value === null || value === void 0;
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
  if (isNil(expected) && isNil(actual)) {
    return true;
  }
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
function txIdsFromPayload(payload) {
  if (Array.isArray(payload.txIds) && payload.txIds.length > 0) {
    return [...payload.txIds];
  }
  if (typeof payload.txId === "number") {
    return [payload.txId];
  }
  return [];
}
function aaRequestedModeFromPreference(preference) {
  if (preference === "none") return "none";
  if (preference === "eip7702") return "7702";
  return "4337";
}
function aaModeFromExecutionKind(executionKind) {
  if (!executionKind) return void 0;
  if (executionKind.endsWith("_4337")) return "4337";
  if (executionKind.endsWith("_7702")) return "7702";
  if (executionKind === "eoa") return "none";
  return void 0;
}
var ClientSession = class extends TypedEventEmitter {
  constructor(clientOrOptions, sessionOptions) {
    var _a, _b, _c, _d, _e;
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
    this.sessionId = (_a = sessionOptions == null ? void 0 : sessionOptions.sessionId) != null ? _a : crypto.randomUUID();
    this.app = (_b = sessionOptions == null ? void 0 : sessionOptions.app) != null ? _b : "default";
    this.publicKey = sessionOptions == null ? void 0 : sessionOptions.publicKey;
    this.apiKey = sessionOptions == null ? void 0 : sessionOptions.apiKey;
    const initialUserState = UserState.normalize(sessionOptions == null ? void 0 : sessionOptions.userState);
    this.userState = (sessionOptions == null ? void 0 : sessionOptions.clientType) ? UserState.withExt(initialUserState != null ? initialUserState : {}, "client_type", sessionOptions.clientType) : initialUserState;
    this.clientId = (_c = sessionOptions == null ? void 0 : sessionOptions.clientId) != null ? _c : crypto.randomUUID();
    this.syncPendingTxRequestsFromUserState = (_d = sessionOptions == null ? void 0 : sessionOptions.syncPendingTxRequestsFromUserState) != null ? _d : true;
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
    var _a, _b, _c, _d, _e, _f;
    const req = this.removeWalletRequest(requestId);
    if (!req) {
      throw new Error(`No pending wallet request with id "${requestId}"`);
    }
    if (req.kind === "transaction") {
      const txPayload = req.payload;
      const pendingTxIds = txIdsFromPayload(txPayload);
      const requestedMode = (_a = result.aaRequestedMode) != null ? _a : aaRequestedModeFromPreference(txPayload.aaPreference);
      const resolvedMode = (_c = (_b = result.aaResolvedMode) != null ? _b : aaModeFromExecutionKind(result.executionKind)) != null ? _c : requestedMode;
      await this.sendSystemEvent("wallet:tx_complete", {
        txHash: (_d = result.txHash) != null ? _d : "",
        status: "success",
        amount: result.amount,
        pending_tx_ids: pendingTxIds,
        aa_requested_mode: requestedMode,
        aa_resolved_mode: resolvedMode,
        aa_fallback_reason: result.aaFallbackReason,
        execution_kind: result.executionKind,
        batched: (_e = result.batched) != null ? _e : pendingTxIds.length > 1,
        call_count: (_f = result.callCount) != null ? _f : pendingTxIds.length,
        sponsored: result.sponsored,
        smart_account_address: result.smartAccountAddress,
        delegation_address: result.delegationAddress
      });
    } else {
      const eip712Payload = req.payload;
      await this.sendSystemEvent("wallet_eip712_response", __spreadValues({
        status: "success",
        signature: result.signature,
        description: eip712Payload.description
      }, eip712Payload.eip712Id !== void 0 ? { pending_eip712_id: eip712Payload.eip712Id } : {}));
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
      const txPayload = req.payload;
      const pendingTxIds = txIdsFromPayload(txPayload);
      const requestedMode = aaRequestedModeFromPreference(txPayload.aaPreference);
      await this.sendSystemEvent("wallet:tx_complete", {
        txHash: "",
        status: "failed",
        error: reason != null ? reason : "Request rejected",
        pending_tx_ids: pendingTxIds,
        aa_requested_mode: requestedMode,
        aa_resolved_mode: requestedMode,
        aa_fallback_reason: void 0,
        execution_kind: void 0,
        batched: pendingTxIds.length > 1,
        call_count: pendingTxIds.length,
        sponsored: void 0,
        smart_account_address: void 0,
        delegation_address: void 0
      });
    } else {
      const eip712Payload = req.payload;
      await this.sendSystemEvent("wallet_eip712_response", __spreadValues({
        status: "failed",
        error: reason != null ? reason : "Request rejected",
        description: eip712Payload.description
      }, eip712Payload.eip712Id !== void 0 ? { pending_eip712_id: eip712Payload.eip712Id } : {}));
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
    var _a;
    if (this.closed) return;
    this.closed = true;
    this.stopPolling();
    (_a = this.unsubscribeSSE) == null ? void 0 : _a.call(this);
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
  /** Latest authoritative backend user_state snapshot seen by this session. */
  getUserState() {
    return this.userState ? __spreadValues({}, this.userState) : void 0;
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
    this.userState = UserState.normalize(userState);
    const address = UserState.address(this.userState);
    const isConnected = UserState.isConnected(this.userState);
    if (address && isConnected !== false) {
      this.publicKey = address;
    } else {
      this.publicKey = void 0;
    }
    this.syncWalletRequests();
  }
  setClientType(clientType) {
    var _a;
    this.resolveUserState(UserState.withExt((_a = this.userState) != null ? _a : {}, "client_type", clientType));
  }
  addExtValue(key, value) {
    var _a;
    const current = (_a = this.userState) != null ? _a : {};
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
    this.resolveUserState({
      address,
      chain_id: chainId != null ? chainId : 1,
      is_connected: true
    });
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
    var _a;
    if (this.pollTimer || this.closed) return;
    this._backendWasProcessing = true;
    (_a = this.logger) == null ? void 0 : _a.debug("[session] polling started", this.sessionId);
    this.pollTimer = setInterval(() => {
      void this.pollTick();
    }, this.pollIntervalMs);
  }
  /** Stop polling for state updates. Idempotent — no-op if not polling. */
  stopPolling() {
    var _a;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      (_a = this.logger) == null ? void 0 : _a.debug("[session] polling stopped", this.sessionId);
    }
  }
  async pollTick() {
    var _a;
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
      (_a = this.logger) == null ? void 0 : _a.debug("[session] poll error", error);
      this.emit("error", { error });
    }
  }
  // ===========================================================================
  // Internal — State Application
  // ===========================================================================
  applyState(state) {
    var _a;
    if (state.user_state) {
      this.resolveUserState(state.user_state);
    }
    if (state.messages) {
      this._messages = state.messages;
      this.emit("messages", this._messages);
    }
    if (state.title) {
      this._title = state.title;
    }
    if ((_a = state.system_events) == null ? void 0 : _a.length) {
      this.dispatchSystemEvents(state.system_events);
    }
  }
  dispatchSystemEvents(events) {
    var _a;
    for (const event of events) {
      const unwrapped = unwrapSystemEvent(event);
      if (!unwrapped) continue;
      if (unwrapped.type === "wallet_tx_request") {
        const normalizedPayload = normalizeTxPayload(unwrapped.payload);
        const payload = normalizedPayload ? hydrateTxPayloadFromUserState(normalizedPayload, this.userState) : null;
        if (payload) {
          const req = this.enqueueWalletRequest("transaction", payload);
          this.emit("wallet_tx_request", req);
        }
      } else if (unwrapped.type === "wallet_eip712_request") {
        const payload = normalizeEip712Payload((_a = unwrapped.payload) != null ? _a : {});
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
    var _a;
    const id = this.getWalletRequestId(kind, payload);
    const existing = this.walletRequests.find((request) => request.id === id);
    const req = {
      id,
      kind,
      payload,
      timestamp: (_a = existing == null ? void 0 : existing.timestamp) != null ? _a : Date.now()
    };
    this.walletRequests = existing ? this.walletRequests.map((request) => request.id === id ? req : request) : [...this.walletRequests, req];
    if (kind === "transaction") {
      const nextTxIds = txIdsFromPayload(payload);
      if (nextTxIds.length > 1) {
        const nextTxIdSet = new Set(nextTxIds);
        this.walletRequests = this.walletRequests.filter((request) => {
          if (request.id === id || request.kind !== "transaction") {
            return true;
          }
          const requestTxIds = txIdsFromPayload(request.payload);
          if (requestTxIds.length === 0) {
            return true;
          }
          return !requestTxIds.every((txId) => nextTxIdSet.has(txId));
        });
      }
    }
    this.emit("wallet_requests_changed", this.getPendingRequests());
    return req;
  }
  removeWalletRequest(id) {
    const idx = this.walletRequests.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const [request] = this.walletRequests.splice(idx, 1);
    this.emit("wallet_requests_changed", this.getPendingRequests());
    return request;
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
    const expectedUserState = UserState.normalize(this.userState);
    const normalizedActualUserState = UserState.normalize(actualUserState);
    if (!expectedUserState || !normalizedActualUserState) {
      return;
    }
    if (!isSubsetMatch(expectedUserState, normalizedActualUserState)) {
      const expected = JSON.stringify(sortJson(expectedUserState));
      const actual = JSON.stringify(sortJson(normalizedActualUserState));
      console.warn(
        `[session] Backend user_state mismatch (non-fatal). expected subset=${expected} actual=${actual}`
      );
    }
  }
  getWalletRequestId(kind, payload) {
    if (kind === "transaction") {
      const txPayload = payload;
      if (typeof txPayload.requestId === "string" && txPayload.requestId.length > 0) {
        return `txreq-${txPayload.requestId}`;
      }
      const txIds = txIdsFromPayload(txPayload);
      if (txIds.length > 0) {
        return `tx-${txIds.join("-")}`;
      }
    } else {
      const eip712Id = payload.eip712Id;
      if (typeof eip712Id === "number") {
        return `eip712-${eip712Id}`;
      }
    }
    return `wreq-${this.walletRequestNextId++}`;
  }
  syncWalletRequests() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const nextRequests = [];
    const pendingTxs = isRecord((_a = this.userState) == null ? void 0 : _a.pending_txs) ? (_b = this.userState) == null ? void 0 : _b.pending_txs : void 0;
    const pendingEip712s = isRecord((_c = this.userState) == null ? void 0 : _c.pending_eip712s) ? (_d = this.userState) == null ? void 0 : _d.pending_eip712s : void 0;
    const pendingTxEntries = Object.entries(pendingTxs != null ? pendingTxs : {}).filter(([id]) => Number.isInteger(Number(id))).sort((left, right) => Number(left[0]) - Number(right[0]));
    const pendingTxIdSet = new Set(pendingTxEntries.map(([id]) => Number(id)));
    const coveredPendingTxIds = /* @__PURE__ */ new Set();
    const existingTxRequests = this.walletRequests.filter(
      (request) => request.kind === "transaction"
    ).map((request) => ({
      request,
      txIds: txIdsFromPayload(request.payload)
    })).filter(
      ({ txIds }) => txIds.length > 0 && txIds.every((txId) => pendingTxIdSet.has(txId))
    ).sort((left, right) => {
      if (left.txIds.length !== right.txIds.length) {
        return right.txIds.length - left.txIds.length;
      }
      return left.request.timestamp - right.request.timestamp;
    });
    for (const { request, txIds } of existingTxRequests) {
      if (txIds.some((txId) => coveredPendingTxIds.has(txId))) {
        continue;
      }
      const payload = hydrateTxPayloadFromUserState(
        request.payload,
        { pending_txs: pendingTxs != null ? pendingTxs : {} }
      );
      const requestId = this.getWalletRequestId("transaction", payload);
      nextRequests.push({
        id: requestId,
        kind: "transaction",
        payload,
        timestamp: request.timestamp
      });
      txIds.forEach((txId) => coveredPendingTxIds.add(txId));
    }
    if (this.syncPendingTxRequestsFromUserState) {
      for (const [id, raw] of pendingTxEntries) {
        const txId = Number(id);
        if (coveredPendingTxIds.has(txId)) {
          continue;
        }
        const payload = hydrateTxPayloadFromUserState(
          {
            txId,
            txIds: [txId],
            aaPreference: "auto"
          },
          {
            pending_txs: {
              [id]: isRecord(raw) ? raw : {}
            }
          }
        );
        const requestId = this.getWalletRequestId("transaction", payload);
        nextRequests.push({
          id: requestId,
          kind: "transaction",
          payload,
          timestamp: (_f = (_e = this.walletRequests.find((request) => request.id === requestId)) == null ? void 0 : _e.timestamp) != null ? _f : Date.now()
        });
      }
    }
    for (const [id, raw] of Object.entries(pendingEip712s != null ? pendingEip712s : {}).sort(
      (left, right) => Number(left[0]) - Number(right[0])
    )) {
      const payload = normalizeEip712Payload(__spreadProps(__spreadValues({}, isRecord(raw) ? raw : {}), {
        pending_eip712_id: Number(id)
      }));
      const requestId = this.getWalletRequestId("eip712_sign", payload);
      nextRequests.push({
        id: requestId,
        kind: "eip712_sign",
        payload,
        timestamp: (_h = (_g = this.walletRequests.find((request) => request.id === requestId)) == null ? void 0 : _g.timestamp) != null ? _h : Date.now()
      });
    }
    if (nextRequests.length === this.walletRequests.length && nextRequests.every((request, index) => {
      const current = this.walletRequests[index];
      return (current == null ? void 0 : current.id) === request.id && current.kind === request.kind && JSON.stringify(current.payload) === JSON.stringify(request.payload);
    })) {
      return;
    }
    this.walletRequests = nextRequests;
    this.emit("wallet_requests_changed", this.getPendingRequests());
  }
};

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
function getWalletExecutorReady(providerState) {
  return !providerState.resolved || !providerState.pending && (Boolean(providerState.account) || Boolean(providerState.error) || providerState.resolved.fallbackToEoa);
}
var DEFAULT_AA_CONFIG = {
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
var DISABLED_PROVIDER_STATE = {
  resolved: null,
  account: void 0,
  pending: false,
  error: null
};

// src/aa/execute.ts
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// src/chains.ts
import { mainnet, polygon, arbitrum, optimism, base, sepolia, foundry } from "viem/chains";
var ALCHEMY_CHAIN_SLUGS = {
  1: "eth-mainnet",
  137: "polygon-mainnet",
  42161: "arb-mainnet",
  8453: "base-mainnet",
  10: "opt-mainnet",
  11155111: "eth-sepolia"
};
var CHAINS_BY_ID = {
  1: mainnet,
  137: polygon,
  42161: arbitrum,
  10: optimism,
  8453: base,
  11155111: sepolia,
  31337: foundry
};

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
    getPreferredRpcUrl
  } = params;
  if (providerState.resolved && providerState.account) {
    try {
      return await executeViaAA(callList, providerState);
    } catch (error) {
      if (!shouldFallbackFromAAError(error, providerState)) {
        throw error;
      }
      const errorKind = classifyAAFallbackError(error);
      console.error("[aomi][aa] AA execution failed; falling back to EOA", {
        provider: providerState.account.provider,
        mode: providerState.resolved.mode,
        chainId: providerState.resolved.chainId,
        callCount: callList.length,
        errorKind,
        error: toErrorMessage(error)
      });
      if (errorKind === "simulation_revert") {
        console.warn(
          "[aomi][aa] 4337 simulation reverted. This often means the smart account context (balance/allowance/state) differs from EOA."
        );
      }
      if (errorKind === "insufficient_prefund") {
        console.warn(
          "[aomi][aa] 4337 precheck indicates insufficient sender balance/deposit. Configure sponsorship or fund the smart account."
        );
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
        getPreferredRpcUrl
      });
    }
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
    getPreferredRpcUrl
  });
}
async function executeViaAA(callList, providerState) {
  var _a;
  const account = providerState.account;
  const resolved = providerState.resolved;
  if (!account || !resolved) {
    throw (_a = providerState.error) != null ? _a : new Error("smart_account_unavailable");
  }
  const callsPayload = callList.map(({ to, value, data }) => ({ to, value, data }));
  const sendAARequest = async () => {
    return callList.length > 1 ? account.sendBatchTransaction(callsPayload) : account.sendTransaction(callsPayload[0]);
  };
  let receipt;
  try {
    receipt = await sendAARequest();
  } catch (error) {
    if (!isRetryableBundlerSubmissionError(error)) {
      throw error;
    }
    console.warn("[aomi][aa] transient bundler submission error; retrying once", {
      provider: account.provider,
      mode: account.mode,
      chainId: resolved.chainId,
      callCount: callList.length,
      error: toErrorMessage(error)
    });
    try {
      receipt = await sendAARequest();
    } catch (retryError) {
      console.error("[aomi][aa] AA retry failed after transient bundler submission error", {
        provider: account.provider,
        mode: account.mode,
        chainId: resolved.chainId,
        callCount: callList.length,
        firstError: toErrorMessage(error),
        retryError: toErrorMessage(retryError)
      });
      throw retryError;
    }
  }
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
  var _a, _b, _c, _d;
  try {
    const chainId = (_a = callList[0]) == null ? void 0 : _a.chainId;
    if (!chainId) return void 0;
    const chain = CHAINS_BY_ID[chainId];
    if (!chain) return void 0;
    const client = createPublicClient({ chain, transport: http() });
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
  getPreferredRpcUrl
}) {
  var _a, _b;
  const hashes = [];
  if (localPrivateKey) {
    for (const call of callList) {
      const chain = chainsById[call.chainId];
      if (!chain) {
        throw new Error(`Unsupported chain ${call.chainId}`);
      }
      const rpcUrl = getPreferredRpcUrl(chain);
      if (!rpcUrl) {
        throw new Error(`No RPC for chain ${call.chainId}`);
      }
      const account = privateKeyToAccount(localPrivateKey);
      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpcUrl)
      });
      const hash = await walletClient.sendTransaction({
        account,
        to: call.to,
        value: call.value,
        data: call.data
      });
      const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl)
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
  const chainCaps = resolveChainCapabilities(capabilities, chainId);
  const atomicStatus = (_a = chainCaps == null ? void 0 : chainCaps.atomic) == null ? void 0 : _a.status;
  const canUseSendCalls = atomicStatus === "supported" || atomicStatus === "ready";
  const atomicCapabilityRequest = canUseSendCalls ? { optional: true } : void 0;
  const sendSequentially = async () => {
    for (const call of callList) {
      const hash = await sendTransactionAsync({
        chainId: call.chainId,
        to: call.to,
        value: call.value,
        data: call.data
      });
      hashes.push(hash);
    }
  };
  if (canUseSendCalls) {
    try {
      const batchResult = await sendCallsSyncAsync({
        chainId,
        calls: callList.map(({ to, value, data }) => ({ to, value, data })),
        capabilities: atomicCapabilityRequest ? {
          atomic: atomicCapabilityRequest
        } : void 0
      });
      const receipts = (_b = batchResult.receipts) != null ? _b : [];
      for (const receipt of receipts) {
        if (receipt.transactionHash) {
          hashes.push(receipt.transactionHash);
        }
      }
    } catch (error) {
      if (!isUnsupportedAtomicCapabilityError(error)) {
        throw error;
      }
      await sendSequentially();
    }
  } else {
    await sendSequentially();
  }
  return {
    txHash: hashes[hashes.length - 1],
    txHashes: hashes,
    executionKind: "eoa",
    batched: hashes.length > 1,
    sponsored: false
  };
}
function isUnsupportedAtomicCapabilityError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return lowered.includes("unsupported non-optional capabilities: atomic") || lowered.includes("unsupported") && lowered.includes("atomic") || lowered.includes("wallet does not support") && lowered.includes("capabilit");
}
function toErrorMessage(error) {
  var _a;
  if (error instanceof Error) {
    return (_a = error.stack) != null ? _a : error.message;
  }
  return String(error);
}
function shouldFallbackFromAAError(error, providerState) {
  if (!providerState.resolved) {
    return false;
  }
  if (providerState.resolved.mode !== "4337") {
    return false;
  }
  return isRetryableBundlerSubmissionError(error) || isAASimulationRevertError(error) || isAAInsufficientPrefundError(error);
}
function isRetryableBundlerSubmissionError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return lowered.includes("bundle id is unknown") || lowered.includes("bundle id unknown") || lowered.includes("has not been submitted") || lowered.includes("userop") && lowered.includes("not found") || lowered.includes("user operation") && lowered.includes("not found");
}
function isAASimulationRevertError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return lowered.includes("eth_estimateuseroperationgas") && lowered.includes("execution reverted");
}
function isAAInsufficientPrefundError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return lowered.includes("sender balance and deposit together") || lowered.includes("precheck failed") && lowered.includes("must be at least");
}
function classifyAAFallbackError(error) {
  if (isRetryableBundlerSubmissionError(error)) {
    return "retryable_bundler";
  }
  if (isAAInsufficientPrefundError(error)) {
    return "insufficient_prefund";
  }
  if (isAASimulationRevertError(error)) {
    return "simulation_revert";
  }
  return "other";
}
function resolveChainCapabilities(capabilities, chainId) {
  var _a, _b;
  if (!capabilities) {
    return void 0;
  }
  const asRecord2 = capabilities;
  const eip155Key = `eip155:${chainId}`;
  const decimalKey = String(chainId);
  const hexKey = `0x${chainId.toString(16)}`;
  return (_b = (_a = asRecord2[eip155Key]) != null ? _a : asRecord2[decimalKey]) != null ? _b : asRecord2[hexKey];
}

// src/aa/alchemy/provider.ts
function resolveForHook(params) {
  var _a, _b;
  const { calls, localPrivateKey, accountAbstractionConfig, chainsById, getPreferredRpcUrl } = params;
  if (!calls || localPrivateKey) return null;
  const config = __spreadProps(__spreadValues({}, accountAbstractionConfig), { provider: "alchemy" });
  const chainConfig = getAAChainConfig(config, calls, chainsById);
  if (!chainConfig) return null;
  const apiKey = (_a = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) == null ? void 0 : _a.trim();
  if (!apiKey) return null;
  const chain = chainsById[chainConfig.chainId];
  if (!chain) return null;
  const gasPolicyId = (_b = process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID) == null ? void 0 : _b.trim();
  const resolved = buildAAExecutionPlan(config, chainConfig);
  return __spreadProps(__spreadValues({}, resolved), {
    apiKey,
    chain,
    rpcUrl: getPreferredRpcUrl(chain),
    gasPolicyId,
    mode: chainConfig.defaultMode
  });
}
function createAlchemyAAProvider({
  accountAbstractionConfig = DEFAULT_AA_CONFIG,
  useAlchemyAA,
  chainsById,
  chainSlugById,
  getPreferredRpcUrl
}) {
  return function useAlchemyAAProvider(calls, localPrivateKey) {
    var _a;
    const resolved = resolveForHook({
      calls,
      localPrivateKey,
      accountAbstractionConfig,
      chainsById,
      chainSlugById,
      getPreferredRpcUrl
    });
    const params = resolved ? {
      enabled: true,
      apiKey: resolved.apiKey,
      chain: resolved.chain,
      rpcUrl: resolved.rpcUrl,
      gasPolicyId: resolved.gasPolicyId,
      mode: resolved.mode
    } : void 0;
    const query = useAlchemyAA(params);
    return {
      resolved: resolved != null ? resolved : null,
      account: query.account,
      pending: Boolean(resolved && query.pending),
      error: (_a = query.error) != null ? _a : null
    };
  };
}

// src/aa/alchemy/create.ts
import { privateKeyToAccount as privateKeyToAccount3 } from "viem/accounts";

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
function isAlchemySponsorshipLimitError(error) {
  const message = error instanceof Error ? error.message : String(error != null ? error : "");
  const normalized = message.toLowerCase();
  return normalized.includes("gas sponsorship limit") || normalized.includes("put your team over your gas sponsorship limit") || normalized.includes("buy gas credits in your gas manager dashboard");
}

// src/aa/owner.ts
import { privateKeyToAccount as privateKeyToAccount2 } from "viem/accounts";
function getDirectOwnerParams(owner) {
  return {
    kind: "ready",
    ownerParams: {
      para: void 0,
      signer: privateKeyToAccount2(owner.privateKey)
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

// src/aa/alchemy/create.ts
var ALCHEMY_7702_DELEGATION_ADDRESS = "0x69007702764179f14F51cdce752f4f775d74E139";
var AA_DEBUG_ENABLED = process.env.AOMI_AA_DEBUG === "1";
var EIP_7702_AUTH_GAS_OVERHEAD = BigInt(25e3);
function alchemyRpcUrl(chainId, apiKey) {
  var _a;
  const slug = (_a = ALCHEMY_CHAIN_SLUGS[chainId]) != null ? _a : "eth-mainnet";
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
  var _a;
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/Account with address (0x[a-fA-F0-9]{40}) already exists/);
  return (_a = match == null ? void 0 : match[1]) != null ? _a : null;
}
function deriveAlchemy4337AccountId(address) {
  var _a;
  const hex = address.toLowerCase().slice(2).padEnd(32, "0").slice(0, 32).split("");
  const namespace = ["4", "3", "3", "7", "5", "a", "a", "b"];
  for (let i = 0; i < namespace.length; i += 1) {
    hex[i] = namespace[i];
  }
  hex[12] = "4";
  const variant = Number.parseInt((_a = hex[16]) != null ? _a : "0", 16);
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
  var _a, _b;
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
  const gasPolicyId = sponsored ? (_b = options.gasPolicyId) != null ? _b : (_a = process.env.ALCHEMY_GAS_POLICY_ID) == null ? void 0 : _a.trim() : void 0;
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
  const signer = privateKeyToAccount3(params.privateKey);
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
    var _a, _b, _c, _d;
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
      const transactionHash = (_b = (_a = status.receipts) == null ? void 0 : _a[0]) == null ? void 0 : _b.transactionHash;
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
  const { createWalletClient: createWalletClient2, createPublicClient: createPublicClient2, http: http2 } = await import("viem");
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
  const signer = privateKeyToAccount3(params.privateKey);
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
  const publicClient = createPublicClient2({
    chain: params.chain,
    transport: http2(rpcUrl)
  });
  const send7702 = async (calls) => {
    aaDebug("7702:send:start", {
      signerAddress,
      chainId: params.chain.id,
      callCount: calls.length,
      calls: calls.map((call) => {
        var _a;
        return {
          to: call.to,
          value: call.value.toString(),
          data: (_a = call.data) != null ? _a : "0x"
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
        var _a;
        return {
          to: call.to,
          value: call.value,
          data: (_a = call.data) != null ? _a : "0x"
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

// src/aa/pimlico/resolve.ts
function resolvePimlicoConfig(options) {
  var _a, _b, _c;
  const {
    calls,
    localPrivateKey,
    accountAbstractionConfig = DEFAULT_AA_CONFIG,
    chainsById,
    rpcUrl,
    modeOverride,
    publicOnly = false,
    throwOnMissingConfig = false,
    apiKey: preResolvedApiKey
  } = options;
  if (!calls || localPrivateKey) {
    return null;
  }
  const config = __spreadProps(__spreadValues({}, accountAbstractionConfig), {
    provider: "pimlico"
  });
  const chainConfig = getAAChainConfig(config, calls, chainsById);
  if (!chainConfig) {
    if (throwOnMissingConfig) {
      const chainIds = Array.from(new Set(calls.map((c) => c.chainId)));
      throw new Error(
        `AA is not configured for chain ${chainIds[0]}, or batching is disabled for that chain.`
      );
    }
    return null;
  }
  const apiKey = (_c = preResolvedApiKey != null ? preResolvedApiKey : (_a = process.env.PIMLICO_API_KEY) == null ? void 0 : _a.trim()) != null ? _c : publicOnly ? (_b = process.env.NEXT_PUBLIC_PIMLICO_API_KEY) == null ? void 0 : _b.trim() : void 0;
  if (!apiKey) {
    if (throwOnMissingConfig) {
      throw new Error("Pimlico AA requires PIMLICO_API_KEY.");
    }
    return null;
  }
  const chain = chainsById[chainConfig.chainId];
  if (!chain) {
    return null;
  }
  if (modeOverride && !chainConfig.supportedModes.includes(modeOverride)) {
    if (throwOnMissingConfig) {
      throw new Error(
        `AA mode "${modeOverride}" is not supported on chain ${chainConfig.chainId}.`
      );
    }
    return null;
  }
  const resolvedChainConfig = modeOverride ? __spreadProps(__spreadValues({}, chainConfig), { defaultMode: modeOverride }) : chainConfig;
  const resolved = buildAAExecutionPlan(config, resolvedChainConfig);
  return __spreadProps(__spreadValues({}, resolved), {
    apiKey,
    chain,
    rpcUrl,
    mode: resolvedChainConfig.defaultMode
  });
}

// src/aa/pimlico/provider.ts
function createPimlicoAAProvider({
  accountAbstractionConfig = DEFAULT_AA_CONFIG,
  usePimlicoAA,
  chainsById,
  rpcUrl
}) {
  return function usePimlicoAAProvider(calls, localPrivateKey) {
    var _a;
    const resolved = resolvePimlicoConfig({
      calls,
      localPrivateKey,
      accountAbstractionConfig,
      chainsById,
      rpcUrl,
      publicOnly: true
    });
    const params = resolved ? {
      enabled: true,
      apiKey: resolved.apiKey,
      chain: resolved.chain,
      mode: resolved.mode,
      rpcUrl: resolved.rpcUrl
    } : void 0;
    const query = usePimlicoAA(params);
    return {
      resolved: resolved != null ? resolved : null,
      account: query.account,
      pending: Boolean(resolved && query.pending),
      error: (_a = query.error) != null ? _a : null
    };
  };
}

// src/aa/pimlico/create.ts
import { privateKeyToAccount as privateKeyToAccount4 } from "viem/accounts";
var AA_DEBUG_ENABLED2 = process.env.AOMI_AA_DEBUG === "1";
function pimDebug(message, fields) {
  if (!AA_DEBUG_ENABLED2) return;
  if (fields) {
    console.debug(`[aomi][aa][pimlico] ${message}`, fields);
    return;
  }
  console.debug(`[aomi][aa][pimlico] ${message}`);
}
async function createPimlicoAAState(options) {
  var _a, _b;
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
  const apiKey = (_b = options.apiKey) != null ? _b : (_a = process.env.PIMLICO_API_KEY) == null ? void 0 : _a.trim();
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
  const { createPublicClient: createPublicClient2, http: http2 } = await import("viem");
  const { entryPoint07Address } = await import("viem/account-abstraction");
  const signer = privateKeyToAccount4(params.privateKey);
  const signerAddress = signer.address;
  const pimlicoRpcUrl = buildPimlicoRpcUrl(params.chain, params.apiKey);
  pimDebug("4337:start", {
    signerAddress,
    chainId: params.chain.id,
    pimlicoRpcUrl: pimlicoRpcUrl.replace(params.apiKey, "***")
  });
  const publicClient = createPublicClient2({
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
        var _a;
        return {
          to: c.to,
          value: c.value,
          data: (_a = c.data) != null ? _a : "0x"
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
export {
  AomiClient,
  CLIENT_TYPE_TS_CLI,
  CLIENT_TYPE_WEB_UI,
  DEFAULT_AA_CONFIG,
  DISABLED_PROVIDER_STATE,
  ClientSession as Session,
  TypedEventEmitter,
  UserState,
  adaptSmartAccount,
  addUserStateExt,
  buildAAExecutionPlan,
  createAAProviderState,
  createAlchemyAAProvider,
  createPimlicoAAProvider,
  executeWalletCalls,
  getAAChainConfig,
  getWalletExecutorReady,
  hydrateTxPayloadFromUserState,
  isAlchemySponsorshipLimitError,
  isAsyncCallback,
  isInlineCall,
  isSystemError,
  isSystemNotice,
  normalizeEip712Payload,
  normalizeTxPayload,
  resolvePimlicoConfig,
  toAAWalletCall,
  toAAWalletCalls,
  toViemSignTypedDataArgs,
  unwrapSystemEvent
};
//# sourceMappingURL=index.js.map