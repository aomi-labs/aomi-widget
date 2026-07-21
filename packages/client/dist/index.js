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
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};

// src/user-state/normalize.ts
function asObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return void 0;
  }
  return value;
}
function asEvmObject(value) {
  return Array.isArray(value) ? asObject(value[0]) : asObject(value);
}
function pick(record, ...keys) {
  if (!record) {
    return void 0;
  }
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key) && record[key] !== void 0) {
      return record[key];
    }
  }
  return void 0;
}
function assignDefined(target, key, value) {
  if (value !== void 0) {
    target[key] = value;
  }
}
function renameKey(obj, from, to) {
  if (from === to) return;
  if (Object.prototype.hasOwnProperty.call(obj, from)) {
    if (!(to in obj) || obj[to] === void 0) {
      obj[to] = obj[from];
    }
    delete obj[from];
  }
}
function liftFlat(obj, flat, to, fromKeys) {
  if (to in obj && obj[to] !== void 0) return;
  const value = pick(flat, ...fromKeys);
  if (value !== void 0) {
    obj[to] = value;
  }
}
var OPAQUE_PENDING_KEYS = /* @__PURE__ */ new Set(["typed_data", "typedData", "domain"]);
function camelToSnake(key) {
  return key.replace(/([A-Z])/g, "_$1").toLowerCase();
}
function snakeizePendingValue(value) {
  if (Array.isArray(value)) {
    return value.map(snakeizePendingValue);
  }
  const obj = asObject(value);
  if (!obj) return value;
  const out = {};
  for (const [key, val] of Object.entries(obj)) {
    const snake = camelToSnake(key);
    out[snake] = OPAQUE_PENDING_KEYS.has(key) || OPAQUE_PENDING_KEYS.has(snake) ? val : snakeizePendingValue(val);
  }
  return out;
}
function snakeizeBucket(bucket) {
  const obj = asObject(bucket);
  if (!obj) return void 0;
  const out = {};
  for (const [id, value] of Object.entries(obj)) {
    out[id] = snakeizePendingValue(value);
  }
  return out;
}
function buildConnection(src, flat) {
  const c = __spreadValues({}, src != null ? src : {});
  renameKey(c, "isConnected", "is_connected");
  renameKey(c, "providerLabel", "provider_label");
  renameKey(c, "walletProviderSubject", "wallet_provider_subject");
  renameKey(c, "authMethod", "auth_method");
  renameKey(c, "authValue", "auth_value");
  renameKey(c, "authVerifiedAt", "auth_verified_at");
  liftFlat(c, flat, "is_connected", ["is_connected", "isConnected"]);
  liftFlat(c, flat, "provider", ["wallet_provider", "walletProvider"]);
  liftFlat(c, flat, "wallet_provider_subject", [
    "wallet_provider_subject",
    "walletProviderSubject"
  ]);
  liftFlat(c, flat, "auth_method", ["auth_method", "authMethod"]);
  liftFlat(c, flat, "auth_value", ["auth_value", "authValue"]);
  liftFlat(c, flat, "auth_verified_at", ["auth_verified_at", "authVerifiedAt"]);
  dropNullKeys(c, "is_connected");
  return Object.keys(c).length ? c : void 0;
}
function buildEvm(src, flat) {
  var _a, _b;
  const e = __spreadValues({}, src != null ? src : {});
  renameKey(e, "chainId", "chain_id");
  renameKey(e, "ensName", "ens_name");
  const aa = __spreadValues({}, (_a = asObject(e.aa)) != null ? _a : {});
  delete e.aa;
  renameKey(aa, "smartAccount", "smart_account");
  renameKey(aa, "delegation7702", "delegation_7702");
  liftFlat(aa, flat, "mode", ["aa_mode", "aaMode"]);
  liftFlat(aa, flat, "smart_account", [
    "smart_account_4337",
    "smartAccount4337",
    "smart_account",
    "smartAccount"
  ]);
  liftFlat(aa, flat, "delegation_7702", ["delegation_7702", "delegation7702"]);
  if (Object.keys(aa).length) e.aa = aa;
  const sponsorship = __spreadValues({}, (_b = asObject(e.sponsorship)) != null ? _b : {});
  delete e.sponsorship;
  renameKey(sponsorship, "sponsorProvider", "sponsor_provider");
  renameKey(sponsorship, "sponsorAccount", "sponsor_account");
  liftFlat(sponsorship, flat, "sponsored", ["sponsored"]);
  liftFlat(sponsorship, flat, "sponsor_provider", [
    "sponsor_provider",
    "sponsorProvider"
  ]);
  liftFlat(sponsorship, flat, "sponsor_account", [
    "sponsor_account",
    "sponsorAccount"
  ]);
  if (Object.keys(sponsorship).length) e.sponsorship = sponsorship;
  liftFlat(e, flat, "address", ["address"]);
  liftFlat(e, flat, "chain_id", ["chain_id", "chainId"]);
  if (e.chain_id != null) {
    const cid = parseChainId(e.chain_id);
    if (cid !== void 0) e.chain_id = cid;
    else delete e.chain_id;
  }
  liftFlat(e, flat, "ens_name", ["ens_name", "ensName"]);
  return Object.keys(e).length ? e : void 0;
}
function buildSvm(src, flat) {
  const s = __spreadValues({}, src != null ? src : {});
  renameKey(s, "walletName", "wallet_name");
  liftFlat(s, flat, "address", ["svm_address", "svmAddress"]);
  dropNullKeys(s, "capabilities");
  return Object.keys(s).length ? s : void 0;
}
function buildPending(src, flat) {
  var _a, _b, _c;
  const p = {};
  assignDefined(
    p,
    "evm_txs",
    snakeizeBucket(
      (_a = pick(src, "evm_txs", "evmTxs")) != null ? _a : pick(flat, "pending_txs", "pendingTxs")
    )
  );
  assignDefined(
    p,
    "evm_sigs",
    snakeizeBucket(
      (_b = pick(src, "evm_sigs", "evmSigs")) != null ? _b : pick(flat, "pending_eip712s", "pendingEip712s")
    )
  );
  assignDefined(
    p,
    "svm_ixs",
    snakeizeBucket(
      (_c = pick(src, "svm_ixs", "svmIxs", "solana_txs", "solanaTxs")) != null ? _c : pick(flat, "pending_solana_txs", "pendingSolanaTxs")
    )
  );
  assignDefined(
    p,
    "svm_sigs",
    snakeizeBucket(pick(src, "svm_sigs", "svmSigs", "solana_sigs", "solanaSigs"))
  );
  return Object.keys(p).length ? p : void 0;
}
function dropNullKeys(obj, ...keys) {
  for (const key of keys) {
    if (obj[key] === null || obj[key] === void 0) {
      delete obj[key];
    }
  }
}
function deepMergePreserve(previous, incoming) {
  const out = __spreadValues({}, previous);
  for (const [key, value] of Object.entries(incoming)) {
    const prevObj = asObject(out[key]);
    const incObj = asObject(value);
    if (prevObj && incObj) {
      out[key] = deepMergePreserve(prevObj, incObj);
    } else if (value !== void 0) {
      out[key] = value;
    }
  }
  return out;
}
function parseChainId(value) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  const parsed = trimmed.startsWith("0x") ? Number.parseInt(trimmed.slice(2), 16) : Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : void 0;
}
function address(state) {
  var _a;
  const value = (_a = asEvmObject(state == null ? void 0 : state.evm)) == null ? void 0 : _a.address;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function svmAddress(state) {
  var _a;
  const value = (_a = asObject(state == null ? void 0 : state.svm)) == null ? void 0 : _a.address;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function chainId(state) {
  var _a;
  return parseChainId((_a = asEvmObject(state == null ? void 0 : state.evm)) == null ? void 0 : _a.chain_id);
}
function isConnected(state) {
  var _a;
  const value = (_a = asObject(state == null ? void 0 : state.connection)) == null ? void 0 : _a.is_connected;
  return typeof value === "boolean" ? value : void 0;
}
function sameAddress(a, b) {
  const na = typeof a === "string" ? a.toLowerCase() : void 0;
  const nb = typeof b === "string" ? b.toLowerCase() : void 0;
  return na !== void 0 && na === nb;
}
function normalizeUserState(userState) {
  const src = asObject(userState);
  if (!src) {
    return void 0;
  }
  const out = {};
  const connection = buildConnection(asObject(pick(src, "connection")), src);
  if (connection) out.connection = connection;
  const evm = buildEvm(asEvmObject(pick(src, "evm")), src);
  if (evm) out.evm = evm;
  const svm = buildSvm(asObject(pick(src, "svm", "solana")), src);
  if (svm) out.svm = svm;
  const pending = buildPending(asObject(pick(src, "pending")), src);
  if (pending) out.pending = pending;
  const ext = pick(src, "ext");
  if (ext !== void 0) out.ext = ext;
  const preferences = pick(src, "preferences");
  if (preferences !== void 0)
    out.preferences = preferences;
  return out;
}
function stripDanglingConnection(state) {
  if (isConnected(state) !== true || chainId(state) !== void 0 || svmAddress(state) !== void 0) {
    return state;
  }
  const conn = asObject(state.connection);
  if (!conn) return state;
  const trimmed = __spreadValues({}, conn);
  delete trimmed.is_connected;
  if (Object.keys(trimmed).length) {
    state.connection = trimmed;
  } else {
    delete state.connection;
  }
  return state;
}
function reconcileUserState(previousUserState, incomingUserState) {
  const inc = normalizeUserState(incomingUserState);
  if (!inc) return void 0;
  const prev = normalizeUserState(previousUserState);
  if (!prev) return stripDanglingConnection(inc);
  const out = __spreadValues({}, inc);
  const connectedNotBroken = isConnected(inc) !== false;
  const prevConn = asObject(prev.connection);
  const incConn = asObject(inc.connection);
  if (connectedNotBroken && prevConn) {
    out.connection = incConn ? deepMergePreserve(prevConn, incConn) : prevConn;
  }
  const prevEvm = asObject(prev.evm);
  const incEvm = asObject(inc.evm);
  const sameEvm = !!address(prev) && (!address(inc) || sameAddress(address(prev), address(inc)));
  if (connectedNotBroken && prevEvm && (sameEvm || !incEvm)) {
    out.evm = incEvm ? deepMergePreserve(prevEvm, incEvm) : prevEvm;
  }
  const prevSvm = asObject(prev.svm);
  const incSvm = asObject(inc.svm);
  const sameSvm = !!svmAddress(prev) && (!svmAddress(inc) || svmAddress(prev) === svmAddress(inc));
  if (connectedNotBroken && prevSvm && (sameSvm || !incSvm)) {
    out.svm = incSvm ? deepMergePreserve(prevSvm, incSvm) : prevSvm;
  }
  if (!asObject(inc.pending) && asObject(prev.pending)) {
    out.pending = prev.pending;
  }
  if (inc.ext === void 0 && prev.ext !== void 0) {
    out.ext = prev.ext;
  }
  const outExt = asObject(out.ext);
  if (outExt && Object.keys(outExt).length === 0) {
    delete out.ext;
  }
  if (inc.preferences === void 0 && prev.preferences !== void 0) {
    out.preferences = prev.preferences;
  }
  return stripDanglingConnection(out);
}

// src/user-state/accessors.ts
function asObject2(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return void 0;
  }
  return value;
}
function evmBlock(userState) {
  var _a;
  return asObject2((_a = normalizeUserState(userState)) == null ? void 0 : _a.evm);
}
function svmBlock(userState) {
  var _a;
  return asObject2((_a = normalizeUserState(userState)) == null ? void 0 : _a.svm);
}
function connBlock(userState) {
  var _a;
  return asObject2((_a = normalizeUserState(userState)) == null ? void 0 : _a.connection);
}
function aaBlock(userState) {
  var _a;
  return asObject2((_a = evmBlock(userState)) == null ? void 0 : _a.aa);
}
function sponsorshipBlock(userState) {
  var _a;
  return asObject2((_a = evmBlock(userState)) == null ? void 0 : _a.sponsorship);
}
function parseChainId2(value) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  const parsed = trimmed.startsWith("0x") ? Number.parseInt(trimmed.slice(2), 16) : Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : void 0;
}
function optionalString(value) {
  if (value === null) return null;
  return typeof value === "string" && value.trim().length > 0 ? value : void 0;
}
function optionalAddress(value) {
  if (value === null) return null;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function timestamp(value) {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== "string") return void 0;
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
function address2(userState) {
  var _a;
  const value = (_a = evmBlock(userState)) == null ? void 0 : _a.address;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
var evmAddress = address2;
function svmAddress2(userState) {
  var _a;
  const value = (_a = svmBlock(userState)) == null ? void 0 : _a.address;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function chainId2(userState) {
  var _a;
  return parseChainId2((_a = evmBlock(userState)) == null ? void 0 : _a.chain_id);
}
function ensName(userState) {
  var _a;
  const value = (_a = evmBlock(userState)) == null ? void 0 : _a.ens_name;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function aaMode(userState) {
  var _a;
  const value = (_a = aaBlock(userState)) == null ? void 0 : _a.mode;
  if (value === null) return null;
  return value === "none" || value === "4337" || value === "7702" ? value : void 0;
}
function SmartAccount4337(userState) {
  var _a;
  return optionalAddress((_a = aaBlock(userState)) == null ? void 0 : _a.smart_account);
}
function Delegation7702(userState) {
  var _a;
  return optionalAddress((_a = aaBlock(userState)) == null ? void 0 : _a.delegation_7702);
}
function walletKind(userState) {
  const addr = address2(userState);
  if (!addr) return void 0;
  const smartAccount = SmartAccount4337(userState);
  return smartAccount && addr.toLowerCase() === smartAccount.toLowerCase() ? "smart-account" : "eoa";
}
function isConnected2(userState) {
  var _a;
  const value = (_a = connBlock(userState)) == null ? void 0 : _a.is_connected;
  return typeof value === "boolean" ? value : void 0;
}
function walletProvider(userState) {
  var _a;
  const value = (_a = connBlock(userState)) == null ? void 0 : _a.provider;
  if (value === null) return null;
  return value === "para" || value === "privy" || value === "baseAccount" ? value : void 0;
}
function walletProviderSubject(userState) {
  var _a;
  return optionalString((_a = connBlock(userState)) == null ? void 0 : _a.wallet_provider_subject);
}
function authMethod(userState) {
  var _a;
  const value = (_a = connBlock(userState)) == null ? void 0 : _a.auth_method;
  if (value === null) return null;
  return typeof value === "string" && AUTH_METHODS.has(value) ? value : void 0;
}
function authValue(userState) {
  var _a;
  return optionalString((_a = connBlock(userState)) == null ? void 0 : _a.auth_value);
}
function authVerifiedAt(userState) {
  var _a;
  return timestamp((_a = connBlock(userState)) == null ? void 0 : _a.auth_verified_at);
}
function sponsored(userState) {
  var _a;
  const value = (_a = sponsorshipBlock(userState)) == null ? void 0 : _a.sponsored;
  if (value === null) return null;
  return typeof value === "boolean" ? value : void 0;
}
function sponsorProvider(userState) {
  var _a;
  const value = (_a = sponsorshipBlock(userState)) == null ? void 0 : _a.sponsor_provider;
  if (value === null) return null;
  return value === "alchemy" || value === "coinbase" || value === "pimlico" || value === "self" ? value : void 0;
}
function sponsorAccount(userState) {
  var _a;
  return optionalAddress((_a = sponsorshipBlock(userState)) == null ? void 0 : _a.sponsor_account);
}
function withExt(userState, key, value) {
  var _a, _b;
  const normalizedUserState = (_a = normalizeUserState(userState)) != null ? _a : {};
  const currentExt = (_b = asObject2(normalizedUserState.ext)) != null ? _b : {};
  return __spreadProps(__spreadValues({}, normalizedUserState), {
    ext: __spreadProps(__spreadValues({}, currentExt), {
      [key]: value
    })
  });
}

// src/user-state/index.ts
var CLIENT_TYPE_TS_CLI = "ts_cli";
var CLIENT_TYPE_WEB_UI = "web_ui";
var UserState;
((UserState2) => {
  UserState2.normalize = normalizeUserState;
  UserState2.reconcile = reconcileUserState;
  UserState2.address = address2;
  UserState2.evmAddress = evmAddress;
  UserState2.svmAddress = svmAddress2;
  UserState2.chainId = chainId2;
  UserState2.ensName = ensName;
  UserState2.aaMode = aaMode;
  UserState2.SmartAccount4337 = SmartAccount4337;
  UserState2.Delegation7702 = Delegation7702;
  UserState2.walletKind = walletKind;
  UserState2.isConnected = isConnected2;
  UserState2.walletProvider = walletProvider;
  UserState2.walletProviderSubject = walletProviderSubject;
  UserState2.authMethod = authMethod;
  UserState2.authValue = authValue;
  UserState2.authVerifiedAt = authVerifiedAt;
  UserState2.sponsored = sponsored;
  UserState2.sponsorProvider = sponsorProvider;
  UserState2.sponsorAccount = sponsorAccount;
  UserState2.withExt = withExt;
})(UserState || (UserState = {}));

// src/sse.ts
var MAX_SEEN_EVENT_IDS = 256;
function extractSseMessage(rawEvent) {
  const lines = rawEvent.split("\n");
  const dataLines = rawEvent.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart());
  if (!dataLines.length) return null;
  const idLine = lines.find((line) => line.startsWith("id:"));
  return {
    data: dataLines.join("\n"),
    id: idLine ? idLine.slice(3).trimStart() : null
  };
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
        const message = extractSseMessage(rawEvent);
        if (message) {
          onMessage(message);
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
      lastEventId: null,
      seenEventIds: /* @__PURE__ */ new Set(),
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
        const headers = new Headers(getHeaders(sessionId));
        if (subscription.lastEventId) {
          headers.set("Last-Event-ID", subscription.lastEventId);
        }
        const response = await fetchImpl(`${backendUrl}/api/thread/updates`, {
          headers,
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
        await readSseStream(
          response.body,
          controller.signal,
          ({ data, id }) => {
            var _a2, _b;
            if (id && subscription.seenEventIds.has(id)) {
              return;
            }
            if (id) {
              subscription.lastEventId = id;
              subscription.seenEventIds.add(id);
              if (subscription.seenEventIds.size > MAX_SEEN_EVENT_IDS) {
                const oldestId = subscription.seenEventIds.values().next().value;
                if (oldestId) subscription.seenEventIds.delete(oldestId);
              }
            }
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
          }
        );
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
  const reconnect = (reason) => {
    var _a;
    for (const subscription of subscriptions.values()) {
      if (!subscription.stopped) {
        (_a = subscription.abortController) == null ? void 0 : _a.abort(reason);
      }
    }
  };
  return { subscribe, reconnect };
}

// src/app-descriptor.ts
function normalizeAppDescriptor(item) {
  var _a, _b;
  if (typeof item === "string") {
    const name2 = item.trim();
    return name2 ? { name: name2 } : null;
  }
  if (!item || typeof item !== "object") return null;
  const raw = item;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) return null;
  const descriptor = __spreadProps(__spreadValues({}, raw), {
    name
  });
  const applicationId = (_b = (_a = raw.applicationId) != null ? _a : raw.application_id) != null ? _b : raw.id;
  if (typeof applicationId === "number" || typeof applicationId === "string") {
    descriptor.applicationId = applicationId;
  }
  if (typeof raw.platform === "string") descriptor.platform = raw.platform;
  if (typeof raw.label === "string") descriptor.label = raw.label;
  if (typeof raw.appReleaseTag === "string") {
    descriptor.appReleaseTag = raw.appReleaseTag;
  } else if (typeof raw.app_release_tag === "string") {
    descriptor.appReleaseTag = raw.app_release_tag;
  }
  if (typeof raw.isActive === "boolean") {
    descriptor.isActive = raw.isActive;
  } else if (typeof raw.is_active === "boolean") {
    descriptor.isActive = raw.is_active;
  }
  if (typeof raw.isPublic === "boolean") {
    descriptor.isPublic = raw.isPublic;
  } else if (typeof raw.is_public === "boolean") {
    descriptor.isPublic = raw.is_public;
  }
  if (typeof raw.artifactReady === "boolean") {
    descriptor.artifactReady = raw.artifactReady;
  } else if (typeof raw.artifact_ready === "boolean") {
    descriptor.artifactReady = raw.artifact_ready;
  }
  descriptor.secrets = Array.isArray(raw.secrets) ? raw.secrets : [];
  for (const key of [
    "id",
    "application_id",
    "app_release_tag",
    "is_active",
    "is_public",
    "artifact_ready"
  ]) {
    delete descriptor[key];
  }
  return descriptor;
}
function appIdentityKey(descriptor) {
  var _a, _b;
  const applicationId = (_a = descriptor.applicationId) == null ? void 0 : _a.toString().trim();
  if (applicationId) return `application:${applicationId}`;
  const platform = (_b = descriptor.platform) == null ? void 0 : _b.trim();
  if (platform) return `platform:${platform}:${descriptor.name}`;
  return `name:${descriptor.name}`;
}

// src/client.ts
var SESSION_ID_HEADER = "X-Session-Id";
var THREAD_ID_HEADER = "X-Thread-Id";
var APP_KEY_HEADER = "Aomi-App-Key";
function previewText(value, max = 80) {
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= max) return singleLine;
  return `${singleLine.slice(0, max - 1)}\u2026`;
}
var BULKY_PENDING_FIELDS = /* @__PURE__ */ new Set([
  "messageBase64",
  "message_base64",
  "messageSha256",
  "message_sha256",
  "unsignedTx",
  "unsigned_tx",
  "typed_data",
  "typedData",
  "tx_data",
  "txData",
  "transaction",
  "transactionBase64",
  "transaction_base64"
]);
function pruneBucket(bucket) {
  if (!bucket) return void 0;
  const out = {};
  for (const [id, entry] of Object.entries(bucket)) {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const rec = entry;
      const pruned = {};
      for (const [k, v] of Object.entries(rec)) {
        if (!BULKY_PENDING_FIELDS.has(k)) pruned[k] = v;
      }
      out[id] = pruned;
    } else {
      out[id] = entry;
    }
  }
  return out;
}
function stripBulkyPendingFields(userState) {
  if (!(userState == null ? void 0 : userState.pending)) return userState;
  const pending = userState.pending;
  const legacyPending = pending;
  return __spreadProps(__spreadValues({}, userState), {
    pending: __spreadProps(__spreadValues({}, pending), {
      evm_txs: pruneBucket(pending.evm_txs),
      evm_sigs: pruneBucket(pending.evm_sigs),
      svm_ixs: pruneBucket(pending.svm_ixs),
      solana_txs: pruneBucket(
        legacyPending.solana_txs
      ),
      solana_sigs: pruneBucket(
        legacyPending.solana_sigs
      ),
      svm_sigs: pruneBucket(
        legacyPending.svm_sigs
      )
    })
  });
}
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
    if (typeof value === "string") {
      params.set(key, value);
    } else {
      for (const item of value) {
        params.append(key, item);
      }
    }
  }
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}
function normalizeQuery(query) {
  if (!query) return void 0;
  const normalized = {};
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      normalized[key] = value.map((item) => String(item));
      continue;
    }
    normalized[key] = value === null || value === void 0 ? void 0 : String(value);
  }
  return normalized;
}
function normalizePlatformFilter(platforms) {
  const rawValues = Array.isArray(platforms) ? platforms : platforms === null || platforms === void 0 ? [] : [platforms];
  return Array.from(
    new Set(
      rawValues.flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean)
    )
  );
}
function encodeJsonBody(body) {
  return body === void 0 ? void 0 : JSON.stringify(body);
}
function normalizeThreadWire(wire) {
  var _b;
  const _a = wire, { thread_id, session_id, last_active_at } = _a, rest = __objRest(_a, ["thread_id", "session_id", "last_active_at"]);
  const normalizedLastActiveAt = typeof last_active_at === "number" ? last_active_at : typeof last_active_at === "string" ? Number(last_active_at) : void 0;
  return __spreadProps(__spreadValues({}, rest), {
    session_id: (_b = session_id != null ? session_id : thread_id) != null ? _b : "",
    last_active_at: normalizedLastActiveAt === void 0 || Number.isNaN(normalizedLastActiveAt) ? void 0 : normalizedLastActiveAt
  });
}
function withSessionHeader(sessionId, init) {
  const headers = new Headers(init);
  headers.set(SESSION_ID_HEADER, sessionId);
  headers.set(THREAD_ID_HEADER, sessionId);
  return headers;
}
async function fetchStateResponse(fetchImpl, url, sessionId) {
  return fetchImpl(url, {
    headers: withSessionHeader(sessionId)
  });
}
function wrapFetchWithAccountBearer(fetchImpl, getAccountBearer) {
  if (!getAccountBearer) return fetchImpl;
  return async (input, init) => {
    var _a;
    const baseHeaders = new Headers(
      (_a = init == null ? void 0 : init.headers) != null ? _a : input instanceof Request ? input.headers : void 0
    );
    const fetchWithBearer = async (forceRefresh) => {
      const headers = new Headers(baseHeaders);
      let bearer;
      try {
        bearer = await getAccountBearer({ forceRefresh });
      } catch (e) {
        bearer = void 0;
      }
      if (bearer) {
        headers.set("Authorization", `Bearer ${bearer}`);
      }
      return fetchImpl(input, __spreadProps(__spreadValues({}, init), { headers }));
    };
    const response = await fetchWithBearer(false);
    if (response.status !== 401) return response;
    return fetchWithBearer(true);
  };
}
function supportsTokenRefreshSubscription(provider) {
  return typeof (provider == null ? void 0 : provider.subscribe) === "function";
}
async function postState(baseUrl, path, payload, sessionId, fetchImpl, apiKey, logger) {
  const query = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === void 0 || value === null) continue;
    query[key] = typeof value === "string" ? value : String(value);
  }
  const url = buildApiUrl(baseUrl, path, query);
  const headers = new Headers(withSessionHeader(sessionId));
  if (apiKey) {
    headers.set(APP_KEY_HEADER, apiKey);
  }
  logger == null ? void 0 : logger.debug("[aomi][client] POST start", {
    path,
    sessionId,
    hasApiKey: Boolean(apiKey),
    queryKeys: Object.keys(query)
  });
  let pendingWarning;
  if (typeof setTimeout === "function") {
    pendingWarning = setTimeout(() => {
      logger == null ? void 0 : logger.debug("[aomi][client] POST still pending", {
        path,
        sessionId,
        queryKeys: Object.keys(query)
      });
    }, 5e3);
  }
  let response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers
    });
  } finally {
    if (pendingWarning) {
      clearTimeout(pendingWarning);
    }
  }
  logger == null ? void 0 : logger.debug("[aomi][client] POST response", {
    path,
    sessionId,
    status: response.status,
    ok: response.ok
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
    const fetchImpl = (_a = options.fetch) != null ? _a : globalThis.fetch.bind(globalThis);
    const rawFetchImpl = typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : fetchImpl;
    this.fetchImpl = wrapFetchWithAccountBearer(
      fetchImpl,
      options.getAccountBearer
    );
    this.rawFetchImpl = wrapFetchWithAccountBearer(
      rawFetchImpl,
      options.getAccountBearer
    );
    this.logger = options.logger;
    this.sseSubscriber = createSseSubscriber({
      backendUrl: this.baseUrl,
      getHeaders: (sessionId) => withSessionHeader(sessionId, { Accept: "text/event-stream" }),
      // Keep SSE on the browser-native fetch path. Payment/auth wrappers used
      // by some web runtimes can delay or buffer streaming responses.
      fetchImpl: this.rawFetchImpl,
      logger: this.logger
    });
    if (supportsTokenRefreshSubscription(options.getAccountBearer)) {
      options.getAccountBearer.subscribe(() => {
        this.sseSubscriber.reconnect("account-token-refreshed");
      });
    }
  }
  // ===========================================================================
  // Chat & State
  // ===========================================================================
  /**
   * Low-level request escape hatch for the full backend route manifest.
   * Prefer the typed helpers below for common chat/session/account flows.
   */
  async request(method, path, options) {
    var _a, _b;
    const url = buildApiUrl(this.baseUrl, path, normalizeQuery(options == null ? void 0 : options.query));
    const headers = new Headers(options == null ? void 0 : options.headers);
    if (options == null ? void 0 : options.sessionId) {
      headers.set(SESSION_ID_HEADER, options.sessionId);
      headers.set(THREAD_ID_HEADER, options.sessionId);
    }
    const apiKey = (_a = options == null ? void 0 : options.apiKey) != null ? _a : this.apiKey;
    if (apiKey) {
      headers.set(APP_KEY_HEADER, apiKey);
    }
    if ((options == null ? void 0 : options.body) !== void 0 && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await ((options == null ? void 0 : options.raw) ? this.rawFetchImpl : this.fetchImpl)(
      url,
      {
        method,
        headers,
        body: encodeJsonBody(options == null ? void 0 : options.body)
      }
    );
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `HTTP ${response.status}: ${response.statusText}${body ? `
${body}` : ""}`
      );
    }
    if (response.status === 204) {
      return void 0;
    }
    const contentType = (_b = response.headers.get("content-type")) != null ? _b : "";
    if (contentType.includes("application/json")) {
      return await response.json();
    }
    return await response.text();
  }
  /**
   * Fetch current session state (messages, processing status, title).
   */
  async fetchState(sessionId, userState, clientId, options) {
    var _a, _b, _c, _d;
    const normalizedUserState = stripBulkyPendingFields(
      UserState.normalize(userState)
    );
    const applicationId = (_a = options == null ? void 0 : options.applicationId) == null ? void 0 : _a.toString().trim();
    const stateContext = {
      app: options == null ? void 0 : options.app,
      application_id: applicationId || void 0
    };
    const urlWithSyncParams = buildApiUrl(this.baseUrl, "/api/thread/state", __spreadProps(__spreadValues({}, stateContext), {
      user_state: normalizedUserState ? JSON.stringify(normalizedUserState) : void 0,
      client_id: clientId
    }));
    const bareUrl = buildApiUrl(
      this.baseUrl,
      "/api/thread/state",
      stateContext
    );
    const shouldRetryWithoutSyncParams = Boolean(normalizedUserState) || Boolean(clientId);
    (_b = this.logger) == null ? void 0 : _b.debug("[aomi][client] GET /api/thread/state start", {
      sessionId,
      app: options == null ? void 0 : options.app,
      applicationId,
      clientId,
      hasUserState: Boolean(normalizedUserState)
    });
    let response = await fetchStateResponse(
      this.rawFetchImpl,
      urlWithSyncParams,
      sessionId
    );
    if (!response.ok && shouldRetryWithoutSyncParams && (response.status === 400 || response.status === 414)) {
      (_c = this.logger) == null ? void 0 : _c.debug(
        "[aomi][client] GET /api/thread/state retrying without sync params",
        {
          sessionId,
          initialStatus: response.status,
          hadClientId: Boolean(clientId),
          hadUserState: Boolean(normalizedUserState)
        }
      );
      response = await fetchStateResponse(
        this.rawFetchImpl,
        bareUrl,
        sessionId
      );
    }
    (_d = this.logger) == null ? void 0 : _d.debug("[aomi][client] GET /api/thread/state response", {
      sessionId,
      status: response.status,
      ok: response.ok
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
    var _a, _b, _c, _d, _e, _f, _g;
    const app = (_a = options == null ? void 0 : options.app) != null ? _a : "default";
    const apiKey = (_b = options == null ? void 0 : options.apiKey) != null ? _b : this.apiKey;
    const normalizedUserState = stripBulkyPendingFields(
      UserState.normalize(options == null ? void 0 : options.userState)
    );
    const applicationId = (_c = options == null ? void 0 : options.applicationId) == null ? void 0 : _c.toString().trim();
    const url = buildApiUrl(this.baseUrl, "/api/thread/chat", {
      app,
      application_id: applicationId || void 0,
      message,
      user_state: normalizedUserState ? JSON.stringify(normalizedUserState) : void 0,
      client_id: options == null ? void 0 : options.clientId,
      payment_method: (_d = options == null ? void 0 : options.paymentMethod) != null ? _d : void 0
    });
    (_e = this.logger) == null ? void 0 : _e.debug("[aomi][client] POST /api/thread/chat prepared", {
      sessionId,
      app,
      applicationId,
      clientId: options == null ? void 0 : options.clientId,
      paymentMethod: options == null ? void 0 : options.paymentMethod,
      hasUserState: Boolean(normalizedUserState),
      messagePreview: previewText(message)
    });
    const headers = new Headers(withSessionHeader(sessionId));
    if (apiKey) {
      headers.set(APP_KEY_HEADER, apiKey);
    }
    (_f = this.logger) == null ? void 0 : _f.debug("[aomi][client] POST start", {
      path: "/api/thread/chat",
      sessionId,
      hasApiKey: Boolean(apiKey),
      url
    });
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers
    });
    (_g = this.logger) == null ? void 0 : _g.debug("[aomi][client] POST response", {
      path: "/api/thread/chat",
      sessionId,
      status: response.status,
      ok: response.ok
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }
  /**
   * Send a system-level message (e.g. wallet state changes, context switches).
   * Pass `app` to preserve the session's active app context (prevents the
   * backend from resetting to the default app when no app is specified).
   */
  async sendSystemMessage(sessionId, message, options) {
    var _a;
    const payload = { message };
    if (options == null ? void 0 : options.app) {
      payload.app = options.app;
    }
    if (options == null ? void 0 : options.applicationId) {
      payload.application_id = options.applicationId;
    }
    (_a = this.logger) == null ? void 0 : _a.debug("[aomi][client] POST /api/system prepared", {
      sessionId,
      app: options == null ? void 0 : options.app,
      applicationId: options == null ? void 0 : options.applicationId,
      messagePreview: previewText(message)
    });
    return postState(
      this.baseUrl,
      "/api/system",
      payload,
      sessionId,
      this.fetchImpl,
      void 0,
      this.logger
    );
  }
  /**
   * Interrupt the AI's current response.
   */
  async interrupt(sessionId) {
    var _a;
    (_a = this.logger) == null ? void 0 : _a.debug("[aomi][client] POST /api/thread/interrupt prepared", {
      sessionId
    });
    return postState(
      this.baseUrl,
      "/api/thread/interrupt",
      {},
      sessionId,
      this.fetchImpl,
      void 0,
      this.logger
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
  async listSecrets(sessionId, clientId) {
    const url = clientId && clientId.trim().length > 0 ? buildApiUrl(this.baseUrl, "/api/secrets", { client_id: clientId }) : joinApiPath(this.baseUrl, "/api/secrets");
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
   * @deprecated Account bootstrap is handled by session create/chat requests and
   * the account-token exchange. `/api/account` is now an authenticated
   * profile endpoint, so this legacy helper intentionally does nothing.
   */
  async ensureAccount(_sessionId, _publicKey) {
    return void 0;
  }
  /**
   * List all threads for the authenticated account.
   */
  async listThreads(sessionId) {
    const url = buildApiUrl(this.baseUrl, "/api/threads");
    const response = await this.fetchImpl(url, {
      headers: withSessionHeader(sessionId)
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch threads: HTTP ${response.status}`);
    }
    const threads = await response.json();
    return threads.map(normalizeThreadWire);
  }
  /**
   * Get a single thread by ID.
   */
  async getThread(sessionId) {
    const url = buildApiUrl(
      this.baseUrl,
      `/api/threads/${encodeURIComponent(sessionId)}`
    );
    const response = await this.fetchImpl(url, {
      headers: withSessionHeader(sessionId)
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return normalizeThreadWire(await response.json());
  }
  /**
   * Create a new thread. The client generates the session ID.
   */
  async createThread(threadId) {
    const url = buildApiUrl(this.baseUrl, "/api/threads");
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: withSessionHeader(threadId)
    });
    if (!response.ok) {
      throw new Error(`Failed to create thread: HTTP ${response.status}`);
    }
    return normalizeThreadWire(await response.json());
  }
  /**
   * Delete a thread by ID.
   */
  async deleteThread(sessionId) {
    const url = buildApiUrl(
      this.baseUrl,
      `/api/threads/${encodeURIComponent(sessionId)}`
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
      `/api/threads/${encodeURIComponent(sessionId)}`
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
    const url = buildApiUrl(
      this.baseUrl,
      `/api/threads/${encodeURIComponent(sessionId)}/archive`
    );
    const response = await this.fetchImpl(url, {
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
      `/api/threads/${encodeURIComponent(sessionId)}/unarchive`
    );
    const response = await this.fetchImpl(url, {
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
    const url = buildApiUrl(this.baseUrl, "/api/thread/events", {
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
    const platforms = normalizePlatformFilter(options == null ? void 0 : options.platforms);
    const url = buildApiUrl(this.baseUrl, "/api/thread/apps", {
      platform: platforms.length > 0 ? platforms : void 0
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
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map((item) => normalizeAppDescriptor(item)).filter((item) => item !== null);
  }
  /**
   * Fetch the account bound to the authenticated request (resolved from the
   * account bearer). Returns `null` when the session is not bound to a real
   * user — the backend answers `/api/account` with HTTP 400 for
   * anonymous sessions, which is the normal "no bearer / not logged in" case
   * rather than an error.
   */
  async fetchAccountProfile(sessionId) {
    const url = buildApiUrl(this.baseUrl, "/api/account");
    const response = await this.rawFetchImpl(url, {
      headers: withSessionHeader(sessionId)
    });
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      return null;
    }
    if (!response.ok) {
      throw new Error(
        `Failed to fetch account profile: HTTP ${response.status}`
      );
    }
    return await response.json();
  }
  /**
   * Fetch the full account for the authenticated request. Throws on any
   * non-OK response; use `fetchAccountProfile` for the null-on-anonymous
   * variant.
   */
  async getAccount(sessionId) {
    const url = buildApiUrl(this.baseUrl, "/api/account");
    const response = await this.fetchImpl(url, {
      headers: withSessionHeader(sessionId)
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch account: HTTP ${response.status}`);
    }
    return await response.json();
  }
  async createAccountApproval(request) {
    return this.request("POST", "/api/account/approvals", {
      body: request,
      raw: true
    });
  }
  /**
   * Mint a Privy browser auth URL bound to the current backend session.
   */
  async beginPrivyAuth(sessionId, options) {
    const url = buildApiUrl(this.baseUrl, "/api/auth/privy/begin");
    const response = await this.rawFetchImpl(url, {
      method: "POST",
      headers: withSessionHeader(sessionId, {
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        application: options == null ? void 0 : options.application,
        wallet_family: (options == null ? void 0 : options.walletFamily) === "evm" ? void 0 : options == null ? void 0 : options.walletFamily
      })
    });
    if (!response.ok) {
      throw new Error(`Failed to begin Privy auth: HTTP ${response.status}`);
    }
    return await response.json();
  }
  /**
   * Get available models.
   */
  async getModels(sessionId, options) {
    var _a;
    const url = buildApiUrl(this.baseUrl, "/api/thread/models");
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
    var _a, _b;
    const apiKey = (_a = options == null ? void 0 : options.apiKey) != null ? _a : this.apiKey;
    const applicationId = (_b = options == null ? void 0 : options.applicationId) == null ? void 0 : _b.toString().trim();
    const url = buildApiUrl(this.baseUrl, "/api/thread/model", {
      rig,
      app: options == null ? void 0 : options.app,
      application_id: applicationId || void 0,
      client_id: options == null ? void 0 : options.clientId
    });
    const headers = new Headers(withSessionHeader(sessionId));
    if (apiKey) {
      headers.set(APP_KEY_HEADER, apiKey);
    }
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers
    });
    if (!response.ok) {
      throw new Error(`Failed to set model: HTTP ${response.status}`);
    }
    return await response.json();
  }
  /**
   * List BYOK keys (one per LLM provider) bound to the current account.
   */
  async listByokKeys(sessionId) {
    var _a;
    const url = buildApiUrl(this.baseUrl, "/api/account/payment");
    const response = await this.fetchImpl(url, {
      headers: withSessionHeader(sessionId)
    });
    if (!response.ok) {
      throw new Error(`Failed to get BYOK keys: HTTP ${response.status}`);
    }
    const data = await response.json();
    return (_a = data.byok) != null ? _a : [];
  }
  /**
   * Save or replace a BYOK key for the current account.
   */
  async saveByokKey(sessionId, provider, byokKey, label) {
    const url = joinApiPath(this.baseUrl, "/api/account/payment/byok");
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
   * Delete a BYOK key for the current account.
   */
  async deleteByokKey(sessionId, provider) {
    const url = buildApiUrl(
      this.baseUrl,
      `/api/account/payment/byok/${encodeURIComponent(provider)}`
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
    const url = joinApiPath(this.baseUrl, "/api/exec/simulate");
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
      throw new Error(
        `HTTP ${response.status}: ${response.statusText}${body ? `
${body}` : ""}`
      );
    }
    return await response.json();
  }
};

// src/authorization.ts
function posterFromClient(client) {
  return (path, body) => client.request("POST", path, { body, raw: true });
}
function authorizationChallenge(post, request) {
  return post("/api/account/authorization/challenge", request);
}
function authorizationCommit(post, request) {
  return post("/api/account/authorization/commit", request);
}
async function ensureSvmWalletBoundVia(post, wallet, signMessage) {
  let challenge;
  try {
    challenge = await authorizationChallenge(post, {
      chain_type: "svm",
      wallet,
      mode: "bind"
    });
  } catch (error) {
    if (isAlreadyBound(error)) return { status: "already_bound" };
    throw error;
  }
  if (!challenge.message_base64) {
    throw new Error("bind challenge returned no svm message payload");
  }
  const signature = await signMessage(base64ToBytes(challenge.message_base64));
  try {
    return {
      status: "bound",
      state: await authorizationCommit(post, {
        permit: challenge.permit,
        signature: bytesToBase64(signature)
      })
    };
  } catch (error) {
    if (isAlreadyBound(error)) return { status: "already_bound" };
    throw error;
  }
}
function ensureSvmWalletBound(client, wallet, signMessage) {
  return ensureSvmWalletBoundVia(posterFromClient(client), wallet, signMessage);
}
function isUnboundWalletError(error) {
  const text = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return text.includes("signing_unbound_wallet");
}
function isAlreadyBound(error) {
  return error instanceof Error && error.message.includes("already_bound");
}
function base64ToBytes(value) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
function bytesToBase64(bytes) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  return btoa(String.fromCharCode(...bytes));
}

// src/account-session.ts
var AccountCredentialUnavailableError = class extends Error {
  constructor(message = "Account credential is not available yet") {
    super(message);
    this.name = "AccountCredentialUnavailableError";
  }
};
var DEFAULT_REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1e3;
var FAILURE_COOLDOWN_MS = 30 * 1e3;
var CREDENTIAL_UNAVAILABLE_RETRY_DELAYS_MS = [250, 1e3, 3e3];
var EXPIRES_AT_MILLISECONDS_THRESHOLD = 1e11;
var DEFAULT_BETTER_AUTH_TOKEN_PATH = "/api/aomi/account-bearer";
var DEFAULT_BETTER_AUTH_PROVIDER_EXCHANGE_PATH = "/api/auth/aomi/provider/exchange";
function createAccountBearerProvider({
  baseUrl,
  getProviderCredential,
  betterAuthToken,
  fetch: fetchImpl = fetch,
  now = Date.now,
  refreshBeforeExpiryMs = DEFAULT_REFRESH_BEFORE_EXPIRY_MS
}) {
  let cached = null;
  let pending = null;
  let refreshTimer = null;
  let failedAt = null;
  let credentialUnavailableRetryAfter = 0;
  let credentialUnavailableRetryCount = 0;
  const listeners = /* @__PURE__ */ new Set();
  const scheduleRefresh = (session) => {
    if (refreshTimer) clearTimeout(refreshTimer);
    const refreshAt = session.expires_at * 1e3 - refreshBeforeExpiryMs;
    refreshTimer = setTimeout(
      () => {
        void getAccountBearer({ forceRefresh: true }).catch(
          () => void 0
        );
      },
      Math.max(refreshAt - now(), 1e3)
    );
  };
  const fetchBetterAuthToken = async () => {
    var _a;
    const response = await fetchImpl(
      joinUrl(
        (_a = betterAuthToken == null ? void 0 : betterAuthToken.baseUrl) != null ? _a : baseUrl,
        DEFAULT_BETTER_AUTH_TOKEN_PATH
      ),
      {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" }
      }
    );
    if (!response.ok) return null;
    const body = await response.json();
    return normalizeBetterAuthTokenResponse(body);
  };
  const exchangeBetterAuthProviderCredential = async () => {
    var _a;
    if ((betterAuthToken == null ? void 0 : betterAuthToken.providerExchange) === false || !getProviderCredential) {
      return null;
    }
    const credential = await getProviderCredential();
    const response = await fetchImpl(
      joinUrl(
        (_a = betterAuthToken == null ? void 0 : betterAuthToken.baseUrl) != null ? _a : baseUrl,
        DEFAULT_BETTER_AUTH_PROVIDER_EXCHANGE_PATH
      ),
      {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(credential)
      }
    );
    if (!response.ok) return null;
    return fetchBetterAuthToken();
  };
  const exchange = async () => {
    const betterAuthJwt = await fetchBetterAuthToken();
    if (betterAuthJwt) return betterAuthJwt;
    const exchangedBetterAuthJwt = await exchangeBetterAuthProviderCredential();
    if (exchangedBetterAuthJwt) return exchangedBetterAuthJwt;
    throw new Error("Failed to exchange Better Auth provider credential");
  };
  const getAccountBearer = async ({
    forceRefresh = false
  } = {}) => {
    var _a;
    const refreshAt = cached ? cached.expires_at * 1e3 - refreshBeforeExpiryMs : 0;
    if (!forceRefresh && cached && now() < refreshAt) {
      return cached.access_token;
    }
    if (failedAt !== null && now() - failedAt < FAILURE_COOLDOWN_MS && !forceRefresh) {
      return void 0;
    }
    if (!forceRefresh && now() < credentialUnavailableRetryAfter) {
      return void 0;
    }
    if (!pending) {
      pending = exchange().then((next) => {
        failedAt = null;
        credentialUnavailableRetryAfter = 0;
        credentialUnavailableRetryCount = 0;
        const previous = cached;
        cached = next;
        scheduleRefresh(next);
        if (previous && (previous.access_token !== next.access_token || previous.expires_at !== next.expires_at)) {
          for (const listener of listeners) listener();
        }
        return next;
      }).catch((error) => {
        if (error instanceof AccountCredentialUnavailableError) {
          const retryDelay = CREDENTIAL_UNAVAILABLE_RETRY_DELAYS_MS[credentialUnavailableRetryCount];
          if (retryDelay === void 0) {
            failedAt = now();
            credentialUnavailableRetryAfter = 0;
          } else {
            credentialUnavailableRetryCount += 1;
            credentialUnavailableRetryAfter = now() + retryDelay;
          }
        } else {
          failedAt = now();
          credentialUnavailableRetryAfter = 0;
          credentialUnavailableRetryCount = 0;
        }
        return null;
      }).finally(() => {
        pending = null;
      });
    }
    return (_a = await pending) == null ? void 0 : _a.access_token;
  };
  getAccountBearer.subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  getAccountBearer.dispose = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = null;
    listeners.clear();
  };
  return getAccountBearer;
}
function joinUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
function normalizeBetterAuthTokenResponse(response) {
  var _a, _b;
  const token = typeof response.bearer === "string" && response.bearer ? response.bearer : "";
  if (!token) {
    throw new Error("Better Auth token response is missing token");
  }
  let payload = null;
  const getPayload = () => {
    payload != null ? payload : payload = decodeJwtPayload(token);
    return payload;
  };
  const expiresAt = Number(
    (_b = (_a = response.expires_at) != null ? _a : response.expiresAt) != null ? _b : getPayload().exp
  );
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
    throw new Error("Better Auth token is missing a valid exp claim");
  }
  if (expiresAt > EXPIRES_AT_MILLISECONDS_THRESHOLD) {
    throw new Error("Better Auth token expires_at must be seconds, not ms");
  }
  const getPayloadUserId = () => {
    const claims = getPayload();
    if (typeof claims.aomi_user_id === "string" && claims.aomi_user_id) {
      return claims.aomi_user_id;
    }
    return typeof claims.sub === "string" ? claims.sub : "";
  };
  const userId = typeof response.user_id === "string" && response.user_id ? response.user_id : typeof response.userId === "string" && response.userId ? response.userId : getPayloadUserId();
  if (!userId) {
    throw new Error("Better Auth token is missing a user id claim");
  }
  return {
    access_token: token,
    token_type: "Bearer",
    expires_at: expiresAt,
    user_id: userId
  };
}
function decodeJwtPayload(token) {
  const [, payload] = token.split(".");
  if (!payload) throw new Error("Better Auth token is not a JWT");
  return JSON.parse(decodeBase64Url(payload));
}
function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  if (typeof globalThis.atob === "function") {
    return globalThis.atob(normalized);
  }
  const BufferCtor = globalThis.Buffer;
  if (BufferCtor) {
    return BufferCtor.from(normalized, "base64").toString("utf8");
  }
  throw new Error("No base64 decoder is available");
}

