import type { ArgsDef } from "citty";
import { privateKeyToAccount } from "viem/accounts";
import type {
  CliEmbeddedProvider,
  CliConfig,
  CliExecutionMode,
} from "../../types";
import { fatal } from "../../errors";
import {
  parseChainId,
  normalizePrivateKey,
  parseAAProvider,
  parseAAMode,
} from "../../validation";

type SvmCluster = NonNullable<CliConfig["svmCluster"]>;

function parseEmbeddedProvider(
  raw: string | undefined,
): CliEmbeddedProvider | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "para" || normalized === "privy") {
    return normalized;
  }
  fatal(`Unknown --embedded-provider value "${raw}". Use "para" or "privy".`);
}

/**
 * Normalise the user-facing --cluster value to the CAIP-2 form the backend
 * expects.  Accepts both the friendly short form ("mainnet-beta", "devnet",
 * "testnet") and the canonical CAIP-2 form ("solana:mainnet", etc.).
 */
function parseSvmCluster(raw: string | undefined): SvmCluster | undefined {
  if (!raw) return undefined;
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
        `Unknown --cluster value "${raw}". Use "mainnet-beta", "devnet", or "testnet".`,
      );
  }
}

/**
 * Global flags shared across all commands.
 * Defined here so every subcommand inherits them.
 */
export const globalArgs = {
  "backend-url": {
    type: "string",
    description: "Backend URL (default: https://api.aomi.dev)",
  },
  "api-key": {
    type: "string",
    description: "API key for non-default apps",
  },
  "account-bearer": {
    type: "string",
    description: "Aomi account bearer for authenticated REST/SSE requests",
  },
  "embedded-provider": {
    type: "string",
    description:
      'Deprecated legacy provider exchange config ("para" or "privy")',
  },
  "embedded-provider-token": {
    type: "string",
    description: "Deprecated legacy provider token; use --account-bearer",
  },
  app: {
    type: "string",
    description: 'App (default: "default")',
  },
  model: {
    type: "string",
    description: "Set the active model for this session",
  },
  "new-session": {
    type: "boolean",
    description: "Create a fresh active session for this command",
  },
  chain: {
    type: "string",
    description: "Active chain for chat/session context",
  },
  "public-key": {
    type: "string",
    description: "Wallet address (so the agent knows your wallet)",
  },
  "private-key": {
    type: "string",
    description: "Hex private key for signing",
  },
  "solana-private-key": {
    type: "string",
    description:
      "Solana keypair secret (base58 secret key, or JSON byte array) for signing solana_sign requests",
  },
  cluster: {
    type: "string",
    description:
      'Solana cluster override: "mainnet-beta" (default), "devnet", or "testnet". ' +
      'Also accepts CAIP-2 form "solana:mainnet" / "solana:devnet" / "solana:testnet".',
  },
  "rpc-url": {
    type: "string",
    description: "RPC URL for transaction submission",
  },
} satisfies ArgsDef;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function derivePublicKeyFromPrivateKey(
  privateKey: string | undefined,
): string | undefined {
  if (!privateKey) return undefined;

  try {
    return privateKeyToAccount(privateKey as `0x${string}`).address;
  } catch {
    fatal(
      "Invalid private key. Pass a 32-byte hex key via `--private-key` or `PRIVATE_KEY`.",
    );
  }
}

