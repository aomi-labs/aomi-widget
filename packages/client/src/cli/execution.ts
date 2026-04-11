import type { Chain } from "viem";

import {
  ALCHEMY_API_KEY_ENVS,
  ALCHEMY_GAS_POLICY_ENVS,
  DISABLED_PROVIDER_STATE,
  PIMLICO_API_KEY_ENVS,
  type AAState,
  type WalletCall,
  readEnv,
  resolveAlchemyConfig,
  resolvePimlicoConfig,
  createAAProviderState,
  DEFAULT_AA_CONFIG,
  getAAChainConfig,
} from "../aa";
import type { CliAAProvider, CliAAMode, CliConfig } from "./types";
import {
  getPersistedAAApiKey,
  getPersistedAlchemyGasPolicyId,
  readAAConfig,
} from "./aa-config";

// ---------------------------------------------------------------------------
// ERC-20 Call Detection
// ---------------------------------------------------------------------------

// Common ERC-20 function selectors (first 4 bytes of calldata)
const ERC20_SELECTORS = new Set([
  "0x095ea7b3", // approve(address,uint256)
  "0xa9059cbb", // transfer(address,uint256)
  "0x23b872dd", // transferFrom(address,address,uint256)
]);

function callsContainTokenOperations(calls: WalletCall[]): boolean {
  return calls.some(
    (call) => call.data && ERC20_SELECTORS.has(call.data.slice(0, 10).toLowerCase()),
  );
}

/**
 * When 4337 is used with ERC-20 token operations, the calls execute from a
 * separate smart-account contract that doesn't hold the user's tokens.
 * If 7702 is available on the chain, auto-switch and warn.  Otherwise just warn.
 */
function maybeOverride4337ForTokenOps(params: {
  mode: CliAAMode;
  callList: WalletCall[];
  chain: Chain;
  explicitMode: boolean;
}): { mode: CliAAMode; warned: boolean } {
  const { mode, callList, chain, explicitMode } = params;
  if (mode !== "4337" || !callsContainTokenOperations(callList)) {
    return { mode, warned: false };
  }

  const chainConfig = getAAChainConfig(DEFAULT_AA_CONFIG, callList, {
    [chain.id]: chain,
  });

  if (chainConfig?.supportedModes.includes("7702") && !explicitMode) {
    console.log(
      "⚠️  4337 batch contains ERC-20 calls but tokens are in your EOA, not the 4337 smart account.",
    );
    console.log("   Switching to 7702 (EOA keeps smart-account capabilities, no token transfer needed).");
    return { mode: "7702", warned: true };
  }

  console.log(
    "⚠️  4337 batch contains ERC-20 calls. Tokens must be in the smart account, not your EOA.",
  );
  console.log(
    "   This batch may revert. Consider transferring tokens to the smart account first.",
  );
  return { mode, warned: true };
}

// ---------------------------------------------------------------------------
// CLI Execution Decision
// ---------------------------------------------------------------------------

export type CliExecutionDecision =
  | {
      execution: "eoa";
    }
  | {
      execution: "aa";
      provider: CliAAProvider;
      aaMode: CliAAMode;
    };

function getCliAAApiKey(
  provider: CliAAProvider,
  persisted = readAAConfig(),
): string | undefined {
  if (provider === "alchemy") {
    return readEnv(ALCHEMY_API_KEY_ENVS) ?? getPersistedAAApiKey(persisted, "alchemy");
  }

  return readEnv(PIMLICO_API_KEY_ENVS) ?? getPersistedAAApiKey(persisted, "pimlico");
}

function getCliAlchemyGasPolicyId(
  persisted = readAAConfig(),
): string | undefined {
  return readEnv(ALCHEMY_GAS_POLICY_ENVS) ?? getPersistedAlchemyGasPolicyId(persisted);
}

function isCliProviderConfigured(
  provider: CliAAProvider,
  persisted = readAAConfig(),
): boolean {
  return Boolean(getCliAAApiKey(provider, persisted));
}

/**
 * Find which AA provider to use.
 *
 * Priority: explicit CLI flag → persisted preferred → first configured.
 * Returns null when nothing is configured.
 */
