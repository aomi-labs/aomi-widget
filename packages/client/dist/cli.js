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

// src/cli/errors.ts
var CliExit = class extends Error {
  constructor(code) {
    super();
    this.code = code;
  }
};
function fatal(message) {
  const RED = "\x1B[31m";
  const DIM3 = "\x1B[2m";
  const RESET3 = "\x1B[0m";
  const lines = message.split("\n");
  const [headline, ...details] = lines;
  console.error(`${RED}\u274C ${headline}${RESET3}`);
  for (const detail of details) {
    if (!detail.trim()) {
      console.error("");
      continue;
    }
    console.error(`${DIM3}${detail}${RESET3}`);
  }
  throw new CliExit(1);
}

// src/cli/args.ts
var SUPPORTED_CHAIN_IDS = [1, 137, 42161, 8453, 10, 11155111];
var CHAIN_NAMES = {
  1: "Ethereum",
  137: "Polygon",
  42161: "Arbitrum One",
  8453: "Base",
  10: "Optimism",
  11155111: "Sepolia"
};
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
function resolveExecutionMode(flags) {
  const flagAA = flags["aa"] === "true";
  const flagEoa = flags["eoa"] === "true";
  if (flagAA && flagEoa) {
    fatal("Choose only one of `--aa` or `--eoa`.");
  }
  if (flagAA) return "aa";
  if (flagEoa) return "eoa";
  return "aa";
}
function parseAAProvider(value) {
  if (value === void 0) return void 0;
  if (value === "alchemy" || value === "pimlico") {
    return value;
  }
  fatal("Unsupported AA provider. Use `alchemy` or `pimlico`.");
}
function parseAAMode(value) {
  if (value === void 0) return void 0;
  if (value === "4337" || value === "7702") {
    return value;
  }
  fatal("Unsupported AA mode. Use `4337` or `7702`.");
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
function getConfig(parsed) {
  var _a3, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
  const usesSignFlags = parsed.flags["aa"] === "true" || parsed.flags["eoa"] === "true" || parsed.flags["aa-provider"] !== void 0 || parsed.flags["aa-mode"] !== void 0;
  if (usesSignFlags && parsed.command !== "sign") {
    fatal(
      "AA/EOA execution flags are only supported on `aomi sign <tx-id>`."
    );
  }
  const execution = resolveExecutionMode(parsed.flags);
  const aaProvider = parseAAProvider(
    (_a3 = parsed.flags["aa-provider"]) != null ? _a3 : process.env.AOMI_AA_PROVIDER
  );
  const aaMode = parseAAMode(
    (_b = parsed.flags["aa-mode"]) != null ? _b : process.env.AOMI_AA_MODE
  );
  if (execution === "eoa" && (aaProvider || aaMode)) {
    fatal("`--aa-provider` and `--aa-mode` cannot be used with `--eoa`.");
  }
  return {
    baseUrl: (_d = (_c = parsed.flags["backend-url"]) != null ? _c : process.env.AOMI_BASE_URL) != null ? _d : "https://api.aomi.dev",
    apiKey: (_e = parsed.flags["api-key"]) != null ? _e : process.env.AOMI_API_KEY,
    app: (_g = (_f = parsed.flags["app"]) != null ? _f : process.env.AOMI_APP) != null ? _g : "default",
    model: (_h = parsed.flags["model"]) != null ? _h : process.env.AOMI_MODEL,
    publicKey: (_i = parsed.flags["public-key"]) != null ? _i : process.env.AOMI_PUBLIC_KEY,
    privateKey: (_j = parsed.flags["private-key"]) != null ? _j : process.env.PRIVATE_KEY,
    chainRpcUrl: (_k = parsed.flags["rpc-url"]) != null ? _k : process.env.CHAIN_RPC_URL,
    chain: parseChainId((_l = parsed.flags["chain"]) != null ? _l : process.env.AOMI_CHAIN_ID),
    execution,
    aaProvider,
    aaMode
  };
}
function createRuntime(argv) {
  const parsed = parseArgs(argv);
  return {
    parsed,
    config: getConfig(parsed)
  };
}

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
var SESSION_FILE_PREFIX = "session-";
var SESSION_FILE_SUFFIX = ".json";
var _a;
var LEGACY_STATE_FILE = join(
  (_a = process.env.XDG_RUNTIME_DIR) != null ? _a : tmpdir(),
  "aomi-session.json"
);
var _a2;
var STATE_ROOT_DIR = (_a2 = process.env.AOMI_STATE_DIR) != null ? _a2 : join(homedir(), ".aomi");
var SESSIONS_DIR = join(STATE_ROOT_DIR, "sessions");
var ACTIVE_SESSION_FILE = join(STATE_ROOT_DIR, "active-session.txt");
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
    baseUrl: stored.baseUrl,
    app: stored.app,
    model: stored.model,
    apiKey: stored.apiKey,
    publicKey: stored.publicKey,
    chainId: stored.chainId,
    pendingTxs: stored.pendingTxs,
    signedTxs: stored.signedTxs
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
      baseUrl: parsed.baseUrl,
      app: parsed.app,
      model: parsed.model,
      apiKey: parsed.apiKey,
      publicKey: parsed.publicKey,
      chainId: parsed.chainId,
      pendingTxs: parsed.pendingTxs,
      signedTxs: parsed.signedTxs,
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
var _migrationDone = false;
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
function getNextTxId(state) {
  var _a3, _b;
  const allIds = [...(_a3 = state.pendingTxs) != null ? _a3 : [], ...(_b = state.signedTxs) != null ? _b : []].map((tx) => {
    const match = tx.id.match(/^tx-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
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
  const idx = state.pendingTxs.findIndex((tx) => tx.id === id);
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

// src/cli/output.ts
var DIM = "\x1B[2m";
var CYAN = "\x1B[36m";
var YELLOW = "\x1B[33m";
var GREEN = "\x1B[32m";
var RESET = "\x1B[0m";
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
    var _a3;
    const url = new URL("/api/control/apps", this.baseUrl);
    if (options == null ? void 0 : options.publicKey) {
      url.searchParams.set("public_key", options.publicKey);
    }
    const apiKey = (_a3 = options == null ? void 0 : options.apiKey) != null ? _a3 : this.apiKey;
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
    var _a3;
    const url = new URL("/api/control/models", this.baseUrl);
    const apiKey = (_a3 = options == null ? void 0 : options.apiKey) != null ? _a3 : this.apiKey;
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
    var _a3;
    const apiKey = (_a3 = options == null ? void 0 : options.apiKey) != null ? _a3 : this.apiKey;
    const payload = { rig };
    if (options == null ? void 0 : options.app) {
      payload.app = options.app;
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

// src/wallet-utils.ts
function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  return value;
}
function getToolArgs(payload) {
  var _a3;
  const root = asRecord(payload);
  const nestedArgs = asRecord(root == null ? void 0 : root.args);
  return (_a3 = nestedArgs != null ? nestedArgs : root) != null ? _a3 : {};
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
function normalizeTxPayload(payload) {
  var _a3, _b, _c;
  const root = asRecord(payload);
  const args = getToolArgs(payload);
  const ctx = asRecord(root == null ? void 0 : root.ctx);
  const to = typeof args.to === "string" ? args.to : void 0;
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
    var _a3, _b, _c;
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
    this.sessionId = (_a3 = sessionOptions == null ? void 0 : sessionOptions.sessionId) != null ? _a3 : crypto.randomUUID();
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
    var _a3;
    if (this.pollTimer || this.closed) return;
    (_a3 = this.logger) == null ? void 0 : _a3.debug("[session] polling started", this.sessionId);
    this.pollTimer = setInterval(() => {
      void this.pollTick();
    }, this.pollIntervalMs);
  }
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
      throw new Error(
        `Backend user_state mismatch. expected subset=${expected} actual=${actual}`
      );
    }
  }
};

// src/cli/context.ts
function getOrCreateSession(runtime) {
  const { config } = runtime;
  let state = readState();
  if (!state) {
    state = {
      sessionId: crypto.randomUUID(),
      baseUrl: config.baseUrl,
      app: config.app,
      apiKey: config.apiKey,
      publicKey: config.publicKey,
      chainId: config.chain
    };
    writeState(state);
  } else {
    let changed = false;
    if (config.baseUrl !== state.baseUrl) {
      state.baseUrl = config.baseUrl;
      changed = true;
    }
    if (config.app !== state.app) {
      state.app = config.app;
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
    if (config.chain !== void 0 && config.chain !== state.chainId) {
      state.chainId = config.chain;
      changed = true;
    }
    if (changed) writeState(state);
  }
  const session = new ClientSession(
    { baseUrl: state.baseUrl, apiKey: state.apiKey },
    {
      sessionId: state.sessionId,
      app: state.app,
      apiKey: state.apiKey,
      publicKey: state.publicKey
    }
  );
  if (state.publicKey) {
    session.resolveWallet(state.publicKey, state.chainId);
  }
  return { session, state };
}
function createControlClient(runtime) {
  return new AomiClient({
    baseUrl: runtime.config.baseUrl,
    apiKey: runtime.config.apiKey
  });
}
async function applyModelSelection(session, state, model) {
  await session.client.setModel(state.sessionId, model, {
    app: state.app,
    apiKey: state.apiKey
  });
  state.model = model;
  writeState(state);
}
async function applyRequestedModelIfPresent(runtime, session, state) {
  const requestedModel = runtime.config.model;
  if (!requestedModel || requestedModel === state.model) {
    return;
  }
  await applyModelSelection(session, state, requestedModel);
}

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
  var _a3, _b;
  if (tx.kind !== "transaction" || !tx.to) {
    throw new Error("pending_transaction_missing_call_data");
  }
  return [
    {
      to: tx.to,
      value: (_a3 = tx.value) != null ? _a3 : "0",
      data: tx.data,
      chainId: (_b = tx.chainId) != null ? _b : 1
    }
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

// src/cli/commands/chat.ts
async function chatCommand(runtime) {
  const message = runtime.parsed.positional.join(" ");
  if (!message) {
    fatal("Usage: aomi chat <message>");
  }
  const verbose = runtime.parsed.flags["verbose"] === "true" || runtime.parsed.flags["v"] === "true";
  const { session, state } = getOrCreateSession(runtime);
  try {
    await applyRequestedModelIfPresent(runtime, session, state);
    if (state.publicKey) {
      session.resolveWallet(state.publicKey, state.chainId);
    }
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
        const checkWallet = () => {
          if (capturedRequests.length > 0) resolve();
        };
        session.on("wallet_tx_request", checkWallet);
        session.on("wallet_eip712_request", checkWallet);
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
      const pending = addPendingTx(state, walletRequestToPendingTx(request));
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

// src/cli/commands/control.ts
async function statusCommand(runtime) {
  var _a3, _b, _c, _d, _e, _f, _g, _h, _i;
  if (!readState()) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  const { session, state } = getOrCreateSession(runtime);
  try {
    const apiState = await session.client.fetchState(state.sessionId);
    console.log(
      JSON.stringify(
        {
          sessionId: state.sessionId,
          baseUrl: state.baseUrl,
          app: state.app,
          model: (_a3 = state.model) != null ? _a3 : null,
          isProcessing: (_b = apiState.is_processing) != null ? _b : false,
          messageCount: (_d = (_c = apiState.messages) == null ? void 0 : _c.length) != null ? _d : 0,
          title: (_e = apiState.title) != null ? _e : null,
          pendingTxs: (_g = (_f = state.pendingTxs) == null ? void 0 : _f.length) != null ? _g : 0,
          signedTxs: (_i = (_h = state.signedTxs) == null ? void 0 : _h.length) != null ? _i : 0
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
async function eventsCommand(runtime) {
  if (!readState()) {
    console.log("No active session");
    return;
  }
  const { session, state } = getOrCreateSession(runtime);
  try {
    const events = await session.client.getSystemEvents(state.sessionId);
    console.log(JSON.stringify(events, null, 2));
  } finally {
    session.close();
  }
}
async function modelsCommand(runtime) {
  var _a3, _b;
  const client = createControlClient(runtime);
  const state = readState();
  const sessionId = (_a3 = state == null ? void 0 : state.sessionId) != null ? _a3 : crypto.randomUUID();
  const models = await client.getModels(sessionId, {
    apiKey: (_b = runtime.config.apiKey) != null ? _b : state == null ? void 0 : state.apiKey
  });
  if (models.length === 0) {
    console.log("No models available.");
    return;
  }
  for (const model of models) {
    const marker = (state == null ? void 0 : state.model) === model ? "  (current)" : "";
    console.log(`${model}${marker}`);
  }
}
async function modelCommand(runtime) {
  var _a3;
  const subcommand = runtime.parsed.positional[0];
  if (!subcommand || subcommand === "current") {
    const state2 = readState();
    if (!state2) {
      console.log("No active session");
      printDataFileLocation();
      return;
    }
    console.log((_a3 = state2.model) != null ? _a3 : "(default backend model)");
    printDataFileLocation();
    return;
  }
  if (subcommand !== "set") {
    fatal("Usage: aomi model set <rig>\n       aomi model current");
  }
  const model = runtime.parsed.positional.slice(1).join(" ").trim();
  if (!model) {
    fatal("Usage: aomi model set <rig>");
  }
  const { session, state } = getOrCreateSession(runtime);
  try {
    await applyModelSelection(session, state, model);
    console.log(`Model set to ${model}`);
    printDataFileLocation();
  } finally {
    session.close();
  }
}

// src/cli/tables.ts
var MAX_TABLE_VALUE_WIDTH = 72;
var MAX_TX_JSON_WIDTH = 96;
var MAX_TX_ROWS = 8;
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

// src/cli/commands/history.ts
async function logCommand(runtime) {
  var _a3, _b, _c, _d, _e;
  if (!readState()) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  const { session, state } = getOrCreateSession(runtime);
  try {
    const apiState = await session.client.fetchState(state.sessionId);
    const messages = (_a3 = apiState.messages) != null ? _a3 : [];
    const pendingTxs = (_b = state.pendingTxs) != null ? _b : [];
    const signedTxs = (_c = state.signedTxs) != null ? _c : [];
    const toolCalls = messages.filter((msg) => Boolean(msg.tool_result)).length;
    const tokenCountEstimate = estimateTokenCount(messages);
    const topic = (_d = apiState.title) != null ? _d : "Untitled Session";
    if (messages.length === 0) {
      console.log("No messages in this session.");
      printDataFileLocation();
      return;
    }
    console.log(`------ Session id: ${state.sessionId} ------`);
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
      const sender = (_e = msg.sender) != null ? _e : "unknown";
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
function closeCommand(runtime) {
  if (readState()) {
    const { session } = getOrCreateSession(runtime);
    session.close();
  }
  clearState();
  console.log("Session closed");
}

// src/cli/commands/sessions.ts
async function fetchRemoteSessionStats(record) {
  var _a3, _b;
  const client = new AomiClient({
    baseUrl: record.state.baseUrl,
    apiKey: record.state.apiKey
  });
  try {
    const apiState = await client.fetchState(record.sessionId);
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
async function sessionsCommand(_runtime) {
  var _a3;
  const sessions = listStoredSessions().sort((a, b) => b.updatedAt - a.updatedAt);
  if (sessions.length === 0) {
    console.log("No local sessions.");
    printDataFileLocation();
    return;
  }
  const activeSessionId = (_a3 = readState()) == null ? void 0 : _a3.sessionId;
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
function sessionCommand(runtime) {
  const subcommand = runtime.parsed.positional[0];
  const selector = runtime.parsed.positional[1];
  if (subcommand === "resume") {
    if (!selector) {
      fatal("Usage: aomi session resume <session-id|session-N|N>");
    }
    const resumed = setActiveSession(selector);
    if (!resumed) {
      fatal(`No local session found for selector "${selector}".`);
    }
    console.log(`Active session set to ${resumed.sessionId} (session-${resumed.localId}).`);
    printDataFileLocation();
    return;
  }
  if (subcommand === "delete") {
    if (!selector) {
      fatal("Usage: aomi session delete <session-id|session-N|N>");
    }
    const deleted = deleteStoredSession(selector);
    if (!deleted) {
      fatal(`No local session found for selector "${selector}".`);
    }
    console.log(`Deleted local session ${deleted.sessionId} (session-${deleted.localId}).`);
    const active = readState();
    if (active) {
      console.log(`Active session: ${active.sessionId}`);
    } else {
      console.log("No active session");
    }
    printDataFileLocation();
    return;
  }
  fatal(
    "Usage: aomi session resume <session-id|session-N|N>\n       aomi session delete <session-id|session-N|N>"
  );
}

// src/cli/commands/wallet.ts
import { createWalletClient, http } from "viem";
import { createInterface } from "readline/promises";
import { privateKeyToAccount as privateKeyToAccount2 } from "viem/accounts";
import * as viemChains from "viem/chains";

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
var DISABLED_PROVIDER_STATE = {
  plan: null,
  AA: void 0,
  isPending: false,
  error: null
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
    getPreferredRpcUrl: getPreferredRpcUrl2
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
    getPreferredRpcUrl: getPreferredRpcUrl2
  });
}
async function executeViaAA(callList, providerState) {
  var _a3;
  const AA = providerState.AA;
  const plan = providerState.plan;
  if (!AA || !plan) {
    throw (_a3 = providerState.error) != null ? _a3 : new Error("smart_account_unavailable");
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
  getPreferredRpcUrl: getPreferredRpcUrl2
}) {
  var _a3, _b;
  const { createPublicClient, createWalletClient: createWalletClient2, http: http2 } = await import("viem");
  const { privateKeyToAccount: privateKeyToAccount3 } = await import("viem/accounts");
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
      const account = privateKeyToAccount3(localPrivateKey);
      const walletClient = createWalletClient2({
        account,
        chain,
        transport: http2(rpcUrl)
      });
      const hash = await walletClient.sendTransaction({
        account,
        to: call.to,
        value: BigInt(call.value),
        data: call.data ? call.data : void 0
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
  var _a3;
  const { publicOnly = false } = options;
  for (const name of candidates) {
    if (publicOnly && !name.startsWith("NEXT_PUBLIC_")) {
      continue;
    }
    const value = (_a3 = process.env[name]) == null ? void 0 : _a3.trim();
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
    getPreferredRpcUrl: getPreferredRpcUrl2 = (chain2) => {
      var _a3;
      return (_a3 = chain2.rpcUrls.default.http[0]) != null ? _a3 : "";
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
    rpcUrl: getPreferredRpcUrl2(chain),
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
import { createAlchemySmartAccount } from "@getpara/aa-alchemy";
import { createPimlicoSmartAccount } from "@getpara/aa-pimlico";
import { privateKeyToAccount } from "viem/accounts";
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
  var _a3, _b;
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
  const apiKey = (_a3 = options.apiKey) != null ? _a3 : resolved.apiKey;
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
    const smartAccount = await createAlchemySmartAccount(__spreadProps(__spreadValues({}, ownerParams.ownerParams), {
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
  var _a3;
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
  const apiKey = (_a3 = options.apiKey) != null ? _a3 : resolved.apiKey;
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
    const smartAccount = await createPimlicoSmartAccount(__spreadProps(__spreadValues({}, ownerParams.ownerParams), {
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

// src/cli/execution.ts
function resolveAAProvider(config) {
  var _a3;
  const provider = (_a3 = config.aaProvider) != null ? _a3 : resolveDefaultProvider();
  if (!isProviderConfigured(provider)) {
    const envName = provider === "alchemy" ? "ALCHEMY_API_KEY" : "PIMLICO_API_KEY";
    throw new Error(
      `AA provider "${provider}" is selected but ${envName} is not configured.`
    );
  }
  return provider;
}
function resolveCliExecutionDecision(params) {
  const { config, chain, callList } = params;
  if (config.execution === "eoa") {
    return { execution: "eoa" };
  }
  const provider = resolveAAProvider(config);
  const resolveOpts = {
    calls: callList,
    chainsById: { [chain.id]: chain },
    modeOverride: config.aaMode,
    throwOnMissingConfig: true
  };
  const resolved = provider === "alchemy" ? resolveAlchemyConfig(resolveOpts) : resolvePimlicoConfig(resolveOpts);
  if (!resolved) {
    throw new Error(`AA config resolution failed for provider "${provider}".`);
  }
  return {
    execution: "aa",
    provider,
    aaMode: resolved.plan.mode
  };
}
async function createCliProviderState(params) {
  const { decision, chain, privateKey, rpcUrl, callList, sponsored } = params;
  if (decision.execution === "eoa") {
    return DISABLED_PROVIDER_STATE;
  }
  return createAAProviderState({
    provider: decision.provider,
    chain,
    owner: { kind: "direct", privateKey },
    rpcUrl,
    callList,
    mode: decision.aaMode,
    sponsored
  });
}
function describeExecutionDecision(decision) {
  if (decision.execution === "eoa") {
    return "eoa";
  }
  return `aa (${decision.provider}, ${decision.aaMode})`;
}

// src/cli/commands/wallet.ts
function txCommand() {
  var _a3, _b;
  const state = readState();
  if (!state) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  const pending = (_a3 = state.pendingTxs) != null ? _a3 : [];
  const signed = (_b = state.signedTxs) != null ? _b : [];
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
function requirePendingTx(state, txId) {
  var _a3;
  const pendingTx = ((_a3 = state.pendingTxs) != null ? _a3 : []).find((tx) => tx.id === txId);
  if (!pendingTx) {
    fatal(
      `No pending transaction with id "${txId}".
Run \`aomi tx\` to see available IDs.`
    );
  }
  return pendingTx;
}
function requirePendingTxs(state, txIds) {
  const uniqueIds = Array.from(new Set(txIds));
  if (uniqueIds.length !== txIds.length) {
    fatal("Duplicate transaction IDs are not allowed in a single `aomi sign` call.");
  }
  return uniqueIds.map((txId) => requirePendingTx(state, txId));
}
function rewriteSessionState(runtime, state) {
  let changed = false;
  if (runtime.config.baseUrl !== state.baseUrl) {
    state.baseUrl = runtime.config.baseUrl;
    changed = true;
  }
  if (runtime.config.app !== state.app) {
    state.app = runtime.config.app;
    changed = true;
  }
  if (runtime.config.apiKey !== void 0 && runtime.config.apiKey !== state.apiKey) {
    state.apiKey = runtime.config.apiKey;
    changed = true;
  }
  if (runtime.config.chain !== void 0 && runtime.config.chain !== state.chainId) {
    state.chainId = runtime.config.chain;
    changed = true;
  }
  if (changed) {
    writeState(state);
  }
}
function createSessionFromState(state) {
  const session = new ClientSession(
    { baseUrl: state.baseUrl, apiKey: state.apiKey },
    {
      sessionId: state.sessionId,
      app: state.app,
      apiKey: state.apiKey,
      publicKey: state.publicKey
    }
  );
  if (state.publicKey) {
    session.resolveWallet(state.publicKey, state.chainId);
  }
  return session;
}
async function persistResolvedSignerState(session, state, address, chainId) {
  state.publicKey = address;
  writeState(state);
  session.resolveWallet(address, chainId);
  await session.syncUserState();
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
async function promptForEoaFallback() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return false;
  }
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  try {
    const answer = await rl.question(
      "Account abstraction not available, use EOA? [yes/no] "
    );
    const normalized = answer.trim().toLowerCase();
    return normalized === "y" || normalized === "yes";
  } finally {
    rl.close();
  }
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
async function executeTransactionWithFallback(params) {
  const { decision, privateKey, currentChainId, chainsById, primaryChain, rpcUrl, callList } = params;
  const runExecution = async (providerState2) => executeCliTransaction({
    privateKey,
    currentChainId,
    chainsById,
    rpcUrl,
    providerState: providerState2,
    callList
  });
  if (decision.execution === "eoa") {
    const providerState2 = await createCliProviderState({
      decision,
      chain: primaryChain,
      privateKey,
      rpcUrl: rpcUrl != null ? rpcUrl : "",
      callList
    });
    return {
      execution: await runExecution(providerState2),
      finalDecision: decision
    };
  }
  let providerState = await createCliProviderState({
    decision,
    chain: primaryChain,
    privateKey,
    rpcUrl: rpcUrl != null ? rpcUrl : "",
    callList,
    sponsored: true
  });
  try {
    return {
      execution: await runExecution(providerState),
      finalDecision: decision
    };
  } catch (error) {
    const shouldRetryUnsponsored = decision.provider === "alchemy" && isAlchemySponsorshipLimitError(error);
    if (shouldRetryUnsponsored) {
      console.log("AA sponsorship unavailable. Retrying AA with user-funded gas...");
      providerState = await createCliProviderState({
        decision,
        chain: primaryChain,
        privateKey,
        rpcUrl: rpcUrl != null ? rpcUrl : "",
        callList,
        sponsored: false
      });
      try {
        return {
          execution: await runExecution(providerState),
          finalDecision: decision
        };
      } catch (retryError) {
        error = retryError;
      }
    }
    const useEoa = await promptForEoaFallback();
    if (!useEoa) {
      throw error;
    }
    const eoaDecision = { execution: "eoa" };
    console.log("Retrying with EOA execution...");
    const eoaProviderState = await createCliProviderState({
      decision: eoaDecision,
      chain: primaryChain,
      privateKey,
      rpcUrl: rpcUrl != null ? rpcUrl : "",
      callList
    });
    return {
      execution: await runExecution(eoaProviderState),
      finalDecision: eoaDecision
    };
  }
}
async function signCommand(runtime) {
  var _a3, _b;
  const txIds = runtime.parsed.positional;
  if (txIds.length === 0) {
    fatal(
      "Usage: aomi sign <tx-id> [<tx-id> ...]\nRun `aomi tx` to see pending transaction IDs."
    );
  }
  const privateKey = runtime.config.privateKey;
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
  const state = readState();
  if (!state) {
    fatal("No active session. Run `aomi chat` first.");
  }
  rewriteSessionState(runtime, state);
  const pendingTxs = requirePendingTxs(state, txIds);
  const session = createSessionFromState(state);
  try {
    const account = privateKeyToAccount2(privateKey);
    if (state.publicKey && account.address.toLowerCase() !== state.publicKey.toLowerCase()) {
      console.log(
        `\u26A0\uFE0F  Signer ${account.address} differs from session public key ${state.publicKey}`
      );
      console.log("   Updating session to match the signing key...");
    }
    const rpcUrl = runtime.config.chainRpcUrl;
    const resolvedChainIds = pendingTxs.map((tx) => {
      var _a4, _b2;
      return (_b2 = (_a4 = tx.chainId) != null ? _a4 : state.chainId) != null ? _b2 : 1;
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
        if ((_a3 = tx.chainId) != null ? _a3 : state.chainId) console.log(`Chain:   ${(_b = tx.chainId) != null ? _b : state.chainId}`);
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
      const decision = resolveCliExecutionDecision({
        config: runtime.config,
        chain,
        callList
      });
      console.log(`Exec:    ${describeExecutionDecision(decision)}`);
      const { execution, finalDecision } = await executeTransactionWithFallback({
        decision,
        privateKey,
        currentChainId: primaryChainId,
        chainsById,
        primaryChain: chain,
        rpcUrl,
        callList
      });
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
      const typedData = pendingTx.payload.typed_data;
      if (!typedData) {
        fatal("EIP-712 request is missing typed_data payload.");
      }
      if (pendingTx.description) {
        console.log(`Desc:    ${pendingTx.description}`);
      }
      if (typedData.primaryType) {
        console.log(`Type:    ${typedData.primaryType}`);
      }
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
    await persistResolvedSignerState(
      session,
      state,
      account.address,
      primaryChainId
    );
    for (const txId of txIds) {
      removePendingTx(state, txId);
    }
    const freshState = readState();
    for (const signedRecord of signedRecords) {
      addSignedTx(freshState, signedRecord);
    }
    for (const backendNotification of backendNotifications) {
      await session.client.sendSystemMessage(
        state.sessionId,
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

// src/cli/main.ts
function printUsage() {
  console.log(`
aomi \u2014 CLI client for Aomi on-chain agent

Usage:
  aomi chat <message>   Send a message and print the response
  aomi chat --model <rig>
                        Set the session model before sending the message
  aomi chat --verbose   Stream agent responses, tool calls, and events live
  aomi models           List models available to the current backend
  aomi model set <rig>  Set the active model for the current session
  aomi sessions         List local sessions with metadata tables
  aomi session resume <id>
                        Resume a local session (session-id or session-N)
  aomi session delete <id>
                        Delete a local session file (session-id or session-N)
  aomi log              Show full conversation history with tool results
  aomi tx               List pending and signed transactions
  aomi sign <tx-id> [<tx-id> ...] [--aa | --eoa] [--aa-provider <name>] [--aa-mode <mode>]
                        Sign and submit a pending transaction
  aomi status           Show current session state
  aomi events           List system events
  aomi close            Close the current session

Options:
  --backend-url <url>   Backend URL (default: https://api.aomi.dev)
  --api-key <key>       API key for non-default apps
  --app <name>          App (default: "default")
  --model <rig>         Set the active model for this session
  --public-key <addr>   Wallet address (so the agent knows your wallet)
  --private-key <key>   Hex private key for signing
  --rpc-url <url>       RPC URL for transaction submission
  --verbose, -v         Show tool calls and streaming output (for chat)

Sign options:
  aomi sign <tx-id> --aa
                        Require account-abstraction execution (default)
  aomi sign <tx-id> --eoa
                        Force plain EOA execution
  aomi sign <tx-id> --aa-provider <name>
                        AA provider: alchemy | pimlico
  aomi sign <tx-id> --aa-mode <mode>
                        AA mode: 4337 | 7702

Environment (overridden by flags):
  AOMI_BASE_URL         Backend URL
  AOMI_API_KEY          API key
  AOMI_APP              App
  AOMI_MODEL            Model rig
  AOMI_PUBLIC_KEY       Wallet address
  AOMI_AA_PROVIDER      AA provider: alchemy | pimlico
  AOMI_AA_MODE          AA mode: 4337 | 7702
  ALCHEMY_API_KEY       Alchemy AA API key
  ALCHEMY_GAS_POLICY_ID
                        Optional Alchemy gas sponsorship policy ID
  PIMLICO_API_KEY       Pimlico AA API key
  PRIVATE_KEY           Hex private key for signing
  CHAIN_RPC_URL         RPC URL for transaction submission
`.trim());
}
async function main(runtime) {
  var _a3;
  const command = (_a3 = runtime.parsed.command) != null ? _a3 : runtime.parsed.flags["help"] || runtime.parsed.flags["h"] ? "help" : void 0;
  switch (command) {
    case "chat":
      await chatCommand(runtime);
      break;
    case "log":
      await logCommand(runtime);
      break;
    case "models":
      await modelsCommand(runtime);
      break;
    case "model":
      await modelCommand(runtime);
      break;
    case "sessions":
      await sessionsCommand(runtime);
      break;
    case "session":
      sessionCommand(runtime);
      break;
    case "tx":
      txCommand();
      break;
    case "sign":
      await signCommand(runtime);
      break;
    case "status":
      await statusCommand(runtime);
      break;
    case "events":
      await eventsCommand(runtime);
      break;
    case "close":
      closeCommand(runtime);
      break;
    case "help":
      printUsage();
      break;
    default:
      printUsage();
      if (command) {
        throw new CliExit(1);
      }
  }
}
function isPnpmExecWrapper() {
  var _a3, _b;
  const npmCommand = (_a3 = process.env.npm_command) != null ? _a3 : "";
  const userAgent = (_b = process.env.npm_config_user_agent) != null ? _b : "";
  return npmCommand === "exec" && userAgent.includes("pnpm/");
}
async function runCli(argv = process.argv) {
  const runtime = createRuntime(argv);
  const RED = "\x1B[31m";
  const RESET3 = "\x1B[0m";
  const strictExit = process.env.AOMI_CLI_STRICT_EXIT === "1";
  try {
    await main(runtime);
  } catch (err) {
    if (err instanceof CliExit) {
      if (!strictExit && isPnpmExecWrapper()) {
        return;
      }
      process.exit(err.code);
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${RED}\u274C ${message}${RESET3}`);
    process.exit(1);
  }
}

// src/cli.ts
void runCli();
