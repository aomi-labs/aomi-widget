import type { ArgsDef } from "citty";
import { privateKeyToAccount } from "viem/accounts";
import type { CliConfig, CliExecutionMode } from "../../types";
import type { AomiPaymentMethod } from "../../../types";
import { fatal } from "../../errors";
import {
  parseChainId,
  normalizePrivateKey,
  parseAAProvider,
  parseAAMode,
} from "../../validation";

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
  "payment-method": {
    type: "string",
    description: "Payment method: auto, null, byok, mpp/tempo, x402/coinbase",
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

function arg(
  args: Record<string, unknown>,
  kebabKey: string,
  camelKey?: string,
): string | undefined {
  return str(args[kebabKey]) ?? (camelKey ? str(args[camelKey]) : undefined);
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

function parsePaymentMethod(
  value: string | undefined,
): AomiPaymentMethod | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "auto") {
    return null;
  }

  if (
    normalized === "null" ||
    normalized === "byok" ||
    normalized === "tempo" ||
    normalized === "coinbase"
  ) {
    return normalized;
  }

  if (normalized === "mpp") {
    return "tempo";
  }

  if (normalized === "x402") {
    return "coinbase";
  }

  fatal(
    "Invalid payment method. Use auto, null, byok, mpp/tempo, or x402/coinbase.",
  );
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
    arg(args, "private-key", "privateKey") ?? process.env.PRIVATE_KEY,
  );
  const configuredPublicKey =
    arg(args, "public-key", "publicKey") ?? process.env.AOMI_PUBLIC_KEY;
  const derivedPublicKey = derivePublicKeyFromPrivateKey(privateKey);

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
    arg(args, "aa-provider", "aaProvider") ?? process.env.AOMI_AA_PROVIDER,
  );
  const aaMode = parseAAMode(
    arg(args, "aa-mode", "aaMode") ?? process.env.AOMI_AA_MODE,
  );

  if (execution === "eoa" && (aaProvider || aaMode)) {
    fatal("`--aa-provider` and `--aa-mode` cannot be used with `--eoa`.");
  }

  const solanaPrivateKey =
    str(args["solana-private-key"]) ?? process.env.SOLANA_PRIVATE_KEY;

  return {
    baseUrl: arg(args, "backend-url", "backendUrl") ?? process.env.AOMI_BACKEND_URL,
    apiKey: arg(args, "api-key", "apiKey") ?? process.env.AOMI_API_KEY,
    app: arg(args, "app", "app") ?? process.env.AOMI_APP,
    model: arg(args, "model", "model") ?? process.env.AOMI_MODEL,
    paymentMethod: parsePaymentMethod(
      arg(args, "payment-method", "paymentMethod") ??
        str(process.env.AOMI_PAYMENT_METHOD),
    ),
    freshSession: args["new-session"] === true,
    publicKey: configuredPublicKey ?? derivedPublicKey,
    privateKey,
    solanaPrivateKey,
    chainRpcUrl: arg(args, "rpc-url", "rpcUrl") ?? process.env.CHAIN_RPC_URL,
    chain: parseChainId(arg(args, "chain", "chain") ?? process.env.AOMI_CHAIN_ID),
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