// src/siws.ts
function buildSiwsMessage(input) {
  var _a;
  const statement = input.intent === "link" ? "Only sign this message if you want this Solana wallet attached to the current Aomi account." : "Sign in to Aomi.";
  return `${input.domain} wants you to sign in with your Solana account:
${input.address}

${statement}

URI: ${input.uri}
Version: 1
Chain ID: ${input.chainId}
Nonce: ${input.nonce}
Issued At: ${((_a = input.issuedAt) != null ? _a : /* @__PURE__ */ new Date()).toISOString()}`;
}

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

// src/session/json.ts
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

// src/wallet-utils.ts
import { getAddress } from "viem";
function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  return value;
}
function pendingTxsFromUserState(userState) {
  var _a, _b;
  const normalized = UserState.normalize(userState);
  const pending = asRecord(normalized == null ? void 0 : normalized.pending);
  return (_b = asRecord(pending == null ? void 0 : pending.evm_txs)) != null ? _b : asRecord((_a = asRecord(userState)) == null ? void 0 : _a.pending_txs);
}
function getToolArgs(payload) {
  var _a;
  const root = asRecord(payload);
  const nestedArgs = asRecord(root == null ? void 0 : root.args);
  return (_a = nestedArgs != null ? nestedArgs : root) != null ? _a : {};
}
function parseChainKind(value) {
  return value === "evm" || value === "svm" ? value : void 0;
}
function inferSolanaRequestKind(payload) {
  const rawKind = typeof payload.kind === "string" ? payload.kind : typeof payload.request_kind === "string" ? payload.request_kind : typeof payload.requestKind === "string" ? payload.requestKind : void 0;
  switch (rawKind) {
    case "solana_sign_message":
    case "message_sign":
      return "solana_sign_message";
    case "solana_send":
    case "send_transaction":
      return "solana_send";
    case "solana_sign_and_send":
    case "sign_and_send_transaction":
      return "solana_sign_and_send";
    default:
      return "solana_sign";
  }
}
function parseChainId3(value) {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : void 0;
  }
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  const parsed = trimmed.startsWith("0x") ? parseCanonicalInteger(trimmed.slice(2), 16) : parseCanonicalInteger(trimmed, 10);
  return parsed !== void 0 && parsed > 0 ? parsed : void 0;
}
function parseCanonicalInteger(value, radix) {
  if (value === "") return void 0;
  const pattern = radix === 16 ? /^[0-9a-fA-F]+$/ : /^[0-9]+$/;
  if (!pattern.test(value)) return void 0;
  const parsed = Number.parseInt(value, radix);
  return Number.isSafeInteger(parsed) ? parsed : void 0;
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
function parseString(value) {
  return typeof value === "string" ? value : void 0;
}
function isHexBytes(value) {
  return /^0x(?:[0-9a-fA-F]{2})*$/.test(value);
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
  const chainId3 = (_d = (_c = (_b = parseChainId3(args.chainId)) != null ? _b : parseChainId3(args.chain_id)) != null ? _c : parseChainId3(ctx == null ? void 0 : ctx.user_chain_id)) != null ? _d : parseChainId3(ctx == null ? void 0 : ctx.userChainId);
  const requestId = typeof args.tx_id === "string" ? args.tx_id : typeof args.txId === "string" ? args.txId : void 0;
  const aaPreference = (_f = normalizeAaPreference((_e = args.aa_preference) != null ? _e : args.aaPreference)) != null ? _f : "auto";
  const aaStrict = parseBoolean((_g = args.aa_strict) != null ? _g : args.aaStrict);
  const txId = txIds.length === 1 ? txIds[0] : void 0;
  return {
    to,
    value,
    data,
    chainId: chainId3,
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
  const pendingTxsRaw = pendingTxsFromUserState(userState);
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
      chainId: (_b = (_a = parseChainId3(pendingEntry.chain_id)) != null ? _a : parseChainId3(pendingEntry.chainId)) != null ? _b : parseChainId3(payload.chainId),
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
  var _a, _b, _c, _d, _e, _f;
  const args = getToolArgs(payload);
  const unsignedTxRaw = (_a = args.unsigned_tx) != null ? _a : args.unsignedTx;
  const unsignedTx = typeof unsignedTxRaw === "string" ? unsignedTxRaw : void 0;
  const description = typeof args.description === "string" ? args.description : void 0;
  const clusterRaw = args.cluster;
  const cluster = typeof clusterRaw === "string" ? clusterRaw : void 0;
  const rawPendingIds = (_b = args.svm_tx_ids) != null ? _b : args.svm_ix_ids;
  const pendingSolanaIds = Array.isArray(rawPendingIds) ? rawPendingIds.map(parsePendingId).filter((id) => id !== void 0) : void 0;
  const pendingSolanaId = (_f = (_e = (_d = (_c = parsePendingId(args.pendingSolanaId)) != null ? _c : parsePendingId(args.pending_solana_id)) != null ? _d : parsePendingId(args.pendingSvmSigId)) != null ? _e : parsePendingId(args.pending_svm_sig_id)) != null ? _f : pendingSolanaIds == null ? void 0 : pendingSolanaIds[0];
  return {
    unsignedTx,
    description,
    cluster,
    pendingSolanaId,
    pendingSolanaIds
  };
}
function normalizeSolanaSignMessagePayload(payload) {
  var _a, _b, _c, _d, _e;
  const args = getToolArgs(payload);
  const messageRaw = (_b = (_a = args.message_base64) != null ? _a : args.messageBase64) != null ? _b : args.message;
  const message = typeof messageRaw === "string" ? messageRaw : void 0;
  const description = typeof args.description === "string" ? args.description : void 0;
  const clusterRaw = args.cluster;
  const cluster = typeof clusterRaw === "string" ? clusterRaw : void 0;
  const pendingSolanaId = (_e = (_d = (_c = parsePendingId(args.pendingSolanaId)) != null ? _c : parsePendingId(args.pending_solana_id)) != null ? _d : parsePendingId(args.pendingSvmSigId)) != null ? _e : parsePendingId(args.pending_svm_sig_id);
  return { message, description, cluster, pendingSolanaId };
}
function normalizeSolanaWalletRequest(payload) {
  var _a, _b, _c;
  const root = asRecord(payload);
  const args = getToolArgs(payload);
  const solanaRequest = __spreadValues(__spreadValues({}, root != null ? root : {}), args);
  const chainKind = (_c = (_b = (_a = parseChainKind(args.chain_kind)) != null ? _a : parseChainKind(args.chain_family)) != null ? _b : parseChainKind(root == null ? void 0 : root.chain_kind)) != null ? _c : parseChainKind(root == null ? void 0 : root.chain_family);
  if (chainKind !== "svm") {
    return null;
  }
  const kind = inferSolanaRequestKind(solanaRequest);
  if (kind === "solana_sign_message") {
    const normalized2 = normalizeSolanaSignMessagePayload(payload);
    return normalized2.message ? { kind, payload: normalized2 } : null;
  }
  const normalized = normalizeSolanaSignPayload(payload);
  return normalized.unsignedTx ? { kind, payload: normalized } : null;
}
function normalizeEip712Payload(payload) {
  var _a, _b, _c, _d, _e;
  const args = getToolArgs(payload);
  const typedDataRaw = (_b = (_a = args.typed_data) != null ? _a : args["712_typed_data"]) != null ? _b : args.typedData;
  const nonTypedData = parseString((_c = args.non_typed_data) != null ? _c : args.nonTypedData);
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
  const eip712Id = (_e = (_d = parsePendingId(args.eip712Id)) != null ? _d : parsePendingId(args.pending_eip712_id)) != null ? _e : parsePendingId(args.pendingEip712Id);
  return {
    typed_data: typedData,
    non_typed_data: nonTypedData,
    description,
    eip712Id
  };
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
function toViemSignMessageArgs(payload) {
  const nonTypedData = payload.non_typed_data;
  if (typeof nonTypedData !== "string" || nonTypedData.length === 0) {
    return null;
  }
  return {
    message: isHexBytes(nonTypedData) ? { raw: nonTypedData } : nonTypedData
  };
}

// src/session/events.ts
function aomiMessagesEqual(a, b) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x.sender !== y.sender || x.content !== y.content || x.timestamp !== y.timestamp || x.is_streaming !== y.is_streaming) {
      return false;
    }
    const xt = x.tool_result;
    const yt = y.tool_result;
    if (xt !== yt) {
      if (!xt || !yt) return false;
      if (xt[0] !== yt[0] || xt[1] !== yt[1]) return false;
    }
  }
  return true;
}
function applySessionState(state, deps) {
  var _a;
  if (state.user_state) {
    deps.resolveUserState(state.user_state);
  }
  if (state.messages) {
    if (!aomiMessagesEqual(state.messages, deps.getMessages())) {
      deps.setMessages(state.messages);
      deps.emit("messages", state.messages);
    }
  }
  if (state.title) {
    deps.setTitle(state.title);
  }
  if ((_a = state.system_events) == null ? void 0 : _a.length) {
    dispatchSystemEvents(state.system_events, deps);
  }
}
function handleSessionSSEEvent(event, deps) {
  if (event.type === "title_changed" && event.new_title) {
    deps.setTitle(event.new_title);
    deps.emit("title_changed", { title: event.new_title });
  } else if (event.type === "tool_update") {
    deps.emit("tool_update", event);
  } else if (event.type === "tool_complete") {
    deps.emit("tool_complete", event);
  }
}
function dispatchSystemEvents(events, deps) {
  var _a, _b, _c, _d, _e, _f, _g;
  for (const event of events) {
    const unwrapped = unwrapSystemEvent(event);
    if (!unwrapped) continue;
    if (unwrapped.type === "wallet_tx_request") {
      const solanaRequest = normalizeSolanaWalletRequest((_a = unwrapped.payload) != null ? _a : {});
      if (solanaRequest) {
        if (solanaRequest.kind === "solana_sign_message") {
          const req = deps.walletController.enqueue(
            "solana_sign_message",
            solanaRequest.payload
          );
          deps.emit("wallet_solana_sign_message_request", req);
        } else if (solanaRequest.kind === "solana_send") {
          const req = deps.walletController.enqueue(
            "solana_send",
            solanaRequest.payload
          );
          deps.emit("wallet_solana_send_request", req);
        } else if (solanaRequest.kind === "solana_sign_and_send") {
          const req = deps.walletController.enqueue(
            "solana_sign_and_send",
            solanaRequest.payload
          );
          deps.emit("wallet_solana_sign_and_send_request", req);
        } else {
          const req = deps.walletController.enqueue(
            "solana_sign",
            solanaRequest.payload
          );
          deps.emit("wallet_solana_sign_request", req);
        }
        continue;
      }
      const normalizedPayload = normalizeTxPayload(unwrapped.payload);
      const payload = normalizedPayload ? hydrateTxPayloadFromUserState(normalizedPayload, deps.userState()) : null;
      if (payload) {
        const req = deps.walletController.enqueue("transaction", payload);
        deps.emit("wallet_tx_request", req);
      }
    } else if (unwrapped.type === "wallet_eip712_request") {
      const payload = normalizeEip712Payload((_b = unwrapped.payload) != null ? _b : {});
      const req = deps.walletController.enqueue("eip712_sign", payload);
      deps.emit("wallet_eip712_request", req);
    } else if (unwrapped.type === "wallet::solana_sign_request") {
      const solanaRequest = normalizeSolanaWalletRequest((_c = unwrapped.payload) != null ? _c : {});
      if (solanaRequest) {
        if (solanaRequest.kind === "solana_sign_message") {
          const req2 = deps.walletController.enqueue(
            "solana_sign_message",
            solanaRequest.payload
          );
          deps.emit("wallet_solana_sign_message_request", req2);
        } else if (solanaRequest.kind === "solana_send") {
          const req2 = deps.walletController.enqueue(
            "solana_send",
            solanaRequest.payload
          );
          deps.emit("wallet_solana_send_request", req2);
        } else if (solanaRequest.kind === "solana_sign_and_send") {
          const req2 = deps.walletController.enqueue(
            "solana_sign_and_send",
            solanaRequest.payload
          );
          deps.emit("wallet_solana_sign_and_send_request", req2);
        } else {
          const req2 = deps.walletController.enqueue(
            "solana_sign",
            solanaRequest.payload
          );
          deps.emit("wallet_solana_sign_request", req2);
        }
        continue;
      }
      const payload = normalizeSolanaSignPayload((_d = unwrapped.payload) != null ? _d : {});
      const req = deps.walletController.enqueue("solana_sign", payload);
      deps.emit("wallet_solana_sign_request", req);
    } else if (unwrapped.type === "wallet::solana_sign_message_request") {
      const payload = normalizeSolanaSignMessagePayload((_e = unwrapped.payload) != null ? _e : {});
      const req = deps.walletController.enqueue("solana_sign_message", payload);
      deps.emit("wallet_solana_sign_message_request", req);
    } else if (unwrapped.type === "wallet::solana_send_request") {
      const payload = normalizeSolanaSignPayload((_f = unwrapped.payload) != null ? _f : {});
      const req = deps.walletController.enqueue("solana_send", payload);
      deps.emit("wallet_solana_send_request", req);
    } else if (unwrapped.type === "wallet::solana_sign_and_send_request") {
      const payload = normalizeSolanaSignPayload((_g = unwrapped.payload) != null ? _g : {});
      const req = deps.walletController.enqueue("solana_sign_and_send", payload);
      deps.emit("wallet_solana_sign_and_send_request", req);
    } else if (unwrapped.type === "system_notice" || unwrapped.type === "system_error" || unwrapped.type === "async_callback") {
      deps.emit(
        unwrapped.type,
        unwrapped.payload
      );
    } else {
      deps.emit(
        unwrapped.type,
        unwrapped.payload
      );
    }
  }
}

