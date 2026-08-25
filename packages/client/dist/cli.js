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
  DeployCliError: () => DeployCliError,
  fatal: () => fatal,
  mapDeployHttpError: () => mapDeployHttpError
});
function mapDeployHttpError(status, message) {
  if (status === 401 || status === 403) {
    return new DeployCliError("AUTH_FAILED", message);
  }
  return new DeployCliError("BACKEND_ERROR", message);
}
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
  if (process.env.AOMI_CLI_STRICT_EXIT === "1") {
    throw new CliExit(1);
  }
  process.exit(1);
}
var CliExit, DeployCliError;
var init_errors = __esm({
  "src/cli/errors.ts"() {
    "use strict";
    CliExit = class extends Error {
      constructor(code) {
        super();
        this.code = code;
      }
    };
    DeployCliError = class extends Error {
      constructor(errorCode, message) {
        super(message);
        this.name = "DeployCliError";
        this.errorCode = errorCode;
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
  baseSepolia,
  sepolia,
  linea,
  lineaSepolia,
  foundry
} from "viem/chains";
var monad, monadTestnet, robinhood, megaeth, arcTestnet, SUPPORTED_CHAINS, SUPPORTED_CHAIN_IDS, CHAIN_NAMES;
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
    robinhood = defineChain({
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
    megaeth = defineChain({
      id: 4326,
      name: "MegaETH",
      nativeCurrency: {
        name: "Ether",
        symbol: "ETH",
        decimals: 18
      },
      rpcUrls: {
        default: {
          http: ["https://mainnet.megaeth.com/rpc"]
        }
      },
      blockExplorers: {
        default: {
          name: "MegaETH Explorer",
          url: "https://mega.etherscan.io"
        }
      }
    });
    arcTestnet = defineChain({
      id: 5042002,
      name: "Arc Testnet",
      nativeCurrency: {
        name: "USDC",
        symbol: "USDC",
        // Arc RPC quantities use 18-decimal native precision, but EIP-3085 chain
        // metadata uses USDC's 6 display decimals. Callers handling raw
        // eth_getBalance/msg.value must retain the 18-decimal internal boundary.
        decimals: 6
      },
      rpcUrls: {
        default: {
          http: [
            "https://rpc.testnet.arc.io",
            "https://rpc.drpc.testnet.arc.io",
            "https://rpc.quicknode.testnet.arc.io"
          ]
        }
      },
      blockExplorers: {
        default: {
          name: "ArcScan",
          url: "https://testnet.arcscan.app"
        }
      },
      testnet: true
    });
    SUPPORTED_CHAINS = [
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
      { id: 4326, name: "MegaETH", ticker: "ETH" },
      { id: 5042002, name: "Arc Testnet", ticker: "USDC" },
      { id: 31337, name: "Anvil (local)", ticker: "ETH" }
    ];
    SUPPORTED_CHAIN_IDS = SUPPORTED_CHAINS.map((chain) => chain.id);
    CHAIN_NAMES = Object.fromEntries(
      SUPPORTED_CHAINS.map((chain) => [chain.id, chain.name])
    );
  }
});

// src/cli/solana-signer.ts
import { Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
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
function signSolanaMessage(messageBase64, keypair) {
  const message = decodeBase64(messageBase64);
  if (message.length === 0) {
    throw new Error("Solana message must decode to at least one byte.");
  }
  const signature = nacl.sign.detached(message, keypair.secretKey);
  return {
    signer: keypair.publicKey.toBase58(),
    signatureBase64: encodeBase64(signature)
  };
}
var init_solana_signer = __esm({
  "src/cli/solana-signer.ts"() {
    "use strict";
  }
});

// src/cli/validation.ts
function parseChainId(value) {
  if (value === void 0) return void 0;
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return void 0;
  if (!SUPPORTED_CHAIN_IDS.includes(n)) {
    const list2 = SUPPORTED_CHAIN_IDS.map(
      (id) => `  ${id} (${CHAIN_NAMES[id]})`
    ).join("\n");
    fatal(`Unsupported chain ID: ${n}
Supported chains:
${list2}`);
  }
  return n;
}
function normalizePrivateKey(value) {
  if (value === void 0) return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  if (!EVM_PRIVATE_KEY_PATTERN.test(trimmed)) {
    fatal("Invalid private key. Expected a 0x-prefixed 32-byte hex string.");
  }
  return trimmed;
}
function validateSolanaPrivateKey(value) {
  if (value === void 0) return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  try {
    parseSolanaKeypairSecret(trimmed);
  } catch (err) {
    fatal(
      `Invalid Solana private key: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  return trimmed;
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
function parsePaymentMethod(value) {
  if (value === void 0 || value.trim() === "") return void 0;
  const normalized = value.trim().toLowerCase();
  if (normalized === "coinbase") {
    return normalized;
  }
  fatal("Unsupported payment method. Use `coinbase`.");
}
var EVM_PRIVATE_KEY_PATTERN;
var init_validation = __esm({
  "src/cli/validation.ts"() {
    "use strict";
    init_chains();
    init_errors();
    init_solana_signer();
    EVM_PRIVATE_KEY_PATTERN = /^0x[0-9a-fA-F]{64}$/;
  }
});

// src/cli/commands/defs/shared.ts
var shared_exports = {};
__export(shared_exports, {
  buildCliConfig: () => buildCliConfig,
  getPositionals: () => getPositionals,
  globalArgs: () => globalArgs,
  parseSvmCluster: () => parseSvmCluster
});
import { privateKeyToAccount } from "viem/accounts";
function parseEmbeddedProvider(raw) {
  if (!raw) return void 0;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "para" || normalized === "privy") {
    return normalized;
  }
  fatal(`Unknown --embedded-provider value "${raw}". Use "para" or "privy".`);
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
      fatal(
        `Unknown --cluster value "${raw}". Use "mainnet-beta", "devnet", or "testnet".`
      );
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
    fatal("Invalid private key. Expected a 0x-prefixed 32-byte hex string.");
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
  var _a3, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r;
  const execution = resolveExecution(args);
  const privateKey = normalizePrivateKey(
    (_a3 = str(args["private-key"])) != null ? _a3 : process.env.PRIVATE_KEY
  );
  const configuredPublicKey = (_b = str(args["public-key"])) != null ? _b : process.env.AOMI_PUBLIC_KEY;
  const derivedPublicKey = derivePublicKeyFromPrivateKey(privateKey);
  const accountBearer = (_c = str(args["account-bearer"])) != null ? _c : process.env.AOMI_ACCOUNT_BEARER;
  const embeddedProvider = parseEmbeddedProvider(
    (_d = str(args["embedded-provider"])) != null ? _d : process.env.AOMI_EMBEDDED_PROVIDER
  );
  const embeddedProviderToken = (_e = str(args["embedded-provider-token"])) != null ? _e : process.env.AOMI_EMBEDDED_PROVIDER_TOKEN;
  if (configuredPublicKey && !/^0x[0-9a-fA-F]{40}$/.test(configuredPublicKey.trim())) {
    fatal(
      "`--public-key` must be a 0x-prefixed EVM address. For a Solana identity, run `aomi wallet set --solana <key>` or pass `--solana-private-key`."
    );
  }
  if (configuredPublicKey && derivedPublicKey && configuredPublicKey.toLowerCase() !== derivedPublicKey.toLowerCase()) {
    fatal(
      "`--public-key` does not match the address derived from `--private-key`."
    );
  }
  const aaProvider = parseAAProvider(
    (_f = str(args["aa-provider"])) != null ? _f : process.env.AOMI_AA_PROVIDER
  );
  const aaMode = parseAAMode((_g = str(args["aa-mode"])) != null ? _g : process.env.AOMI_AA_MODE);
  if (execution === "eoa" && (aaProvider || aaMode)) {
    fatal("`--aa-provider` and `--aa-mode` cannot be used with `--eoa`.");
  }
  if (accountBearer && (embeddedProvider || embeddedProviderToken)) {
    fatal(
      "Choose either `--account-bearer` or the `--embedded-provider` + `--embedded-provider-token` pair."
    );
  }
  if (embeddedProvider && !embeddedProviderToken) {
    fatal(
      "`--embedded-provider-token` is required when `--embedded-provider` is set."
    );
  }
  if (embeddedProviderToken && !embeddedProvider) {
    fatal(
      "`--embedded-provider` is required when `--embedded-provider-token` is set."
    );
  }
  const solanaPrivateKey = validateSolanaPrivateKey(
    (_h = str(args["solana-private-key"])) != null ? _h : process.env.SOLANA_PRIVATE_KEY
  );
  const svmCluster = parseSvmCluster(
    (_i = str(args.cluster)) != null ? _i : process.env.AOMI_SOLANA_CLUSTER
  );
  return {
    baseUrl: (_j = str(args["backend-url"])) != null ? _j : process.env.AOMI_BACKEND_URL,
    apiKey: (_k = str(args["api-key"])) != null ? _k : process.env.AOMI_API_KEY,
    json: args.json === true,
    verbose: args.verbose === true,
    accountBearer,
    embeddedProvider,
    embeddedProviderToken,
    app: (_l = str(args.app)) != null ? _l : process.env.AOMI_APP,
    applicationId: (_m = str(args["application-id"])) != null ? _m : process.env.AOMI_APPLICATION_ID,
    appPlatform: (_n = str(args.platform)) != null ? _n : process.env.AOMI_APP_PLATFORM,
    model: (_o = str(args.model)) != null ? _o : process.env.AOMI_MODEL,
    freshSession: args["new-session"] === true,
    publicKey: configuredPublicKey != null ? configuredPublicKey : derivedPublicKey,
    privateKey,
    solanaPrivateKey,
    svmCluster,
    chainRpcUrl: (_p = str(args["rpc-url"])) != null ? _p : process.env.CHAIN_RPC_URL,
    chain: parseChainId((_q = str(args.chain)) != null ? _q : process.env.AOMI_CHAIN_ID),
    secrets: {},
    execution,
    aaProvider,
    aaMode,
    paymentMethod: parsePaymentMethod(
      (_r = str(args["payment-method"])) != null ? _r : process.env.AOMI_PAYMENT_METHOD
    )
  };
}
function getPositionals(args) {
  const positionals = args._;
  if (!Array.isArray(positionals)) {
    return [];
  }
  return positionals.filter(
    (value) => typeof value === "string"
  );
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
        description: "Aomi API/BFF URL (default: https://chat.aomi.dev)"
      },
      "api-key": {
        type: "string",
        description: "API key for non-default apps"
      },
      json: {
        type: "boolean",
        description: "Print machine-readable JSON where supported"
      },
      verbose: {
        type: "boolean",
        description: "Show extra diagnostics such as local state file paths"
      },
      "account-bearer": {
        type: "string",
        description: "Aomi account bearer for authenticated REST/SSE requests"
      },
      "embedded-provider": {
        type: "string",
        description: 'Deprecated legacy provider exchange config ("para" or "privy")'
      },
      "embedded-provider-token": {
        type: "string",
        description: "Deprecated legacy provider token; use --account-bearer"
      },
      app: {
        type: "string",
        description: 'App (default: "default")'
      },
      "application-id": {
        type: "string",
        description: "Hosted app identity for discovery; execution returns 501 until Phase 10"
      },
      platform: {
        type: "string",
        description: "Hosted app platform for discovery; execution returns 501 until Phase 10"
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
      },
      "payment-method": {
        type: "string",
        description: 'Payment method for paid Agent/Pipeline calls, e.g. "coinbase"'
      }
    };
  }
});

// src/app-descriptor.ts
function normalizeAppDescriptor(item) {
  var _a3, _b;
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
  const applicationId = (_b = (_a3 = raw.applicationId) != null ? _a3 : raw.application_id) != null ? _b : raw.id;
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
var init_app_descriptor = __esm({
  "src/app-descriptor.ts"() {
    "use strict";
  }
});

// src/agent/transport.ts
async function parseAgentResponse(response) {
  var _a3, _b, _c, _d, _e, _f, _g, _h;
  if (response.ok) {
    if (response.status === 204) return void 0;
    return await response.json();
  }
  const body = await response.json().catch(() => null);
  const code = (_b = (_a3 = body == null ? void 0 : body.error) == null ? void 0 : _a3.code) != null ? _b : "agent_request_failed";
  throw new AgentApiError(
    response.status,
    code,
    (_d = (_c = body == null ? void 0 : body.error) == null ? void 0 : _c.message) != null ? _d : `Agent request failed with HTTP ${response.status}`,
    response.status === 408 || response.status === 429 || response.status >= 500,
    (_g = (_f = (_e = body == null ? void 0 : body.error) == null ? void 0 : _e.requestId) != null ? _f : response.headers.get("x-request-id")) != null ? _g : void 0,
    (_h = body == null ? void 0 : body.error) == null ? void 0 : _h.details
  );
}
function mutationHeaders(options = {}) {
  var _a3;
  return __spreadValues({
    "idempotency-key": (_a3 = options.idempotencyKey) != null ? _a3 : randomIdempotencyKey()
  }, options.paymentSignature ? { "payment-signature": options.paymentSignature } : {});
}
function randomIdempotencyKey() {
  return `idem_${globalThis.crypto.randomUUID().replaceAll("-", "")}`;
}
var AgentApiError, AgentTransport, AgentSessionsTransport;
var init_transport = __esm({
  "src/agent/transport.ts"() {
    "use strict";
    AgentApiError = class extends Error {
      constructor(status, code, message, retryable, requestId, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.retryable = retryable;
        this.requestId = requestId;
        this.details = details;
        this.name = "AgentApiError";
      }
    };
    AgentTransport = class {
      constructor(requestResponse) {
        this.requestResponse = requestResponse;
        this.sessions = new AgentSessionsTransport(requestResponse);
      }
      start(request, options = {}) {
        return this.json("POST", "/v1/agent/chat", {
          headers: mutationHeaders(options),
          body: request
        });
      }
      check(sessionId, options = {}) {
        var _a3;
        return this.json("GET", `/v1/agent/chat/${encodeURIComponent(sessionId)}`, {
          query: {
            cursor: options.cursor,
            wait: Math.min(Math.max((_a3 = options.waitMs) != null ? _a3 : 0, 0), 3e4)
          }
        });
      }
      interrupt(sessionId) {
        return this.json(
          "POST",
          `/v1/agent/chat/${encodeURIComponent(sessionId)}/interrupt`,
          { headers: mutationHeaders() }
        );
      }
      async resolveAction(sessionId, actionId, result, idempotencyKey = randomIdempotencyKey()) {
        const response = await this.json(
          "POST",
          `/v1/agent/chat/${encodeURIComponent(sessionId)}/actions/${encodeURIComponent(actionId)}/result`,
          { headers: { "idempotency-key": idempotencyKey }, body: result }
        );
        return response.action;
      }
      async json(method, path, options) {
        return parseAgentResponse(
          await this.requestResponse(method, path, options)
        );
      }
    };
    AgentSessionsTransport = class {
      constructor(requestResponse) {
        this.requestResponse = requestResponse;
      }
      async list(options = {}) {
        return this.json("GET", "/v1/agent/sessions", {
          query: { cursor: options.cursor, limit: options.limit }
        });
      }
      async all() {
        var _a3;
        const sessions = [];
        let cursor;
        do {
          const page = await this.list({ cursor, limit: 100 });
          sessions.push(...page.sessions);
          cursor = (_a3 = page.nextCursor) != null ? _a3 : void 0;
        } while (cursor);
        return sessions;
      }
      get(sessionId) {
        return this.json(
          "GET",
          `/v1/agent/sessions/${encodeURIComponent(sessionId)}`
        );
      }
      update(sessionId, patch) {
        return this.json(
          "PATCH",
          `/v1/agent/sessions/${encodeURIComponent(sessionId)}`,
          {
            headers: mutationHeaders(),
            body: patch
          }
        );
      }
      async delete(sessionId) {
        await parseAgentResponse(
          await this.requestResponse(
            "DELETE",
            `/v1/agent/sessions/${encodeURIComponent(sessionId)}`,
            { headers: mutationHeaders() }
          )
        );
      }
      async json(method, path, options) {
        return parseAgentResponse(
          await this.requestResponse(method, path, options)
        );
      }
    };
  }
});

// src/pipeline/schema.ts
function validatePipelineArguments(value, schema) {
  validate(value, schema, "$arguments");
}
function validate(value, schema, path) {
  var _a3;
  if (schema === true) return;
  if (schema === false) throw new PipelineSchemaError(path, "is not allowed");
  const variants = (_a3 = schema.oneOf) != null ? _a3 : schema.anyOf;
  if (Array.isArray(variants) && variants.length > 0) {
    const accepted = variants.some((variant) => {
      if (!isSchema(variant)) return false;
      try {
        validate(value, variant, path);
        return true;
      } catch (error) {
        if (error instanceof PipelineSchemaError) return false;
        throw error;
      }
    });
    if (!accepted) {
      throw new PipelineSchemaError(path, "does not match an accepted shape");
    }
    return;
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    throw new PipelineSchemaError(path, "is not an allowed value");
  }
  const type = schema.type;
  if (typeof type === "string" && !matchesType(value, type)) {
    throw new PipelineSchemaError(path, `must be ${article(type)}${type}`);
  }
  if (type === "object" || schema.properties || schema.required) {
    if (!isRecord(value)) {
      throw new PipelineSchemaError(path, "must be an object");
    }
    const required3 = Array.isArray(schema.required) ? schema.required.filter(
      (item) => typeof item === "string"
    ) : [];
    for (const key of required3) {
      if (!(key in value)) {
        throw new PipelineSchemaError(`${path}.${key}`, "is required");
      }
    }
    if (isRecord(schema.properties)) {
      for (const [key, childSchema] of Object.entries(schema.properties)) {
        if (key in value && isSchema(childSchema)) {
          validate(value[key], childSchema, `${path}.${key}`);
        }
      }
    }
  }
  if (type === "array" && Array.isArray(value) && isSchema(schema.items)) {
    value.forEach(
      (item, index) => validate(item, schema.items, `${path}[${index}]`)
    );
  }
}
function matchesType(value, type) {
  switch (type) {
    case "null":
      return value === null;
    case "array":
      return Array.isArray(value);
    case "object":
      return isRecord(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "string":
      return typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
    default:
      return true;
  }
}
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function isSchema(value) {
  return typeof value === "boolean" || isRecord(value);
}
function article(value) {
  return /^[aeiou]/i.test(value) ? "an " : "a ";
}
var PipelineSchemaError;
var init_schema = __esm({
  "src/pipeline/schema.ts"() {
    "use strict";
    PipelineSchemaError = class extends TypeError {
      constructor(path, message) {
        super(`${path}: ${message}`);
        this.path = path;
        this.name = "PipelineSchemaError";
      }
    };
  }
});

// src/pipeline/transport.ts
async function invokeOperation(requestResponse, path, args, options = {}) {
  if (options.validate !== false) {
    const descriptor = await json(
      requestResponse,
      "GET",
      path
    );
    validatePipelineArguments(args, descriptor.inputSchema);
  }
  return json(requestResponse, "POST", path, {
    headers: mutationHeaders2(options),
    body: jsonBody(args)
  });
}
async function json(requestResponse, method, path, options) {
  return parsePipelineResponse(await requestResponse(method, path, options));
}
async function parsePipelineResponse(response) {
  if (response.ok) {
    if (response.status === 204) return void 0;
    return await response.json();
  }
  throw await pipelineError(response);
}
async function pipelineError(response) {
  var _a3, _b, _c, _d, _e, _f, _g, _h;
  const body = await response.json().catch(() => null);
  return new PipelineApiError(
    response.status,
    (_b = (_a3 = body == null ? void 0 : body.error) == null ? void 0 : _a3.code) != null ? _b : "pipeline_request_failed",
    (_d = (_c = body == null ? void 0 : body.error) == null ? void 0 : _c.message) != null ? _d : `Pipeline request failed with HTTP ${response.status}`,
    response.status === 408 || response.status === 429 || response.status >= 500,
    (_g = (_f = (_e = body == null ? void 0 : body.error) == null ? void 0 : _e.requestId) != null ? _f : response.headers.get("x-request-id")) != null ? _g : void 0,
    (_h = body == null ? void 0 : body.error) == null ? void 0 : _h.details
  );
}
function jsonBody(value) {
  return normalizeJson(value);
}
function normalizeJson(value) {
  if (typeof value === "bigint") return value.toString(10);
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeJson(item)])
    );
  }
  return value;
}
function required(name, value) {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`${name} is required`);
  return normalized;
}
function pipelinePath(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const full = normalized.startsWith("/v1/pipeline") ? normalized : `/v1/pipeline${normalized}`;
  if (full !== "/v1/pipeline" && !full.startsWith("/v1/pipeline/")) {
    throw new TypeError("path must resolve beneath /v1/pipeline");
  }
  return full.replace(/\/+$/, "");
}
function operationPath(path) {
  const full = pipelinePath(path);
  if (!/\/operations\/[^/]+$/.test(full)) {
    throw new TypeError("operation path must end in /operations/{operation}");
  }
  return full;
}
function commitHeaders(digest, options) {
  var _a3;
  return mutationHeaders2(__spreadProps(__spreadValues({}, options), {
    idempotencyKey: (_a3 = options.idempotencyKey) != null ? _a3 : digest
  }));
}
function mutationHeaders2(options) {
  var _a3;
  return __spreadValues({
    "idempotency-key": required(
      "idempotencyKey",
      (_a3 = options.idempotencyKey) != null ? _a3 : randomIdempotencyKey2()
    )
  }, options.paymentSignature ? { "payment-signature": options.paymentSignature } : {});
}
function executionHeaders(options) {
  return mutationHeaders2(options);
}
function randomIdempotencyKey2() {
  return `idem_${globalThis.crypto.randomUUID().replaceAll("-", "")}`;
}
var PipelineApiError, EvmPipelineTransport, SvmPipelineTransport, PipelineOperationTransport, PipelineSkillTransport, PipelineAppsTransport, PipelineSkillsTransport, PipelineTransport;
var init_transport2 = __esm({
  "src/pipeline/transport.ts"() {
    "use strict";
    init_schema();
    PipelineApiError = class extends Error {
      constructor(status, code, message, retryable, requestId, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.retryable = retryable;
        this.requestId = requestId;
        this.details = details;
        this.name = "PipelineApiError";
      }
    };
    EvmPipelineTransport = class {
      constructor(requestResponse) {
        this.requestResponse = requestResponse;
      }
      build(input2) {
        return json(this.requestResponse, "POST", "/v1/pipeline/evm/build", {
          body: jsonBody(input2)
        });
      }
      stage(input2) {
        return json(this.requestResponse, "POST", "/v1/pipeline/evm/stage", {
          body: jsonBody(input2)
        });
      }
      simulate(build) {
        return json(this.requestResponse, "POST", "/v1/pipeline/evm/simulate", {
          body: { build: jsonBody(build) }
        });
      }
      commit(build, options = {}) {
        return json(this.requestResponse, "POST", "/v1/pipeline/evm/commit", {
          headers: commitHeaders(build.digest, options),
          body: { build: jsonBody(build) }
        });
      }
    };
    SvmPipelineTransport = class {
      constructor(requestResponse) {
        this.requestResponse = requestResponse;
      }
      build(input2) {
        return json(this.requestResponse, "POST", "/v1/pipeline/svm/build", {
          body: jsonBody(input2)
        });
      }
      stage(input2) {
        return json(this.requestResponse, "POST", "/v1/pipeline/svm/stage", {
          body: jsonBody(input2)
        });
      }
      simulate(build) {
        return json(this.requestResponse, "POST", "/v1/pipeline/svm/simulate", {
          body: { build: jsonBody(build) }
        });
      }
      commit(build, options = {}) {
        return json(this.requestResponse, "POST", "/v1/pipeline/svm/commit", {
          headers: commitHeaders(build.digest, options),
          body: { build: jsonBody(build) }
        });
      }
    };
    PipelineOperationTransport = class {
      constructor(requestResponse, scope, owner) {
        this.requestResponse = requestResponse;
        this.href = `/v1/pipeline/${scope}/${encodeURIComponent(required("name", owner))}`;
      }
      directory() {
        return json(this.requestResponse, "GET", this.href);
      }
      operations() {
        return json(this.requestResponse, "GET", `${this.href}/operations`);
      }
      operation(name) {
        return json(
          this.requestResponse,
          "GET",
          `${this.href}/operations/${encodeURIComponent(required("operation", name))}`
        );
      }
      invoke(name, args, options) {
        return invokeOperation(
          this.requestResponse,
          `${this.href}/operations/${encodeURIComponent(required("operation", name))}`,
          args,
          options
        );
      }
    };
    PipelineSkillTransport = class extends PipelineOperationTransport {
      constructor(skillRequestResponse, skill) {
        super(skillRequestResponse, "skills", skill);
        this.skillRequestResponse = skillRequestResponse;
      }
      async instructions() {
        const response = await this.skillRequestResponse(
          "GET",
          `${this.href}/SKILL.md`,
          { headers: { accept: "text/markdown" } }
        );
        if (!response.ok) throw await pipelineError(response);
        return response.text();
      }
    };
    PipelineAppsTransport = class {
      constructor(requestResponse) {
        this.requestResponse = requestResponse;
      }
      list() {
        return json(this.requestResponse, "GET", "/v1/pipeline/apps");
      }
      get(app) {
        return new PipelineOperationTransport(this.requestResponse, "apps", app);
      }
    };
    PipelineSkillsTransport = class {
      constructor(requestResponse) {
        this.requestResponse = requestResponse;
      }
      list() {
        return json(this.requestResponse, "GET", "/v1/pipeline/skills");
      }
      get(skill) {
        return new PipelineSkillTransport(this.requestResponse, skill);
      }
    };
    PipelineTransport = class {
      constructor(requestResponse) {
        this.requestResponse = requestResponse;
        this.evm = new EvmPipelineTransport(requestResponse);
        this.svm = new SvmPipelineTransport(requestResponse);
        this.apps = new PipelineAppsTransport(requestResponse);
        this.skills = new PipelineSkillsTransport(requestResponse);
      }
      root() {
        return json(this.requestResponse, "GET", "/v1/pipeline");
      }
      read(path = "/v1/pipeline") {
        return json(this.requestResponse, "GET", pipelinePath(path));
      }
      app(name) {
        return this.apps.get(name);
      }
      skill(name) {
        return this.skills.get(name);
      }
      invoke(path, args, options) {
        return invokeOperation(
          this.requestResponse,
          operationPath(path),
          args,
          options
        );
      }
      /** @deprecated Use `pipeline.apps.list()` filesystem discovery. */
      listApps(options = {}) {
        return json(this.requestResponse, "GET", "/v1/pipeline/apps", {
          query: { limit: options.limit }
        });
      }
      /** @deprecated Use `pipeline.app(app).directory()`. */
      getApp(app) {
        return json(
          this.requestResponse,
          "GET",
          `/v1/pipeline/apps/${encodeURIComponent(required("app", app))}`
        );
      }
      /** @deprecated Crawl the filesystem discovery surface. */
      searchApps(options = {}) {
        return json(this.requestResponse, "GET", "/v1/pipeline/search/apps", {
          query: { q: options.q, limit: options.limit }
        });
      }
      /** @deprecated Use fixed chain routes or scoped operations. */
      listTools(options = {}) {
        return json(this.requestResponse, "GET", "/v1/pipeline/tools", {
          query: {
            app: options.app,
            namespace: options.namespace,
            limit: options.limit
          }
        });
      }
      /** @deprecated Use fixed chain routes or scoped operations. */
      getTool(toolId, options = {}) {
        return json(
          this.requestResponse,
          "GET",
          `/v1/pipeline/tools/${encodeURIComponent(required("toolId", toolId))}`,
          { query: { app: options.app } }
        );
      }
      /** @deprecated Crawl the filesystem discovery surface. */
      searchTools(options = {}) {
        return json(this.requestResponse, "GET", "/v1/pipeline/search/tools", {
          query: { q: options.q, app: options.app, limit: options.limit }
        });
      }
      /** @deprecated Use `pipeline.skills.list()` filesystem discovery. */
      listSkills(options = {}) {
        return json(this.requestResponse, "GET", "/v1/pipeline/skills", {
          query: { limit: options.limit }
        });
      }
      /** @deprecated Use `pipeline.skill(skill).directory()`. */
      getSkill(skillId) {
        return json(
          this.requestResponse,
          "GET",
          `/v1/pipeline/skills/${encodeURIComponent(required("skillId", skillId))}`
        );
      }
      /** @deprecated Use fixed chain lifecycle or scoped `invoke()`. */
      callTool(request, options) {
        return json(this.requestResponse, "POST", "/v1/pipeline/tool-calls", {
          headers: executionHeaders(options),
          body: request
        });
      }
      /** @deprecated Use chain-specific Build composition. */
      run(request, options) {
        return json(this.requestResponse, "POST", "/v1/pipeline/runs", {
          headers: executionHeaders(options),
          body: request
        });
      }
    };
  }
});

// src/guest-auth.ts
function createGuestSessionProvider(input2) {
  var _a3;
  const fetchImpl = (_a3 = input2.fetch) != null ? _a3 : globalThis.fetch.bind(globalThis);
  let credential = null;
  let pending = null;
  const provider = async (options) => {
    if (options == null ? void 0 : options.forceRefresh) credential = null;
    if (credential) return credential;
    pending != null ? pending : pending = signInAnonymous(fetchImpl, input2.baseUrl).finally(() => {
      pending = null;
    });
    credential = await pending;
    return credential;
  };
  return Object.assign(provider, {
    clear() {
      credential = null;
    }
  });
}
async function signInAnonymous(fetchImpl, baseUrl) {
  var _a3, _b;
  const response = await fetchImpl(
    `${baseUrl.replace(/\/+$/, "")}/api/auth/sign-in/anonymous`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: "{}",
      credentials: "include"
    }
  );
  if (!response.ok) {
    throw new Error(`Aomi guest sign-in failed with HTTP ${response.status}`);
  }
  const token = (_b = (_a3 = response.headers.get("set-auth-token")) != null ? _a3 : response.headers.get("x-auth-token")) != null ? _b : response.headers.get("auth-token");
  if (!token) throw new Error("Aomi guest sign-in returned no bearer session");
  return token;
}
var init_guest_auth = __esm({
  "src/guest-auth.ts"() {
    "use strict";
  }
});

// src/client.ts
function joinApiPath(baseUrl, path) {
  const normalizedBase = baseUrl === "/" ? "" : baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}` || normalizedPath;
}
function applicationIdParam(id) {
  return (id == null ? void 0 : id.toString().trim()) || void 0;
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
function withSessionHeader(sessionId, init) {
  const headers = new Headers(init);
  headers.set(SESSION_ID_HEADER, sessionId);
  headers.set(THREAD_ID_HEADER, sessionId);
  return headers;
}
function wrapFetchWithAccountBearer(fetchImpl, getAccountBearer) {
  if (!getAccountBearer) return fetchImpl;
  return async (input2, init) => {
    var _a3, _b;
    const request = input2 instanceof Request ? input2 : void 0;
    const path = new URL(String((_a3 = request == null ? void 0 : request.url) != null ? _a3 : input2), "http://localhost").pathname;
    if (path.startsWith("/v1/agent/") || path.startsWith("/v1/pipeline/")) {
      return fetchImpl(request ? request.clone() : input2, init);
    }
    const baseHeaders = new Headers((_b = init == null ? void 0 : init.headers) != null ? _b : request == null ? void 0 : request.headers);
    const fetchWithBearer = async (forceRefresh) => {
      const headers = new Headers(baseHeaders);
      let bearer;
      try {
        bearer = await getAccountBearer({ forceRefresh });
      } catch (error) {
        if (getAccountBearer.required) {
          throw error;
        }
        bearer = void 0;
      }
      if (bearer) {
        headers.set("Authorization", `Bearer ${bearer}`);
      }
      return fetchImpl(request ? request.clone() : input2, __spreadProps(__spreadValues({}, init), { headers }));
    };
    const response = await fetchWithBearer(false);
    if (response.status !== 401) return response;
    return fetchWithBearer(true);
  };
}
function wrapFetchWithPublicApiAuthorization(input2) {
  if (!input2.oauth && !input2.guest) return input2.fetch;
  return async (requestInput, init) => {
    var _a3, _b, _c, _d, _e, _f;
    const request = requestInput instanceof Request ? requestInput : void 0;
    const url = new URL(
      String((_a3 = request == null ? void 0 : request.url) != null ? _a3 : requestInput),
      absoluteBase(input2.baseUrl)
    );
    const policy = publicApiPolicy(
      url,
      (_c = (_b = init == null ? void 0 : init.method) != null ? _b : request == null ? void 0 : request.method) != null ? _c : "GET",
      (_d = init == null ? void 0 : init.headers) != null ? _d : request == null ? void 0 : request.headers
    );
    if (!policy) return input2.fetch(requestInput, init);
    const baseHeaders = new Headers((_e = init == null ? void 0 : init.headers) != null ? _e : request == null ? void 0 : request.headers);
    const attempt = async (forceRefresh, dpopNonce2) => {
      var _a4;
      const headers = new Headers(baseHeaders);
      if (input2.oauth) {
        const token = await input2.oauth({
          resource: policy.resource,
          scopes: policy.scopes,
          forceRefresh
        });
        if (!token)
          throw new Error(
            "No OAuth grant covers this Aomi resource and scope set"
          );
        const tokenType = (_a4 = token.tokenType) != null ? _a4 : "Bearer";
        headers.set("authorization", `${tokenType} ${token.accessToken}`);
        if (tokenType === "DPoP") {
          if (!token.dpopProof) {
            throw new Error("DPoP token provider returned no proof signer");
          }
          headers.set(
            "dpop",
            await token.dpopProof({
              url: url.toString(),
              method: policy.method,
              accessToken: token.accessToken,
              nonce: dpopNonce2
            })
          );
        }
      } else if (input2.guest) {
        headers.set(
          "authorization",
          `Bearer ${await input2.guest({ forceRefresh })}`
        );
      }
      return input2.fetch(request ? request.clone() : requestInput, __spreadProps(__spreadValues({}, init), {
        headers
      }));
    };
    const response = await attempt(false);
    if (response.status !== 401 && response.status !== 403) return response;
    if (input2.guest && response.status === 403) return response;
    const dpopNonce = (_f = response.headers.get("dpop-nonce")) != null ? _f : void 0;
    return attempt(!dpopNonce, dpopNonce);
  };
}
function publicApiPolicy(url, method, headers) {
  const origin = url.origin;
  const payment = new Headers(headers).has("payment-signature") ? ["payments:submit"] : [];
  if (url.pathname.startsWith("/v1/agent/")) {
    const scopes = method === "GET" ? ["agent:read"] : /\/actions\/[^/]+\/result$/.test(url.pathname) ? ["agent:actions:resolve"] : ["agent:write"];
    return {
      resource: `${origin}/v1/agent`,
      scopes: [...scopes, ...payment],
      method: method.toUpperCase()
    };
  }
  if (url.pathname.startsWith("/v1/pipeline/")) {
    return {
      resource: `${origin}/v1/pipeline`,
      scopes: [
        method === "GET" ? "pipeline:catalog" : "pipeline:execute",
        ...payment
      ],
      method: method.toUpperCase()
    };
  }
  return null;
}
function absoluteBase(baseUrl) {
  if (/^https?:\/\//.test(baseUrl)) return baseUrl;
  if (typeof location !== "undefined")
    return new URL(baseUrl, location.origin).toString();
  return "http://localhost";
}
var SESSION_ID_HEADER, THREAD_ID_HEADER, APP_KEY_HEADER, AomiClient;
var init_client = __esm({
  "src/client.ts"() {
    "use strict";
    init_app_descriptor();
    init_transport();
    init_transport2();
    init_guest_auth();
    SESSION_ID_HEADER = "X-Session-Id";
    THREAD_ID_HEADER = "X-Thread-Id";
    APP_KEY_HEADER = "Aomi-App-Key";
    AomiClient = class {
      constructor(options) {
        var _a3;
        this.baseUrl = options.baseUrl.replace(/\/+$/, "");
        this.apiKey = options.apiKey;
        const fetchImpl = (_a3 = options.fetch) != null ? _a3 : globalThis.fetch.bind(globalThis);
        const rawFetchImpl = typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : fetchImpl;
        const guest = options.oauth || options.getAccountBearer || options.guest === false ? void 0 : typeof options.guest === "function" ? options.guest : createGuestSessionProvider({
          baseUrl: this.baseUrl,
          fetch: fetchImpl
        });
        this.fetchImpl = wrapFetchWithAccountBearer(
          wrapFetchWithPublicApiAuthorization({
            fetch: fetchImpl,
            baseUrl: this.baseUrl,
            oauth: options.oauth,
            guest
          }),
          options.getAccountBearer
        );
        this.rawFetchImpl = wrapFetchWithAccountBearer(
          wrapFetchWithPublicApiAuthorization({
            fetch: rawFetchImpl,
            baseUrl: this.baseUrl,
            oauth: options.oauth,
            guest
          }),
          options.getAccountBearer
        );
        this.logger = options.logger;
        this.agent = new AgentTransport(
          (method, path, requestOptions) => this.requestResponse(method, path, requestOptions)
        );
        this.pipeline = new PipelineTransport(
          (method, path, requestOptions) => this.requestResponse(method, path, requestOptions)
        );
      }
      // ===========================================================================
      // Transport
      // ===========================================================================
      /**
       * Low-level request escape hatch for the full backend route manifest.
       * Prefer the typed helpers below for common chat/session/account flows.
       */
      async request(method, path, options) {
        var _a3;
        const response = await this.requestResponse(method, path, options);
        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new Error(
            `HTTP ${response.status}: ${response.statusText}${body ? `
${body}` : ""}`
          );
        }
        if (response.status === 204) return void 0;
        const contentType = (_a3 = response.headers.get("content-type")) != null ? _a3 : "";
        return contentType.includes("application/json") ? await response.json() : await response.text();
      }
      /** Raw authenticated response transport shared by JSON, SSE, and MCP clients. */
      async requestResponse(method, path, options) {
        var _a3;
        const url = buildApiUrl(this.baseUrl, path, normalizeQuery(options == null ? void 0 : options.query));
        const headers = new Headers(options == null ? void 0 : options.headers);
        if (options == null ? void 0 : options.sessionId) {
          headers.set(SESSION_ID_HEADER, options.sessionId);
          headers.set(THREAD_ID_HEADER, options.sessionId);
        }
        const apiKey = (_a3 = options == null ? void 0 : options.apiKey) != null ? _a3 : this.apiKey;
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
        return response;
      }
      // ===========================================================================
      // Secrets
      // ===========================================================================
      /**
       * Ingest client-scoped secrets. Returns opaque `$SECRET:<name>` handles.
       *
       * There is no app scope. A hosted app's Environment belongs to its Builder
       * and is configured in Aomi Build; a per-user copy of it was a second,
       * process-local store that answered the same handle differently depending on
       * which fleet host served the turn. The backend answers 410 to any request
       * that still carries one.
       */
      async ingestSecrets(sessionId, clientId, secrets) {
        const url = joinApiPath(this.baseUrl, "/api/secrets");
        const body = {
          client_id: clientId,
          secrets
        };
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
      /** Clear every client-scoped secret and unbind the session. */
      async clearSecrets(sessionId, clientId) {
        const url = buildApiUrl(this.baseUrl, "/api/secrets", {
          client_id: clientId
        });
        const response = await this.fetchImpl(url, {
          method: "DELETE",
          headers: withSessionHeader(sessionId)
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      }
      /** Remove a single named client-scoped secret. */
      async deleteSecret(sessionId, clientId, name) {
        const params = { client_id: clientId };
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
       * List the stored secret NAMES for this client — never values.
       *
       * Read the result with {@link secretNamesFrom}, which tolerates the
       * pre-cutover `by_app` shape as well as the flat `names` list.
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
      // Control API
      // ===========================================================================
      /**
       * Get available apps as full descriptors (name + declared secret slots).
       * The settings page consumes the slot info to render per-app inputs and
       * the chat shell uses it to gate app load when required slots are unfilled.
       */
      async getApps(sessionId, options) {
        var _a3;
        const platforms = normalizePlatformFilter(options == null ? void 0 : options.platforms);
        const url = buildApiUrl(this.baseUrl, "/api/thread/apps", {
          platform: platforms.length > 0 ? platforms : void 0,
          application_id: applicationIdParam(options == null ? void 0 : options.applicationId)
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
        var _a3;
        const url = buildApiUrl(this.baseUrl, "/api/auth/privy/begin");
        const response = await this.rawFetchImpl(url, {
          method: "POST",
          headers: withSessionHeader(sessionId, {
            "Content-Type": "application/json"
          }),
          body: JSON.stringify({
            application: options == null ? void 0 : options.application,
            purpose: (_a3 = options == null ? void 0 : options.purpose) != null ? _a3 : "link_wallet",
            wallet_family: (options == null ? void 0 : options.walletFamily) === "evm" ? void 0 : options == null ? void 0 : options.walletFamily
          })
        });
        if (!response.ok) {
          throw new Error(`Failed to begin Privy auth: HTTP ${response.status}`);
        }
        return await response.json();
      }
      /**
       * Start Privy's separate one-time delegated-signer consent. This is not a
       * wallet-link operation and callers should label it as enabling Auto.
       */
      async beginPrivyDelegation(sessionId, options) {
        return this.beginPrivyAuth(sessionId, __spreadProps(__spreadValues({}, options), {
          purpose: "delegate_signing"
        }));
      }
      /**
       * Get available models.
       */
      async getModels(sessionId, options) {
        var _a3;
        const url = buildApiUrl(this.baseUrl, "/api/thread/models", {
          application_id: applicationIdParam(options == null ? void 0 : options.applicationId)
        });
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
        const url = buildApiUrl(this.baseUrl, "/api/thread/model", {
          rig,
          app: options == null ? void 0 : options.app,
          application_id: applicationIdParam(options == null ? void 0 : options.applicationId),
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
        var _a3;
        const url = buildApiUrl(this.baseUrl, "/api/account/payment");
        const response = await this.fetchImpl(url, {
          headers: withSessionHeader(sessionId)
        });
        if (!response.ok) {
          throw new Error(`Failed to get BYOK keys: HTTP ${response.status}`);
        }
        const data = await response.json();
        return (_a3 = data.byok) != null ? _a3 : [];
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
  const e = __spreadValues({}, src != null ? src : {});
  renameKey(e, "chainId", "chain_id");
  renameKey(e, "ensName", "ens_name");
  delete e.aa;
  delete e.sponsorship;
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
  dropNullKeys(s, "capabilities");
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
  const value = (_a3 = asEvmObject(state == null ? void 0 : state.evm)) == null ? void 0 : _a3.address;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function svmAddress(state) {
  var _a3;
  const value = (_a3 = asObject(state == null ? void 0 : state.svm)) == null ? void 0 : _a3.address;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function chainId(state) {
  var _a3;
  return parseChainId2((_a3 = asEvmObject(state == null ? void 0 : state.evm)) == null ? void 0 : _a3.chain_id);
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
function toOwnedUserState(userState) {
  const normalized = normalizeUserState(userState);
  if (!normalized) return void 0;
  const _a3 = normalized, { pending: _pending } = _a3, owned = __objRest(_a3, ["pending"]);
  return owned;
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
function chainId2(userState) {
  var _a3;
  return parseChainId3((_a3 = evmBlock(userState)) == null ? void 0 : _a3.chain_id);
}
function ensName(userState) {
  var _a3;
  const value = (_a3 = evmBlock(userState)) == null ? void 0 : _a3.ens_name;
  return typeof value === "string" && value.length > 0 ? value : void 0;
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
      UserState2.toOwned = toOwnedUserState;
      UserState2.address = address2;
      UserState2.evmAddress = evmAddress;
      UserState2.svmAddress = svmAddress2;
      UserState2.chainId = chainId2;
      UserState2.ensName = ensName;
      UserState2.isConnected = isConnected2;
      UserState2.walletProvider = walletProvider;
      UserState2.walletProviderSubject = walletProviderSubject;
      UserState2.authMethod = authMethod;
      UserState2.authValue = authValue;
      UserState2.authVerifiedAt = authVerifiedAt;
      UserState2.withExt = withExt;
    })(UserState || (UserState = {}));
  }
});

// src/event.ts
var TypedEventEmitter;
var init_event = __esm({
  "src/event.ts"() {
    "use strict";
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
var init_json = __esm({
  "src/session/json.ts"() {
    "use strict";
  }
});

// src/session/state.ts
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function addExtValue(userState, key, value) {
  const current = userState != null ? userState : {};
  const currentExt = isRecord2(current["ext"]) ? current["ext"] : {};
  return __spreadProps(__spreadValues({}, current), {
    ext: __spreadProps(__spreadValues({}, currentExt), {
      [key]: value
    })
  });
}
function removeExtValue(userState, key) {
  if (!userState) return void 0;
  const currentExt = userState["ext"];
  if (!isRecord2(currentExt)) return void 0;
  const nextExt = __spreadValues({}, currentExt);
  delete nextExt[key];
  return __spreadProps(__spreadValues({}, userState), { ext: nextExt });
}
function resolveWalletState(userState, address3, chainId3) {
  const prevEvm = isRecord2(userState == null ? void 0 : userState.evm) ? userState == null ? void 0 : userState.evm : {};
  const prevConn = isRecord2(userState == null ? void 0 : userState.connection) ? userState == null ? void 0 : userState.connection : {};
  return __spreadProps(__spreadValues({}, userState != null ? userState : {}), {
    evm: __spreadProps(__spreadValues({}, prevEvm), {
      address: address3,
      chain_id: chainId3 != null ? chainId3 : 1
    }),
    connection: __spreadProps(__spreadValues({}, prevConn), {
      is_connected: true
    })
  });
}
var init_state = __esm({
  "src/session/state.ts"() {
    "use strict";
    init_user_state();
    init_json();
  }
});

// src/session/wallet.ts
var SessionWalletController;
var init_wallet = __esm({
  "src/session/wallet.ts"() {
    "use strict";
    SessionWalletController = class {
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
        const id = this.requestId(kind, payload);
        const existing = this.find(id);
        const request = this.request(kind, payload, id, existing == null ? void 0 : existing.timestamp);
        if (this.resolvedRequestIds.has(id) && !existing) return request;
        this.requests = existing ? this.requests.map((current) => current.id === id ? request : current) : [...this.requests, request];
        this.changed();
        return request;
      }
      async resolve(requestId, result) {
        const request = this.pending(requestId);
        if (result.kind !== request.kind) {
          throw new Error(
            `WalletRequestResult.kind mismatch for "${requestId}": request is "${request.kind}" but result is "${result.kind}".`
          );
        }
        if (this.resolvingRequestIds.has(requestId)) return;
        this.resolvingRequestIds.add(requestId);
        try {
          await this.deps.resolveAction(request, result);
          this.finish(request);
        } finally {
          this.resolvingRequestIds.delete(requestId);
        }
      }
      async reject(requestId, reason) {
        const request = this.pending(requestId);
        if (this.resolvingRequestIds.has(requestId)) return;
        this.resolvingRequestIds.add(requestId);
        try {
          await this.deps.rejectAction(request, reason);
          this.finish(request);
        } finally {
          this.resolvingRequestIds.delete(requestId);
        }
      }
      dismiss(requestId) {
        const request = this.find(requestId);
        if (request) this.finish(request);
      }
      pending(requestId) {
        const request = this.find(requestId);
        if (!request) {
          throw new Error(`No pending wallet request with id "${requestId}"`);
        }
        return request;
      }
      finish(request) {
        this.requests = this.requests.filter(
          (current) => current.id !== request.id
        );
        this.resolvedRequestIds.add(request.id);
        this.changed();
      }
      requestId(kind, payload) {
        if (kind === "transaction") {
          const requestId = payload.requestId;
          if (requestId) return `txreq-${requestId}`;
        } else if (kind === "signing") {
          return payload.requestId;
        } else {
          const requestId = payload.requestId;
          if (requestId) return requestId;
        }
        return `wreq-${this.nextId++}`;
      }
      request(kind, payload, id, timestamp2 = Date.now()) {
        return { id, kind, payload, timestamp: timestamp2 };
      }
      changed() {
        this.deps.onChange(this.list());
      }
    };
  }
});

// src/aa/policy.ts
var init_policy = __esm({
  "src/aa/policy.ts"() {
    "use strict";
  }
});

// src/session/index.ts
var ClientSession;
var init_session = __esm({
  "src/session/index.ts"() {
    "use strict";
    init_client();
    init_user_state();
    init_event();
    init_json();
    init_state();
    init_wallet();
    init_transport();
    init_policy();
    ClientSession = class extends TypedEventEmitter {
      constructor(clientOrOptions, sessionOptions) {
        var _a3, _b, _c, _d;
        super();
        this.agentActions = /* @__PURE__ */ new Map();
        this.pollTimer = null;
        this.pollingActive = false;
        this.pollInFlight = false;
        this.pollFailureCount = 0;
        this._isProcessing = false;
        this._backendWasProcessing = false;
        this._messages = [];
        this.closed = false;
        this.pendingResolve = null;
        this.handleVisibilityChange = () => {
          if (typeof document !== "undefined" && !document.hidden && !this.pollInFlight) {
            this.schedulePoll(0);
          }
        };
        this.client = clientOrOptions instanceof AomiClient ? clientOrOptions : new AomiClient(clientOrOptions);
        this.sessionId = (_a3 = sessionOptions == null ? void 0 : sessionOptions.sessionId) != null ? _a3 : crypto.randomUUID();
        this.app = (_b = sessionOptions == null ? void 0 : sessionOptions.app) != null ? _b : "default";
        this.model = sessionOptions == null ? void 0 : sessionOptions.model;
        this.applicationId = sessionOptions == null ? void 0 : sessionOptions.applicationId;
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
        this.pollIntervalMs = (_d = sessionOptions == null ? void 0 : sessionOptions.pollIntervalMs) != null ? _d : 500;
        this.logger = sessionOptions == null ? void 0 : sessionOptions.logger;
        this.walletController = new SessionWalletController({
          onChange: (requests) => this.emit("wallet_requests_changed", requests),
          resolveAction: (request, result) => this.resolveAgentAction(request, result),
          rejectAction: (request, reason) => this.rejectAgentAction(request, reason)
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
        const response = await this.submitChat(message);
        if (!this.agentActive(response) && this.walletController.length === 0) {
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
        const response = await this.submitChat(message);
        if (this.agentActive(response)) {
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
       * Resolve a pending wallet request. The `result.kind` discriminator must
       * match the originating request's kind — sending a `transaction` result for a `signing`
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
      /**
       * Drop a pending wallet request locally without completing it. Hosts should
       * normally use `resolve` or `reject`; this is reserved for externally
       * acknowledged lifecycle cleanup.
       */
      dismiss(requestId) {
        this.walletController.dismiss(requestId);
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
        this.applyAgentDelta(await this.client.agent.interrupt(this.sessionId));
        this._isProcessing = false;
        this.emit("processing_end", void 0);
        this.resolvePending();
      }
      /**
       * Close the session. Stops polling, unsubscribes SSE, removes all listeners.
       * The session cannot be used after closing.
       */
      close() {
        if (this.closed) return;
        this.closed = true;
        this.stopPolling();
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
      /** Last status observed from the canonical Agent transport. */
      getAgentStatus() {
        return this.agentStatus;
      }
      /** Current canonical Agent actions, preserving backend order of discovery. */
      getAgentActions() {
        return [...this.agentActions.values()];
      }
      syncRuntimeOptions(options) {
        var _a3;
        this.app = options.app;
        this.model = options.model;
        this.applicationId = options.applicationId;
        this.clientId = (_a3 = options.clientId) != null ? _a3 : this.clientId;
        if (options.userState) {
          this.resolveUserState(options.userState);
        }
      }
      resolveUserState(userState, opts) {
        const previousSerialized = stableUserStateString(this.userState);
        this.userState = UserState.reconcile(this.userState, userState);
        const nextSerialized = stableUserStateString(this.userState);
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
      resolveWallet(address3, chainId3) {
        this.resolveUserState(resolveWalletState(this.userState, address3, chainId3));
      }
      async syncUserState() {
        this.assertOpen();
        const delta = await this.client.agent.check(this.sessionId, {
          cursor: this.agentCursor
        });
        this.applyAgentDelta(delta);
        return delta;
      }
      // ===========================================================================
      // Public API — Polling Control
      // ===========================================================================
      /** Whether the session is currently polling for state updates. */
      getIsPolling() {
        return this.pollingActive;
      }
      /**
       * Fetch the current state from the backend (one-shot).
       * Automatically starts polling if the backend is processing.
       */
      async fetchCurrentState() {
        this.assertOpen();
        const delta = await this.client.agent.check(this.sessionId, {
          cursor: this.agentCursor
        });
        this.applyAgentDelta(delta);
        const active = this.agentActive(delta);
        if (active && !this.pollingActive) {
          this._isProcessing = true;
          this.emit("processing_start", void 0);
          this.startPolling();
        } else if (!active) {
          this._isProcessing = false;
        }
      }
      /**
       * Start polling for state updates. Idempotent — no-op if already polling.
       * Useful for resuming polling after resolving a wallet request.
       */
      startPolling() {
        var _a3;
        if (this.pollingActive || this.closed) return;
        this.pollingActive = true;
        this._backendWasProcessing = true;
        (_a3 = this.logger) == null ? void 0 : _a3.debug("[session] polling started", this.sessionId);
        if (typeof document !== "undefined") {
          document.addEventListener(
            "visibilitychange",
            this.handleVisibilityChange
          );
        }
        this.schedulePoll(this.currentPollInterval());
      }
      /** Stop polling for state updates. Idempotent — no-op if not polling. */
      stopPolling() {
        var _a3;
        this.pollingActive = false;
        if (this.pollTimer) {
          clearTimeout(this.pollTimer);
          this.pollTimer = null;
        }
        if (typeof document !== "undefined") {
          document.removeEventListener(
            "visibilitychange",
            this.handleVisibilityChange
          );
        }
        (_a3 = this.logger) == null ? void 0 : _a3.debug("[session] polling stopped", this.sessionId);
      }
      async pollTick() {
        var _a3;
        if (!this.pollingActive || this.pollInFlight) return;
        this.pollTimer = null;
        this.pollInFlight = true;
        try {
          const delta = await this.client.agent.check(this.sessionId, {
            cursor: this.agentCursor,
            waitMs: 25e3
          });
          if (!this.pollingActive) return;
          this.pollFailureCount = 0;
          this.applyAgentDelta(delta);
          const active = this.agentActive(delta);
          if (this._backendWasProcessing && !active) {
            this.emit("backend_idle", void 0);
          }
          this._backendWasProcessing = active;
          if (!active && this.walletController.length === 0) {
            this.stopPolling();
            this._isProcessing = false;
            this.emit("processing_end", void 0);
            this.resolvePending();
          }
        } catch (error) {
          this.pollFailureCount += 1;
          (_a3 = this.logger) == null ? void 0 : _a3.debug("[session] poll error", error);
          this.emit("error", { error });
        } finally {
          this.pollInFlight = false;
          if (this.pollingActive) {
            this.schedulePoll(
              Math.min(
                this.currentPollInterval() * 2 ** this.pollFailureCount,
                5e3
              )
            );
          }
        }
      }
      currentPollInterval() {
        return typeof document !== "undefined" && document.hidden ? 2e3 : this.pollIntervalMs;
      }
      schedulePoll(delayMs) {
        if (!this.pollingActive || this.closed) return;
        if (this.pollTimer) clearTimeout(this.pollTimer);
        this.pollTimer = setTimeout(() => {
          void this.pollTick();
        }, delayMs);
      }
      /** Shared completion path for send()/sendAsync() after the chat POST. */
      async submitChat(message) {
        var _a3;
        const applicationId = Number(this.applicationId);
        const operation = ((_a3 = this.agentStartOperation) == null ? void 0 : _a3.message) === message ? this.agentStartOperation : {
          message,
          idempotencyKey: `idem_${crypto.randomUUID().replaceAll("-", "")}`
        };
        this.agentStartOperation = operation;
        let delta;
        try {
          delta = await this.client.agent.start(
            __spreadProps(__spreadValues(__spreadValues({
              sessionId: this.sessionId,
              clientId: this.clientId,
              message
            }, Number.isSafeInteger(applicationId) && applicationId > 0 ? { applicationId } : { app: this.app }), this.model ? { model: this.model } : {}), {
              wallets: this.agentWallets()
            }),
            { idempotencyKey: operation.idempotencyKey }
          );
        } catch (error) {
          if (error instanceof AgentApiError && !error.retryable) {
            this.agentStartOperation = void 0;
          }
          throw error;
        }
        this.agentStartOperation = void 0;
        this.applyAgentDelta(delta);
        return delta;
      }
      agentActive(delta) {
        return delta.status === "processing" || delta.status === "awaiting_user";
      }
      agentWallets() {
        var _a3, _b, _c;
        const normalized = UserState.normalize(this.userState);
        const chainId3 = Number((_a3 = normalized == null ? void 0 : normalized.evm) == null ? void 0 : _a3.chain_id);
        return __spreadValues(__spreadValues({}, ((_b = normalized == null ? void 0 : normalized.evm) == null ? void 0 : _b.address) ? {
          evm: __spreadValues({
            address: normalized.evm.address
          }, Number.isSafeInteger(chainId3) && chainId3 > 0 ? { chainId: chainId3 } : {})
        } : {}), ((_c = normalized == null ? void 0 : normalized.svm) == null ? void 0 : _c.address) ? {
          svm: __spreadValues({
            address: normalized.svm.address
          }, normalized.svm.cluster ? { cluster: normalized.svm.cluster } : {})
        } : {});
      }
      applyAgentDelta(delta) {
        if (delta.sessionId !== this.sessionId) {
          throw new TypeError("Agent response session does not match the request");
        }
        this.agentCursor = delta.cursor;
        this.agentStatus = delta.status;
        let messagesChanged = false;
        for (const incoming of delta.messages) {
          const message = this.agentMessage(incoming);
          const index = message.id ? this._messages.findIndex((current) => current.id === message.id) : -1;
          if (index >= 0) this._messages[index] = message;
          else this._messages.push(message);
          messagesChanged = true;
        }
        if (messagesChanged) this.emit("messages", [...this._messages]);
        if (delta.title && delta.title !== this._title) {
          this._title = delta.title;
          this.emit("title_changed", { title: delta.title });
        }
        this.applyAgentActivity(delta.activity);
        this.syncAgentActions(delta.actions);
      }
      agentMessage(message) {
        var _a3;
        return __spreadValues(__spreadValues({
          id: message.id,
          sender: message.role,
          content: message.content,
          timestamp: message.createdAt,
          is_streaming: message.streaming,
          tool_result: (_a3 = message.toolResult) != null ? _a3 : null
        }, message.toolName ? { tool_name: message.toolName } : {}), message.toolArguments !== void 0 ? { tool_arguments: message.toolArguments } : {});
      }
      applyAgentActivity(activity) {
        for (const event of activity) {
          const type = typeof event.type === "string" ? event.type : void 0;
          if (type === "tool_complete" || type === "task_started" || type === "task_activity" || type === "task_completed") {
            this.emit(type, event);
          }
        }
      }
      syncAgentActions(actions) {
        const visible = /* @__PURE__ */ new Set();
        for (const action of actions) {
          const previous = this.agentActions.get(action.id);
          this.agentActions.set(action.id, action);
          if (!previous || previous.revision !== action.revision || previous.status !== action.status) {
            this.emit("agent_action", action);
          }
          if (action.status !== "pending") continue;
          visible.add(action.id);
          this.enqueueAgentAction(action);
        }
        for (const request of this.walletController.list()) {
          const actionId = this.actionIdForRequest(request.id);
          if (this.agentActions.has(actionId) && !visible.has(actionId)) {
            this.walletController.dismiss(request.id);
          }
        }
      }
      enqueueAgentAction(action) {
        var _a3, _b, _c, _d, _e;
        if (action.type === "external_transaction" && action.chainFamily === "evm") {
          const typed2 = action;
          this.walletController.enqueue("transaction", {
            requestId: typed2.id,
            chainId: typed2.chainId,
            aaPreference: "none",
            calls: typed2.transactions.map((transaction, index) => {
              var _a4;
              return {
                txId: index + 1,
                to: transaction.to,
                value: transaction.value,
                data: transaction.data,
                chainId: typed2.chainId,
                from: transaction.from,
                gas: (_a4 = transaction.gas) != null ? _a4 : void 0,
                description: transaction.description
              };
            }),
            txIds: typed2.transactions.map((_, index) => index + 1)
          });
          return;
        }
        if (action.type === "external_transaction") {
          const typed2 = action;
          const transaction = typed2.transactions[0];
          if (transaction) {
            this.walletController.enqueue("solana_sign_and_send", {
              requestId: typed2.id,
              unsignedTx: transaction.unsignedTransactionBase64,
              description: typed2.description,
              cluster: typed2.cluster,
              transactions: typed2.transactions.map((item) => ({
                id: item.id,
                unsignedTx: item.unsignedTransactionBase64,
                description: item.description
              }))
            });
          }
          return;
        }
        const typed = action;
        this.walletController.enqueue("signing", {
          requestId: typed.id,
          chainFamily: typed.chainFamily,
          executionKind: typed.executionKind === "account_abstraction" || typed.executionKind === "hosted" ? "erc4337" : typed.executionKind,
          signer: typed.signer,
          chainId: (_a3 = typed.chainId) != null ? _a3 : void 0,
          cluster: (_b = typed.cluster) != null ? _b : void 0,
          description: typed.description,
          payloads: typed.payloads.map((payload) => {
            if (payload.kind === "evm_personal") {
              return { kind: payload.kind, message: payload.message };
            }
            if (payload.kind === "evm_typed_data") {
              return { kind: payload.kind, typedData: payload.typedData };
            }
            if (payload.kind === "svm_message") {
              return { kind: payload.kind, messageBase64: payload.messageBase64 };
            }
            return {
              kind: payload.kind,
              transactionBase64: payload.transactionBase64
            };
          }),
          broadcaster: typed.broadcaster,
          operationId: (_c = typed.operationId) != null ? _c : void 0,
          executor: typed.executor,
          expiresAt: (_d = typed.expiresAt) != null ? _d : void 0,
          callsDigest: typed.callsDigest,
          calls: typed.calls,
          fees: typed.fees,
          sponsorship: (_e = typed.sponsorship) != null ? _e : void 0
        });
      }
      async resolveAgentAction(request, result) {
        var _a3, _b, _c;
        const action = this.agentActions.get(this.actionIdForRequest(request.id));
        if (!action)
          throw new Error(`No Agent action for wallet request "${request.id}"`);
        let actionResult;
        if (action.type === "signing_request" && result.kind === "signing") {
          actionResult = {
            status: "signed",
            revision: action.revision,
            outputs: action.payloads.map((payload, index) => __spreadValues({
              id: payload.id
            }, payload.kind === "svm_transaction" ? { signedTransactionBase64: result.signatures[index] } : { signature: result.signatures[index] }))
          };
        } else if (action.type === "external_transaction" && action.chainFamily === "evm" && result.kind === "transaction") {
          const completed = new Set(
            (_a3 = result.completedTxIds) != null ? _a3 : action.transactions.map((_, index) => index + 1)
          );
          const failed = new Set((_b = result.failedTxIds) != null ? _b : []);
          actionResult = {
            status: "submitted",
            revision: action.revision,
            legs: action.transactions.map((transaction, index) => {
              var _a4, _b2, _c2;
              return __spreadValues(__spreadValues({
                id: transaction.id,
                status: completed.has(index + 1) ? "submitted" : failed.has(index + 1) ? "failed" : "skipped"
              }, completed.has(index + 1) ? { transactionId: (_b2 = (_a4 = result.txHashes) == null ? void 0 : _a4[index]) != null ? _b2 : result.txHash } : {}), failed.has(index + 1) ? { reason: (_c2 = result.failureReason) != null ? _c2 : "Transaction failed" } : {});
            })
          };
        } else if (action.type === "external_transaction" && action.chainFamily === "svm" && (result.kind === "solana_send" || result.kind === "solana_sign_and_send")) {
          const byId = new Map(
            ((_c = result.legs) != null ? _c : []).map((leg) => [leg.id, leg])
          );
          if (action.transactions.length > 1 && byId.size === 0) {
            throw new Error(
              `SVM Agent batch "${action.id}" requires per-leg wallet results`
            );
          }
          actionResult = {
            status: "submitted",
            revision: action.revision,
            legs: action.transactions.map((transaction, index) => {
              var _a4, _b2;
              const leg = (_a4 = byId.get(transaction.id)) != null ? _a4 : index === 0 && action.transactions.length === 1 ? {
                id: transaction.id,
                status: "submitted",
                signature: result.signature,
                signedTx: result.signedTx
              } : void 0;
              return __spreadValues(__spreadValues(__spreadValues({
                id: transaction.id,
                status: (_b2 = leg == null ? void 0 : leg.status) != null ? _b2 : "skipped"
              }, (leg == null ? void 0 : leg.signature) ? { transactionId: leg.signature } : {}), (leg == null ? void 0 : leg.signedTx) ? { signedTransactionBase64: leg.signedTx } : {}), (leg == null ? void 0 : leg.reason) ? { reason: leg.reason } : {});
            })
          };
        } else {
          throw new Error(`Agent action/result kind mismatch for "${request.id}"`);
        }
        await this.client.agent.resolveAction(
          this.sessionId,
          action.id,
          actionResult
        );
      }
      async rejectAgentAction(request, reason) {
        const action = this.agentActions.get(this.actionIdForRequest(request.id));
        if (!action)
          throw new Error(`No Agent action for wallet request "${request.id}"`);
        await this.client.agent.resolveAction(this.sessionId, action.id, {
          status: "rejected",
          revision: action.revision,
          reason: reason != null ? reason : "Request rejected"
        });
      }
      actionIdForRequest(requestId) {
        return requestId.startsWith("txreq-") ? requestId.slice(6) : requestId;
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

// src/wallet-utils.ts
import { getAddress } from "viem";
function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  return value;
}
function isHexBytes(value) {
  return /^0x(?:[0-9a-fA-F]{2})*$/.test(value);
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
    init_user_state();
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
function parsePendingId(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : void 0;
}
function parseOptionalString(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function parseChainId4(value) {
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
function buildCliUserState(evmAddress2, chainId3, options) {
  const userState = {};
  if (evmAddress2 !== void 0) {
    const evm = { address: evmAddress2 };
    if (chainId3 !== void 0) {
      evm.chain_id = chainId3;
    }
    userState.evm = evm;
  }
  if ((options == null ? void 0 : options.svmAddress) !== void 0) {
    userState.svm = { address: options.svmAddress };
    if (options.svmCluster !== void 0) {
      userState.svm.cluster = options.svmCluster;
    }
  }
  if (userState.evm || userState.svm) {
    userState.connection = {
      is_connected: true
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
    const pendingId = parsePendingId(rawId);
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
      chainId: parseChainId4((_d = tx.chainId) != null ? _d : tx.chain_id),
      description: parseOptionalString(tx.label),
      timestamp: txTimestamp(existingById, id, fallbackNow),
      payload: {
        pending_tx_id: pendingId,
        txId: pendingId,
        to,
        value: parseOptionalString(tx.value),
        data,
        chain_id: parseChainId4((_e = tx.chainId) != null ? _e : tx.chain_id),
        chainId: parseChainId4((_f = tx.chainId) != null ? _f : tx.chain_id),
        description: parseOptionalString(tx.label)
      }
    });
  }
  const pendingEip712s = (_h = (_g = asRecord2(pending.evmSigs)) != null ? _g : asRecord2(pending.evm_sigs)) != null ? _h : {};
  for (const [rawId, rawValue] of Object.entries(pendingEip712s)) {
    const pendingId = parsePendingId(rawId);
    const request = asRecord2(rawValue);
    if (!pendingId || !request) {
      continue;
    }
    const id = pendingDisplayId(pendingId);
    const description = parseOptionalString(request.description);
    const typedData = (_i = request.typedData) != null ? _i : request.typed_data;
    const chainId3 = parseChainId4((_j = request.chainId) != null ? _j : request.chain_id);
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
  var _a3, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u;
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
    const pendingId = parsePendingId(rawId);
    const request = asRecord2(rawValue);
    if (!pendingId || !request) {
      continue;
    }
    const unsignedTx = (_f = parseOptionalString(request.unsignedTx)) != null ? _f : parseOptionalString(request.unsigned_tx);
    if (!unsignedTx) {
      const existing = existingPendingSolTxs.find(
        (tx) => {
          var _a4;
          return tx.solanaId === pendingId || ((_a4 = tx.solanaIds) == null ? void 0 : _a4.includes(pendingId)) === true;
        }
      );
      if (existing && !next.some((tx) => tx.id === existing.id)) {
        next.push(existing);
      }
      continue;
    }
    const id = pendingDisplayId(pendingId);
    const description = parseOptionalString(request.description);
    const cluster = parseOptionalString(request.cluster);
    const signer = parseOptionalString(request.signer);
    const rawRequestKind = (_g = parseOptionalString(request.requestKind)) != null ? _g : parseOptionalString(request.request_kind);
    const requestKind = rawRequestKind === "send_transaction" ? "solana_send" : rawRequestKind === "sign_and_send_transaction" ? "solana_sign_and_send" : "solana_sign";
    next.push({
      id,
      solanaId: pendingId,
      solanaIds: [pendingId],
      requestKind,
      unsignedTx,
      cluster,
      signer,
      description,
      timestamp: (_i = (_h = existingById.get(id)) == null ? void 0 : _h.timestamp) != null ? _i : fallbackNow,
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
  const pendingSolanaSigs = (_q = (_p = (_n = (_l = asRecord2((_j = normalizedUserState.pending) == null ? void 0 : _j.solanaSigs)) != null ? _l : asRecord2((_k = normalizedUserState.pending) == null ? void 0 : _k.solana_sigs)) != null ? _n : asRecord2(
    (_m = normalizedUserState.pending) == null ? void 0 : _m.svmSigs
  )) != null ? _p : asRecord2(
    (_o = normalizedUserState.pending) == null ? void 0 : _o.svm_sigs
  )) != null ? _q : {};
  for (const [rawId, rawValue] of Object.entries(pendingSolanaSigs)) {
    const pendingId = parsePendingId(rawId);
    const request = asRecord2(rawValue);
    if (!pendingId || !request) {
      continue;
    }
    const unsignedTx = (_r = parseOptionalString(request.unsigned_tx)) != null ? _r : parseOptionalString(request.unsignedTx);
    const message = (_s = parseOptionalString(request.message_base64)) != null ? _s : parseOptionalString(request.messageBase64);
    if (!unsignedTx && !message) {
      const existing = existingPendingSolTxs.find(
        (tx) => tx.solanaId === pendingId
      );
      if (existing && !next.some((tx) => tx.id === existing.id)) {
        next.push(existing);
      }
      continue;
    }
    const id = pendingDisplayId(pendingId);
    const description = parseOptionalString(request.description);
    const signer = parseOptionalString(request.signer);
    const cluster = parseOptionalString(request.cluster);
    next.push({
      id,
      solanaId: pendingId,
      requestKind: message ? "solana_sign_message" : "solana_sign",
      unsignedTx,
      message,
      cluster,
      signer,
      description,
      timestamp: (_u = (_t = existingById.get(id)) == null ? void 0 : _t.timestamp) != null ? _u : fallbackNow,
      payload: {
        pending_solana_id: pendingId,
        pendingSolanaId: pendingId,
        unsigned_tx: unsignedTx,
        unsignedTx,
        message_base64: message,
        messageBase64: message,
        cluster,
        description,
        signer
      }
    });
  }
  next.sort(
    (left, right) => {
      var _a4, _b2;
      return ((_a4 = left.solanaId) != null ? _a4 : Number.MAX_SAFE_INTEGER) - ((_b2 = right.solanaId) != null ? _b2 : Number.MAX_SAFE_INTEGER);
    }
  );
  return next;
}
function walletSnapshotFromUserState(userState) {
  const address3 = UserState.address(userState);
  const isConnected3 = UserState.isConnected(userState);
  return {
    publicKey: isConnected3 === false ? void 0 : address3,
    chainId: UserState.chainId(userState)
  };
}
var init_user_state2 = __esm({
  "src/cli/user-state.ts"() {
    "use strict";
    init_user_state();
    init_wallet_utils();
  }
});

// src/cli/state.ts
import {
  chmodSync,
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
  return Boolean(
    existing.agentRequestId && next.agentRequestId && existing.agentRequestId === next.agentRequestId
  ) || existing.kind === next.kind && existingBackendId !== void 0 && nextBackendId !== void 0 && existingBackendId === nextBackendId;
}
function ensureStorageDirs() {
  mkdirSync(SESSIONS_DIR, { recursive: true, mode: STATE_DIR_MODE });
  try {
    chmodSync(STATE_ROOT_DIR, STATE_DIR_MODE);
    chmodSync(SESSIONS_DIR, STATE_DIR_MODE);
  } catch (e) {
  }
}
function parseSessionFileLocalId(filename) {
  const match = filename.match(/^session-(\d+)\.json$/);
  if (!match) return null;
  const localId = parseInt(match[1], 10);
  return Number.isNaN(localId) ? null : localId;
}
function toSessionFilePath(localId) {
  return join(
    SESSIONS_DIR,
    `${SESSION_FILE_PREFIX}${localId}${SESSION_FILE_SUFFIX}`
  );
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
    accountBearer: stored.accountBearer,
    sessionCookie: stored.sessionCookie,
    embeddedProvider: stored.embeddedProvider,
    embeddedProviderToken: stored.embeddedProviderToken,
    publicKey: stored.publicKey,
    privateKey: stored.privateKey,
    svmPublicKey: stored.svmPublicKey,
    svmCluster: stored.svmCluster,
    svmPrivateKey: stored.svmPrivateKey,
    chainId: stored.chainId,
    aaProvider: stored.aaProvider,
    aaMode: stored.aaMode,
    smartAccount: stored.smartAccount,
    pendingTxs: stored.pendingTxs,
    pendingSolTxs: stored.pendingSolTxs,
    signedTxs: stored.signedTxs,
    signedSolTxs: stored.signedSolTxs,
    secretHandles: stored.secretHandles,
    auth: stored.auth,
    oauthGrants: stored.oauthGrants
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
      modelSynced: parsed.modelSynced,
      apiKey: parsed.apiKey,
      accountBearer: parsed.accountBearer,
      sessionCookie: parsed.sessionCookie,
      embeddedProvider: parsed.embeddedProvider,
      embeddedProviderToken: parsed.embeddedProviderToken,
      publicKey: parsed.publicKey,
      privateKey: parsed.privateKey,
      svmPublicKey: parsed.svmPublicKey,
      svmCluster: parsed.svmCluster,
      svmPrivateKey: parsed.svmPrivateKey,
      chainId: parsed.chainId,
      aaProvider: parsed.aaProvider,
      aaMode: parsed.aaMode,
      smartAccount: parsed.smartAccount,
      pendingTxs: parsed.pendingTxs,
      pendingSolTxs: parsed.pendingSolTxs,
      signedTxs: normalizeSignedTxs(parsed.signedTxs),
      signedSolTxs: parsed.signedSolTxs,
      secretHandles: parsed.secretHandles,
      auth: normalizeAuthSession(parsed.auth),
      oauthGrants: normalizeOAuthGrants(parsed.oauthGrants),
      localId: typeof parsed.localId === "number" && parsed.localId > 0 ? parsed.localId : fallbackLocalId,
      createdAt: typeof parsed.createdAt === "number" && parsed.createdAt > 0 ? parsed.createdAt : Date.now(),
      updatedAt: typeof parsed.updatedAt === "number" && parsed.updatedAt > 0 ? parsed.updatedAt : Date.now()
    };
  } catch (e) {
    return null;
  }
}
function normalizeAuthSession(value) {
  if (!value || typeof value !== "object") return void 0;
  const auth = value;
  if (typeof auth.sessionToken !== "string" || !auth.sessionToken || typeof auth.expiresAt !== "number" || !Number.isFinite(auth.expiresAt)) {
    return void 0;
  }
  return {
    sessionToken: auth.sessionToken,
    expiresAt: auth.expiresAt,
    walletFamily: auth.walletFamily,
    walletAddress: auth.walletAddress,
    chainId: auth.chainId,
    chainScope: auth.chainScope,
    betterAuthUserId: auth.betterAuthUserId
  };
}
function normalizeOAuthGrants(value) {
  if (!value || typeof value !== "object") return void 0;
  const grants = {};
  for (const candidate of Object.values(
    value
  )) {
    if (typeof candidate.clientId !== "string" || !candidate.clientId || typeof candidate.accessToken !== "string" || !candidate.accessToken || typeof candidate.expiresAt !== "number" || !Number.isFinite(candidate.expiresAt) || typeof candidate.resource !== "string" || !/\/v1\/(agent|pipeline)$/.test(candidate.resource) || !Array.isArray(candidate.scopes) || !candidate.scopes.every((scope) => typeof scope === "string") || candidate.tokenType !== void 0 && candidate.tokenType !== "Bearer" && candidate.tokenType !== "DPoP") {
      continue;
    }
    const grant = candidate;
    grants[grant.resource] = grant;
  }
  return Object.keys(grants).length > 0 ? grants : void 0;
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
    writeFileSync(ACTIVE_SESSION_FILE, String(localId), {
      mode: STATE_FILE_MODE
    });
    try {
      chmodSync(ACTIVE_SESSION_FILE, STATE_FILE_MODE);
    } catch (e) {
    }
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
      sessionId: legacy.sessionId,
      baseUrl: legacy.baseUrl,
      signedTxs: normalizeSignedTxs(legacy.signedTxs),
      localId: 1,
      createdAt: now,
      updatedAt: now
    });
    ensureStorageDirs();
    const migratedPath = toSessionFilePath(1);
    writeFileSync(migratedPath, JSON.stringify(migrated, null, 2), {
      mode: STATE_FILE_MODE
    });
    try {
      chmodSync(migratedPath, STATE_FILE_MODE);
    } catch (e) {
    }
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
    const remaining = readAllStoredSessions().sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
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
  const existing = sessions.find(
    (session) => session.sessionId === state.sessionId
  );
  const now = Date.now();
  const localId = (_a3 = existing == null ? void 0 : existing.localId) != null ? _a3 : getNextLocalId(sessions);
  const createdAt = (_b = existing == null ? void 0 : existing.createdAt) != null ? _b : now;
  const payload = __spreadProps(__spreadValues({}, state), {
    localId,
    createdAt,
    updatedAt: now
  });
  const stateFilePath = toSessionFilePath(localId);
  writeFileSync(stateFilePath, JSON.stringify(payload, null, 2), {
    mode: STATE_FILE_MODE
  });
  try {
    chmodSync(stateFilePath, STATE_FILE_MODE);
  } catch (e) {
  }
  writeActiveLocalId(localId);
}
function clearState() {
  migrateLegacyStateIfNeeded();
  writeActiveLocalId(null);
}
function hasSameSolanaPendingId(existing, next) {
  if (existing.agentRequestId && next.agentRequestId) {
    return existing.agentRequestId === next.agentRequestId;
  }
  return existing.solanaId !== void 0 && existing.solanaId === next.solanaId;
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
var SESSION_FILE_PREFIX, SESSION_FILE_SUFFIX, STATE_DIR_MODE, STATE_FILE_MODE, _a, LEGACY_STATE_FILE, _a2, STATE_ROOT_DIR, SESSIONS_DIR, ACTIVE_SESSION_FILE, _migrationDone;
var init_state2 = __esm({
  "src/cli/state.ts"() {
    "use strict";
    init_user_state();
    init_user_state2();
    SESSION_FILE_PREFIX = "session-";
    SESSION_FILE_SUFFIX = ".json";
    STATE_DIR_MODE = 448;
    STATE_FILE_MODE = 384;
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

// src/siws.ts
function buildSiwsMessage(input2) {
  var _a3;
  const statement = input2.intent === "link" ? "Only sign this message if you want this Solana wallet attached to the current Aomi account." : "Sign in to Aomi.";
  return `${input2.domain} wants you to sign in with your Solana account:
${input2.address}

${statement}

URI: ${input2.uri}
Version: 1
Chain ID: ${input2.chainId}
Nonce: ${input2.nonce}
Issued At: ${((_a3 = input2.issuedAt) != null ? _a3 : /* @__PURE__ */ new Date()).toISOString()}`;
}
var init_siws = __esm({
  "src/siws.ts"() {
    "use strict";
  }
});

// src/cli/auth.ts
import { privateKeyToAccount as privateKeyToAccount2 } from "viem/accounts";
function createCliAuthTokenProvider(readState2, now = Date.now) {
  return async () => {
    var _a3;
    const state = readState2();
    const auth = state.auth;
    if ((auth == null ? void 0 : auth.sessionToken) && auth.expiresAt > now() + AUTH_REFRESH_SKEW_MS) {
      return auth.sessionToken;
    }
    return (_a3 = state.accountBearer) != null ? _a3 : state.sessionCookie;
  };
}
async function signInWithCliSiwe({
  baseUrl,
  privateKey,
  chainId: chainId3 = DEFAULT_CHAIN_ID,
  fetch: fetchImpl = fetch,
  now = Date.now
}) {
  var _a3, _b, _c, _d, _e, _f, _g, _h, _i;
  const portalUrl = normalizeBaseUrl(baseUrl);
  const account = privateKeyToAccount2(privateKey);
  const address3 = account.address;
  const nonceHttpResponse = await fetchImpl(
    joinUrl(portalUrl, "/api/auth/siwe/nonce"),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ walletAddress: address3, chainId: chainId3 })
    }
  );
  if (!nonceHttpResponse.ok) {
    throw new Error(
      `SIWE nonce failed: HTTP ${nonceHttpResponse.status} ${await safeResponseText(
        nonceHttpResponse
      )}`
    );
  }
  const nonceResponse = await nonceHttpResponse.json();
  const nonce = typeof nonceResponse.nonce === "string" ? nonceResponse.nonce : "";
  if (!nonce) {
    throw new Error("SIWE nonce response is missing nonce");
  }
  const message = buildSiweMessage({
    address: address3,
    chainId: chainId3,
    nonce,
    domain: (_a3 = normalizeDomain(nonceResponse.domain)) != null ? _a3 : domainFromBaseUrl(portalUrl),
    uri: (_b = normalizeUri(nonceResponse.uri)) != null ? _b : portalUrl
  });
  const signature = await account.signMessage({ message });
  const verifyHeaders = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json"
  });
  const verifyResponse = await fetchImpl(
    joinUrl(portalUrl, "/api/auth/siwe/verify"),
    {
      method: "POST",
      headers: verifyHeaders,
      credentials: "include",
      body: JSON.stringify({
        message,
        signature,
        walletAddress: address3,
        chainId: chainId3
      })
    }
  );
  if (!verifyResponse.ok) {
    throw new Error(
      `SIWE verify failed: HTTP ${verifyResponse.status} ${await safeResponseText(
        verifyResponse
      )}`
    );
  }
  const verifyBody = await verifyResponse.json().catch(() => ({}));
  const sessionToken = (_c = getSessionTokenHeader(verifyResponse.headers)) != null ? _c : typeof verifyBody.token === "string" ? verifyBody.token : "";
  if (!sessionToken) {
    throw new Error("SIWE verify response is missing BetterAuth session token");
  }
  const accountInfo = await fetchPortalAccount(
    fetchImpl,
    portalUrl,
    sessionToken
  );
  const expiresAt = (_e = parseExpiresAt((_d = accountInfo == null ? void 0 : accountInfo.session) == null ? void 0 : _d.expiresAt)) != null ? _e : now() + DEFAULT_SESSION_TTL_MS;
  return {
    address: address3,
    auth: {
      sessionToken,
      expiresAt,
      walletFamily: "evm",
      walletAddress: typeof ((_f = verifyBody.user) == null ? void 0 : _f.walletAddress) === "string" ? verifyBody.user.walletAddress : address3,
      chainId: typeof ((_g = verifyBody.user) == null ? void 0 : _g.chainId) === "number" ? verifyBody.user.chainId : chainId3,
      betterAuthUserId: typeof ((_h = accountInfo == null ? void 0 : accountInfo.session) == null ? void 0 : _h.betterAuthUserId) === "string" ? accountInfo.session.betterAuthUserId : typeof verifyBody.user_id === "string" ? verifyBody.user_id : typeof ((_i = verifyBody.user) == null ? void 0 : _i.id) === "string" ? verifyBody.user.id : void 0
    }
  };
}
async function signInWithCliSiws({
  baseUrl,
  privateKey,
  chainId: chainId3 = DEFAULT_SVM_CLUSTER,
  fetch: fetchImpl = fetch,
  now = Date.now
}) {
  var _a3, _b, _c;
  const keypair = parseSolanaKeypairSecret(privateKey);
  const address3 = keypair.publicKey.toBase58();
  const result = await performCliSiws({
    baseUrl,
    address: address3,
    chainId: chainId3,
    intent: "sign-in",
    signMessage: (message) => signSolanaMessage(
      Buffer.from(message, "utf8").toString("base64"),
      keypair
    ).signatureBase64,
    fetch: fetchImpl,
    now
  });
  if (!result.sessionToken) {
    throw new Error("SIWS verify response is missing BetterAuth session token");
  }
  const accountInfo = await fetchPortalAccount(
    fetchImpl,
    normalizeBaseUrl(baseUrl),
    result.sessionToken
  );
  const expiresAt = (_b = parseExpiresAt((_a3 = accountInfo == null ? void 0 : accountInfo.session) == null ? void 0 : _a3.expiresAt)) != null ? _b : now() + DEFAULT_SESSION_TTL_MS;
  return {
    address: address3,
    chainId: chainId3,
    auth: {
      sessionToken: result.sessionToken,
      expiresAt,
      walletFamily: "svm",
      walletAddress: address3,
      chainScope: chainId3,
      betterAuthUserId: typeof ((_c = accountInfo == null ? void 0 : accountInfo.session) == null ? void 0 : _c.betterAuthUserId) === "string" ? accountInfo.session.betterAuthUserId : result.betterAuthUserId
    }
  };
}
async function linkCliSiwsWallet(input2) {
  var _a3, _b, _c;
  const keypair = parseSolanaKeypairSecret(input2.privateKey);
  const address3 = keypair.publicKey.toBase58();
  const chainId3 = (_a3 = input2.chainId) != null ? _a3 : DEFAULT_SVM_CLUSTER;
  const result = await performCliSiws({
    baseUrl: input2.baseUrl,
    address: address3,
    chainId: chainId3,
    intent: "link",
    sessionToken: input2.sessionToken,
    signMessage: (message) => signSolanaMessage(
      Buffer.from(message, "utf8").toString("base64"),
      keypair
    ).signatureBase64,
    fetch: (_b = input2.fetch) != null ? _b : fetch,
    now: (_c = input2.now) != null ? _c : Date.now
  });
  return {
    status: result.status === "noop" ? "noop" : "linked",
    address: address3,
    chainId: chainId3
  };
}
async function performCliSiws(input2) {
  var _a3, _b, _c, _d;
  const portalUrl = normalizeBaseUrl(input2.baseUrl);
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json"
  });
  if (input2.sessionToken) {
    headers.set("Authorization", `Bearer ${input2.sessionToken}`);
  }
  const nonceHttpResponse = await input2.fetch(
    joinUrl(portalUrl, "/api/auth/siws/nonce"),
    {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        walletAddress: input2.address,
        chainId: input2.chainId,
        intent: input2.intent
      })
    }
  );
  if (!nonceHttpResponse.ok) {
    throw new Error(
      `SIWS nonce failed: HTTP ${nonceHttpResponse.status} ${await safeResponseText(
        nonceHttpResponse
      )}`
    );
  }
  const nonceResponse = await nonceHttpResponse.json();
  const nonce = typeof nonceResponse.nonce === "string" ? nonceResponse.nonce : "";
  if (!nonce) throw new Error("SIWS nonce response is missing nonce");
  const message = buildSiwsMessage({
    address: input2.address,
    chainId: input2.chainId,
    nonce,
    intent: input2.intent,
    domain: (_a3 = normalizeDomain(nonceResponse.domain)) != null ? _a3 : domainFromBaseUrl(portalUrl),
    uri: (_b = normalizeUri(nonceResponse.uri)) != null ? _b : portalUrl,
    issuedAt: new Date(input2.now())
  });
  const signature = input2.signMessage(message);
  const verifyResponse = await input2.fetch(
    joinUrl(portalUrl, "/api/auth/siws/verify"),
    {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        message,
        signature,
        walletAddress: input2.address,
        chainId: input2.chainId,
        intent: input2.intent
      })
    }
  );
  if (!verifyResponse.ok) {
    throw new Error(
      `SIWS verify failed: HTTP ${verifyResponse.status} ${await safeResponseText(
        verifyResponse
      )}`
    );
  }
  const body = await verifyResponse.json().catch(() => ({}));
  const status = body.status === "noop" ? "noop" : "linked";
  return {
    sessionToken: (_c = getSessionTokenHeader(verifyResponse.headers)) != null ? _c : typeof body.token === "string" ? body.token : void 0,
    betterAuthUserId: typeof ((_d = body.user) == null ? void 0 : _d.id) === "string" ? body.user.id : void 0,
    status
  };
}
async function signOutCliSession(input2) {
  var _a3;
  if (!input2.sessionToken) return;
  const response = await ((_a3 = input2.fetch) != null ? _a3 : fetch)(
    joinUrl(normalizeBaseUrl(input2.baseUrl), "/api/auth/sign-out"),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${input2.sessionToken}`,
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({})
    }
  );
  if (!response.ok && response.status !== 401) {
    throw new Error(
      `Sign-out failed: HTTP ${response.status} ${await safeResponseText(
        response
      )}`
    );
  }
}
function buildSiweMessage(input2) {
  return `${input2.domain} wants you to sign in with your Ethereum account:
${input2.address}

Sign in to Aomi.

URI: ${input2.uri}
Version: 1
Chain ID: ${input2.chainId}
Nonce: ${input2.nonce}
Issued At: ${(/* @__PURE__ */ new Date()).toISOString()}`;
}
function normalizeBaseUrl(baseUrl) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("Portal URL is required");
  return trimmed;
}
function joinUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
function domainFromBaseUrl(baseUrl) {
  try {
    const url = new URL(baseUrl);
    if (url.hostname === "127.0.0.1") {
      return url.port ? `localhost:${url.port}` : "localhost";
    }
    return url.host;
  } catch (e) {
    return baseUrl.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/\/.*$/, "");
  }
}
function normalizeDomain(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  try {
    return new URL(trimmed).host || void 0;
  } catch (e) {
    return trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/\/.*$/, "").trim();
  }
}
function normalizeUri(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return void 0;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return void 0;
    }
    return url.toString().replace(/\/+$/, "");
  } catch (e) {
    return void 0;
  }
}
function getSessionTokenHeader(headers) {
  for (const header of SESSION_TOKEN_HEADERS) {
    const value = headers.get(header);
    if (value) return value;
  }
  return null;
}
async function fetchPortalAccount(fetchImpl, baseUrl, sessionToken) {
  const response = await fetchImpl(joinUrl(baseUrl, "/api/aomi/account"), {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${sessionToken}`
    }
  });
  if (!response.ok) return null;
  return await response.json().catch(() => null);
}
async function requestJson(fetchImpl, url, init, label) {
  var _a3;
  const response = await fetchImpl(url, __spreadValues({
    headers: __spreadValues({ Accept: "application/json" }, (_a3 = init.headers) != null ? _a3 : {})
  }, init));
  if (!response.ok) {
    throw new Error(
      `${label} failed: HTTP ${response.status} ${await safeResponseText(
        response
      )}`
    );
  }
  return await response.json();
}
function parseExpiresAt(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1e3;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}
async function safeResponseText(response) {
  const text2 = await response.text().catch(() => "");
  return text2 ? `- ${text2}` : "";
}
var DEFAULT_CHAIN_ID, DEFAULT_SVM_CLUSTER, DEFAULT_SESSION_TTL_MS, AUTH_REFRESH_SKEW_MS, SESSION_TOKEN_HEADERS;
var init_auth = __esm({
  "src/cli/auth.ts"() {
    "use strict";
    init_siws();
    init_solana_signer();
    DEFAULT_CHAIN_ID = 1;
    DEFAULT_SVM_CLUSTER = "solana:mainnet";
    DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
    AUTH_REFRESH_SKEW_MS = 30 * 1e3;
    SESSION_TOKEN_HEADERS = ["set-auth-token", "x-auth-token", "auth-token"];
  }
});

// src/cli/client-factory.ts
function resolveCliBaseUrl(config) {
  var _a3;
  return (_a3 = config.baseUrl) != null ? _a3 : DEFAULT_CLI_BASE_URL;
}
function createCliGetAccountBearer(config) {
  if (config.accountBearer) {
    const bearer = config.accountBearer;
    return async () => bearer;
  }
  if (config.sessionCookie) {
    const sessionCookie = config.sessionCookie;
    return async () => sessionCookie;
  }
  return void 0;
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
    getAccountBearer: createCliGetAccountBearer(mergedConfig)
  });
}
var DEFAULT_CLI_BASE_URL;
var init_client_factory = __esm({
  "src/cli/client-factory.ts"() {
    "use strict";
    init_client();
    DEFAULT_CLI_BASE_URL = "https://chat.aomi.dev";
  }
});

// src/payment.ts
import { wrapFetchWithPayment } from "@x402/fetch";
function paymentResponseHeader(response) {
  var _a3;
  return (_a3 = response.headers.get("payment-response")) != null ? _a3 : response.headers.get("x-payment-response");
}
function withInitialResponse(initialResponse, fetchImpl) {
  let pendingResponse = initialResponse;
  return (input2, init) => {
    if (pendingResponse) {
      const response = pendingResponse;
      pendingResponse = void 0;
      return Promise.resolve(response);
    }
    return fetchImpl(input2, init);
  };
}
async function handlePaymentChallenges(request, initialResponse, fetchImpl, client) {
  let response = initialResponse;
  let attempts = 0;
  while (response.status === 402) {
    if (attempts > 0 && paymentResponseHeader(response) === null) {
      return response;
    }
    if (attempts === MAX_PAYMENT_CHALLENGES) {
      throw new Error(
        `Exceeded ${MAX_PAYMENT_CHALLENGES} sequential x402 payment challenges`
      );
    }
    response = await wrapFetchWithPayment(
      withInitialResponse(response, fetchImpl),
      client
    )(request.clone());
    attempts += 1;
  }
  return response;
}
function wrapFetchWithPaymentChallenges(fetchImpl, client) {
  return async (input2, init) => {
    const request = new Request(input2, init);
    const response = await fetchImpl(request.clone());
    return handlePaymentChallenges(request, response, fetchImpl, client);
  };
}
var MAX_PAYMENT_CHALLENGES;
var init_payment = __esm({
  "src/payment.ts"() {
    "use strict";
    MAX_PAYMENT_CHALLENGES = 4;
  }
});

// src/cli/payment.ts
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount as privateKeyToAccount3 } from "viem/accounts";
function stringValue(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function parseBase64Json(value) {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + (4 - normalized.length % 4) % 4,
      "="
    );
    return JSON.parse(atob(padded));
  } catch (e) {
    return void 0;
  }
}
async function paymentRequirementFrom(response) {
  var _a3;
  const fromHeader = response.headers.get("Payment-Required");
  const payload = fromHeader ? parseBase64Json(fromHeader) : await response.clone().json().catch(() => void 0);
  const accepted = (_a3 = payload == null ? void 0 : payload.accepts) == null ? void 0 : _a3[0];
  if (!accepted) return void 0;
  return {
    amount: stringValue(accepted.amount),
    asset: stringValue(accepted.asset),
    network: stringValue(accepted.network),
    payTo: stringValue(accepted.payTo),
    error: stringValue(payload == null ? void 0 : payload.error)
  };
}
function receiptIdFrom(response) {
  var _a3;
  const receipt = response.headers.get("Payment-Receipt");
  if (receipt) return receipt;
  const header = paymentResponseHeader2(response);
  const settlement = header ? parseBase64Json(header) : void 0;
  return (_a3 = stringValue(settlement == null ? void 0 : settlement.transaction)) != null ? _a3 : stringValue(settlement == null ? void 0 : settlement.network);
}
function paymentResponseHeader2(response) {
  var _a3;
  return (_a3 = response.headers.get("Payment-Response")) != null ? _a3 : response.headers.get("X-Payment-Response");
}
function hasPaymentSignature(request) {
  return request.headers.has("Payment-Signature") || request.headers.has("X-Payment");
}
function createTracedFetch(fetchImpl, onPayment) {
  return async (input2, init) => {
    var _a3;
    const request = new Request(input2, init);
    const isPaymentRetry = hasPaymentSignature(request);
    if (isPaymentRetry) {
      onPayment == null ? void 0 : onPayment({ type: "submitting", url: request.url });
    }
    const response = await fetchImpl(request);
    if (!onPayment) return response;
    if (isPaymentRetry) {
      const settled = response.ok || paymentResponseHeader2(response) !== null;
      onPayment(
        settled ? {
          type: "settled",
          url: request.url,
          status: response.status,
          receiptId: receiptIdFrom(response)
        } : {
          type: "rejected",
          url: request.url,
          status: response.status,
          reason: (_a3 = await paymentRequirementFrom(response)) == null ? void 0 : _a3.error
        }
      );
    } else if (response.status === 402) {
      onPayment({
        type: "required",
        url: request.url,
        requirement: await paymentRequirementFrom(response)
      });
    }
    return response;
  };
}
function createCliPaymentFetch(config, onPayment, fetchImpl = globalThis.fetch.bind(globalThis)) {
  if (!(config == null ? void 0 : config.paymentMethod)) {
    return void 0;
  }
  if (config.paymentMethod !== "coinbase") {
    fatal("Unsupported payment method. Use `coinbase`.");
  }
  if (!config.privateKey) {
    fatal(
      "`--payment-method coinbase` requires an EVM private key. Pass `--private-key` or set `PRIVATE_KEY`."
    );
  }
  const account = privateKeyToAccount3(config.privateKey);
  const paymentClient = new x402Client();
  paymentClient.register("eip155:*", new ExactEvmScheme(account));
  return wrapFetchWithPaymentChallenges(
    createTracedFetch(fetchImpl, onPayment),
    paymentClient
  );
}
var init_payment2 = __esm({
  "src/cli/payment.ts"() {
    "use strict";
    init_payment();
    init_errors();
  }
});

// src/cli/oauth-device-auth.ts
async function signInWithOAuthDevice(input2) {
  var _a3, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  const fetchImpl = (_a3 = input2.fetch) != null ? _a3 : fetch;
  const baseUrl = normalizeBaseUrl(input2.baseUrl);
  const client = input2.clientId ? { client_id: input2.clientId } : await requestJson(
    fetchImpl,
    joinUrl(baseUrl, "/api/auth/oauth2/register"),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "Aomi CLI",
        redirect_uris: ["http://127.0.0.1"],
        token_endpoint_auth_method: "none",
        grant_types: [DEVICE_GRANT, "refresh_token"],
        response_types: ["code"],
        resources: [input2.resource],
        scope: input2.scopes.join(" ")
      })
    },
    "OAuth client registration"
  );
  const code = await requestForm(
    fetchImpl,
    joinUrl(baseUrl, "/api/auth/device/code"),
    {
      client_id: client.client_id,
      scope: input2.scopes.join(" "),
      resource: input2.resource
    }
  );
  const verification = (_b = code.verification_uri_complete) != null ? _b : code.verification_uri;
  console.log(`Open ${verification} and enter code ${code.user_code}`);
  await ((_c = input2.openBrowser) != null ? _c : openUrl)(verification);
  const expiresAt = ((_d = input2.now) != null ? _d : Date.now)() + code.expires_in * 1e3;
  let interval = Math.max((_e = code.interval) != null ? _e : 5, 1) * 1e3;
  while (((_f = input2.now) != null ? _f : Date.now)() < expiresAt) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    const response = await fetchImpl(
      joinUrl(baseUrl, "/api/auth/oauth2/token"),
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: DEVICE_GRANT,
          device_code: code.device_code,
          client_id: client.client_id,
          resource: input2.resource
        })
      }
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (body.error === "slow_down") {
        interval += 5e3;
        continue;
      }
      if (body.error === "authorization_pending") continue;
      throw new Error(
        `OAuth device login failed: ${String((_g = body.error) != null ? _g : response.status)}`
      );
    }
    return {
      clientId: client.client_id,
      accessToken: String(body.access_token),
      refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : void 0,
      expiresAt: ((_h = input2.now) != null ? _h : Date.now)() + Number((_i = body.expires_in) != null ? _i : 300) * 1e3,
      resource: input2.resource,
      scopes: String((_j = body.scope) != null ? _j : input2.scopes.join(" ")).split(/\s+/).filter(Boolean),
      tokenType: body.token_type === "DPoP" ? "DPoP" : "Bearer"
    };
  }
  throw new Error("OAuth device login expired before approval");
}
async function requestForm(fetchImpl, url, body) {
  return requestJson(
    fetchImpl,
    url,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body)
    },
    "OAuth device authorization"
  );
}
async function openUrl(url) {
  const { spawn: spawn2 } = await import("child_process");
  const [command, args] = process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  spawn2(command, args, { detached: true, stdio: "ignore" }).unref();
}
var DEVICE_GRANT;
var init_oauth_device_auth = __esm({
  "src/cli/oauth-device-auth.ts"() {
    "use strict";
    init_auth();
    DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";
  }
});

// src/cli/cli-session.ts
async function refreshCliGrant(fetchImpl, baseUrl, grant) {
  var _a3, _b, _c, _d;
  const response = await fetchImpl(
    `${baseUrl.replace(/\/+$/, "")}/api/auth/oauth2/token`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: (_a3 = grant.refreshToken) != null ? _a3 : "",
        client_id: grant.clientId,
        resource: grant.resource,
        scope: grant.scopes.join(" ")
      })
    }
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body.access_token !== "string") {
    throw new Error(
      `OAuth refresh failed: ${String((_b = body.error) != null ? _b : response.status)}`
    );
  }
  return __spreadProps(__spreadValues({}, grant), {
    accessToken: body.access_token,
    refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : grant.refreshToken,
    expiresAt: Date.now() + Number((_c = body.expires_in) != null ? _c : 300) * 1e3,
    scopes: String((_d = body.scope) != null ? _d : grant.scopes.join(" ")).split(/\s+/).filter(Boolean),
    tokenType: body.token_type === "DPoP" ? "DPoP" : "Bearer"
  });
}
var CliSession;
var init_cli_session = __esm({
  "src/cli/cli-session.ts"() {
    "use strict";
    init_session2();
    init_state2();
    init_user_state2();
    init_errors();
    init_solana_signer();
    init_auth();
    init_client_factory();
    init_payment2();
    init_oauth_device_auth();
    init_client();
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
        if (!state) return null;
        const cli = new _CliSession(state);
        if (cli.ensureSvmClusterInvariant()) cli.save();
        return cli;
      }
      /**
       * A persisted Solana address must always carry a persisted cluster so that
       * display, state file, and wire agree. State files written before
       * `wallet set --solana` persisted clusters get stamped with mainnet once.
       */
      ensureSvmClusterInvariant() {
        if (this.state.svmPublicKey && !this.state.svmCluster) {
          this.state.svmCluster = "solana:mainnet";
          return true;
        }
        return false;
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
      static create(config, seed, sessionId = crypto.randomUUID()) {
        var _a3, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
        let svmPublicKey;
        if (config.solanaPrivateKey) {
          try {
            svmPublicKey = parseSolanaKeypairSecret(
              config.solanaPrivateKey
            ).publicKey.toBase58();
          } catch (e) {
          }
        }
        const state = {
          sessionId,
          clientId: crypto.randomUUID(),
          baseUrl: (_b = (_a3 = config.baseUrl) != null ? _a3 : seed == null ? void 0 : seed.baseUrl) != null ? _b : DEFAULT_CLI_BASE_URL,
          app: (_c = config.app) != null ? _c : seed == null ? void 0 : seed.app,
          model: (_d = config.model) != null ? _d : seed == null ? void 0 : seed.model,
          apiKey: (_e = config.apiKey) != null ? _e : seed == null ? void 0 : seed.apiKey,
          accountBearer: (_f = config.accountBearer) != null ? _f : seed == null ? void 0 : seed.accountBearer,
          sessionCookie: (_g = config.sessionCookie) != null ? _g : seed == null ? void 0 : seed.sessionCookie,
          embeddedProvider: (_h = config.embeddedProvider) != null ? _h : seed == null ? void 0 : seed.embeddedProvider,
          embeddedProviderToken: (_i = config.embeddedProviderToken) != null ? _i : seed == null ? void 0 : seed.embeddedProviderToken,
          publicKey: (_j = config.publicKey) != null ? _j : seed == null ? void 0 : seed.publicKey,
          privateKey: seed == null ? void 0 : seed.privateKey,
          svmPublicKey: svmPublicKey != null ? svmPublicKey : seed == null ? void 0 : seed.svmPublicKey,
          svmCluster: (_k = config.svmCluster) != null ? _k : seed == null ? void 0 : seed.svmCluster,
          // Carry forward only persisted Solana keys from `wallet set --solana`.
          // Keys supplied via --solana-private-key/env stay transient.
          svmPrivateKey: seed == null ? void 0 : seed.svmPrivateKey,
          chainId: (_l = config.chain) != null ? _l : seed == null ? void 0 : seed.chainId,
          aaProvider: (_m = config.aaProvider) != null ? _m : seed == null ? void 0 : seed.aaProvider,
          aaMode: (_n = config.aaMode) != null ? _n : seed == null ? void 0 : seed.aaMode,
          secretHandles: seed == null ? void 0 : seed.secretHandles,
          auth: seed == null ? void 0 : seed.auth,
          oauthGrants: seed == null ? void 0 : seed.oauthGrants
        };
        const cli = new _CliSession(state);
        cli.ensureSvmClusterInvariant();
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
      get svmCluster() {
        return this.state.svmCluster;
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
      get auth() {
        return this.state.auth;
      }
      get oauthGrants() {
        var _a3;
        return (_a3 = this.state.oauthGrants) != null ? _a3 : {};
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
        if (config.accountBearer !== void 0 && config.accountBearer !== this.state.accountBearer) {
          this.state.accountBearer = config.accountBearer;
          delete this.state.embeddedProvider;
          delete this.state.embeddedProviderToken;
          changed = true;
        }
        if (config.sessionCookie !== void 0 && config.sessionCookie !== this.state.sessionCookie) {
          this.state.sessionCookie = config.sessionCookie;
          changed = true;
        }
        if (config.embeddedProvider !== void 0 && config.embeddedProvider !== this.state.embeddedProvider) {
          this.state.embeddedProvider = config.embeddedProvider;
          delete this.state.accountBearer;
          changed = true;
        }
        if (config.embeddedProviderToken !== void 0 && config.embeddedProviderToken !== this.state.embeddedProviderToken) {
          this.state.embeddedProviderToken = config.embeddedProviderToken;
          delete this.state.accountBearer;
          changed = true;
        }
        if (config.publicKey !== void 0 && config.publicKey !== this.state.publicKey) {
          this.state.publicKey = config.publicKey;
          changed = true;
        }
        if (config.solanaPrivateKey !== void 0) {
          try {
            const svmPub = parseSolanaKeypairSecret(
              config.solanaPrivateKey
            ).publicKey.toBase58();
            if (svmPub !== this.state.svmPublicKey) {
              this.state.svmPublicKey = svmPub;
              changed = true;
            }
          } catch (e) {
          }
        }
        if (config.svmCluster !== void 0 && config.svmCluster !== this.state.svmCluster) {
          this.state.svmCluster = config.svmCluster;
          changed = true;
        }
        if (config.chain !== void 0 && config.chain !== this.state.chainId) {
          this.state.chainId = config.chain;
          changed = true;
        }
        if (config.aaProvider !== void 0 && config.aaProvider !== this.state.aaProvider) {
          this.state.aaProvider = config.aaProvider;
          changed = true;
        }
        if (config.aaMode !== void 0 && config.aaMode !== this.state.aaMode) {
          this.state.aaMode = config.aaMode;
          changed = true;
        }
        if (!this.state.clientId) {
          this.state.clientId = crypto.randomUUID();
          changed = true;
        }
        if (this.ensureSvmClusterInvariant()) changed = true;
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
      setSvmWallet(privateKey, publicKey, cluster) {
        this.state.svmPrivateKey = privateKey;
        this.state.svmPublicKey = publicKey;
        if (cluster !== void 0) {
          this.state.svmCluster = cluster;
        }
        this.save();
      }
      /** The Solana private key to use for signing. Prefers the transiently-
       * supplied `solanaPrivateKey` from `CliConfig` (i.e. `--solana-private-key`)
       * and falls back to the key persisted by `wallet set --solana`. */
      resolvedSvmPrivateKey(fromConfig) {
        return fromConfig != null ? fromConfig : this.state.svmPrivateKey;
      }
      /** The effective runtime Solana cluster: `--cluster` wins, then the
       * persisted choice, then mainnet. Persistence paths stamp their defaults
       * before saving so display, state, and this resolver stay aligned. */
      resolvedSvmCluster(fromConfig) {
        var _a3;
        return (_a3 = fromConfig != null ? fromConfig : this.state.svmCluster) != null ? _a3 : "solana:mainnet";
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
      setAuthSession(auth) {
        this.state.auth = auth;
        this.save();
      }
      setOAuthGrant(grant) {
        this.state.oauthGrants = __spreadProps(__spreadValues({}, this.state.oauthGrants), {
          [grant.resource]: grant
        });
        this.save();
      }
      clearOAuthGrants() {
        delete this.state.oauthGrants;
        this.save();
      }
      clearAuthSession() {
        if (!this.state.auth) return;
        delete this.state.auth;
        this.save();
      }
      clearSigningKeys() {
        let changed = false;
        if (this.state.privateKey !== void 0) {
          delete this.state.privateKey;
          changed = true;
        }
        if (this.state.svmPrivateKey !== void 0) {
          delete this.state.svmPrivateKey;
          changed = true;
        }
        if (changed) this.save();
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
        var _a3;
        if (!this.state.signedTxs) this.state.signedTxs = [];
        const index = this.state.signedTxs.findIndex(
          (existing) => tx.pendingTxId !== void 0 && existing.pendingTxId === tx.pendingTxId && existing.kind === tx.kind || existing.id === tx.id && existing.kind === tx.kind
        );
        if (index === -1) {
          this.state.signedTxs.push(tx);
        } else {
          this.state.signedTxs[index] = __spreadValues(__spreadValues({}, this.state.signedTxs[index]), tx);
        }
        this.state.pendingTxs = ((_a3 = this.state.pendingTxs) != null ? _a3 : []).filter(
          (pending) => !(pending.kind === tx.kind && (tx.pendingTxId !== void 0 && pending.txId === tx.pendingTxId || pending.id === tx.id))
        );
        this.save();
      }
      findSignedTransaction(txId) {
        var _a3;
        const id = this.chainSelector(txId, "evm");
        if (!id) return void 0;
        return [...(_a3 = this.state.signedTxs) != null ? _a3 : []].reverse().find((tx) => tx.kind === "transaction" && tx.id === id);
      }
      markSignedTxBackendNotified(pendingTxId) {
        var _a3;
        const record = [...(_a3 = this.state.signedTxs) != null ? _a3 : []].reverse().find(
          (tx) => tx.kind === "transaction" && tx.pendingTxId === pendingTxId
        );
        if (!record || record.backendNotified === true) return;
        record.backendNotified = true;
        this.save();
      }
      markSignedAgentActionNotified(agentRequestId) {
        var _a3;
        const record = [...(_a3 = this.state.signedTxs) != null ? _a3 : []].reverse().find((tx) => tx.agentRequestId === agentRequestId);
        if (!record || record.backendNotified === true) return;
        record.backendNotified = true;
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
          id: tx.solanaId === void 0 ? this.getNextSolTxId() : `tx-${tx.solanaId}`
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
      /** Find a pending Solana request by legacy or chain-qualified display id. */
      findPendingSolTx(txId) {
        var _a3;
        const id = this.chainSelector(txId, "svm");
        return id ? ((_a3 = this.state.pendingSolTxs) != null ? _a3 : []).find((tx) => tx.id === id) : void 0;
      }
      /** Find a pending EVM/EIP-712 request by legacy or qualified display id. */
      findPendingTx(txId) {
        var _a3;
        const id = this.chainSelector(txId, "evm");
        return id ? ((_a3 = this.state.pendingTxs) != null ? _a3 : []).find((tx) => tx.id === id) : void 0;
      }
      /** Selectors users can pass to `tx sign`; qualify only colliding ids. */
      pendingSelectors() {
        var _a3, _b, _c, _d;
        const evmIds = new Set(((_a3 = this.state.pendingTxs) != null ? _a3 : []).map((tx) => tx.id));
        const svmIds = new Set(((_b = this.state.pendingSolTxs) != null ? _b : []).map((tx) => tx.id));
        return [
          ...((_c = this.state.pendingTxs) != null ? _c : []).map(
            (tx) => svmIds.has(tx.id) ? `evm:${tx.id}` : tx.id
          ),
          ...((_d = this.state.pendingSolTxs) != null ? _d : []).map(
            (tx) => evmIds.has(tx.id) ? `svm:${tx.id}` : tx.id
          )
        ];
      }
      /** Get a pending tx by ID, or fatal() if not found. */
      requirePendingTx(txId) {
        const tx = this.findPendingTx(txId);
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
          fatal(
            "Duplicate transaction IDs are not allowed in a single `aomi tx sign` call."
          );
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
        return this.pendingSelectors();
      }
      chainSelector(selector, expected) {
        const match = selector.trim().toLowerCase().match(/^(?:(evm|svm|solana):)?(tx-\d+)$/);
        if (!match) return selector;
        const family = match[1] === "solana" ? "svm" : match[1];
        return family && family !== expected ? void 0 : match[2];
      }
      // ---------------------------------------------------------------------------
      // Bridge to ClientSession
      // ---------------------------------------------------------------------------
      /** Build a ClientSession from the current state. */
      createClientSession(config, options) {
        var _a3;
        const oauth = this.createOAuthProvider(fetch);
        const authorizedFetch = oauth ? wrapFetchWithPublicApiAuthorization({
          fetch,
          baseUrl: this.state.baseUrl,
          oauth
        }) : fetch;
        const paymentFetch = createCliPaymentFetch(
          config,
          options == null ? void 0 : options.onPayment,
          authorizedFetch
        );
        const session = new ClientSession(
          {
            baseUrl: this.state.baseUrl,
            apiKey: this.state.apiKey,
            fetch: paymentFetch,
            getAccountBearer: createCliAuthTokenProvider(() => this.state),
            oauth: paymentFetch ? void 0 : oauth,
            guest: false
          },
          {
            sessionId: this.state.sessionId,
            clientId: this.state.clientId,
            app: this.state.app,
            model: (_a3 = config == null ? void 0 : config.model) != null ? _a3 : this.state.model,
            applicationId: config == null ? void 0 : config.applicationId
          }
        );
        session.resolveUserState(
          buildCliUserState(this.state.publicKey, this.state.chainId, {
            svmAddress: this.state.svmPublicKey,
            svmCluster: this.resolvedSvmCluster(config == null ? void 0 : config.svmCluster)
          })
        );
        return session;
      }
      createOAuthProvider(fetchImpl) {
        if (!this.state.oauthGrants || Object.keys(this.state.oauthGrants).length === 0) {
          return void 0;
        }
        const pendingByResource = /* @__PURE__ */ new Map();
        return async ({ resource, scopes, forceRefresh }) => {
          var _a3, _b;
          let grant = (_a3 = this.state.oauthGrants) == null ? void 0 : _a3[resource];
          if (!grant || !scopes.every((scope) => grant == null ? void 0 : grant.scopes.includes(scope))) {
            const expandedScopes = Array.from(
              /* @__PURE__ */ new Set([...(_b = grant == null ? void 0 : grant.scopes) != null ? _b : [], ...scopes, "offline_access"])
            );
            const expandedGrant = await signInWithOAuthDevice({
              baseUrl: this.state.baseUrl,
              resource,
              scopes: expandedScopes,
              clientId: grant == null ? void 0 : grant.clientId,
              fetch: fetchImpl
            });
            this.setOAuthGrant(expandedGrant);
            return expandedGrant;
          }
          if (!forceRefresh && grant.expiresAt > Date.now() + 3e4) return grant;
          if (!grant.refreshToken) return null;
          let pending = pendingByResource.get(resource);
          if (!pending) {
            pending = refreshCliGrant(fetchImpl, this.state.baseUrl, grant).finally(
              () => pendingByResource.delete(resource)
            );
            pendingByResource.set(resource, pending);
          }
          grant = await pending;
          this.setOAuthGrant(grant);
          return grant;
        };
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
      getNextSolTxId() {
        var _a3, _b;
        const allIds = [
          ...(_a3 = this.state.pendingSolTxs) != null ? _a3 : [],
          ...(_b = this.state.signedSolTxs) != null ? _b : []
        ].map((tx) => {
          const match = tx.id.match(/^tx-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        });
        return `tx-${allIds.length > 0 ? Math.max(...allIds) + 1 : 1}`;
      }
    };
  }
});

// src/cli/output.ts
function printDataFileLocation(options) {
  if ((options == null ? void 0 : options.verbose) !== true) {
    return;
  }
  const activeFile = getActiveStateFilePath();
  if (activeFile) {
    console.log(`Data stored at ${activeFile} \u{1F4DD}`);
    return;
  }
  console.log(`Data stored under ${STATE_ROOT_DIR} \u{1F4DD}`);
}
function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}
function printToolComplete(event) {
  const name = getToolNameFromEvent(event);
  const result = getToolResultFromEvent(event);
  const line = formatToolResultLine(name, result);
  console.log(line);
}
function printTaskStarted(event) {
  const label = event.label || event.agent_id;
  console.log(`${CYAN}\u25C6 [agent] ${label} started${RESET}`);
}
function printTaskActivity(event) {
  console.log(`${DIM}  \u21B3 ${formatTaskActivity(event)}${RESET}`);
}
function printTaskCompleted(event, label) {
  const color = event.status === "completed" ? GREEN : "\x1B[31m";
  const mark = event.status === "completed" ? "\u2714" : "\u2716";
  console.log(
    `${color}  ${mark} ${label || event.agent_id}: ${event.status} (${formatTaskCompletionStats(event)})${RESET}`
  );
}
function formatTaskActivity(event) {
  var _a3, _b;
  const raw = event.kind === "note" ? (_a3 = event.text) != null ? _a3 : "" : (_b = event.tool_name) != null ? _b : "unknown tool";
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (normalized.length <= TASK_LINE_MAX) return normalized;
  return `${normalized.slice(0, TASK_LINE_MAX)}\u2026`;
}
function formatTaskCompletionStats(event) {
  var _a3, _b;
  const steps = (_a3 = event.steps) != null ? _a3 : 0;
  const seconds = (((_b = event.duration_ms) != null ? _b : 0) / 1e3).toFixed(1);
  return `${steps} ${steps === 1 ? "step" : "steps"}, ${seconds}s`;
}
function printToolResultLine(name, result) {
  console.log(formatToolResultLine(name, result));
}
function printPaymentEvent(event) {
  switch (event.type) {
    case "required": {
      const requirement = event.requirement;
      const details = [
        (requirement == null ? void 0 : requirement.amount) ? `amount ${requirement.amount}` : void 0,
        requirement == null ? void 0 : requirement.network,
        (requirement == null ? void 0 : requirement.payTo) ? `beneficiary ${requirement.payTo}` : void 0
      ].filter(Boolean).join(" \xB7 ");
      console.log(
        `${YELLOW}\u{1F4B3} x402 payment required${details ? `: ${details}` : ""}${RESET}`
      );
      return;
    }
    case "submitting":
      console.log(`${DIM}\u270D\uFE0F Signing and submitting x402 payment\u2026${RESET}`);
      return;
    case "settled":
      console.log(
        `${GREEN}\u2714 x402 payment settled${event.receiptId ? `: ${event.receiptId}` : ""}${RESET}`
      );
      return;
    case "rejected":
      console.log(
        `\x1B[31m\u2716 x402 payment rejected (HTTP ${event.status})${event.reason ? `: ${event.reason}` : ""}${RESET}`
      );
  }
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
var DIM, CYAN, YELLOW, GREEN, RESET, TASK_LINE_MAX;
var init_output = __esm({
  "src/cli/output.ts"() {
    "use strict";
    init_state2();
    DIM = "\x1B[2m";
    CYAN = "\x1B[36m";
    YELLOW = "\x1B[33m";
    GREEN = "\x1B[32m";
    RESET = "\x1B[0m";
    TASK_LINE_MAX = 100;
  }
});

// src/cli/context.ts
function createControlClient(config, options = {}) {
  var _a3, _b;
  const cli = CliSession.load();
  const baseUrl = (_a3 = config.baseUrl) != null ? _a3 : DEFAULT_CLI_BASE_URL;
  const oauth = cli == null ? void 0 : cli.createOAuthProvider(fetch);
  const authorizedFetch = oauth ? wrapFetchWithPublicApiAuthorization({ fetch, baseUrl, oauth }) : fetch;
  const paymentFetch = options.payment ? createCliPaymentFetch(config, options.onPayment, authorizedFetch) : void 0;
  return new AomiClient({
    baseUrl,
    apiKey: config.apiKey,
    fetch: paymentFetch != null ? paymentFetch : fetch,
    // Payment settlement retries happen inside the x402 wrapper. Put OAuth
    // inside that wrapper so a newly-added Payment-Signature is authorized
    // again with payments:submit instead of reusing the narrower first token.
    oauth: paymentFetch ? void 0 : oauth,
    guest: false,
    getAccountBearer: (_b = createCliGetAccountBearer(config)) != null ? _b : createCliAuthTokenProvider(() => {
      var _a4;
      return (_a4 = readState()) != null ? _a4 : {};
    })
  });
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
  void session;
  cli.setModel(requestedModel);
}
var init_context = __esm({
  "src/cli/context.ts"() {
    "use strict";
    init_client();
    init_cli_session();
    init_auth();
    init_client_factory();
    init_payment2();
    init_state2();
  }
});

// src/cli/transactions.ts
function walletRequestToPendingTx(request) {
  var _a3, _b, _c, _d, _e;
  if (request.kind === "transaction") {
    const payload = request.payload;
    const first = (_a3 = payload.calls) == null ? void 0 : _a3[0];
    return {
      kind: "transaction",
      agentRequestId: payload.requestId,
      txId: payload.txId,
      to: (_b = payload.to) != null ? _b : first == null ? void 0 : first.to,
      value: (_c = payload.value) != null ? _c : first == null ? void 0 : first.value,
      data: (_d = payload.data) != null ? _d : first == null ? void 0 : first.data,
      chainId: (_e = payload.chainId) != null ? _e : first == null ? void 0 : first.chainId,
      description: first == null ? void 0 : first.description,
      timestamp: request.timestamp,
      payload: request.payload
    };
  }
  if (request.kind === "signing" && request.payload.chainFamily === "evm") {
    const signable = request.payload.payloads[0];
    if (!signable || signable.kind !== "evm_personal" && signable.kind !== "evm_typed_data") {
      return null;
    }
    const payload = __spreadValues({
      requestId: request.id,
      signer: request.payload.signer,
      chainId: request.payload.chainId,
      description: request.payload.description
    }, signable.kind === "evm_personal" ? { non_typed_data: signable.message } : {
      typed_data: signable.typedData
    });
    return {
      kind: "eip712_sign",
      agentRequestId: request.id,
      eip712Id: payload.eip712Id,
      description: payload.description,
      timestamp: request.timestamp,
      payload: request.payload
    };
  }
  return null;
}
function walletRequestToPendingSolTx(request) {
  if (request.kind === "signing" && request.payload.chainFamily === "svm") {
    const signable = request.payload.payloads[0];
    if (!signable) return null;
    if (signable.kind === "svm_message") {
      return {
        agentRequestId: request.id,
        requestKind: "solana_sign_message",
        message: signable.messageBase64,
        cluster: request.payload.cluster,
        signer: request.payload.signer,
        description: request.payload.description,
        timestamp: request.timestamp,
        payload: request.payload
      };
    }
    if (signable.kind === "svm_transaction") {
      return {
        agentRequestId: request.id,
        requestKind: "solana_sign",
        unsignedTx: signable.transactionBase64,
        cluster: request.payload.cluster,
        signer: request.payload.signer,
        description: request.payload.description,
        timestamp: request.timestamp,
        payload: request.payload
      };
    }
    return null;
  }
  if (request.kind !== "solana_send" && request.kind !== "solana_sign_and_send") {
    return null;
  }
  const payload = request.payload;
  if (payload.pendingSolanaId === void 0 && !payload.requestId || payload.unsignedTx === void 0) {
    return null;
  }
  return {
    agentRequestId: payload.requestId,
    solanaId: payload.pendingSolanaId,
    solanaIds: payload.pendingSolanaIds,
    requestKind: request.kind,
    unsignedTx: payload.unsignedTx,
    cluster: payload.cluster,
    description: payload.description,
    timestamp: request.timestamp,
    payload: request.payload
  };
}
function pendingTxToCallList(tx) {
  if (tx.kind !== "transaction" || !tx.to) {
    throw new Error("pending_transaction_missing_call_data");
  }
  const calls = tx.payload.calls;
  if (calls == null ? void 0 : calls.length) {
    return calls.map(
      (call) => {
        var _a3;
        return toAAWalletCall({
          to: call.to,
          value: call.value,
          data: call.data,
          chainId: (_a3 = call.chainId) != null ? _a3 : tx.chainId
        });
      }
    );
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
function toSignedTransactionRecord(tx, execution, from, chainId3, timestamp2) {
  return {
    id: tx.id,
    kind: "transaction",
    pendingTxId: tx.txId,
    txHash: execution.txHash,
    txHashes: execution.txHashes,
    executionKind: execution.executionKind,
    batched: execution.batched,
    sponsored: execution.sponsored,
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
    if (tx.serviceFeeStatus) {
      parts.push(`fee: ${tx.serviceFeeStatus}`);
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
  var _a3;
  const parts = [`${prefix} ${tx.id}`, (_a3 = tx.requestKind) != null ? _a3 : "solana_sign"];
  if (tx.cluster) parts.push(`cluster: ${tx.cluster}`);
  if (tx.description) parts.push(tx.description);
  if (tx.signer) parts.push(`signer: ${tx.signer}`);
  if (tx.unsignedTx) parts.push(`tx: ${tx.unsignedTx.slice(0, 20)}...`);
  if (tx.message) parts.push(`message: ${tx.message.slice(0, 20)}...`);
  parts.push(`(${new Date(tx.timestamp).toLocaleTimeString()})`);
  return parts.join("  ");
}
function formatSignedSolTxLine(tx, prefix) {
  var _a3;
  const parts = [`${prefix} ${tx.id}`, (_a3 = tx.requestKind) != null ? _a3 : "solana_sign"];
  if (tx.signedTx) parts.push(`signed: ${tx.signedTx.slice(0, 20)}...`);
  if (tx.signature) parts.push(`sig: ${tx.signature.slice(0, 20)}...`);
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

// src/cli/commands/chat.ts
var chat_exports = {};
__export(chat_exports, {
  chatCommand: () => chatCommand,
  resolveSvmAddressForChat: () => resolveSvmAddressForChat,
  shouldBroadcastWalletStateChange: () => shouldBroadcastWalletStateChange,
  syncWalletStateForChat: () => syncWalletStateForChat
});
function normalizeAddress(address3) {
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
function resolveSvmAddressForChat(persistedSvmAddress, solanaPrivateKey) {
  var _a3;
  return (_a3 = deriveSvmAddress(solanaPrivateKey)) != null ? _a3 : persistedSvmAddress;
}
function shouldBroadcastWalletStateChange(config, previous, next) {
  var _a3, _b;
  if (next.svmAddress) {
    return (previous == null ? void 0 : previous.svmAddress) !== next.svmAddress;
  }
  if (!next.publicKey || next.chainId === void 0) {
    return false;
  }
  return normalizeAddress(previous == null ? void 0 : previous.publicKey) !== normalizeAddress(next.publicKey) || (previous == null ? void 0 : previous.chainId) !== next.chainId || (previous == null ? void 0 : previous.aaProvider) !== next.aaProvider || (previous == null ? void 0 : previous.aaMode) !== next.aaMode || normalizeAddress((_a3 = previous == null ? void 0 : previous.smartAccount) != null ? _a3 : void 0) !== normalizeAddress((_b = next.smartAccount) != null ? _b : void 0);
}
async function syncWalletStateForChat(config, previous, next, cli, session) {
  if (!shouldBroadcastWalletStateChange(config, previous, next) || !next.publicKey && !next.svmAddress) {
    return;
  }
  const userState = buildCliUserState(next.publicKey, next.chainId, {
    svmAddress: next.svmAddress,
    // --cluster wins, then the persisted choice, then mainnet — so an
    // EVM-only command cannot silently reset a persisted devnet/testnet
    // Solana wallet in the shared default-runtime context.
    svmCluster: cli.resolvedSvmCluster(config.svmCluster)
  });
  session.resolveUserState(userState);
}
async function chatCommand(config, message, verbose) {
  var _a3, _b, _c, _d, _e, _f, _g;
  if (!message) {
    fatal("Usage: aomi chat <message>");
  }
  const previousCli = config.freshSession ? null : CliSession.load();
  const previousWallet = previousCli ? {
    publicKey: previousCli.publicKey,
    chainId: previousCli.chainId,
    aaProvider: (_a3 = previousCli.toState().aaProvider) != null ? _a3 : null,
    aaMode: (_b = previousCli.toState().aaMode) != null ? _b : null,
    smartAccount: (_c = previousCli.toState().smartAccount) != null ? _c : null,
    svmAddress: void 0
    // force re-sync of SVM state on every chat
  } : null;
  const cli = CliSession.loadOrCreate(config);
  const session = cli.createClientSession(config, {
    onPayment: printPaymentEvent
  });
  const resolvedSolanaKey = cli.resolvedSvmPrivateKey(config.solanaPrivateKey);
  const svmAddress3 = resolveSvmAddressForChat(
    cli.svmPublicKey,
    resolvedSolanaKey
  );
  try {
    await ingestSecretsForSession(config, cli, session.client);
    await applyRequestedModelIfPresent(config, cli, session);
    await syncWalletStateForChat(
      config,
      previousWallet,
      {
        publicKey: cli.publicKey,
        chainId: cli.chainId,
        aaProvider: (_e = (_d = cli.toState().aaProvider) != null ? _d : config.aaProvider) != null ? _e : null,
        aaMode: (_f = cli.toState().aaMode) != null ? _f : null,
        smartAccount: (_g = cli.toState().smartAccount) != null ? _g : null,
        svmAddress: svmAddress3
      },
      cli,
      session
    );
    const previousPendingIds = /* @__PURE__ */ new Set([
      ...cli.pendingTxs.map((tx) => `evm:${tx.id}`),
      ...cli.pendingSolTxs.map((tx) => `svm:${tx.id}`)
    ]);
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
    if (verbose) {
      const agentLabels = /* @__PURE__ */ new Map();
      session.on("task_started", (event) => {
        agentLabels.set(event.agent_id, event.label || event.agent_id);
        printTaskStarted(event);
      });
      session.on("task_activity", (event) => {
        printTaskActivity(event);
      });
      session.on("task_completed", (event) => {
        printTaskCompleted(event, agentLabels.get(event.agent_id));
        agentLabels.delete(event.agent_id);
      });
      session.on("processing_start", () => {
        console.log(`${DIM}\u23F3 Thinking\u2026${RESET}`);
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
    if (session.getIsProcessing() && session.getPendingRequests().length === 0) {
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
    cli.syncPendingFromUserState(session.getUserState());
    for (const request of session.getPendingRequests()) {
      if (request.kind === "transaction" || request.kind === "signing") {
        const pending2 = walletRequestToPendingTx(request);
        if (pending2) cli.addPendingTx(pending2);
      }
      const pending = walletRequestToPendingSolTx(request);
      if (pending) cli.addPendingSolTx(pending);
    }
    cli.reload();
    const newPendingTxs = [
      ...cli.pendingTxs.filter((tx) => !previousPendingIds.has(`evm:${tx.id}`)),
      ...cli.pendingSolTxs.filter(
        (tx) => !previousPendingIds.has(`svm:${tx.id}`)
      )
    ];
    for (const pending of newPendingTxs) {
      console.log(`\u26A1 Wallet request queued: ${pending.id}`);
      if ("kind" in pending && pending.kind === "transaction") {
        const payload = pending.payload;
        console.log(`   to:    ${payload.to}`);
        if (payload.value) console.log(`   value: ${payload.value}`);
        if (payload.chainId) console.log(`   chain: ${payload.chainId}`);
      } else if ("kind" in pending && pending.kind === "eip712_sign") {
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
      } else if (session.getAgentStatus() === "interrupted") {
        console.log("(interrupted)");
      } else if (newPendingTxs.length === 0) {
        console.log("(no response)");
        fatal("Backend returned an empty agent message.");
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
    init_user_state2();
    init_solana_signer();
    init_transactions();
  }
});

// src/aa/execute.ts
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount as privateKeyToAccount4 } from "viem/accounts";
function walletExecutionFailureReason(error) {
  if (error && typeof error === "object") {
    for (const field of ["details", "shortMessage"]) {
      const value = error[field];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.split(/\n(?:\n|URL:|Request body:|Request Arguments:)/, 1)[0].trim();
}
function partialWalletExecution(error) {
  if (!error || typeof error !== "object" || !("partial" in error)) {
    return void 0;
  }
  const partial = error.partial;
  if (!partial || !Array.isArray(partial.completedTxHashes) || partial.completedTxHashes.length === 0 || !partial.completedTxHashes.every((hash) => typeof hash === "string") || !Number.isInteger(partial.failedCallIndex) || typeof partial.failureReason !== "string") {
    return void 0;
  }
  return partial;
}
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
  var _a3, _b, _c;
  const {
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
  } = params;
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
    for (const [callIndex, call] of normalizedCalls.entries()) {
      try {
        const chain = chainsById[call.chainId];
        if (!chain) {
          throw new Error(`Unsupported chain ${call.chainId}`);
        }
        const rpcUrl = getPreferredRpcUrl2(chain);
        if (!rpcUrl) {
          throw new Error(`No RPC for chain ${call.chainId}`);
        }
        const account = privateKeyToAccount4(localPrivateKey);
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
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          throw new Error(`Transaction ${hash} reverted`);
        }
        hashes.push(hash);
      } catch (error) {
        if (hashes.length > 0) {
          throw new PartialWalletExecutionError(error, hashes, callIndex);
        }
        throw error;
      }
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
      if (!canFallbackToSequentialWalletSends(error, requiresSponsoredSendCalls)) {
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
var ERC20_PAYMENT_CONTEXT_KEYS, AA_DEBUG_STORAGE_KEYS, PartialWalletExecutionError;
var init_execute = __esm({
  "src/aa/execute.ts"() {
    "use strict";
    ERC20_PAYMENT_CONTEXT_KEYS = /* @__PURE__ */ new Set(["erc20", "paymasterAddress"]);
    AA_DEBUG_STORAGE_KEYS = ["aomi:debug-aa", "AOMI_DEBUG_AA"];
    PartialWalletExecutionError = class extends Error {
      constructor(error, completedTxHashes, failedCallIndex) {
        const failureReason = walletExecutionFailureReason(error);
        super(failureReason);
        this.name = "PartialWalletExecutionError";
        this.partial = {
          completedTxHashes: [...completedTxHashes],
          failedCallIndex,
          failureReason
        };
      }
    };
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

// src/aa/index.ts
var init_aa = __esm({
  "src/aa/index.ts"() {
    "use strict";
    init_execute();
    init_fee();
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
  var _a3, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v;
  return {
    id: tx.id,
    kind: tx.kind,
    pendingTxId: (_a3 = tx.pendingTxId) != null ? _a3 : null,
    txHash: (_b = tx.txHash) != null ? _b : null,
    txHashes: (_c = tx.txHashes) != null ? _c : null,
    executionKind: (_d = tx.executionKind) != null ? _d : null,
    aaProvider: (_e = tx.aaProvider) != null ? _e : null,
    aaMode: (_f = tx.aaMode) != null ? _f : null,
    batched: (_g = tx.batched) != null ? _g : null,
    sponsored: (_h = tx.sponsored) != null ? _h : null,
    smartAccount4337: (_i = tx.smartAccount4337) != null ? _i : null,
    Delegation7702: (_j = tx.Delegation7702) != null ? _j : null,
    signature: (_k = tx.signature) != null ? _k : null,
    from: (_l = tx.from) != null ? _l : null,
    to: (_m = tx.to) != null ? _m : null,
    value: (_n = tx.value) != null ? _n : null,
    chainId: (_o = tx.chainId) != null ? _o : null,
    description: (_p = tx.description) != null ? _p : null,
    backendNotified: (_q = tx.backendNotified) != null ? _q : null,
    serviceFeeStatus: (_r = tx.serviceFeeStatus) != null ? _r : null,
    serviceFeeAmountWei: (_s = tx.serviceFeeAmountWei) != null ? _s : null,
    serviceFeeRecipient: (_t = tx.serviceFeeRecipient) != null ? _t : null,
    serviceFeeTxHash: (_u = tx.serviceFeeTxHash) != null ? _u : null,
    serviceFeeError: (_v = tx.serviceFeeError) != null ? _v : null,
    timestamp: toIsoTimestamp(tx.timestamp)
  };
}
function printKeyValueTable(rows, color = CYAN) {
  const labels = rows.map(([label]) => label);
  const values = rows.map(
    ([, value]) => truncateCell(value, MAX_TABLE_VALUE_WIDTH)
  );
  const keyWidth = Math.max(
    "field".length,
    ...labels.map((label) => label.length)
  );
  const valueWidth = Math.max(
    "value".length,
    ...values.map((value) => value.length)
  );
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
  const jsonWidth = Math.max(
    "metadata_json".length,
    ...jsonCells.map((v) => v.length)
  );
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

// src/cli/commands/wallet.ts
var wallet_exports = {};
__export(wallet_exports, {
  signCommand: () => signCommand,
  txCommand: () => txCommand
});
import { createWalletClient as createWalletClient2, formatEther, http as http2 } from "viem";
import { Connection } from "@solana/web3.js";
import { privateKeyToAccount as privateKeyToAccount5 } from "viem/accounts";
import * as viemChains from "viem/chains";
async function txCommand(config) {
  const cli = CliSession.load();
  if (!cli) {
    if (config.json) {
      printJson({ active: false, pending: [], signed: [] });
      return;
    }
    console.log("No active session");
    printDataFileLocation({ verbose: config.verbose });
    return;
  }
  const session = cli.createClientSession(config);
  try {
    await session.fetchCurrentState();
    for (const request of session.getPendingRequests()) {
      const evm = walletRequestToPendingTx(request);
      if (evm) cli.addPendingTx(evm);
      const svm = walletRequestToPendingSolTx(request);
      if (svm) cli.addPendingSolTx(svm);
    }
  } catch (e) {
  } finally {
    session.close();
  }
  const pending = [...cli.pendingTxs];
  const pendingSol = [...cli.pendingSolTxs];
  const pendingSelectors = cli.pendingSelectors();
  const evmSelectors = pendingSelectors.slice(0, pending.length);
  const svmSelectors = pendingSelectors.slice(pending.length);
  const signed = [...cli.signedTxs];
  const signedSol = [...cli.signedSolTxs];
  const totalPending = pending.length + pendingSol.length;
  const totalSigned = signed.length + signedSol.length;
  if (config.json) {
    printJson({
      active: true,
      pending: [
        ...pending.map((tx, index) => __spreadProps(__spreadValues({}, toPendingTxMetadata(tx)), {
          id: evmSelectors[index]
        })),
        ...pendingSol.map((tx, index) => {
          var _a3, _b, _c, _d;
          return {
            id: svmSelectors[index],
            kind: (_a3 = tx.requestKind) != null ? _a3 : "solana_sign",
            solanaId: tx.solanaId,
            signer: (_b = tx.signer) != null ? _b : null,
            cluster: (_c = tx.cluster) != null ? _c : null,
            description: (_d = tx.description) != null ? _d : null,
            timestamp: new Date(tx.timestamp).toISOString()
          };
        })
      ],
      signed: [
        ...signed.map((tx) => toSignedTxMetadata(tx)),
        ...signedSol.map((tx) => {
          var _a3, _b, _c, _d, _e;
          return {
            id: tx.id,
            kind: (_a3 = tx.requestKind) != null ? _a3 : "solana_sign",
            signedTx: (_b = tx.signedTx) != null ? _b : null,
            signer: (_c = tx.signer) != null ? _c : null,
            cluster: (_d = tx.cluster) != null ? _d : null,
            description: (_e = tx.description) != null ? _e : null,
            timestamp: new Date(tx.timestamp).toISOString()
          };
        })
      ]
    });
    return;
  }
  if (totalPending === 0 && totalSigned === 0) {
    console.log("No transactions.");
    printDataFileLocation({ verbose: config.verbose });
    return;
  }
  if (totalPending > 0) {
    console.log(`Pending (${totalPending}):`);
    for (const [index, tx] of pending.entries()) {
      console.log(formatTxLine(__spreadProps(__spreadValues({}, tx), { id: evmSelectors[index] }), "  \u23F3"));
    }
    for (const [index, tx] of pendingSol.entries()) {
      console.log(
        formatPendingSolTxLine(__spreadProps(__spreadValues({}, tx), { id: svmSelectors[index] }), "  \u23F3")
      );
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
  printDataFileLocation({ verbose: config.verbose });
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
  return (_c = (_b = chain.rpcUrls.default.http[0]) != null ? _b : (_a3 = chain.rpcUrls.public) == null ? void 0 : _a3.http[0]) != null ? _c : "";
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
  var _a3, _b, _c, _d, _e, _f, _g;
  const { cli, session, config, pendingTx } = params;
  if (!pendingTx.agentRequestId) {
    fatal(
      "This wallet request predates Agent v1 and cannot be submitted. Start a new Agent turn to recreate it."
    );
  }
  const secret = (_a3 = cli.resolvedSvmPrivateKey(config.solanaPrivateKey)) != null ? _a3 : process.env.SOLANA_PRIVATE_KEY;
  if (!secret) {
    fatal(
      [
        "Solana keypair required for `aomi tx sign` on an SVM request.",
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
  const requestKind = (_b = pendingTx.requestKind) != null ? _b : "solana_sign";
  console.log(`Kind:    ${requestKind}`);
  console.log(`Tx:      ${pendingTx.id}`);
  if (pendingTx.cluster) console.log(`Cluster: ${pendingTx.cluster}`);
  if (pendingTx.description) console.log(`Desc:    ${pendingTx.description}`);
  console.log(`Signer:  ${keypair.publicKey.toBase58()}`);
  console.log();
  if (requestKind === "solana_sign_message") {
    if (!pendingTx.message) {
      throw new Error("Solana message-sign request is missing message bytes.");
    }
    const outcome2 = signSolanaMessage(pendingTx.message, keypair);
    console.log(
      `\u2705 Signed message! signature: ${outcome2.signatureBase64.slice(0, 24)}...`
    );
    await session.resolve(pendingTx.agentRequestId, {
      kind: "signing",
      signatures: [outcome2.signatureBase64]
    });
    cli.addSignedSolTx({
      id: pendingTx.id,
      agentRequestId: pendingTx.agentRequestId,
      requestKind,
      signer: outcome2.signer,
      signature: outcome2.signatureBase64,
      cluster: pendingTx.cluster,
      description: pendingTx.description,
      timestamp: Date.now()
    });
    cli.removePendingSolTx(pendingTx.id);
    console.log("Backend notified.");
    return;
  }
  const batchTransactions = pendingTx.payload.transactions;
  if (pendingTx.agentRequestId && (requestKind === "solana_send" || requestKind === "solana_sign_and_send") && batchTransactions && batchTransactions.length > 1) {
    const rpcUrl = (_c = config.chainRpcUrl) != null ? _c : defaultSolanaRpcUrl(pendingTx.cluster);
    const connection = new Connection(rpcUrl, "confirmed");
    const legs = [];
    let lastSubmitted;
    for (const [index, transaction] of batchTransactions.entries()) {
      try {
        const outcome2 = signSolanaTransaction(transaction.unsignedTx, keypair);
        const signature2 = await connection.sendRawTransaction(
          Buffer.from(outcome2.signedTxBase64, "base64"),
          { skipPreflight: false, maxRetries: 3 }
        );
        const confirmation = await connection.confirmTransaction(
          signature2,
          "confirmed"
        );
        if (confirmation.value.err) {
          throw new Error(
            `Solana transaction ${signature2} failed: ${JSON.stringify(confirmation.value.err)}`
          );
        }
        legs.push({
          id: transaction.id,
          status: "submitted",
          signature: signature2,
          signedTx: outcome2.signedTxBase64
        });
        lastSubmitted = {
          signature: signature2,
          signedTx: outcome2.signedTxBase64,
          signer: outcome2.signer
        };
        cli.addSignedSolTx({
          id: `${pendingTx.id}:${transaction.id}`,
          agentRequestId: pendingTx.agentRequestId,
          requestKind,
          signedTx: outcome2.signedTxBase64,
          signer: outcome2.signer,
          signature: signature2,
          cluster: pendingTx.cluster,
          description: (_d = transaction.description) != null ? _d : pendingTx.description,
          timestamp: Date.now()
        });
      } catch (error) {
        legs.push({
          id: transaction.id,
          status: "failed",
          reason: error instanceof Error ? error.message : "Request failed"
        });
        legs.push(
          ...batchTransactions.slice(index + 1).map((remaining) => ({
            id: remaining.id,
            status: "skipped"
          }))
        );
        break;
      }
    }
    if (!lastSubmitted) {
      throw new Error(
        (_f = (_e = legs.find((leg) => leg.reason)) == null ? void 0 : _e.reason) != null ? _f : "No Solana batch transaction confirmed"
      );
    }
    await session.resolve(pendingTx.agentRequestId, {
      kind: requestKind,
      signature: lastSubmitted.signature,
      signedTx: lastSubmitted.signedTx,
      legs
    });
    cli.removePendingSolTx(pendingTx.id);
    console.log(
      `\u2705 Confirmed ${legs.filter((leg) => leg.status === "submitted").length}/${batchTransactions.length} Solana batch transactions.`
    );
    console.log("Backend notified.");
    return;
  }
  if (!pendingTx.unsignedTx) {
    throw new Error(
      "Solana transaction request is missing unsigned transaction bytes."
    );
  }
  const outcome = signSolanaTransaction(pendingTx.unsignedTx, keypair);
  console.log(
    `\u2705 Signed! signed_tx: ${outcome.signedTxBase64.slice(0, 24)}... (${outcome.signedTxBase64.length} chars)`
  );
  let signature;
  if (requestKind === "solana_send" || requestKind === "solana_sign_and_send") {
    const rpcUrl = (_g = config.chainRpcUrl) != null ? _g : defaultSolanaRpcUrl(pendingTx.cluster);
    const connection = new Connection(rpcUrl, "confirmed");
    signature = await connection.sendRawTransaction(
      Buffer.from(outcome.signedTxBase64, "base64"),
      { skipPreflight: false, maxRetries: 3 }
    );
    const confirmation = await connection.confirmTransaction(
      signature,
      "confirmed"
    );
    if (confirmation.value.err) {
      throw new Error(
        `Solana transaction ${signature} failed: ${JSON.stringify(confirmation.value.err)}`
      );
    }
    console.log(`\u2705 Confirmed! signature: ${signature}`);
    await session.resolve(pendingTx.agentRequestId, {
      kind: requestKind,
      signature,
      signedTx: outcome.signedTxBase64
    });
  } else {
    await session.resolve(pendingTx.agentRequestId, {
      kind: "signing",
      signatures: [outcome.signedTxBase64]
    });
  }
  cli.addSignedSolTx({
    id: pendingTx.id,
    agentRequestId: pendingTx.agentRequestId,
    requestKind,
    signedTx: outcome.signedTxBase64,
    signer: outcome.signer,
    signature,
    cluster: pendingTx.cluster,
    description: pendingTx.description,
    timestamp: Date.now()
  });
  cli.removePendingSolTx(pendingTx.id);
  console.log("Backend notified.");
}
function defaultSolanaRpcUrl(cluster) {
  if (cluster == null ? void 0 : cluster.includes("devnet")) return "https://api.devnet.solana.com";
  if (cluster == null ? void 0 : cluster.includes("testnet")) return "https://api.testnet.solana.com";
  return "https://api.mainnet-beta.solana.com";
}
async function executeCliTransaction(params) {
  const { privateKey, currentChainId, chainsById, rpcUrl, callList } = params;
  const unsupportedWalletMethod = async () => {
    throw new Error("wallet_client_path_unavailable_in_cli_private_key_mode");
  };
  return executeWalletCalls({
    callList,
    currentChainId,
    capabilities: void 0,
    localPrivateKey: privateKey,
    sendCallsSyncAsync: unsupportedWalletMethod,
    sendTransactionAsync: unsupportedWalletMethod,
    switchChainAsync: async () => void 0,
    chainsById,
    getPreferredRpcUrl: (resolvedChain) => getPreferredRpcUrl(resolvedChain, rpcUrl)
  });
}
async function recoverConfirmedTransactions(params) {
  var _a3;
  const { cli, session, records } = params;
  if (records.some((record) => !record.agentRequestId)) {
    fatal(
      "A confirmed wallet record predates Agent v1 and cannot be replayed. Start a new Agent turn instead."
    );
  }
  let replayed = 0;
  for (const record of records) {
    if (!record.agentRequestId || !record.txHash) continue;
    await session.fetchCurrentState();
    const pending = session.getPendingRequests().find((request) => request.id === record.agentRequestId);
    if (pending) {
      const hashes = ((_a3 = record.txHashes) == null ? void 0 : _a3.length) ? record.txHashes : [record.txHash];
      await session.resolve(record.agentRequestId, {
        kind: "transaction",
        txHash: record.txHash,
        txHashes: hashes,
        completedTxIds: hashes.map((_, index) => index + 1)
      });
      replayed += 1;
    }
    cli.markSignedAgentActionNotified(record.agentRequestId);
  }
  if (replayed > 0) {
    console.log(
      `Backend notification recovered for ${replayed} confirmed transaction${replayed === 1 ? "" : "s"}; no transaction was rebroadcast.`
    );
  } else {
    console.log(
      "Transaction already confirmed; no transaction was rebroadcast."
    );
  }
}
async function signCommand(config, txIds) {
  var _a3, _b, _c, _d, _e, _f;
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
  if (config.execution === "aa") {
    fatal(
      "AA execution now runs in the backend lane (rolling out); use --eoa for local execution."
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
    await session.fetchCurrentState();
    const preAgentIds = uniqueIds.filter((id) => {
      var _a4, _b2;
      const record = (_b2 = (_a4 = cli.findPendingTx(id)) != null ? _a4 : cli.findPendingSolTx(id)) != null ? _b2 : cli.findSignedTransaction(id);
      return record && !record.agentRequestId;
    });
    if (preAgentIds.length > 0) {
      fatal(
        `Wallet request${preAgentIds.length === 1 ? "" : "s"} ${preAgentIds.join(", ")} predate Agent v1 and cannot be submitted. Start a new Agent turn to recreate them.`
      );
    }
    const solanaIds = uniqueIds.filter(
      (id) => cli.findPendingSolTx(id) !== void 0
    );
    const evmIds = uniqueIds.filter(
      (id) => cli.findPendingTx(id) !== void 0 || cli.findSignedTransaction(id) !== void 0
    );
    const unknownIds = uniqueIds.filter(
      (id) => cli.findPendingSolTx(id) === void 0 && cli.findPendingTx(id) === void 0 && cli.findSignedTransaction(id) === void 0
    );
    const ambiguousIds = uniqueIds.filter(
      (id) => !id.includes(":") && cli.findPendingSolTx(id) !== void 0 && (cli.findPendingTx(id) !== void 0 || cli.findSignedTransaction(id) !== void 0)
    );
    if (ambiguousIds.length > 0) {
      fatal(
        `Ambiguous transaction ${ambiguousIds.join(", ")}. Use the chain-qualified selector shown by \`aomi tx list\` (for example \`evm:tx-1\` or \`svm:tx-1\`).`
      );
    }
    if (unknownIds.length > 0) {
      const available = cli.pendingSelectors().join(", ") || "(none)";
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
        console.log(
          `${DIM}Solana requests execute sequentially; confirmed transactions are not rolled back if a later request fails.${RESET}`
        );
      }
      const pendingSolana = solanaIds.map((id) => cli.requirePendingSolTx(id));
      for (const pendingTx of pendingSolana) {
        await signSolanaPending({ cli, session, config, pendingTx });
      }
      return;
    }
    const confirmedRecords = uniqueIds.flatMap((id) => {
      const record = cli.findSignedTransaction(id);
      return record ? [record] : [];
    });
    if (confirmedRecords.length > 0) {
      if (confirmedRecords.length !== uniqueIds.length) {
        fatal(
          "Confirmed and unconfirmed transactions cannot be mixed in one retry. Sign the remaining pending IDs separately."
        );
      }
      await recoverConfirmedTransactions({
        cli,
        session,
        records: confirmedRecords
      });
      return;
    }
    const pendingTxs = cli.requirePendingTxs(uniqueIds);
    const agentRequestIds = Array.from(
      new Set(
        pendingTxs.flatMap(
          (tx) => tx.agentRequestId ? [tx.agentRequestId] : []
        )
      )
    );
    if (agentRequestIds.length !== 1 || pendingTxs.some((tx) => !tx.agentRequestId)) {
      fatal(
        "Every wallet request in a sign call must belong to one Agent v1 action."
      );
    }
    const agentRequestId = agentRequestIds[0];
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
    const account = privateKeyToAccount5(privateKey);
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
    let agentResult;
    let partialFailureReason;
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
      session.resolveWallet(account.address, primaryChainId);
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
            `\x1B[31m\u274C Simulation failed at step ${(_d = failed == null ? void 0 : failed.step) != null ? _d : "?"}: ${(_e = failed == null ? void 0 : failed.revert_reason) != null ? _e : "unknown"}${RESET}`
          );
        }
        simFee = sim.fee;
      } catch (e) {
        if (e instanceof CliExit) throw e;
        console.log(
          `${DIM}Simulation unavailable, skipping fee injection.${RESET}`
        );
      }
      let normalizedFee = null;
      let autoFeeCall = null;
      if (simFee) {
        normalizedFee = normalizeSimulatedFee(simFee);
        if (normalizedFee) {
          console.log(
            `Fee:     ${formatEther(normalizedFee.amountWei)} ETH (${normalizedFee.amountWei} wei) \u2192 ${normalizedFee.recipient}`
          );
        }
        autoFeeCall = buildFeeAAWalletCall(simFee, primaryChainId);
      }
      const executionCallList = autoFeeCall ? [...baseCallList, autoFeeCall] : baseCallList;
      console.log("Exec:    eoa");
      let execution;
      let failedCallIndex;
      try {
        execution = await executeCliTransaction({
          privateKey,
          currentChainId: primaryChainId,
          chainsById,
          rpcUrl,
          callList: executionCallList
        });
      } catch (error) {
        const partial = partialWalletExecution(error);
        if (!partial) throw error;
        execution = {
          txHash: partial.completedTxHashes[partial.completedTxHashes.length - 1],
          txHashes: partial.completedTxHashes,
          executionKind: "eoa",
          batched: partial.completedTxHashes.length > 1,
          sponsored: false
        };
        partialFailureReason = partial.failureReason;
        failedCallIndex = partial.failedCallIndex;
      }
      if (!partialFailureReason && execution.txHashes.length !== executionCallList.length) {
        throw new Error("wallet_execution_hash_count_mismatch");
      }
      const actionTxHashes = execution.txHashes.slice(0, baseCallList.length);
      const feeTxHash = autoFeeCall ? execution.txHashes[baseCallList.length] : void 0;
      const confirmedPendingTxs = pendingTxs.slice(0, actionTxHashes.length);
      if (confirmedPendingTxs.length === 0) {
        throw new Error(
          partialFailureReason != null ? partialFailureReason : "No requested transaction confirmed"
        );
      }
      console.log(
        `\u2705 Sent! Hash: ${actionTxHashes[actionTxHashes.length - 1]}`
      );
      if (actionTxHashes.length > 1) {
        console.log(`Count:   ${actionTxHashes.length}`);
      }
      if (feeTxHash) console.log(`Fee tx:  ${feeTxHash}`);
      const feeStatus = !autoFeeCall ? void 0 : feeTxHash ? "confirmed" : failedCallIndex === baseCallList.length ? "failed" : "not_attempted";
      signedRecords = confirmedPendingTxs.map((tx, index) => {
        const actionExecution = __spreadProps(__spreadValues({}, execution), {
          txHash: actionTxHashes[index],
          txHashes: [actionTxHashes[index]],
          batched: false
        });
        return __spreadValues(__spreadProps(__spreadValues({}, toSignedTransactionRecord(
          tx,
          actionExecution,
          account.address,
          resolvedChainIds[index],
          Date.now()
        )), {
          backendNotified: false,
          agentRequestId: tx.agentRequestId
        }), normalizedFee && feeStatus ? {
          serviceFeeStatus: feeStatus,
          serviceFeeAmountWei: normalizedFee.amountWei.toString(),
          serviceFeeRecipient: normalizedFee.recipient,
          serviceFeeTxHash: feeTxHash,
          serviceFeeError: feeStatus === "confirmed" ? void 0 : partialFailureReason
        } : {});
      });
      if (agentRequestId) {
        const completedTxIds = actionTxHashes.map((_, index) => index + 1);
        const failedTxIds = baseCallList.slice(actionTxHashes.length).map((_, index) => actionTxHashes.length + index + 1);
        agentResult = {
          kind: "transaction",
          txHash: actionTxHashes[actionTxHashes.length - 1],
          txHashes: actionTxHashes,
          completedTxIds,
          failedTxIds,
          failureReason: partialFailureReason,
          batched: baseCallList.length > 1,
          callCount: baseCallList.length
        };
      }
      const remainingTxIds = pendingTxs.slice(confirmedPendingTxs.length).flatMap((tx) => tx.txId === void 0 ? [] : [tx.txId]);
      void remainingTxIds;
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
          agentRequestId: pendingTx.agentRequestId,
          kind: "eip712_sign",
          signature,
          from: account.address,
          description: pendingTx.description,
          timestamp: Date.now()
        }
      ];
      if (agentRequestId) {
        agentResult = { kind: "signing", signatures: [signature] };
      }
    }
    cli.setPublicKey(account.address);
    session.resolveWallet(account.address, primaryChainId);
    for (const signedRecord of signedRecords) {
      cli.addSignedTx(signedRecord);
    }
    if (agentResult) {
      await session.resolve(agentRequestId, agentResult);
      cli.markSignedAgentActionNotified(agentRequestId);
    }
    console.log("Backend notified.");
    const failedFee = signedRecords.find(
      (record) => record.serviceFeeStatus === "failed"
    );
    if (failedFee) {
      fatal(
        [
          `\u26A0\uFE0F  Partial execution: action confirmed as ${failedFee.txHash}; service fee failed: ${(_f = failedFee.serviceFeeError) != null ? _f : "unknown error"}.`,
          "The action is finalized and was removed from pending. Do not run `aomi tx sign` for this staged ID again.",
          "No automatic fee-only retry is available; reconcile the fee separately with an operator using the recorded amount and recipient."
        ].join("\n")
      );
    }
    if (partialFailureReason) {
      const confirmedIds = signedRecords.map((record) => record.id).join(", ");
      fatal(
        [
          `\u26A0\uFE0F  Partial execution: confirmed ${confirmedIds}; a later action failed: ${partialFailureReason}.`,
          "Confirmed IDs were removed from pending and will not be rebroadcast.",
          "Run `aomi tx list`, then retry only the IDs that remain pending."
        ].join("\n")
      );
    }
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
    init_wallet_utils();
    init_cli_session();
    init_errors();
    init_solana_signer();
    init_output();
    init_transactions();
    init_tables();
  }
});

// src/cli/commands/simulate.ts
var simulate_exports = {};
__export(simulate_exports, {
  simulateCommand: () => simulateCommand
});
import { formatEther as formatEther2 } from "viem";
async function simulateCommand(config, txIds) {
  var _a3, _b, _c, _d;
  const cli = CliSession.load();
  if (!cli) {
    fatal("No active session. Run `aomi chat` first.");
  }
  if (txIds.length === 0) {
    fatal(
      "Usage: aomi tx simulate <tx-id> [<tx-id> ...]\nRun `aomi tx list` to see available IDs."
    );
  }
  const session = cli.createClientSession(config);
  try {
    await session.fetchCurrentState();
    for (const request of session.getPendingRequests()) {
      const pending = walletRequestToPendingTx(request);
      if (pending) cli.addPendingTx(pending);
    }
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
  const response = await client.simulateBatch(cli.sessionId, transactions, {
    from: (_b = cli.publicKey) != null ? _b : void 0,
    chainId: (_c = cli.chainId) != null ? _c : void 0
  });
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
    console.log(
      `    ${DIM}to: ${step.tx.to} | value: ${step.tx.value_eth} ETH${gasInfo}${RESET}`
    );
    if (!step.success && step.revert_reason) {
      console.log(`    \x1B[31mRevert: ${step.revert_reason}${RESET}`);
    }
  }
  if (result.total_gas) {
    console.log(
      `
${DIM}Total gas: ${result.total_gas.toLocaleString()}${RESET}`
    );
  }
  if (result.fee) {
    const feeWei = BigInt(result.fee.amount_wei);
    console.log(
      `Service fee: ${formatEther2(feeWei)} ETH (${feeWei} wei) \u2192 ${result.fee.recipient}`
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
    init_transactions();
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
    apiKey: record.state.apiKey,
    getAccountBearer: createCliAuthTokenProvider(() => record.state)
  });
  try {
    const delta = await client.agent.check(record.sessionId);
    const messages = delta.messages.map((message) => ({
      id: message.id,
      sender: message.role,
      content: message.content,
      timestamp: message.createdAt,
      is_streaming: message.streaming
    }));
    return {
      topic: (_a3 = delta.title) != null ? _a3 : "Untitled Session",
      messageCount: messages.length,
      tokenCountEstimate: estimateTokenCount(messages),
      toolCalls: delta.messages.filter((message) => message.toolResult).length,
      pendingTxs: (_b = record.state.pendingTxs) != null ? _b : []
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
async function sessionsCommand(_config) {
  var _a3;
  const sessions = listStoredSessions().sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
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
  const existing = CliSession.load();
  const cli = CliSession.create(config, existing == null ? void 0 : existing.toState());
  console.log(`Active session set to ${cli.sessionId} (new).`);
  printDataFileLocation();
}
async function resumeSessionCommand(selector) {
  const resumed = setActiveSession(selector);
  if (resumed) {
    console.log(
      `Active session set to ${resumed.sessionId} (session-${resumed.localId}).`
    );
    printDataFileLocation();
    return;
  }
  const current = CliSession.load();
  if (!current) {
    fatal(
      `No local session found for selector "${selector}" and no authenticated session is available to import it.`
    );
  }
  const session = current.createClientSession();
  try {
    await session.client.agent.sessions.get(selector);
  } catch (e) {
    fatal(
      `No account-owned local or remote session found for selector "${selector}".`
    );
  } finally {
    session.close();
  }
  const imported = CliSession.create(
    { secrets: {} },
    current.toState(),
    selector
  );
  console.log(
    `Active session set to ${imported.sessionId} (imported remote session).`
  );
  printDataFileLocation();
}
function deleteSessionCommand(selector) {
  const deleted = deleteStoredSession(selector);
  if (!deleted) {
    fatal(`No local session found for selector "${selector}".`);
  }
  console.log(
    `Deleted local session ${deleted.sessionId} (session-${deleted.localId}).`
  );
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
    init_state2();
    init_auth();
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
  interruptCommand: () => interruptCommand,
  modelsCommand: () => modelsCommand,
  setAppCommand: () => setAppCommand,
  setModelCommand: () => setModelCommand,
  statusCommand: () => statusCommand
});
async function statusCommand(config) {
  var _a3, _b, _c;
  const cli = CliSession.load();
  if (!cli) {
    if (config.json) {
      printJson({ active: false });
      return;
    }
    console.log("No active session");
    printDataFileLocation({ verbose: config.verbose });
    return;
  }
  cli.mergeConfig(config);
  const session = cli.createClientSession(config);
  try {
    await session.fetchCurrentState();
    console.log(
      JSON.stringify(
        {
          sessionId: cli.sessionId,
          baseUrl: cli.baseUrl,
          app: cli.app,
          model: (_a3 = cli.model) != null ? _a3 : null,
          chainId: (_b = cli.chainId) != null ? _b : null,
          isProcessing: session.getIsProcessing(),
          messageCount: session.getMessages().length,
          title: (_c = session.getTitle()) != null ? _c : null,
          pendingTxs: cli.pendingTxs.length,
          signedTxs: cli.signedTxs.length
        },
        null,
        2
      )
    );
    printDataFileLocation({ verbose: config.verbose });
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
    const delta = await session.client.agent.check(cli.sessionId);
    console.log(JSON.stringify(delta.activity, null, 2));
  } finally {
    session.close();
  }
}
async function interruptCommand(config) {
  const cli = CliSession.load();
  if (!cli) {
    fatal("No active session to interrupt.");
  }
  cli.mergeConfig(config);
  const session = cli.createClientSession(config);
  try {
    await session.interrupt();
    if (config.json) {
      printJson({ sessionId: cli.sessionId, interrupted: true });
      return;
    }
    console.log(`Interrupted session ${cli.sessionId}.`);
    printDataFileLocation({ verbose: config.verbose });
  } finally {
    session.close();
  }
}
async function appsCommand(config) {
  var _a3, _b;
  const client = createControlClient(config);
  const cli = CliSession.load();
  const response = await client.pipeline.listApps();
  const apps = Array.isArray(response.apps) ? response.apps : [];
  if (apps.length === 0) {
    if (config.json) {
      printJson([]);
      return;
    }
    console.log("No apps available.");
    return;
  }
  const currentApp = (_a3 = cli == null ? void 0 : cli.app) != null ? _a3 : config.app;
  if (config.json) {
    printJson(
      apps.map((descriptor) => __spreadProps(__spreadValues({}, descriptor), {
        current: currentApp === descriptor.name
      }))
    );
    return;
  }
  for (const descriptor of apps) {
    const name = String((_b = descriptor.name) != null ? _b : "");
    const marker = currentApp === name ? "  (current)" : "";
    const secrets = Array.isArray(descriptor.secrets) ? descriptor.secrets : [];
    const required3 = secrets.filter((secret) => secret.required === true).map((secret) => String(secret.name));
    const requiredSuffix = required3.length > 0 ? `  [requires: ${required3.join(", ")}]` : "";
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
function currentAppCommand(config = { secrets: {} }) {
  var _a3, _b;
  const cli = CliSession.load();
  if (!cli) {
    if (config.json) {
      printJson({ active: false, app: null });
      return;
    }
    console.log("No active session");
    printDataFileLocation({ verbose: config.verbose });
    return;
  }
  if (config.json) {
    printJson({ active: true, app: (_a3 = cli.app) != null ? _a3 : "default" });
    return;
  }
  console.log((_b = cli.app) != null ? _b : "(default)");
  printDataFileLocation({ verbose: config.verbose });
}
function currentChainCommand(config = { secrets: {} }) {
  var _a3;
  const cli = CliSession.load();
  if (!cli) {
    if (config.json) {
      printJson({ active: false, chainId: null });
      return;
    }
    console.log("No active session");
    printDataFileLocation({ verbose: config.verbose });
    return;
  }
  if (config.json) {
    printJson({ active: true, chainId: (_a3 = cli.chainId) != null ? _a3 : null });
    return;
  }
  if (cli.chainId === void 0) {
    console.log("No active chain");
  } else {
    console.log(String(cli.chainId));
  }
  printDataFileLocation({ verbose: config.verbose });
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
function currentWalletCommand(config = { secrets: {} }) {
  var _a3, _b;
  const cli = CliSession.load();
  if (!cli) {
    if (config.json) {
      printJson({ active: false, wallets: [] });
      return;
    }
    console.log("No active session");
    printDataFileLocation({ verbose: config.verbose });
    return;
  }
  const state = cli.toState();
  const wallets = [
    cli.publicKey ? {
      family: "evm",
      address: cli.publicKey,
      chainId: (_a3 = cli.chainId) != null ? _a3 : null,
      hasSavedSigner: Boolean(cli.privateKey)
    } : null,
    state.svmPublicKey ? {
      // "svm" is the canonical family name (matches the backend wire key
      // and the account-graph API); "solana" was the deprecated alias.
      family: "svm",
      address: state.svmPublicKey,
      cluster: (_b = state.svmCluster) != null ? _b : null,
      hasSavedSigner: Boolean(state.svmPrivateKey)
    } : null
  ].filter((wallet) => wallet !== null);
  if (config.json) {
    printJson({ active: true, wallets });
    return;
  }
  const hasAny = cli.publicKey || state.svmPublicKey;
  if (!hasAny) {
    console.log("No wallet configured");
    printDataFileLocation({ verbose: config.verbose });
    return;
  }
  if (cli.publicKey) {
    const signerStatus = cli.privateKey ? "saved signer" : "address only";
    console.log(`EVM:    ${cli.publicKey} (${signerStatus})`);
  }
  if (state.svmPublicKey) {
    const signerStatus = state.svmPrivateKey ? "saved signer" : "address only";
    const clusterSuffix = state.svmCluster ? `, ${state.svmCluster}` : "";
    console.log(
      `Solana: ${state.svmPublicKey} (${signerStatus}${clusterSuffix})`
    );
  }
  printDataFileLocation({ verbose: config.verbose });
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
  cli.setModel(model);
  console.log(`Model set to ${model}`);
  if ((options == null ? void 0 : options.printLocation) !== false) {
    printDataFileLocation({ verbose: config.verbose });
  }
}
function chainsCommand(config = { secrets: {} }) {
  const cli = CliSession.load();
  const currentChainId = cli == null ? void 0 : cli.chainId;
  const chains = SUPPORTED_CHAIN_IDS.map((id) => {
    var _a3;
    return {
      id,
      name: (_a3 = CHAIN_NAMES[id]) != null ? _a3 : `Chain ${id}`,
      current: currentChainId === id
    };
  });
  if (config.json) {
    printJson(chains);
    return;
  }
  for (const chain of chains) {
    const marker = chain.current ? "  (current)" : "";
    console.log(`${chain.id}  ${chain.name}${marker}`);
  }
}
var init_control = __esm({
  "src/cli/commands/control.ts"() {
    "use strict";
    init_chains();
    init_cli_session();
    init_context();
    init_output();
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
  var _a3, _b;
  const cli = CliSession.load();
  if (!cli) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }
  cli.mergeConfig(config);
  const session = cli.createClientSession(config);
  try {
    await session.fetchCurrentState();
    const messages = session.getMessages();
    const pendingTxs = [...cli.pendingTxs];
    const signedTxs = [...cli.signedTxs];
    const toolCalls = messages.filter((msg) => Boolean(msg.tool_result)).length;
    const tokenCountEstimate = estimateTokenCount(messages);
    const topic = (_a3 = session.getTitle()) != null ? _a3 : "Untitled Session";
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
      const sender = (_b = msg.sender) != null ? _b : "unknown";
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
import { privateKeyToAccount as privateKeyToAccount6 } from "viem/accounts";
function loadOrCreateForSettings() {
  const existing = CliSession.load();
  if (existing) return existing;
  return CliSession.loadOrCreate({
    baseUrl: DEFAULT_CLI_BASE_URL,
    app: "default",
    secrets: {}
  });
}
function setWalletCommand(privateKeyInput) {
  const privateKey = normalizePrivateKey(privateKeyInput);
  if (!privateKey) {
    fatal("Usage: aomi wallet set <private-key>  (EVM hex key)");
  }
  const account = privateKeyToAccount6(privateKey);
  const cli = loadOrCreateForSettings();
  cli.setWallet(privateKey, account.address);
  console.log(`EVM wallet set to ${account.address}`);
  printDataFileLocation();
}
function setSvmWalletCommand(keyInput, cluster) {
  var _a3;
  let keypair;
  try {
    keypair = parseSolanaKeypairSecret(keyInput.trim());
  } catch (err) {
    fatal(
      `Invalid Solana private key: ${err instanceof Error ? err.message : err}
Usage: aomi wallet set --solana <base58-secret-key> [--cluster <cluster>]`
    );
  }
  const publicKey = keypair.publicKey.toBase58();
  const cli = loadOrCreateForSettings();
  const effectiveCluster = (_a3 = cluster != null ? cluster : cli.svmCluster) != null ? _a3 : "solana:mainnet";
  cli.setSvmWallet(keyInput.trim(), publicKey, effectiveCluster);
  console.log(`Solana wallet set to ${publicKey} (cluster ${effectiveCluster})`);
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
    init_client_factory();
    init_output();
    init_validation();
    init_errors();
    init_solana_signer();
  }
});

// src/cli/device-auth.ts
import { spawn } from "child_process";
import { createHash, randomBytes } from "crypto";
import { createServer } from "http";
async function signInWithDeviceProvider({
  baseUrl,
  provider,
  fetch: fetchImpl = fetch,
  now = Date.now,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  openBrowser = openUrlInBrowser,
  randomBytes: randomBytesImpl = randomBytes
}) {
  var _a3, _b, _c, _d;
  const portalUrl = normalizeBaseUrl(baseUrl);
  const state = base64Url(randomBytesImpl(32));
  const verifier = base64Url(randomBytesImpl(32));
  const codeChallenge = sha256Base64Url(verifier);
  const { server, redirectUri, callback } = await createLoopbackCallback({
    state,
    timeoutMs
  });
  try {
    const authUrl = buildDeviceAuthUrl({
      portalUrl,
      state,
      codeChallenge,
      redirectUri,
      provider
    });
    console.log(`Opening browser for Aomi account login: ${authUrl}`);
    await openBrowser(authUrl);
    console.log("Waiting for browser authentication...");
    const { code } = await callback;
    const exchange = await requestJson(
      fetchImpl,
      joinUrl(portalUrl, "/api/aomi/device-auth/exchange"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          state,
          codeVerifier: verifier,
          redirectUri
        })
      },
      "Device auth exchange"
    );
    const sessionToken = typeof exchange.sessionToken === "string" ? exchange.sessionToken : "";
    if (!sessionToken) {
      throw new Error("Device auth exchange is missing session token");
    }
    const accountInfo = await fetchPortalAccount(
      fetchImpl,
      portalUrl,
      sessionToken
    );
    return {
      provider: exchange.provider === "privy" || exchange.provider === "para" ? exchange.provider : provider,
      auth: {
        sessionToken,
        expiresAt: (_c = (_b = parseExpiresAt(exchange.expiresAt)) != null ? _b : parseExpiresAt((_a3 = accountInfo == null ? void 0 : accountInfo.session) == null ? void 0 : _a3.expiresAt)) != null ? _c : now() + DEFAULT_SESSION_TTL_MS,
        betterAuthUserId: typeof ((_d = accountInfo == null ? void 0 : accountInfo.session) == null ? void 0 : _d.betterAuthUserId) === "string" ? accountInfo.session.betterAuthUserId : typeof exchange.betterAuthUserId === "string" ? exchange.betterAuthUserId : void 0
      }
    };
  } finally {
    await closeServer(server);
  }
}
async function getDeviceProviderCredential({
  baseUrl,
  provider,
  sessionToken,
  fetch: fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  openBrowser = openUrlInBrowser,
  randomBytes: randomBytesImpl = randomBytes
}) {
  if (!sessionToken) {
    throw new Error("Device auth provider linking requires an account session");
  }
  const portalUrl = normalizeBaseUrl(baseUrl);
  const state = base64Url(randomBytesImpl(32));
  const verifier = base64Url(randomBytesImpl(32));
  const codeChallenge = sha256Base64Url(verifier);
  const { server, redirectUri, callback } = await createLoopbackCallback({
    state,
    timeoutMs
  });
  try {
    const intent = await requestJson(
      fetchImpl,
      joinUrl(portalUrl, "/api/aomi/device-auth/link-intent"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          state,
          codeChallenge,
          redirectUri,
          provider
        })
      },
      "Device auth link intent"
    );
    if (typeof intent.linkIntent !== "string" || intent.state !== state || intent.redirectUri !== redirectUri) {
      throw new Error("Device auth link intent response is invalid");
    }
    const authUrl = buildDeviceAuthUrl({
      portalUrl,
      state,
      codeChallenge,
      redirectUri,
      provider,
      mode: "link",
      linkIntent: intent.linkIntent
    });
    console.log(
      `Opening browser to link ${provider != null ? provider : "provider"}: ${authUrl}`
    );
    await openBrowser(authUrl);
    console.log("Waiting for browser authentication...");
    const { code } = await callback;
    const exchange = await requestJson(
      fetchImpl,
      joinUrl(portalUrl, "/api/aomi/device-auth/exchange"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          state,
          codeVerifier: verifier,
          redirectUri
        })
      },
      "Device auth link exchange"
    );
    return __spreadProps(__spreadValues({}, exchange), {
      provider: exchange.provider === "privy" || exchange.provider === "para" ? exchange.provider : provider
    });
  } finally {
    await closeServer(server);
  }
}
function buildDeviceAuthUrl(input2) {
  const url = new URL(joinUrl(input2.portalUrl, "/device-auth"));
  url.searchParams.set("state", input2.state);
  url.searchParams.set("code_challenge", input2.codeChallenge);
  url.searchParams.set("redirect_uri", input2.redirectUri);
  if (input2.provider) url.searchParams.set("provider", input2.provider);
  if (input2.mode && input2.mode !== "login") {
    url.searchParams.set("mode", input2.mode);
  }
  if (input2.linkIntent) url.searchParams.set("link_intent", input2.linkIntent);
  return url.toString();
}
async function createLoopbackCallback(input2) {
  let settle;
  let fail;
  const callback = new Promise((resolve, reject) => {
    settle = resolve;
    fail = reject;
  });
  let settled = false;
  const timer = setTimeout(() => {
    if (!settled) {
      settled = true;
      fail(new Error("Timed out waiting for browser authentication"));
    }
  }, input2.timeoutMs);
  const server = createServer((req, res) => {
    var _a3, _b, _c, _d;
    try {
      const host = (_a3 = req.headers.host) != null ? _a3 : "127.0.0.1";
      const url = new URL((_b = req.url) != null ? _b : "/", `http://${host}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404).end("Not found");
        return;
      }
      const code = (_c = url.searchParams.get("code")) != null ? _c : "";
      const state = (_d = url.searchParams.get("state")) != null ? _d : "";
      const error = url.searchParams.get("error");
      if (error) {
        throw new Error(error);
      }
      if (state !== input2.state) {
        throw new Error("Invalid browser auth state");
      }
      if (!code) {
        throw new Error("Missing browser auth code");
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(
        "<!doctype html><title>Aomi CLI login complete</title><body>Authentication complete. You can close this window.</body>"
      );
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        settle({ code });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Auth failed";
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end(message);
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        fail(error);
      }
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address3 = server.address();
  return {
    server,
    redirectUri: `http://127.0.0.1:${address3.port}/callback`,
    callback
  };
}
function closeServer(server) {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}
function openUrlInBrowser(url) {
  const platform = process.platform;
  const command = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore"
  });
  child.unref();
}
function sha256Base64Url(value) {
  return createHash("sha256").update(value).digest("base64url");
}
function base64Url(value) {
  return value.toString("base64url");
}
var DEFAULT_TIMEOUT_MS;
var init_device_auth = __esm({
  "src/cli/device-auth.ts"() {
    "use strict";
    init_auth();
    DEFAULT_TIMEOUT_MS = 5 * 60 * 1e3;
  }
});

// src/cli/account-graph.ts
import { privateKeyToAccount as privateKeyToAccount7 } from "viem/accounts";
function requireAccountGraphClient(cli) {
  var _a3;
  const sessionToken = (_a3 = cli.auth) == null ? void 0 : _a3.sessionToken;
  if (!sessionToken) {
    fatal("No account session. Run `aomi account login` first.");
  }
  return new AccountGraphClient({
    baseUrl: cli.baseUrl,
    sessionToken
  });
}
function resolveAccountPrivateKey(cli, config) {
  var _a3;
  const privateKey = (_a3 = config.privateKey) != null ? _a3 : cli.privateKey;
  if (!privateKey) {
    fatal(
      "No EVM private key configured.\nRun `aomi wallet set <evm-private-key>` or pass `--private-key`."
    );
  }
  return privateKey;
}
function buildWalletLinkMessage(input2) {
  var _a3, _b, _c;
  const baseUrl = normalizeBaseUrl(input2.baseUrl);
  const domain = (_a3 = input2.domain) != null ? _a3 : new URL(baseUrl).host;
  const uri = (_b = input2.uri) != null ? _b : baseUrl;
  return `${domain} wants to link this wallet to your Aomi account:
${input2.address}

Sign in to Aomi.

URI: ${uri}
Version: 1
Chain ID: ${input2.chainId}
Nonce: ${input2.nonce}
Issued At: ${((_c = input2.issuedAt) != null ? _c : /* @__PURE__ */ new Date()).toISOString()}`;
}
async function buildSignedWalletLink(input2) {
  var _a3, _b, _c;
  const client = requireAccountGraphClient(input2.cli);
  const privateKey = resolveAccountPrivateKey(input2.cli, input2.config);
  const account = privateKeyToAccount7(privateKey);
  const chainId3 = (_b = (_a3 = input2.config.chain) != null ? _a3 : input2.cli.chainId) != null ? _b : 1;
  const nonce = await client.getWalletLinkNonce({
    address: account.address,
    chainId: chainId3
  });
  const message = buildWalletLinkMessage({
    address: account.address,
    chainId: chainId3,
    nonce: nonce.nonce,
    domain: nonce.domain,
    uri: nonce.uri,
    baseUrl: input2.cli.baseUrl
  });
  const signature = await account.signMessage({ message });
  return {
    family: "evm",
    address: account.address,
    chainId: chainId3,
    nonce: nonce.nonce,
    message,
    signature,
    label: (_c = input2.label) != null ? _c : null
  };
}
function resolveAccountLink(account, selector) {
  if (!account.user) return null;
  const raw = selector.trim();
  const separator = raw.indexOf(":");
  const [kindPrefix, idFromPrefix] = separator >= 0 ? [raw.slice(0, separator), raw.slice(separator + 1)] : ["", ""];
  const wantedKind = kindPrefix === "identity" || kindPrefix === "wallet" ? kindPrefix : void 0;
  const id = wantedKind ? idFromPrefix : raw;
  if (!id) return null;
  const identity = account.linkedAccounts.find((link) => link.id === id);
  const wallet = account.wallets.find((link) => link.id === id);
  if (wantedKind === "identity") {
    return identity ? { kind: "identity", id, link: identity } : null;
  }
  if (wantedKind === "wallet") {
    return wallet ? { kind: "wallet", id, link: wallet } : null;
  }
  if (identity && wallet) {
    fatal(
      `Link id "${id}" is ambiguous. Use "identity:${id}" or "wallet:${id}".`
    );
  }
  if (identity) return { kind: "identity", id, link: identity };
  if (wallet) return { kind: "wallet", id, link: wallet };
  return null;
}
function formatAccountGraphError(status, body, fallback) {
  var _a3;
  const code = extractErrorCode(body);
  if (status === 401) {
    return "Session expired; run `aomi account login`";
  }
  if (status === 409 && code === "cannot_unlink_last_login_factor") {
    return "Cannot unlink the last login method. Link another account method first.";
  }
  if (status === 409 && code === "already_linked_to_another_account") {
    return "This login method is already linked to another Aomi account.";
  }
  if (status === 403 && code === "protected_identity") {
    return "This login identity is protected and cannot be edited directly.";
  }
  return (_a3 = code != null ? code : fallback) != null ? _a3 : `Request failed: HTTP ${status}`;
}
function extractErrorCode(body) {
  if (!body || typeof body !== "object") return null;
  const record = body;
  if (typeof record.error === "string") return record.error;
  if (typeof record.message === "string") return record.message;
  if (record.error && typeof record.error === "object" && typeof record.error.message === "string") {
    return record.error.message;
  }
  return null;
}
var AccountGraphClient;
var init_account_graph = __esm({
  "src/cli/account-graph.ts"() {
    "use strict";
    init_auth();
    init_errors();
    AccountGraphClient = class {
      constructor(input2) {
        var _a3;
        this.baseUrl = normalizeBaseUrl(input2.baseUrl);
        this.sessionToken = input2.sessionToken;
        this.fetchImpl = (_a3 = input2.fetch) != null ? _a3 : fetch;
      }
      getAccount() {
        return this.request("/api/aomi/account", {
          method: "GET"
        });
      }
      updateAccount(body) {
        return this.request("/api/aomi/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      }
      deleteAccount() {
        return this.request("/api/aomi/account", {
          method: "DELETE"
        });
      }
      signOut() {
        return this.request("/api/aomi/sign-out", { method: "POST" });
      }
      async getWalletLinkNonce(input2) {
        const params = new URLSearchParams({
          address: input2.address,
          chainId: String(input2.chainId)
        });
        return this.request(`/api/aomi/wallets/link?${params.toString()}`, {
          method: "GET"
        });
      }
      linkWallet(body) {
        return this.request(
          "/api/aomi/wallets/link",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          }
        );
      }
      exchangeProviderCredential(credential) {
        return this.request(
          "/api/aomi/provider/exchange",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credential)
          }
        );
      }
      updateIdentity(identityId, body) {
        return this.request(
          `/api/aomi/identities/${encodeURIComponent(identityId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          }
        );
      }
      unlinkIdentity(identityId) {
        return this.request(
          `/api/aomi/identities/${encodeURIComponent(identityId)}`,
          {
            method: "DELETE"
          }
        );
      }
      updateWallet(walletId, body) {
        return this.request(
          `/api/aomi/wallets/${encodeURIComponent(walletId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          }
        );
      }
      unlinkWallet(walletId) {
        return this.request(`/api/aomi/wallets/${encodeURIComponent(walletId)}`, {
          method: "DELETE"
        });
      }
      async request(path, init) {
        var _a3;
        const response = await this.fetchImpl(joinUrl(this.baseUrl, path), __spreadProps(__spreadValues({}, init), {
          credentials: "include",
          headers: __spreadValues({
            Accept: "application/json",
            Authorization: `Bearer ${this.sessionToken}`
          }, (_a3 = init.headers) != null ? _a3 : {})
        }));
        if (!response.ok) {
          throw new Error(
            formatAccountGraphError(
              response.status,
              await response.json().catch(() => null),
              await safeResponseText(response).catch(() => "")
            )
          );
        }
        return await response.json().catch(() => ({}));
      }
    };
  }
});

// src/cli/commands/account.ts
var account_exports = {};
__export(account_exports, {
  accountDeleteCommand: () => accountDeleteCommand,
  accountLinkCommand: () => accountLinkCommand,
  accountLinksCommand: () => accountLinksCommand,
  accountLoginCommand: () => accountLoginCommand,
  accountRenameCommand: () => accountRenameCommand,
  accountSessionsCommand: () => accountSessionsCommand,
  accountSwitchCommand: () => accountSwitchCommand,
  accountUnlinkCommand: () => accountUnlinkCommand,
  accountUpdateCommand: () => accountUpdateCommand,
  accountWhoamiCommand: () => accountWhoamiCommand,
  logoutCommand: () => logoutCommand,
  whoamiCommand: () => whoamiCommand
});
async function accountLoginCommand(config, options = {}) {
  var _a3, _b, _c;
  const cli = CliSession.loadOrCreate(config);
  let rewroteLegacyBackend = false;
  if (!config.baseUrl && cli.baseUrl === LEGACY_RAW_BACKEND_URL) {
    cli.setBaseUrl(DEFAULT_CLI_BASE_URL);
    rewroteLegacyBackend = true;
  }
  if (rewroteLegacyBackend && !config.json) {
    console.log(`Backend updated to ${DEFAULT_CLI_BASE_URL}`);
  }
  if (options.solana && (options.wallet || options.provider)) {
    fatal("Choose only one of `--solana`, `--wallet`, or `--provider`.");
  }
  if (options.solana) {
    await accountLoginWithSiws(cli, config);
    return;
  }
  if (options.wallet || options.noBrowser || config.privateKey) {
    await accountLoginWithSiwe(cli, config);
    return;
  }
  if (options.provider && options.provider !== "privy" && options.provider !== "para") {
    fatal('Unknown --provider value. Use "privy" or "para".');
  }
  const oauthDefault = !options.legacy && !["0", "false", "no"].includes(
    (_b = (_a3 = process.env.AOMI_CLI_OAUTH_DEFAULT_ENABLED) == null ? void 0 : _a3.trim().toLowerCase()) != null ? _b : ""
  );
  if (!options.provider && oauthDefault) {
    const origin = new URL(cli.baseUrl).origin;
    const grants = [
      {
        resource: `${origin}/v1/agent`,
        scopes: ["agent:read", "agent:write", "offline_access"]
      },
      {
        resource: `${origin}/v1/pipeline`,
        scopes: ["pipeline:catalog", "offline_access"]
      }
    ];
    for (const request of grants) {
      const grant = await signInWithOAuthDevice({
        baseUrl: cli.baseUrl,
        resource: request.resource,
        scopes: request.scopes
      });
      cli.setOAuthGrant(grant);
    }
    if (config.json) {
      printJson({
        status: "signed_in",
        method: "oauth_device",
        resources: grants.map((grant) => grant.resource)
      });
    } else {
      console.log("Signed in with OAuth device authorization");
      printDataFileLocation({ verbose: config.verbose });
    }
    return;
  }
  const provider = options.provider;
  const result = await signInWithDeviceProvider({
    baseUrl: cli.baseUrl,
    provider
  });
  cli.setAuthSession(result.auth);
  if (config.json) {
    printJson({
      status: "signed_in",
      provider: (_c = result.provider) != null ? _c : null,
      baseUrl: cli.baseUrl,
      migratedLegacyBackend: rewroteLegacyBackend,
      expiresAt: new Date(result.auth.expiresAt).toISOString()
    });
    return;
  }
  console.log(
    `Signed in${result.provider ? ` with ${formatProvider(result.provider)}` : ""}`
  );
  console.log(
    `Session expires at ${new Date(result.auth.expiresAt).toISOString()}`
  );
  printDataFileLocation({ verbose: config.verbose });
}
async function accountLoginWithSiws(cli, config) {
  var _a3;
  const privateKey = (_a3 = cli.resolvedSvmPrivateKey(config.solanaPrivateKey)) != null ? _a3 : process.env.SOLANA_PRIVATE_KEY;
  if (!privateKey) {
    fatal(
      "No Solana private key configured.\nRun `aomi wallet set --solana <solana-private-key>` or pass `--solana-private-key`."
    );
  }
  const chainId3 = cli.resolvedSvmCluster(config.svmCluster);
  const result = await signInWithCliSiws({
    baseUrl: cli.baseUrl,
    privateKey,
    chainId: chainId3
  });
  cli.setSvmWallet(privateKey, result.address, chainId3);
  cli.setAuthSession(result.auth);
  if (config.json) {
    printJson({
      status: "signed_in",
      provider: "siws",
      address: result.address,
      chainId: chainId3,
      baseUrl: cli.baseUrl,
      expiresAt: new Date(result.auth.expiresAt).toISOString()
    });
    return;
  }
  console.log(`Signed in with Solana wallet ${result.address}`);
  console.log(
    `Session expires at ${new Date(result.auth.expiresAt).toISOString()}`
  );
  printDataFileLocation({ verbose: config.verbose });
}
async function accountLoginWithSiwe(cli, config) {
  var _a3, _b, _c;
  const privateKey = (_a3 = config.privateKey) != null ? _a3 : cli.privateKey;
  if (!privateKey) {
    fatal(
      "No EVM private key configured.\nRun `aomi wallet set <evm-private-key>` or pass `--private-key`."
    );
  }
  const chainId3 = (_c = (_b = config.chain) != null ? _b : cli.chainId) != null ? _c : DEFAULT_CHAIN_ID2;
  const result = await signInWithCliSiwe({
    baseUrl: cli.baseUrl,
    privateKey,
    chainId: chainId3
  });
  cli.setWallet(privateKey, result.address);
  if (cli.chainId !== chainId3) {
    cli.setChainId(chainId3);
  }
  cli.setAuthSession(result.auth);
  if (config.json) {
    printJson({
      status: "signed_in",
      provider: "siwe",
      address: result.address,
      chainId: chainId3,
      baseUrl: cli.baseUrl,
      expiresAt: new Date(result.auth.expiresAt).toISOString()
    });
    return;
  }
  console.log(`Signed in with ${result.address}`);
  console.log(
    `Session expires at ${new Date(result.auth.expiresAt).toISOString()}`
  );
  printDataFileLocation({ verbose: config.verbose });
}
function formatProvider(provider) {
  return provider === "privy" ? "Privy" : "Para";
}
async function accountWhoamiCommand(config) {
  var _a3, _b;
  const cli = CliSession.load();
  if (!cli) {
    if (config.json) {
      printJson({ active: false });
      return;
    }
    console.log("No active session");
    printDataFileLocation({ verbose: config.verbose });
    return;
  }
  cli.mergeConfig(config);
  if ((_a3 = cli.auth) == null ? void 0 : _a3.sessionToken) {
    try {
      const account = await requireAccountGraphClient(cli).getAccount();
      if (config.json) {
        printJson(account);
        return;
      }
      printAccountSummary(account);
      printDataFileLocation({ verbose: config.verbose });
      return;
    } catch (e) {
    }
  }
  const session = cli.createClientSession();
  try {
    const account = await session.client.getAccount(cli.sessionId);
    if (config.json) {
      printJson(account);
      return;
    }
    const user = account.user;
    console.log(`Account:  ${user.user_id}`);
    if (user.username) console.log(`Username: ${user.username}`);
    if (user.verified_email) {
      console.log(`Email:    ${user.verified_email}`);
    }
    if (user.tier) console.log(`Tier:     ${user.tier}`);
    if (user.status) console.log(`Status:   ${user.status}`);
    const wallets = (_b = account.identity_wallets) != null ? _b : [];
    console.log(`Wallets:  ${wallets.length}`);
    for (const wallet of wallets) {
      const walletId = wallet.wallet_id ? ` (${wallet.wallet_id})` : "";
      console.log(
        `- ${formatWalletChainType(wallet.chain_type)} [${wallet.wallet_provider}]: ${wallet.address}${walletId}`
      );
    }
    printDataFileLocation({ verbose: config.verbose });
  } catch (e) {
    if (config.json) {
      printJson({
        active: true,
        bound: false,
        hasCredential: hasAccountCredential(cli.toState())
      });
      return;
    }
    console.log("Not bound to an account (anonymous session).");
    if (!hasAccountCredential(cli.toState())) {
      console.log(
        "No account credential configured. Run `aomi account login` or pass --account-bearer."
      );
    } else {
      console.log(
        "An account credential was sent, but the backend did not bind or accept this session."
      );
    }
    printDataFileLocation({ verbose: config.verbose });
  } finally {
    session.close();
  }
}
async function accountLinksCommand(config) {
  const cli = loadMergedCli(config);
  const client = requireAccountGraphClient(cli);
  const account = await client.getAccount();
  if (config.json) {
    printJson(account);
    return;
  }
  printAccountLinks(account);
  printDataFileLocation({ verbose: config.verbose });
}
async function accountLinkCommand(config, options = {}) {
  var _a3, _b, _c;
  const cli = loadMergedCli(config);
  const client = requireAccountGraphClient(cli);
  const provider = normalizeProviderOption(options.provider);
  const wantsWallet = options.wallet || !provider && !options.solana;
  if ([
    Boolean(provider),
    Boolean(options.wallet),
    Boolean(options.solana)
  ].filter(Boolean).length > 1) {
    fatal("Choose only one of `--provider`, `--wallet`, or `--solana`.");
  }
  if (options.solana) {
    const privateKey = (_a3 = cli.resolvedSvmPrivateKey(config.solanaPrivateKey)) != null ? _a3 : process.env.SOLANA_PRIVATE_KEY;
    if (!privateKey) {
      fatal(
        "No Solana private key configured.\nRun `aomi wallet set --solana <solana-private-key>` or pass `--solana-private-key`."
      );
    }
    const chainId3 = cli.resolvedSvmCluster(config.svmCluster);
    const result = await linkCliSiwsWallet({
      baseUrl: cli.baseUrl,
      sessionToken: cli.auth.sessionToken,
      privateKey,
      chainId: chainId3
    });
    cli.setSvmWallet(privateKey, result.address, chainId3);
    const account = await client.getAccount();
    if (config.json) {
      printJson(__spreadProps(__spreadValues({}, result), { account }));
      return;
    }
    console.log(
      result.status === "noop" ? `Solana login method already linked for ${result.address}` : `Linked Solana wallet login method ${result.address}`
    );
    printAccountLinks(account);
    printDataFileLocation({ verbose: config.verbose });
    return;
  }
  if (provider) {
    const result = await getDeviceProviderCredential({
      baseUrl: cli.baseUrl,
      provider,
      sessionToken: (_c = (_b = cli.auth) == null ? void 0 : _b.sessionToken) != null ? _c : ""
    });
    if (result.status === "conflict") {
      fatal("This login method is already linked to another Aomi account.");
    }
    if (config.json) {
      printJson(result);
      return;
    }
    console.log(`Linked ${formatProvider(provider)} login method`);
    if (result.status === "linked" && result.account) {
      printAccountLinks(result.account);
    }
    printDataFileLocation({ verbose: config.verbose });
    return;
  }
  if (wantsWallet) {
    const body = await buildSignedWalletLink({
      cli,
      config,
      label: options.label
    });
    const result = await client.linkWallet(body);
    if (config.json) {
      printJson(result);
      return;
    }
    console.log(
      result.status === "noop" ? `Login method already linked for ${body.address}` : `Linked wallet login method ${body.address}`
    );
    if (result.account) {
      printAccountLinks(result.account);
    }
    printDataFileLocation({ verbose: config.verbose });
  }
}
async function accountUnlinkCommand(config, selector, options = {}) {
  requireConfirmed(options.yes, "unlink an account login method");
  const cli = loadMergedCli(config);
  const client = requireAccountGraphClient(cli);
  const account = await client.getAccount();
  const link = requireResolvedLink(account, selector);
  if (link.kind === "identity") {
    await client.unlinkIdentity(link.id);
  } else {
    await client.unlinkWallet(link.id);
  }
  if (config.json) {
    printJson({ status: "unlinked", link: serializeResolvedLink(link) });
    return;
  }
  console.log(`Unlinked ${formatResolvedLink(link)}`);
  printDataFileLocation({ verbose: config.verbose });
}
async function accountRenameCommand(config, selector, options = {}) {
  if (options.label === void 0) {
    fatal("Pass `--label <name>`.");
  }
  const cli = loadMergedCli(config);
  const client = requireAccountGraphClient(cli);
  const account = await client.getAccount();
  const link = requireResolvedLink(account, selector);
  if (link.kind === "identity") {
    await client.updateIdentity(link.id, { displayLabel: options.label });
  } else {
    await client.updateWallet(link.id, { label: options.label });
  }
  if (config.json) {
    printJson({
      status: "renamed",
      label: options.label,
      link: serializeResolvedLink(link)
    });
    return;
  }
  console.log(`Renamed ${formatResolvedLink(link)}`);
  printDataFileLocation({ verbose: config.verbose });
}
async function accountUpdateCommand(config, input2) {
  if (input2.displayName === void 0 && input2.avatarUrl === void 0) {
    fatal("Pass `--display-name` or `--avatar-url`.");
  }
  const cli = loadMergedCli(config);
  const client = requireAccountGraphClient(cli);
  const account = await client.updateAccount({
    displayName: input2.displayName,
    avatarUrl: input2.avatarUrl
  });
  if (config.json) {
    printJson(account);
    return;
  }
  console.log("Updated account profile");
  printAccountSummary(account);
  printDataFileLocation({ verbose: config.verbose });
}
async function accountDeleteCommand(config, options = {}) {
  requireConfirmed(options.yes, "delete this Aomi account");
  const cli = loadMergedCli(config);
  const client = requireAccountGraphClient(cli);
  const result = await client.deleteAccount();
  cli.clearAuthSession();
  if (config.json) {
    printJson(result);
    return;
  }
  console.log(
    `Deleted account (${result.revokedIdentities} login methods, ${result.revokedWallets} wallets revoked)`
  );
  printDataFileLocation({ verbose: config.verbose });
}
async function accountSessionsCommand(config) {
  await sessionsCommand(config);
}
function accountSwitchCommand(selector) {
  resumeSessionCommand(selector);
}
function hasAccountCredential(state) {
  var _a3, _b;
  return Boolean(
    ((_a3 = state.auth) == null ? void 0 : _a3.sessionToken) || state.accountBearer || Object.keys((_b = state.oauthGrants) != null ? _b : {}).length
  );
}
function formatWalletChainType(chainType) {
  const normalized = chainType.trim().toLowerCase();
  if (normalized === "ethereum" || normalized === "evm") {
    return "Ethereum";
  }
  if (normalized === "solana" || normalized === "svm") {
    return "Solana";
  }
  return chainType;
}
async function logoutCommand(config) {
  var _a3, _b;
  const cli = CliSession.load();
  if (!cli) {
    if (config.json) {
      printJson({ active: false });
      return;
    }
    console.log("No active session");
    printDataFileLocation({ verbose: config.verbose });
    return;
  }
  cli.mergeConfig(config);
  const token = (_a3 = cli.auth) == null ? void 0 : _a3.sessionToken;
  try {
    for (const grant of Object.values(cli.oauthGrants)) {
      const token2 = (_b = grant.refreshToken) != null ? _b : grant.accessToken;
      await fetch(`${cli.baseUrl}/api/auth/oauth2/revoke`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: token2, client_id: grant.clientId })
      }).catch(() => void 0);
    }
    await signOutCliSession({
      baseUrl: cli.baseUrl,
      sessionToken: token
    });
  } finally {
    cli.clearAuthSession();
    cli.clearOAuthGrants();
    cli.clearSigningKeys();
  }
  if (config.json) {
    printJson({ status: "signed_out" });
    return;
  }
  console.log("Signed out");
  printDataFileLocation({ verbose: config.verbose });
}
function loadMergedCli(config) {
  const cli = CliSession.load();
  if (!cli) {
    fatal("No active session. Run `aomi account login` first.");
  }
  cli.mergeConfig(config);
  return cli;
}
function normalizeProviderOption(provider) {
  if (!provider) return void 0;
  const normalized = provider.trim().toLowerCase();
  if (normalized === "privy" || normalized === "para") return normalized;
  fatal('Unknown --provider value. Use "privy" or "para".');
}
function printAccountSummary(account) {
  var _a3;
  if (!account.user) {
    console.log("No active account");
    return;
  }
  console.log(`Account:  ${account.user.id}`);
  if (account.user.displayName) {
    console.log(`Name:     ${account.user.displayName}`);
  }
  if (account.user.email) {
    console.log(`Email:    ${account.user.email}`);
  }
  if ((_a3 = account.session) == null ? void 0 : _a3.expiresAt) {
    console.log(
      `Session:  expires ${new Date(account.session.expiresAt).toISOString()}`
    );
  }
  console.log(`Login methods: ${account.linkedAccounts.length}`);
  console.log(`Wallets:       ${account.wallets.length}`);
}
function printAccountLinks(account) {
  var _a3, _b;
  if (!account.user) {
    console.log("No active account");
    return;
  }
  console.log(`Account:  ${account.user.id}`);
  if (account.user.displayName) {
    console.log(`Name:     ${account.user.displayName}`);
  }
  if (account.user.email) {
    console.log(`Email:    ${account.user.email}`);
  }
  if ((_a3 = account.session) == null ? void 0 : _a3.expiresAt) {
    console.log(
      `Session:  expires ${new Date(account.session.expiresAt).toISOString()}`
    );
  }
  const identities = (_b = account.linkedAccounts) != null ? _b : [];
  console.log(`Login methods: ${identities.length}`);
  for (const identity of identities) {
    console.log(formatIdentityLine(identity));
    const childWallets = account.wallets.filter(
      (wallet) => walletBelongsToIdentity(wallet, identity)
    );
    for (const wallet of childWallets) {
      console.log(`  ${formatWalletLine(wallet)}`);
    }
  }
  const attachedWalletIds = new Set(
    identities.flatMap(
      (identity) => account.wallets.filter((wallet) => walletBelongsToIdentity(wallet, identity)).map((wallet) => wallet.id)
    )
  );
  const otherWallets = account.wallets.filter(
    (wallet) => !attachedWalletIds.has(wallet.id)
  );
  if (otherWallets.length > 0) {
    console.log(`Wallets:  ${otherWallets.length}`);
    for (const wallet of otherWallets) {
      console.log(formatWalletLine(wallet));
    }
  }
}
function serializeResolvedLink(link) {
  return {
    kind: link.kind,
    id: link.id,
    provider: link.kind === "identity" ? link.link.provider : link.link.provider,
    family: link.kind === "wallet" ? link.link.family : void 0
  };
}
function formatIdentityLine(identity) {
  const label = identity.displayLabel ? ` "${identity.displayLabel}"` : "";
  const email = identity.email ? ` <${identity.email}>` : "";
  return `- identity:${identity.id} ${identity.provider}${label}${email}`;
}
function formatWalletLine(wallet) {
  const label = wallet.label ? ` "${wallet.label}"` : "";
  const chain = wallet.chainId ? ` chain:${wallet.chainId}` : "";
  const provider = wallet.provider ? ` [${wallet.provider}]` : "";
  return `- wallet:${wallet.id} ${wallet.family}${provider}: ${wallet.address}${chain}${label}`;
}
function walletBelongsToIdentity(wallet, identity) {
  if (wallet.provider && wallet.provider === identity.provider) return true;
  if (wallet.linkedVia === identity.provider) return true;
  return identity.provider === "siwe" && wallet.linkedVia === "siwe";
}
function requireResolvedLink(account, selector) {
  const link = resolveAccountLink(account, selector);
  if (!link) {
    fatal(
      `No account link found for "${selector}". Run \`aomi account links\`.`
    );
  }
  return link;
}
function formatResolvedLink(link) {
  if (link.kind === "identity") {
    return `${link.link.provider} login method identity:${link.id}`;
  }
  return `${link.link.family} wallet login method wallet:${link.id}`;
}
function requireConfirmed(confirmed, action) {
  if (!confirmed) {
    fatal(`Refusing to ${action} without --yes.`);
  }
}
var DEFAULT_CHAIN_ID2, LEGACY_RAW_BACKEND_URL, whoamiCommand;
var init_account = __esm({
  "src/cli/commands/account.ts"() {
    "use strict";
    init_cli_session();
    init_errors();
    init_output();
    init_auth();
    init_device_auth();
    init_client_factory();
    init_oauth_device_auth();
    init_account_graph();
    init_sessions();
    DEFAULT_CHAIN_ID2 = 1;
    LEGACY_RAW_BACKEND_URL = "https://api.aomi.dev";
    whoamiCommand = accountWhoamiCommand;
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

// src/lib/deployment-state.ts
import { mkdir, readFile, writeFile } from "fs/promises";
import { join as join2 } from "path";
function statePath(cwd) {
  return join2(cwd, DIR, FILE);
}
async function writeDeploymentState(state, cwd = process.cwd()) {
  const dir = join2(cwd, DIR);
  await mkdir(dir, { recursive: true });
  await writeFile(statePath(cwd), JSON.stringify(state, null, 2), "utf-8");
}
async function readDeploymentState(cwd = process.cwd()) {
  try {
    const raw = await readFile(statePath(cwd), "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}
var DIR, FILE;
var init_deployment_state = __esm({
  "src/lib/deployment-state.ts"() {
    "use strict";
    DIR = ".aomi";
    FILE = "deployment.json";
  }
});

// src/cli/commands/status.ts
var status_exports = {};
__export(status_exports, {
  statusCommand: () => statusCommand2
});
function str2(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function requireToken(args) {
  var _a3;
  const token = (_a3 = str2(args["activation-token"])) != null ? _a3 : process.env.AOMI_DEPLOY_TOKEN;
  if (!token) {
    throw new DeployCliError(
      "VALIDATION_ERROR",
      "`--activation-token` is required. Pass it or set the AOMI_DEPLOY_TOKEN env var."
    );
  }
  return token;
}
function resolveBackendUrl(args) {
  var _a3, _b;
  return ((_b = (_a3 = str2(args["backend-url"])) != null ? _a3 : process.env.AOMI_BACKEND_URL) != null ? _b : "https://api.aomi.dev").replace(/\/+$/, "");
}
function resolvePlatform(args) {
  var _a3, _b;
  return (_b = (_a3 = str2(args.platform)) != null ? _a3 : process.env.AOMI_DEPLOY_PLATFORM) != null ? _b : "community";
}
async function fetchStatus(deploymentId, platform, activationToken, backendUrl) {
  const url = `${backendUrl}/api/platforms/${encodeURIComponent(platform)}/deployments/${encodeURIComponent(deploymentId)}/status`;
  let res;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${activationToken}`,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    throw new DeployCliError(
      "NETWORK_ERROR",
      "Cannot reach Aomi backend; check your connection"
    );
  }
  const text2 = await res.text();
  if (!res.ok) {
    const message = (() => {
      try {
        const json2 = JSON.parse(text2);
        if (json2 && typeof json2 === "object" && json2.error) return json2.error;
      } catch (e) {
      }
      return `${res.status} ${res.statusText}`;
    })();
    if (res.status === 401 || res.status === 403) {
      throw new DeployCliError("AUTH_FAILED", "Session expired; run `aomi account login`");
    }
    throw new DeployCliError("BACKEND_ERROR", message);
  }
  try {
    return JSON.parse(text2);
  } catch (e) {
    throw new DeployCliError("BACKEND_ERROR", "Backend returned invalid JSON.");
  }
}
function printStatus(status) {
  var _a3, _b;
  const CYAN2 = "\x1B[36m";
  const DIM2 = "\x1B[2m";
  const RESET2 = "\x1B[0m";
  console.log(`${CYAN2}State:${RESET2} ${status.state}`);
  if ((_a3 = status.ci) == null ? void 0 : _a3.url) {
    console.log(`${DIM2}CI:${RESET2}    ${status.ci.url}`);
  }
  if (status.deployment) {
    const platform = (_b = status.deployment) == null ? void 0 : _b.platform;
    if (platform == null ? void 0 : platform.pr_url) {
      console.log(`${DIM2}PR:${RESET2}    ${platform.pr_url}`);
    }
  }
  if (status.apps && status.apps.length > 0) {
    for (const app of status.apps) {
      const tag = app.releaseTag ? ` (${app.releaseTag})` : "";
      console.log(`${DIM2}App:${RESET2}   ${app.name}${tag}`);
    }
  } else if (status.releaseTags && status.releaseTags.length > 0) {
    for (const tag of status.releaseTags) {
      console.log(`${DIM2}Tag:${RESET2}   ${tag}`);
    }
  }
  if (status.message) {
    console.log(`${DIM2}Msg:${RESET2}   ${status.message}`);
  }
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function statusCommand2(args) {
  var _a3, _b, _c;
  const deploymentId = (_b = str2(args["deployment-id"])) != null ? _b : (_a3 = await readDeploymentState()) == null ? void 0 : _a3.deploymentId;
  if (!deploymentId) {
    throw new DeployCliError(
      "VALIDATION_ERROR",
      "No deployment ID found. Pass --deployment-id or run `aomi deploy` first."
    );
  }
  const activationToken = requireToken(args);
  const backendUrl = resolveBackendUrl(args);
  const platform = resolvePlatform(args);
  const watch = args.watch === true;
  if (!watch) {
    const status = await fetchStatus(deploymentId, platform, activationToken, backendUrl);
    printStatus(status);
    return;
  }
  const MAX_FAILURES = 8;
  const BASE_DELAY_MS = 3e3;
  const MAX_DELAY_MS = 3e4;
  let failures = 0;
  let lastCiUrl;
  while (true) {
    try {
      const status = await fetchStatus(deploymentId, platform, activationToken, backendUrl);
      if ((_c = status.ci) == null ? void 0 : _c.url) lastCiUrl = status.ci.url;
      printStatus(status);
      failures = 0;
      if (status.state === "ready") {
        process.exit(0);
        return;
      }
      if (status.state === "failed") {
        process.exit(1);
        return;
      }
      await sleep(BASE_DELAY_MS);
    } catch (err) {
      failures++;
      if (failures >= MAX_FAILURES) {
        const ciSuffix = lastCiUrl ? `; check CI status at ${lastCiUrl}` : "";
        throw new DeployCliError(
          "BACKEND_ERROR",
          `Deployment timed out after ${MAX_FAILURES} attempts${ciSuffix}`
        );
      }
      const backoffMs = Math.min(BASE_DELAY_MS * Math.pow(2, failures), MAX_DELAY_MS);
      await sleep(backoffMs);
    }
  }
}
var init_status = __esm({
  "src/cli/commands/status.ts"() {
    "use strict";
    init_errors();
    init_deployment_state();
  }
});

// src/cli/commands/activate.ts
var activate_exports = {};
__export(activate_exports, {
  activateCommand: () => activateCommand
});
function str3(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function requireToken2(args) {
  var _a3;
  const token = (_a3 = str3(args["activation-token"])) != null ? _a3 : process.env.AOMI_DEPLOY_TOKEN;
  if (!token) {
    throw new DeployCliError(
      "VALIDATION_ERROR",
      "`--activation-token` is required. Pass it or set the AOMI_DEPLOY_TOKEN env var."
    );
  }
  return token;
}
function resolveBackendUrl2(args) {
  var _a3, _b;
  return ((_b = (_a3 = str3(args["backend-url"])) != null ? _a3 : process.env.AOMI_BACKEND_URL) != null ? _b : "https://api.aomi.dev").replace(/\/+$/, "");
}
function resolvePlatform2(args) {
  var _a3, _b;
  return (_b = (_a3 = str3(args.platform)) != null ? _a3 : process.env.AOMI_DEPLOY_PLATFORM) != null ? _b : "community";
}
async function extractError(res) {
  try {
    const text2 = await res.text();
    const json2 = JSON.parse(text2);
    if (json2 && typeof json2 === "object" && json2.error) return json2.error;
    return text2 || `${res.status} ${res.statusText}`;
  } catch (e) {
    return `${res.status} ${res.statusText}`;
  }
}
async function activateCommand(args) {
  var _a3, _b, _c;
  const state = await readDeploymentState();
  const deploymentId = (_a3 = str3(args["deployment-id"])) != null ? _a3 : state == null ? void 0 : state.deploymentId;
  const releaseTagsRaw = str3(args["release-tags"]);
  const releaseTags = releaseTagsRaw !== void 0 ? releaseTagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : (_b = state == null ? void 0 : state.releaseTags) != null ? _b : [];
  if (!deploymentId || releaseTags.length === 0) {
    throw new DeployCliError(
      "VALIDATION_ERROR",
      "No deployment found. Run `aomi deploy` first, or pass --deployment-id and --release-tags."
    );
  }
  const activationToken = requireToken2(args);
  const backendUrl = resolveBackendUrl2(args);
  const platform = resolvePlatform2(args);
  const url = `${backendUrl}/api/platforms/${encodeURIComponent(platform)}/apps/activate`;
  const body = { target: { kind: "release_tags", value: releaseTags } };
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${activationToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
  } catch (err) {
    throw new DeployCliError(
      "NETWORK_ERROR",
      "Cannot reach Aomi backend; check your connection"
    );
  }
  if (!res.ok) {
    const msg = await extractError(res);
    const code = res.status === 401 || res.status === 403 ? "AUTH_FAILED" : "BACKEND_ERROR";
    if (code === "AUTH_FAILED") {
      throw new DeployCliError(code, "Session expired; run `aomi account login`");
    }
    throw new DeployCliError(code, msg);
  }
  const resultText = await res.text();
  const result = (() => {
    try {
      return JSON.parse(resultText);
    } catch (e) {
      return null;
    }
  })();
  const activation = result == null ? void 0 : result.activation;
  const apps = activation == null ? void 0 : activation.apps;
  if (apps) {
    const failures = apps.filter((a) => a.error);
    if (failures.length > 0) {
      console.log(" Activation completed with errors:");
      for (const f of failures) {
        console.log(`   ${(_c = f.name) != null ? _c : "?"}: ${f.error}`);
      }
    }
  }
  if (state) {
    await writeDeploymentState(__spreadProps(__spreadValues({}, state), { timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
  }
  console.log(" Activation succeeded.");
}
var init_activate = __esm({
  "src/cli/commands/activate.ts"() {
    "use strict";
    init_errors();
    init_deployment_state();
  }
});

// src/cli/commands/deploy.ts
var deploy_exports = {};
__export(deploy_exports, {
  deployCommand: () => deployCommand
});
import { execFileSync, execSync } from "child_process";
function str4(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function required2(value, flag, env) {
  if (value) return value;
  throw new DeployCliError(
    "VALIDATION_ERROR",
    `\`--${flag}\` is required. Pass it or set the ${env} env var.`
  );
}
function currentBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8"
    }).trim();
  } catch (e) {
    throw new DeployCliError(
      "NOT_A_GIT_REPO",
      "Run this from inside a git repository"
    );
  }
}
function resolveGitCommit(ref) {
  try {
    const commit = execFileSync(
      "git",
      ["rev-parse", "--verify", `${ref}^{commit}`],
      {
        encoding: "utf-8"
      }
    ).trim();
    if (!/^[0-9a-f]{7,40}$/i.test(commit)) {
      throw new Error(`unexpected git commit hash: ${commit}`);
    }
    return commit.toLowerCase();
  } catch (e) {
    throw new DeployCliError(
      "VALIDATION_ERROR",
      `Could not resolve \`${ref}\` to a git commit SHA.`
    );
  }
}
function checkGitRemote() {
  try {
    const remote = execSync("git remote", { encoding: "utf-8" }).trim();
    if (!remote) {
      throw new DeployCliError(
        "VALIDATION_ERROR",
        "No git remote found; push your code first"
      );
    }
  } catch (err) {
    if (err instanceof DeployCliError) throw err;
    throw new DeployCliError(
      "VALIDATION_ERROR",
      "No git remote found; push your code first"
    );
  }
}
async function deviceAuthFlow(backendUrl, platform) {
  var _a3, _b;
  console.log(
    "\n No activation token found. Starting browser-based GitHub auth...\n"
  );
  const beginRes = await fetch(`${backendUrl}/api/auth/cli/begin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform })
  });
  if (!beginRes.ok) {
    const text2 = await beginRes.text().catch(() => "");
    throw new DeployCliError(
      "BACKEND_ERROR",
      `Failed to start device auth: ${beginRes.status} ${text2}`
    );
  }
  const { device_code, verification_uri } = await beginRes.json();
  console.log(" \u2192 Open this URL in your browser to authenticate with GitHub:");
  console.log(`   ${verification_uri}
`);
  const { platform: os } = process;
  const openCmd = os === "darwin" ? "open" : os === "win32" ? "start" : "xdg-open";
  try {
    execSync(`${openCmd} "${verification_uri}"`, { stdio: "ignore" });
    console.log(" (Browser opened automatically.)\n");
  } catch (e) {
  }
  console.log(" Waiting for authorization...");
  const pollUrl = `${backendUrl}/api/auth/cli/status?device_code=${device_code}`;
  const start = Date.now();
  const timeoutMs = 6e5;
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 2e3));
    const statusRes = await fetch(pollUrl);
    if (!statusRes.ok) continue;
    const body = await statusRes.json();
    if (body.status === "complete" && body.activation_token) {
      console.log(` Authenticated as @${(_a3 = body.github_login) != null ? _a3 : "?"}
`);
      console.log(
        ` Tip: save your token to skip this step next time:
   export AOMI_DEPLOY_TOKEN="${body.activation_token}"
`
      );
      return {
        token: body.activation_token,
        githubLogin: (_b = body.github_login) != null ? _b : ""
      };
    }
    if (body.status === "expired") {
      throw new DeployCliError(
        "AUTH_FAILED",
        "Authorization session expired. Run `aomi deploy` again to retry."
      );
    }
  }
  throw new DeployCliError(
    "AUTH_TIMEOUT",
    "Authorization timed out after 10 minutes. Run `aomi deploy` again to retry."
  );
}
async function deployCommand(args) {
  var _a3, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
  const backendUrl = ((_b = (_a3 = str4(args["backend-url"])) != null ? _a3 : process.env.AOMI_BACKEND_URL) != null ? _b : "https://api.aomi.dev").replace(/\/+$/, "");
  const platform = (_d = (_c = str4(args.platform)) != null ? _c : process.env.AOMI_DEPLOY_PLATFORM) != null ? _d : "community";
  const activationToken = (_f = (_e = str4(args["activation-token"])) != null ? _e : process.env.AOMI_DEPLOY_TOKEN) != null ? _f : (await deviceAuthFlow(backendUrl, platform)).token;
  const projectId = Number(
    required2(
      (_g = str4(args["project-id"])) != null ? _g : process.env.AOMI_PROJECT_ID,
      "project-id",
      "AOMI_PROJECT_ID"
    )
  );
  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    throw new DeployCliError(
      "VALIDATION_ERROR",
      "`--project-id` must be a positive integer."
    );
  }
  const branch = str4(args.branch);
  const commit = str4(args.commit);
  if (branch && commit) {
    throw new DeployCliError(
      "VALIDATION_ERROR",
      "--commit and --branch are mutually exclusive. Provide one or neither."
    );
  }
  const selectedRef = (_h = commit != null ? commit : branch) != null ? _h : currentBranch();
  const sourceRef = resolveGitCommit(selectedRef);
  if (!commit && !branch) {
    checkGitRemote();
  }
  const preflight = args["preflight"] === true;
  console.log(` Deploying to ${backendUrl}`);
  console.log(`   project id:    ${projectId}`);
  if (branch) console.log(`   branch:        ${branch}`);
  console.log(`   commit:        ${sourceRef}`);
  if (preflight) console.log("   preflight:      yes");
  const url = `${backendUrl}/api/projects/${projectId}/deploy`;
  const body = {
    source_ref: sourceRef,
    preflight
  };
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${activationToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
  } catch (err) {
    throw new DeployCliError(
      "NETWORK_ERROR",
      "Cannot reach Aomi backend; check your connection"
    );
  }
  const text2 = await res.text();
  if (!res.ok) {
    const message = (() => {
      var _a4, _b2;
      try {
        const json2 = JSON.parse(text2);
        if (json2 && typeof json2 === "object")
          return (_b2 = (_a4 = json2.error) != null ? _a4 : json2.reason) != null ? _b2 : `${res.status} ${res.statusText}`;
      } catch (e) {
      }
      return `${res.status} ${res.statusText}`;
    })();
    if (res.status === 401 || res.status === 403) {
      throw new DeployCliError(
        "AUTH_FAILED",
        "Session expired; run `aomi account login`"
      );
    }
    throw new DeployCliError("BACKEND_ERROR", message);
  }
  let result;
  try {
    result = JSON.parse(text2);
  } catch (e) {
    throw new DeployCliError("BACKEND_ERROR", "Backend returned invalid JSON.");
  }
  const deployment = result.deployment;
  const platformInfo = deployment == null ? void 0 : deployment.platform;
  const sourceInfo = deployment == null ? void 0 : deployment.source;
  console.log();
  if (preflight) {
    console.log(" Preflight complete. Review the manifest below:");
    console.log(`   ${JSON.stringify(result, null, 2)}`);
    return;
  }
  console.log(` Deployment created: ${(_i = deployment == null ? void 0 : deployment.id) != null ? _i : "unknown"}`);
  console.log(`   status:  ${(_j = deployment == null ? void 0 : deployment.status) != null ? _j : "unknown"}`);
  if (sourceInfo == null ? void 0 : sourceInfo.repository_link) {
    console.log(`   source:  ${sourceInfo.repository_link}`);
  }
  if (platformInfo == null ? void 0 : platformInfo.pr_url) {
    console.log(`   PR:      ${platformInfo.pr_url}`);
  }
  if (platformInfo == null ? void 0 : platformInfo.ci_url) {
    console.log(`   CI:      ${platformInfo.ci_url}`);
  }
  const releaseTags = [];
  const apps = [];
  if (platformInfo == null ? void 0 : platformInfo.apps) {
    const appsArr = platformInfo.apps;
    for (const app of appsArr) {
      const name = String((_k = app.name) != null ? _k : "?");
      const tag = String((_m = (_l = app.release_tag) != null ? _l : app.releaseTag) != null ? _m : "");
      apps.push(name);
      if (tag) releaseTags.push(tag);
      console.log(`   app:     ${name}${tag ? ` (${tag})` : ""}`);
    }
  }
  if (platformInfo == null ? void 0 : platformInfo.commit_hash) {
    console.log(`   commit:  ${platformInfo.commit_hash}`);
  }
  const deploymentId = String((_n = deployment == null ? void 0 : deployment.id) != null ? _n : "");
  if (deploymentId) {
    const deployedPlatform = str4(platformInfo == null ? void 0 : platformInfo.platform);
    if (!deployedPlatform) {
      throw new DeployCliError(
        "BACKEND_ERROR",
        "Backend deployment response is missing its resolved platform."
      );
    }
    await writeDeploymentState({
      deploymentId,
      platform: deployedPlatform,
      projectId,
      releaseTags,
      apps,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}
var init_deploy = __esm({
  "src/cli/commands/deploy.ts"() {
    "use strict";
    init_errors();
    init_deployment_state();
  }
});

// src/cli/commands/pipeline.ts
var pipeline_exports = {};
__export(pipeline_exports, {
  parsePipelineArguments: () => parsePipelineArguments,
  pipelineAppCommand: () => pipelineAppCommand,
  pipelineAppsCommand: () => pipelineAppsCommand,
  pipelineCallCommand: () => pipelineCallCommand,
  pipelineRunCommand: () => pipelineRunCommand,
  pipelineSkillCommand: () => pipelineSkillCommand,
  pipelineSkillsCommand: () => pipelineSkillsCommand,
  pipelineToolCommand: () => pipelineToolCommand,
  pipelineToolsCommand: () => pipelineToolsCommand
});
async function pipelineAppsCommand(config, options) {
  const pipeline = createControlClient(config).pipeline;
  printJson(
    options.query ? await pipeline.searchApps({ q: options.query, limit: options.limit }) : await pipeline.listApps({ limit: options.limit })
  );
}
async function pipelineAppCommand(config, app) {
  printJson(await createControlClient(config).pipeline.getApp(app));
}
async function pipelineToolsCommand(config, options) {
  const pipeline = createControlClient(config).pipeline;
  printJson(
    options.query ? await pipeline.searchTools({
      q: options.query,
      app: options.app,
      limit: options.limit
    }) : await pipeline.listTools({
      app: options.app,
      namespace: options.namespace,
      limit: options.limit
    })
  );
}
async function pipelineToolCommand(config, toolId, app) {
  printJson(
    await createControlClient(config).pipeline.getTool(toolId, { app })
  );
}
async function pipelineSkillsCommand(config, limit2) {
  printJson(await createControlClient(config).pipeline.listSkills({ limit: limit2 }));
}
async function pipelineSkillCommand(config, skillId) {
  printJson(await createControlClient(config).pipeline.getSkill(skillId));
}
async function pipelineCallCommand(config, options) {
  var _a3, _b, _c;
  const result = await createControlClient(config, {
    payment: true,
    onPayment: printPaymentEvent
  }).pipeline.callTool(
    {
      sessionId: pipelineSessionId(options.sessionId),
      toolId: options.toolId,
      arguments: parseArguments(options.arguments),
      app: ((_a3 = options.app) == null ? void 0 : _a3.trim()) || "default",
      applicationId: pipelineApplicationId(options.applicationId),
      platform: ((_b = options.platform) == null ? void 0 : _b.trim()) || void 0,
      skills: (_c = options.skills) != null ? _c : []
    },
    { idempotencyKey: options.idempotencyKey }
  );
  printJson(result);
}
async function pipelineRunCommand(config, options) {
  var _a3, _b, _c;
  const result = await createControlClient(config, {
    payment: true,
    onPayment: printPaymentEvent
  }).pipeline.run(
    {
      sessionId: pipelineSessionId(options.sessionId),
      program: options.program,
      app: ((_a3 = options.app) == null ? void 0 : _a3.trim()) || "default",
      applicationId: pipelineApplicationId(options.applicationId),
      platform: ((_b = options.platform) == null ? void 0 : _b.trim()) || void 0,
      skills: (_c = options.skills) != null ? _c : []
    },
    { idempotencyKey: options.idempotencyKey }
  );
  printJson(result);
}
function pipelineSessionId(explicit) {
  var _a3;
  return (explicit == null ? void 0 : explicit.trim()) || ((_a3 = CliSession.load()) == null ? void 0 : _a3.sessionId) || crypto.randomUUID();
}
function parsePipelineArguments(input2) {
  if (!(input2 == null ? void 0 : input2.trim())) return {};
  const value = JSON.parse(input2);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("--arguments must be a JSON object");
  }
  return value;
}
function pipelineApplicationId(value) {
  if (!(value == null ? void 0 : value.trim())) return void 0;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new TypeError("--application-id must be a positive integer");
  }
  return parsed;
}
var parseArguments;
var init_pipeline = __esm({
  "src/cli/commands/pipeline.ts"() {
    "use strict";
    init_cli_session();
    init_context();
    init_output();
    parseArguments = parsePipelineArguments;
  }
});

// src/cli/commands/byok.ts
function parseByokKeyArg(input2) {
  const [providerPart, byokKeyPart] = input2.split(/:(.+)/, 2);
  const provider = providerPart == null ? void 0 : providerPart.trim().toLowerCase();
  const byokKey = byokKeyPart == null ? void 0 : byokKeyPart.trim();
  if (!provider || !byokKey) {
    fatal("Invalid format. Use: <provider>:<key> (e.g. anthropic:sk-ant-...)");
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
function str5(value) {
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
  const prompt = str5(args.prompt);
  const showTool = args["show-tool"] === true;
  const byokKey = str5(args["provider-key"]);
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
import { runCommand, runMain } from "citty";

// src/cli/root.ts
import { defineCommand as defineCommand15 } from "citty";

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
  meta: {
    name: "simulate",
    description: "Simulate a batch of pending transactions"
  },
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
      description: "Plain EOA execution (the default; local signing is always EOA)"
    },
    aa: {
      type: "boolean",
      description: "Request AA execution \u2014 errors: AA now runs in the backend lane"
    },
    "aa-provider": {
      type: "string",
      description: "AA provider preference synced to user_state: alchemy | pimlico"
    },
    "aa-mode": {
      type: "string",
      description: "AA mode preference synced to user_state: 4337 | 7702"
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
  meta: {
    name: "new",
    description: "Start a fresh session and make it active"
  },
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
    await resumeSessionCommand2(args.id);
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
    const { statusCommand: statusCommand3 } = await Promise.resolve().then(() => (init_control(), control_exports));
    await statusCommand3(buildCliConfig(args));
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
var sessionInterruptDef = defineCommand3({
  meta: { name: "interrupt", description: "Interrupt the active Agent turn" },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { interruptCommand: interruptCommand2 } = await Promise.resolve().then(() => (init_control(), control_exports));
    await interruptCommand2(buildCliConfig(args));
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
    interrupt: sessionInterruptDef,
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
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { currentAppCommand: currentAppCommand2 } = await Promise.resolve().then(() => (init_control(), control_exports));
    currentAppCommand2(buildCliConfig(args));
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
init_shared();
import { defineCommand as defineCommand6 } from "citty";
var chainListDef = defineCommand6({
  meta: { name: "list", description: "List supported chains" },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { chainsCommand: chainsCommand2 } = await Promise.resolve().then(() => (init_control(), control_exports));
    chainsCommand2(buildCliConfig(args));
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
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { currentChainCommand: currentChainCommand2 } = await Promise.resolve().then(() => (init_control(), control_exports));
    currentChainCommand2(buildCliConfig(args));
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
init_shared();
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
    },
    cluster: {
      type: "string",
      description: 'Solana cluster to persist with --solana: "mainnet-beta" (default), "devnet", or "testnet". Also accepts CAIP-2 form "solana:mainnet" etc.'
    }
  },
  async run({ args }) {
    var _a3;
    const solanaKey = args.solana;
    if (solanaKey) {
      const { parseSvmCluster: parseSvmCluster2 } = await Promise.resolve().then(() => (init_shared(), shared_exports));
      const { setSvmWalletCommand: setSvmWalletCommand2 } = await Promise.resolve().then(() => (init_preferences(), preferences_exports));
      setSvmWalletCommand2(
        solanaKey,
        parseSvmCluster2(args.cluster)
      );
      return;
    }
    if (args.cluster) {
      const { fatal: fatal2 } = await Promise.resolve().then(() => (init_errors(), errors_exports));
      fatal2("`--cluster` only applies with `--solana`.");
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
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { currentWalletCommand: currentWalletCommand2 } = await Promise.resolve().then(() => (init_control(), control_exports));
    currentWalletCommand2(buildCliConfig(args));
  }
});
var walletWhoamiDef = defineCommand7({
  meta: {
    name: "whoami",
    description: "Show the authenticated backend account"
  },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { accountWhoamiCommand: accountWhoamiCommand2 } = await Promise.resolve().then(() => (init_account(), account_exports));
    await accountWhoamiCommand2(buildCliConfig(args));
  }
});
var walletDef = defineCommand7({
  meta: { name: "wallet", description: "Wallet configuration" },
  subCommands: {
    set: walletSetDef,
    current: walletCurrentDef,
    whoami: walletWhoamiDef
  }
});

// src/cli/commands/defs/account.ts
init_shared();
import { defineCommand as defineCommand8 } from "citty";
var accountLoginDef = defineCommand8({
  meta: {
    name: "login",
    description: "Sign in to an Aomi account"
  },
  args: __spreadProps(__spreadValues({}, globalArgs), {
    provider: {
      type: "string",
      description: 'Browser auth provider ("privy" or "para")'
    },
    wallet: {
      type: "boolean",
      description: "Use native CLI SIWE with the configured EVM wallet"
    },
    solana: {
      type: "boolean",
      description: "Use native CLI SIWS with the configured Solana wallet"
    },
    "no-browser": {
      type: "boolean",
      description: "Do not open provider auth; use native CLI SIWE"
    },
    legacy: {
      type: "boolean",
      description: "Use the temporary legacy browser session login"
    }
  }),
  async run({ args }) {
    const { accountLoginCommand: accountLoginCommand2 } = await Promise.resolve().then(() => (init_account(), account_exports));
    await accountLoginCommand2(buildCliConfig(args), {
      provider: typeof args.provider === "string" ? args.provider : void 0,
      wallet: args.wallet === true,
      solana: args.solana === true,
      noBrowser: args["no-browser"] === true,
      legacy: args.legacy === true
    });
  }
});
var accountWhoamiDef = defineCommand8({
  meta: {
    name: "whoami",
    description: "Show the authenticated backend account"
  },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { accountWhoamiCommand: accountWhoamiCommand2 } = await Promise.resolve().then(() => (init_account(), account_exports));
    await accountWhoamiCommand2(buildCliConfig(args));
  }
});
var accountLogoutDef = defineCommand8({
  meta: {
    name: "logout",
    description: "Sign out and clear the CLI auth session"
  },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { logoutCommand: logoutCommand2 } = await Promise.resolve().then(() => (init_account(), account_exports));
    await logoutCommand2(buildCliConfig(args));
  }
});
var accountLinksDef = defineCommand8({
  meta: {
    name: "links",
    description: "List account login methods and linked wallets"
  },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { accountLinksCommand: accountLinksCommand2 } = await Promise.resolve().then(() => (init_account(), account_exports));
    await accountLinksCommand2(buildCliConfig(args));
  }
});
var accountLinkDef = defineCommand8({
  meta: {
    name: "link",
    description: "Link a wallet or provider login method to the account"
  },
  args: __spreadProps(__spreadValues({}, globalArgs), {
    provider: {
      type: "string",
      description: 'Provider login method to link ("privy" or "para")'
    },
    wallet: {
      type: "boolean",
      description: "Link an EVM wallet with SIWE (default)"
    },
    solana: {
      type: "boolean",
      description: "Link a Solana wallet with SIWS"
    },
    label: {
      type: "string",
      description: "Optional display label for the linked wallet"
    }
  }),
  async run({ args }) {
    const { accountLinkCommand: accountLinkCommand2 } = await Promise.resolve().then(() => (init_account(), account_exports));
    await accountLinkCommand2(buildCliConfig(args), {
      provider: typeof args.provider === "string" ? args.provider : void 0,
      wallet: args.wallet === true,
      solana: args.solana === true,
      label: typeof args.label === "string" ? args.label : void 0
    });
  }
});
var accountUnlinkDef = defineCommand8({
  meta: {
    name: "unlink",
    description: "Unlink an account login method or linked wallet"
  },
  args: __spreadProps(__spreadValues({}, globalArgs), {
    id: {
      type: "positional",
      description: "Link id, identity:<id>, or wallet:<id>",
      required: true
    },
    yes: {
      type: "boolean",
      description: "Confirm unlinking"
    }
  }),
  async run({ args }) {
    const { accountUnlinkCommand: accountUnlinkCommand2 } = await Promise.resolve().then(() => (init_account(), account_exports));
    await accountUnlinkCommand2(buildCliConfig(args), args.id, {
      yes: args.yes === true
    });
  }
});
var accountRenameDef = defineCommand8({
  meta: {
    name: "rename",
    description: "Rename an account login method or linked wallet"
  },
  args: __spreadProps(__spreadValues({}, globalArgs), {
    id: {
      type: "positional",
      description: "Link id, identity:<id>, or wallet:<id>",
      required: true
    },
    label: {
      type: "string",
      description: "Display label",
      required: true
    }
  }),
  async run({ args }) {
    const { accountRenameCommand: accountRenameCommand2 } = await Promise.resolve().then(() => (init_account(), account_exports));
    await accountRenameCommand2(buildCliConfig(args), args.id, {
      label: typeof args.label === "string" ? args.label : void 0
    });
  }
});
var accountUpdateDef = defineCommand8({
  meta: {
    name: "update",
    description: "Update the account profile"
  },
  args: __spreadProps(__spreadValues({}, globalArgs), {
    "display-name": {
      type: "string",
      description: "Display name"
    },
    "avatar-url": {
      type: "string",
      description: "Avatar URL"
    }
  }),
  async run({ args }) {
    const { accountUpdateCommand: accountUpdateCommand2 } = await Promise.resolve().then(() => (init_account(), account_exports));
    await accountUpdateCommand2(buildCliConfig(args), {
      displayName: typeof args["display-name"] === "string" ? args["display-name"] : void 0,
      avatarUrl: typeof args["avatar-url"] === "string" ? args["avatar-url"] : void 0
    });
  }
});
var accountDeleteDef = defineCommand8({
  meta: {
    name: "delete",
    description: "Delete the Aomi account"
  },
  args: __spreadProps(__spreadValues({}, globalArgs), {
    yes: {
      type: "boolean",
      description: "Confirm account deletion"
    }
  }),
  async run({ args }) {
    const { accountDeleteCommand: accountDeleteCommand2 } = await Promise.resolve().then(() => (init_account(), account_exports));
    await accountDeleteCommand2(buildCliConfig(args), {
      yes: args.yes === true
    });
  }
});
var accountSessionsDef = defineCommand8({
  meta: {
    name: "sessions",
    description: "List local CLI sessions for account switching"
  },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { accountSessionsCommand: accountSessionsCommand2 } = await Promise.resolve().then(() => (init_account(), account_exports));
    await accountSessionsCommand2(buildCliConfig(args));
  }
});
var accountSwitchDef = defineCommand8({
  meta: {
    name: "switch",
    description: "Switch the active local CLI session"
  },
  args: {
    id: {
      type: "positional",
      description: "Session ID or session-N",
      required: true
    }
  },
  async run({ args }) {
    const { accountSwitchCommand: accountSwitchCommand2 } = await Promise.resolve().then(() => (init_account(), account_exports));
    accountSwitchCommand2(args.id);
  }
});
var accountDef = defineCommand8({
  meta: { name: "account", description: "Account authentication" },
  subCommands: {
    login: accountLoginDef,
    whoami: accountWhoamiDef,
    logout: accountLogoutDef,
    links: accountLinksDef,
    link: accountLinkDef,
    unlink: accountUnlinkDef,
    rename: accountRenameDef,
    update: accountUpdateDef,
    delete: accountDeleteDef,
    sessions: accountSessionsDef,
    switch: accountSwitchDef
  }
});

// src/cli/commands/defs/config.ts
import { defineCommand as defineCommand9 } from "citty";
var configSetBackendDef = defineCommand9({
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
var configCurrentDef = defineCommand9({
  meta: { name: "current", description: "Show the configured backend URL" },
  args: {},
  async run() {
    const { currentBackendCommand: currentBackendCommand2 } = await Promise.resolve().then(() => (init_control(), control_exports));
    currentBackendCommand2();
  }
});
var configDef = defineCommand9({
  meta: { name: "config", description: "CLI configuration" },
  subCommands: {
    "set-backend": configSetBackendDef,
    current: configCurrentDef
  }
});

// src/cli/commands/defs/secret.ts
init_errors();
init_shared();
import { defineCommand as defineCommand10 } from "citty";
var secretListDef = defineCommand10({
  meta: { name: "list", description: "List configured secrets for the active session" },
  args: {},
  async run() {
    const { listSecretsCommand: listSecretsCommand2 } = await Promise.resolve().then(() => (init_secrets(), secrets_exports));
    listSecretsCommand2();
  }
});
var secretClearDef = defineCommand10({
  meta: { name: "clear", description: "Clear all secrets for the active session" },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { clearSecretsCommand: clearSecretsCommand2 } = await Promise.resolve().then(() => (init_secrets(), secrets_exports));
    await clearSecretsCommand2(buildCliConfig(args));
  }
});
var secretAddDef = defineCommand10({
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
var secretDef = defineCommand10({
  meta: { name: "secret", description: "Secret management" },
  subCommands: {
    list: secretListDef,
    clear: secretClearDef,
    add: secretAddDef
  }
});

// src/cli/commands/defs/deploy.ts
import { defineCommand as defineCommand13 } from "citty";

// src/cli/commands/defs/status.ts
import { defineCommand as defineCommand11 } from "citty";
var statusDef = defineCommand11({
  meta: {
    name: "status",
    description: "Show current deployment status"
  },
  args: {
    "deployment-id": {
      type: "string",
      description: "Deployment ID (reads .aomi/deployment.json if absent)"
    },
    watch: {
      type: "boolean",
      description: "Poll until a terminal state is reached"
    },
    "activation-token": {
      type: "string",
      description: "Platform activation token (or set AOMI_DEPLOY_TOKEN env)"
    },
    "backend-url": {
      type: "string",
      description: "Backend URL (default: https://api.aomi.dev)"
    },
    platform: {
      type: "string",
      description: "Deploy platform (default: community; or set AOMI_DEPLOY_PLATFORM env)"
    }
  },
  async run({ args }) {
    const { statusCommand: statusCommand3 } = await Promise.resolve().then(() => (init_status(), status_exports));
    await statusCommand3(args);
  }
});

// src/cli/commands/defs/activate.ts
import { defineCommand as defineCommand12 } from "citty";
var activateDef = defineCommand12({
  meta: {
    name: "activate",
    description: "Activate a deployment by promoting release tags"
  },
  args: {
    "deployment-id": {
      type: "string",
      description: "Deployment ID (reads .aomi/deployment.json if absent)"
    },
    "release-tags": {
      type: "string",
      description: "Comma-separated release tags to activate (reads .aomi/deployment.json if absent)"
    },
    "activation-token": {
      type: "string",
      description: "Platform activation token (or set AOMI_DEPLOY_TOKEN env)"
    },
    "backend-url": {
      type: "string",
      description: "Backend URL (default: https://api.aomi.dev)"
    },
    platform: {
      type: "string",
      description: "Deploy platform (default: community; or set AOMI_DEPLOY_PLATFORM env)"
    }
  },
  async run({ args }) {
    const { activateCommand: activateCommand2 } = await Promise.resolve().then(() => (init_activate(), activate_exports));
    await activateCommand2(args);
  }
});

// src/cli/commands/defs/deploy.ts
var deployDef = defineCommand13({
  meta: {
    name: "deploy",
    description: "Deploy your app to the Aomi platform"
  },
  args: {
    "backend-url": {
      type: "string",
      description: "Backend URL (default: https://api.aomi.dev)"
    },
    "activation-token": {
      type: "string",
      description: "Platform activation token (required; or set AOMI_DEPLOY_TOKEN env)"
    },
    "project-id": {
      type: "string",
      description: "Backend project ID (required; or set AOMI_PROJECT_ID env)"
    },
    preflight: {
      type: "boolean",
      description: "Preview the deployment manifest without applying it"
    },
    branch: {
      type: "string",
      description: "Git branch to deploy (default: current branch via git rev-parse)"
    },
    commit: {
      type: "string",
      description: "Deploy a specific commit SHA instead of a branch tip"
    },
    platform: {
      type: "string",
      description: "Authentication platform for browser login (the Project determines the deployment platform)"
    }
  },
  async run({ args }) {
    const { deployCommand: deployCommand2 } = await Promise.resolve().then(() => (init_deploy(), deploy_exports));
    await deployCommand2(args);
  },
  subCommands: {
    status: statusDef,
    activate: activateDef
  }
});

// src/cli/commands/defs/pipeline.ts
init_shared();
import { defineCommand as defineCommand14 } from "citty";
var discoveryArgs = __spreadProps(__spreadValues({}, globalArgs), {
  query: { type: "string", alias: "q", description: "Ranked search query" },
  limit: { type: "string", description: "Maximum results (server-bounded)" }
});
var pipelineAppsDef = defineCommand14({
  meta: { name: "apps", description: "List or search Pipeline apps" },
  args: discoveryArgs,
  async run({ args }) {
    const { pipelineAppsCommand: pipelineAppsCommand2 } = await Promise.resolve().then(() => (init_pipeline(), pipeline_exports));
    await pipelineAppsCommand2(buildCliConfig(args), {
      query: text(args.query),
      limit: limit(args.limit)
    });
  }
});
var pipelineAppDef = defineCommand14({
  meta: { name: "app", description: "Describe one Pipeline app" },
  args: __spreadProps(__spreadValues({}, globalArgs), {
    appName: {
      type: "positional",
      description: "App name",
      required: true
    }
  }),
  async run({ args }) {
    const { pipelineAppCommand: pipelineAppCommand2 } = await Promise.resolve().then(() => (init_pipeline(), pipeline_exports));
    await pipelineAppCommand2(buildCliConfig(args), getPositionals(args)[0]);
  }
});
var pipelineToolsDef = defineCommand14({
  meta: { name: "tools", description: "List or search Pipeline tools" },
  args: __spreadProps(__spreadValues({}, discoveryArgs), {
    namespace: { type: "string", description: "Namespace filter" }
  }),
  async run({ args }) {
    const { pipelineToolsCommand: pipelineToolsCommand2 } = await Promise.resolve().then(() => (init_pipeline(), pipeline_exports));
    const config = buildCliConfig(args);
    await pipelineToolsCommand2(config, {
      query: text(args.query),
      app: config.app,
      namespace: text(args.namespace),
      limit: limit(args.limit)
    });
  }
});
var pipelineToolDef = defineCommand14({
  meta: { name: "tool", description: "Describe one Pipeline tool" },
  args: __spreadProps(__spreadValues({}, globalArgs), {
    toolId: {
      type: "positional",
      description: "Tool id",
      required: true
    }
  }),
  async run({ args }) {
    const { pipelineToolCommand: pipelineToolCommand2 } = await Promise.resolve().then(() => (init_pipeline(), pipeline_exports));
    const config = buildCliConfig(args);
    await pipelineToolCommand2(config, getPositionals(args)[0], config.app);
  }
});
var pipelineSkillsDef = defineCommand14({
  meta: { name: "skills", description: "List Pipeline skills" },
  args: discoveryArgs,
  async run({ args }) {
    const { pipelineSkillsCommand: pipelineSkillsCommand2 } = await Promise.resolve().then(() => (init_pipeline(), pipeline_exports));
    await pipelineSkillsCommand2(buildCliConfig(args), limit(args.limit));
  }
});
var pipelineSkillDef = defineCommand14({
  meta: { name: "skill", description: "Describe one Pipeline skill" },
  args: __spreadProps(__spreadValues({}, globalArgs), {
    skillId: {
      type: "positional",
      description: "Skill id",
      required: true
    }
  }),
  async run({ args }) {
    const { pipelineSkillCommand: pipelineSkillCommand2 } = await Promise.resolve().then(() => (init_pipeline(), pipeline_exports));
    await pipelineSkillCommand2(buildCliConfig(args), getPositionals(args)[0]);
  }
});
var executionArgs = __spreadProps(__spreadValues({}, globalArgs), {
  session: {
    type: "string",
    description: "Pipeline session id (defaults to the active CLI session)"
  },
  skills: {
    type: "string",
    description: "Comma-separated Pipeline skill ids to activate"
  },
  "idempotency-key": {
    type: "string",
    description: "Stable key for this logical execution; reuse it for a manual retry",
    required: true
  }
});
var pipelineCallDef = defineCommand14({
  meta: {
    name: "call",
    description: "Call a builtin public Pipeline tool through backend policy gates"
  },
  args: __spreadProps(__spreadValues({}, executionArgs), {
    toolId: {
      type: "positional",
      description: "Tool id",
      required: true
    },
    arguments: {
      type: "string",
      description: "Tool arguments as a JSON object"
    }
  }),
  async run({ args }) {
    const { pipelineCallCommand: pipelineCallCommand2 } = await Promise.resolve().then(() => (init_pipeline(), pipeline_exports));
    const config = buildCliConfig(args);
    await pipelineCallCommand2(config, {
      toolId: getPositionals(args)[0],
      sessionId: text(args.session),
      arguments: text(args.arguments),
      app: config.app,
      applicationId: config.applicationId,
      platform: config.appPlatform,
      skills: list(args.skills),
      idempotencyKey: text(args["idempotency-key"])
    });
  }
});
var pipelineRunDef = defineCommand14({
  meta: {
    name: "run",
    description: "Run a builtin public Pipeline program through backend policy gates"
  },
  args: __spreadProps(__spreadValues({}, executionArgs), {
    program: {
      type: "string",
      description: "Pipeline program in the MCP aomi_run grammar",
      required: true
    }
  }),
  async run({ args }) {
    const { pipelineRunCommand: pipelineRunCommand2 } = await Promise.resolve().then(() => (init_pipeline(), pipeline_exports));
    const config = buildCliConfig(args);
    await pipelineRunCommand2(config, {
      sessionId: text(args.session),
      program: text(args.program),
      app: config.app,
      applicationId: config.applicationId,
      platform: config.appPlatform,
      skills: list(args.skills),
      idempotencyKey: text(args["idempotency-key"])
    });
  }
});
var pipelineDef = defineCommand14({
  meta: {
    name: "pipeline",
    description: "Pipeline discovery and builtin policy-gated execution"
  },
  subCommands: {
    apps: pipelineAppsDef,
    app: pipelineAppDef,
    tools: pipelineToolsDef,
    tool: pipelineToolDef,
    skills: pipelineSkillsDef,
    skill: pipelineSkillDef,
    call: pipelineCallDef,
    run: pipelineRunDef
  }
});
function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function limit(value) {
  const parsed = Number(text(value));
  return Number.isFinite(parsed) ? parsed : void 0;
}
function list(value) {
  const raw = text(value);
  if (!raw) return void 0;
  const values = raw.split(",").map((item) => item.trim()).filter(Boolean);
  return values.length ? values : void 0;
}

// src/cli/root.ts
init_shared();

// package.json
var package_default = {
  name: "@aomi-labs/client",
  version: "0.6.6",
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
    "clean:dist": "rm -rf dist",
    typecheck: "tsc --project tsconfig.typecheck.json"
  },
  devDependencies: {
    "fast-check": "^4.8.0"
  },
  dependencies: {
    "@solana/web3.js": "^1.98.4",
    "@x402/core": "^2.10.0",
    "@x402/evm": "^2.10.0",
    "@x402/fetch": "^2.10.0",
    bs58: "^6.0.0",
    citty: "^0.2.2",
    tweetnacl: "^1.0.3",
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
  "account",
  "logout",
  "config",
  "secret",
  "deploy",
  "pipeline"
]);
function hasRootSubcommand(rawArgs) {
  return rawArgs.some((arg) => SUBCOMMAND_NAMES.has(arg));
}
var logoutDef = defineCommand15({
  meta: {
    name: "logout",
    description: "Sign out and clear the CLI auth session"
  },
  args: __spreadValues({}, globalArgs),
  async run({ args }) {
    const { logoutCommand: logoutCommand2 } = await Promise.resolve().then(() => (init_account(), account_exports));
    await logoutCommand2(buildCliConfig(args));
  }
});
var root = defineCommand15({
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
    if (hasRootSubcommand(rawArgs)) {
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
    account: accountDef,
    logout: logoutDef,
    config: configDef,
    secret: secretDef,
    deploy: deployDef,
    pipeline: pipelineDef
  }
});

// src/cli/main.ts
init_errors();
var ROOT_SUBCOMMANDS = SUBCOMMAND_NAMES;
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
  console.log(
    `CLI client for Aomi on-chain agent (aomi v${package_default.version})`
  );
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
  console.log(
    "  --account-bearer <token>     Aomi account bearer for authenticated requests"
  );
  console.log(
    "  --json                       Print machine-readable JSON where supported"
  );
  console.log("  --verbose                    Show extra diagnostics");
  console.log("  --app <name>                 Active app");
  console.log("  --application-id <id>        Hosted app discovery identity");
  console.log("  --platform <name>            Hosted app discovery platform");
  console.log("  --model <rig>                Active model");
  console.log("  --new-session                Create a fresh active session");
  console.log(
    "  --chain <id>                 Active chain for chat/session context"
  );
  console.log("  --public-key <address>       Wallet address for chat context");
  console.log("  --private-key <hex>          Signing key for EVM tx sign");
  console.log(
    "  --payment-method <method>    Paid Agent/Pipeline rail, e.g. coinbase/x402"
  );
  console.log(
    "  --solana-private-key <key>   Solana keypair (base58 or JSON byte array)"
  );
  console.log("  --rpc-url <url>              RPC URL for signing");
  console.log("  -p, --prompt <prompt>        Send a single prompt and exit");
  console.log(
    "  --show-tool                  Show tool output in root prompt/REPL mode"
  );
  console.log("  --provider-key <provider:key>");
  console.log(
    "                               Save a BYOK provider key before running"
  );
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
  console.log(
    "  account                      Account login and link management"
  );
  console.log(
    "  logout                       Sign out and clear the CLI auth session"
  );
  console.log("  config                       CLI configuration");
  console.log("  secret                       Secret management");
  console.log(
    "  deploy                       Deploy your app (also: deploy status, deploy activate)"
  );
  console.log(
    "  pipeline                     Pipeline discovery and policy-gated execution"
  );
  console.log("");
  console.log("Use aomi <command> --help for command-specific details.");
  console.log("");
  console.log(
    "Deprecated compatibility flags: --embedded-provider, --embedded-provider-token"
  );
}
async function runCli(argv = process.argv) {
  const strictExit = process.env.AOMI_CLI_STRICT_EXIT === "1";
  const rawArgs = argv.slice(2);
  try {
    if (shouldPrintRootHelp(rawArgs)) {
      printRootHelp();
      return;
    }
    if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
      await runMain(root, { rawArgs });
      return;
    }
    if (rawArgs.length === 1 && (rawArgs[0] === "--version" || rawArgs[0] === "-v")) {
      await runMain(root, { rawArgs });
      return;
    }
    await runCommand(root, { rawArgs });
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
    if (err instanceof DeployCliError) {
      console.error(`${RED}\u274C [${err.errorCode}] ${err.message}${RESET2}`);
      process.exit(1);
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${RED}\u274C ${message}${RESET2}`);
    process.exit(1);
  }
}

// src/cli.ts
void runCli();
