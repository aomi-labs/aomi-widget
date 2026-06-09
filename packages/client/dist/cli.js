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
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/cli/errors.ts
var errors_exports = {};
__export(errors_exports, {
  CliExit: () => CliExit,
  fatal: () => fatal
});
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
var monad, monadTestnet, SUPPORTED_CHAINS, SUPPORTED_CHAIN_IDS, CHAIN_NAMES, ALCHEMY_CHAIN_SLUGS, CHAINS_BY_ID;
var init_chains = __esm({
  "src/chains.ts"() {
    "use strict";
    monad = defineChain({
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
    monadTestnet = defineChain({
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
    SUPPORTED_CHAINS = [
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
    SUPPORTED_CHAIN_IDS = SUPPORTED_CHAINS.map((chain) => chain.id);
    CHAIN_NAMES = Object.fromEntries(
      SUPPORTED_CHAINS.map((chain) => [chain.id, chain.name])
    );
    ALCHEMY_CHAIN_SLUGS = {
      1: "eth-mainnet",
      137: "polygon-mainnet",
      42161: "arb-mainnet",
      8453: "base-mainnet",
      10: "opt-mainnet",
      11155111: "eth-sepolia",
      59144: "linea-mainnet",
      59141: "linea-sepolia"
    };
    CHAINS_BY_ID = {
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
  }
});

// src/cli/validation.ts
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
var init_validation = __esm({
  "src/cli/validation.ts"() {
    "use strict";
    init_chains();
    init_errors();
  }
});

// src/cli/commands/defs/shared.ts
import { privateKeyToAccount } from "viem/accounts";
function parseAccountProvider(raw) {
  if (!raw) return void 0;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "para" || normalized === "privy") {
    return normalized;
  }
  fatal(`Unknown --account-provider value "${raw}". Use "para" or "privy".`);
}
function parseSvmCluster(raw) {
  if (!raw) return void 0;
  const lower = raw.trim().toLowerCase();
  switch (lower) {
    case "mainnet-beta":
    case "mainnet":
    case "solana:mainnet":
      return "solana:mainnet";
    case "devnet":
    case "solana:devnet":
      return "solana:devnet";
    case "testnet":
    case "solana:testnet":
      return "solana:testnet";
    default:
      fatal(`Unknown --cluster value "${raw}". Use "mainnet-beta", "devnet", or "testnet".`);
  }
}
function str(value) {
  return typeof value === "string" && value.trim() ? value : void 0;
}
function derivePublicKeyFromPrivateKey(privateKey) {
  if (!privateKey) return void 0;
  try {
    return privateKeyToAccount(privateKey).address;
  } catch (e) {
    fatal("Invalid private key. Pass a 32-byte hex key via `--private-key` or `PRIVATE_KEY`.");
  }
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
  var _a3, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
  const execution = resolveExecution(args);
  const privateKey = normalizePrivateKey(
    (_a3 = str(args["private-key"])) != null ? _a3 : process.env.PRIVATE_KEY
  );
  const configuredPublicKey = (_b = str(args["public-key"])) != null ? _b : process.env.AOMI_PUBLIC_KEY;
  const derivedPublicKey = derivePublicKeyFromPrivateKey(privateKey);
  const accountAccessToken = (_c = str(args["account-bearer"])) != null ? _c : process.env.AOMI_ACCOUNT_BEARER;
  const accountProvider = parseAccountProvider(
    (_d = str(args["account-provider"])) != null ? _d : process.env.AOMI_ACCOUNT_PROVIDER
  );
  const accountProviderToken = (_e = str(args["account-provider-token"])) != null ? _e : process.env.AOMI_ACCOUNT_PROVIDER_TOKEN;
  if (configuredPublicKey && derivedPublicKey && configuredPublicKey.toLowerCase() !== derivedPublicKey.toLowerCase()) {
    fatal("`--public-key` does not match the address derived from `--private-key`.");
  }
  const aaProvider = parseAAProvider(
    (_f = str(args["aa-provider"])) != null ? _f : process.env.AOMI_AA_PROVIDER
  );
  const aaMode2 = parseAAMode(
    (_g = str(args["aa-mode"])) != null ? _g : process.env.AOMI_AA_MODE
  );
  if (execution === "eoa" && (aaProvider || aaMode2)) {
    fatal("`--aa-provider` and `--aa-mode` cannot be used with `--eoa`.");
  }
  if (accountAccessToken && (accountProvider || accountProviderToken)) {
    fatal(
      "Choose either `--account-bearer` or the `--account-provider` + `--account-provider-token` pair."
    );
  }
  if (accountProvider && !accountProviderToken) {
    fatal(
      "`--account-provider-token` is required when `--account-provider` is set."
    );
  }
  if (accountProviderToken && !accountProvider) {
    fatal(
      "`--account-provider` is required when `--account-provider-token` is set."
    );
  }
  const solanaPrivateKey = (_h = str(args["solana-private-key"])) != null ? _h : process.env.SOLANA_PRIVATE_KEY;
  const svmCluster = parseSvmCluster(
    (_i = str(args.cluster)) != null ? _i : process.env.AOMI_SOLANA_CLUSTER
  );
  return {
    baseUrl: (_j = str(args["backend-url"])) != null ? _j : process.env.AOMI_BACKEND_URL,
    apiKey: (_k = str(args["api-key"])) != null ? _k : process.env.AOMI_API_KEY,
    accountAccessToken,
    accountProvider,
    accountProviderToken,
    app: (_l = str(args.app)) != null ? _l : process.env.AOMI_APP,
    model: (_m = str(args.model)) != null ? _m : process.env.AOMI_MODEL,
    freshSession: args["new-session"] === true,
    publicKey: configuredPublicKey != null ? configuredPublicKey : derivedPublicKey,
    privateKey,
    solanaPrivateKey,
    svmCluster,
    chainRpcUrl: (_n = str(args["rpc-url"])) != null ? _n : process.env.CHAIN_RPC_URL,
    chain: parseChainId((_o = str(args.chain)) != null ? _o : process.env.AOMI_CHAIN_ID),
    secrets: {},
    execution,
    aaProvider,
    aaMode: aaMode2
  };
}
function getPositionals(args) {
  const positionals = args._;
  if (!Array.isArray(positionals)) {
    return [];
  }
  return positionals.filter((value) => typeof value === "string");
}
var globalArgs;
var init_shared = __esm({
  "src/cli/commands/defs/shared.ts"() {
    "use strict";
    init_errors();
    init_validation();
    globalArgs = {
      "backend-url": {
        type: "string",
        description: "Backend URL (default: https://api.aomi.dev)"
      },
      "api-key": {
        type: "string",
        description: "API key for non-default apps"
      },
      "account-bearer": {
        type: "string",
        description: "Aomi account bearer for authenticated REST/SSE requests"
      },
      "account-provider": {
        type: "string",
        description: 'Upstream account provider for bearer exchange ("para" or "privy")'
      },
      "account-provider-token": {
        type: "string",
        description: "Provider-issued token exchanged for an Aomi account bearer"
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
      "solana-private-key": {
        type: "string",
        description: "Solana keypair secret (base58 secret key, or JSON byte array) for signing solana_sign requests"
      },
      cluster: {
        type: "string",
        description: 'Solana cluster override: "mainnet-beta" (default), "devnet", or "testnet". Also accepts CAIP-2 form "solana:mainnet" / "solana:devnet" / "solana:testnet".'
      },
      "rpc-url": {
        type: "string",
        description: "RPC URL for transaction submission"
      }
    };
  }
});

// src/user-state/normalize.ts
function asObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return void 0;
  }
  return value;
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
  renameKey(c, "primaryFamily", "primary_family");
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
  return Object.keys(c).length ? c : void 0;
}
function buildEvm(src, flat) {
  var _a3, _b;
  const e = __spreadValues({}, src != null ? src : {});
  renameKey(e, "chainId", "chain_id");
  renameKey(e, "ensName", "ens_name");
  const aa = __spreadValues({}, (_a3 = asObject(e.aa)) != null ? _a3 : {});
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
    const cid = parseChainId2(e.chain_id);
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
  return Object.keys(s).length ? s : void 0;
}
function buildPending(src, flat) {
  var _a3, _b, _c;
  const p = {};
  assignDefined(
    p,
    "evm_txs",
    snakeizeBucket(
      (_a3 = pick(src, "evm_txs", "evmTxs")) != null ? _a3 : pick(flat, "pending_txs", "pendingTxs")
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
function parseChainId2(value) {
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
  var _a3;
  const value = (_a3 = asObject(state == null ? void 0 : state.evm)) == null ? void 0 : _a3.address;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function svmAddress(state) {
  var _a3;
  const value = (_a3 = asObject(state == null ? void 0 : state.svm)) == null ? void 0 : _a3.address;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function chainId(state) {
  var _a3;
  return parseChainId2((_a3 = asObject(state == null ? void 0 : state.evm)) == null ? void 0 : _a3.chain_id);
}
function isConnected(state) {
  var _a3;
  const value = (_a3 = asObject(state == null ? void 0 : state.connection)) == null ? void 0 : _a3.is_connected;
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
  const evm = buildEvm(asObject(pick(src, "evm")), src);
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
var OPAQUE_PENDING_KEYS;
var init_normalize = __esm({
  "src/user-state/normalize.ts"() {
    "use strict";
    OPAQUE_PENDING_KEYS = /* @__PURE__ */ new Set(["typed_data", "typedData", "domain"]);
  }
});

// src/user-state/accessors.ts
function asObject2(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return void 0;
  }
  return value;
}
function evmBlock(userState) {
  var _a3;
  return asObject2((_a3 = normalizeUserState(userState)) == null ? void 0 : _a3.evm);
}
function svmBlock(userState) {
  var _a3;
  return asObject2((_a3 = normalizeUserState(userState)) == null ? void 0 : _a3.svm);
}
function connBlock(userState) {
  var _a3;
  return asObject2((_a3 = normalizeUserState(userState)) == null ? void 0 : _a3.connection);
}
function aaBlock(userState) {
  var _a3;
  return asObject2((_a3 = evmBlock(userState)) == null ? void 0 : _a3.aa);
}
function sponsorshipBlock(userState) {
  var _a3;
  return asObject2((_a3 = evmBlock(userState)) == null ? void 0 : _a3.sponsorship);
}
function parseChainId3(value) {
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
function address2(userState) {
  var _a3;
  const value = (_a3 = evmBlock(userState)) == null ? void 0 : _a3.address;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function svmAddress2(userState) {
  var _a3;
  const value = (_a3 = svmBlock(userState)) == null ? void 0 : _a3.address;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function preferredPublicKey(userState) {
  var _a3;
  return (_a3 = address2(userState)) != null ? _a3 : svmAddress2(userState);
}
function chainId2(userState) {
  var _a3;
  return parseChainId3((_a3 = evmBlock(userState)) == null ? void 0 : _a3.chain_id);
}
function ensName(userState) {
  var _a3;
  const value = (_a3 = evmBlock(userState)) == null ? void 0 : _a3.ens_name;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function aaMode(userState) {
  var _a3;
  const value = (_a3 = aaBlock(userState)) == null ? void 0 : _a3.mode;
  if (value === null) return null;
  return value === "none" || value === "4337" || value === "7702" ? value : void 0;
}
function SmartAccount4337(userState) {
  var _a3;
  return optionalAddress((_a3 = aaBlock(userState)) == null ? void 0 : _a3.smart_account);
}
function Delegation7702(userState) {
  var _a3;
  return optionalAddress((_a3 = aaBlock(userState)) == null ? void 0 : _a3.delegation_7702);
}
function walletKind(userState) {
  const addr = address2(userState);
  if (!addr) return void 0;
  const smartAccount = SmartAccount4337(userState);
  return smartAccount && addr.toLowerCase() === smartAccount.toLowerCase() ? "smart-account" : "eoa";
}
function isConnected2(userState) {
  var _a3;
  const value = (_a3 = connBlock(userState)) == null ? void 0 : _a3.is_connected;
  return typeof value === "boolean" ? value : void 0;
}
function walletProvider(userState) {
  var _a3;
  const value = (_a3 = connBlock(userState)) == null ? void 0 : _a3.provider;
  if (value === null) return null;
  return value === "para" || value === "privy" || value === "baseAccount" ? value : void 0;
}
function walletProviderSubject(userState) {
  var _a3;
  return optionalString((_a3 = connBlock(userState)) == null ? void 0 : _a3.wallet_provider_subject);
}
function authMethod(userState) {
  var _a3;
  const value = (_a3 = connBlock(userState)) == null ? void 0 : _a3.auth_method;
  if (value === null) return null;
  return typeof value === "string" && AUTH_METHODS.has(value) ? value : void 0;
}
function authValue(userState) {
  var _a3;
  return optionalString((_a3 = connBlock(userState)) == null ? void 0 : _a3.auth_value);
}
function authVerifiedAt(userState) {
  var _a3;
  return timestamp((_a3 = connBlock(userState)) == null ? void 0 : _a3.auth_verified_at);
}
function sponsored(userState) {
  var _a3;
  const value = (_a3 = sponsorshipBlock(userState)) == null ? void 0 : _a3.sponsored;
  if (value === null) return null;
  return typeof value === "boolean" ? value : void 0;
}
function sponsorProvider(userState) {
  var _a3;
  const value = (_a3 = sponsorshipBlock(userState)) == null ? void 0 : _a3.sponsor_provider;
  if (value === null) return null;
  return value === "alchemy" || value === "coinbase" || value === "pimlico" || value === "self" ? value : void 0;
}
function sponsorAccount(userState) {
  var _a3;
  return optionalAddress((_a3 = sponsorshipBlock(userState)) == null ? void 0 : _a3.sponsor_account);
}
function withExt(userState, key, value) {
  var _a3, _b;
  const normalizedUserState = (_a3 = normalizeUserState(userState)) != null ? _a3 : {};
  const currentExt = (_b = asObject2(normalizedUserState.ext)) != null ? _b : {};
  return __spreadProps(__spreadValues({}, normalizedUserState), {
    ext: __spreadProps(__spreadValues({}, currentExt), {
      [key]: value
    })
  });
}
var AUTH_METHODS, evmAddress;
var init_accessors = __esm({
  "src/user-state/accessors.ts"() {
    "use strict";
    init_normalize();
    AUTH_METHODS = /* @__PURE__ */ new Set([
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
    evmAddress = address2;
  }
});

// src/user-state/index.ts
var CLIENT_TYPE_TS_CLI, UserState;
var init_user_state = __esm({
  "src/user-state/index.ts"() {
    "use strict";
    init_accessors();
    init_normalize();
    CLIENT_TYPE_TS_CLI = "ts_cli";
    ((UserState2) => {
      UserState2.normalize = normalizeUserState;
      UserState2.reconcile = reconcileUserState;
      UserState2.address = address2;
      UserState2.evmAddress = evmAddress;
      UserState2.svmAddress = svmAddress2;
      UserState2.preferredPublicKey = preferredPublicKey;
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
  }
});

// src/user-state.ts
var init_user_state2 = __esm({
  "src/user-state.ts"() {
    "use strict";
    init_user_state();
  }
});

// src/sse.ts
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
        const headers = new Headers(getHeaders(sessionId));
        if (subscription.lastEventId) {
          headers.set("Last-Event-ID", subscription.lastEventId);
        }
        const response = await fetchImpl(`${backendUrl}/api/updates`, {
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
            var _a4, _b;
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
  const reconnect = (reason) => {
    var _a3;
    for (const subscription of subscriptions.values()) {
      if (!subscription.stopped) {
        (_a3 = subscription.abortController) == null ? void 0 : _a3.abort(reason);
      }
    }
  };
  return { subscribe, reconnect };
}
var MAX_SEEN_EVENT_IDS;
var init_sse = __esm({
  "src/sse.ts"() {
    "use strict";
    MAX_SEEN_EVENT_IDS = 256;
  }
});

// src/client.ts
function previewText(value, max = 80) {
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= max) return singleLine;
  return `${singleLine.slice(0, max - 1)}\u2026`;
}
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
    params.set(key, value);
  }
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}
function withSessionHeader(sessionId, init) {
  const headers = new Headers(init);
  headers.set(SESSION_ID_HEADER, sessionId);
  return headers;
}
async function fetchStateResponse(fetchImpl, url, sessionId) {
  return fetchImpl(url, {
    headers: withSessionHeader(sessionId)
  });
}
function wrapFetchWithAccountBearer(fetchImpl, getAccountAccessToken) {
  if (!getAccountAccessToken) return fetchImpl;
  return async (input2, init) => {
    var _a3;
    const baseHeaders = new Headers(
      (_a3 = init == null ? void 0 : init.headers) != null ? _a3 : input2 instanceof Request ? input2.headers : void 0
    );
    const fetchWithBearer = async (forceRefresh) => {
      const headers = new Headers(baseHeaders);
      let accessToken;
      try {
        accessToken = await getAccountAccessToken({ forceRefresh });
      } catch (e) {
        accessToken = void 0;
      }
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
      return fetchImpl(input2, __spreadProps(__spreadValues({}, init), { headers }));
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
  const url = `${baseUrl}${path}`;
  const body = JSON.stringify(payload);
  const headers = new Headers(withSessionHeader(sessionId));
  headers.set("Content-Type", "application/json");
  if (apiKey) {
    headers.set(APP_KEY_HEADER, apiKey);
  }
  logger == null ? void 0 : logger.debug("[aomi][client] POST start", {
    path,
    sessionId,
    hasApiKey: Boolean(apiKey),
    bodyLength: body.length
  });
  let pendingWarning;
  if (typeof setTimeout === "function") {
    pendingWarning = setTimeout(() => {
      logger == null ? void 0 : logger.debug("[aomi][client] POST still pending", {
        path,
        sessionId,
        bodyLength: body.length
      });
    }, 5e3);
  }
  let response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers,
      body
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
var SESSION_ID_HEADER, APP_KEY_HEADER, BULKY_PENDING_FIELDS, AomiClient;
var init_client = __esm({
  "src/client.ts"() {
    "use strict";
    init_user_state2();
    init_sse();
    SESSION_ID_HEADER = "X-Session-Id";
    APP_KEY_HEADER = "AOMI-APP-KEY";
    BULKY_PENDING_FIELDS = /* @__PURE__ */ new Set([
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
    AomiClient = class {
      constructor(options) {
        var _a3;
        this.baseUrl = options.baseUrl.replace(/\/+$/, "");
        this.apiKey = options.apiKey;
        const fetchImpl = (_a3 = options.fetch) != null ? _a3 : globalThis.fetch.bind(globalThis);
        const rawFetchImpl = typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : fetchImpl;
        this.fetchImpl = wrapFetchWithAccountBearer(
          fetchImpl,
          options.getAccountAccessToken
        );
        this.rawFetchImpl = wrapFetchWithAccountBearer(
          rawFetchImpl,
          options.getAccountAccessToken
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
        if (supportsTokenRefreshSubscription(options.getAccountAccessToken)) {
          options.getAccountAccessToken.subscribe(() => {
            this.sseSubscriber.reconnect("account-token-refreshed");
          });
        }
      }
      // ===========================================================================
      // Chat & State
      // ===========================================================================
      /**
       * Fetch current session state (messages, processing status, title).
       */
      async fetchState(sessionId, userState, clientId) {
        var _a3, _b, _c;
        const normalizedUserState = stripBulkyPendingFields(
          UserState.normalize(userState)
        );
        const urlWithSyncParams = buildApiUrl(this.baseUrl, "/api/state", {
          user_state: normalizedUserState ? JSON.stringify(normalizedUserState) : void 0,
          client_id: clientId
        });
        const bareUrl = buildApiUrl(this.baseUrl, "/api/state");
        const shouldRetryWithoutSyncParams = Boolean(normalizedUserState) || Boolean(clientId);
        (_a3 = this.logger) == null ? void 0 : _a3.debug("[aomi][client] GET /api/state start", {
          sessionId,
          clientId,
          hasUserState: Boolean(normalizedUserState)
        });
        let response = await fetchStateResponse(
          this.rawFetchImpl,
          urlWithSyncParams,
          sessionId
        );
        if (!response.ok && shouldRetryWithoutSyncParams && (response.status === 400 || response.status === 414)) {
          (_b = this.logger) == null ? void 0 : _b.debug("[aomi][client] GET /api/state retrying without sync params", {
            sessionId,
            initialStatus: response.status,
            hadClientId: Boolean(clientId),
            hadUserState: Boolean(normalizedUserState)
          });
          response = await fetchStateResponse(this.rawFetchImpl, bareUrl, sessionId);
        }
        (_c = this.logger) == null ? void 0 : _c.debug("[aomi][client] GET /api/state response", {
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
        var _a3, _b, _c;
        const app = (_a3 = options == null ? void 0 : options.app) != null ? _a3 : "default";
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
        (_c = this.logger) == null ? void 0 : _c.debug("[aomi][client] POST /api/chat prepared", {
          sessionId,
          app,
          publicKey: options == null ? void 0 : options.publicKey,
          clientId: options == null ? void 0 : options.clientId,
          hasUserState: Boolean(normalizedUserState),
          messagePreview: previewText(message)
        });
        return postState(
          this.baseUrl,
          "/api/chat",
          payload,
          sessionId,
          this.fetchImpl,
          apiKey,
          this.logger
        );
      }
      /**
       * Send a system-level message (e.g. wallet state changes, context switches).
       * Pass `app` to preserve the session's active app context (prevents the
       * backend from resetting to the default app when no app is specified).
       */
      async sendSystemMessage(sessionId, message, options) {
        var _a3;
        const payload = { message };
        if (options == null ? void 0 : options.app) {
          payload.app = options.app;
        }
        (_a3 = this.logger) == null ? void 0 : _a3.debug("[aomi][client] POST /api/system prepared", {
          sessionId,
          app: options == null ? void 0 : options.app,
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
        var _a3;
        (_a3 = this.logger) == null ? void 0 : _a3.debug("[aomi][client] POST /api/interrupt prepared", {
          sessionId
        });
        return postState(
          this.baseUrl,
          "/api/interrupt",
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
       * @deprecated Account bootstrap is handled by session create/chat requests and
       * the account-token exchange. `/api/settings/account` is now an authenticated
       * profile endpoint, so this legacy helper intentionally does nothing.
       */
      async ensureAccount(_sessionId, _publicKey) {
        return void 0;
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
        var _a3;
        const url = buildApiUrl(this.baseUrl, "/api/control/apps", {
          public_key: options == null ? void 0 : options.publicKey
        });
        const apiKey = (_a3 = options == null ? void 0 : options.apiKey) != null ? _a3 : this.apiKey;
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
        return data.map((item) => {
          if (typeof item === "string") {
            return { name: item };
          }
          if (item && typeof item === "object" && "name" in item) {
            const name = item.name;
            if (typeof name === "string" && name.trim().length > 0) {
              return item;
            }
          }
          return null;
        }).filter((item) => item !== null);
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
        var _a3;
        const apiKey = (_a3 = options == null ? void 0 : options.apiKey) != null ? _a3 : this.apiKey;
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
        var _a3;
        const url = buildApiUrl(this.baseUrl, "/api/control/provider-keys");
        const response = await this.fetchImpl(url, {
          headers: withSessionHeader(sessionId)
        });
        if (!response.ok) {
          throw new Error(`Failed to get BYOK keys: HTTP ${response.status}`);
        }
        const data = await response.json();
        return (_a3 = data.byok_keys) != null ? _a3 : [];
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
          var _a3, _b;
          return {
            to: transaction.to,
            value: transaction.value,
            data: transaction.data,
            label: transaction.label,
            chain_id: (_b = (_a3 = transaction.chain_id) != null ? _a3 : transaction.chainId) != null ? _b : options == null ? void 0 : options.chainId
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
  }
});

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
var init_types = __esm({
  "src/types.ts"() {
    "use strict";
    init_user_state2();
    init_user_state2();
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
var init_json = __esm({
  "src/session/json.ts"() {
    "use strict";
  }
});

// src/wallet-utils.ts
import { getAddress } from "viem";
function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  return value;
}
function pendingTxsFromUserState(userState) {
  var _a3, _b;
  const normalized = UserState.normalize(userState);
  const pending = asRecord(normalized == null ? void 0 : normalized.pending);
  return (_b = asRecord(pending == null ? void 0 : pending.evm_txs)) != null ? _b : asRecord((_a3 = asRecord(userState)) == null ? void 0 : _a3.pending_txs);
}
function getToolArgs(payload) {
  var _a3;
  const root2 = asRecord(payload);
  const nestedArgs = asRecord(root2 == null ? void 0 : root2.args);
  return (_a3 = nestedArgs != null ? nestedArgs : root2) != null ? _a3 : {};
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
function parseChainId4(value) {
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
  var _a3, _b, _c, _d, _e, _f, _g;
  const root2 = asRecord(payload);
  const args = getToolArgs(payload);
  const ctx = asRecord(root2 == null ? void 0 : root2.ctx);
  const txIds = parseTxIds((_a3 = args.tx_ids) != null ? _a3 : args.txIds);
  if (txIds.length === 0) return null;
  const to = normalizeAddress(args.to);
  const value = parseValue(args.value);
  const data = typeof args.data === "string" ? args.data : void 0;
  const chainId3 = (_d = (_c = (_b = parseChainId4(args.chainId)) != null ? _b : parseChainId4(args.chain_id)) != null ? _c : parseChainId4(ctx == null ? void 0 : ctx.user_chain_id)) != null ? _d : parseChainId4(ctx == null ? void 0 : ctx.userChainId);
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
  var _a3, _b, _c, _d, _e, _f, _g;
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
      chainId: (_b = (_a3 = parseChainId4(pendingEntry.chain_id)) != null ? _a3 : parseChainId4(pendingEntry.chainId)) != null ? _b : parseChainId4(payload.chainId),
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
  var _a3, _b, _c, _d;
  const args = getToolArgs(payload);
  const unsignedTxRaw = (_a3 = args.unsigned_tx) != null ? _a3 : args.unsignedTx;
  const unsignedTx = typeof unsignedTxRaw === "string" ? unsignedTxRaw : void 0;
  const description = typeof args.description === "string" ? args.description : void 0;
  const clusterRaw = args.cluster;
  const cluster = typeof clusterRaw === "string" ? clusterRaw : void 0;
  const pendingSolanaId = (_d = (_c = (_b = parsePendingId(args.pendingSolanaId)) != null ? _b : parsePendingId(args.pending_solana_id)) != null ? _c : parsePendingId(args.pendingSvmSigId)) != null ? _d : parsePendingId(args.pending_svm_sig_id);
  return { unsignedTx, description, cluster, pendingSolanaId };
}
function normalizeSolanaSignMessagePayload(payload) {
  var _a3, _b, _c, _d, _e;
  const args = getToolArgs(payload);
  const messageRaw = (_b = (_a3 = args.message_base64) != null ? _a3 : args.messageBase64) != null ? _b : args.message;
  const message = typeof messageRaw === "string" ? messageRaw : void 0;
  const description = typeof args.description === "string" ? args.description : void 0;
  const clusterRaw = args.cluster;
  const cluster = typeof clusterRaw === "string" ? clusterRaw : void 0;
  const pendingSolanaId = (_e = (_d = (_c = parsePendingId(args.pendingSolanaId)) != null ? _c : parsePendingId(args.pending_solana_id)) != null ? _d : parsePendingId(args.pendingSvmSigId)) != null ? _e : parsePendingId(args.pending_svm_sig_id);
  return { message, description, cluster, pendingSolanaId };
}
function normalizeSolanaWalletRequest(payload) {
  var _a3;
  const root2 = asRecord(payload);
  const args = getToolArgs(payload);
  const solanaRequest = __spreadValues(__spreadValues({}, root2 != null ? root2 : {}), args);
  const chainKind = (_a3 = parseChainKind(args.chain_kind)) != null ? _a3 : parseChainKind(root2 == null ? void 0 : root2.chain_kind);
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
  var _a3, _b, _c, _d, _e;
  const args = getToolArgs(payload);
  const typedDataRaw = (_b = (_a3 = args.typed_data) != null ? _a3 : args["712_typed_data"]) != null ? _b : args.typedData;
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
  var _a3, _b;
  const calls = ((_a3 = payload.calls) == null ? void 0 : _a3.length) ? payload.calls : payload.to ? [
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
    var _a4, _b2, _c;
    return {
      to: call.to,
      value: BigInt((_a4 = call.value) != null ? _a4 : "0"),
      data: call.data ? call.data : void 0,
      chainId: (_c = (_b2 = call.chainId) != null ? _b2 : payload.chainId) != null ? _c : defaultChainId
    };
  });
}
function toAAWalletCall(payload, defaultChainId = 1) {
  return toAAWalletCalls(payload, defaultChainId)[0];
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
function toViemSignMessageArgs(payload) {
  const nonTypedData = payload.non_typed_data;
  if (typeof nonTypedData !== "string" || nonTypedData.length === 0) {
    return null;
  }
  return {
    message: isHexBytes(nonTypedData) ? { raw: nonTypedData } : nonTypedData
  };
}
var init_wallet_utils = __esm({
  "src/wallet-utils.ts"() {
    "use strict";
    init_user_state2();
  }
});

// src/session/events.ts
function applySessionState(state, deps) {
  var _a3;
  if (state.user_state) {
    deps.resolveUserState(state.user_state);
  }
  if (state.messages) {
    deps.setMessages(state.messages);
    deps.emit("messages", state.messages);
  }
  if (state.title) {
    deps.setTitle(state.title);
  }
  if ((_a3 = state.system_events) == null ? void 0 : _a3.length) {
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
  var _a3, _b, _c, _d, _e, _f, _g;
  for (const event of events) {
    const unwrapped = unwrapSystemEvent(event);
    if (!unwrapped) continue;
    if (unwrapped.type === "wallet_tx_request") {
      const solanaRequest = normalizeSolanaWalletRequest((_a3 = unwrapped.payload) != null ? _a3 : {});
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
var init_events = __esm({
  "src/session/events.ts"() {
    "use strict";
    init_event();
    init_wallet_utils();
  }
});

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
  var _a3, _b, _c;
  const resolvedAAMode = (_a3 = aa == null ? void 0 : aa.aaMode) != null ? _a3 : (aa == null ? void 0 : aa.smartAccount) === address3 ? "4337" : "none";
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
var init_state = __esm({
  "src/session/state.ts"() {
    "use strict";
    init_user_state2();
    init_json();
  }
});

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
var init_policy = __esm({
  "src/aa/policy.ts"() {
    "use strict";
  }
});

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
var SessionWalletController;
var init_wallet = __esm({
  "src/session/wallet.ts"() {
    "use strict";
    init_policy();
    init_wallet_utils();
    SessionWalletController = class {
      constructor(deps) {
        this.deps = deps;
        this.requests = [];
        this.nextId = 1;
        this.resolvedRequestIds = /* @__PURE__ */ new Set();
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
        var _a3;
        const id = this.requestId(kind, payload);
        const existing = this.requests.find((request) => request.id === id);
        const timestamp2 = (_a3 = existing == null ? void 0 : existing.timestamp) != null ? _a3 : Date.now();
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
        this.remove(requestId);
        this.resolvedRequestIds.add(requestId);
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
          }), req.payload.pendingSolanaId !== void 0 ? { pending_solana_id: req.payload.pendingSolanaId } : {}));
        } else if (req.kind === "solana_sign_message" && result.kind === "solana_sign_message") {
          await this.deps.sendSystemEvent("wallet::solana_sign_message_complete", __spreadValues(__spreadProps(__spreadValues({
            status: "signed",
            signature: result.signature
          }, req.payload.message !== void 0 ? { message: req.payload.message } : {}), {
            description: req.payload.description
          }), req.payload.pendingSolanaId !== void 0 ? { pending_solana_id: req.payload.pendingSolanaId } : {}));
        } else if (req.kind === "solana_send" && result.kind === "solana_send") {
          await this.deps.sendSystemEvent("wallet::solana_send_complete", __spreadValues(__spreadProps(__spreadValues({
            status: "submitted",
            signature: result.signature,
            signed_tx: result.signedTx
          }, req.payload.unsignedTx !== void 0 ? { unsigned_tx: req.payload.unsignedTx } : {}), {
            description: req.payload.description
          }), req.payload.pendingSolanaId !== void 0 ? { pending_solana_id: req.payload.pendingSolanaId } : {}));
        } else if (req.kind === "solana_sign_and_send" && result.kind === "solana_sign_and_send") {
          await this.deps.sendSystemEvent("wallet::solana_sign_and_send_complete", __spreadValues(__spreadProps(__spreadValues({
            status: "submitted",
            signature: result.signature,
            signed_tx: result.signedTx
          }, req.payload.unsignedTx !== void 0 ? { unsigned_tx: req.payload.unsignedTx } : {}), {
            description: req.payload.description
          }), req.payload.pendingSolanaId !== void 0 ? { pending_solana_id: req.payload.pendingSolanaId } : {}));
        }
      }
      async reject(requestId, reason) {
        const req = this.remove(requestId);
        if (!req) {
          throw new Error(`No pending wallet request with id "${requestId}"`);
        }
        this.resolvedRequestIds.add(requestId);
        if (req.kind === "transaction") {
          const pendingTxIds = txIdsFromPayload(req.payload);
          const requestedMode = aaRequestedModeFromPreference(req.payload.aaPreference);
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
          }), req.payload.pendingSolanaId !== void 0 ? { pending_solana_id: req.payload.pendingSolanaId } : {}));
        } else if (req.kind === "solana_sign_message") {
          await this.deps.sendSystemEvent("wallet::solana_sign_message_complete", __spreadValues(__spreadProps(__spreadValues({
            status: "rejected",
            error: reason != null ? reason : "Request rejected"
          }, req.payload.message !== void 0 ? { message: req.payload.message } : {}), {
            description: req.payload.description
          }), req.payload.pendingSolanaId !== void 0 ? { pending_solana_id: req.payload.pendingSolanaId } : {}));
        } else if (req.kind === "solana_send") {
          await this.deps.sendSystemEvent("wallet::solana_send_complete", __spreadValues(__spreadProps(__spreadValues({
            status: "rejected",
            error: reason != null ? reason : "Request rejected"
          }, req.payload.unsignedTx !== void 0 ? { unsigned_tx: req.payload.unsignedTx } : {}), {
            description: req.payload.description
          }), req.payload.pendingSolanaId !== void 0 ? { pending_solana_id: req.payload.pendingSolanaId } : {}));
        } else {
          await this.deps.sendSystemEvent("wallet::solana_sign_and_send_complete", __spreadValues(__spreadProps(__spreadValues({
            status: "rejected",
            error: reason != null ? reason : "Request rejected"
          }, req.payload.unsignedTx !== void 0 ? { unsigned_tx: req.payload.unsignedTx } : {}), {
            description: req.payload.description
          }), req.payload.pendingSolanaId !== void 0 ? { pending_solana_id: req.payload.pendingSolanaId } : {}));
        }
      }
      async resolveTransaction(payload, result) {
        var _a3, _b, _c, _d, _e, _f, _g;
        const pendingTxIds = txIdsFromPayload(payload);
        const requestedMode = (_a3 = result.aaRequestedMode) != null ? _a3 : aaRequestedModeFromPreference(payload.aaPreference);
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
      syncTransactions(next, pendingTxs) {
        var _a3, _b;
        const entries = Object.entries(pendingTxs != null ? pendingTxs : {}).filter(([id]) => Number.isInteger(Number(id))).sort((left, right) => Number(left[0]) - Number(right[0]));
        const pendingIds = new Set(entries.map(([id]) => Number(id)));
        const covered = /* @__PURE__ */ new Set();
        const existing = this.requests.filter(
          (request) => request.kind === "transaction"
        ).map((request) => ({ request, txIds: txIdsFromPayload(request.payload) })).filter(({ txIds }) => txIds.length > 0 && txIds.every((id) => pendingIds.has(id))).sort(
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
            timestamp: (_b = (_a3 = this.requests.find((request) => request.id === requestId)) == null ? void 0 : _a3.timestamp) != null ? _b : Date.now()
          });
        }
      }
      syncEip712(next, pendingEip712s) {
        var _a3, _b;
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
            timestamp: (_b = (_a3 = this.requests.find((request) => request.id === requestId)) == null ? void 0 : _a3.timestamp) != null ? _b : Date.now()
          });
        }
      }
      syncSolana(next, pendingSolanaRequests) {
        var _a3, _b;
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
              (_b = (_a3 = this.requests.find((request) => request.id === requestId)) == null ? void 0 : _a3.timestamp) != null ? _b : Date.now()
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
          if (typeof pendingSolanaId === "number") return `${kind}-${pendingSolanaId}`;
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
  }
});

// src/session/index.ts
function legacySessionPublicKey(userState) {
  var _a3;
  const address3 = UserState.address(userState);
  if (!(address3 == null ? void 0 : address3.startsWith("0x"))) {
    return void 0;
  }
  if (UserState.chainId(userState) === void 0 && !((_a3 = userState == null ? void 0 : userState.evm) == null ? void 0 : _a3.address)) {
    return void 0;
  }
  return address3;
}
var ClientSession;
var init_session = __esm({
  "src/session/index.ts"() {
    "use strict";
    init_client();
    init_user_state2();
    init_event();
    init_json();
    init_events();
    init_state();
    init_wallet();
    init_policy();
    ClientSession = class extends TypedEventEmitter {
      constructor(clientOrOptions, sessionOptions) {
        var _a3, _b, _c, _d, _e;
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
        this.sessionId = (_a3 = sessionOptions == null ? void 0 : sessionOptions.sessionId) != null ? _a3 : crypto.randomUUID();
        this.app = (_b = sessionOptions == null ? void 0 : sessionOptions.app) != null ? _b : "default";
        this.publicKey = sessionOptions == null ? void 0 : sessionOptions.publicKey;
        this.apiKey = sessionOptions == null ? void 0 : sessionOptions.apiKey;
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
          publicKey: this.publicKey,
          apiKey: this.apiKey,
          userState: this.userState,
          clientId: this.clientId
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
        await this.walletController.resolve(requestId, result);
        if (this._isProcessing) {
          this.startPolling();
        }
      }
      /**
       * Reject a pending wallet request.
       * Sends an error to the backend and resumes polling.
       */
      async reject(requestId, reason) {
        await this.walletController.reject(requestId, reason);
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
        var _a3;
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
        (_a3 = this.unsubscribeSSE) == null ? void 0 : _a3.call(this);
        this.unsubscribeSSE = null;
      }
      syncRuntimeOptions(options) {
        var _a3;
        this.app = options.app;
        this.publicKey = options.publicKey;
        this.apiKey = options.apiKey;
        this.clientId = (_a3 = options.clientId) != null ? _a3 : this.clientId;
        if (options.userState) {
          this.resolveUserState(options.userState);
        }
      }
      resolveUserState(userState, opts) {
        const previousSerialized = stableUserStateString(this.userState);
        this.userState = UserState.reconcile(this.userState, userState);
        const nextSerialized = stableUserStateString(this.userState);
        const publicKey = legacySessionPublicKey(this.userState);
        const isConnected3 = UserState.isConnected(this.userState);
        if (publicKey && isConnected3 !== false) {
          this.publicKey = publicKey;
        } else {
          this.publicKey = void 0;
        }
        this.walletController.sync();
        if (!(opts == null ? void 0 : opts.skipEmit) && this.userState && previousSerialized !== nextSerialized) {
          this.emit("user_state_updated", this.userState);
        }
      }
      setClientType(clientType) {
        var _a3;
        this.resolveUserState(
          UserState.withExt((_a3 = this.userState) != null ? _a3 : {}, "client_type", clientType)
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
          this.clientId
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
          if (!state.is_processing && this.walletController.length === 0) {
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
        applySessionState(state, {
          userState: () => this.userState,
          resolveUserState: (userState) => this.resolveUserState(userState),
          setMessages: (messages) => {
            this._messages = messages;
          },
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
          app: this.app
        });
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
  }
});

// src/session.ts
var init_session2 = __esm({
  "src/session.ts"() {
    "use strict";
    init_session();
  }
});

// src/account-session.ts
function createAccountAccessTokenProvider({
  baseUrl,
  getProviderCredential,
  fetch: fetchImpl = fetch,
  now = Date.now,
  refreshBeforeExpiryMs = DEFAULT_REFRESH_BEFORE_EXPIRY_MS
}) {
  let cached = null;
  let pending = null;
  let refreshTimer = null;
  let failedAt = null;
  const listeners = /* @__PURE__ */ new Set();
  const scheduleRefresh = (session) => {
    if (refreshTimer) clearTimeout(refreshTimer);
    const refreshAt = session.expires_at * 1e3 - refreshBeforeExpiryMs;
    refreshTimer = setTimeout(
      () => {
        void getAccountAccessToken({ forceRefresh: true }).catch(
          () => void 0
        );
      },
      Math.max(refreshAt - now(), 1e3)
    );
  };
  const exchange = async () => {
    const credential = await getProviderCredential();
    const response = await fetchImpl(
      `${baseUrl.replace(/\/+$/, "")}/api/account/sessions/exchange`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: credential.provider,
          provider_token: credential.providerToken
        })
      }
    );
    if (!response.ok) {
      throw new Error(
        `Failed to exchange account credential: HTTP ${response.status}`
      );
    }
    return await response.json();
  };
  const getAccountAccessToken = async ({
    forceRefresh = false
  } = {}) => {
    var _a3;
    const refreshAt = cached ? cached.expires_at * 1e3 - refreshBeforeExpiryMs : 0;
    if (!forceRefresh && cached && now() < refreshAt) {
      return cached.access_token;
    }
    if (!forceRefresh && failedAt !== null && now() - failedAt < FAILURE_COOLDOWN_MS) {
      return void 0;
    }
    if (!pending) {
      pending = exchange().then((next) => {
        failedAt = null;
        const previous = cached;
        cached = next;
        scheduleRefresh(next);
        if (previous && (previous.access_token !== next.access_token || previous.expires_at !== next.expires_at)) {
          for (const listener of listeners) listener();
        }
        return next;
      }).catch(() => {
        failedAt = now();
        return null;
      }).finally(() => {
        pending = null;
      });
    }
    return (_a3 = await pending) == null ? void 0 : _a3.access_token;
  };
  getAccountAccessToken.subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  getAccountAccessToken.dispose = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = null;
    listeners.clear();
  };
  return getAccountAccessToken;
}
var DEFAULT_REFRESH_BEFORE_EXPIRY_MS, FAILURE_COOLDOWN_MS;
var init_account_session = __esm({
  "src/account-session.ts"() {
    "use strict";
    DEFAULT_REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1e3;
    FAILURE_COOLDOWN_MS = 30 * 1e3;
  }
});

// src/cli/client-factory.ts
function resolveCliBaseUrl(config) {
  var _a3;
  return (_a3 = config.baseUrl) != null ? _a3 : DEFAULT_BACKEND_URL;
}
function createCliGetAccountAccessToken(config) {
  if (config.accountAccessToken) {
    return async () => config.accountAccessToken;
  }
  if (!config.accountProvider || !config.accountProviderToken) {
    return void 0;
  }
  return createAccountAccessTokenProvider({
    baseUrl: resolveCliBaseUrl(config),
    getProviderCredential: async () => ({
      provider: config.accountProvider,
      providerToken: config.accountProviderToken
    })
  });
}
function createCliClient(config, overrides = {}) {
  var _a3, _b;
  const mergedConfig = __spreadProps(__spreadValues({}, config), {
    baseUrl: (_a3 = overrides.baseUrl) != null ? _a3 : config.baseUrl,
    apiKey: (_b = overrides.apiKey) != null ? _b : config.apiKey
  });
  return new AomiClient({
    baseUrl: resolveCliBaseUrl(mergedConfig),
    apiKey: mergedConfig.apiKey,
    getAccountAccessToken: createCliGetAccountAccessToken(mergedConfig)
  });
}
var DEFAULT_BACKEND_URL;
var init_client_factory = __esm({
  "src/cli/client-factory.ts"() {
    "use strict";
    init_account_session();
    init_client();
    DEFAULT_BACKEND_URL = "https://api.aomi.dev";
  }
});

// src/cli/user-state.ts
import { getAddress as getAddress2 } from "viem";
function asRecord2(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return void 0;
  }
  return value;
}
function parsePendingId2(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : void 0;
}
function parseOptionalString(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function parseChainId5(value) {
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
function normalizeMaybeAddress(value) {
  if (typeof value !== "string" || !value.trim()) {
    return void 0;
  }
  try {
    return getAddress2(value);
  } catch (e) {
    return value;
  }
}
function pendingDisplayId(id) {
  return `tx-${id}`;
}
function txTimestamp(existingById, id, fallbackNow) {
  var _a3, _b;
  return (_b = (_a3 = existingById.get(id)) == null ? void 0 : _a3.timestamp) != null ? _b : fallbackNow;
}
function buildCliUserState(publicKey, chainId3, options) {
  var _a3, _b, _c;
  const app = (_a3 = options == null ? void 0 : options.app) == null ? void 0 : _a3.trim().toLowerCase();
  const evm = {};
  const publicKeyIsSolana = publicKey !== void 0 && !publicKey.trim().startsWith("0x");
  const publicKeyIsEvm = publicKey !== void 0 && publicKey.trim().startsWith("0x");
  const svmAddress3 = (_b = options == null ? void 0 : options.svmAddress) != null ? _b : publicKeyIsSolana ? publicKey : void 0;
  const hasBoth = publicKeyIsEvm && svmAddress3 !== void 0;
  const isSolanaApp = !hasBoth && !publicKeyIsEvm && (app === "sol" || app === "solana" || app === "svm" || app === "byreal" || publicKeyIsSolana || svmAddress3 !== void 0);
  const hasEvm = hasBoth || !isSolanaApp && publicKeyIsEvm;
  const hasSvm = hasBoth || isSolanaApp;
  const userState = {};
  if (hasEvm && publicKey !== void 0) {
    evm.address = publicKey;
  }
  if (hasEvm && chainId3 !== void 0) {
    evm.chain_id = chainId3;
  }
  if (hasEvm) {
    if ((options == null ? void 0 : options.aaMode) === "4337" || (options == null ? void 0 : options.aaMode) === "7702") {
      const aaState = { mode: options.aaMode };
      if (options.smartAccount != null) {
        aaState.smart_account = options.smartAccount;
      }
      evm.aa = aaState;
    } else if ((options == null ? void 0 : options.aaMode) === null) {
      evm.aa = { mode: "none" };
    }
  }
  if (Object.keys(evm).length > 0) {
    userState.evm = evm;
  }
  if (hasSvm) {
    userState.svm = {
      address: svmAddress3 != null ? svmAddress3 : publicKey,
      cluster: (_c = options == null ? void 0 : options.svmCluster) != null ? _c : svmAddress3 !== void 0 ? "solana:mainnet" : void 0
    };
  }
  const anyConnected = Boolean(
    hasEvm && publicKey !== void 0 || hasSvm && (svmAddress3 != null ? svmAddress3 : publicKey) !== void 0
  );
  if (anyConnected) {
    userState.connection = {
      is_connected: true,
      primary_family: hasBoth ? "dual" : hasSvm ? "svm" : "evm"
    };
  }
  return UserState.withExt(userState, "client_type", CLIENT_TYPE_TS_CLI);
}
function pendingTxsFromBackendUserState(userState, existingPendingTxs = []) {
  var _a3, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  const normalizedUserState = UserState.normalize(userState);
  if (!normalizedUserState) {
    return [];
  }
  const existingById = new Map(existingPendingTxs.map((tx) => [tx.id, tx]));
  const fallbackNow = Date.now();
  const nextPendingTxs = [];
  const pending = (_a3 = asRecord2(normalizedUserState.pending)) != null ? _a3 : {};
  const pendingTxs = (_c = (_b = asRecord2(pending.evmTxs)) != null ? _b : asRecord2(pending.evm_txs)) != null ? _c : {};
  for (const [rawId, rawValue] of Object.entries(pendingTxs)) {
    const pendingId = parsePendingId2(rawId);
    const tx = asRecord2(rawValue);
    if (!pendingId || !tx) {
      continue;
    }
    const id = pendingDisplayId(pendingId);
    const to = normalizeMaybeAddress(tx.to);
    if (!to) {
      continue;
    }
    const data = normalizePendingTxData(tx);
    nextPendingTxs.push({
      id,
      kind: "transaction",
      txId: pendingId,
      to,
      value: parseOptionalString(tx.value),
      data,
      chainId: parseChainId5((_d = tx.chainId) != null ? _d : tx.chain_id),
      description: parseOptionalString(tx.label),
      timestamp: txTimestamp(existingById, id, fallbackNow),
      payload: {
        pending_tx_id: pendingId,
        txId: pendingId,
        to,
        value: parseOptionalString(tx.value),
        data,
        chain_id: parseChainId5((_e = tx.chainId) != null ? _e : tx.chain_id),
        chainId: parseChainId5((_f = tx.chainId) != null ? _f : tx.chain_id),
        description: parseOptionalString(tx.label)
      }
    });
  }
  const pendingEip712s = (_h = (_g = asRecord2(pending.evmSigs)) != null ? _g : asRecord2(pending.evm_sigs)) != null ? _h : {};
  for (const [rawId, rawValue] of Object.entries(pendingEip712s)) {
    const pendingId = parsePendingId2(rawId);
    const request = asRecord2(rawValue);
    if (!pendingId || !request) {
      continue;
    }
    const id = pendingDisplayId(pendingId);
    const description = parseOptionalString(request.description);
    const typedData = (_i = request.typedData) != null ? _i : request.typed_data;
    const chainId3 = parseChainId5((_j = request.chainId) != null ? _j : request.chain_id);
    nextPendingTxs.push({
      id,
      kind: "eip712_sign",
      eip712Id: pendingId,
      chainId: chainId3,
      description,
      timestamp: txTimestamp(existingById, id, fallbackNow),
      payload: {
        pending_eip712_id: pendingId,
        eip712Id: pendingId,
        typed_data: typedData,
        non_typed_data: parseOptionalString(request.non_typed_data),
        description
      }
    });
  }
  nextPendingTxs.sort((left, right) => {
    const leftId = left.kind === "transaction" ? left.txId : left.eip712Id;
    const rightId = right.kind === "transaction" ? right.txId : right.eip712Id;
    return (leftId != null ? leftId : Number.MAX_SAFE_INTEGER) - (rightId != null ? rightId : Number.MAX_SAFE_INTEGER);
  });
  return nextPendingTxs;
}
function pendingSolTxsFromBackendUserState(userState, existingPendingSolTxs = []) {
  var _a3, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s;
  const normalizedUserState = UserState.normalize(userState);
  if (!normalizedUserState) {
    return [];
  }
  const existingById = new Map(existingPendingSolTxs.map((tx) => [tx.id, tx]));
  const fallbackNow = Date.now();
  const next = [];
  const pending = (_a3 = asRecord2(normalizedUserState.pending)) != null ? _a3 : {};
  const pendingSolanaTxs = (_e = (_d = (_c = (_b = asRecord2(pending.solanaTxs)) != null ? _b : asRecord2(pending.solana_txs)) != null ? _c : asRecord2(pending.svmIxs)) != null ? _d : asRecord2(pending.svm_ixs)) != null ? _e : {};
  for (const [rawId, rawValue] of Object.entries(pendingSolanaTxs)) {
    const pendingId = parsePendingId2(rawId);
    const request = asRecord2(rawValue);
    if (!pendingId || !request) {
      continue;
    }
    const unsignedTx = (_f = parseOptionalString(request.unsignedTx)) != null ? _f : parseOptionalString(request.unsigned_tx);
    if (!unsignedTx) {
      continue;
    }
    const id = pendingDisplayId(pendingId);
    const description = parseOptionalString(request.description);
    const cluster = parseOptionalString(request.cluster);
    const signer = parseOptionalString(request.signer);
    next.push({
      id,
      solanaId: pendingId,
      unsignedTx,
      cluster,
      signer,
      description,
      timestamp: (_h = (_g = existingById.get(id)) == null ? void 0 : _g.timestamp) != null ? _h : fallbackNow,
      payload: {
        pending_solana_id: pendingId,
        pendingSolanaId: pendingId,
        unsigned_tx: unsignedTx,
        unsignedTx,
        cluster,
        description,
        signer
      }
    });
  }
  const pendingSolanaSigs = (_p = (_o = (_m = (_k = asRecord2((_i = normalizedUserState.pending) == null ? void 0 : _i.solanaSigs)) != null ? _k : asRecord2((_j = normalizedUserState.pending) == null ? void 0 : _j.solana_sigs)) != null ? _m : asRecord2((_l = normalizedUserState.pending) == null ? void 0 : _l.svmSigs)) != null ? _o : asRecord2((_n = normalizedUserState.pending) == null ? void 0 : _n.svm_sigs)) != null ? _p : {};
  for (const [rawId, rawValue] of Object.entries(pendingSolanaSigs)) {
    const pendingId = parsePendingId2(rawId);
    const request = asRecord2(rawValue);
    if (!pendingId || !request) {
      continue;
    }
    const unsignedTx = (_q = parseOptionalString(request.unsigned_tx)) != null ? _q : parseOptionalString(request.unsignedTx);
    if (!unsignedTx) {
      continue;
    }
    const id = pendingDisplayId(pendingId);
    const description = parseOptionalString(request.description);
    const signer = parseOptionalString(request.signer);
    const cluster = parseOptionalString(request.cluster);
    next.push({
      id,
      solanaId: pendingId,
      unsignedTx,
      cluster,
      signer,
      description,
      timestamp: (_s = (_r = existingById.get(id)) == null ? void 0 : _r.timestamp) != null ? _s : fallbackNow,
      payload: {
        pending_solana_id: pendingId,
        pendingSolanaId: pendingId,
        unsigned_tx: unsignedTx,
        unsignedTx,
        cluster,
        description,
        signer
      }
    });
  }
  next.sort((left, right) => left.solanaId - right.solanaId);
  return next;
}
function walletSnapshotFromUserState(userState) {
  const address3 = UserState.address(userState);
  const isConnected3 = UserState.isConnected(userState);
  const sessionAAMode = UserState.aaMode(userState);
  const walletKind2 = UserState.walletKind(userState);
  const aaMode2 = sessionAAMode === "4337" || sessionAAMode === "7702" ? sessionAAMode : sessionAAMode === "none" ? null : void 0;
  const smartAccount = walletKind2 === "smart-account" ? address3 != null ? address3 : null : null;
  return {
    publicKey: isConnected3 === false ? void 0 : address3,
    chainId: UserState.chainId(userState),
    aaMode: aaMode2,
    smartAccount
  };
}
var init_user_state3 = __esm({
  "src/cli/user-state.ts"() {
    "use strict";
    init_user_state2();
    init_wallet_utils();
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
function getBackendPendingId(tx) {
  return tx.kind === "transaction" ? tx.txId : tx.eip712Id;
}
function hasSameBackendPendingId(existing, next) {
  const existingBackendId = getBackendPendingId(existing);
  const nextBackendId = getBackendPendingId(next);
  return existing.kind === next.kind && existingBackendId !== void 0 && nextBackendId !== void 0 && existingBackendId === nextBackendId;
}
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
    modelSynced: stored.modelSynced,
    apiKey: stored.apiKey,
    publicKey: stored.publicKey,
    privateKey: stored.privateKey,
    svmPublicKey: stored.svmPublicKey,
    svmPrivateKey: stored.svmPrivateKey,
    chainId: stored.chainId,
    aaMode: stored.aaMode,
    smartAccount: stored.smartAccount,
    pendingTxs: stored.pendingTxs,
    pendingSolTxs: stored.pendingSolTxs,
    signedTxs: stored.signedTxs,
    signedSolTxs: stored.signedSolTxs,
    secretHandles: stored.secretHandles
  };
}
function normalizeSignedTx(tx) {
  var _b;
  const _a3 = tx, { AAAddress: _legacyAAAddress } = _a3, rest = __objRest(_a3, ["AAAddress"]);
  return __spreadProps(__spreadValues({}, rest), {
    smartAccount4337: (_b = tx.smartAccount4337) != null ? _b : tx.AAAddress
  });
}
function normalizeSignedTxs(signedTxs) {
  return signedTxs == null ? void 0 : signedTxs.map(normalizeSignedTx);
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
      privateKey: parsed.privateKey,
      svmPublicKey: parsed.svmPublicKey,
      svmPrivateKey: parsed.svmPrivateKey,
      chainId: parsed.chainId,
      aaMode: parsed.aaMode,
      smartAccount: parsed.smartAccount,
      pendingTxs: parsed.pendingTxs,
      pendingSolTxs: parsed.pendingSolTxs,
      signedTxs: normalizeSignedTxs(parsed.signedTxs),
      signedSolTxs: parsed.signedSolTxs,
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
      signedTxs: normalizeSignedTxs(legacy.signedTxs),
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
function hasSameSolanaPendingId(existing, next) {
  return existing.solanaId === next.solanaId;
}
function syncPendingTxsFromUserState(state, userState) {
  var _a3, _b;
  const normalizedUserState = UserState.normalize(userState);
  const walletSnapshot = walletSnapshotFromUserState(normalizedUserState);
  const isConnected3 = UserState.isConnected(normalizedUserState);
  if (walletSnapshot.publicKey !== void 0) {
    state.publicKey = walletSnapshot.publicKey;
  } else if (isConnected3 === false) {
    state.publicKey = void 0;
  }
  if (walletSnapshot.chainId !== void 0) {
    state.chainId = walletSnapshot.chainId;
  } else if (isConnected3 === false) {
    state.chainId = void 0;
  }
  if (walletSnapshot.aaMode !== void 0) {
    state.aaMode = walletSnapshot.aaMode;
  } else if (isConnected3 === false) {
    state.aaMode = null;
  }
  if (walletSnapshot.smartAccount !== void 0) {
    state.smartAccount = walletSnapshot.smartAccount;
  } else if (isConnected3 === false) {
    state.smartAccount = null;
  }
  state.pendingTxs = pendingTxsFromBackendUserState(
    normalizedUserState,
    (_a3 = state.pendingTxs) != null ? _a3 : []
  );
  state.pendingSolTxs = pendingSolTxsFromBackendUserState(
    normalizedUserState,
    (_b = state.pendingSolTxs) != null ? _b : []
  );
  writeState(state);
  return {
    pendingTxs: state.pendingTxs,
    pendingSolTxs: state.pendingSolTxs
  };
}
var SESSION_FILE_PREFIX, SESSION_FILE_SUFFIX, _a, LEGACY_STATE_FILE, _a2, STATE_ROOT_DIR, SESSIONS_DIR, ACTIVE_SESSION_FILE, _migrationDone;
var init_state2 = __esm({
  "src/cli/state.ts"() {
    "use strict";
    init_user_state2();
    init_user_state3();
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

// src/cli/solana-signer.ts
import {
  Keypair,
  Transaction,
  VersionedTransaction
} from "@solana/web3.js";
import bs58 from "bs58";
function parseSolanaKeypairSecret(input2) {
  const trimmed = input2.trim();
  if (!trimmed) {
    throw new Error("Solana keypair secret is empty.");
  }
  let bytes;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "number")) {
      throw new Error(
        "Solana keypair JSON must be an array of byte values (e.g. `[1,2,...,64]`)."
      );
    }
    bytes = Uint8Array.from(parsed);
  } else {
    try {
      bytes = bs58.decode(trimmed);
    } catch (err) {
      throw new Error(
        `Failed to decode Solana keypair as base58: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  if (bytes.length !== 64) {
    throw new Error(
      `Solana keypair secret must be 64 bytes (got ${bytes.length}). Use the full secret key, not just the seed.`
    );
  }
  return Keypair.fromSecretKey(bytes);
}
function decodeBase64(value) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
function encodeBase64(bytes) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function signSolanaTransaction(unsignedTxBase64, keypair) {
  const bytes = decodeBase64(unsignedTxBase64);
  try {
    const versioned = VersionedTransaction.deserialize(bytes);
    versioned.sign([keypair]);
    return {
      signer: keypair.publicKey.toBase58(),
      signedTxBase64: encodeBase64(versioned.serialize())
    };
  } catch (versionedErr) {
    try {
      const legacy = Transaction.from(bytes);
      legacy.partialSign(keypair);
      return {
        signer: keypair.publicKey.toBase58(),
        signedTxBase64: encodeBase64(legacy.serialize())
      };
    } catch (legacyErr) {
      const versionedMsg = versionedErr instanceof Error ? versionedErr.message : String(versionedErr);
      const legacyMsg = legacyErr instanceof Error ? legacyErr.message : String(legacyErr);
      throw new Error(
        `Failed to deserialize Solana transaction (versioned: ${versionedMsg}; legacy: ${legacyMsg}).`
      );
    }
  }
}
var init_solana_signer = __esm({
  "src/cli/solana-signer.ts"() {
    "use strict";
  }
});

// src/cli/cli-session.ts
var CliSession;
var init_cli_session = __esm({
  "src/cli/cli-session.ts"() {
    "use strict";
    init_session2();
    init_client_factory();
    init_state2();
    init_user_state3();
    init_errors();
    init_solana_signer();
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
          const existing2 = _CliSession.load();
          return _CliSession.create(config, existing2 == null ? void 0 : existing2.toState());
        }
        const existing = _CliSession.load();
        if (existing) {
          existing.mergeConfig(config);
          return existing;
        }
        return _CliSession.create(config);
      }
      /** Create a fresh session and persist it. */
      static create(config, seed) {
        var _a3, _b, _c, _d, _e, _f, _g, _h, _i;
        let svmPublicKey;
        if (config.solanaPrivateKey) {
          try {
            svmPublicKey = parseSolanaKeypairSecret(config.solanaPrivateKey).publicKey.toBase58();
          } catch (e) {
          }
        }
        const state = {
          sessionId: crypto.randomUUID(),
          clientId: crypto.randomUUID(),
          baseUrl: (_b = (_a3 = config.baseUrl) != null ? _a3 : seed == null ? void 0 : seed.baseUrl) != null ? _b : "https://api.aomi.dev",
          app: (_c = config.app) != null ? _c : seed == null ? void 0 : seed.app,
          model: (_d = config.model) != null ? _d : seed == null ? void 0 : seed.model,
          apiKey: (_e = config.apiKey) != null ? _e : seed == null ? void 0 : seed.apiKey,
          publicKey: (_f = config.publicKey) != null ? _f : seed == null ? void 0 : seed.publicKey,
          privateKey: (_g = config.privateKey) != null ? _g : seed == null ? void 0 : seed.privateKey,
          svmPublicKey: svmPublicKey != null ? svmPublicKey : seed == null ? void 0 : seed.svmPublicKey,
          // Carry forward the persisted Solana private key so `wallet set --solana`
          // survives `--new-session` — signing key is a user preference, not a
          // per-session artifact.
          svmPrivateKey: (_h = config.solanaPrivateKey) != null ? _h : seed == null ? void 0 : seed.svmPrivateKey,
          chainId: (_i = config.chain) != null ? _i : seed == null ? void 0 : seed.chainId,
          secretHandles: seed == null ? void 0 : seed.secretHandles
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
      get modelSynced() {
        return this.state.modelSynced === true;
      }
      get apiKey() {
        return this.state.apiKey;
      }
      get publicKey() {
        return this.state.publicKey;
      }
      get privateKey() {
        return this.state.privateKey;
      }
      get svmPublicKey() {
        return this.state.svmPublicKey;
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
      get pendingSolTxs() {
        var _a3;
        return (_a3 = this.state.pendingSolTxs) != null ? _a3 : [];
      }
      get signedSolTxs() {
        var _a3;
        return (_a3 = this.state.signedSolTxs) != null ? _a3 : [];
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
      /**
       * Apply config overrides (baseUrl, app, apiKey, publicKey, chain). Only
       * persists if something changed. Fields left `undefined` on the input are
       * NOT clobbered — settings commands like `wallet set` pass partial configs
       * and must not wipe out an existing `baseUrl`.
       */
      mergeConfig(config) {
        let changed = false;
        if (config.baseUrl !== void 0 && config.baseUrl !== this.state.baseUrl) {
          this.state.baseUrl = config.baseUrl;
          changed = true;
        }
        if (config.app !== void 0 && config.app !== this.state.app) {
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
        if (config.solanaPrivateKey !== void 0) {
          try {
            const svmPub = parseSolanaKeypairSecret(config.solanaPrivateKey).publicKey.toBase58();
            if (svmPub !== this.state.svmPublicKey) {
              this.state.svmPublicKey = svmPub;
              changed = true;
            }
          } catch (e) {
          }
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
        this.state.modelSynced = true;
        this.save();
      }
      setPublicKey(key) {
        this.state.publicKey = key;
        this.save();
      }
      setBaseUrl(url) {
        this.state.baseUrl = url;
        this.save();
      }
      setPrivateKey(key) {
        this.state.privateKey = key;
        this.save();
      }
      setWallet(privateKey, publicKey) {
        this.state.privateKey = privateKey;
        this.state.publicKey = publicKey;
        this.save();
      }
      setSvmWallet(privateKey, publicKey) {
        this.state.svmPrivateKey = privateKey;
        this.state.svmPublicKey = publicKey;
        this.save();
      }
      /** The Solana private key to use for signing. Prefers the transiently-
       * supplied `solanaPrivateKey` from `CliConfig` (i.e. `--solana-private-key`)
       * and falls back to the key persisted by `wallet set --solana`. */
      resolvedSvmPrivateKey(fromConfig) {
        return fromConfig != null ? fromConfig : this.state.svmPrivateKey;
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
          (existing) => hasSameBackendPendingId(existing, tx)
        );
        if (isDuplicate) return null;
        const pending = __spreadProps(__spreadValues({}, tx), {
          id: this.getDisplayTxId(tx)
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
      /** Add a pending Solana tx with dedup on `solanaId`. */
      addPendingSolTx(tx) {
        if (!this.state.pendingSolTxs) this.state.pendingSolTxs = [];
        const isDuplicate = this.state.pendingSolTxs.some(
          (existing) => hasSameSolanaPendingId(existing, tx)
        );
        if (isDuplicate) return null;
        const pending = __spreadProps(__spreadValues({}, tx), {
          id: `tx-${tx.solanaId}`
        });
        this.state.pendingSolTxs.push(pending);
        this.save();
        return pending;
      }
      removePendingSolTx(id) {
        if (!this.state.pendingSolTxs) return null;
        const idx = this.state.pendingSolTxs.findIndex((tx) => tx.id === id);
        if (idx === -1) return null;
        const [removed] = this.state.pendingSolTxs.splice(idx, 1);
        this.save();
        return removed;
      }
      addSignedSolTx(tx) {
        if (!this.state.signedSolTxs) this.state.signedSolTxs = [];
        this.state.signedSolTxs.push(tx);
        this.save();
      }
      syncPendingFromUserState(userState) {
        const result = syncPendingTxsFromUserState(this.state, userState);
        this.reload();
        return result;
      }
      /** Find a pending Solana tx by display id, or undefined if unknown. */
      findPendingSolTx(txId) {
        var _a3;
        return ((_a3 = this.state.pendingSolTxs) != null ? _a3 : []).find((tx) => tx.id === txId);
      }
      /** Find a pending EVM/EIP-712 tx by display id, or undefined. */
      findPendingTx(txId) {
        var _a3;
        return ((_a3 = this.state.pendingTxs) != null ? _a3 : []).find((tx) => tx.id === txId);
      }
      /** Get a pending tx by ID, or fatal() if not found. */
      requirePendingTx(txId) {
        var _a3;
        const pending = (_a3 = this.state.pendingTxs) != null ? _a3 : [];
        const tx = pending.find((t) => t.id === txId);
        if (!tx) {
          const available = this.allDisplayIds().join(", ") || "(none)";
          fatal(`Transaction "${txId}" not found.
Available: ${available}`);
        }
        return tx;
      }
      /** Get multiple pending txs by ID, or fatal() if any missing or duplicates. */
      requirePendingTxs(txIds) {
        const uniqueIds = Array.from(new Set(txIds));
        if (uniqueIds.length !== txIds.length) {
          fatal("Duplicate transaction IDs are not allowed in a single `aomi tx sign` call.");
        }
        return uniqueIds.map((txId) => this.requirePendingTx(txId));
      }
      /** Get a pending Solana tx by ID, or fatal() if not found. */
      requirePendingSolTx(txId) {
        const tx = this.findPendingSolTx(txId);
        if (!tx) {
          const available = this.allDisplayIds().join(", ") || "(none)";
          fatal(`Solana transaction "${txId}" not found.
Available: ${available}`);
        }
        return tx;
      }
      allDisplayIds() {
        var _a3, _b;
        return [
          ...((_a3 = this.state.pendingTxs) != null ? _a3 : []).map((tx) => tx.id),
          ...((_b = this.state.pendingSolTxs) != null ? _b : []).map((tx) => tx.id)
        ];
      }
      // ---------------------------------------------------------------------------
      // Bridge to ClientSession
      // ---------------------------------------------------------------------------
      /** Build a ClientSession from the current state. */
      createClientSession(config = {}) {
        var _a3, _b;
        const session = new ClientSession(
          createCliClient(
            __spreadProps(__spreadValues({}, config), {
              baseUrl: this.state.baseUrl,
              apiKey: this.state.apiKey
            }),
            {
              baseUrl: this.state.baseUrl,
              apiKey: this.state.apiKey
            }
          ),
          {
            sessionId: this.state.sessionId,
            clientId: this.state.clientId,
            app: this.state.app,
            apiKey: this.state.apiKey,
            publicKey: this.state.publicKey
          }
        );
        session.resolveUserState(buildCliUserState(this.state.publicKey, this.state.chainId, {
          app: this.state.app,
          aaMode: (_a3 = this.state.aaMode) != null ? _a3 : null,
          smartAccount: (_b = this.state.smartAccount) != null ? _b : null,
          svmAddress: this.state.svmPublicKey
        }));
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
      getDisplayTxId(tx) {
        if (typeof tx.txId === "number") return `tx-${tx.txId}`;
        if (typeof tx.eip712Id === "number") return `tx-${tx.eip712Id}`;
        return this.getNextTxId();
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
    init_state2();
    DIM = "\x1B[2m";
    CYAN = "\x1B[36m";
    YELLOW = "\x1B[33m";
    GREEN = "\x1B[32m";
    RESET = "\x1B[0m";
  }
});

// src/cli/context.ts
function createControlClient(config) {
  return createCliClient(config);
}
async function ingestSecretsForSession(config, cli, client) {
  const secrets = config.secrets;
  if (Object.keys(secrets).length === 0) return {};
  const clientId = cli.ensureClientId();
  const response = await client.ingestSecrets(
    cli.sessionId,
    clientId,
    secrets
  );
  cli.addSecretHandles(response.handles);
  return response.handles;
}
async function applyRequestedModelIfPresent(config, cli, session) {
  const requestedModel = config.model;
  if (!requestedModel) {
    return;
  }
  const alreadySynced = cli.modelSynced && requestedModel === cli.model;
  if (alreadySynced) {
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
    init_client_factory();
  }
});

// src/cli/commands/chat.ts
var chat_exports = {};
__export(chat_exports, {
  chatCommand: () => chatCommand,
  shouldBroadcastWalletStateChange: () => shouldBroadcastWalletStateChange,
  syncWalletStateForChat: () => syncWalletStateForChat
});
function normalizeAddress2(address3) {
  return address3 == null ? void 0 : address3.toLowerCase();
}
function extractMentionedTxIds(content) {
  var _a3;
  if (!content) return [];
  const matches = (_a3 = content.match(/\btx-\d+\b/gi)) != null ? _a3 : [];
  return Array.from(new Set(matches.map((id) => id.toLowerCase()))).sort();
}
function deriveSvmAddress(solanaPrivateKey) {
  if (!solanaPrivateKey) return void 0;
  try {
    return parseSolanaKeypairSecret(solanaPrivateKey).publicKey.toBase58();
  } catch (e) {
    return void 0;
  }
}
function shouldBroadcastWalletStateChange(config, previous, next) {
  var _a3, _b;
  if (next.svmAddress) {
    return (previous == null ? void 0 : previous.svmAddress) !== next.svmAddress;
  }
  if (!next.publicKey || next.chainId === void 0) {
    return false;
  }
  return normalizeAddress2(previous == null ? void 0 : previous.publicKey) !== normalizeAddress2(next.publicKey) || (previous == null ? void 0 : previous.chainId) !== next.chainId || (previous == null ? void 0 : previous.aaMode) !== next.aaMode || normalizeAddress2((_a3 = previous == null ? void 0 : previous.smartAccount) != null ? _a3 : void 0) !== normalizeAddress2((_b = next.smartAccount) != null ? _b : void 0);
}
async function syncWalletStateForChat(config, previous, next, cli, session) {
  var _a3, _b;
  if (!shouldBroadcastWalletStateChange(config, previous, next) || !next.publicKey) {
    return;
  }
  const userState = buildCliUserState(next.publicKey, next.chainId, {
    app: config.app,
    aaMode: (_a3 = next.aaMode) != null ? _a3 : null,
    smartAccount: (_b = next.smartAccount) != null ? _b : null,
    svmAddress: next.svmAddress,
    svmCluster: config.svmCluster
  });
  session.resolveUserState(userState);
  await session.syncUserState();
  await session.client.sendSystemMessage(
    cli.sessionId,
    JSON.stringify({
      type: "wallet:state_changed",
      payload: userState
    }),
    { app: config.app }
  );
}
async function chatCommand(config, message, verbose) {
  var _a3, _b, _c, _d, _e;
  if (!message) {
    fatal("Usage: aomi chat <message>");
  }
  const previousCli = config.freshSession ? null : CliSession.load();
  const previousWallet = previousCli ? {
    publicKey: previousCli.publicKey,
    chainId: previousCli.chainId,
    aaMode: (_a3 = previousCli.toState().aaMode) != null ? _a3 : null,
    smartAccount: (_b = previousCli.toState().smartAccount) != null ? _b : null,
    svmAddress: void 0
    // force re-sync of SVM state on every chat
  } : null;
  const cli = CliSession.loadOrCreate(config);
  const session = cli.createClientSession(config);
  const resolvedSolanaKey = cli.resolvedSvmPrivateKey(config.solanaPrivateKey);
  const svmAddress3 = (_c = deriveSvmAddress(resolvedSolanaKey)) != null ? _c : cli.svmPublicKey;
  try {
    await ingestSecretsForSession(config, cli, session.client);
    await applyRequestedModelIfPresent(config, cli, session);
    await syncWalletStateForChat(
      config,
      previousWallet,
      {
        publicKey: cli.publicKey,
        chainId: cli.chainId,
        aaMode: (_d = cli.toState().aaMode) != null ? _d : null,
        smartAccount: (_e = cli.toState().smartAccount) != null ? _e : null,
        svmAddress: svmAddress3
      },
      cli,
      session
    );
    const previousPendingIds = new Set(cli.pendingTxs.map((tx) => tx.id));
    let printedAgentCount = 0;
    const seenToolResults = /* @__PURE__ */ new Set();
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
      printedAgentCount = printNewAgentMessages(allMessages, printedAgentCount);
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
    const syncedPending = cli.syncPendingFromUserState(session.getUserState());
    const newPendingTxs = [
      ...syncedPending.pendingTxs,
      ...syncedPending.pendingSolTxs
    ].filter((tx) => !previousPendingIds.has(tx.id));
    for (const pending of newPendingTxs) {
      console.log(`\u26A1 Wallet request queued: ${pending.id}`);
      if ("kind" in pending && pending.kind === "transaction") {
        const payload = pending.payload;
        console.log(`   to:    ${payload.to}`);
        if (payload.value) console.log(`   value: ${payload.value}`);
        if (payload.chainId) console.log(`   chain: ${payload.chainId}`);
      } else if (pending.kind === "eip712_sign") {
        const payload = pending.payload;
        if (payload.description) {
          console.log(`   desc:  ${payload.description}`);
        }
        if (payload.non_typed_data) {
          console.log("   type:  erc191");
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
      } else if (newPendingTxs.length === 0) {
        console.log("(no response)");
      }
      if (newPendingTxs.length === 0) {
        const mentionedTxIds = extractMentionedTxIds(last == null ? void 0 : last.content);
        if (mentionedTxIds.length > 0) {
          console.log(
            `
${YELLOW}\u26A0\uFE0F Assistant referenced ${mentionedTxIds.join(", ")}, but backend returned no pending wallet requests.${RESET}`
          );
          console.log("   These IDs are not signable from this session.");
        }
      }
    }
    if (newPendingTxs.length > 0) {
      console.log(
        "\nRun `aomi tx list` to see pending transactions, `aomi tx sign <id>` to sign."
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
    init_user_state3();
    init_solana_signer();
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
var DEFAULT_AA_CONFIG, DISABLED_PROVIDER_STATE;
var init_types2 = __esm({
  "src/aa/types.ts"() {
    "use strict";
    DEFAULT_AA_CONFIG = {
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
    DISABLED_PROVIDER_STATE = {
      resolved: null,
      account: void 0,
      pending: false,
      error: null
    };
  }
});

// src/aa/execute.ts
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount as privateKeyToAccount2 } from "viem/accounts";
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
      var _a3;
      const value = (_a3 = debugGlobal.localStorage) == null ? void 0 : _a3.getItem(key);
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
    getPreferredRpcUrl: getPreferredRpcUrl2
  } = params;
  if (providerState.resolved && providerState.account) {
    return executeViaAA(callList, providerState, getPreferredRpcUrl2);
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
    getPreferredRpcUrl: getPreferredRpcUrl2
  });
}
async function executeViaAA(callList, providerState, getPreferredRpcUrl2) {
  var _a3;
  const account = providerState.account;
  const resolved = providerState.resolved;
  if (!account || !resolved) {
    throw (_a3 = providerState.error) != null ? _a3 : new Error("smart_account_unavailable");
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
      getPreferredRpcUrl2
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
async function resolve7702Delegation(txHash, callList, getPreferredRpcUrl2) {
  var _a3, _b, _c, _d;
  try {
    const chainId3 = (_a3 = callList[0]) == null ? void 0 : _a3.chainId;
    if (!chainId3) return void 0;
    const chain = CHAINS_BY_ID[chainId3];
    if (!chain) return void 0;
    const rpcUrl = getPreferredRpcUrl2(chain);
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
  getPreferredRpcUrl: getPreferredRpcUrl2
}) {
  var _a3, _b, _c;
  const hashes = [];
  const normalizedCalls = callList.map((call) => __spreadProps(__spreadValues({}, call), {
    data: normalizeRpcCallData(call.data)
  }));
  const requiresAtomicForBatch = Boolean(nativeWalletExecution == null ? void 0 : nativeWalletExecution.requiresAtomicForBatch) && normalizedCalls.length > 1;
  const nativeExecutionKind = (_a3 = nativeWalletExecution == null ? void 0 : nativeWalletExecution.executionKind) != null ? _a3 : "eoa";
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
      const rpcUrl = getPreferredRpcUrl2(chain);
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
  var _a3;
  const receipts = (_a3 = batchResult.receipts) != null ? _a3 : [];
  const hashes = receipts.flatMap((receipt) => {
    var _a4;
    const hash = (_a4 = receipt.transactionHash) != null ? _a4 : receipt.hash;
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
  var _a3, _b;
  const capabilities = {};
  if (canUseAtomicSendCalls) {
    capabilities.atomic = requiresAtomicForBatch ? { required: true } : { optional: true };
  }
  const sponsorship = nativeWalletExecution == null ? void 0 : nativeWalletExecution.sponsorship;
  if ((sponsorship == null ? void 0 : sponsorship.mode) === "required") {
    if (!sponsorship.paymasterServiceUrl) {
      throw new Error("wallet_paymaster_service_url_required");
    }
    if (((_a3 = chainCaps == null ? void 0 : chainCaps.paymasterService) == null ? void 0 : _a3.supported) !== true) {
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
  var _a3;
  if (error instanceof Error) {
    return (_a3 = error.stack) != null ? _a3 : error.message;
  }
  return String(error);
}
function isRetryableBundlerSubmissionError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return lowered.includes("bundle id is unknown") || lowered.includes("bundle id unknown") || lowered.includes("has not been submitted") || lowered.includes("userop") && lowered.includes("not found") || lowered.includes("user operation") && lowered.includes("not found");
}
function resolveChainCapabilities(capabilities, chainId3) {
  var _a3, _b;
  if (!capabilities) {
    return void 0;
  }
  const asRecord3 = capabilities;
  const eip155Key = `eip155:${chainId3}`;
  const decimalKey = String(chainId3);
  const hexKey = `0x${chainId3.toString(16)}`;
  return (_b = (_a3 = asRecord3[eip155Key]) != null ? _a3 : asRecord3[decimalKey]) != null ? _b : asRecord3[hexKey];
}
var ERC20_PAYMENT_CONTEXT_KEYS, AA_DEBUG_STORAGE_KEYS;
var init_execute = __esm({
  "src/aa/execute.ts"() {
    "use strict";
    init_chains();
    ERC20_PAYMENT_CONTEXT_KEYS = /* @__PURE__ */ new Set(["erc20", "paymasterAddress"]);
    AA_DEBUG_STORAGE_KEYS = ["aomi:debug-aa", "AOMI_DEBUG_AA"];
  }
});

// src/aa/fee.ts
import { getAddress as getAddress3 } from "viem";
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
    recipient: getAddress3(fee.recipient),
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
var MAX_AUTO_FEE_WEI, ZERO_WEI;
var init_fee = __esm({
  "src/aa/fee.ts"() {
    "use strict";
    MAX_AUTO_FEE_WEI = BigInt("50000000000000000");
    ZERO_WEI = BigInt("0");
  }
});

// src/aa/alchemy/defaults.ts
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
var DEFAULT_ALCHEMY_API_KEY, DEFAULT_ALCHEMY_GAS_POLICY_ID;
var init_defaults = __esm({
  "src/aa/alchemy/defaults.ts"() {
    "use strict";
    DEFAULT_ALCHEMY_API_KEY = "72eIUle_3rfixX00QJVwk";
    DEFAULT_ALCHEMY_GAS_POLICY_ID = "fb17d7d7-9a32-479d-937a-52d72b849c40";
  }
});

// src/aa/alchemy/provider.ts
var init_provider = __esm({
  "src/aa/alchemy/provider.ts"() {
    "use strict";
    init_types2();
    init_defaults();
  }
});

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
var init_adapt = __esm({
  "src/aa/adapt.ts"() {
    "use strict";
  }
});

// src/aa/owner.ts
import { privateKeyToAccount as privateKeyToAccount3 } from "viem/accounts";
function getDirectOwnerParams(owner) {
  return {
    kind: "ready",
    ownerParams: {
      para: void 0,
      signer: privateKeyToAccount3(owner.privateKey)
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
import { privateKeyToAccount as privateKeyToAccount4 } from "viem/accounts";
function extractExistingAccountAddress(error) {
  var _a3;
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(
    /Account with address (0x[a-fA-F0-9]{40}) already exists/
  );
  return (_a3 = match == null ? void 0 : match[1]) != null ? _a3 : null;
}
function deriveAlchemy4337AccountId(address3) {
  var _a3;
  const hex = address3.toLowerCase().slice(2).padEnd(32, "0").slice(0, 32).split("");
  const namespace = ["4", "3", "3", "7", "5", "a", "a", "b"];
  for (let index = 0; index < namespace.length; index += 1) {
    hex[index] = namespace[index];
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
  const signer = privateKeyToAccount4(params.privateKey);
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
    var _a3, _b, _c, _d;
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
      const transactionHash = (_b = (_a3 = status.receipts) == null ? void 0 : _a3[0]) == null ? void 0 : _b.transactionHash;
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
var ALCHEMY_7702_DELEGATION_ADDRESS, AA_DEBUG_ENABLED;
var init_create = __esm({
  "src/aa/alchemy/create.ts"() {
    "use strict";
    init_adapt();
    init_types2();
    init_policy();
    init_owner();
    init_defaults();
    ALCHEMY_7702_DELEGATION_ADDRESS = "0x69007702764179f14F51cdce752f4f775d74E139";
    AA_DEBUG_ENABLED = process.env.AOMI_AA_DEBUG === "1";
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
import { privateKeyToAccount as privateKeyToAccount5 } from "viem/accounts";
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
    const signer = owner.kind === "direct" ? privateKeyToAccount5(owner.privateKey) : localSessionSigner;
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
function adaptPimlicoSdkAccount(account, address3) {
  const lowered = account.provider.toLowerCase();
  if (lowered !== "alchemy" && lowered !== "pimlico") {
    throw new Error(`Unsupported AA provider from Pimlico SDK: ${account.provider}`);
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
  const { createPublicClient: createPublicClient2, http: http3 } = await import("viem");
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
    transport: http3(params.rpcUrl)
  });
  if (params.mode === "7702") {
    rejectExternalWallet7702(params.externalSigner);
  }
  const paymasterClient = sponsored2 ? createPimlicoClient({
    entryPoint,
    transport: http3(pimlicoRpcUrl)
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
    bundlerTransport: http3(pimlicoRpcUrl)
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
          var _a3;
          return {
            to: c.to,
            value: c.value,
            data: (_a3 = c.data) != null ? _a3 : "0x"
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
var AA_DEBUG_ENABLED2;
var init_create2 = __esm({
  "src/aa/pimlico/create.ts"() {
    "use strict";
    init_types2();
    init_policy();
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
    init_fee();
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
function warnIfTokenOpsIn4337(mode, callList) {
  if (mode !== "4337" || !callsContainTokenOperations(callList)) return;
  console.log(
    "\u26A0\uFE0F  4337 batch contains ERC-20 calls. Tokens must be in the smart account, not your EOA."
  );
  console.log(
    "   This batch may revert. Consider transferring tokens to the smart account first."
  );
}
function resolveMode(chain, callList, explicitMode) {
  var _a3;
  const chainConfig = getAAChainConfig(DEFAULT_AA_CONFIG, callList, {
    [chain.id]: chain
  });
  const mode = (_a3 = explicitMode != null ? explicitMode : chainConfig == null ? void 0 : chainConfig.defaultMode) != null ? _a3 : "7702";
  warnIfTokenOpsIn4337(mode, callList);
  return mode;
}
function resolveCliExecutionDecision(params) {
  var _a3;
  const { config, chain, callList } = params;
  if (config.execution === "eoa") {
    return { execution: "eoa" };
  }
  const pimlicoKey = (_a3 = process.env.PIMLICO_API_KEY) == null ? void 0 : _a3.trim();
  const alchemyKey = resolveAlchemyApiKey();
  if (pimlicoKey && config.aaProvider === "pimlico") {
    const aaMode3 = resolveMode(chain, callList, config.aaMode);
    return {
      execution: "aa",
      provider: "pimlico",
      aaMode: aaMode3,
      modeExplicit: Boolean(config.aaMode),
      apiKey: pimlicoKey
    };
  }
  if (alchemyKey) {
    const aaMode3 = resolveMode(chain, callList, config.aaMode);
    return {
      execution: "aa",
      provider: "alchemy",
      aaMode: aaMode3,
      modeExplicit: Boolean(config.aaMode),
      apiKey: alchemyKey
    };
  }
  const aaMode2 = resolveMode(chain, callList, config.aaMode);
  return {
    execution: "aa",
    provider: "alchemy",
    aaMode: aaMode2,
    modeExplicit: Boolean(config.aaMode),
    proxy: true
  };
}
function getAlternativeAAMode(decision) {
  if (decision.execution !== "aa") return null;
  if (decision.modeExplicit) return null;
  const alt = decision.aaMode === "7702" ? "4337" : "7702";
  return __spreadProps(__spreadValues({}, decision), { aaMode: alt });
}
async function createCliProviderState(params) {
  var _a3;
  const { decision, chain, privateKey, rpcUrl, callList, baseUrl } = params;
  if (decision.execution === "eoa") {
    return DISABLED_PROVIDER_STATE;
  }
  const chainSlug = ALCHEMY_CHAIN_SLUGS[chain.id];
  const proxyBaseUrl = decision.proxy && chainSlug ? `${baseUrl}/aa/v1/${chainSlug}` : void 0;
  const resolvedRpcUrl = rpcUrl || chain.rpcUrls.default.http[0] || ((_a3 = chain.rpcUrls.public) == null ? void 0 : _a3.http[0]) || "";
  return createAAProviderState({
    provider: decision.provider,
    chain,
    owner: { kind: "direct", privateKey },
    rpcUrl: resolvedRpcUrl,
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
    init_defaults();
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

// src/cli/transactions.ts
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
function toSignedTransactionRecord(tx, execution, from, chainId3, timestamp2, aaProvider, aaMode2) {
  return {
    id: tx.id,
    kind: "transaction",
    txHash: execution.txHash,
    txHashes: execution.txHashes,
    executionKind: execution.executionKind,
    aaProvider,
    aaMode: aaMode2,
    batched: execution.batched,
    sponsored: execution.sponsored,
    smartAccount4337: execution.SmartAccount4337,
    Delegation7702: execution.Delegation7702,
    from,
    to: tx.to,
    value: tx.value,
    chainId: chainId3,
    timestamp: timestamp2
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
    parts.push(tx.payload.non_typed_data ? "erc191" : "eip712");
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
    if (tx.smartAccount4337) parts.push(`4337: ${tx.smartAccount4337}`);
    if (tx.Delegation7702) parts.push(`delegation: ${tx.Delegation7702}`);
    if (tx.to) parts.push(`to: ${tx.to}`);
    if (tx.value) parts.push(`value: ${tx.value}`);
  }
  parts.push(`(${new Date(tx.timestamp).toLocaleTimeString()})`);
  return parts.join("  ");
}
function formatPendingSolTxLine(tx, prefix) {
  const parts = [`${prefix} ${tx.id}`, "solana"];
  if (tx.cluster) parts.push(`cluster: ${tx.cluster}`);
  if (tx.description) parts.push(tx.description);
  if (tx.signer) parts.push(`signer: ${tx.signer}`);
  if (tx.unsignedTx) parts.push(`tx: ${tx.unsignedTx.slice(0, 20)}...`);
  parts.push(`(${new Date(tx.timestamp).toLocaleTimeString()})`);
  return parts.join("  ");
}
function formatSignedSolTxLine(tx, prefix) {
  const parts = [`${prefix} ${tx.id}`, "solana"];
  if (tx.signedTx) parts.push(`signed: ${tx.signedTx.slice(0, 20)}...`);
  if (tx.cluster) parts.push(`cluster: ${tx.cluster}`);
  if (tx.signer) parts.push(`signer: ${tx.signer}`);
  if (tx.description) parts.push(tx.description);
  parts.push(`(${new Date(tx.timestamp).toLocaleTimeString()})`);
  return parts.join("  ");
}
var init_transactions = __esm({
  "src/cli/transactions.ts"() {
    "use strict";
    init_wallet_utils();
  }
});

// src/cli/commands/wallet.ts
var wallet_exports = {};
__export(wallet_exports, {
  signCommand: () => signCommand,
  txCommand: () => txCommand
});
import { createWalletClient as createWalletClient2, http as http2 } from "viem";
import { privateKeyToAccount as privateKeyToAccount6 } from "viem/accounts";
import * as viemChains from "viem/chains";
async function txCommand(config) {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  const session = cli.createClientSession(config);
  try {
    const apiState = await session.client.fetchState(
      cli.sessionId,
      void 0,
      cli.clientId
    );
    cli.syncPendingFromUserState(apiState.user_state);
  } catch (e) {
  } finally {
    session.close();
  }
  const pending = [...cli.pendingTxs];
  const pendingSol = [...cli.pendingSolTxs];
  const signed = [...cli.signedTxs];
  const signedSol = [...cli.signedSolTxs];
  const totalPending = pending.length + pendingSol.length;
  const totalSigned = signed.length + signedSol.length;
  if (totalPending === 0 && totalSigned === 0) {
    console.log("No transactions.");
    printDataFileLocation();
    return;
  }
  if (totalPending > 0) {
    console.log(`Pending (${totalPending}):`);
    for (const tx of pending) {
      console.log(formatTxLine(tx, "  \u23F3"));
    }
    for (const tx of pendingSol) {
      console.log(formatPendingSolTxLine(tx, "  \u23F3"));
    }
  }
  if (totalSigned > 0) {
    if (totalPending > 0) console.log();
    console.log(`Signed (${totalSigned}):`);
    for (const tx of signed) {
      console.log(formatSignedTxLine(tx, "  \u2705"));
    }
    for (const tx of signedSol) {
      console.log(formatSignedSolTxLine(tx, "  \u2705"));
    }
  }
  printDataFileLocation();
}
function resolveChain(targetChainId, rpcUrl) {
  const knownChain = Object.values(viemChains).find((candidate) => {
    return typeof candidate === "object" && candidate !== null && "id" in candidate && candidate.id === targetChainId;
  });
  return knownChain != null ? knownChain : {
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
  if (override) {
    return override;
  }
  const alchemyApiKey = resolveAlchemyApiKey();
  const alchemyChainSlug = ALCHEMY_CHAIN_SLUGS[chain.id];
  if (alchemyApiKey && alchemyChainSlug) {
    return `https://${alchemyChainSlug}.g.alchemy.com/v2/${alchemyApiKey}`;
  }
  return (_c = (_b = chain.rpcUrls.default.http[0]) != null ? _b : (_a3 = chain.rpcUrls.public) == null ? void 0 : _a3.http[0]) != null ? _c : "";
}
function buildCliTxCompletionMetadata(params) {
  var _a3;
  const requestedMode = params.requestedDecision.execution === "aa" ? params.requestedDecision.aaMode : "none";
  const resolvedMode = (_a3 = aaModeFromExecutionKind(params.execution.executionKind)) != null ? _a3 : params.finalDecision.execution === "aa" ? params.finalDecision.aaMode : "none";
  let fallbackReason;
  if (requestedMode === "7702" && resolvedMode === "4337") {
    fallbackReason = "requested_7702_fallback_4337";
  } else if (requestedMode !== "none" && resolvedMode === "none") {
    fallbackReason = "aa_failed_fallback_eoa";
  }
  return {
    aa_requested_mode: requestedMode,
    aa_resolved_mode: resolvedMode,
    aa_fallback_reason: fallbackReason
  };
}
async function simulatePendingTransactions(params) {
  const { session, cli, pendingTxs, resolvedChainIds, chainId: chainId3 } = params;
  const simResponse = await session.client.simulateBatch(
    cli.sessionId,
    pendingTxs.map((tx, index) => {
      var _a3, _b;
      return {
        to: (_a3 = tx.to) != null ? _a3 : "",
        value: tx.value,
        data: tx.data,
        label: (_b = tx.description) != null ? _b : tx.id,
        chain_id: resolvedChainIds[index]
      };
    }),
    {
      chainId: chainId3
    }
  );
  return simResponse.result;
}
async function signSolanaPending(params) {
  var _a3;
  const { cli, session, config, pendingTx } = params;
  const secret = (_a3 = cli.resolvedSvmPrivateKey(config.solanaPrivateKey)) != null ? _a3 : process.env.SOLANA_PRIVATE_KEY;
  if (!secret) {
    fatal(
      [
        "Solana keypair required for `aomi tx sign` on a solana_sign request.",
        "Pass one of:",
        "  aomi wallet set --solana <base58-key>             # persist once",
        "  aomi tx sign --solana-private-key <base58|json> <tx-id>",
        "  SOLANA_PRIVATE_KEY=<base58|json> aomi tx sign <tx-id>",
        "",
        "Accepted formats:",
        "  base58 of the 64-byte secret key (Phantom / Solflare export)",
        "  JSON byte array `[1,2,...,64]` (solana-keygen output)"
      ].join("\n")
    );
  }
  let keypair;
  try {
    keypair = parseSolanaKeypairSecret(secret);
  } catch (err) {
    fatal(err instanceof Error ? err.message : String(err));
  }
  if (pendingTx.signer && pendingTx.signer !== keypair.publicKey.toBase58()) {
    console.log(
      `\u26A0\uFE0F  Local signer ${keypair.publicKey.toBase58()} differs from expected ${pendingTx.signer}`
    );
  }
  console.log(`Kind:    solana_sign`);
  console.log(`Tx:      ${pendingTx.id}`);
  if (pendingTx.cluster) console.log(`Cluster: ${pendingTx.cluster}`);
  if (pendingTx.description) console.log(`Desc:    ${pendingTx.description}`);
  console.log(`Signer:  ${keypair.publicKey.toBase58()}`);
  console.log();
  const outcome = signSolanaTransaction(pendingTx.unsignedTx, keypair);
  console.log(
    `\u2705 Signed! signed_tx: ${outcome.signedTxBase64.slice(0, 24)}... (${outcome.signedTxBase64.length} chars)`
  );
  await session.client.sendSystemMessage(
    cli.sessionId,
    JSON.stringify({
      type: "wallet::solana_sign_complete",
      payload: {
        status: "signed",
        signed_tx: outcome.signedTxBase64,
        description: pendingTx.description,
        pending_solana_id: pendingTx.solanaId
      }
    }),
    { app: cli.app }
  );
  const syncedState = await session.syncUserState();
  cli.syncPendingFromUserState(syncedState.user_state);
  cli.addSignedSolTx({
    id: pendingTx.id,
    signedTx: outcome.signedTxBase64,
    signer: outcome.signer,
    cluster: pendingTx.cluster,
    description: pendingTx.description,
    timestamp: Date.now()
  });
  console.log("Backend notified.");
}
async function executeCliTransaction(params) {
  const {
    privateKey,
    currentChainId,
    chainsById,
    rpcUrl,
    providerState,
    callList
  } = params;
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
  var _a3, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r;
  if (txIds.length === 0) {
    fatal(
      "Usage: aomi tx sign <tx-id> [<tx-id> ...]\nRun `aomi tx list` to see pending transaction IDs."
    );
  }
  const uniqueIds = Array.from(new Set(txIds));
  if (uniqueIds.length !== txIds.length) {
    fatal(
      "Duplicate transaction IDs are not allowed in a single `aomi tx sign` call."
    );
  }
  const cli = CliSession.load();
  if (!cli) {
    fatal("No active session. Run `aomi chat` first.");
  }
  const privateKey = (_a3 = config.privateKey) != null ? _a3 : cli.privateKey;
  cli.mergeConfig(config);
  const session = cli.createClientSession(config);
  try {
    const initialState = await session.client.fetchState(
      cli.sessionId,
      void 0,
      cli.clientId
    );
    cli.syncPendingFromUserState(initialState.user_state);
    const solanaIds = uniqueIds.filter(
      (id) => cli.findPendingSolTx(id) !== void 0
    );
    const evmIds = uniqueIds.filter(
      (id) => cli.findPendingTx(id) !== void 0
    );
    const unknownIds = uniqueIds.filter(
      (id) => cli.findPendingSolTx(id) === void 0 && cli.findPendingTx(id) === void 0
    );
    if (unknownIds.length > 0) {
      const available = [...cli.pendingTxs, ...cli.pendingSolTxs].map((tx) => tx.id).join(", ") || "(none)";
      const label = unknownIds.length === 1 ? "Transaction" : "Transactions";
      fatal(
        `${label} "${unknownIds.join('", "')}" not found.
Available: ${available}`
      );
    }
    if (solanaIds.length > 0 && evmIds.length > 0) {
      fatal(
        "Cannot mix Solana and EVM/EIP-712 requests in the same `aomi tx sign` invocation."
      );
    }
    if (solanaIds.length > 0) {
      if (solanaIds.length > 1) {
        fatal("Solana signing is singular \u2014 pass exactly one tx-id at a time.");
      }
      const solanaTx = cli.requirePendingSolTx(solanaIds[0]);
      await signSolanaPending({
        cli,
        session,
        config,
        pendingTx: solanaTx
      });
      return;
    }
    const pendingTxs = cli.requirePendingTxs(uniqueIds);
    if (!privateKey) {
      fatal(
        [
          "Private key required for `aomi tx sign`.",
          "Pass one of:",
          "  aomi wallet set <hex-key>",
          "  aomi tx sign --private-key <hex-key> <tx-id>",
          "  PRIVATE_KEY=<hex-key> aomi tx sign <tx-id>"
        ].join("\n")
      );
    }
    const account = privateKeyToAccount6(privateKey);
    if (cli.publicKey && account.address.toLowerCase() !== cli.publicKey.toLowerCase()) {
      console.log(
        `\u26A0\uFE0F  Signer ${account.address} differs from session public key ${cli.publicKey}`
      );
      console.log("   Updating session to match the signing key...");
    }
    const rpcUrl = config.chainRpcUrl;
    const resolvedChainIds = pendingTxs.map(
      (tx) => {
        var _a4, _b2;
        return (_b2 = (_a4 = tx.chainId) != null ? _a4 : cli.chainId) != null ? _b2 : 1;
      }
    );
    const primaryChainId = resolvedChainIds[0];
    const chain = resolveChain(primaryChainId, rpcUrl);
    const resolvedRpcUrl = getPreferredRpcUrl(chain, rpcUrl);
    const chainsById = Object.fromEntries(
      Array.from(new Set(resolvedChainIds)).map((chainId3) => [
        chainId3,
        resolveChain(chainId3, rpcUrl)
      ])
    );
    console.log(`Signer:  ${account.address}`);
    console.log(`IDs:     ${pendingTxs.map((tx) => tx.id).join(", ")}`);
    let signedRecords = [];
    let backendNotifications = [];
    let resolvedUserStateAAMode = null;
    let resolvedUserStateSmartAccount = null;
    let resolvedUserStateSmartAccount4337 = null;
    let resolvedUserStateDelegation7702 = null;
    if (pendingTxs.every((tx) => tx.kind === "transaction")) {
      console.log(
        `Kind:    transaction${pendingTxs.length > 1 ? " (batch)" : ""}`
      );
      for (const tx of pendingTxs) {
        console.log(`Tx:      ${tx.id} -> ${tx.to}`);
        if (tx.value) console.log(`Value:   ${tx.value}`);
        if ((_b = tx.chainId) != null ? _b : cli.chainId)
          console.log(`Chain:   ${(_c = tx.chainId) != null ? _c : cli.chainId}`);
        if (tx.data) {
          console.log(`Data:    ${tx.data.slice(0, 40)}...`);
        }
      }
      console.log();
      const baseCallList = pendingTxs.flatMap(
        (tx, index) => pendingTxToCallList(__spreadProps(__spreadValues({}, tx), {
          chainId: resolvedChainIds[index]
        }))
      );
      if (baseCallList.length > 1 && rpcUrl && new Set(baseCallList.map((call) => call.chainId)).size > 1) {
        fatal(
          "A single `--rpc-url` override cannot be used for a mixed-chain multi-sign request."
        );
      }
      const simulationDecision = resolveCliExecutionDecision({
        config,
        chain,
        callList: baseCallList
      });
      const simulationProviderState = simulationDecision.execution === "aa" ? await createCliProviderState({
        decision: simulationDecision,
        chain,
        privateKey,
        rpcUrl: resolvedRpcUrl,
        callList: baseCallList,
        baseUrl: cli.baseUrl
      }) : void 0;
      const simulationAAMode = simulationDecision.execution === "aa" ? simulationDecision.aaMode : null;
      const simulationSmartAccount = simulationAAMode === "4337" ? (_e = (_d = simulationProviderState == null ? void 0 : simulationProviderState.account) == null ? void 0 : _d.SmartAccount4337) != null ? _e : null : null;
      session.resolveWallet(account.address, primaryChainId, {
        aaMode: simulationAAMode,
        smartAccount: simulationSmartAccount
      });
      await session.syncUserState();
      let simFee;
      try {
        const sim = await simulatePendingTransactions({
          session,
          cli,
          pendingTxs,
          resolvedChainIds,
          chainId: primaryChainId
        });
        if (!sim.batch_success) {
          const failed = sim.steps.find((s) => !s.success);
          console.log(
            `\x1B[31m\u274C Simulation failed at step ${(_f = failed == null ? void 0 : failed.step) != null ? _f : "?"}: ${(_g = failed == null ? void 0 : failed.revert_reason) != null ? _g : "unknown"}${RESET}`
          );
        }
        simFee = sim.fee;
      } catch (e) {
        if (e instanceof CliExit) throw e;
        console.log(
          `${DIM}Simulation unavailable, skipping fee injection.${RESET}`
        );
      }
      let autoFeeCall = null;
      if (simFee) {
        const normalizedFee = normalizeSimulatedFee(simFee);
        if (normalizedFee) {
          const feeEth = (Number(normalizedFee.amountWei) / 1e18).toFixed(6);
          console.log(`Fee:     ${feeEth} ETH \u2192 ${normalizedFee.recipient}`);
        }
        autoFeeCall = buildFeeAAWalletCall(simFee, primaryChainId);
      }
      const decisionCallList = autoFeeCall ? [...baseCallList, autoFeeCall] : baseCallList;
      const decision = resolveCliExecutionDecision({
        config,
        chain,
        callList: decisionCallList
      });
      console.log(`Exec:    ${describeExecutionDecision(decision)}`);
      const strategies = [decision];
      const altDecision = getAlternativeAAMode(decision);
      if (altDecision) strategies.push(altDecision);
      if (config.execution !== "aa") strategies.push({ execution: "eoa" });
      const runWithDecision = async (d) => {
        var _a4;
        const ps = await createCliProviderState({
          decision: d,
          chain,
          privateKey,
          rpcUrl: resolvedRpcUrl,
          callList: decisionCallList,
          baseUrl: cli.baseUrl
        });
        let executionCallList = decisionCallList;
        if (autoFeeCall && d.execution === "aa" && ((_a4 = ps.resolved) == null ? void 0 : _a4.sponsorship) !== "disabled") {
          console.log(
            `${DIM}Skipping native fee injection for sponsored AA. The paymaster covers gas only; a native fee transfer would require sender balance.${RESET}`
          );
          executionCallList = baseCallList;
        }
        return executeCliTransaction({
          privateKey,
          currentChainId: primaryChainId,
          chainsById,
          rpcUrl,
          providerState: ps,
          callList: executionCallList
        });
      };
      let finalDecision = decision;
      let execution;
      const failures = [];
      for (const strategy of strategies) {
        if (failures.length > 0) {
          const prev = strategies[failures.length - 1];
          console.log(
            `${describeExecutionDecision(prev)} failed: ${failures[failures.length - 1].message}`
          );
          console.log(
            `Retrying with ${describeExecutionDecision(strategy)}...`
          );
        }
        try {
          execution = await runWithDecision(strategy);
          finalDecision = strategy;
          break;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failures.push({ decision: strategy, message });
          if (strategy === strategies[strategies.length - 1]) {
            if (config.execution === "aa") {
              fatal(
                `\u274C AA execution failed with all modes.
` + failures.map(
                  (f) => `  ${describeExecutionDecision(f.decision)}: ${f.message}`
                ).join("\n") + "\nUse `--eoa` to sign without account abstraction."
              );
            }
            throw error;
          }
        }
      }
      console.log(`\u2705 Sent! Hash: ${execution.txHash}`);
      if (execution.txHashes.length > 1) {
        console.log(`Count:   ${execution.txHashes.length}`);
      }
      if (execution.sponsored) {
        console.log("Gas:     sponsored");
      }
      if (execution.SmartAccount4337) {
        console.log(`AA:      ${execution.SmartAccount4337}`);
      }
      if (execution.Delegation7702) {
        console.log(`Deleg:   ${execution.Delegation7702}`);
      }
      const executionUsedAA = finalDecision.execution === "aa" && execution.executionKind !== "eoa";
      resolvedUserStateAAMode = executionUsedAA && finalDecision.execution === "aa" ? finalDecision.aaMode : null;
      resolvedUserStateSmartAccount = resolvedUserStateAAMode === "4337" ? (_h = execution.SmartAccount4337) != null ? _h : null : null;
      resolvedUserStateSmartAccount4337 = resolvedUserStateAAMode === "4337" ? (_i = execution.SmartAccount4337) != null ? _i : null : null;
      resolvedUserStateDelegation7702 = resolvedUserStateAAMode === "7702" ? (_j = execution.Delegation7702) != null ? _j : null : null;
      signedRecords = pendingTxs.map(
        (tx, index) => toSignedTransactionRecord(
          tx,
          execution,
          account.address,
          resolvedChainIds[index],
          Date.now(),
          executionUsedAA && finalDecision.execution === "aa" ? finalDecision.provider : void 0,
          executionUsedAA && finalDecision.execution === "aa" ? finalDecision.aaMode : void 0
        )
      );
      const completionMetadata = buildCliTxCompletionMetadata({
        requestedDecision: decision,
        finalDecision,
        execution
      });
      backendNotifications = pendingTxs.map((tx) => ({
        type: "wallet:tx_complete",
        payload: __spreadProps(__spreadValues({
          txHash: execution.txHash,
          status: "success",
          pending_tx_ids: tx.txId !== void 0 ? [tx.txId] : []
        }, completionMetadata), {
          execution_kind: execution.executionKind,
          batched: execution.batched,
          call_count: execution.txHashes.length,
          sponsored: execution.sponsored,
          smart_account_4337: execution.SmartAccount4337,
          delegation_7702: execution.Delegation7702
        })
      }));
    } else {
      if (pendingTxs.length > 1) {
        fatal(
          "Batch signing is only supported for transaction requests, not EIP-712 requests."
        );
      }
      const pendingTx = pendingTxs[0];
      const walletClient = createWalletClient2({
        account,
        chain,
        transport: http2(resolvedRpcUrl)
      });
      const signaturePayload = pendingTx.payload;
      let signArgs = toViemSignTypedDataArgs(signaturePayload);
      const messageArgs = toViemSignMessageArgs(signaturePayload);
      if (!signArgs && pendingTx.kind === "eip712_sign" && pendingTx.eip712Id !== void 0) {
        try {
          const session2 = cli.createClientSession(config);
          const apiState = await session2.client.fetchState(
            cli.sessionId,
            void 0,
            cli.clientId
          );
          session2.close();
          const evmSigs = (_p = (_o = (_l = (_k = apiState.user_state) == null ? void 0 : _k.pending) == null ? void 0 : _l.evmSigs) != null ? _o : (_n = (_m = apiState.user_state) == null ? void 0 : _m.pending) == null ? void 0 : _n.evm_sigs) != null ? _p : {};
          const sig = evmSigs[String(pendingTx.eip712Id)];
          const typed = (_q = sig == null ? void 0 : sig.typedData) != null ? _q : sig == null ? void 0 : sig.typed_data;
          if (typed) {
            signArgs = toViemSignTypedDataArgs(__spreadProps(__spreadValues({}, pendingTx.payload), {
              typed_data: typed,
              description: (_r = sig.description) != null ? _r : pendingTx.description
            }));
          }
        } catch (err) {
          console.warn(`[aomi tx sign] failed to fetch typed_data from backend: ${err}`);
        }
      }
      if (signArgs && messageArgs) {
        fatal(
          "Signature request cannot include both typed_data and non_typed_data."
        );
      }
      if (!signArgs && !messageArgs) {
        fatal(
          "Signature request is missing typed_data or non_typed_data payload."
        );
      }
      if (pendingTx.description) {
        console.log(`Desc:    ${pendingTx.description}`);
      }
      console.log(
        signArgs ? `Type:    ${signArgs.primaryType}` : "Type:    erc191"
      );
      console.log();
      const signature = signArgs ? await walletClient.signTypedData(signArgs) : await walletClient.signMessage(messageArgs);
      console.log(`\u2705 Signed! Signature: ${signature.slice(0, 20)}...`);
      signedRecords = [
        {
          id: pendingTx.id,
          kind: "eip712_sign",
          signature,
          from: account.address,
          description: pendingTx.description,
          timestamp: Date.now()
        }
      ];
      backendNotifications = [
        {
          type: "wallet_eip712_response",
          payload: __spreadValues({
            status: "success",
            signature,
            description: pendingTx.description
          }, pendingTx.eip712Id !== void 0 ? { pending_eip712_id: pendingTx.eip712Id } : {})
        }
      ];
    }
    cli.setPublicKey(account.address);
    session.resolveWallet(account.address, primaryChainId, {
      aaMode: resolvedUserStateAAMode,
      smartAccount: resolvedUserStateSmartAccount,
      smartAccount4337: resolvedUserStateSmartAccount4337,
      delegation7702: resolvedUserStateDelegation7702
    });
    for (const backendNotification of backendNotifications) {
      await session.client.sendSystemMessage(
        cli.sessionId,
        JSON.stringify(backendNotification),
        { app: cli.app }
      );
    }
    const syncedState = await session.syncUserState();
    cli.syncPendingFromUserState(syncedState.user_state);
    for (const signedRecord of signedRecords) {
      cli.addSignedTx(signedRecord);
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
var init_wallet2 = __esm({
  "src/cli/commands/wallet.ts"() {
    "use strict";
    init_aa();
    init_policy();
    init_wallet_utils();
    init_cli_session();
    init_errors();
    init_solana_signer();
    init_execution();
    init_output();
    init_transactions();
    init_chains();
    init_defaults();
  }
});

// src/cli/commands/simulate.ts
var simulate_exports = {};
__export(simulate_exports, {
  simulateCommand: () => simulateCommand
});
async function simulateCommand(config, txIds) {
  var _a3, _b, _c, _d;
  const cli = CliSession.load();
  if (!cli) {
    fatal("No active session. Run `aomi chat` first.");
  }
  if (txIds.length === 0) {
    fatal("Usage: aomi tx simulate <tx-id> [<tx-id> ...]\nRun `aomi tx list` to see available IDs.");
  }
  const session = cli.createClientSession(config);
  try {
    const apiState = await session.client.fetchState(
      cli.sessionId,
      void 0,
      cli.clientId
    );
    cli.syncPendingFromUserState(apiState.user_state);
  } finally {
    session.close();
  }
  const pendingTxs = txIds.map((txId) => cli.requirePendingTx(txId));
  console.log(
    `${DIM}Simulating ${txIds.length} transaction(s) as atomic batch...${RESET}`
  );
  const client = createCliClient(
    __spreadProps(__spreadValues({}, config), {
      secrets: (_a3 = config.secrets) != null ? _a3 : {}
    }),
    {
      baseUrl: cli.baseUrl,
      apiKey: cli.apiKey
    }
  );
  const transactions = pendingTxs.map((tx) => {
    var _a4, _b2, _c2;
    return {
      to: (_a4 = tx.to) != null ? _a4 : "",
      value: tx.value,
      data: tx.data,
      label: (_b2 = tx.description) != null ? _b2 : tx.id,
      chain_id: (_c2 = tx.chainId) != null ? _c2 : cli.chainId
    };
  });
  const response = await client.simulateBatch(
    cli.sessionId,
    transactions,
    {
      from: (_b = cli.publicKey) != null ? _b : void 0,
      chainId: (_c = cli.chainId) != null ? _c : void 0
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
      `${GREEN}All steps passed.${RESET} Run \`aomi tx sign ${txIds.join(" ")}\` to execute.`
    );
  } else {
    const failed = result.steps.find((s) => !s.success);
    console.log(
      `\x1B[31mBatch failed at step ${(_d = failed == null ? void 0 : failed.step) != null ? _d : "?"}.${RESET} Fix the issue and re-queue, or run \`aomi tx sign\` on the successful prefix.`
    );
  }
}
var init_simulate = __esm({
  "src/cli/commands/simulate.ts"() {
    "use strict";
    init_cli_session();
    init_client_factory();
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
function toIsoTimestamp(timestamp2) {
  if (typeof timestamp2 !== "number" || !Number.isFinite(timestamp2)) {
    return null;
  }
  try {
    return new Date(timestamp2).toISOString();
  } catch (e) {
    return null;
  }
}
function toPendingTxMetadata(tx) {
  var _a3, _b, _c, _d, _e, _f;
  return {
    id: tx.id,
    kind: tx.kind,
    txId: (_a3 = tx.txId) != null ? _a3 : null,
    eip712Id: (_b = tx.eip712Id) != null ? _b : null,
    to: (_c = tx.to) != null ? _c : null,
    value: (_d = tx.value) != null ? _d : null,
    chainId: (_e = tx.chainId) != null ? _e : null,
    description: (_f = tx.description) != null ? _f : null,
    timestamp: toIsoTimestamp(tx.timestamp)
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
    smartAccount4337: (_h = tx.smartAccount4337) != null ? _h : null,
    Delegation7702: (_i = tx.Delegation7702) != null ? _i : null,
    signature: (_j = tx.signature) != null ? _j : null,
    from: (_k = tx.from) != null ? _k : null,
    to: (_l = tx.to) != null ? _l : null,
    value: (_m = tx.value) != null ? _m : null,
    chainId: (_n = tx.chainId) != null ? _n : null,
    description: (_o = tx.description) != null ? _o : null,
    timestamp: toIsoTimestamp(tx.timestamp)
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
  const safePendingTxs = pendingTxs.filter(
    (tx) => typeof tx === "object" && tx !== null
  );
  const safeSignedTxs = signedTxs.filter(
    (tx) => typeof tx === "object" && tx !== null
  );
  const rows = [
    ...safePendingTxs.map((tx) => ({
      status: "pending",
      metadata: toPendingTxMetadata(tx)
    })),
    ...safeSignedTxs.map((tx) => ({
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
async function fetchRemoteSessionStats(record, config) {
  var _a3, _b, _c;
  const client = createCliClient(config, {
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
      toolCalls: messages.filter((msg) => Boolean(msg.tool_result)).length,
      pendingTxs: pendingTxsFromBackendUserState(
        apiState.user_state,
        (_c = record.state.pendingTxs) != null ? _c : []
      )
    };
  } catch (e) {
    return null;
  }
}
function printSessionSummary(record, stats, isActive) {
  var _a3, _b, _c, _d;
  const pendingTxs = (_b = (_a3 = stats == null ? void 0 : stats.pendingTxs) != null ? _a3 : record.state.pendingTxs) != null ? _b : [];
  const signedTxs = (_c = record.state.signedTxs) != null ? _c : [];
  const header = isActive ? `\u{1F9F5} Session id: ${record.sessionId} (session-${record.localId}, active)` : `\u{1F9F5} Session id: ${record.sessionId} (session-${record.localId})`;
  console.log(`${YELLOW}------ ${header} ------${RESET}`);
  printKeyValueTable([
    ["\u{1F9E0} topic", (_d = stats == null ? void 0 : stats.topic) != null ? _d : "Unavailable (fetch failed)"],
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
async function sessionsCommand(config) {
  var _a3;
  const sessions = listStoredSessions().sort((a, b) => b.updatedAt - a.updatedAt);
  if (sessions.length === 0) {
    console.log("No local sessions.");
    printDataFileLocation();
    return;
  }
  const activeSessionId = (_a3 = CliSession.load()) == null ? void 0 : _a3.sessionId;
  const statsResults = await Promise.all(
    sessions.map((record) => fetchRemoteSessionStats(record, config))
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
    init_cli_session();
    init_client_factory();
    init_errors();
    init_output();
    init_state2();
    init_user_state3();
    init_tables();
  }
});

// src/cli/commands/control.ts
var control_exports = {};
__export(control_exports, {
  appsCommand: () => appsCommand,
  chainsCommand: () => chainsCommand,
  currentAppCommand: () => currentAppCommand,
  currentBackendCommand: () => currentBackendCommand,
  currentChainCommand: () => currentChainCommand,
  currentModelCommand: () => currentModelCommand,
  currentWalletCommand: () => currentWalletCommand,
  eventsCommand: () => eventsCommand,
  modelsCommand: () => modelsCommand,
  setAppCommand: () => setAppCommand,
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
  const session = cli.createClientSession(config);
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
  const session = cli.createClientSession(config);
  try {
    const events = await session.client.getSystemEvents(cli.sessionId);
    console.log(JSON.stringify(events, null, 2));
  } finally {
    session.close();
  }
}
async function appsCommand(config) {
  var _a3, _b, _c, _d, _e;
  const client = createControlClient(config);
  const cli = CliSession.load();
  const sessionId = (_a3 = cli == null ? void 0 : cli.sessionId) != null ? _a3 : crypto.randomUUID();
  const apps = await client.getApps(sessionId, {
    publicKey: (_b = config.publicKey) != null ? _b : cli == null ? void 0 : cli.publicKey,
    apiKey: (_c = config.apiKey) != null ? _c : cli == null ? void 0 : cli.apiKey
  });
  if (apps.length === 0) {
    console.log("No apps available.");
    return;
  }
  const currentApp = (_d = cli == null ? void 0 : cli.app) != null ? _d : config.app;
  for (const descriptor of apps) {
    const name = descriptor.name;
    const marker = currentApp === name ? "  (current)" : "";
    const required = ((_e = descriptor.secrets) != null ? _e : []).filter((s) => s.required).map((s) => s.name);
    const requiredSuffix = required.length > 0 ? `  [requires: ${required.join(", ")}]` : "";
    console.log(`${name}${marker}${requiredSuffix}`);
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
function currentChainCommand() {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  if (cli.chainId === void 0) {
    console.log("No active chain");
  } else {
    console.log(String(cli.chainId));
  }
  printDataFileLocation();
}
function currentBackendCommand() {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  console.log(cli.baseUrl);
  printDataFileLocation();
}
function currentWalletCommand() {
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  const state = cli.toState();
  const hasAny = cli.publicKey || state.svmPublicKey;
  if (!hasAny) {
    console.log("No wallet configured");
    printDataFileLocation();
    return;
  }
  if (cli.publicKey) {
    const signerStatus = cli.privateKey ? "saved signer" : "address only";
    console.log(`EVM:    ${cli.publicKey} (${signerStatus})`);
  }
  if (state.svmPublicKey) {
    const signerStatus = state.svmPrivateKey ? "saved signer" : "address only";
    console.log(`Solana: ${state.svmPublicKey} (${signerStatus})`);
  }
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
function setAppCommand(config, app, options) {
  const trimmed = app.trim();
  if (!trimmed) {
    fatal("Usage: aomi app set <app-name>");
  }
  const cli = CliSession.loadOrCreate(__spreadProps(__spreadValues({}, config), {
    app: trimmed
  }));
  cli.mergeConfig(__spreadProps(__spreadValues({}, config), {
    app: trimmed
  }));
  console.log(`App set to ${trimmed}`);
  if ((options == null ? void 0 : options.printLocation) !== false) {
    printDataFileLocation();
  }
}
async function setModelCommand(config, model, options) {
  const cli = CliSession.loadOrCreate(config);
  const session = cli.createClientSession(config);
  try {
    await session.client.setModel(cli.sessionId, model, {
      app: cli.app,
      apiKey: cli.apiKey
    });
    cli.setModel(model);
    console.log(`Model set to ${model}`);
    if ((options == null ? void 0 : options.printLocation) !== false) {
      printDataFileLocation();
    }
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
    init_errors();
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
  const session = cli.createClientSession(config);
  try {
    const apiState = await session.client.fetchState(cli.sessionId, void 0, cli.clientId);
    cli.syncPendingFromUserState(apiState.user_state);
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
    const session = cli.createClientSession(config);
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
    init_state2();
    init_tables();
  }
});

// src/cli/commands/preferences.ts
var preferences_exports = {};
__export(preferences_exports, {
  setBackendCommand: () => setBackendCommand,
  setChainCommand: () => setChainCommand,
  setSvmWalletCommand: () => setSvmWalletCommand,
  setWalletCommand: () => setWalletCommand
});
import { privateKeyToAccount as privateKeyToAccount7 } from "viem/accounts";
function loadOrCreateForSettings() {
  const existing = CliSession.load();
  if (existing) return existing;
  return CliSession.loadOrCreate({
    baseUrl: "https://api.aomi.dev",
    app: "default",
    secrets: {}
  });
}
function setWalletCommand(privateKeyInput) {
  const privateKey = normalizePrivateKey(privateKeyInput);
  if (!privateKey) {
    fatal("Usage: aomi wallet set <private-key>  (EVM hex key)");
  }
  const account = privateKeyToAccount7(privateKey);
  const cli = loadOrCreateForSettings();
  cli.setWallet(privateKey, account.address);
  console.log(`EVM wallet set to ${account.address}`);
  printDataFileLocation();
}
function setSvmWalletCommand(keyInput) {
  let keypair;
  try {
    keypair = parseSolanaKeypairSecret(keyInput.trim());
  } catch (err) {
    fatal(
      `Invalid Solana private key: ${err instanceof Error ? err.message : err}
Usage: aomi wallet set --solana <base58-secret-key>`
    );
  }
  const publicKey = keypair.publicKey.toBase58();
  const cli = loadOrCreateForSettings();
  cli.setSvmWallet(keyInput.trim(), publicKey);
  console.log(`Solana wallet set to ${publicKey}`);
  printDataFileLocation();
}
function setChainCommand(chainIdInput) {
  const chainId3 = parseChainId(chainIdInput);
  if (chainId3 === void 0) {
    fatal("Usage: aomi chain set <chain-id>");
  }
  const cli = loadOrCreateForSettings();
  cli.setChainId(chainId3);
  console.log(`Chain set to ${chainId3}`);
  printDataFileLocation();
}
function setBackendCommand(url) {
  const trimmed = url.trim();
  if (!trimmed) {
    fatal("Usage: aomi config set-backend <url>");
  }
  const cli = loadOrCreateForSettings();
  cli.setBaseUrl(trimmed);
  console.log(`Backend set to ${trimmed}`);
  printDataFileLocation();
}
var init_preferences = __esm({
  "src/cli/commands/preferences.ts"() {
    "use strict";
    init_cli_session();
    init_output();
    init_validation();
    init_errors();
    init_solana_signer();
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
  const session = cli.createClientSession(config);
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
  const session = cli.createClientSession(config);
  try {
    await session.client.clearSecrets(cli.sessionId, clientId);
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

// src/cli/commands/byok.ts
function parseByokKeyArg(input2) {
  const [providerPart, byokKeyPart] = input2.split(/:(.+)/, 2);
  const provider = providerPart == null ? void 0 : providerPart.trim().toLowerCase();
  const byokKey = byokKeyPart == null ? void 0 : byokKeyPart.trim();
  if (!provider || !byokKey) {
    fatal(
      "Invalid format. Use: <provider>:<key> (e.g. anthropic:sk-ant-...)"
    );
  }
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    fatal(
      `Unknown provider "${provider}". Supported: anthropic, openai, openrouter`
    );
  }
  return { provider, byokKey };
}
async function createByokKeyClient(config) {
  const cli = CliSession.loadOrCreate(config);
  const client = createCliClient(config, {
    baseUrl: cli.baseUrl,
    apiKey: cli.apiKey
  });
  await client.fetchState(cli.sessionId, void 0, cli.ensureClientId());
  return { cli, client };
}
async function saveByokKeyCommand(config, byokKeyInput, options) {
  const { provider, byokKey } = parseByokKeyArg(byokKeyInput);
  const { cli, client } = await createByokKeyClient(config);
  const saved = await client.saveByokKey(cli.sessionId, provider, byokKey);
  console.log(`BYOK key set for ${saved.provider}: ${saved.key_prefix}...`);
  if ((options == null ? void 0 : options.printLocation) !== false) {
    printDataFileLocation();
  }
}
async function showByokKeysCommand(config, options) {
  const { cli, client } = await createByokKeyClient(config);
  const byokKeys = await client.listByokKeys(cli.sessionId);
  if (byokKeys.length === 0) {
    console.log("No BYOK keys set. Using system keys.");
  } else {
    for (const key of byokKeys) {
      console.log(`  ${key.provider}: ${key.key_prefix}...`);
    }
  }
  if ((options == null ? void 0 : options.printLocation) !== false) {
    printDataFileLocation();
  }
}
async function clearByokKeysCommand(config, options) {
  const { cli, client } = await createByokKeyClient(config);
  const byokKeys = await client.listByokKeys(cli.sessionId);
  if (byokKeys.length === 0) {
    console.log("No BYOK keys set. Using system keys.");
    if ((options == null ? void 0 : options.printLocation) !== false) {
      printDataFileLocation();
    }
    return;
  }
  for (const key of byokKeys) {
    await client.deleteByokKey(cli.sessionId, key.provider);
  }
  console.log("BYOK keys cleared. Using system keys.");
  if ((options == null ? void 0 : options.printLocation) !== false) {
    printDataFileLocation();
  }
}
var SUPPORTED_PROVIDERS;
var init_byok = __esm({
  "src/cli/commands/byok.ts"() {
    "use strict";
    init_cli_session();
    init_client_factory();
    init_errors();
    init_output();
    SUPPORTED_PROVIDERS = /* @__PURE__ */ new Set(["openai", "anthropic", "openrouter"]);
  }
});

// src/cli/repl.ts
var repl_exports = {};
__export(repl_exports, {
  handleReplLine: () => handleReplLine,
  runInteractiveCli: () => runInteractiveCli,
  runRootCli: () => runRootCli
});
import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
function str2(value) {
  return typeof value === "string" && value.trim() ? value : void 0;
}
function printReplHelp() {
  console.log("Commands:");
  console.log("  /heap                  Show this message");
  console.log("  /app <name>            Switch app by loaded app name");
  console.log("  /model <rig>           Set the active backend model");
  console.log("  /model list            Show available models");
  console.log("  /model show            Show the current model");
  console.log("  /key <provider:key>    Set a BYOK provider key");
  console.log("  /key show              Show current BYOK provider key status");
  console.log("  /key clear             Clear all BYOK provider keys");
  console.log("  :exit                  Quit the CLI");
}
function currentModelLabel(config) {
  var _a3;
  const cli = CliSession.loadOrCreate(config);
  return (_a3 = cli.model) != null ? _a3 : "(default backend model)";
}
async function handleModelCommand(config, command) {
  if (!command) {
    fatal("Usage: /model <rig> | /model list | /model show");
  }
  if (command === "list") {
    await modelsCommand(config);
    return;
  }
  if (command === "show") {
    console.log(`Model: ${currentModelLabel(config)}`);
    return;
  }
  const [action, maybeModel] = command.split(/\s+/, 2);
  if ((action === "main" || action === "small") && !maybeModel) {
    fatal(`Usage: /model ${action} <rig>`);
  }
  const nextModel = action === "main" || action === "small" ? maybeModel : command;
  if (!nextModel) {
    fatal("Usage: /model <rig>");
  }
  await setModelCommand(config, nextModel, { printLocation: false });
  config.model = nextModel;
}
async function handleKeyCommand(config, command) {
  if (!command) {
    fatal("Usage: /key <provider:key> | /key show | /key clear");
  }
  if (command === "show") {
    await showByokKeysCommand(config, { printLocation: false });
    return;
  }
  if (command === "clear") {
    await clearByokKeysCommand(config, { printLocation: false });
    return;
  }
  await saveByokKeyCommand(config, command, { printLocation: false });
}
async function handleReplLine(config, line, showTool) {
  const trimmed = line.trim();
  if (!trimmed) {
    return "continue";
  }
  if (trimmed === ":exit" || trimmed === ":quit") {
    return "exit";
  }
  if (trimmed === "/heap") {
    printReplHelp();
    return "continue";
  }
  if (trimmed.startsWith("/app")) {
    const app = trimmed.slice("/app".length).trim();
    if (!app) {
      fatal("Usage: /app <app-name>");
    }
    setAppCommand(config, app, { printLocation: false });
    config.app = app;
    return "continue";
  }
  if (trimmed.startsWith("/model")) {
    const command = trimmed.slice("/model".length).trim();
    await handleModelCommand(config, command);
    return "continue";
  }
  if (trimmed.startsWith("/key")) {
    const command = trimmed.slice("/key".length).trim();
    await handleKeyCommand(config, command);
    return "continue";
  }
  await chatCommand(config, trimmed, showTool);
  return "continue";
}
async function runInteractiveCli(config, options) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    fatal("Interactive mode requires a TTY. Use `--prompt` for non-interactive usage.");
  }
  CliSession.loadOrCreate(config);
  console.log("Interactive Aomi CLI ready.");
  console.log("Commands: /heap, /app <name>, /model <rig>|list|show, /key, :exit");
  const rl = createInterface({ input, output });
  try {
    while (true) {
      const line = await rl.question("> ");
      try {
        const next = await handleReplLine(config, line, (options == null ? void 0 : options.showTool) === true);
        if (next === "exit") {
          break;
        }
      } catch (err) {
        if (err instanceof CliExit) {
          continue;
        }
        throw err;
      }
    }
  } finally {
    rl.close();
  }
}
async function runRootCli(args) {
  let config = buildCliConfig(args);
  const prompt = str2(args.prompt);
  const showTool = args["show-tool"] === true;
  const byokKey = str2(args["provider-key"]);
  if (byokKey) {
    await saveByokKeyCommand(config, byokKey, { printLocation: false });
    config = __spreadProps(__spreadValues({}, config), { freshSession: false });
  }
  if (prompt) {
    await chatCommand(config, prompt, showTool);
    return;
  }
  await runInteractiveCli(config, { showTool });
}
var init_repl = __esm({
  "src/cli/repl.ts"() {
    "use strict";
    init_chat();
    init_control();
    init_byok();
    init_shared();
    init_cli_session();
    init_errors();
  }
});

// src/cli/main.ts
import { runMain } from "citty";

// src/cli/root.ts
import { defineCommand as defineCommand10 } from "citty";

// src/cli/commands/defs/chat.ts
init_shared();
import { defineCommand } from "citty";
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
init_shared();
import { defineCommand as defineCommand2 } from "citty";
var txListDef = defineCommand2({
  meta: { name: "list", description: "List pending and signed transactions" },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { txCommand: txCommand2 } = await Promise.resolve().then(() => (init_wallet2(), wallet_exports));
    await txCommand2(buildCliConfig(args));
  }
});
var txSimulateDef = defineCommand2({
  meta: { name: "simulate", description: "Simulate a batch of pending transactions" },
  args: __spreadProps(__spreadValues({}, globalArgs), {
    txIds: {
      type: "positional",
      description: "Transaction IDs to simulate",
      required: false
    }
  }),
  async run({ args }) {
    const { simulateCommand: simulateCommand2 } = await Promise.resolve().then(() => (init_simulate(), simulate_exports));
    const txIds = getPositionals(args);
    await simulateCommand2(buildCliConfig(args), txIds);
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
    const { signCommand: signCommand2 } = await Promise.resolve().then(() => (init_wallet2(), wallet_exports));
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
init_shared();
import { defineCommand as defineCommand3 } from "citty";
var sessionListDef = defineCommand3({
  meta: { name: "list", description: "List local sessions with metadata" },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { sessionsCommand: sessionsCommand2 } = await Promise.resolve().then(() => (init_sessions(), sessions_exports));
    await sessionsCommand2(buildCliConfig(args));
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
init_shared();
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
init_shared();
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
var chainSetDef = defineCommand6({
  meta: { name: "set", description: "Persist the active chain ID" },
  args: {
    id: {
      type: "positional",
      description: "Chain ID",
      required: true
    }
  },
  async run({ args }) {
    const { setChainCommand: setChainCommand2 } = await Promise.resolve().then(() => (init_preferences(), preferences_exports));
    setChainCommand2(args.id);
  }
});
var chainCurrentDef = defineCommand6({
  meta: { name: "current", description: "Show the active chain ID" },
  args: {},
  async run() {
    const { currentChainCommand: currentChainCommand2 } = await Promise.resolve().then(() => (init_control(), control_exports));
    currentChainCommand2();
  }
});
var chainDef = defineCommand6({
  meta: { name: "chain", description: "Chain information" },
  subCommands: {
    list: chainListDef,
    set: chainSetDef,
    current: chainCurrentDef
  }
});

// src/cli/commands/defs/wallet.ts
import { defineCommand as defineCommand7 } from "citty";
var walletSetDef = defineCommand7({
  meta: {
    name: "set",
    description: "Persist a signing key and derived wallet address. Defaults to EVM (hex key). Pass --solana for a Solana keypair (base58)."
  },
  args: {
    privateKey: {
      type: "positional",
      description: "Hex EVM private key (default) or Solana base58 key when --solana is set",
      required: false
    },
    evm: {
      type: "string",
      description: "EVM hex private key to persist (alternative to positional)",
      alias: ["e"]
    },
    solana: {
      type: "string",
      description: "Solana base58 secret key to persist",
      alias: ["s"]
    }
  },
  async run({ args }) {
    var _a3;
    const solanaKey = args.solana;
    if (solanaKey) {
      const { setSvmWalletCommand: setSvmWalletCommand2 } = await Promise.resolve().then(() => (init_preferences(), preferences_exports));
      setSvmWalletCommand2(solanaKey);
      return;
    }
    const evmKey = (_a3 = args.evm) != null ? _a3 : args.privateKey;
    if (!evmKey) {
      const { fatal: fatal2 } = await Promise.resolve().then(() => (init_errors(), errors_exports));
      fatal2(
        "Usage:\n  aomi wallet set <evm-hex-key>          # EVM (default)\n  aomi wallet set --evm <evm-hex-key>    # EVM (explicit)\n  aomi wallet set --solana <base58-key>  # Solana"
      );
    }
    const { setWalletCommand: setWalletCommand2 } = await Promise.resolve().then(() => (init_preferences(), preferences_exports));
    setWalletCommand2(evmKey);
  }
});
var walletCurrentDef = defineCommand7({
  meta: { name: "current", description: "Show the configured wallet address" },
  args: {},
  async run() {
    const { currentWalletCommand: currentWalletCommand2 } = await Promise.resolve().then(() => (init_control(), control_exports));
    currentWalletCommand2();
  }
});
var walletDef = defineCommand7({
  meta: { name: "wallet", description: "Wallet configuration" },
  subCommands: {
    set: walletSetDef,
    current: walletCurrentDef
  }
});

// src/cli/commands/defs/config.ts
import { defineCommand as defineCommand8 } from "citty";
var configSetBackendDef = defineCommand8({
  meta: { name: "set-backend", description: "Persist the backend base URL" },
  args: {
    url: {
      type: "positional",
      description: "Backend URL",
      required: true
    }
  },
  async run({ args }) {
    const { setBackendCommand: setBackendCommand2 } = await Promise.resolve().then(() => (init_preferences(), preferences_exports));
    setBackendCommand2(args.url);
  }
});
var configCurrentDef = defineCommand8({
  meta: { name: "current", description: "Show the configured backend URL" },
  args: {},
  async run() {
    const { currentBackendCommand: currentBackendCommand2 } = await Promise.resolve().then(() => (init_control(), control_exports));
    currentBackendCommand2();
  }
});
var configDef = defineCommand8({
  meta: { name: "config", description: "CLI configuration" },
  subCommands: {
    "set-backend": configSetBackendDef,
    current: configCurrentDef
  }
});

// src/cli/commands/defs/secret.ts
init_errors();
init_shared();
import { defineCommand as defineCommand9 } from "citty";
var secretListDef = defineCommand9({
  meta: { name: "list", description: "List configured secrets for the active session" },
  args: {},
  async run() {
    const { listSecretsCommand: listSecretsCommand2 } = await Promise.resolve().then(() => (init_secrets(), secrets_exports));
    listSecretsCommand2();
  }
});
var secretClearDef = defineCommand9({
  meta: { name: "clear", description: "Clear all secrets for the active session" },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { clearSecretsCommand: clearSecretsCommand2 } = await Promise.resolve().then(() => (init_secrets(), secrets_exports));
    await clearSecretsCommand2(buildCliConfig(args));
  }
});
var secretAddDef = defineCommand9({
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
var secretDef = defineCommand9({
  meta: { name: "secret", description: "Secret management" },
  subCommands: {
    list: secretListDef,
    clear: secretClearDef,
    add: secretAddDef
  }
});

// src/cli/root.ts
init_shared();

// package.json
var package_default = {
  name: "@aomi-labs/client",
  version: "0.1.39",
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
    "@solana/web3.js": "^1.98.4",
    bs58: "^6.0.0",
    citty: "^0.2.2",
    permissionless: "^0.3.5",
    viem: "^2.47.11"
  }
};

// src/cli/root.ts
var SUBCOMMAND_NAMES = /* @__PURE__ */ new Set([
  "chat",
  "tx",
  "session",
  "model",
  "app",
  "chain",
  "wallet",
  "config",
  "secret"
]);
var root = defineCommand10({
  meta: {
    name: "aomi",
    version: package_default.version,
    description: "CLI client for Aomi on-chain agent"
  },
  args: __spreadProps(__spreadValues({}, globalArgs), {
    prompt: {
      type: "string",
      alias: "p",
      description: "Send a single prompt and exit"
    },
    "show-tool": {
      type: "boolean",
      description: "Show tool output while chatting from root mode"
    },
    "provider-key": {
      type: "string",
      description: "Use your own provider API key. Format: PROVIDER:KEY"
    }
  }),
  async run({ args, rawArgs }) {
    const firstToken = rawArgs.find((arg) => !arg.startsWith("-"));
    if (firstToken && SUBCOMMAND_NAMES.has(firstToken)) {
      return;
    }
    const { runRootCli: runRootCli2 } = await Promise.resolve().then(() => (init_repl(), repl_exports));
    await runRootCli2(args);
  },
  subCommands: {
    chat: chatDef,
    tx: txDef,
    session: sessionDef,
    model: modelDef,
    app: appDef,
    chain: chainDef,
    wallet: walletDef,
    config: configDef,
    secret: secretDef
  }
});

// src/cli/main.ts
init_errors();
var ROOT_SUBCOMMANDS = /* @__PURE__ */ new Set([
  "chat",
  "tx",
  "session",
  "model",
  "app",
  "chain",
  "wallet",
  "config",
  "secret"
]);
function isPnpmExecWrapper() {
  var _a3, _b;
  const npmCommand = (_a3 = process.env.npm_command) != null ? _a3 : "";
  const userAgent = (_b = process.env.npm_config_user_agent) != null ? _b : "";
  return npmCommand === "exec" && userAgent.includes("pnpm/");
}
function shouldPrintRootHelp(rawArgs) {
  if (!rawArgs.includes("--help") && !rawArgs.includes("-h")) {
    return false;
  }
  const firstToken = rawArgs.find((arg) => !arg.startsWith("-"));
  return !firstToken || !ROOT_SUBCOMMANDS.has(firstToken);
}
function printRootHelp() {
  console.log(`CLI client for Aomi on-chain agent (aomi v${package_default.version})`);
  console.log("");
  console.log("USAGE");
  console.log("");
  console.log("  aomi");
  console.log("  aomi --prompt <prompt> [OPTIONS]");
  console.log("  aomi [OPTIONS] <command>");
  console.log("");
  console.log("ROOT MODES");
  console.log("");
  console.log("  aomi                         Start the interactive REPL");
  console.log('  aomi --prompt "hello"        Send one prompt and exit');
  console.log("");
  console.log("REPL COMMANDS");
  console.log("");
  console.log("  /heap                        Show REPL help");
  console.log("  /app <name>                  Switch the active app");
  console.log("  /model <rig>|list|show       Manage the active model");
  console.log("  /key <provider:key>|show|clear");
  console.log("                               Manage BYOK provider keys");
  console.log("  :exit                        Quit the CLI");
  console.log("");
  console.log("OPTIONS");
  console.log("");
  console.log("  --backend-url <url>          Backend URL");
  console.log("  --api-key <key>              API key for non-default apps");
  console.log("  --account-bearer <token>     Aomi account bearer for authenticated requests");
  console.log("  --account-provider <name>    Upstream auth provider (para | privy)");
  console.log("  --account-provider-token <t>");
  console.log("                               Provider token exchanged for an Aomi bearer");
  console.log("  --app <name>                 Active app");
  console.log("  --model <rig>                Active model");
  console.log("  --new-session                Create a fresh active session");
  console.log("  --chain <id>                 Active chain for chat/session context");
  console.log("  --public-key <address>       Wallet address for chat context");
  console.log("  --private-key <hex>          Signing key for EVM tx sign");
  console.log("  --solana-private-key <key>   Solana keypair (base58 or JSON byte array)");
  console.log("  --rpc-url <url>              RPC URL for signing");
  console.log("  -p, --prompt <prompt>        Send a single prompt and exit");
  console.log("  --show-tool                  Show tool output in root prompt/REPL mode");
  console.log("  --provider-key <provider:key>");
  console.log("                               Save a BYOK provider key before running");
  console.log("");
  console.log("COMMANDS");
  console.log("");
  console.log("  chat                         Explicit one-shot chat command");
  console.log("  tx                           Transaction management");
  console.log("  session                      Session management");
  console.log("  model                        Model management");
  console.log("  app                          App management");
  console.log("  chain                        Chain information");
  console.log("  wallet                       Wallet configuration");
  console.log("  config                       CLI configuration");
  console.log("  secret                       Secret management");
  console.log("");
  console.log("Use aomi <command> --help for command-specific details.");
}
async function runCli(argv = process.argv) {
  const strictExit = process.env.AOMI_CLI_STRICT_EXIT === "1";
  const rawArgs = argv.slice(2);
  try {
    if (shouldPrintRootHelp(rawArgs)) {
      printRootHelp();
      return;
    }
    await runMain(root, { rawArgs });
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
