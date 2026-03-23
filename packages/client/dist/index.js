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
function normalizeTxPayload(payload) {
  var _a, _b, _c;
  const root = asRecord(payload);
  const args = getToolArgs(payload);
  const ctx = asRecord(root == null ? void 0 : root.ctx);
  const to = typeof args.to === "string" ? args.to : void 0;
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
  const { privateKeyToAccount } = await import("viem/accounts");
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

// src/aa/alchemy.ts
var DEFAULT_ALCHEMY_API_KEY_ENV_VAR = "NEXT_PUBLIC_ALCHEMY_API_KEY";
var DEFAULT_ALCHEMY_GAS_POLICY_ENV_VAR = "NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID";
function readPublicEnv(name) {
  if (!name) {
    return void 0;
  }
  const value = process.env[name];
  return (value == null ? void 0 : value.trim()) ? value.trim() : void 0;
}
function defaultGasPolicyEnvVar(chainId, chainSlugById, baseName) {
  const slug = chainSlugById[chainId];
  return slug ? `${baseName}_${slug.toUpperCase()}` : void 0;
}
function createAlchemyAAProvider({
  accountAbstractionConfig = DEFAULT_AA_CONFIG,
  useAlchemyAA,
  chainsById,
  chainSlugById,
  getPreferredRpcUrl,
  apiKeyEnvVar = DEFAULT_ALCHEMY_API_KEY_ENV_VAR,
  gasPolicyEnvVar = DEFAULT_ALCHEMY_GAS_POLICY_ENV_VAR
}) {
  return function useAlchemyAAProvider(calls, localPrivateKey) {
    var _a, _b;
    const resolved = resolveAlchemyProviderConfig({
      calls,
      localPrivateKey,
      accountAbstractionConfig,
      chainsById,
      chainSlugById,
      getPreferredRpcUrl,
      apiKeyEnvVar,
      gasPolicyEnvVar
    });
    const query = useAlchemyAA(resolved == null ? void 0 : resolved.params);
    return {
      plan: (_a = resolved == null ? void 0 : resolved.plan) != null ? _a : null,
      query,
      AA: query.AA,
      isPending: Boolean(resolved && query.isPending),
      error: (_b = query.error) != null ? _b : null
    };
  };
}
function resolveAlchemyProviderConfig({
  calls,
  localPrivateKey,
  accountAbstractionConfig,
  chainsById,
  chainSlugById,
  getPreferredRpcUrl,
  apiKeyEnvVar,
  gasPolicyEnvVar
}) {
  var _a;
  if (!calls || localPrivateKey) {
    return null;
  }
  const chainConfig = getAAChainConfig(
    accountAbstractionConfig,
    calls,
    chainsById
  );
  if (!chainConfig) {
    return null;
  }
  const apiKey = readPublicEnv(apiKeyEnvVar);
  if (!apiKey) {
    return null;
  }
  const chain = chainsById[chainConfig.chainId];
  if (!chain) {
    return null;
  }
  const gasPolicyId = (_a = readPublicEnv(defaultGasPolicyEnvVar(chainConfig.chainId, chainSlugById, gasPolicyEnvVar))) != null ? _a : readPublicEnv(gasPolicyEnvVar);
  if (chainConfig.sponsorship === "required" && !gasPolicyId) {
    return null;
  }
  return {
    chainConfig,
    plan: buildAAExecutionPlan(accountAbstractionConfig, chainConfig),
    params: {
      enabled: true,
      apiKey,
      chain,
      rpcUrl: getPreferredRpcUrl(chain),
      gasPolicyId,
      mode: chainConfig.defaultMode
    }
  };
}

// src/aa/pimlico.ts
var DEFAULT_PIMLICO_API_KEY_ENV_VAR = "NEXT_PUBLIC_PIMLICO_API_KEY";
function readPublicEnv2(name) {
  if (!name) {
    return void 0;
  }
  const value = process.env[name];
  return (value == null ? void 0 : value.trim()) ? value.trim() : void 0;
}
function createPimlicoAAProvider({
  accountAbstractionConfig = DEFAULT_AA_CONFIG,
  usePimlicoAA,
  chainsById,
  apiKeyEnvVar = DEFAULT_PIMLICO_API_KEY_ENV_VAR,
  rpcUrl
}) {
  return function usePimlicoAAProvider(calls, localPrivateKey) {
    var _a, _b;
    const resolved = resolvePimlicoProviderConfig({
      calls,
      localPrivateKey,
      accountAbstractionConfig,
      chainsById,
      apiKeyEnvVar,
      rpcUrl
    });
    const query = usePimlicoAA(resolved == null ? void 0 : resolved.params);
    return {
      plan: (_a = resolved == null ? void 0 : resolved.plan) != null ? _a : null,
      query,
      AA: query.AA,
      isPending: Boolean(resolved && query.isPending),
      error: (_b = query.error) != null ? _b : null
    };
  };
}
function resolvePimlicoProviderConfig({
  calls,
  localPrivateKey,
  accountAbstractionConfig,
  chainsById,
  apiKeyEnvVar,
  rpcUrl
}) {
  if (!calls || localPrivateKey) {
    return null;
  }
  const chainConfig = getAAChainConfig(
    accountAbstractionConfig,
    calls,
    chainsById
  );
  if (!chainConfig) {
    return null;
  }
  const apiKey = readPublicEnv2(apiKeyEnvVar);
  if (!apiKey) {
    return null;
  }
  const chain = chainsById[chainConfig.chainId];
  if (!chain) {
    return null;
  }
  return {
    chainConfig,
    plan: buildAAExecutionPlan(accountAbstractionConfig, chainConfig),
    params: {
      enabled: true,
      apiKey,
      chain,
      mode: chainConfig.defaultMode,
      rpcUrl
    }
  };
}
export {
  AomiClient,
  DEFAULT_AA_CONFIG,
  ClientSession as Session,
  TypedEventEmitter,
  buildAAExecutionPlan,
  createAlchemyAAProvider,
  createPimlicoAAProvider,
  executeWalletCalls,
  getAAChainConfig,
  getWalletExecutorReady,
  isAsyncCallback,
  isInlineCall,
  isSystemError,
  isSystemNotice,
  normalizeEip712Payload,
  normalizeTxPayload,
  parseAAConfig,
  unwrapSystemEvent
};
//# sourceMappingURL=index.js.map