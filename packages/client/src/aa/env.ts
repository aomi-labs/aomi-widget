import {
  ALCHEMY_API_KEY_ENVS,
  ALCHEMY_GAS_POLICY_ENVS,
} from "./alchemy/env";
import { PIMLICO_API_KEY_ENVS } from "./pimlico/env";

export {
  ALCHEMY_API_KEY_ENVS,
  ALCHEMY_GAS_POLICY_ENVS,
  PIMLICO_API_KEY_ENVS,
};

// ---------------------------------------------------------------------------
// Core Env Reading
// ---------------------------------------------------------------------------

/**
 * Reads the first non-empty env var from `candidates`.
 * When `publicOnly` is true, only `NEXT_PUBLIC_*` names are considered.
 */
export function readEnv(
  candidates: readonly string[],
  options: { publicOnly?: boolean } = {},
): string | undefined {
  const { publicOnly = false } = options;

  for (const name of candidates) {
    if (publicOnly && !name.startsWith("NEXT_PUBLIC_")) {
      continue;
    }
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Gas Policy Resolution
// ---------------------------------------------------------------------------

/**
 * Resolves a gas policy ID by trying chain-specific env vars first, then base candidates.
 */
export function readGasPolicyEnv(
  chainId: number,
  chainSlugById: Record<number, string>,
  baseCandidates: readonly string[],
  options: { publicOnly?: boolean } = {},
): string | undefined {
  const slug = chainSlugById[chainId];

  if (slug) {
    const chainSpecific = baseCandidates.map(
      (base) => `${base}_${slug.toUpperCase()}`,
    );
    const found = readEnv(chainSpecific, options);
    if (found) return found;
  }

  return readEnv(baseCandidates, options);
}

// ---------------------------------------------------------------------------
// Provider Detection
// ---------------------------------------------------------------------------

export type AAProvider = "alchemy" | "pimlico";

/**
 * Returns true if the given provider has a configured API key.
 */
export function isProviderConfigured(
  provider: AAProvider,
  options: { publicOnly?: boolean } = {},
): boolean {
  return provider === "alchemy"
    ? Boolean(readEnv(ALCHEMY_API_KEY_ENVS, options))
    : Boolean(readEnv(PIMLICO_API_KEY_ENVS, options));
}

/**
 * Picks the first configured provider (alchemy > pimlico).
 * Throws if neither is configured.
 */
export function resolveDefaultProvider(
  options: { publicOnly?: boolean } = {},
): AAProvider {
  if (isProviderConfigured("alchemy", options)) return "alchemy";
  if (isProviderConfigured("pimlico", options)) return "pimlico";
  throw new Error(
    "AA requires provider credentials. Set ALCHEMY_API_KEY or PIMLICO_API_KEY, or use --eoa.",
  );
}
