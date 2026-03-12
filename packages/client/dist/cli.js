#!/usr/bin/env node
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
        var _a2;
        subscription.stopped = true;
        if (subscription.retryTimer) {
          clearTimeout(subscription.retryTimer);
          subscription.retryTimer = null;
        }
        (_a2 = subscription.abortController) == null ? void 0 : _a2.abort();
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
      var _a2;
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
          var _a3, _b;
          let parsed2;
          try {
            parsed2 = JSON.parse(data);
          } catch (error) {
            for (const item of subscription.listeners) {
              (_a3 = item.onError) == null ? void 0 : _a3.call(item, error);
            }
            return;
          }
          for (const item of subscription.listeners) {
            try {
              item.onUpdate(parsed2);
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
            (_a2 = item.onError) == null ? void 0 : _a2.call(item, error);
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
    var _a2, _b;
    const namespace = (_a2 = options == null ? void 0 : options.namespace) != null ? _a2 : "default";
    const apiKey = (_b = options == null ? void 0 : options.apiKey) != null ? _b : this.apiKey;
    const payload = { message, namespace };
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
   * Get available namespaces.
   */
  async getNamespaces(sessionId, options) {
    var _a2;
    const url = new URL("/api/control/namespaces", this.baseUrl);
    if (options == null ? void 0 : options.publicKey) {
      url.searchParams.set("public_key", options.publicKey);
    }
    const apiKey = (_a2 = options == null ? void 0 : options.apiKey) != null ? _a2 : this.apiKey;
    const headers = new Headers(withSessionHeader(sessionId));
    if (apiKey) {
      headers.set(API_KEY_HEADER, apiKey);
    }
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error(`Failed to get namespaces: HTTP ${response.status}`);
    }
    return await response.json();
  }
  /**
   * Get available models.
   */
  async getModels(sessionId) {
    const url = new URL("/api/control/models", this.baseUrl);
    const response = await fetch(url.toString(), {
      headers: withSessionHeader(sessionId)
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
    var _a2;
    const apiKey = (_a2 = options == null ? void 0 : options.apiKey) != null ? _a2 : this.apiKey;
    const payload = { rig };
    if (options == null ? void 0 : options.namespace) {
      payload.namespace = options.namespace;
    }
    return postState(this.baseUrl, "/api/control/model", payload, sessionId, apiKey);
  }
};

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

// src/event-unwrap.ts
function unwrapSystemEvent(event) {
  var _a2;
  if (isInlineCall(event)) {
    return {
      type: event.InlineCall.type,
      payload: (_a2 = event.InlineCall.payload) != null ? _a2 : event.InlineCall
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
function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  return value;
}
function getToolArgs(payload) {
  var _a2;
  const root = asRecord(payload);
  const nestedArgs = asRecord(root == null ? void 0 : root.args);
  return (_a2 = nestedArgs != null ? nestedArgs : root) != null ? _a2 : {};
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
  const parsed2 = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed2) ? parsed2 : void 0;
}
function normalizeTxPayload(payload) {
  var _a2, _b, _c;
  const root = asRecord(payload);
  const args = getToolArgs(payload);
  const ctx = asRecord(root == null ? void 0 : root.ctx);
  const to = typeof args.to === "string" ? args.to : void 0;
  if (!to) return null;
  const valueRaw = args.value;
  const value = typeof valueRaw === "string" ? valueRaw : typeof valueRaw === "number" && Number.isFinite(valueRaw) ? String(Math.trunc(valueRaw)) : void 0;
  const data = typeof args.data === "string" ? args.data : void 0;
  const chainId = (_c = (_b = (_a2 = parseChainId(args.chainId)) != null ? _a2 : parseChainId(args.chain_id)) != null ? _b : parseChainId(ctx == null ? void 0 : ctx.user_chain_id)) != null ? _c : parseChainId(ctx == null ? void 0 : ctx.userChainId);
  return { to, value, data, chainId };
}
function normalizeEip712Payload(payload) {
  var _a2;
  const args = getToolArgs(payload);
  const typedDataRaw = (_a2 = args.typed_data) != null ? _a2 : args.typedData;
  let typedData;
  if (typeof typedDataRaw === "string") {
    try {
      const parsed2 = JSON.parse(typedDataRaw);
      if (parsed2 && typeof parsed2 === "object" && !Array.isArray(parsed2)) {
        typedData = parsed2;
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

// src/session.ts
var Session = class extends TypedEventEmitter {
  constructor(clientOrOptions, sessionOptions) {
    var _a2, _b, _c;
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
    this.sessionId = (_a2 = sessionOptions == null ? void 0 : sessionOptions.sessionId) != null ? _a2 : crypto.randomUUID();
    this.namespace = (_b = sessionOptions == null ? void 0 : sessionOptions.namespace) != null ? _b : "default";
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
      namespace: this.namespace,
      publicKey: this.publicKey,
      apiKey: this.apiKey,
      userState: this.userState
    });
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
      namespace: this.namespace,
      publicKey: this.publicKey,
      apiKey: this.apiKey,
      userState: this.userState
    });
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
    var _a2;
    const req = this.removeWalletRequest(requestId);
    if (!req) {
      throw new Error(`No pending wallet request with id "${requestId}"`);
    }
    if (req.kind === "transaction") {
      await this.sendSystemEvent("wallet:tx_complete", {
        txHash: (_a2 = result.txHash) != null ? _a2 : "",
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
    var _a2;
    if (this.closed) return;
    this.closed = true;
    this.stopPolling();
    (_a2 = this.unsubscribeSSE) == null ? void 0 : _a2.call(this);
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
  // ===========================================================================
  // Internal — Polling (ported from PollingController)
  // ===========================================================================
  startPolling() {
    var _a2;
    if (this.pollTimer || this.closed) return;
    (_a2 = this.logger) == null ? void 0 : _a2.debug("[session] polling started", this.sessionId);
    this.pollTimer = setInterval(() => {
      void this.pollTick();
    }, this.pollIntervalMs);
  }
  stopPolling() {
    var _a2;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      (_a2 = this.logger) == null ? void 0 : _a2.debug("[session] polling stopped", this.sessionId);
    }
  }
  async pollTick() {
    var _a2;
    if (!this.pollTimer) return;
    try {
      const state = await this.client.fetchState(
        this.sessionId,
        this.userState
      );
      if (!this.pollTimer) return;
      this.applyState(state);
      if (!state.is_processing && this.walletRequests.length === 0) {
        this.stopPolling();
        this._isProcessing = false;
        this.emit("processing_end", void 0);
        this.resolvePending();
      }
    } catch (error) {
      (_a2 = this.logger) == null ? void 0 : _a2.debug("[session] poll error", error);
      this.emit("error", { error });
    }
  }
  // ===========================================================================
  // Internal — State Application
  // ===========================================================================
  applyState(state) {
    var _a2;
    if (state.messages) {
      this._messages = state.messages;
      this.emit("messages", this._messages);
    }
    if (state.title) {
      this._title = state.title;
    }
    if ((_a2 = state.system_events) == null ? void 0 : _a2.length) {
      this.dispatchSystemEvents(state.system_events);
    }
  }
  dispatchSystemEvents(events) {
    var _a2;
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
        const payload = normalizeEip712Payload((_a2 = unwrapped.payload) != null ? _a2 : {});
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
};

// src/cli-state.ts
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
var _a;
var STATE_FILE = join(
  (_a = process.env.XDG_RUNTIME_DIR) != null ? _a : tmpdir(),
  "aomi-session.json"
);
function readState() {
  try {
    if (!existsSync(STATE_FILE)) return null;
    const raw = readFileSync(STATE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}
function writeState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
function clearState() {
  try {
    if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
  } catch (e) {
  }
}
function getNextTxId(state) {
  var _a2, _b;
  const allIds = [
    ...(_a2 = state.pendingTxs) != null ? _a2 : [],
    ...(_b = state.signedTxs) != null ? _b : []
  ].map((t) => {
    const m = t.id.match(/^tx-(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const max = allIds.length > 0 ? Math.max(...allIds) : 0;
  return `tx-${max + 1}`;
}
function addPendingTx(state, tx) {
  if (!state.pendingTxs) state.pendingTxs = [];
  const pending = __spreadProps(__spreadValues({}, tx), {
    id: getNextTxId(state)
  });
  state.pendingTxs.push(pending);
  writeState(state);
  return pending;
}
function removePendingTx(state, id) {
  if (!state.pendingTxs) return null;
  const idx = state.pendingTxs.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const [removed] = state.pendingTxs.splice(idx, 1);
  writeState(state);
  return removed;
}
function addSignedTx(state, tx) {
  if (!state.signedTxs) state.signedTxs = [];
  state.signedTxs.push(tx);
  writeState(state);
}

// src/cli.ts
var CliExit = class extends Error {
  constructor(code) {
    super();
    this.code = code;
  }
};
function fatal(message) {
  console.error(message);
  throw new CliExit(1);
}
function parseArgs(argv) {
  const raw = argv.slice(2);
  const command = raw[0] && !raw[0].startsWith("--") ? raw[0] : void 0;
  const rest = command ? raw.slice(1) : raw;
  const positional = [];
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith("--") && arg.includes("=")) {
      const [key, ...val] = arg.slice(2).split("=");
      flags[key] = val.join("=");
    } else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith("-")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      flags[arg.slice(1)] = "true";
    } else {
      positional.push(arg);
    }
  }
  return { command, positional, flags };
}
var parsed = parseArgs(process.argv);
function getConfig() {
  var _a2, _b, _c, _d, _e, _f, _g, _h;
  return {
    baseUrl: (_b = (_a2 = parsed.flags["backend-url"]) != null ? _a2 : process.env.AOMI_BASE_URL) != null ? _b : "https://api.aomi.dev",
    apiKey: (_c = parsed.flags["api-key"]) != null ? _c : process.env.AOMI_API_KEY,
    namespace: (_e = (_d = parsed.flags["namespace"]) != null ? _d : process.env.AOMI_NAMESPACE) != null ? _e : "default",
    publicKey: (_f = parsed.flags["public-key"]) != null ? _f : process.env.AOMI_PUBLIC_KEY,
    privateKey: (_g = parsed.flags["private-key"]) != null ? _g : process.env.PRIVATE_KEY,
    chainRpcUrl: (_h = parsed.flags["rpc-url"]) != null ? _h : process.env.CHAIN_RPC_URL
  };
}
function getOrCreateSession() {
  const config = getConfig();
  let state = readState();
  if (!state) {
    state = {
      sessionId: crypto.randomUUID(),
      baseUrl: config.baseUrl,
      namespace: config.namespace,
      apiKey: config.apiKey,
      publicKey: config.publicKey
    };
    writeState(state);
  } else {
    let changed = false;
    if (config.baseUrl && config.baseUrl !== state.baseUrl) {
      state.baseUrl = config.baseUrl;
      changed = true;
    }
    if (config.namespace && config.namespace !== state.namespace) {
      state.namespace = config.namespace;
      changed = true;
    }
    if (config.apiKey !== void 0 && config.apiKey !== state.apiKey) {
      state.apiKey = config.apiKey;
      changed = true;
    }
    if (config.publicKey !== void 0 && config.publicKey !== state.publicKey) {
      state.publicKey = config.publicKey;
      changed = true;
    }
    if (changed) writeState(state);
  }
  const session = new Session(
    { baseUrl: state.baseUrl, apiKey: state.apiKey },
    {
      sessionId: state.sessionId,
      namespace: state.namespace,
      apiKey: state.apiKey,
      publicKey: state.publicKey,
      userState: state.publicKey ? {
        address: state.publicKey,
        chainId: 1,
        isConnected: true
      } : void 0
    }
  );
  return { session, state };
}
function walletRequestToPendingTx(req) {
  if (req.kind === "transaction") {
    const p2 = req.payload;
    return {
      kind: "transaction",
      to: p2.to,
      value: p2.value,
      data: p2.data,
      chainId: p2.chainId,
      timestamp: req.timestamp,
      payload: req.payload
    };
  }
  const p = req.payload;
  return {
    kind: "eip712_sign",
    description: p.description,
    timestamp: req.timestamp,
    payload: req.payload
  };
}
function formatTxLine(tx, prefix) {
  var _a2;
  const parts = [`${prefix} ${tx.id}`];
  if (tx.kind === "transaction") {
    parts.push(`to: ${(_a2 = tx.to) != null ? _a2 : "?"}`);
    if (tx.value) parts.push(`value: ${tx.value}`);
    if (tx.chainId) parts.push(`chain: ${tx.chainId}`);
    if (tx.data) parts.push(`data: ${tx.data.slice(0, 20)}...`);
  } else {
    parts.push(`eip712`);
    if (tx.description) parts.push(tx.description);
  }
  parts.push(`(${new Date(tx.timestamp).toLocaleTimeString()})`);
  return parts.join("  ");
}
var DIM = "\x1B[2m";
var CYAN = "\x1B[36m";
var YELLOW = "\x1B[33m";
var GREEN = "\x1B[32m";
var RESET = "\x1B[0m";
function printToolUpdate(event) {
  var _a2, _b, _c;
  const name = (_b = (_a2 = event.tool_name) != null ? _a2 : event.name) != null ? _b : "unknown";
  const status = (_c = event.status) != null ? _c : "running";
  console.log(`${DIM}\u{1F527} [tool] ${name}: ${status}${RESET}`);
}
function printToolComplete(event) {
  var _a2, _b, _c;
  const name = (_b = (_a2 = event.tool_name) != null ? _a2 : event.name) != null ? _b : "unknown";
  const result = (_c = event.result) != null ? _c : event.output;
  const line = result ? `${GREEN}\u2714 [tool] ${name} \u2192 ${result.slice(0, 120)}${result.length > 120 ? "\u2026" : ""}${RESET}` : `${GREEN}\u2714 [tool] ${name} done${RESET}`;
  console.log(line);
}
function printNewAgentMessages(messages, lastPrintedCount) {
  const agentMessages = messages.filter(
    (m) => m.sender === "agent" || m.sender === "assistant"
  );
  let handled = lastPrintedCount;
  for (let i = lastPrintedCount; i < agentMessages.length; i++) {
    const msg = agentMessages[i];
    if (msg.is_streaming) {
      break;
    }
    if (msg.content) {
      console.log(`${CYAN}\u{1F916} ${msg.content}${RESET}`);
    }
    handled = i + 1;
  }
  return handled;
}
async function chatCommand() {
  const message = parsed.positional.join(" ");
  if (!message) {
    fatal("Usage: aomi chat <message>");
  }
  const verbose = parsed.flags["verbose"] === "true" || parsed.flags["v"] === "true";
  const { session, state } = getOrCreateSession();
  if (state.publicKey) {
    await session.client.sendSystemMessage(
      session.sessionId,
      JSON.stringify({
        type: "wallet:state_changed",
        payload: {
          address: state.publicKey,
          chainId: 1,
          isConnected: true
        }
      })
    );
  }
  const capturedRequests = [];
  let printedAgentCount = 0;
  session.on("wallet_tx_request", (req) => capturedRequests.push(req));
  session.on("wallet_eip712_request", (req) => capturedRequests.push(req));
  try {
    await session.sendAsync(message);
    const allMsgs = session.getMessages();
    let seedIdx = allMsgs.length;
    for (let i = allMsgs.length - 1; i >= 0; i--) {
      if (allMsgs[i].sender === "user") {
        seedIdx = i;
        break;
      }
    }
    printedAgentCount = allMsgs.slice(0, seedIdx).filter(
      (m) => m.sender === "agent" || m.sender === "assistant"
    ).length;
    if (verbose) {
      if (session.getIsProcessing()) {
        console.log(`${DIM}\u23F3 Processing\u2026${RESET}`);
      }
      printedAgentCount = printNewAgentMessages(allMsgs, printedAgentCount);
      session.on("tool_update", (event) => printToolUpdate(event));
      session.on("tool_complete", (event) => printToolComplete(event));
      session.on("messages", (msgs) => {
        printedAgentCount = printNewAgentMessages(msgs, printedAgentCount);
      });
      session.on("system_notice", ({ message: msg }) => {
        console.log(`${YELLOW}\u{1F4E2} ${msg}${RESET}`);
      });
      session.on("system_error", ({ message: msg }) => {
        console.log(`\x1B[31m\u274C ${msg}${RESET}`);
      });
    }
    if (session.getIsProcessing()) {
      await new Promise((resolve) => {
        const checkWallet = () => {
          if (capturedRequests.length > 0) resolve();
        };
        session.on("wallet_tx_request", checkWallet);
        session.on("wallet_eip712_request", checkWallet);
        session.on("processing_end", () => resolve());
      });
    }
    if (verbose) {
      printNewAgentMessages(session.getMessages(), printedAgentCount);
      console.log(`${DIM}\u2705 Done${RESET}`);
    }
    for (const req of capturedRequests) {
      const pending = addPendingTx(state, walletRequestToPendingTx(req));
      console.log(`\u26A1 Wallet request queued: ${pending.id}`);
      if (req.kind === "transaction") {
        const p = req.payload;
        console.log(`   to:    ${p.to}`);
        if (p.value) console.log(`   value: ${p.value}`);
        if (p.chainId) console.log(`   chain: ${p.chainId}`);
      } else {
        const p = req.payload;
        if (p.description) console.log(`   desc:  ${p.description}`);
      }
    }
    if (!verbose) {
      const messages = session.getMessages();
      const agentMessages = messages.filter(
        (m) => m.sender === "agent" || m.sender === "assistant"
      );
      const last = agentMessages[agentMessages.length - 1];
      if (last == null ? void 0 : last.content) {
        console.log(last.content);
      } else if (capturedRequests.length === 0) {
        console.log("(no response)");
      }
    }
    if (capturedRequests.length > 0) {
      console.log(`
Run \`aomi tx\` to see pending transactions, \`aomi sign <id>\` to sign.`);
    }
  } finally {
    session.close();
  }
}
async function statusCommand() {
  var _a2, _b, _c, _d, _e, _f, _g, _h;
  const state = readState();
  if (!state) {
    console.log("No active session");
    return;
  }
  const { session } = getOrCreateSession();
  try {
    const apiState = await session.client.fetchState(state.sessionId);
    console.log(
      JSON.stringify(
        {
          sessionId: state.sessionId,
          baseUrl: state.baseUrl,
          namespace: state.namespace,
          isProcessing: (_a2 = apiState.is_processing) != null ? _a2 : false,
          messageCount: (_c = (_b = apiState.messages) == null ? void 0 : _b.length) != null ? _c : 0,
          title: (_d = apiState.title) != null ? _d : null,
          pendingTxs: (_f = (_e = state.pendingTxs) == null ? void 0 : _e.length) != null ? _f : 0,
          signedTxs: (_h = (_g = state.signedTxs) == null ? void 0 : _g.length) != null ? _h : 0
        },
        null,
        2
      )
    );
  } finally {
    session.close();
  }
}
async function eventsCommand() {
  const state = readState();
  if (!state) {
    console.log("No active session");
    return;
  }
  const { session } = getOrCreateSession();
  try {
    const events = await session.client.getSystemEvents(state.sessionId);
    console.log(JSON.stringify(events, null, 2));
  } finally {
    session.close();
  }
}
function txCommand() {
  var _a2, _b, _c;
  const state = readState();
  if (!state) {
    console.log("No active session");
    return;
  }
  const pending = (_a2 = state.pendingTxs) != null ? _a2 : [];
  const signed = (_b = state.signedTxs) != null ? _b : [];
  if (pending.length === 0 && signed.length === 0) {
    console.log("No transactions.");
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
      const parts = [`  \u2705 ${tx.id}`];
      if (tx.kind === "eip712_sign") {
        parts.push(`sig: ${(_c = tx.signature) == null ? void 0 : _c.slice(0, 20)}...`);
        if (tx.description) parts.push(tx.description);
      } else {
        parts.push(`hash: ${tx.txHash}`);
        if (tx.to) parts.push(`to: ${tx.to}`);
        if (tx.value) parts.push(`value: ${tx.value}`);
      }
      parts.push(`(${new Date(tx.timestamp).toLocaleTimeString()})`);
      console.log(parts.join("  "));
    }
  }
}
async function signCommand() {
  var _a2, _b, _c, _d;
  const txId = parsed.positional[0];
  if (!txId) {
    fatal("Usage: aomi sign <tx-id>\nRun `aomi tx` to see pending transaction IDs.");
  }
  const config = getConfig();
  const privateKey = config.privateKey;
  if (!privateKey) {
    fatal("Private key required. Pass --private-key or set PRIVATE_KEY env var.");
  }
  const state = readState();
  if (!state) {
    fatal("No active session. Run `aomi chat` first.");
  }
  const pendingTx = ((_a2 = state.pendingTxs) != null ? _a2 : []).find((t) => t.id === txId);
  if (!pendingTx) {
    fatal(`No pending transaction with id "${txId}".
Run \`aomi tx\` to see available IDs.`);
  }
  const { session } = getOrCreateSession();
  try {
    let viem;
    let viemAccounts;
    let viemChains;
    try {
      viem = await import("viem");
      viemAccounts = await import("viem/accounts");
      viemChains = await import("viem/chains");
    } catch (e) {
      fatal(
        "viem is required for `aomi sign`. Install it:\n  npm install viem\n  # or: pnpm add viem"
      );
    }
    const { createWalletClient, http } = viem;
    const { privateKeyToAccount } = viemAccounts;
    const account = privateKeyToAccount(privateKey);
    const rpcUrl = config.chainRpcUrl;
    const targetChainId = (_b = pendingTx.chainId) != null ? _b : 1;
    const chain = (_c = Object.values(viemChains).find(
      (c) => typeof c === "object" && c !== null && "id" in c && c.id === targetChainId
    )) != null ? _c : { id: targetChainId, name: `Chain ${targetChainId}`, nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl != null ? rpcUrl : ""] } } };
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl)
    });
    console.log(`Signer:  ${account.address}`);
    console.log(`ID:      ${pendingTx.id}`);
    console.log(`Kind:    ${pendingTx.kind}`);
    if (pendingTx.kind === "transaction") {
      console.log(`To:      ${pendingTx.to}`);
      if (pendingTx.value) console.log(`Value:   ${pendingTx.value}`);
      if (pendingTx.chainId) console.log(`Chain:   ${pendingTx.chainId}`);
      if (pendingTx.data) console.log(`Data:    ${pendingTx.data.slice(0, 40)}...`);
      console.log();
      const hash = await walletClient.sendTransaction({
        to: pendingTx.to,
        value: pendingTx.value ? BigInt(pendingTx.value) : /* @__PURE__ */ BigInt("0"),
        data: (_d = pendingTx.data) != null ? _d : void 0
      });
      console.log(`\u2705 Sent! Hash: ${hash}`);
      removePendingTx(state, txId);
      const freshState = readState();
      addSignedTx(freshState, {
        id: txId,
        kind: "transaction",
        txHash: hash,
        from: account.address,
        to: pendingTx.to,
        value: pendingTx.value,
        chainId: pendingTx.chainId,
        timestamp: Date.now()
      });
      await session.client.sendSystemMessage(
        state.sessionId,
        JSON.stringify({
          type: "wallet:tx_complete",
          payload: { txHash: hash, status: "success" }
        })
      );
    } else {
      const typedData = pendingTx.payload.typed_data;
      if (!typedData) {
        fatal("EIP-712 request is missing typed_data payload.");
      }
      if (pendingTx.description) console.log(`Desc:    ${pendingTx.description}`);
      if (typedData.primaryType) console.log(`Type:    ${typedData.primaryType}`);
      console.log();
      const { domain, types, primaryType, message } = typedData;
      const sigTypes = __spreadValues({}, types);
      delete sigTypes["EIP712Domain"];
      const signature = await walletClient.signTypedData({
        domain,
        types: sigTypes,
        primaryType,
        message
      });
      console.log(`\u2705 Signed! Signature: ${signature.slice(0, 20)}...`);
      removePendingTx(state, txId);
      const freshState = readState();
      addSignedTx(freshState, {
        id: txId,
        kind: "eip712_sign",
        signature,
        from: account.address,
        description: pendingTx.description,
        timestamp: Date.now()
      });
      await session.client.sendSystemMessage(
        state.sessionId,
        JSON.stringify({
          type: "wallet_eip712_response",
          payload: {
            status: "success",
            signature,
            description: pendingTx.description
          }
        })
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
async function logCommand() {
  var _a2, _b, _c, _d, _e;
  const state = readState();
  if (!state) {
    console.log("No active session");
    return;
  }
  const { session } = getOrCreateSession();
  try {
    const apiState = await session.client.fetchState(state.sessionId);
    const messages = (_a2 = apiState.messages) != null ? _a2 : [];
    if (messages.length === 0) {
      console.log("No messages in this session.");
      return;
    }
    for (const msg of messages) {
      let time = "";
      if (msg.timestamp) {
        const raw = msg.timestamp;
        const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
        const date = !isNaN(n) ? new Date(n < 1e12 ? n * 1e3 : n) : new Date(raw);
        time = isNaN(date.getTime()) ? "" : `${DIM}${date.toLocaleTimeString()}${RESET} `;
      }
      const sender = (_b = msg.sender) != null ? _b : "unknown";
      if (sender === "user") {
        console.log(`${time}${CYAN}\u{1F464} You:${RESET} ${(_c = msg.content) != null ? _c : ""}`);
      } else if (sender === "agent" || sender === "assistant") {
        if (msg.tool_result) {
          const [toolName, result] = msg.tool_result;
          console.log(
            `${time}${GREEN}\u{1F527} [${toolName}]${RESET} ${result.slice(0, 200)}${result.length > 200 ? "\u2026" : ""}`
          );
        }
        if (msg.content) {
          console.log(`${time}${CYAN}\u{1F916} Agent:${RESET} ${msg.content}`);
        }
      } else if (sender === "system") {
        console.log(`${time}${YELLOW}\u2699\uFE0F  System:${RESET} ${(_d = msg.content) != null ? _d : ""}`);
      } else {
        console.log(`${time}${DIM}[${sender}]${RESET} ${(_e = msg.content) != null ? _e : ""}`);
      }
    }
    console.log(`
${DIM}\u2014 ${messages.length} messages \u2014${RESET}`);
  } finally {
    session.close();
  }
}
function closeCommand() {
  const state = readState();
  if (state) {
    const { session } = getOrCreateSession();
    session.close();
  }
  clearState();
  console.log("Session closed");
}
function printUsage() {
  console.log(`
aomi \u2014 CLI client for Aomi on-chain agent

Usage:
  aomi chat <message>   Send a message and print the response
  aomi chat --verbose   Stream agent responses, tool calls, and events live
  aomi log              Show full conversation history with tool results
  aomi tx               List pending and signed transactions
  aomi sign <tx-id>     Sign and submit a pending transaction
  aomi status           Show current session state
  aomi events           List system events
  aomi close            Close the current session

Options:
  --backend-url <url>   Backend URL (default: https://api.aomi.dev)
  --api-key <key>       API key for non-default namespaces
  --namespace <ns>      Namespace (default: "default")
  --public-key <addr>   Wallet address (so the agent knows your wallet)
  --private-key <key>   Hex private key for signing
  --rpc-url <url>       RPC URL for transaction submission
  --verbose, -v         Show tool calls and streaming output (for chat)

Environment (overridden by flags):
  AOMI_BASE_URL         Backend URL
  AOMI_API_KEY          API key
  AOMI_NAMESPACE        Namespace
  AOMI_PUBLIC_KEY       Wallet address
  PRIVATE_KEY           Hex private key for signing
  CHAIN_RPC_URL         RPC URL for transaction submission
`.trim());
}
async function main() {
  var _a2;
  const cmd = (_a2 = parsed.command) != null ? _a2 : parsed.flags["help"] || parsed.flags["h"] ? "help" : void 0;
  switch (cmd) {
    case "chat":
      await chatCommand();
      break;
    case "log":
      await logCommand();
      break;
    case "tx":
      txCommand();
      break;
    case "sign":
      await signCommand();
      break;
    case "status":
      await statusCommand();
      break;
    case "events":
      await eventsCommand();
      break;
    case "close":
      closeCommand();
      break;
    case "help":
      printUsage();
      break;
    default:
      printUsage();
      if (cmd) throw new CliExit(1);
  }
}
main().catch((err) => {
  if (err instanceof CliExit) {
    process.exit(err.code);
    return;
  }
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
