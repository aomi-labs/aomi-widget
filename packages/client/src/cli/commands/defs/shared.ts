import type { ArgsDef } from "citty";
import { privateKeyToAccount } from "viem/accounts";
import type { CliConfig, CliExecutionMode } from "../../types";
import { fatal } from "../../errors";
import { parseChainId, normalizePrivateKey, parseAAProvider, parseAAMode } from "../../validation";

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

function derivePublicKeyFromPrivateKey(privateKey: string | undefined): string | undefined {
  if (!privateKey) return undefined;

  try {
    return privateKeyToAccount(privateKey as `0x${string}`).address;
  } catch {
    fatal("Invalid private key. Pass a 32-byte hex key via `--private-key` or `PRIVATE_KEY`.");
  }
}

function resolveExecution(args: Record<string, unknown>): CliExecutionMode | undefined {
  const flagAA = args.aa === true;
  const flagEoa = args.eoa === true;
  if (flagAA && flagEoa) {
    fatal("Choose only one of `--aa` or `--eoa`.");
  }
  if (flagEoa) return "eoa";
  if (flagAA || str(args["aa-provider"]) !== undefined || str(args["aa-mode"]) !== undefined) {
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
    str(args["public-key"]) ??
    process.env.AOMI_PUBLIC_KEY;
  const derivedPublicKey = derivePublicKeyFromPrivateKey(privateKey);

  if (
    configuredPublicKey &&
    derivedPublicKey &&
    configuredPublicKey.toLowerCase() !== derivedPublicKey.toLowerCase()
  ) {
    fatal("`--public-key` does not match the address derived from `--private-key`.");
  }

  const aaProvider = parseAAProvider(
    str(args["aa-provider"]) ?? process.env.AOMI_AA_PROVIDER,
  );
  const aaMode = parseAAMode(
    str(args["aa-mode"]) ?? process.env.AOMI_AA_MODE,
  );

  if (execution === "eoa" && (aaProvider || aaMode)) {
    fatal("`--aa-provider` and `--aa-mode` cannot be used with `--eoa`.");
  }

  return {
    baseUrl:
      str(args["backend-url"]) ??
      process.env.AOMI_BACKEND_URL ??
      "https://api.aomi.dev",
    apiKey:
      str(args["api-key"]) ??
      process.env.AOMI_API_KEY,
    app:
      str(args.app) ??
      process.env.AOMI_APP ??
      "default",
    model:
      str(args.model) ??
      process.env.AOMI_MODEL,
    freshSession: args["new-session"] === true,
    publicKey: configuredPublicKey ?? derivedPublicKey,
    privateKey,
    chainRpcUrl:
      str(args["rpc-url"]) ??
      process.env.CHAIN_RPC_URL,
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
  return positionals.filter((value): value is string => typeof value === "string");
}
