import type {
  CliAAProvider,
  CliAAMode,
  CliConfig,
  CliExecutionMode,
  CliRuntime,
  ParsedArgs,
} from "./types";
import { fatal } from "./errors";

export const SUPPORTED_CHAIN_IDS = [1, 137, 42161, 8453, 10, 11155111] as const;

export const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  137: "Polygon",
  42161: "Arbitrum One",
  8453: "Base",
  10: "Optimism",
  11155111: "Sepolia",
};

function parseChainId(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return undefined;
  if (!(SUPPORTED_CHAIN_IDS as readonly number[]).includes(n)) {
    const list = SUPPORTED_CHAIN_IDS.map(
      (id) => `  ${id} (${CHAIN_NAMES[id]})`,
    ).join("\n");
    fatal(`Unsupported chain ID: ${n}\nSupported chains:\n${list}`);
  }
  return n;
}

function resolveExecutionMode(flags: Record<string, string>): CliExecutionMode {
  const flagAA = flags["aa"] === "true";
  const flagEoa = flags["eoa"] === "true";
  const hasAASelection =
    flags["aa-provider"] !== undefined || flags["aa-mode"] !== undefined;
  if (flagAA && flagEoa) {
    fatal("Choose only one of `--aa` or `--eoa`.");
  }

  if (flagAA) return "aa";
  if (flagEoa) return "eoa";
  if (hasAASelection) return "aa";

  return "auto";
}

function parseAAProvider(value: string | undefined): CliAAProvider | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  if (value === "alchemy" || value === "pimlico") {
    return value;
  }
  fatal("Unsupported AA provider. Use `alchemy` or `pimlico`.");
}

function parseAAMode(value: string | undefined): CliAAMode | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  if (value === "4337" || value === "7702") {
    return value;
  }
  fatal("Unsupported AA mode. Use `4337` or `7702`.");
}

export function parseArgs(argv: string[]): ParsedArgs {
  const raw = argv.slice(2);
  const command = raw[0] && !raw[0].startsWith("-") ? raw[0] : undefined;
  const rest = command ? raw.slice(1) : raw;

  const positional: string[] = [];
  const flags: Record<string, string> = {};
  const secrets: Record<string, string> = {};

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--secret") {
      const next = rest[i + 1];
      if (next && next.includes("=")) {
        const eqIdx = next.indexOf("=");
        secrets[next.slice(0, eqIdx)] = next.slice(eqIdx + 1);
        i++;
      } else {
        flags["secret"] = "true";
      }
    } else if (arg.startsWith("--secret=")) {
      const val = arg.slice("--secret=".length);
      if (val.includes("=")) {
        const eqIdx = val.indexOf("=");
        secrets[val.slice(0, eqIdx)] = val.slice(eqIdx + 1);
      }
    } else if (arg.startsWith("--") && arg.includes("=")) {
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

  return { command, positional, flags, secrets };
}

export function getConfig(parsed: ParsedArgs): CliConfig {
  const usesSignFlags =
    parsed.flags["aa"] === "true" ||
    parsed.flags["eoa"] === "true" ||
    parsed.flags["aa-provider"] !== undefined ||
    parsed.flags["aa-mode"] !== undefined;

  if (usesSignFlags && parsed.command !== "sign") {
    fatal(
      "AA/EOA execution flags are only supported on `aomi sign <tx-id>`.",
    );
  }

  const execution = resolveExecutionMode(parsed.flags);
  const aaProvider = parseAAProvider(
    parsed.flags["aa-provider"] ?? process.env.AOMI_AA_PROVIDER,
  );
  const aaMode = parseAAMode(
    parsed.flags["aa-mode"] ?? process.env.AOMI_AA_MODE,
  );

  if (execution === "eoa" && (aaProvider || aaMode)) {
    fatal("`--aa-provider` and `--aa-mode` cannot be used with `--eoa`.");
  }

  return {
    baseUrl:
      parsed.flags["backend-url"] ??
      process.env.AOMI_BASE_URL ??
      "https://api.aomi.dev",
    apiKey:
      parsed.flags["api-key"] ??
      process.env.AOMI_API_KEY,
    app:
      parsed.flags["app"] ??
      process.env.AOMI_APP ??
      "default",
    model:
      parsed.flags["model"] ??
      process.env.AOMI_MODEL,
    publicKey:
      parsed.flags["public-key"] ??
      process.env.AOMI_PUBLIC_KEY,
    privateKey:
      parsed.flags["private-key"] ??
      process.env.PRIVATE_KEY,
    chainRpcUrl:
      parsed.flags["rpc-url"] ??
      process.env.CHAIN_RPC_URL,
    chain: parseChainId(parsed.flags["chain"] ?? process.env.AOMI_CHAIN_ID),
    secrets: parsed.secrets,
    execution,
    aaProvider,
    aaMode,
  };
}

export function createRuntime(argv: string[]): CliRuntime {
  const parsed = parseArgs(argv);
  return {
    parsed,
    config: getConfig(parsed),
  };
}
