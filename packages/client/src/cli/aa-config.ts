import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { CliAAMode, CliAAProvider } from "./types";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export type PersistedAAProviderConfig = {
  apiKey?: string;
  gasPolicyId?: string;
};

export type PersistedAAConfig = {
  provider?: CliAAProvider;
  mode?: CliAAMode;
  fallback?: "eoa" | "none";
  providers?: Partial<Record<CliAAProvider, PersistedAAProviderConfig>>;
};

type LegacyPersistedAAConfig = {
  provider?: CliAAProvider;
  mode?: CliAAMode;
  alchemyApiKey?: string;
  alchemyGasPolicyId?: string;
  pimlicoApiKey?: string;
  fallback?: "eoa" | "none";
};

export const SETTABLE_AA_FIELDS = [
  "provider",
  "mode",
  "key",
  "alchemy-key",
  "pimlico-key",
  "policy",
  "alchemy-policy",
  "fallback",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function isProvider(value: unknown): value is CliAAProvider {
  return value === "alchemy" || value === "pimlico";
}

function isMode(value: unknown): value is CliAAMode {
  return value === "4337" || value === "7702";
}

function isFallback(value: unknown): value is PersistedAAConfig["fallback"] {
  return value === "eoa" || value === "none";
}

function normalizeProviderConfig(
  value: unknown,
): PersistedAAProviderConfig | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  const config: PersistedAAProviderConfig = {};
  const apiKey = cleanString(value.apiKey);
  const gasPolicyId = cleanString(value.gasPolicyId);

  if (apiKey) {
    config.apiKey = apiKey;
  }
  if (gasPolicyId) {
    config.gasPolicyId = gasPolicyId;
  }

  return Object.keys(config).length > 0 ? config : undefined;
}

function pruneAAConfig(config: PersistedAAConfig): PersistedAAConfig {
  const providers: PersistedAAConfig["providers"] = {};

  const alchemy = normalizeProviderConfig(config.providers?.alchemy);
  if (alchemy) {
    providers.alchemy = alchemy;
  }

  const pimlico = normalizeProviderConfig(config.providers?.pimlico);
  if (pimlico) {
    providers.pimlico = pimlico;
  }

  return {
    ...(config.provider ? { provider: config.provider } : {}),
    ...(config.mode ? { mode: config.mode } : {}),
    ...(config.fallback ? { fallback: config.fallback } : {}),
    ...(Object.keys(providers).length > 0 ? { providers } : {}),
  };
}

export function normalizeAAConfig(value: unknown): PersistedAAConfig {
  if (!isObject(value)) {
    return {};
  }

  const config: PersistedAAConfig = {};

  if (isProvider(value.provider)) {
    config.provider = value.provider;
  }
  if (isMode(value.mode)) {
    config.mode = value.mode;
  }
  if (isFallback(value.fallback)) {
    config.fallback = value.fallback;
  }

  const providers: PersistedAAConfig["providers"] = {};
  const storedProviders = isObject(value.providers) ? value.providers : undefined;

  const alchemy =
    normalizeProviderConfig(storedProviders?.alchemy) ??
    normalizeProviderConfig({
      apiKey: cleanString((value as LegacyPersistedAAConfig).alchemyApiKey),
      gasPolicyId: cleanString((value as LegacyPersistedAAConfig).alchemyGasPolicyId),
    });
  if (alchemy) {
    providers.alchemy = alchemy;
  }

  const pimlico =
    normalizeProviderConfig(storedProviders?.pimlico) ??
    normalizeProviderConfig({
      apiKey: cleanString((value as LegacyPersistedAAConfig).pimlicoApiKey),
    });
  if (pimlico) {
    providers.pimlico = pimlico;
  }

  if (Object.keys(providers).length > 0) {
    config.providers = providers;
  }

  return pruneAAConfig(config);
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function configDir(): string {
  const dir = process.env.AOMI_CONFIG_DIR ?? join(homedir(), ".aomi");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function configPath(): string {
  return join(configDir(), "aa.json");
}

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

export function readAAConfig(): PersistedAAConfig {
  const path = configPath();
  if (!existsSync(path)) return {};
  try {
    return normalizeAAConfig(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return {};
  }
}

export function writeAAConfig(config: PersistedAAConfig): void {
  writeFileSync(configPath(), JSON.stringify(pruneAAConfig(config), null, 2) + "\n");
}

export function clearAAConfig(): void {
  writeAAConfig({});
}

// ---------------------------------------------------------------------------
// Getters
// ---------------------------------------------------------------------------

export function getPersistedAAApiKey(
  config: PersistedAAConfig,
  provider: CliAAProvider,
): string | undefined {
  return cleanString(config.providers?.[provider]?.apiKey);
}

export function getPersistedAlchemyGasPolicyId(
  config: PersistedAAConfig,
): string | undefined {
  return cleanString(config.providers?.alchemy?.gasPolicyId);
}

// ---------------------------------------------------------------------------
// Mutation
// ---------------------------------------------------------------------------

export function validateSetValue(
  field: string,
  value: string,
): string | null {
  switch (field) {
    case "provider":
      if (!isProvider(value)) {
        return "Provider must be 'alchemy' or 'pimlico'.";
      }
      break;
    case "mode":
      if (!isMode(value)) {
        return "Mode must be '4337' or '7702'.";
      }
      break;
    case "fallback":
      if (!isFallback(value)) {
        return "Fallback must be 'eoa' or 'none'.";
      }
      break;
  }
  return null;
}

function ensureProviderConfig(
  config: PersistedAAConfig,
  provider: CliAAProvider,
): PersistedAAProviderConfig {
  config.providers ??= {};
  config.providers[provider] ??= {};
  return config.providers[provider]!;
}

export function setAAConfigValue(
  input: PersistedAAConfig,
  field: string,
  value: string,
): PersistedAAConfig {
  const error = validateSetValue(field, value);
  if (error) {
    throw new Error(error);
  }

  const config = normalizeAAConfig(input);

  switch (field) {
    case "provider":
      config.provider = value;
      return config;
    case "mode":
      config.mode = value as CliAAMode;
      return config;
    case "fallback":
      config.fallback = value as PersistedAAConfig["fallback"];
      return config;
    case "key": {
      if (!config.provider) {
        throw new Error(
          "No default provider set. Run `aomi aa set provider <alchemy|pimlico>` first, or use `alchemy-key` / `pimlico-key`.",
        );
      }
      ensureProviderConfig(config, config.provider).apiKey = value;
      return config;
    }
    case "alchemy-key":
      ensureProviderConfig(config, "alchemy").apiKey = value;
      return config;
    case "pimlico-key":
      ensureProviderConfig(config, "pimlico").apiKey = value;
      return config;
    case "policy":
    case "alchemy-policy":
      ensureProviderConfig(config, "alchemy").gasPolicyId = value;
      return config;
    default:
      throw new Error(
        `Unknown AA config key "${field}". Valid keys: ${SETTABLE_AA_FIELDS.join(", ")}`,
      );
  }
}