function resolveAAProvider(config: CliConfig): CliAAProvider | null {
  const persisted = readAAConfig();

  if (config.aaProvider) {
    if (isCliProviderConfigured(config.aaProvider, persisted)) {
      return config.aaProvider;
    }
    const envName =
      config.aaProvider === "alchemy" ? "ALCHEMY_API_KEY" : "PIMLICO_API_KEY";
    throw new Error(
      `AA provider "${config.aaProvider}" is selected but ${envName} is not configured.\nRun \`aomi aa set key <your-key>\` or set ${envName}.`,
    );
  }

  const preferred = persisted.provider;
  if (preferred && isCliProviderConfigured(preferred, persisted)) return preferred;
  if (isCliProviderConfigured("alchemy", persisted)) return "alchemy";
  if (isCliProviderConfigured("pimlico", persisted)) return "pimlico";

  return null;
}

/**
 * Resolve the AA mode (4337 | 7702) for the chosen provider+chain.
 */
function resolveAAMode(params: {
  provider: CliAAProvider;
  config: CliConfig;
  chain: Chain;
  callList: WalletCall[];
}): CliAAMode {
  const { provider, config, chain, callList } = params;
  const persisted = readAAConfig();
  const effectiveMode = config.aaMode ?? (persisted.mode as CliAAMode | undefined);

  const resolveOpts = {
    calls: callList,
    chainsById: { [chain.id]: chain },
    modeOverride: effectiveMode,
    throwOnMissingConfig: true,
  };

  const resolved =
    provider === "alchemy"
      ? resolveAlchemyConfig({
          ...resolveOpts,
          apiKey: getCliAAApiKey("alchemy", persisted),
          gasPolicyId: getCliAlchemyGasPolicyId(persisted),
        })
      : resolvePimlicoConfig({
          ...resolveOpts,
          apiKey: getCliAAApiKey("pimlico", persisted),
        });

  if (!resolved) {
    throw new Error(`AA config resolution failed for provider "${provider}".`);
  }

  // Guard: 4337 + ERC-20 token calls → auto-switch to 7702 if available
  const { mode: finalMode } = maybeOverride4337ForTokenOps({
    mode: resolved.mode as CliAAMode,
    callList,
    chain,
    explicitMode: Boolean(config.aaMode),
  });

  return finalMode;
}

/**
 * Decide how to execute a transaction: AA or EOA.
 *
 * - `--eoa`  → EOA, always.
 * - `--aa`   → AA, error if not configured.
 * - (default, no flag) → AA if a provider is configured, else EOA.
 */
export function resolveCliExecutionDecision(params: {
  config: CliConfig;
  chain: Chain;
  callList: WalletCall[];
}): CliExecutionDecision {
  const { config, chain, callList } = params;

  if (config.execution === "eoa") {
    return { execution: "eoa" };
  }

  const provider = resolveAAProvider(config);

  // Explicit --aa but no provider configured → error
  if (!provider && config.execution === "aa") {
    throw new Error(
      "AA requires provider credentials.\nRun `aomi aa set provider <name>` and `aomi aa set key <key>`, or set ALCHEMY_API_KEY / PIMLICO_API_KEY.",
    );
  }

  // No provider configured, no explicit flag → default to EOA
  if (!provider) {
    return { execution: "eoa" };
  }

  // Provider configured → use AA
  const aaMode = resolveAAMode({ provider, config, chain, callList });

  return { execution: "aa", provider, aaMode };
}

/**
 * Return the alternative AA mode for fallback, or null if no alternative.
 */
export function getAlternativeAAMode(
  decision: CliExecutionDecision,
): CliExecutionDecision | null {
  if (decision.execution !== "aa") return null;
  const alt: CliAAMode = decision.aaMode === "7702" ? "4337" : "7702";
  return { execution: "aa", provider: decision.provider, aaMode: alt };
}

// ---------------------------------------------------------------------------
// CLI Provider State Creation
// ---------------------------------------------------------------------------

export async function createCliProviderState(params: {
  decision: CliExecutionDecision;
  chain: Chain;
  privateKey: `0x${string}`;
  rpcUrl: string;
  callList: WalletCall[];
}): Promise<AAState> {
  const { decision, chain, privateKey, rpcUrl, callList } = params;
  const persisted = readAAConfig();

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
    apiKey: getCliAAApiKey(decision.provider, persisted),
    gasPolicyId:
      decision.provider === "alchemy"
        ? getCliAlchemyGasPolicyId(persisted)
        : undefined,
  });
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function describeExecutionDecision(
  decision: CliExecutionDecision,
): string {
  if (decision.execution === "eoa") {
    return "eoa";
  }

  return `aa (${decision.provider}, ${decision.aaMode})`;
}
