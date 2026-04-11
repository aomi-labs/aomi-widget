import type { ArgsDef } from "citty";
import type { CliRuntime } from "../../types";
import { getConfig, parseArgs } from "../../args";

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
  secret: {
    type: "string",
    description: "Ingest a secret (NAME=value)",
  },
} satisfies ArgsDef;

/**
 * Bridge: convert citty parsed args back into CliRuntime.
 *
 * During the migration, command handlers still expect `CliRuntime`.
 * This adapter re-creates a CliRuntime from the raw process.argv so
 * that all existing logic (env var fallbacks, flag validation) is
 * preserved unchanged.
 */
export function toCliRuntime(argv: string[] = process.argv): CliRuntime {
  const parsed = parseArgs(argv);
  return {
    parsed,
    config: getConfig(parsed),
  };
}