// src/session/state.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function addExtValue(userState, key, value) {
  const current = userState != null ? userState : {};
  const currentExt = isRecord(current["ext"]) ? current["ext"] : {};
  return __spreadProps(__spreadValues({}, current), {
    ext: __spreadProps(__spreadValues({}, currentExt), {
      [key]: value
    })
  });
}
function removeExtValue(userState, key) {
  if (!userState) return void 0;
  const currentExt = userState["ext"];
  if (!isRecord(currentExt)) return void 0;
  const nextExt = __spreadValues({}, currentExt);
  delete nextExt[key];
  return __spreadProps(__spreadValues({}, userState), { ext: nextExt });
}
function resolveWalletState(userState, address3, chainId3, aa) {
  var _a, _b, _c;
  const resolvedAAMode = (_a = aa == null ? void 0 : aa.aaMode) != null ? _a : (aa == null ? void 0 : aa.smartAccount) === address3 ? "4337" : "none";
  const aaBlock2 = { mode: resolvedAAMode };
  if ((aa == null ? void 0 : aa.smartAccount4337) !== void 0 || (aa == null ? void 0 : aa.delegation7702) !== void 0) {
    aaBlock2.smart_account = resolvedAAMode === "4337" ? (_b = aa == null ? void 0 : aa.smartAccount4337) != null ? _b : null : null;
    aaBlock2.delegation_7702 = resolvedAAMode === "7702" ? (_c = aa == null ? void 0 : aa.delegation7702) != null ? _c : null : null;
  }
  const prevEvm = isRecord(userState == null ? void 0 : userState.evm) ? userState == null ? void 0 : userState.evm : {};
  const prevConn = isRecord(userState == null ? void 0 : userState.connection) ? userState == null ? void 0 : userState.connection : {};
  return __spreadProps(__spreadValues({}, userState != null ? userState : {}), {
    evm: __spreadProps(__spreadValues({}, prevEvm), {
      address: address3,
      chain_id: chainId3 != null ? chainId3 : 1,
      aa: aaBlock2
    }),
    connection: __spreadProps(__spreadValues({}, prevConn), {
      is_connected: true
    })
  });
}
function warnIfUserStateMisaligned(expected, actual) {
  const expectedUserState = UserState.normalize(expected);
  const normalizedActualUserState = UserState.reconcile(expectedUserState, actual);
  if (!expectedUserState || !normalizedActualUserState) {
    return;
  }
  if (!isSubsetMatch(expectedUserState, normalizedActualUserState)) {
    const expectedJson = JSON.stringify(sortJson(expectedUserState));
    const actualJson = JSON.stringify(sortJson(normalizedActualUserState));
    console.warn(
      `[session] Backend user_state mismatch (non-fatal). expected subset=${expectedJson} actual=${actualJson}`
    );
  }
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

// src/session/wallet.ts
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
function solanaPendingIdFields(payload) {
  const fields = {};
  if (payload.pendingSolanaId !== void 0) {
    fields.pending_solana_id = payload.pendingSolanaId;
  }
  if ("pendingSolanaIds" in payload && Array.isArray(payload.pendingSolanaIds) && payload.pendingSolanaIds.length > 0) {
    fields.pending_svm_tx_ids = [...payload.pendingSolanaIds];
  }
  return fields;
}
var SessionWalletController = class {
  constructor(deps) {
    this.deps = deps;
    this.requests = [];
    this.nextId = 1;
    this.resolvedRequestIds = /* @__PURE__ */ new Set();
    this.resolvingRequestIds = /* @__PURE__ */ new Set();
  }
  get length() {
    return this.requests.length;
  }
  list() {
    return [...this.requests];
  }
  find(id) {
    return this.requests.find((request) => request.id === id);
  }
  enqueue(kind, payload) {
    var _a;
    const id = this.requestId(kind, payload);
    const existing = this.requests.find((request) => request.id === id);
    const timestamp2 = (_a = existing == null ? void 0 : existing.timestamp) != null ? _a : Date.now();
    const req = this.request(kind, payload, id, timestamp2);
    if (this.resolvedRequestIds.has(id) && !existing) {
      return req;
    }
    this.requests = existing ? this.requests.map((request) => request.id === id ? req : request) : [...this.requests, req];
    this.dedupeTransactionRequests(req);
    this.changed();
    return req;
  }
  remove(id) {
    const idx = this.requests.findIndex((request2) => request2.id === id);
    if (idx === -1) return null;
    const [request] = this.requests.splice(idx, 1);
    this.changed();
    return request;
  }
  sync() {
    const userState = this.deps.getUserState();
    const pending = isRecord2(userState == null ? void 0 : userState.pending) ? userState.pending : void 0;
    const pendingTxs = isRecord2(pending == null ? void 0 : pending.evm_txs) ? pending.evm_txs : void 0;
    const pendingEip712s = isRecord2(pending == null ? void 0 : pending.evm_sigs) ? pending.evm_sigs : void 0;
    const pendingSolanaTxs = isRecord2(pending == null ? void 0 : pending.solana_txs) ? pending.solana_txs : isRecord2(pending == null ? void 0 : pending.svm_ixs) ? pending.svm_ixs : void 0;
    const pendingSolanaSigs = isRecord2(pending == null ? void 0 : pending.solana_sigs) ? pending.solana_sigs : isRecord2(pending == null ? void 0 : pending.svm_sigs) ? pending.svm_sigs : void 0;
    const next = [];
    this.syncTransactions(next, pendingTxs);
    this.syncEip712(next, pendingEip712s);
    this.syncSolana(next, pendingSolanaTxs);
    this.syncSolana(next, pendingSolanaSigs);
    const nextIdSet = new Set(next.map((request) => request.id));
    for (const existing of this.requests) {
      if (existing.kind !== "transaction" && existing.kind !== "eip712_sign" && !nextIdSet.has(existing.id) && !this.resolvedRequestIds.has(existing.id)) {
        next.push(existing);
      }
    }
    if (this.sameRequests(next)) return;
    this.requests = next;
    this.changed();
  }
  async resolve(requestId, result) {
    const req = this.find(requestId);
    if (!req) {
      throw new Error(`No pending wallet request with id "${requestId}"`);
    }
    if (result.kind !== req.kind) {
      throw new Error(
        `WalletRequestResult.kind mismatch for "${requestId}": request is "${req.kind}" but result is "${result.kind}".`
      );
    }
    if (this.resolvingRequestIds.has(requestId)) return;
    this.resolvingRequestIds.add(requestId);
    try {
      if (req.kind === "transaction" && result.kind === "transaction") {
        await this.resolveTransaction(req.payload, result);
      } else if (req.kind === "eip712_sign" && result.kind === "eip712_sign") {
        await this.deps.sendSystemEvent("wallet_eip712_response", __spreadValues({
          status: "success",
          signature: result.signature,
          description: req.payload.description
        }, req.payload.eip712Id !== void 0 ? { pending_eip712_id: req.payload.eip712Id } : {}));
      } else if (req.kind === "solana_sign" && result.kind === "solana_sign") {
        await this.deps.sendSystemEvent("wallet::solana_sign_complete", __spreadValues(__spreadProps(__spreadValues({
          status: "signed",
          signed_tx: result.signedTx
        }, req.payload.unsignedTx !== void 0 ? { unsigned_tx: req.payload.unsignedTx } : {}), {
          description: req.payload.description
        }), solanaPendingIdFields(req.payload)));
      } else if (req.kind === "solana_sign_message" && result.kind === "solana_sign_message") {
        await this.deps.sendSystemEvent(
          "wallet::solana_sign_message_complete",
          __spreadValues(__spreadProps(__spreadValues({
            status: "signed",
            signature: result.signature
          }, req.payload.message !== void 0 ? { message: req.payload.message } : {}), {
            description: req.payload.description
          }), solanaPendingIdFields(req.payload))
        );
      } else if (req.kind === "solana_send" && result.kind === "solana_send") {
        await this.deps.sendSystemEvent("wallet::solana_send_complete", __spreadValues(__spreadProps(__spreadValues({
          status: "submitted",
          signature: result.signature,
          signed_tx: result.signedTx
        }, req.payload.unsignedTx !== void 0 ? { unsigned_tx: req.payload.unsignedTx } : {}), {
          description: req.payload.description
        }), solanaPendingIdFields(req.payload)));
      } else if (req.kind === "solana_sign_and_send" && result.kind === "solana_sign_and_send") {
        await this.deps.sendSystemEvent(
          "wallet::solana_sign_and_send_complete",
          __spreadValues(__spreadProps(__spreadValues({
            status: "submitted",
            signature: result.signature,
            signed_tx: result.signedTx
          }, req.payload.unsignedTx !== void 0 ? { unsigned_tx: req.payload.unsignedTx } : {}), {
            description: req.payload.description
          }), solanaPendingIdFields(req.payload))
        );
      }
      this.finishRequest(req);
    } finally {
      this.resolvingRequestIds.delete(requestId);
    }
  }
  async reject(requestId, reason) {
    const req = this.find(requestId);
    if (!req) {
      throw new Error(`No pending wallet request with id "${requestId}"`);
    }
    if (this.resolvingRequestIds.has(requestId)) return;
    this.resolvingRequestIds.add(requestId);
    try {
      if (req.kind === "transaction") {
        const pendingTxIds = txIdsFromPayload(req.payload);
        const requestedMode = aaRequestedModeFromPreference(
          req.payload.aaPreference
        );
        await this.deps.sendSystemEvent("wallet:tx_complete", {
          txHash: "",
          status: "failed",
          error: reason != null ? reason : "Request rejected",
          pending_tx_ids: pendingTxIds,
          aa_requested_mode: requestedMode,
          aa_resolved_mode: requestedMode,
          batched: pendingTxIds.length > 1,
          call_count: pendingTxIds.length
        });
      } else if (req.kind === "eip712_sign") {
        await this.deps.sendSystemEvent("wallet_eip712_response", __spreadValues({
          status: "failed",
          error: reason != null ? reason : "Request rejected",
          description: req.payload.description
        }, req.payload.eip712Id !== void 0 ? { pending_eip712_id: req.payload.eip712Id } : {}));
      } else if (req.kind === "solana_sign") {
        await this.deps.sendSystemEvent("wallet::solana_sign_complete", __spreadValues(__spreadProps(__spreadValues({
          status: "rejected",
          error: reason != null ? reason : "Request rejected"
        }, req.payload.unsignedTx !== void 0 ? { unsigned_tx: req.payload.unsignedTx } : {}), {
          description: req.payload.description
        }), solanaPendingIdFields(req.payload)));
      } else if (req.kind === "solana_sign_message") {
        await this.deps.sendSystemEvent(
          "wallet::solana_sign_message_complete",
          __spreadValues(__spreadProps(__spreadValues({
            status: "rejected",
            error: reason != null ? reason : "Request rejected"
          }, req.payload.message !== void 0 ? { message: req.payload.message } : {}), {
            description: req.payload.description
          }), solanaPendingIdFields(req.payload))
        );
      } else if (req.kind === "solana_send") {
        await this.deps.sendSystemEvent("wallet::solana_send_complete", __spreadValues(__spreadProps(__spreadValues({
          status: "rejected",
          error: reason != null ? reason : "Request rejected"
        }, req.payload.unsignedTx !== void 0 ? { unsigned_tx: req.payload.unsignedTx } : {}), {
          description: req.payload.description
        }), solanaPendingIdFields(req.payload)));
      } else {
        await this.deps.sendSystemEvent(
          "wallet::solana_sign_and_send_complete",
          __spreadValues(__spreadProps(__spreadValues({
            status: "rejected",
            error: reason != null ? reason : "Request rejected"
          }, req.payload.unsignedTx !== void 0 ? { unsigned_tx: req.payload.unsignedTx } : {}), {
            description: req.payload.description
          }), solanaPendingIdFields(req.payload))
        );
      }
      this.finishRequest(req);
    } finally {
      this.resolvingRequestIds.delete(requestId);
    }
  }
  async resolveTransaction(payload, result) {
    var _a, _b, _c, _d, _e, _f, _g;
    const pendingTxIds = txIdsFromPayload(payload);
    const requestedMode = (_a = result.aaRequestedMode) != null ? _a : aaRequestedModeFromPreference(payload.aaPreference);
    const resolvedMode = (_c = (_b = result.aaResolvedMode) != null ? _b : aaModeFromExecutionKind(result.executionKind)) != null ? _c : requestedMode;
    const userState = this.deps.getUserState();
    const prevEvm = isRecord2(userState == null ? void 0 : userState.evm) ? userState.evm : {};
    const prevAa = isRecord2(prevEvm.aa) ? prevEvm.aa : {};
    this.deps.resolveUserState(__spreadProps(__spreadValues({}, userState != null ? userState : {}), {
      evm: __spreadProps(__spreadValues({}, prevEvm), {
        aa: __spreadProps(__spreadValues({}, prevAa), {
          mode: resolvedMode,
          smart_account: resolvedMode === "4337" ? (_d = result.SmartAccount4337) != null ? _d : null : null,
          delegation_7702: resolvedMode === "7702" ? (_e = result.Delegation7702) != null ? _e : null : null
        })
      })
    }));
    await this.deps.sendSystemEvent("wallet:tx_complete", {
      txHash: result.txHash,
      status: "success",
      amount: result.amount,
      pending_tx_ids: pendingTxIds,
      aa_requested_mode: requestedMode,
      aa_resolved_mode: resolvedMode,
      aa_fallback_reason: result.aaFallbackReason,
      execution_kind: result.executionKind,
      batched: (_f = result.batched) != null ? _f : pendingTxIds.length > 1,
      call_count: (_g = result.callCount) != null ? _g : pendingTxIds.length,
      sponsored: result.sponsored,
      smart_account_4337: result.SmartAccount4337,
      delegation_7702: result.Delegation7702
    });
  }
  clearResolvedSolanaPending(request) {
    const userState = this.deps.getUserState();
    const pending = isRecord2(userState == null ? void 0 : userState.pending) ? userState.pending : void 0;
    if (!userState || !pending) return;
    if (request.kind === "transaction" || request.kind === "eip712_sign")
      return;
    const ids = "pendingSolanaIds" in request.payload && Array.isArray(request.payload.pendingSolanaIds) && request.payload.pendingSolanaIds.length > 0 ? request.payload.pendingSolanaIds : request.payload.pendingSolanaId !== void 0 ? [request.payload.pendingSolanaId] : [];
    if (ids.length === 0) return;
    const targets = request.kind === "solana_sign" || request.kind === "solana_sign_message" ? [
      ["svm_sigs", ids],
      ["solana_sigs", ids]
    ] : [
      ["svm_ixs", ids],
      ["solana_txs", ids]
    ];
    const nextPending = __spreadValues({}, pending);
    let changed = false;
    for (const [bucketName, ids2] of targets) {
      const bucket = isRecord2(nextPending[bucketName]) ? __spreadValues({}, nextPending[bucketName]) : void 0;
      if (!bucket) continue;
      for (const id of ids2) {
        if (Object.hasOwn(bucket, String(id))) {
          delete bucket[String(id)];
          changed = true;
        }
      }
      nextPending[bucketName] = bucket;
    }
    if (changed) {
      this.deps.resolveUserState(__spreadProps(__spreadValues({}, userState), { pending: nextPending }));
    }
  }
  finishRequest(request) {
    this.remove(request.id);
    this.resolvedRequestIds.add(request.id);
    this.clearResolvedSolanaPending(request);
  }
  syncTransactions(next, pendingTxs) {
    var _a, _b;
    const entries = Object.entries(pendingTxs != null ? pendingTxs : {}).filter(([id]) => Number.isInteger(Number(id))).sort((left, right) => Number(left[0]) - Number(right[0]));
    const pendingIds = new Set(entries.map(([id]) => Number(id)));
    const covered = /* @__PURE__ */ new Set();
    const existing = this.requests.filter(
      (request) => request.kind === "transaction"
    ).map((request) => ({ request, txIds: txIdsFromPayload(request.payload) })).filter(
      ({ txIds }) => txIds.length > 0 && txIds.every((id) => pendingIds.has(id))
    ).sort(
      (left, right) => left.txIds.length !== right.txIds.length ? right.txIds.length - left.txIds.length : left.request.timestamp - right.request.timestamp
    );
    for (const { request, txIds } of existing) {
      if (txIds.some((txId) => covered.has(txId))) continue;
      const payload = hydrateTxPayloadFromUserState(
        request.payload,
        this.deps.getUserState()
      );
      next.push({
        id: this.requestId("transaction", payload),
        kind: "transaction",
        payload,
        timestamp: request.timestamp
      });
      txIds.forEach((txId) => covered.add(txId));
    }
    if (!this.deps.syncPendingTxRequestsFromUserState) return;
    for (const [id, raw] of entries) {
      const txId = Number(id);
      if (covered.has(txId)) continue;
      const payload = hydrateTxPayloadFromUserState(
        { txId, txIds: [txId], aaPreference: "auto" },
        { pending: { evm_txs: { [id]: isRecord2(raw) ? raw : {} } } }
      );
      const requestId = this.requestId("transaction", payload);
      next.push({
        id: requestId,
        kind: "transaction",
        payload,
        timestamp: (_b = (_a = this.requests.find((request) => request.id === requestId)) == null ? void 0 : _a.timestamp) != null ? _b : Date.now()
      });
    }
  }
  syncEip712(next, pendingEip712s) {
    var _a, _b;
    for (const [id, raw] of Object.entries(pendingEip712s != null ? pendingEip712s : {}).sort(
      (left, right) => Number(left[0]) - Number(right[0])
    )) {
      const payload = normalizeEip712Payload(__spreadProps(__spreadValues({}, isRecord2(raw) ? raw : {}), {
        pending_eip712_id: Number(id)
      }));
      const requestId = this.requestId("eip712_sign", payload);
      next.push({
        id: requestId,
        kind: "eip712_sign",
        payload,
        timestamp: (_b = (_a = this.requests.find((request) => request.id === requestId)) == null ? void 0 : _a.timestamp) != null ? _b : Date.now()
      });
    }
  }
  syncSolana(next, pendingSolanaRequests) {
    var _a, _b;
    for (const [id, raw] of Object.entries(pendingSolanaRequests != null ? pendingSolanaRequests : {}).sort(
      (left, right) => Number(left[0]) - Number(right[0])
    )) {
      const normalized = normalizeSolanaWalletRequest(__spreadProps(__spreadValues({}, isRecord2(raw) ? raw : {}), {
        chain_kind: "svm",
        pending_solana_id: Number(id)
      }));
      if (!normalized) continue;
      const requestId = this.requestId(normalized.kind, normalized.payload);
      if (this.resolvedRequestIds.has(requestId)) continue;
      next.push(
        this.request(
          normalized.kind,
          normalized.payload,
          requestId,
          (_b = (_a = this.requests.find((request) => request.id === requestId)) == null ? void 0 : _a.timestamp) != null ? _b : Date.now()
        )
      );
    }
  }
  requestId(kind, payload) {
    if (kind === "transaction") {
      const txPayload = payload;
      if (typeof txPayload.requestId === "string" && txPayload.requestId.length > 0) {
        return `txreq-${txPayload.requestId}`;
      }
      const txIds = txIdsFromPayload(txPayload);
      if (txIds.length > 0) return `tx-${txIds.join("-")}`;
    } else if (kind === "eip712_sign") {
      const { eip712Id } = payload;
      if (typeof eip712Id === "number") return `eip712-${eip712Id}`;
    } else {
      const { pendingSolanaId } = payload;
      if (typeof pendingSolanaId === "number")
        return `${kind}-${pendingSolanaId}`;
    }
    return `wreq-${this.nextId++}`;
  }
  request(kind, payload, id, timestamp2) {
    if (kind === "transaction") {
      return { id, kind, payload, timestamp: timestamp2 };
    }
    if (kind === "eip712_sign") {
      return { id, kind, payload, timestamp: timestamp2 };
    }
    if (kind === "solana_sign_message") {
      return {
        id,
        kind,
        payload,
        timestamp: timestamp2
      };
    }
    return { id, kind, payload, timestamp: timestamp2 };
  }
  dedupeTransactionRequests(req) {
    if (req.kind !== "transaction") return;
    const nextTxIds = txIdsFromPayload(req.payload);
    if (nextTxIds.length === 0) return;
    const nextTxIdSet = new Set(nextTxIds);
    this.requests = this.requests.filter((request) => {
      if (request.id === req.id || request.kind !== "transaction") return true;
      const requestTxIds = txIdsFromPayload(request.payload);
      return requestTxIds.length === 0 || !requestTxIds.every((txId) => nextTxIdSet.has(txId));
    });
  }
  sameRequests(next) {
    return next.length === this.requests.length && next.every((request, index) => {
      const current = this.requests[index];
      return (current == null ? void 0 : current.id) === request.id && current.kind === request.kind && JSON.stringify(current.payload) === JSON.stringify(request.payload);
    });
  }
  changed() {
    this.deps.onChange(this.list());
  }
};

// src/session/index.ts
var ClientSession = class extends TypedEventEmitter {
  constructor(clientOrOptions, sessionOptions) {
    var _a, _b, _c, _d, _e;
    super();
    this.pollTimer = null;
    this.unsubscribeSSE = null;
    this.isSSEActive = false;
    this._isProcessing = false;
    this._backendWasProcessing = false;
    this._messages = [];
    this.closed = false;
    this.pendingResolve = null;
    this.client = clientOrOptions instanceof AomiClient ? clientOrOptions : new AomiClient(clientOrOptions);
    this.sessionId = (_a = sessionOptions == null ? void 0 : sessionOptions.sessionId) != null ? _a : crypto.randomUUID();
    this.app = (_b = sessionOptions == null ? void 0 : sessionOptions.app) != null ? _b : "default";
    this.applicationId = sessionOptions == null ? void 0 : sessionOptions.applicationId;
    this.apiKey = sessionOptions == null ? void 0 : sessionOptions.apiKey;
    this.paymentMethod = sessionOptions == null ? void 0 : sessionOptions.paymentMethod;
    const initialUserState = UserState.reconcile(
      void 0,
      sessionOptions == null ? void 0 : sessionOptions.userState
    );
    this.userState = (sessionOptions == null ? void 0 : sessionOptions.clientType) ? UserState.withExt(
      initialUserState != null ? initialUserState : {},
      "client_type",
      sessionOptions.clientType
    ) : initialUserState;
    this.clientId = (_c = sessionOptions == null ? void 0 : sessionOptions.clientId) != null ? _c : crypto.randomUUID();
    this.syncPendingTxRequestsFromUserState = (_d = sessionOptions == null ? void 0 : sessionOptions.syncPendingTxRequestsFromUserState) != null ? _d : true;
    this.pollIntervalMs = (_e = sessionOptions == null ? void 0 : sessionOptions.pollIntervalMs) != null ? _e : 500;
    this.logger = sessionOptions == null ? void 0 : sessionOptions.logger;
    this.walletController = new SessionWalletController({
      getUserState: () => this.userState,
      resolveUserState: (userState) => this.resolveUserState(userState),
      sendSystemEvent: (type, payload) => this.sendSystemEvent(type, payload),
      onChange: (requests) => this.emit("wallet_requests_changed", requests),
      syncPendingTxRequestsFromUserState: this.syncPendingTxRequestsFromUserState
    });
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
      applicationId: this.applicationId,
      apiKey: this.apiKey,
      userState: this.userState,
      clientId: this.clientId,
      paymentMethod: this.paymentMethod
    });
    this.assertUserStateAligned(response.user_state);
    this.applyState(response);
    if (!response.is_processing && this.walletController.length === 0) {
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
      applicationId: this.applicationId,
      apiKey: this.apiKey,
      userState: this.userState,
      clientId: this.clientId,
      paymentMethod: this.paymentMethod
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
    await this.walletController.resolve(requestId, result);
    this.resumeAfterWalletResponse();
  }
  /**
   * Reject a pending wallet request.
   * Sends an error to the backend and resumes polling.
   */
  async reject(requestId, reason) {
    await this.walletController.reject(requestId, reason);
    this.resumeAfterWalletResponse();
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
    this.isSSEActive = false;
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
    return this.walletController.list();
  }
  /** Whether the AI is currently processing. */
  getIsProcessing() {
    return this._isProcessing;
  }
  getIsSSEActive() {
    return this.isSSEActive;
  }
  setSSEActive(active) {
    var _a;
    this.assertOpen();
    if (active === this.isSSEActive) {
      return;
    }
    this.isSSEActive = active;
    if (active) {
      this.unsubscribeSSE = this.client.subscribeSSE(
        this.sessionId,
        (event) => this.handleSSEEvent(event),
        (error) => this.emit("error", { error })
      );
      return;
    }
    (_a = this.unsubscribeSSE) == null ? void 0 : _a.call(this);
    this.unsubscribeSSE = null;
  }
  syncRuntimeOptions(options) {
    var _a;
    this.app = options.app;
    this.applicationId = options.applicationId;
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
    this.walletController.sync();
    if (!(opts == null ? void 0 : opts.skipEmit) && this.userState && previousSerialized !== nextSerialized) {
      this.emit("user_state_updated", this.userState);
    }
  }
  setClientType(clientType) {
    var _a;
    this.resolveUserState(
      UserState.withExt((_a = this.userState) != null ? _a : {}, "client_type", clientType)
    );
  }
  addExtValue(key, value) {
    this.resolveUserState(addExtValue(this.userState, key, value));
  }
  removeExtValue(key) {
    const next = removeExtValue(this.userState, key);
    if (next) {
      this.resolveUserState(next);
    }
  }
  resolveWallet(address3, chainId3, aa) {
    this.resolveUserState(
      resolveWalletState(this.userState, address3, chainId3, aa)
    );
  }
  async syncUserState() {
    this.assertOpen();
    const state = await this.client.fetchState(
      this.sessionId,
      this.userState,
      this.clientId,
      { app: this.app, applicationId: this.applicationId }
    );
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
      this.clientId,
      { app: this.app, applicationId: this.applicationId }
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
        this.clientId,
        { app: this.app, applicationId: this.applicationId }
      );
      if (!this.pollTimer) return;
      this.assertUserStateAligned(state.user_state);
      this.applyState(state);
      if (this._backendWasProcessing && !state.is_processing) {
        this.emit("backend_idle", void 0);
      }
      this._backendWasProcessing = !!state.is_processing;
      if (!state.is_processing && this.walletController.length === 0) {
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
    applySessionState(state, {
      userState: () => this.userState,
      resolveUserState: (userState) => this.resolveUserState(userState),
      setMessages: (messages) => {
        this._messages = messages;
      },
      getMessages: () => this.getMessages(),
      setTitle: (title) => {
        this._title = title;
      },
      walletController: this.walletController,
      emit: (type, payload) => this.emit(type, payload)
    });
  }
  // ===========================================================================
  // Internal — SSE Handling
  // ===========================================================================
  handleSSEEvent(event) {
    handleSessionSSEEvent(event, {
      setTitle: (title) => {
        this._title = title;
      },
      emit: (type, payload) => this.emit(type, payload)
    });
  }
  // ===========================================================================
  // Internal — Helpers
  // ===========================================================================
  async sendSystemEvent(type, payload) {
    const message = JSON.stringify({ type, payload });
    await this.client.sendSystemMessage(this.sessionId, message, {
      app: this.app,
      applicationId: this.applicationId
    });
  }
  resumeAfterWalletResponse() {
    if (!this._isProcessing) {
      this._isProcessing = true;
      this.emit("processing_start", void 0);
    }
    this.startPolling();
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
    warnIfUserStateMisaligned(this.userState, actualUserState);
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
  baseSepolia,
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
var robinhood = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.mainnet.chain.robinhood.com"]
    }
  },
  blockExplorers: {
    default: {
      name: "Robinhood Chain Explorer",
      url: "https://robinhoodchain.blockscout.com"
    }
  }
});
var SUPPORTED_CHAINS = [
  { id: 1, name: "Ethereum", ticker: "ETH" },
  { id: 137, name: "Polygon", ticker: "MATIC" },
  { id: 42161, name: "Arbitrum", ticker: "ARB" },
  { id: 8453, name: "Base", ticker: "BASE" },
  { id: 84532, name: "Base Sepolia", ticker: "ETH" },
  { id: 10, name: "Optimism", ticker: "OP" },
  { id: 11155111, name: "Sepolia", ticker: "SEP" },
  { id: 59144, name: "Linea Mainnet", ticker: "LINEA" },
  { id: 59141, name: "Linea Sepolia Testnet", ticker: "LINEA" },
  { id: 143, name: "Monad", ticker: "MON" },
  { id: 10143, name: "Monad Testnet", ticker: "MON" },
  { id: 4663, name: "Robinhood Chain", ticker: "ETH" },
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
  84532: "base-sepolia",
  10: "opt-mainnet",
  11155111: "eth-sepolia",
  59144: "linea-mainnet",
  59141: "linea-sepolia",
  4663: "robinhood-mainnet"
};
var CHAINS_BY_ID = {
  1: mainnet,
  137: polygon,
  42161: arbitrum,
  10: optimism,
  8453: base,
  84532: baseSepolia,
  11155111: sepolia,
  59144: linea,
  59141: lineaSepolia,
  143: monad,
  10143: monadTestnet,
  4663: robinhood,
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
  const chainId3 = chainIds[0];
  if (!chainsById[chainId3]) {
    return null;
  }
  const chainConfig = config.chains.find((item) => item.chainId === chainId3);
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
  let Delegation77022 = account.mode === "7702" ? account.Delegation7702 : void 0;
  if (account.mode === "7702" && !Delegation77022) {
    Delegation77022 = await resolve7702Delegation(
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
  }, account.mode === "4337" && account.SmartAccount4337 ? { SmartAccount4337: account.SmartAccount4337 } : {}), Delegation77022 ? { Delegation7702: Delegation77022 } : {});
}
async function resolve7702Delegation(txHash, callList, getPreferredRpcUrl) {
  var _a, _b, _c, _d;
  try {
    const chainId3 = (_a = callList[0]) == null ? void 0 : _a.chainId;
    if (!chainId3) return void 0;
    const chain = CHAINS_BY_ID[chainId3];
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
  const chainId3 = chainIds[0];
  if (currentChainId !== chainId3) {
    await switchChainAsync({ chainId: chainId3 });
  }
  const chainCaps = resolveChainCapabilities(capabilities, chainId3);
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
    chainId: chainId3,
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
        chainId: chainId3,
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
function resolveChainCapabilities(capabilities, chainId3) {
  var _a, _b;
  if (!capabilities) {
    return void 0;
  }
  const asRecord2 = capabilities;
  const eip155Key = `eip155:${chainId3}`;
  const decimalKey = String(chainId3);
  const hexKey = `0x${chainId3.toString(16)}`;
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
function buildFeeAAWalletCall(fee, chainId3) {
  const normalizedFee = normalizeSimulatedFee(fee);
  if (!normalizedFee) {
    return null;
  }
  return {
    to: normalizedFee.recipient,
    value: normalizedFee.amountWei,
    chainId: chainId3
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
function adaptSmartAccount(account, address3) {
  if (account.mode === "4337") {
    return {
      provider: normalizeAAProvider(account.provider),
      mode: "4337",
      address: address3,
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
  const Delegation77022 = account.delegationAddress && account.smartAccountAddress && account.delegationAddress.toLowerCase() !== account.smartAccountAddress.toLowerCase() ? account.delegationAddress : void 0;
  return __spreadProps(__spreadValues({
    provider: normalizeAAProvider(account.provider),
    mode: "7702",
    address: address3
  }, Delegation77022 ? { Delegation7702: Delegation77022 } : {}), {
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
function getExternalWalletOwnerParams(owner) {
  return {
    kind: "ready",
    ownerParams: {
      para: void 0,
      signer: owner.signer,
      address: owner.address
    }
  };
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
    case "external-wallet":
      return getExternalWalletOwnerParams(owner);
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
function getUnsupportedOwnerState(resolved, provider, ownerKind, message) {
  return {
    resolved,
    account: null,
    pending: false,
    error: new Error(
      message != null ? message : `${provider} AA does not support ${ownerKind} owners in this build.`
    )
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
function deriveAlchemy4337AccountId(address3) {
  var _a;
  const hex = address3.toLowerCase().slice(2).padEnd(32, "0").slice(0, 32).split("");
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
  const sponsored2 = effectiveMode === "4337";
  const gasPolicyId = sponsored2 ? resolveAlchemyGasPolicyId({ gasPolicyId: options.gasPolicyId }) : void 0;
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
  if (owner.kind === "external-wallet") {
    return getUnsupportedOwnerState(
      execution,
      "alchemy",
      owner.kind,
      "Alchemy AA external-wallet owners are not implemented yet. Use Pimlico for sessionless external-wallet 4337 execution."
    );
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
      aaDebug(`${params.resolved.mode}:sendCalls:submitted`, {
        callId: result.id
      });
      const status = await alchemyClient.waitForCallsStatus({ id: result.id });
      const transactionHash = (_b = (_a = status.receipts) == null ? void 0 : _a[0]) == null ? void 0 : _b.transactionHash;
      aaDebug(`${params.resolved.mode}:sendCalls:receipt`, {
        callId: result.id,
        hasTransactionHash: Boolean(transactionHash),
        receipts: (_d = (_c = status.receipts) == null ? void 0 : _c.length) != null ? _d : 0
      });
      if (!transactionHash) {
        throw new Error(
          "Alchemy Wallets API did not return a transaction hash."
        );
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
  const permissionlessSigner = owner.kind === "session" || owner.kind === "external-wallet" ? resolvePimlicoSessionSigner(ownerParams.ownerParams) : null;
  try {
    const signer = owner.kind === "direct" ? privateKeyToAccount4(owner.privateKey) : permissionlessSigner;
    if (signer) {
      return await createPimlicoPermissionlessState({
        resolved: execution,
        chain,
        signer,
        externalSigner: (owner.kind === "session" || owner.kind === "external-wallet") && "signer" in ownerParams.ownerParams ? ownerParams.ownerParams.signer : void 0,
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
function adaptPimlicoSdkAccount(account, address3) {
  const lowered = account.provider.toLowerCase();
  if (lowered !== "alchemy" && lowered !== "pimlico") {
    throw new Error(
      `Unsupported AA provider from Pimlico SDK: ${account.provider}`
    );
  }
  const provider = lowered;
  if (account.mode === "4337") {
    return {
      provider,
      mode: "4337",
      address: address3,
      SmartAccount4337: account.smartAccountAddress,
      sendTransaction: async (call) => account.sendTransaction(call),
      sendBatchTransaction: async (calls) => account.sendBatchTransaction(calls)
    };
  }
  return __spreadProps(__spreadValues({
    provider,
    mode: "7702",
    address: address3
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
  const sponsored2 = params.resolved.sponsorship !== "disabled";
  const entryPoint = params.mode === "7702" ? { address: entryPoint08Address, version: "0.8" } : { address: entryPoint07Address, version: "0.7" };
  pimDebug(`${params.mode}:start`, {
    signerAddress,
    chainId: params.chain.id,
    sponsored: sponsored2,
    pimlicoRpcUrl: pimlicoRpcUrl.replace(params.apiKey, "***")
  });
  const publicClient = createPublicClient2({
    chain: params.chain,
    transport: http2(params.rpcUrl)
  });
  if (params.mode === "7702") {
    rejectExternalWallet7702(params.externalSigner);
  }
  const paymasterClient = sponsored2 ? createPimlicoClient({
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
  AccountCredentialUnavailableError,
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
  appIdentityKey,
  appendFeeCallToPayload,
  authorizationChallenge,
  authorizationCommit,
  buildAAExecutionPlan,
  buildFeeAAWalletCall,
  buildSiwsMessage,
  createAAProviderState,
  createAccountBearerProvider,
  createAlchemyAAProvider,
  createPimlicoAAProvider,
  ensureSvmWalletBound,
  ensureSvmWalletBoundVia,
  executeWalletCalls,
  getAAChainConfig,
  getWalletExecutorReady,
  hydrateTxPayloadFromUserState,
  isAlchemySponsorshipLimitError,
  isAsyncCallback,
  isInlineCall,
  isSystemError,
  isSystemNotice,
  isUnboundWalletError,
  monad,
  monadTestnet,
  normalizeAppDescriptor,
  normalizeEip712Payload,
  normalizeSimulatedFee,
  normalizeSolanaSignMessagePayload,
  normalizeSolanaSignPayload,
  normalizeSolanaWalletRequest,
  normalizeTxPayload,
  parseChainId3 as parseChainId,
  posterFromClient,
  resolvePimlicoConfig,
  robinhood,
  toAAWalletCall,
  toAAWalletCalls,
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
  unwrapSystemEvent
};
//# sourceMappingURL=index.js.map