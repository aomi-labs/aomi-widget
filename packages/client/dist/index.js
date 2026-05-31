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
  svmAddress: "svm_address",
  walletKind: "wallet_kind",
  aaMode: "aa_mode",
  SmartAccount4337: "smart_account_4337",
  Delegation7702: "delegation_7702",
  pendingTxs: "pending_txs",
  pendingEip712s: "pending_eip712s",
  pendingSolanaTxs: "pending_solana_txs",
  nextId: "next_id",
  walletProvider: "wallet_provider",
  walletProviderSubject: "wallet_provider_subject",
  authMethod: "auth_method",
  authValue: "auth_value",
  authVerifiedAt: "auth_verified_at",
  sponsorProvider: "sponsor_provider",
  sponsorAccount: "sponsor_account"
};
function parseUserStateChainId(value) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return void 0;
  }
  if (trimmed.startsWith("0x")) {
    const parsedHex = Number.parseInt(trimmed.slice(2), 16);
    return Number.isInteger(parsedHex) && parsedHex > 0 ? parsedHex : void 0;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : void 0;
}
function normalizeAddressForComparison(value) {
  return typeof value === "string" ? value.toLowerCase() : void 0;
}
function parseUserStateWalletProvider(value) {
  if (value === null) {
    return null;
  }
  return value === "para" || value === "privy" || value === "baseAccount" ? value : void 0;
}
function parseUserStateOptionalString(value) {
  if (value === null) {
    return null;
  }
  return typeof value === "string" && value.trim().length > 0 ? value : void 0;
}
function parseUserStateTimestamp(value) {
  if (value === null) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value !== "string") {
    return void 0;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : void 0;
}
var AUTH_METHODS = /* @__PURE__ */ new Set([
  "google",
  "apple",
  "facebook",
  "x",
  "discord",
  "github",
  "farcaster",
  "telegram",
  "email",
  "phone",
  "wagmi"
]);
function parseUserStateAuthMethod(value) {
  if (value === null) {
    return null;
  }
  return typeof value === "string" && AUTH_METHODS.has(value) ? value : void 0;
}
function parseUserStateSponsored(value) {
  if (value === null) {
    return null;
  }
  return typeof value === "boolean" ? value : void 0;
}
function parseUserStateSponsorProvider(value) {
  if (value === null) {
    return null;
  }
  return value === "alchemy" || value === "coinbase" || value === "pimlico" || value === "self" ? value : void 0;
}
function parseUserStateWalletKind(value) {
  if (value === null) {
    return null;
  }
  return value === "eoa" || value === "smart-account" ? value : void 0;
}
function parseUserStateAAMode(value) {
  if (value === null) {
    return null;
  }
  return value === "none" || value === "4337" || value === "7702" ? value : void 0;
}
function parseUserStateOptionalAddress(value) {
  if (value === null) {
    return null;
  }
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function hasOwnKey(record, key) {
  return record !== void 0 && Object.prototype.hasOwnProperty.call(record, key);
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
  function reconcile(previousUserState, incomingUserState) {
    const incoming = normalize(incomingUserState);
    if (!incoming) {
      return void 0;
    }
    const previous = normalize(previousUserState);
    const reconciled = __spreadValues({}, incoming);
    const previousAddress = address(previous);
    const incomingAddress = address(incoming);
    const incomingConnected = isConnected(incoming);
    const incomingChainId = chainId(incoming);
    const canPreserveConnectedWalletContext = incomingConnected !== false;
    const sameAddress = normalizeAddressForComparison(previousAddress) !== void 0 && normalizeAddressForComparison(previousAddress) === normalizeAddressForComparison(incomingAddress);
    if (!incomingAddress && canPreserveConnectedWalletContext && previousAddress) {
      reconciled.address = previousAddress;
    }
    const previousSvm = svmAddress(previous);
    const incomingSvm = svmAddress(incoming);
    if (!incomingSvm && canPreserveConnectedWalletContext && previousSvm) {
      reconciled.svm_address = previousSvm;
    }
    if (incomingChainId === void 0 && canPreserveConnectedWalletContext && previous && chainId(previous) !== void 0) {
      const canPreserveChain = sameAddress || !incomingAddress && !!previousAddress;
      if (canPreserveChain) {
        reconciled.chain_id = chainId(previous);
      }
    }
    const canPreserveAAContext = canPreserveConnectedWalletContext && previous !== void 0 && (sameAddress || !incomingAddress && !!previousAddress);
    if (!hasOwnKey(incoming, "wallet_kind") && canPreserveAAContext && walletKind(previous) !== void 0) {
      reconciled.wallet_kind = walletKind(previous);
    }
    if (!hasOwnKey(incoming, "aa_mode") && canPreserveAAContext && aaMode(previous) !== void 0) {
      reconciled.aa_mode = aaMode(previous);
    }
    if (!hasOwnKey(incoming, "smart_account_4337") && canPreserveAAContext && SmartAccount4337(previous) !== void 0) {
      reconciled.smart_account_4337 = SmartAccount4337(previous);
    }
    if (!hasOwnKey(incoming, "delegation_7702") && canPreserveAAContext && Delegation7702(previous) !== void 0) {
      reconciled.delegation_7702 = Delegation7702(previous);
    }
    if (!hasOwnKey(incoming, "ens_name") && canPreserveAAContext && ensName(previous) !== void 0) {
      reconciled.ens_name = ensName(previous);
    }
    if (!hasOwnKey(incoming, "wallet_provider") && canPreserveAAContext && walletProvider(previous) !== void 0) {
      reconciled.wallet_provider = walletProvider(previous);
    }
    if (!hasOwnKey(incoming, "auth_method") && canPreserveAAContext && authMethod(previous) !== void 0) {
      reconciled.auth_method = authMethod(previous);
    }
    if (!hasOwnKey(incoming, "wallet_provider_subject") && canPreserveAAContext && walletProviderSubject(previous) !== void 0) {
      reconciled.wallet_provider_subject = walletProviderSubject(previous);
    }
    if (!hasOwnKey(incoming, "auth_value") && canPreserveAAContext && authValue(previous) !== void 0) {
      reconciled.auth_value = authValue(previous);
    }
    if (!hasOwnKey(incoming, "auth_verified_at") && canPreserveAAContext && authVerifiedAt(previous) !== void 0) {
      reconciled.auth_verified_at = authVerifiedAt(previous);
    }
    if (!hasOwnKey(incoming, "sponsored") && canPreserveAAContext && sponsored(previous) !== void 0) {
      reconciled.sponsored = sponsored(previous);
    }
    if (!hasOwnKey(incoming, "sponsor_provider") && canPreserveAAContext && sponsorProvider(previous) !== void 0) {
      reconciled.sponsor_provider = sponsorProvider(previous);
    }
    if (!hasOwnKey(incoming, "sponsor_account") && canPreserveAAContext && sponsorAccount(previous) !== void 0) {
      reconciled.sponsor_account = sponsorAccount(previous);
    }
    if (isConnected(reconciled) === true && chainId(reconciled) === void 0) {
      delete reconciled.is_connected;
    }
    return reconciled;
  }
  UserState2.reconcile = reconcile;
  function address(userState) {
    const normalized = normalize(userState);
    const address2 = normalized == null ? void 0 : normalized.address;
    return typeof address2 === "string" && address2.length > 0 ? address2 : void 0;
  }
  UserState2.address = address;
  function walletKind(userState) {
    const normalized = normalize(userState);
    return parseUserStateWalletKind(normalized == null ? void 0 : normalized.wallet_kind);
  }
  UserState2.walletKind = walletKind;
  function aaMode(userState) {
    const normalized = normalize(userState);
    return parseUserStateAAMode(normalized == null ? void 0 : normalized.aa_mode);
  }
  UserState2.aaMode = aaMode;
  function SmartAccount4337(userState) {
    const normalized = normalize(userState);
    return parseUserStateOptionalAddress(normalized == null ? void 0 : normalized.smart_account_4337);
  }
  UserState2.SmartAccount4337 = SmartAccount4337;
  function Delegation7702(userState) {
    const normalized = normalize(userState);
    return parseUserStateOptionalAddress(normalized == null ? void 0 : normalized.delegation_7702);
  }
  UserState2.Delegation7702 = Delegation7702;
  function svmAddress(userState) {
    const normalized = normalize(userState);
    const value = normalized == null ? void 0 : normalized.svm_address;
    return typeof value === "string" && value.length > 0 ? value : void 0;
  }
  UserState2.svmAddress = svmAddress;
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
  function ensName(userState) {
    const normalized = normalize(userState);
    const value = normalized == null ? void 0 : normalized.ens_name;
    return typeof value === "string" && value.length > 0 ? value : void 0;
  }
  UserState2.ensName = ensName;
  function walletProvider(userState) {
    const normalized = normalize(userState);
    return parseUserStateWalletProvider(normalized == null ? void 0 : normalized.wallet_provider);
  }
  UserState2.walletProvider = walletProvider;
  function walletProviderSubject(userState) {
    const normalized = normalize(userState);
    return parseUserStateOptionalString(normalized == null ? void 0 : normalized.wallet_provider_subject);
  }
  UserState2.walletProviderSubject = walletProviderSubject;
  function authMethod(userState) {
    const normalized = normalize(userState);
    return parseUserStateAuthMethod(normalized == null ? void 0 : normalized.auth_method);
  }
  UserState2.authMethod = authMethod;
  function authValue(userState) {
    const normalized = normalize(userState);
    return parseUserStateOptionalString(normalized == null ? void 0 : normalized.auth_value);
  }
  UserState2.authValue = authValue;
  function authVerifiedAt(userState) {
    const normalized = normalize(userState);
    return parseUserStateTimestamp(normalized == null ? void 0 : normalized.auth_verified_at);
  }
  UserState2.authVerifiedAt = authVerifiedAt;
  function sponsored(userState) {
    const normalized = normalize(userState);
    return parseUserStateSponsored(normalized == null ? void 0 : normalized.sponsored);
  }
  UserState2.sponsored = sponsored;
  function sponsorProvider(userState) {
    const normalized = normalize(userState);
    return parseUserStateSponsorProvider(normalized == null ? void 0 : normalized.sponsor_provider);
  }
  UserState2.sponsorProvider = sponsorProvider;
  function sponsorAccount(userState) {
    const normalized = normalize(userState);
    return parseUserStateOptionalAddress(normalized == null ? void 0 : normalized.sponsor_account);
  }
  UserState2.sponsorAccount = sponsorAccount;
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
  fetchImpl = fetch,
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
        const response = await fetchImpl(`${backendUrl}/api/updates`, {
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
var APP_KEY_HEADER = "AOMI-APP-KEY";
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
async function postState(baseUrl, path, payload, sessionId, fetchImpl, apiKey) {
  const query = toQueryString(payload);
  const url = `${baseUrl}${path}${query}`;
  const headers = new Headers(withSessionHeader(sessionId));
  if (apiKey) {
    headers.set(APP_KEY_HEADER, apiKey);
  }
  const response = await fetchImpl(url, {
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
    var _a;
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = (_a = options.fetch) != null ? _a : globalThis.fetch.bind(globalThis);
    this.rawFetchImpl = typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : this.fetchImpl;
    this.logger = options.logger;
    this.sseSubscriber = createSseSubscriber({
      backendUrl: this.baseUrl,
      getHeaders: (sessionId) => withSessionHeader(sessionId, { Accept: "text/event-stream" }),
      fetchImpl: this.fetchImpl,
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
    const response = await this.fetchImpl(url, {
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
      this.fetchImpl,
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
      sessionId,
      this.fetchImpl
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
      sessionId,
      this.fetchImpl
    );
  }
  // ===========================================================================
  // Secrets
  // ===========================================================================
  /**
   * Ingest secrets for a client. Returns opaque `$SECRET:<name>` handles.
   *
   * When `app` is provided, the values land in the per-app store keyed by
   * `(client_id, app)` — this is the path the Secrets settings page uses
   * (one app at a time). When `app` is omitted, secrets land in the flat
   * client store (used by BYOK and other cross-app pools).
   */
  async ingestSecrets(sessionId, clientId, secrets, app) {
    const url = joinApiPath(this.baseUrl, "/api/secrets");
    const body = {
      client_id: clientId,
      secrets
    };
    if (app && app.trim().length > 0) {
      body.app = app.trim();
    }
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: withSessionHeader(sessionId, {
        "Content-Type": "application/json"
      }),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }
  /**
   * Clear secrets for a client. With `app`, removes every slot under that
   * app. Without `app`, clears the entire client (legacy behavior — wipes
   * both stores and unbinds the session).
   */
  async clearSecrets(sessionId, clientId, app) {
    const params = { client_id: clientId };
    if (app && app.trim().length > 0) {
      params.app = app.trim();
    }
    const url = buildApiUrl(this.baseUrl, "/api/secrets", params);
    const response = await this.fetchImpl(url, {
      method: "DELETE",
      headers: withSessionHeader(sessionId)
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }
  /**
   * Remove a single named secret. With `app`, targets the per-app store
   * under that scope; without, targets the flat store.
   */
  async deleteSecret(sessionId, clientId, name, app) {
    const params = { client_id: clientId };
    if (app && app.trim().length > 0) {
      params.app = app.trim();
    }
    const url = buildApiUrl(
      this.baseUrl,
      `/api/secrets/${encodeURIComponent(name)}`,
      params
    );
    const response = await this.fetchImpl(url, {
      method: "DELETE",
      headers: withSessionHeader(sessionId)
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }
  /**
   * List currently stored secret names per app for this client. The
   * backend never returns raw values; the settings page uses this as the
   * source of truth instead of trusting localStorage.
   */
  async listSecrets(sessionId) {
    const url = joinApiPath(this.baseUrl, "/api/secrets");
    const response = await this.fetchImpl(url, {
      method: "GET",
      headers: withSessionHeader(sessionId)
    });
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
   * Ensure the backend has an account row for a wallet address.
   *
   * The hosted backend binds wallet-owned session lists through the account
   * table. Calling this before thread list/create keeps first-run wallet flows
   * from creating sessions that exist by ID but do not appear in
   * GET /api/sessions?public_key=...
   */
  async ensureAccount(sessionId, publicKey) {
    const url = buildApiUrl(this.baseUrl, "/api/settings/account", {
      public_key: publicKey
    });
    const response = await this.fetchImpl(url, {
      headers: withSessionHeader(sessionId)
    });
    if (!response.ok) {
      throw new Error(`Failed to ensure account: HTTP ${response.status}`);
    }
    await response.json().catch(() => void 0);
  }
  /**
   * List all threads for a wallet address.
   */
  async listThreads(sessionId, publicKey) {
    const url = buildApiUrl(this.baseUrl, "/api/sessions", {
      public_key: publicKey
    });
    const response = await this.fetchImpl(url, {
      headers: withSessionHeader(sessionId)
    });
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
    const response = await this.fetchImpl(url, {
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
    const response = await this.fetchImpl(url, {
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
    const response = await this.fetchImpl(url, {
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
    const response = await this.fetchImpl(url, {
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
    throw new Error(
      "Failed to archive thread: current backend does not expose /api/sessions/:id/archive"
    );
  }
  /**
   * Unarchive a thread.
   */
  async unarchiveThread(sessionId) {
    throw new Error(
      "Failed to unarchive thread: current backend does not expose /api/sessions/:id/unarchive"
    );
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
    const response = await this.fetchImpl(url, {
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
   * Get available apps as full descriptors (name + declared secret slots).
   * The settings page consumes the slot info to render per-app inputs and
   * the chat shell uses it to gate app load when required slots are unfilled.
   */
  async getApps(sessionId, options) {
    var _a;
    const url = buildApiUrl(this.baseUrl, "/api/control/apps", {
      public_key: options == null ? void 0 : options.publicKey
    });
    const apiKey = (_a = options == null ? void 0 : options.apiKey) != null ? _a : this.apiKey;
    const headers = new Headers(withSessionHeader(sessionId));
    if (apiKey) {
      headers.set(APP_KEY_HEADER, apiKey);
    }
    const response = await this.rawFetchImpl(url, { headers });
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
      headers.set(APP_KEY_HEADER, apiKey);
    }
    const response = await this.rawFetchImpl(url, {
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
    return postState(
      this.baseUrl,
      "/api/control/model",
      payload,
      sessionId,
      this.fetchImpl,
      apiKey
    );
  }
  /**
   * List BYOK keys (one per LLM provider) bound to the current session's client.
   */
  async listByokKeys(sessionId) {
    var _a;
    const url = buildApiUrl(this.baseUrl, "/api/control/provider-keys");
    const response = await this.fetchImpl(url, {
      headers: withSessionHeader(sessionId)
    });
    if (!response.ok) {
      throw new Error(`Failed to get BYOK keys: HTTP ${response.status}`);
    }
    const data = await response.json();
    return (_a = data.byok_keys) != null ? _a : [];
  }
  /**
   * Save or replace a BYOK key for the client bound to this session.
   */
  async saveByokKey(sessionId, provider, byokKey, label) {
    const url = joinApiPath(this.baseUrl, "/api/control/provider-keys");
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: withSessionHeader(sessionId, {
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        provider,
        byok_key: byokKey,
        label
      })
    });
    if (!response.ok) {
      throw new Error(`Failed to save BYOK key: HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.key;
  }
  /**
   * Delete a BYOK key for the client bound to this session.
   */
  async deleteByokKey(sessionId, provider) {
    const url = buildApiUrl(
      this.baseUrl,
      `/api/control/provider-keys/${encodeURIComponent(provider)}`
    );
    const response = await this.fetchImpl(url, {
      method: "DELETE",
      headers: withSessionHeader(sessionId)
    });
    if (!response.ok) {
      throw new Error(`Failed to delete BYOK key: HTTP ${response.status}`);
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
      headers.set(APP_KEY_HEADER, this.apiKey);
    }
    const normalizedTransactions = transactions.map((transaction) => {
      var _a, _b;
      return {
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        label: transaction.label,
        chain_id: (_b = (_a = transaction.chain_id) != null ? _a : transaction.chainId) != null ? _b : options == null ? void 0 : options.chainId
      };
    });
    const payload = {
      transactions: normalizedTransactions,
      from: options == null ? void 0 : options.from,
      chain_id: options == null ? void 0 : options.chainId
    };
    const response = await this.fetchImpl(url, {
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

// src/aa/policy.ts
function aaRequestedModeFromPreference(preference) {
  if (preference === "none") return "none";
  if (preference === "eip4337") return "4337";
  return "7702";
}
function aaModeFromExecutionKind(executionKind) {
  if (!executionKind) return void 0;
  if (executionKind.endsWith("_4337")) return "4337";
  if (executionKind.endsWith("_7702")) return "7702";
  if (executionKind === "eoa") return "none";
  return void 0;
}
function resolveAASponsorship(mode, configuredSponsorship) {
  return mode === "7702" ? "disabled" : configuredSponsorship;
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
function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return void 0;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
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
function normalizePendingTxData(pendingEntry) {
  const data = typeof pendingEntry.data === "string" ? pendingEntry.data : void 0;
  if (!data) {
    return void 0;
  }
  const kind = typeof pendingEntry.kind === "string" ? pendingEntry.kind.toLowerCase() : void 0;
  if (kind === "native_transfer") {
    return void 0;
  }
  return data;
}
function normalizeTxPayload(payload) {
  var _a, _b, _c, _d, _e, _f, _g;
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
  const aaStrict = parseBoolean((_g = args.aa_strict) != null ? _g : args.aaStrict);
  const txId = txIds.length === 1 ? txIds[0] : void 0;
  return {
    to,
    value,
    data,
    chainId,
    txId,
    txIds,
    aaPreference,
    aaStrict,
    requestId
  };
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
      data: normalizePendingTxData(pendingEntry),
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
function normalizeSolanaSignPayload(payload) {
  var _a, _b;
  const args = getToolArgs(payload);
  const unsignedTxRaw = (_a = args.unsigned_tx) != null ? _a : args.unsignedTx;
  const unsignedTx = typeof unsignedTxRaw === "string" ? unsignedTxRaw : void 0;
  const description = typeof args.description === "string" ? args.description : void 0;
  const clusterRaw = args.cluster;
  const cluster = typeof clusterRaw === "string" ? clusterRaw : void 0;
  const pendingSolanaId = (_b = parsePendingId(args.pendingSolanaId)) != null ? _b : parsePendingId(args.pending_solana_id);
  return { unsignedTx, description, cluster, pendingSolanaId };
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
function stableUserStateString(state) {
  return JSON.stringify(sortJson(state != null ? state : {}));
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
    const initialUserState = UserState.reconcile(void 0, sessionOptions == null ? void 0 : sessionOptions.userState);
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
   * Resolve a pending wallet request (transaction, EIP-712, or Solana
   * sign). The `result.kind` discriminator must match the originating
   * request's kind — sending a `transaction` result for an `eip712_sign`
   * request would post the wrong wire event with empty fields, so we
   * fail fast at runtime instead.
   */
  async resolve(requestId, result) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const req = this.walletRequests.find((request) => request.id === requestId);
    if (!req) {
      throw new Error(`No pending wallet request with id "${requestId}"`);
    }
    if (result.kind !== req.kind) {
      throw new Error(
        `WalletRequestResult.kind mismatch for "${requestId}": request is "${req.kind}" but result is "${result.kind}".`
      );
    }
    this.removeWalletRequest(requestId);
    if (req.kind === "transaction" && result.kind === "transaction") {
      const pendingTxIds = txIdsFromPayload(req.payload);
      const requestedMode = (_a = result.aaRequestedMode) != null ? _a : aaRequestedModeFromPreference(req.payload.aaPreference);
      const resolvedMode = (_c = (_b = result.aaResolvedMode) != null ? _b : aaModeFromExecutionKind(result.executionKind)) != null ? _c : requestedMode;
      this.resolveUserState(__spreadProps(__spreadValues({}, (_d = this.userState) != null ? _d : {}), {
        aa_mode: resolvedMode,
        smart_account_4337: resolvedMode === "4337" ? (_e = result.SmartAccount4337) != null ? _e : null : null,
        delegation_7702: resolvedMode === "7702" ? (_f = result.Delegation7702) != null ? _f : null : null
      }));
      await this.sendSystemEvent("wallet:tx_complete", {
        txHash: result.txHash,
        status: "success",
        amount: result.amount,
        pending_tx_ids: pendingTxIds,
        aa_requested_mode: requestedMode,
        aa_resolved_mode: resolvedMode,
        aa_fallback_reason: result.aaFallbackReason,
        execution_kind: result.executionKind,
        batched: (_g = result.batched) != null ? _g : pendingTxIds.length > 1,
        call_count: (_h = result.callCount) != null ? _h : pendingTxIds.length,
        sponsored: result.sponsored,
        smart_account_4337: result.SmartAccount4337,
        delegation_7702: result.Delegation7702
      });
    } else if (req.kind === "eip712_sign" && result.kind === "eip712_sign") {
      await this.sendSystemEvent("wallet_eip712_response", __spreadValues({
        status: "success",
        signature: result.signature,
        description: req.payload.description
      }, req.payload.eip712Id !== void 0 ? { pending_eip712_id: req.payload.eip712Id } : {}));
    } else if (req.kind === "solana_sign" && result.kind === "solana_sign") {
      await this.sendSystemEvent("wallet::solana_sign_complete", __spreadValues({
        status: "signed",
        signed_tx: result.signedTx,
        description: req.payload.description
      }, req.payload.pendingSolanaId !== void 0 ? { pending_solana_id: req.payload.pendingSolanaId } : {}));
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
      const pendingTxIds = txIdsFromPayload(req.payload);
      const requestedMode = aaRequestedModeFromPreference(req.payload.aaPreference);
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
        smart_account_4337: void 0,
        delegation_7702: void 0
      });
    } else if (req.kind === "eip712_sign") {
      await this.sendSystemEvent("wallet_eip712_response", __spreadValues({
        status: "failed",
        error: reason != null ? reason : "Request rejected",
        description: req.payload.description
      }, req.payload.eip712Id !== void 0 ? { pending_eip712_id: req.payload.eip712Id } : {}));
    } else {
      await this.sendSystemEvent("wallet::solana_sign_complete", __spreadValues({
        status: "rejected",
        error: reason != null ? reason : "Request rejected",
        description: req.payload.description
      }, req.payload.pendingSolanaId !== void 0 ? { pending_solana_id: req.payload.pendingSolanaId } : {}));
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
  syncRuntimeOptions(options) {
    var _a;
    this.app = options.app;
    this.publicKey = options.publicKey;
    this.apiKey = options.apiKey;
    this.clientId = (_a = options.clientId) != null ? _a : this.clientId;
    if (options.userState) {
      this.resolveUserState(options.userState);
    }
  }
  resolveUserState(userState, opts) {
    const previousSerialized = stableUserStateString(this.userState);
    this.userState = UserState.reconcile(this.userState, userState);
    const nextSerialized = stableUserStateString(this.userState);
    const address = UserState.address(this.userState);
    const isConnected = UserState.isConnected(this.userState);
    if (address && isConnected !== false) {
      this.publicKey = address;
    } else {
      this.publicKey = void 0;
    }
    this.syncWalletRequests();
    if (!(opts == null ? void 0 : opts.skipEmit) && this.userState && previousSerialized !== nextSerialized) {
      this.emit("user_state_updated", this.userState);
    }
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
  resolveWallet(address, chainId, aa) {
    var _a, _b, _c, _d;
    const resolvedAAMode = (_a = aa == null ? void 0 : aa.aaMode) != null ? _a : (aa == null ? void 0 : aa.smartAccount) === address ? "4337" : "none";
    const resolvedWalletKind = (aa == null ? void 0 : aa.smartAccount) === address ? "smart-account" : "eoa";
    const next = __spreadProps(__spreadValues({}, (_b = this.userState) != null ? _b : {}), {
      address,
      wallet_kind: resolvedWalletKind,
      aa_mode: resolvedAAMode,
      chain_id: chainId != null ? chainId : 1,
      is_connected: true
    });
    if ((aa == null ? void 0 : aa.smartAccount4337) !== void 0 || (aa == null ? void 0 : aa.delegation7702) !== void 0) {
      next.smart_account_4337 = resolvedAAMode === "4337" ? (_c = aa == null ? void 0 : aa.smartAccount4337) != null ? _c : null : null;
      next.delegation_7702 = resolvedAAMode === "7702" ? (_d = aa == null ? void 0 : aa.delegation7702) != null ? _d : null : null;
    }
    this.resolveUserState(next);
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
    var _a, _b;
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
      } else if (unwrapped.type === "wallet::solana_sign_request") {
        const payload = normalizeSolanaSignPayload((_b = unwrapped.payload) != null ? _b : {});
        const req = this.enqueueWalletRequest("solana_sign", payload);
        this.emit("wallet_solana_sign_request", req);
      } else if (unwrapped.type === "system_notice" || unwrapped.type === "system_error" || unwrapped.type === "async_callback") {
        this.emit(
          unwrapped.type,
          unwrapped.payload
        );
      } else {
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
  enqueueWalletRequest(kind, payload) {
    var _a;
    const id = this.getWalletRequestId(kind, payload);
    const existing = this.walletRequests.find((request) => request.id === id);
    const timestamp = (_a = existing == null ? void 0 : existing.timestamp) != null ? _a : Date.now();
    let req;
    if (kind === "transaction") {
      req = {
        id,
        kind,
        payload,
        timestamp
      };
    } else if (kind === "eip712_sign") {
      req = {
        id,
        kind,
        payload,
        timestamp
      };
    } else {
      req = {
        id,
        kind,
        payload,
        timestamp
      };
    }
    this.walletRequests = existing ? this.walletRequests.map((request) => request.id === id ? req : request) : [...this.walletRequests, req];
    if (req.kind === "transaction") {
      const nextTxIds = txIdsFromPayload(req.payload);
      if (nextTxIds.length > 0) {
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
    const normalizedActualUserState = UserState.reconcile(
      expectedUserState,
      actualUserState
    );
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
    } else if (kind === "eip712_sign") {
      const { eip712Id } = payload;
      if (typeof eip712Id === "number") {
        return `eip712-${eip712Id}`;
      }
    } else {
      const { pendingSolanaId } = payload;
      if (typeof pendingSolanaId === "number") {
        return `solana-${pendingSolanaId}`;
      }
    }
    return `wreq-${this.walletRequestNextId++}`;
  }
  syncWalletRequests() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
    const nextRequests = [];
    const pendingTxs = isRecord((_a = this.userState) == null ? void 0 : _a.pending_txs) ? (_b = this.userState) == null ? void 0 : _b.pending_txs : void 0;
    const pendingEip712s = isRecord((_c = this.userState) == null ? void 0 : _c.pending_eip712s) ? (_d = this.userState) == null ? void 0 : _d.pending_eip712s : void 0;
    const pendingSolanaTxs = isRecord((_e = this.userState) == null ? void 0 : _e.pending_solana_txs) ? (_f = this.userState) == null ? void 0 : _f.pending_solana_txs : void 0;
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
          timestamp: (_h = (_g = this.walletRequests.find((request) => request.id === requestId)) == null ? void 0 : _g.timestamp) != null ? _h : Date.now()
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
        timestamp: (_j = (_i = this.walletRequests.find((request) => request.id === requestId)) == null ? void 0 : _i.timestamp) != null ? _j : Date.now()
      });
    }
    for (const [id, raw] of Object.entries(pendingSolanaTxs != null ? pendingSolanaTxs : {}).sort(
      (left, right) => Number(left[0]) - Number(right[0])
    )) {
      const payload = normalizeSolanaSignPayload(__spreadProps(__spreadValues({}, isRecord(raw) ? raw : {}), {
        pending_solana_id: Number(id)
      }));
      const requestId = this.getWalletRequestId("solana_sign", payload);
      nextRequests.push({
        id: requestId,
        kind: "solana_sign",
        payload,
        timestamp: (_l = (_k = this.walletRequests.find((request) => request.id === requestId)) == null ? void 0 : _k.timestamp) != null ? _l : Date.now()
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

// src/chains.ts
import { defineChain } from "viem";
import {
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  sepolia,
  linea,
  lineaSepolia,
  foundry
} from "viem/chains";
var monad = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON"
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.monad.xyz"]
    }
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://monadexplorer.com"
    }
  }
});
var monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON"
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"]
    }
  },
  blockExplorers: {
    default: {
      name: "Monad Testnet Explorer",
      url: "https://testnet.monadexplorer.com"
    }
  },
  testnet: true
});
var SUPPORTED_CHAINS = [
  { id: 1, name: "Ethereum", ticker: "ETH" },
  { id: 137, name: "Polygon", ticker: "MATIC" },
  { id: 42161, name: "Arbitrum", ticker: "ARB" },
  { id: 8453, name: "Base", ticker: "BASE" },
  { id: 10, name: "Optimism", ticker: "OP" },
  { id: 11155111, name: "Sepolia", ticker: "SEP" },
  { id: 59144, name: "Linea Mainnet", ticker: "LINEA" },
  { id: 59141, name: "Linea Sepolia Testnet", ticker: "LINEA" },
  { id: 143, name: "Monad", ticker: "MON" },
  { id: 10143, name: "Monad Testnet", ticker: "MON" },
  { id: 31337, name: "Anvil (local)", ticker: "ETH" }
];
var SUPPORTED_CHAIN_IDS = SUPPORTED_CHAINS.map((chain) => chain.id);
var CHAIN_NAMES = Object.fromEntries(
  SUPPORTED_CHAINS.map((chain) => [chain.id, chain.name])
);
var ALCHEMY_CHAIN_SLUGS = {
  1: "eth-mainnet",
  137: "polygon-mainnet",
  42161: "arb-mainnet",
  8453: "base-mainnet",
  10: "opt-mainnet",
  11155111: "eth-sepolia",
  59144: "linea-mainnet",
  59141: "linea-sepolia"
};
var CHAINS_BY_ID = {
  1: mainnet,
  137: polygon,
  42161: arbitrum,
  10: optimism,
  8453: base,
  11155111: sepolia,
  59144: linea,
  59141: lineaSepolia,
  143: monad,
  10143: monadTestnet,
  31337: foundry
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
    throw new Error(
      `No smart account mode configured for chain ${chainConfig.chainId}`
    );
  }
  return {
    provider: config.provider,
    chainId: chainConfig.chainId,
    mode,
    batchingEnabled: chainConfig.allowBatching,
    sponsorship: chainConfig.sponsorship
  };
}
function getWalletExecutorReady(providerState) {
  return !providerState.resolved || !providerState.pending && (Boolean(providerState.account) || Boolean(providerState.error));
}
var DEFAULT_AA_CONFIG = {
  enabled: true,
  provider: "alchemy",
  chains: [
    {
      chainId: 1,
      enabled: true,
      defaultMode: "7702",
      supportedModes: ["7702", "4337"],
      allowBatching: true,
      sponsorship: "optional"
    },
    {
      chainId: 137,
      enabled: true,
      defaultMode: "7702",
      supportedModes: ["7702", "4337"],
      allowBatching: true,
      sponsorship: "optional"
    },
    {
      chainId: 42161,
      enabled: true,
      defaultMode: "7702",
      supportedModes: ["7702", "4337"],
      allowBatching: true,
      sponsorship: "optional"
    },
    {
      chainId: 10,
      enabled: true,
      defaultMode: "7702",
      supportedModes: ["7702", "4337"],
      allowBatching: true,
      sponsorship: "optional"
    },
    {
      chainId: 8453,
      enabled: true,
      defaultMode: "7702",
      supportedModes: ["7702", "4337"],
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
var ERC20_PAYMENT_CONTEXT_KEYS = /* @__PURE__ */ new Set(["erc20", "paymasterAddress"]);
var AA_DEBUG_STORAGE_KEYS = ["aomi:debug-aa", "AOMI_DEBUG_AA"];
function normalizeRpcCallData(data) {
  return data === "0x" ? void 0 : data;
}
function isAADebugEnabled() {
  const debugGlobal = globalThis;
  if (debugGlobal.__AOMI_DEBUG_AA === true) {
    return true;
  }
  try {
    return AA_DEBUG_STORAGE_KEYS.some((key) => {
      var _a;
      const value = (_a = debugGlobal.localStorage) == null ? void 0 : _a.getItem(key);
      return value === "1" || value === "true";
    });
  } catch (e) {
    return false;
  }
}
function debugAA(label, data) {
  if (!isAADebugEnabled()) return;
  console.info(`[aomi][aa][debug] ${label}`, data);
}
async function executeWalletCalls(params) {
  const {
    callList,
    currentChainId,
    capabilities,
    localPrivateKey,
    nativeWalletExecution,
    providerState,
    sendCallsSyncAsync,
    sendTransactionAsync,
    switchChainAsync,
    chainsById,
    getPreferredRpcUrl
  } = params;
  if (providerState.resolved && providerState.account) {
    return executeViaAA(callList, providerState, getPreferredRpcUrl);
  }
  if (providerState.resolved && providerState.error) {
    throw providerState.error;
  }
  return executeViaEoa({
    callList,
    currentChainId,
    capabilities,
    localPrivateKey,
    nativeWalletExecution,
    sendCallsSyncAsync,
    sendTransactionAsync,
    switchChainAsync,
    chainsById,
    getPreferredRpcUrl
  });
}
async function executeViaAA(callList, providerState, getPreferredRpcUrl) {
  var _a;
  const account = providerState.account;
  const resolved = providerState.resolved;
  if (!account || !resolved) {
    throw (_a = providerState.error) != null ? _a : new Error("smart_account_unavailable");
  }
  const callsPayload = callList.map(({ to, value, data }) => ({
    to,
    value,
    data: normalizeRpcCallData(data)
  }));
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
    console.warn(
      "[aomi][aa] transient bundler submission error; retrying once",
      {
        provider: account.provider,
        mode: account.mode,
        chainId: resolved.chainId,
        callCount: callList.length,
        error: toErrorMessage(error)
      }
    );
    try {
      receipt = await sendAARequest();
    } catch (retryError) {
      console.error(
        "[aomi][aa] AA retry failed after transient bundler submission error",
        {
          provider: account.provider,
          mode: account.mode,
          chainId: resolved.chainId,
          callCount: callList.length,
          firstError: toErrorMessage(error),
          retryError: toErrorMessage(retryError)
        }
      );
      throw retryError;
    }
  }
  const txHash = receipt.transactionHash;
  const providerPrefix = account.provider.toLowerCase();
  let Delegation7702 = account.mode === "7702" ? account.Delegation7702 : void 0;
  if (account.mode === "7702" && !Delegation7702) {
    Delegation7702 = await resolve7702Delegation(
      txHash,
      callList,
      getPreferredRpcUrl
    );
  }
  return __spreadValues(__spreadValues({
    txHash,
    txHashes: [txHash],
    executionKind: `${providerPrefix}_${account.mode}`,
    batched: callList.length > 1,
    sponsored: resolved.sponsorship !== "disabled"
  }, account.mode === "4337" && account.SmartAccount4337 ? { SmartAccount4337: account.SmartAccount4337 } : {}), Delegation7702 ? { Delegation7702 } : {});
}
async function resolve7702Delegation(txHash, callList, getPreferredRpcUrl) {
  var _a, _b, _c, _d;
  try {
    const chainId = (_a = callList[0]) == null ? void 0 : _a.chainId;
    if (!chainId) return void 0;
    const chain = CHAINS_BY_ID[chainId];
    if (!chain) return void 0;
    const rpcUrl = getPreferredRpcUrl(chain);
    const client = createPublicClient({ chain, transport: http(rpcUrl) });
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
  nativeWalletExecution,
  sendCallsSyncAsync,
  sendTransactionAsync,
  switchChainAsync,
  chainsById,
  getPreferredRpcUrl
}) {
  var _a, _b, _c;
  const hashes = [];
  const normalizedCalls = callList.map((call) => __spreadProps(__spreadValues({}, call), {
    data: normalizeRpcCallData(call.data)
  }));
  const requiresAtomicForBatch = Boolean(nativeWalletExecution == null ? void 0 : nativeWalletExecution.requiresAtomicForBatch) && normalizedCalls.length > 1;
  const nativeExecutionKind = (_a = nativeWalletExecution == null ? void 0 : nativeWalletExecution.executionKind) != null ? _a : "eoa";
  const sponsorship = nativeWalletExecution == null ? void 0 : nativeWalletExecution.sponsorship;
  const requiresSponsoredSendCalls = (sponsorship == null ? void 0 : sponsorship.mode) === "required";
  if (localPrivateKey) {
    if (requiresSponsoredSendCalls) {
      throw new Error("wallet_sponsorship_requires_send_calls");
    }
    if (requiresAtomicForBatch) {
      throw new Error("wallet_atomic_batch_required");
    }
    for (const call of normalizedCalls) {
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
      batched: normalizedCalls.length > 1,
      sponsored: false
    };
  }
  const chainIds = Array.from(
    new Set(normalizedCalls.map((call) => call.chainId))
  );
  if (chainIds.length > 1) {
    throw new Error("mixed_chain_bundle_not_supported");
  }
  const chainId = chainIds[0];
  if (currentChainId !== chainId) {
    await switchChainAsync({ chainId });
  }
  const chainCaps = resolveChainCapabilities(capabilities, chainId);
  const atomicStatus = (_b = chainCaps == null ? void 0 : chainCaps.atomic) == null ? void 0 : _b.status;
  const canUseAtomicSendCalls = normalizedCalls.length > 1 && (atomicStatus === "supported" || atomicStatus === "ready");
  const canUseSendCalls = canUseAtomicSendCalls || requiresSponsoredSendCalls;
  const sendCallsCapabilities = buildSendCallsCapabilities({
    chainCaps,
    nativeWalletExecution,
    requiresAtomicForBatch,
    canUseAtomicSendCalls
  });
  debugAA("native-wallet-sendCalls-plan", {
    callCount: normalizedCalls.length,
    chainId,
    chainCaps,
    canUseAtomicSendCalls,
    canUseSendCalls,
    nativeExecutionKind,
    requiresAtomicForBatch,
    sponsorshipMode: (_c = sponsorship == null ? void 0 : sponsorship.mode) != null ? _c : "disabled",
    sendCallsCapabilities
  });
  const sendSequentially = async () => {
    if (requiresAtomicForBatch) {
      throw new Error("wallet_atomic_batch_required");
    }
    for (const call of normalizedCalls) {
      const hash = await sendTransactionAsync({
        chainId: call.chainId,
        to: call.to,
        value: call.value,
        data: call.data
      });
      hashes.push(hash);
    }
  };
  let usedPaymasterService = false;
  let usedSendCalls = false;
  if (canUseSendCalls) {
    try {
      const sendCallsArgs = {
        chainId,
        calls: normalizedCalls.map(({ to, value, data }) => ({
          to,
          value,
          data
        })),
        capabilities: sendCallsCapabilities,
        forceAtomic: requiresAtomicForBatch,
        status: (result) => (result == null ? void 0 : result.status) === "success",
        throwOnFailure: true,
        timeout: nativeWalletExecution == null ? void 0 : nativeWalletExecution.sendCallsTimeoutMs,
        version: nativeWalletExecution == null ? void 0 : nativeWalletExecution.sendCallsVersion
      };
      debugAA("native-wallet-sendCalls-args", sendCallsArgs);
      const batchResult = await sendCallsSyncAsync(__spreadValues({}, sendCallsArgs));
      debugAA("native-wallet-sendCalls-result", batchResult);
      hashes.push(...extractBatchTransactionHashes(batchResult));
      usedPaymasterService = Boolean(sendCallsCapabilities == null ? void 0 : sendCallsCapabilities.paymasterService);
      usedSendCalls = true;
    } catch (error) {
      if (!canFallbackToSequentialWalletSends(
        error,
        requiresSponsoredSendCalls
      )) {
        throw error;
      }
      await sendSequentially();
    }
  } else {
    await sendSequentially();
  }
  const sponsoredResult = !usedSendCalls ? false : (sponsorship == null ? void 0 : sponsorship.mode) === "optional" ? void 0 : usedPaymasterService;
  return {
    txHash: hashes[hashes.length - 1],
    txHashes: hashes,
    executionKind: usedSendCalls ? nativeExecutionKind : "eoa",
    batched: normalizedCalls.length > 1,
    sponsored: sponsoredResult
  };
}
function extractBatchTransactionHashes(batchResult) {
  var _a;
  const receipts = (_a = batchResult.receipts) != null ? _a : [];
  const hashes = receipts.flatMap((receipt) => {
    var _a2;
    const hash = (_a2 = receipt.transactionHash) != null ? _a2 : receipt.hash;
    return hash ? [hash] : [];
  });
  if (hashes.length === 0) {
    throw new Error("wallet_send_calls_missing_transaction_hash");
  }
  return hashes;
}
function buildSendCallsCapabilities({
  chainCaps,
  nativeWalletExecution,
  requiresAtomicForBatch,
  canUseAtomicSendCalls
}) {
  var _a, _b;
  const capabilities = {};
  if (canUseAtomicSendCalls) {
    capabilities.atomic = requiresAtomicForBatch ? { required: true } : { optional: true };
  }
  const sponsorship = nativeWalletExecution == null ? void 0 : nativeWalletExecution.sponsorship;
  if ((sponsorship == null ? void 0 : sponsorship.mode) === "required") {
    if (!sponsorship.paymasterServiceUrl) {
      throw new Error("wallet_paymaster_service_url_required");
    }
    if (((_a = chainCaps == null ? void 0 : chainCaps.paymasterService) == null ? void 0 : _a.supported) !== true) {
      throw new Error("wallet_paymaster_service_unsupported");
    }
    const context = sanitizeSponsorshipPaymasterServiceContext(
      sponsorship.paymasterServiceContext
    );
    capabilities.paymasterService = {
      url: sponsorship.paymasterServiceUrl,
      context: context != null ? context : {}
    };
  } else if ((sponsorship == null ? void 0 : sponsorship.mode) === "optional" && sponsorship.paymasterServiceUrl && ((_b = chainCaps == null ? void 0 : chainCaps.paymasterService) == null ? void 0 : _b.supported) === true) {
    const context = sanitizeSponsorshipPaymasterServiceContext(
      sponsorship.paymasterServiceContext
    );
    capabilities.paymasterService = __spreadValues({
      url: sponsorship.paymasterServiceUrl,
      optional: true
    }, context ? { context } : {});
  }
  return Object.keys(capabilities).length > 0 ? capabilities : void 0;
}
function sanitizeSponsorshipPaymasterServiceContext(context) {
  if (!context) return void 0;
  const filteredEntries = Object.entries(context).filter(
    ([key]) => !ERC20_PAYMENT_CONTEXT_KEYS.has(key)
  );
  if (filteredEntries.length === Object.keys(context).length) {
    return context;
  }
  console.warn(
    "[aomi][aa] Ignoring ERC20 paymaster payment context on a sponsorship request"
  );
  const filteredContext = Object.fromEntries(
    filteredEntries
  );
  return Object.keys(filteredContext).length > 0 ? filteredContext : void 0;
}
function isUnsupportedAtomicCapabilityError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return lowered.includes("unsupported non-optional capabilities: atomic") || lowered.includes("unsupported") && lowered.includes("atomic") || lowered.includes("wallet does not support") && lowered.includes("capabilit");
}
function isRecoverableOptionalPaymasterError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return lowered.includes("paymaster") || lowered.includes("sponsor") || lowered.includes("erc-7677");
}
function canFallbackToSequentialWalletSends(error, requiresSponsoredSendCalls) {
  if (requiresSponsoredSendCalls) {
    return false;
  }
  return isUnsupportedAtomicCapabilityError(error) || isRecoverableOptionalPaymasterError(error);
}
function toErrorMessage(error) {
  var _a;
  if (error instanceof Error) {
    return (_a = error.stack) != null ? _a : error.message;
  }
  return String(error);
}
function isRetryableBundlerSubmissionError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return lowered.includes("bundle id is unknown") || lowered.includes("bundle id unknown") || lowered.includes("has not been submitted") || lowered.includes("userop") && lowered.includes("not found") || lowered.includes("user operation") && lowered.includes("not found");
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

// src/aa/fee.ts
import { getAddress as getAddress2 } from "viem";
var MAX_AUTO_FEE_WEI = BigInt("50000000000000000");
var ZERO_WEI = BigInt("0");
function toPayloadCalls(payload, defaultChainId) {
  var _a, _b;
  if (Array.isArray(payload.calls) && payload.calls.length > 0) {
    return payload.calls;
  }
  if (!payload.to) {
    throw new Error("pending_transaction_missing_call_data");
  }
  return [
    {
      txId: (_a = payload.txId) != null ? _a : 0,
      to: payload.to,
      value: payload.value,
      data: payload.data,
      chainId: (_b = payload.chainId) != null ? _b : defaultChainId
    }
  ];
}
function normalizeSimulatedFee(fee) {
  const amountWei = BigInt(fee.amount_wei);
  if (amountWei === ZERO_WEI) {
    return null;
  }
  if (amountWei < ZERO_WEI) {
    throw new Error(`Invalid fee amount: ${fee.amount_wei}`);
  }
  if (amountWei > MAX_AUTO_FEE_WEI) {
    throw new Error("fee_exceeds_safety_limit");
  }
  return {
    recipient: getAddress2(fee.recipient),
    amountWei
  };
}
function buildFeeAAWalletCall(fee, chainId) {
  const normalizedFee = normalizeSimulatedFee(fee);
  if (!normalizedFee) {
    return null;
  }
  return {
    to: normalizedFee.recipient,
    value: normalizedFee.amountWei,
    chainId
  };
}
function appendFeeCallToPayload(payload, fee, defaultChainId, options) {
  var _a, _b;
  const feeCall = normalizeSimulatedFee(fee);
  if (!feeCall) {
    return payload;
  }
  const calls = toPayloadCalls(payload, defaultChainId);
  const forceAaPreference = (_a = options == null ? void 0 : options.forceAaPreference) != null ? _a : "eip7702";
  const strictAa = (_b = options == null ? void 0 : options.strictAa) != null ? _b : true;
  return __spreadProps(__spreadValues({}, payload), {
    // Fee call must be the final call in the AA batch.
    calls: [
      ...calls,
      {
        txId: 0,
        to: feeCall.recipient,
        value: feeCall.amountWei.toString(),
        chainId: defaultChainId
      }
    ],
    // Force AA mode once fee is appended so single user tx + fee still batches via AA.
    aaPreference: forceAaPreference,
    // Do not silently downgrade fee-injected batch requests to EOA.
    aaStrict: strictAa
  });
}

// src/aa/alchemy/defaults.ts
var DEFAULT_ALCHEMY_API_KEY = "72eIUle_3rfixX00QJVwk";
var DEFAULT_ALCHEMY_GAS_POLICY_ID = "fb17d7d7-9a32-479d-937a-52d72b849c40";
function trimToUndefined(value) {
  const trimmed = value == null ? void 0 : value.trim();
  return trimmed ? trimmed : void 0;
}
function resolveAlchemyApiKey(options) {
  const explicit = trimToUndefined(options == null ? void 0 : options.apiKey);
  if (explicit) return explicit;
  if (!(options == null ? void 0 : options.publicOnly)) {
    const privateEnv = trimToUndefined(process.env.ALCHEMY_API_KEY);
    if (privateEnv) return privateEnv;
  }
  const publicEnv = trimToUndefined(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY);
  if (publicEnv) return publicEnv;
  return DEFAULT_ALCHEMY_API_KEY;
}
function resolveAlchemyGasPolicyId(options) {
  const explicit = trimToUndefined(options == null ? void 0 : options.gasPolicyId);
  if (explicit) return explicit;
  if (!(options == null ? void 0 : options.publicOnly)) {
    const privateEnv = trimToUndefined(process.env.ALCHEMY_GAS_POLICY_ID);
    if (privateEnv) return privateEnv;
  }
  const publicEnv = trimToUndefined(process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID);
  if (publicEnv) return publicEnv;
  return DEFAULT_ALCHEMY_GAS_POLICY_ID;
}

// src/aa/alchemy/provider.ts
function resolveForHook(params) {
  const { calls, localPrivateKey, accountAbstractionConfig, chainsById, getPreferredRpcUrl } = params;
  if (!calls || localPrivateKey) return null;
  const config = __spreadProps(__spreadValues({}, accountAbstractionConfig), { provider: "alchemy" });
  const chainConfig = getAAChainConfig(config, calls, chainsById);
  if (!chainConfig) return null;
  const apiKey = resolveAlchemyApiKey({ publicOnly: true });
  const chain = chainsById[chainConfig.chainId];
  if (!chain) return null;
  const gasPolicyId = resolveAlchemyGasPolicyId({ publicOnly: true });
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
function normalizeAAProvider(value) {
  const lowered = value.toLowerCase();
  if (lowered === "alchemy" || lowered === "pimlico") {
    return lowered;
  }
  throw new Error(`Unsupported AA provider from SDK: ${value}`);
}
function adaptSmartAccount(account, address) {
  if (account.mode === "4337") {
    return {
      provider: normalizeAAProvider(account.provider),
      mode: "4337",
      address,
      SmartAccount4337: account.smartAccountAddress,
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
  const Delegation7702 = account.delegationAddress && account.smartAccountAddress && account.delegationAddress.toLowerCase() !== account.smartAccountAddress.toLowerCase() ? account.delegationAddress : void 0;
  return __spreadProps(__spreadValues({
    provider: normalizeAAProvider(account.provider),
    mode: "7702",
    address
  }, Delegation7702 ? { Delegation7702 } : {}), {
    sendTransaction: async (call) => {
      const receipt = await account.sendTransaction(call);
      return { transactionHash: receipt.transactionHash };
    },
    sendBatchTransaction: async (calls) => {
      const receipt = await account.sendBatchTransaction(calls);
      return { transactionHash: receipt.transactionHash };
    }
  });
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
function extractExistingAccountAddress(error) {
  var _a;
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(
    /Account with address (0x[a-fA-F0-9]{40}) already exists/
  );
  return (_a = match == null ? void 0 : match[1]) != null ? _a : null;
}
function deriveAlchemy4337AccountId(address) {
  var _a;
  const hex = address.toLowerCase().slice(2).padEnd(32, "0").slice(0, 32).split("");
  const namespace = ["4", "3", "3", "7", "5", "a", "a", "b"];
  for (let index = 0; index < namespace.length; index += 1) {
    hex[index] = namespace[index];
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
function aaDebug(message, fields) {
  if (!AA_DEBUG_ENABLED) return;
  if (fields) {
    console.debug(`[aomi][aa][alchemy] ${message}`, fields);
    return;
  }
  console.debug(`[aomi][aa][alchemy] ${message}`);
}
async function createAlchemySdkState(params) {
  const { createAlchemySmartAccount } = await import("@getpara/aa-alchemy");
  const smartAccount = await createAlchemySmartAccount(__spreadProps(__spreadValues({}, params.ownerParams), {
    apiKey: params.apiKey,
    gasPolicyId: params.gasPolicyId,
    chain: params.chain,
    rpcUrl: params.rpcUrl,
    mode: params.mode
  }));
  if (!smartAccount) {
    return {
      resolved: params.resolved,
      account: null,
      pending: false,
      error: new Error("Alchemy AA account could not be initialized.")
    };
  }
  const ownerAddress = "address" in params.ownerParams ? params.ownerParams.address : void 0;
  if (!ownerAddress) {
    return {
      resolved: params.resolved,
      account: null,
      pending: false,
      error: new Error(
        "Alchemy AA session owner is missing a wallet address. Connect a wallet first."
      )
    };
  }
  return {
    resolved: params.resolved,
    account: adaptSmartAccount(smartAccount, ownerAddress),
    pending: false,
    error: null
  };
}
async function createAlchemyAAState(options) {
  const { chain, owner, callList, mode } = options;
  const apiKey = resolveAlchemyApiKey({ apiKey: options.apiKey });
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
  const sponsored = effectiveMode === "4337";
  const gasPolicyId = sponsored ? resolveAlchemyGasPolicyId({ gasPolicyId: options.gasPolicyId }) : void 0;
  const execution = __spreadProps(__spreadValues({}, plan), {
    mode: effectiveMode,
    sponsorship: gasPolicyId ? resolveAASponsorship(effectiveMode, plan.sponsorship) : "disabled"
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
      apiKey,
      proxyBaseUrl: options.proxyBaseUrl,
      gasPolicyId
    };
    try {
      return await createAlchemyWalletApisState(directParams);
    } catch (error) {
      return {
        resolved: execution,
        account: null,
        pending: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  if (!apiKey) {
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
    return await createAlchemySdkState({
      resolved: execution,
      ownerParams: ownerParams.ownerParams,
      chain,
      rpcUrl: options.rpcUrl,
      apiKey,
      gasPolicyId,
      mode: execution.mode
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
async function createAlchemyWalletApisState(params) {
  const { createSmartWalletClient, alchemyWalletTransport } = await import("@alchemy/wallet-apis");
  const transport = params.proxyBaseUrl ? alchemyWalletTransport({ url: params.proxyBaseUrl }) : alchemyWalletTransport({ apiKey: params.apiKey });
  const signer = privateKeyToAccount3(params.privateKey);
  const alchemyClient = createSmartWalletClient(__spreadValues({
    transport,
    chain: params.chain,
    signer
  }, params.gasPolicyId ? { paymaster: { policyId: params.gasPolicyId } } : {}));
  const signerAddress = signer.address;
  let accountAddress = signerAddress;
  if (params.resolved.mode === "4337") {
    const accountId = deriveAlchemy4337AccountId(signerAddress);
    aaDebug("4337:requestAccount:start", {
      signerAddress,
      chainId: params.chain.id,
      accountId,
      hasGasPolicyId: Boolean(params.gasPolicyId)
    });
    try {
      const account = await alchemyClient.requestAccount({
        signerAddress,
        id: accountId,
        creationHint: {
          accountType: "sma-b",
          createAdditional: true
        }
      });
      accountAddress = account.address;
    } catch (error) {
      const existingAccountAddress = extractExistingAccountAddress(error);
      if (!existingAccountAddress) {
        throw error;
      }
      aaDebug("4337:requestAccount:existing-account", {
        signerAddress,
        existingAccountAddress
      });
      const account = await alchemyClient.requestAccount({
        accountAddress: existingAccountAddress
      });
      accountAddress = account.address;
    }
    aaDebug("4337:requestAccount:done", { signerAddress, accountAddress });
  }
  const sendCalls = async (calls) => {
    var _a, _b, _c, _d;
    aaDebug(`${params.resolved.mode}:sendCalls:start`, {
      signerAddress,
      accountAddress,
      chainId: params.chain.id,
      callCount: calls.length,
      hasGasPolicyId: Boolean(params.gasPolicyId)
    });
    try {
      const result = await alchemyClient.sendCalls(__spreadProps(__spreadValues({}, params.resolved.mode === "4337" ? { account: accountAddress } : {}), {
        calls
      }));
      aaDebug(`${params.resolved.mode}:sendCalls:submitted`, { callId: result.id });
      const status = await alchemyClient.waitForCallsStatus({ id: result.id });
      const transactionHash = (_b = (_a = status.receipts) == null ? void 0 : _a[0]) == null ? void 0 : _b.transactionHash;
      aaDebug(`${params.resolved.mode}:sendCalls:receipt`, {
        callId: result.id,
        hasTransactionHash: Boolean(transactionHash),
        receipts: (_d = (_c = status.receipts) == null ? void 0 : _c.length) != null ? _d : 0
      });
      if (!transactionHash) {
        throw new Error("Alchemy Wallets API did not return a transaction hash.");
      }
      return { transactionHash };
    } catch (error) {
      aaDebug(`${params.resolved.mode}:sendCalls:error`, {
        signerAddress,
        accountAddress,
        chainId: params.chain.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  };
  const smartAccount = __spreadProps(__spreadValues({
    provider: "alchemy",
    mode: params.resolved.mode,
    address: signerAddress
  }, params.resolved.mode === "4337" ? { SmartAccount4337: accountAddress } : { Delegation7702: ALCHEMY_7702_DELEGATION_ADDRESS }), {
    sendTransaction: async (call) => sendCalls([call]),
    sendBatchTransaction: async (calls) => sendCalls(calls)
  });
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
    sponsorship: resolveAASponsorship(effectiveMode, plan.sponsorship)
  });
  const ownerParams = getOwnerParams(owner);
  if (ownerParams.kind === "missing") {
    return getMissingOwnerState(execution, "pimlico");
  }
  if (ownerParams.kind === "unsupported_adapter") {
    return getUnsupportedAdapterState(execution, ownerParams.adapter);
  }
  const localSessionSigner = owner.kind === "session" ? resolvePimlicoSessionSigner(ownerParams.ownerParams) : null;
  try {
    const signer = owner.kind === "direct" ? privateKeyToAccount4(owner.privateKey) : localSessionSigner;
    if (signer) {
      return await createPimlicoPermissionlessState({
        resolved: execution,
        chain,
        signer,
        externalSigner: owner.kind === "session" && "signer" in ownerParams.ownerParams ? ownerParams.ownerParams.signer : void 0,
        rpcUrl: options.rpcUrl,
        apiKey,
        mode: effectiveMode
      });
    }
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
    const ownerAddress = "address" in ownerParams.ownerParams ? ownerParams.ownerParams.address : void 0;
    if (!ownerAddress) {
      return {
        resolved: execution,
        account: null,
        pending: false,
        error: new Error(
          "Pimlico AA session owner is missing a wallet address. Connect a wallet first."
        )
      };
    }
    const account = adaptPimlicoSdkAccount(smartAccount, ownerAddress);
    return {
      resolved: execution,
      account,
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
function isExternalWalletSigner(signer) {
  return !!signer && typeof signer === "object" && "transport" in signer && "account" in signer;
}
function resolvePimlicoSessionSigner(ownerParams) {
  if (!("signer" in ownerParams) || !ownerParams.signer) {
    return null;
  }
  if (!isExternalWalletSigner(ownerParams.signer)) {
    return ownerParams.signer;
  }
  const account = ownerParams.signer.account;
  if (!(account == null ? void 0 : account.address)) {
    throw new Error(
      "[resolvePimlicoSessionSigner] WalletClient must have an account set."
    );
  }
  const externalSigner = ownerParams.signer;
  return {
    address: account.address,
    publicKey: "0x",
    source: "custom",
    type: "local",
    sign: async ({ hash }) => externalSigner.signMessage({
      account: account.address,
      message: { raw: hash }
    }),
    signMessage: async ({ message }) => externalSigner.signMessage({
      account: account.address,
      message
    }),
    signTransaction: async (tx) => externalSigner.signTransaction(__spreadProps(__spreadValues({}, tx), {
      account
    })),
    signTypedData: async (typedData) => externalSigner.signTypedData(__spreadProps(__spreadValues({}, typedData), {
      account: account.address
    })),
    signAuthorization: async () => {
      throw new Error(
        "EIP-7702 account delegation (signAuthorization) is not supported with external wallets."
      );
    }
  };
}
async function ensureExternalWalletChain(signer, chain) {
  if (!isExternalWalletSigner(signer)) return;
  const currentChainId = await signer.getChainId();
  if (currentChainId !== chain.id) {
    throw new Error(
      `External wallet is on chain ${currentChainId} but smart account targets chain ${chain.id} (${chain.name}).`
    );
  }
}
function rejectExternalWallet7702(signer) {
  if (!isExternalWalletSigner(signer)) return;
  throw new Error(
    "EIP-7702 mode is not supported with external wallets. Use an embedded wallet or 4337 mode."
  );
}
function adaptPimlicoSdkAccount(account, address) {
  const lowered = account.provider.toLowerCase();
  if (lowered !== "alchemy" && lowered !== "pimlico") {
    throw new Error(`Unsupported AA provider from Pimlico SDK: ${account.provider}`);
  }
  const provider = lowered;
  if (account.mode === "4337") {
    return {
      provider,
      mode: "4337",
      address,
      SmartAccount4337: account.smartAccountAddress,
      sendTransaction: async (call) => account.sendTransaction(call),
      sendBatchTransaction: async (calls) => account.sendBatchTransaction(calls)
    };
  }
  return __spreadProps(__spreadValues({
    provider,
    mode: "7702",
    address
  }, account.delegationAddress ? { Delegation7702: account.delegationAddress } : {}), {
    sendTransaction: async (call) => account.sendTransaction(call),
    sendBatchTransaction: async (calls) => account.sendBatchTransaction(calls)
  });
}
async function createPimlicoPermissionlessState(params) {
  const { createSmartAccountClient } = await import("permissionless");
  const { toSimpleSmartAccount, to7702SimpleSmartAccount } = await import("permissionless/accounts");
  const { createPimlicoClient } = await import("permissionless/clients/pimlico");
  const { createPublicClient: createPublicClient2, http: http2 } = await import("viem");
  const { entryPoint07Address, entryPoint08Address, prepareUserOperation } = await import("viem/account-abstraction");
  const signerAddress = params.signer.address;
  const pimlicoRpcUrl = buildPimlicoRpcUrl(params.chain, params.apiKey);
  const sponsored = params.resolved.sponsorship !== "disabled";
  const entryPoint = params.mode === "7702" ? { address: entryPoint08Address, version: "0.8" } : { address: entryPoint07Address, version: "0.7" };
  pimDebug(`${params.mode}:start`, {
    signerAddress,
    chainId: params.chain.id,
    sponsored,
    pimlicoRpcUrl: pimlicoRpcUrl.replace(params.apiKey, "***")
  });
  const publicClient = createPublicClient2({
    chain: params.chain,
    transport: http2(params.rpcUrl)
  });
  if (params.mode === "7702") {
    rejectExternalWallet7702(params.externalSigner);
  }
  const paymasterClient = sponsored ? createPimlicoClient({
    entryPoint,
    transport: http2(pimlicoRpcUrl)
  }) : void 0;
  const smartAccount = params.mode === "7702" ? await to7702SimpleSmartAccount({
    client: publicClient,
    owner: params.signer,
    entryPoint
  }) : await toSimpleSmartAccount({
    client: publicClient,
    owner: params.signer,
    entryPoint
  });
  if (params.mode === "7702") {
    smartAccount.isDeployed = async () => false;
  }
  const accountAddress = smartAccount.address;
  pimDebug(`${params.mode}:account-created`, {
    signerAddress,
    accountAddress
  });
  const userOperation = __spreadValues(__spreadValues({}, paymasterClient ? {
    estimateFeesPerGas: async () => {
      const gasPrice = await paymasterClient.getUserOperationGasPrice();
      return gasPrice.fast;
    }
  } : {}), params.mode === "7702" ? {
    prepareUserOperation: async (client, args) => {
      const prepared = await prepareUserOperation(client, args);
      if (prepared.authorization && params.signer.signAuthorization) {
        prepared.authorization = await params.signer.signAuthorization({
          contractAddress: prepared.authorization.address,
          chainId: prepared.authorization.chainId,
          nonce: prepared.authorization.nonce
        });
      }
      return prepared;
    }
  } : {});
  const smartAccountClient = createSmartAccountClient(__spreadProps(__spreadValues({
    account: smartAccount,
    chain: params.chain,
    bundlerTransport: http2(pimlicoRpcUrl)
  }, paymasterClient ? { paymaster: paymasterClient } : {}), {
    userOperation
  }));
  const sendCalls = async (calls) => {
    pimDebug(`${params.mode}:send:start`, {
      accountAddress,
      chainId: params.chain.id,
      callCount: calls.length
    });
    await ensureExternalWalletChain(params.externalSigner, params.chain);
    try {
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
      pimDebug(`${params.mode}:send:userOpHash`, { hash });
      const receipt = await publicClient.waitForTransactionReceipt({
        hash
      });
      pimDebug(`${params.mode}:send:confirmed`, {
        transactionHash: receipt.transactionHash,
        status: receipt.status
      });
      return { transactionHash: receipt.transactionHash };
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  };
  const account = params.mode === "4337" ? {
    provider: "pimlico",
    mode: "4337",
    address: signerAddress,
    SmartAccount4337: accountAddress,
    sendTransaction: async (call) => sendCalls([call]),
    sendBatchTransaction: async (calls) => sendCalls(calls)
  } : {
    provider: "pimlico",
    mode: "7702",
    address: signerAddress,
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
  ALCHEMY_CHAIN_SLUGS,
  AomiClient,
  CHAINS_BY_ID,
  CHAIN_NAMES,
  CLIENT_TYPE_TS_CLI,
  CLIENT_TYPE_WEB_UI,
  DEFAULT_AA_CONFIG,
  DISABLED_PROVIDER_STATE,
  MAX_AUTO_FEE_WEI,
  SUPPORTED_CHAINS,
  SUPPORTED_CHAIN_IDS,
  ClientSession as Session,
  TypedEventEmitter,
  UserState,
  aaModeFromExecutionKind,
  adaptSmartAccount,
  appendFeeCallToPayload,
  buildAAExecutionPlan,
  buildFeeAAWalletCall,
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
  monad,
  monadTestnet,
  normalizeEip712Payload,
  normalizeSimulatedFee,
  normalizeSolanaSignPayload,
  normalizeTxPayload,
  parseChainId,
  resolvePimlicoConfig,
  toAAWalletCall,
  toAAWalletCalls,
  toViemSignTypedDataArgs,
  unwrapSystemEvent
};
//# sourceMappingURL=index.js.map