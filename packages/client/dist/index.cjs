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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AomiClient: () => AomiClient,
  DEFAULT_AA_CONFIG: () => DEFAULT_AA_CONFIG,
  Session: () => ClientSession,
  TypedEventEmitter: () => TypedEventEmitter,
  adaptSmartAccount: () => adaptSmartAccount,
  buildAAExecutionPlan: () => buildAAExecutionPlan,
  createAAProviderState: () => createAAProviderState,
  createAlchemyAAProvider: () => createAlchemyAAProvider,
  createPimlicoAAProvider: () => createPimlicoAAProvider,
  executeWalletCalls: () => executeWalletCalls,
  getAAChainConfig: () => getAAChainConfig,
  getWalletExecutorReady: () => getWalletExecutorReady,
  isAlchemySponsorshipLimitError: () => isAlchemySponsorshipLimitError,
  isAsyncCallback: () => isAsyncCallback,
  isInlineCall: () => isInlineCall,
  isProviderConfigured: () => isProviderConfigured,
  isSystemError: () => isSystemError,
  isSystemNotice: () => isSystemNotice,
  normalizeEip712Payload: () => normalizeEip712Payload,
  normalizeTxPayload: () => normalizeTxPayload,
  parseAAConfig: () => parseAAConfig,
  readEnv: () => readEnv,
  resolveAlchemyConfig: () => resolveAlchemyConfig,
  resolveDefaultProvider: () => resolveDefaultProvider,
  resolvePimlicoConfig: () => resolvePimlicoConfig,
  toViemSignTypedDataArgs: () => toViemSignTypedDataArgs,
  unwrapSystemEvent: () => unwrapSystemEvent
});
module.exports = __toCommonJS(index_exports);

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
  async fetchState(sessionId, userState) {
    const url = new URL("/api/state", this.baseUrl);
    if (userState) {
      url.searchParams.set("user_state", JSON.stringify(userState));
    }
    const response = await fetch(url.toString(), {
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
    const payload = { message, app };
    if (options == null ? void 0 : options.publicKey) {
      payload.public_key = options.publicKey;
    }
    if (options == null ? void 0 : options.userState) {
      payload.user_state = JSON.stringify(options.userState);
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
    const url = `${this.baseUrl}/api/sessions?public_key=${encodeURIComponent(publicKey)}`;
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
    const url = `${this.baseUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
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
    const url = `${this.baseUrl}/api/sessions`;
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
    const url = `${this.baseUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
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
    const url = `${this.baseUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
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
    const url = `${this.baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/archive`;
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
    const url = `${this.baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/unarchive`;
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
    const url = new URL("/api/events", this.baseUrl);
    if (count !== void 0) {
      url.searchParams.set("count", String(count));
    }
    const response = await fetch(url.toString(), {
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
    const url = new URL("/api/control/apps", this.baseUrl);
    if (options == null ? void 0 : options.publicKey) {
      url.searchParams.set("public_key", options.publicKey);
    }
    const apiKey = (_a = options == null ? void 0 : options.apiKey) != null ? _a : this.apiKey;
    const headers = new Headers(withSessionHeader(sessionId));
    if (apiKey) {
      headers.set(API_KEY_HEADER, apiKey);
    }
    const response = await fetch(url.toString(), { headers });
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
    const url = new URL("/api/control/models", this.baseUrl);
    const apiKey = (_a = options == null ? void 0 : options.apiKey) != null ? _a : this.apiKey;
    const headers = new Headers(withSessionHeader(sessionId));
    if (apiKey) {
      headers.set(API_KEY_HEADER, apiKey);
    }
    const response = await fetch(url.toString(), {
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
    return postState(this.baseUrl, "/api/control/model", payload, sessionId, apiKey);
  }
};

// src/types.ts
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

// src/event-emitter.ts
var TypedEventEmitter = class {
  constructor() {
    this.listeners = /* @__PURE__ */ new Map();
  }
  /**
   * Subscribe to an event type. Returns an unsubscribe function.
   */
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
  /**
   * Subscribe to an event type for a single emission, then auto-unsubscribe.
   */
  once(type, handler) {
    const wrapper = ((payload) => {
      unsub();
      handler(payload);
    });
    const unsub = this.on(type, wrapper);
    return unsub;
  }
  /**
   * Emit an event to all listeners of `type` and wildcard `"*"` listeners.
   */
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
  /**
   * Remove a specific handler from an event type.
   */
  off(type, handler) {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    }
  }
  /**
   * Remove all listeners for all event types.
   */
  removeAllListeners() {
    this.listeners.clear();
  }
};

// src/event-unwrap.ts
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
var import_viem = require("viem");
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
function normalizeAddress(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  try {
    return (0, import_viem.getAddress)(trimmed);
  } catch (e) {
    if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
      return (0, import_viem.getAddress)(trimmed.toLowerCase());
    }
    return void 0;
  }
}
function normalizeTxPayload(payload) {
  var _a, _b, _c;
  const root = asRecord(payload);
  const args = getToolArgs(payload);
  const ctx = asRecord(root == null ? void 0 : root.ctx);
  const to = normalizeAddress(args.to);
  if (!to) return null;
  const valueRaw = args.value;
  const value = typeof valueRaw === "string" ? valueRaw : typeof valueRaw === "number" && Number.isFinite(valueRaw) ? String(Math.trunc(valueRaw)) : void 0;
  const data = typeof args.data === "string" ? args.data : void 0;
  const chainId = (_c = (_b = (_a = parseChainId(args.chainId)) != null ? _a : parseChainId(args.chain_id)) != null ? _b : parseChainId(ctx == null ? void 0 : ctx.user_chain_id)) != null ? _c : parseChainId(ctx == null ? void 0 : ctx.userChainId);
  return { to, value, data, chainId };
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
  return { typed_data: typedData, description };
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
var ClientSession = class extends TypedEventEmitter {
  constructor(clientOrOptions, sessionOptions) {
    var _a, _b, _c;
    super();
    // Internal state
    this.pollTimer = null;
    this.unsubscribeSSE = null;
    this._isProcessing = false;
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
    this.userState = sessionOptions == null ? void 0 : sessionOptions.userState;
    this.pollIntervalMs = (_c = sessionOptions == null ? void 0 : sessionOptions.pollIntervalMs) != null ? _c : 500;
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
      userState: this.userState
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
      userState: this.userState
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
    var _a;
    const req = this.removeWalletRequest(requestId);
    if (!req) {
      throw new Error(`No pending wallet request with id "${requestId}"`);
    }
    if (req.kind === "transaction") {
      await this.sendSystemEvent("wallet:tx_complete", {
        txHash: (_a = result.txHash) != null ? _a : "",
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
  resolveWallet(address, chainId) {
    this.resolveUserState({ address, chainId: chainId != null ? chainId : 1, isConnected: true });
  }
  async syncUserState() {
    this.assertOpen();
    const state = await this.client.fetchState(this.sessionId, this.userState);
    this.assertUserStateAligned(state.user_state);
    this.applyState(state);
    return state;
  }
  // ===========================================================================
  // Internal — Polling (ported from PollingController)
  // ===========================================================================
  startPolling() {
    var _a;
    if (this.pollTimer || this.closed) return;
    (_a = this.logger) == null ? void 0 : _a.debug("[session] polling started", this.sessionId);
    this.pollTimer = setInterval(() => {
      void this.pollTick();
    }, this.pollIntervalMs);
  }
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
        this.userState
      );
      if (!this.pollTimer) return;
      this.assertUserStateAligned(state.user_state);
      this.applyState(state);
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
        const payload = normalizeTxPayload(unwrapped.payload);
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
      throw new Error(
        `Backend user_state mismatch. expected subset=${expected} actual=${actual}`
      );
    }
  }
};

// src/aa/types.ts
var MODES = /* @__PURE__ */ new Set(["4337", "7702"]);
var SPONSORSHIP_MODES = /* @__PURE__ */ new Set([
  "disabled",
  "optional",
  "required"
]);
function isObject(value) {
  return typeof value === "object" && value !== null;
}
function assertChainConfig(value, index) {
  if (!isObject(value)) {
    throw new Error(`Invalid AA config chain at index ${index}: expected object`);
  }
  if (typeof value.chainId !== "number") {
    throw new Error(`Invalid AA config chain at index ${index}: chainId must be a number`);
  }
  if (typeof value.enabled !== "boolean") {
    throw new Error(`Invalid AA config chain ${value.chainId}: enabled must be a boolean`);
  }
  if (!MODES.has(value.defaultMode)) {
    throw new Error(`Invalid AA config chain ${value.chainId}: unsupported defaultMode`);
  }
  if (!Array.isArray(value.supportedModes) || value.supportedModes.length === 0) {
    throw new Error(`Invalid AA config chain ${value.chainId}: supportedModes must be a non-empty array`);
  }
  if (!value.supportedModes.every((mode) => MODES.has(mode))) {
    throw new Error(`Invalid AA config chain ${value.chainId}: supportedModes contains an unsupported mode`);
  }
  if (!value.supportedModes.includes(value.defaultMode)) {
    throw new Error(`Invalid AA config chain ${value.chainId}: defaultMode must be in supportedModes`);
  }
  if (typeof value.allowBatching !== "boolean") {
    throw new Error(`Invalid AA config chain ${value.chainId}: allowBatching must be a boolean`);
  }
  if (!SPONSORSHIP_MODES.has(value.sponsorship)) {
    throw new Error(`Invalid AA config chain ${value.chainId}: unsupported sponsorship mode`);
  }
}
function parseAAConfig(value) {
  if (!isObject(value)) {
    throw new Error("Invalid AA config: expected object");
  }
  if (typeof value.enabled !== "boolean") {
    throw new Error("Invalid AA config: enabled must be a boolean");
  }
  if (typeof value.provider !== "string" || !value.provider) {
    throw new Error("Invalid AA config: provider must be a non-empty string");
  }
  if (typeof value.fallbackToEoa !== "boolean") {
    throw new Error("Invalid AA config: fallbackToEoa must be a boolean");
  }
  if (!Array.isArray(value.chains)) {
    throw new Error("Invalid AA config: chains must be an array");
  }
  value.chains.forEach((chain, index) => assertChainConfig(chain, index));
  return {
    enabled: value.enabled,
    provider: value.provider,
    fallbackToEoa: value.fallbackToEoa,
    chains: value.chains
  };
}
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
  return !providerState.plan || !providerState.isPending && (Boolean(providerState.AA) || Boolean(providerState.error) || providerState.plan.fallbackToEoa);
}
function mapCall(call) {
  return {
    to: call.to,
    value: BigInt(call.value),
    data: call.data ? call.data : void 0
  };
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
  if (providerState.plan && providerState.AA) {
    return executeViaAA(callList, providerState);
  }
  if (providerState.plan && providerState.error && !providerState.plan.fallbackToEoa) {
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
  const AA = providerState.AA;
  const plan = providerState.plan;
  if (!AA || !plan) {
    throw (_a = providerState.error) != null ? _a : new Error("smart_account_unavailable");
  }
  const callsPayload = callList.map(mapCall);
  const receipt = callList.length > 1 ? await AA.sendBatchTransaction(callsPayload) : await AA.sendTransaction(callsPayload[0]);
  const txHash = receipt.transactionHash;
  const providerPrefix = AA.provider.toLowerCase();
  return {
    txHash,
    txHashes: [txHash],
    executionKind: `${providerPrefix}_${AA.mode}`,
    batched: callList.length > 1,
    sponsored: plan.sponsorship !== "disabled",
    AAAddress: AA.AAAddress,
    delegationAddress: AA.mode === "7702" ? AA.delegationAddress : void 0
  };
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
  const { createPublicClient, createWalletClient, http } = await import("viem");
  const { privateKeyToAccount: privateKeyToAccount2 } = await import("viem/accounts");
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
      const account = privateKeyToAccount2(localPrivateKey);
      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpcUrl)
      });
      const hash = await walletClient.sendTransaction({
        account,
        to: call.to,
        value: BigInt(call.value),
        data: call.data ? call.data : void 0
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
  const chainCaps = capabilities == null ? void 0 : capabilities[`eip155:${chainId}`];
  const atomicStatus = (_a = chainCaps == null ? void 0 : chainCaps.atomic) == null ? void 0 : _a.status;
  const canUseSendCalls = atomicStatus === "supported" || atomicStatus === "ready";
  if (canUseSendCalls) {
    const batchResult = await sendCallsSyncAsync({
      calls: callList.map(mapCall),
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
        value: BigInt(call.value),
        data: call.data ? call.data : void 0
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

// src/aa/env.ts
var ALCHEMY_API_KEY_ENVS = [
  "ALCHEMY_API_KEY",
  "NEXT_PUBLIC_ALCHEMY_API_KEY"
];
var ALCHEMY_GAS_POLICY_ENVS = [
  "ALCHEMY_GAS_POLICY_ID",
  "NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID"
];
var PIMLICO_API_KEY_ENVS = [
  "PIMLICO_API_KEY",
  "NEXT_PUBLIC_PIMLICO_API_KEY"
];
function readEnv(candidates, options = {}) {
  var _a;
  const { publicOnly = false } = options;
  for (const name of candidates) {
    if (publicOnly && !name.startsWith("NEXT_PUBLIC_")) {
      continue;
    }
    const value = (_a = process.env[name]) == null ? void 0 : _a.trim();
    if (value) return value;
  }
  return void 0;
}
function readGasPolicyEnv(chainId, chainSlugById, baseCandidates, options = {}) {
  const slug = chainSlugById[chainId];
  if (slug) {
    const chainSpecific = baseCandidates.map(
      (base) => `${base}_${slug.toUpperCase()}`
    );
    const found = readEnv(chainSpecific, options);
    if (found) return found;
  }
  return readEnv(baseCandidates, options);
}
function isProviderConfigured(provider, options = {}) {
  return provider === "alchemy" ? Boolean(readEnv(ALCHEMY_API_KEY_ENVS, options)) : Boolean(readEnv(PIMLICO_API_KEY_ENVS, options));
}
function resolveDefaultProvider(options = {}) {
  if (isProviderConfigured("alchemy", options)) return "alchemy";
  if (isProviderConfigured("pimlico", options)) return "pimlico";
  throw new Error(
    "AA requires provider credentials. Set ALCHEMY_API_KEY or PIMLICO_API_KEY, or use --eoa."
  );
}

// src/aa/resolve.ts
function resolveAlchemyConfig(options) {
  const {
    calls,
    localPrivateKey,
    accountAbstractionConfig = DEFAULT_AA_CONFIG,
    chainsById,
    chainSlugById = {},
    getPreferredRpcUrl = (chain2) => {
      var _a;
      return (_a = chain2.rpcUrls.default.http[0]) != null ? _a : "";
    },
    modeOverride,
    publicOnly = false,
    throwOnMissingConfig = false,
    apiKey: preResolvedApiKey,
    gasPolicyId: preResolvedGasPolicyId
  } = options;
  if (!calls || localPrivateKey) {
    return null;
  }
  const config = __spreadProps(__spreadValues({}, accountAbstractionConfig), {
    provider: "alchemy"
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
  const apiKey = preResolvedApiKey != null ? preResolvedApiKey : readEnv(ALCHEMY_API_KEY_ENVS, { publicOnly });
  if (!apiKey) {
    if (throwOnMissingConfig) {
      throw new Error("Alchemy AA requires ALCHEMY_API_KEY.");
    }
    return null;
  }
  const chain = chainsById[chainConfig.chainId];
  if (!chain) {
    return null;
  }
  const gasPolicyId = preResolvedGasPolicyId != null ? preResolvedGasPolicyId : readGasPolicyEnv(
    chainConfig.chainId,
    chainSlugById,
    ALCHEMY_GAS_POLICY_ENVS,
    { publicOnly }
  );
  if (chainConfig.sponsorship === "required" && !gasPolicyId) {
    if (throwOnMissingConfig) {
      throw new Error(
        `Alchemy gas policy required for chain ${chainConfig.chainId} but not configured.`
      );
    }
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
  const plan = buildAAExecutionPlan(config, resolvedChainConfig);
  return {
    chainConfig: resolvedChainConfig,
    plan,
    apiKey,
    chain,
    rpcUrl: getPreferredRpcUrl(chain),
    gasPolicyId,
    mode: resolvedChainConfig.defaultMode
  };
}
function resolvePimlicoConfig(options) {
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
  const apiKey = preResolvedApiKey != null ? preResolvedApiKey : readEnv(PIMLICO_API_KEY_ENVS, { publicOnly });
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
  const plan = buildAAExecutionPlan(config, resolvedChainConfig);
  return {
    chainConfig: resolvedChainConfig,
    plan,
    apiKey,
    chain,
    rpcUrl,
    mode: resolvedChainConfig.defaultMode
  };
}

// src/aa/alchemy.ts
function createAlchemyAAProvider({
  accountAbstractionConfig = DEFAULT_AA_CONFIG,
  useAlchemyAA,
  chainsById,
  chainSlugById,
  getPreferredRpcUrl
}) {
  return function useAlchemyAAProvider(calls, localPrivateKey) {
    var _a, _b;
    const resolved = resolveAlchemyConfig({
      calls,
      localPrivateKey,
      accountAbstractionConfig,
      chainsById,
      chainSlugById,
      getPreferredRpcUrl,
      publicOnly: true
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
      plan: (_a = resolved == null ? void 0 : resolved.plan) != null ? _a : null,
      query,
      AA: query.AA,
      isPending: Boolean(resolved && query.isPending),
      error: (_b = query.error) != null ? _b : null
    };
  };
}

// src/aa/pimlico.ts
function createPimlicoAAProvider({
  accountAbstractionConfig = DEFAULT_AA_CONFIG,
  usePimlicoAA,
  chainsById,
  rpcUrl
}) {
  return function usePimlicoAAProvider(calls, localPrivateKey) {
    var _a, _b;
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
      plan: (_a = resolved == null ? void 0 : resolved.plan) != null ? _a : null,
      query,
      AA: query.AA,
      isPending: Boolean(resolved && query.isPending),
      error: (_b = query.error) != null ? _b : null
    };
  };
}

// src/aa/adapt.ts
function adaptSmartAccount(account) {
  return {
    provider: account.provider,
    mode: account.mode,
    AAAddress: account.smartAccountAddress,
    delegationAddress: account.delegationAddress,
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

// src/aa/create.ts
var import_aa_alchemy = require("@getpara/aa-alchemy");
var import_aa_pimlico = require("@getpara/aa-pimlico");
var import_accounts = require("viem/accounts");
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
      sponsored: options.sponsored
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
function getDirectOwnerParams(owner) {
  return {
    kind: "ready",
    ownerParams: {
      para: void 0,
      signer: (0, import_accounts.privateKeyToAccount)(owner.privateKey)
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
function getMissingOwnerState(plan, provider) {
  return {
    plan,
    AA: null,
    isPending: false,
    error: new Error(
      `${provider} AA account creation requires a direct owner or a supported session owner.`
    )
  };
}
function getUnsupportedAdapterState(plan, adapter) {
  return {
    plan,
    AA: null,
    isPending: false,
    error: new Error(`Session adapter "${adapter}" is not implemented.`)
  };
}
async function createAlchemyAAState(options) {
  var _a, _b;
  const {
    chain,
    owner,
    rpcUrl,
    callList,
    mode,
    sponsored = true
  } = options;
  const resolved = resolveAlchemyConfig({
    calls: callList,
    chainsById: { [chain.id]: chain },
    modeOverride: mode,
    throwOnMissingConfig: true,
    getPreferredRpcUrl: () => rpcUrl,
    apiKey: options.apiKey,
    gasPolicyId: options.gasPolicyId
  });
  if (!resolved) {
    throw new Error("Alchemy AA config resolution failed.");
  }
  const apiKey = (_a = options.apiKey) != null ? _a : resolved.apiKey;
  const gasPolicyId = sponsored ? (_b = options.gasPolicyId) != null ? _b : readEnv(ALCHEMY_GAS_POLICY_ENVS) : void 0;
  const plan = __spreadProps(__spreadValues({}, resolved.plan), {
    sponsorship: gasPolicyId ? resolved.plan.sponsorship : "disabled",
    fallbackToEoa: false
  });
  const ownerParams = getOwnerParams(owner);
  if (ownerParams.kind === "missing") {
    return getMissingOwnerState(plan, "alchemy");
  }
  if (ownerParams.kind === "unsupported_adapter") {
    return getUnsupportedAdapterState(plan, ownerParams.adapter);
  }
  try {
    const smartAccount = await (0, import_aa_alchemy.createAlchemySmartAccount)(__spreadProps(__spreadValues({}, ownerParams.ownerParams), {
      apiKey,
      gasPolicyId,
      chain,
      rpcUrl,
      mode: plan.mode
    }));
    if (!smartAccount) {
      return {
        plan,
        AA: null,
        isPending: false,
        error: new Error("Alchemy AA account could not be initialized.")
      };
    }
    return {
      plan,
      AA: adaptSmartAccount(smartAccount),
      isPending: false,
      error: null
    };
  } catch (error) {
    return {
      plan,
      AA: null,
      isPending: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
async function createPimlicoAAState(options) {
  var _a;
  const {
    chain,
    owner,
    rpcUrl,
    callList,
    mode
  } = options;
  const resolved = resolvePimlicoConfig({
    calls: callList,
    chainsById: { [chain.id]: chain },
    rpcUrl,
    modeOverride: mode,
    throwOnMissingConfig: true,
    apiKey: options.apiKey
  });
  if (!resolved) {
    throw new Error("Pimlico AA config resolution failed.");
  }
  const apiKey = (_a = options.apiKey) != null ? _a : resolved.apiKey;
  const plan = __spreadProps(__spreadValues({}, resolved.plan), {
    fallbackToEoa: false
  });
  const ownerParams = getOwnerParams(owner);
  if (ownerParams.kind === "missing") {
    return getMissingOwnerState(plan, "pimlico");
  }
  if (ownerParams.kind === "unsupported_adapter") {
    return getUnsupportedAdapterState(plan, ownerParams.adapter);
  }
  try {
    const smartAccount = await (0, import_aa_pimlico.createPimlicoSmartAccount)(__spreadProps(__spreadValues({}, ownerParams.ownerParams), {
      apiKey,
      chain,
      rpcUrl,
      mode: plan.mode
    }));
    if (!smartAccount) {
      return {
        plan,
        AA: null,
        isPending: false,
        error: new Error("Pimlico AA account could not be initialized.")
      };
    }
    return {
      plan,
      AA: adaptSmartAccount(smartAccount),
      isPending: false,
      error: null
    };
  } catch (error) {
    return {
      plan,
      AA: null,
      isPending: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AomiClient,
  DEFAULT_AA_CONFIG,
  Session,
  TypedEventEmitter,
  adaptSmartAccount,
  buildAAExecutionPlan,
  createAAProviderState,
  createAlchemyAAProvider,
  createPimlicoAAProvider,
  executeWalletCalls,
  getAAChainConfig,
  getWalletExecutorReady,
  isAlchemySponsorshipLimitError,
  isAsyncCallback,
  isInlineCall,
  isProviderConfigured,
  isSystemError,
  isSystemNotice,
  normalizeEip712Payload,
  normalizeTxPayload,
  parseAAConfig,
  readEnv,
  resolveAlchemyConfig,
  resolveDefaultProvider,
  resolvePimlicoConfig,
  toViemSignTypedDataArgs,
  unwrapSystemEvent
});
//# sourceMappingURL=index.cjs.map