function resolveExecution(
  args: Record<string, unknown>,
): CliExecutionMode | undefined {
  const flagAA = args.aa === true;
  const flagEoa = args.eoa === true;
  if (flagAA && flagEoa) {
    fatal("Choose only one of `--aa` or `--eoa`.");
  }
  if (flagEoa) return "eoa";
  if (
    flagAA ||
    str(args["aa-provider"]) !== undefined ||
    str(args["aa-mode"]) !== undefined
  ) {
    return "aa";
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Config builder — replaces parseArgs() + getConfig()
// ---------------------------------------------------------------------------

/**
 * Build a CliConfig directly from citty's typed args + env vars.
 *
 * This is the single source of truth for CLI configuration.
 * No re-parsing of process.argv.
 */
export function buildCliConfig(args: Record<string, unknown>): CliConfig {
  const execution = resolveExecution(args);
  const privateKey = normalizePrivateKey(
    str(args["private-key"]) ?? process.env.PRIVATE_KEY,
  );
  const configuredPublicKey =
    str(args["public-key"]) ?? process.env.AOMI_PUBLIC_KEY;
  const derivedPublicKey = derivePublicKeyFromPrivateKey(privateKey);
  const accountBearer =
    str(args["account-bearer"]) ?? process.env.AOMI_ACCOUNT_BEARER;
  const embeddedProvider = parseEmbeddedProvider(
    str(args["embedded-provider"]) ?? process.env.AOMI_EMBEDDED_PROVIDER,
  );
  const embeddedProviderToken =
    str(args["embedded-provider-token"]) ??
    process.env.AOMI_EMBEDDED_PROVIDER_TOKEN;

  if (
    configuredPublicKey &&
    derivedPublicKey &&
    configuredPublicKey.toLowerCase() !== derivedPublicKey.toLowerCase()
  ) {
    fatal(
      "`--public-key` does not match the address derived from `--private-key`.",
    );
  }

  const aaProvider = parseAAProvider(
    str(args["aa-provider"]) ?? process.env.AOMI_AA_PROVIDER,
  );
  const aaMode = parseAAMode(str(args["aa-mode"]) ?? process.env.AOMI_AA_MODE);

  if (execution === "eoa" && (aaProvider || aaMode)) {
    fatal("`--aa-provider` and `--aa-mode` cannot be used with `--eoa`.");
  }
  if (accountBearer && (embeddedProvider || embeddedProviderToken)) {
    fatal(
      "Choose either `--account-bearer` or the `--embedded-provider` + `--embedded-provider-token` pair.",
    );
  }
  if (embeddedProvider && !embeddedProviderToken) {
    fatal(
      "`--embedded-provider-token` is required when `--embedded-provider` is set.",
    );
  }
  if (embeddedProviderToken && !embeddedProvider) {
    fatal(
      "`--embedded-provider` is required when `--embedded-provider-token` is set.",
    );
  }

  const solanaPrivateKey =
    str(args["solana-private-key"]) ?? process.env.SOLANA_PRIVATE_KEY;

  const svmCluster = parseSvmCluster(
    str(args.cluster) ?? process.env.AOMI_SOLANA_CLUSTER,
  );

  return {
    baseUrl: str(args["backend-url"]) ?? process.env.AOMI_BACKEND_URL,
    apiKey: str(args["api-key"]) ?? process.env.AOMI_API_KEY,
    accountBearer,
    embeddedProvider,
    embeddedProviderToken,
    app: str(args.app) ?? process.env.AOMI_APP,
    model: str(args.model) ?? process.env.AOMI_MODEL,
    freshSession: args["new-session"] === true,
    publicKey: configuredPublicKey ?? derivedPublicKey,
    privateKey,
    solanaPrivateKey,
    svmCluster,
    chainRpcUrl: str(args["rpc-url"]) ?? process.env.CHAIN_RPC_URL,
    chain: parseChainId(str(args.chain) ?? process.env.AOMI_CHAIN_ID),
    secrets: {},
    execution,
    aaProvider,
    aaMode,
  };
}

// ---------------------------------------------------------------------------
// Positional extraction
// ---------------------------------------------------------------------------

/**
 * Read the positional arguments already parsed by citty for the current
 * command context.
 */
export function getPositionals(args: Record<string, unknown>): string[] {
  const positionals = args._;
  if (!Array.isArray(positionals)) {
    return [];
  }
  return positionals.filter(
    (value): value is string => typeof value === "string",
  );
}
