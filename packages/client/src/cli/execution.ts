import type { Chain } from "viem";

import {
  DISABLED_PROVIDER_STATE,
  type AAProviderState,
  type AAExecutionMode,
  type WalletExecutionCall,
  resolveDefaultProvider,
  isProviderConfigured,
  resolveAlchemyConfig,
  resolvePimlicoConfig,
  createAAProviderState,
  DEFAULT_AA_CONFIG,
  getAAChainConfig,
} from "../aa";
import type { CliAAProvider, CliAAMode, CliConfig } from "./types";

// ---------------------------------------------------------------------------
// ERC-20 Call Detection
// ---------------------------------------------------------------------------

// Common ERC-20 function selectors (first 4 bytes of calldata)
const ERC20_SELECTORS = new Set([
  "0x095ea7b3", // approve(address,uint256)
  "0xa9059cbb", // transfer(address,uint256)
  "0x23b872dd", // transferFrom(address,address,uint256)
]);

function callsContainTokenOperations(calls: WalletExecutionCall[]): boolean {
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
  callList: WalletExecutionCall[];
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

// Re-export for wallet.ts and tests
export { isAlchemySponsorshipLimitError } from "../aa";

// ---------------------------------------------------------------------------
// CLI Execution Decision
// ---------------------------------------------------------------------------

type CliExecutionDecision =
  | {
      execution: "eoa";
    }
  | {
      execution: "aa";
      provider: CliAAProvider;
      aaMode: CliAAMode;
      fallbackToEoa: boolean;
    };

function resolveAAProvider(
  config: CliConfig,
  options: { required: boolean },
): CliAAProvider | null {
  const provider = config.aaProvider;
  if (provider) {
    if (isProviderConfigured(provider)) {
      return provider;
    }
    if (!options.required) {
      return null;
    }
    const envName =
      provider === "alchemy" ? "ALCHEMY_API_KEY" : "PIMLICO_API_KEY";
    throw new Error(
      `AA provider "${provider}" is selected but ${envName} is not configured.`,
    );
  }

  try {
    return resolveDefaultProvider();
  } catch (error) {
    if (!options.required) {
      return null;
    }
    throw error;
  }
}

function getResolvedAAMode(params: {
  provider: CliAAProvider;
  config: CliConfig;
  chain: Chain;
  callList: WalletExecutionCall[];
  fallbackToEoa: boolean;
}): CliExecutionDecision {
  const { provider, config, chain, callList, fallbackToEoa } = params;

  const resolveOpts = {
    calls: callList,
    chainsById: { [chain.id]: chain },
    modeOverride: config.aaMode,
    throwOnMissingConfig: true,
  };

  const resolved =
    provider === "alchemy"
      ? resolveAlchemyConfig(resolveOpts)
      : resolvePimlicoConfig(resolveOpts);

  if (!resolved) {
    throw new Error(`AA config resolution failed for provider "${provider}".`);
  }

  // Guard: 4337 + ERC-20 token calls → auto-switch to 7702 if available
  const { mode: finalMode } = maybeOverride4337ForTokenOps({
    mode: resolved.plan.mode as CliAAMode,
    callList,
    chain,
    explicitMode: Boolean(config.aaMode),
  });

  return {
    execution: "aa",
    provider,
    aaMode: finalMode,
    fallbackToEoa,
  };
}

export function resolveCliExecutionDecision(params: {
  config: CliConfig;
  chain: Chain;
  callList: WalletExecutionCall[];
}): CliExecutionDecision {
  const { config, chain, callList } = params;

  if (config.execution === "eoa") {
    return { execution: "eoa" };
  }

  const requireAA = config.execution === "aa";
  const provider = resolveAAProvider(config, { required: requireAA });
  if (!provider) {
    return { execution: "eoa" };
  }

  try {
    return getResolvedAAMode({
      provider,
      config,
      chain,
      callList,
      fallbackToEoa: !requireAA,
    });
  } catch (error) {
    if (!requireAA) {
      return { execution: "eoa" };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// CLI Provider State Creation
// ---------------------------------------------------------------------------

export async function createCliProviderState(params: {
  decision: CliExecutionDecision;
  chain: Chain;
  privateKey: `0x${string}`;
  rpcUrl: string;
  callList: WalletExecutionCall[];
  sponsored?: boolean;
}): Promise<AAProviderState> {
  const { decision, chain, privateKey, rpcUrl, callList, sponsored } = params;

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
    sponsored,
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

  return decision.fallbackToEoa
    ? `aa (${decision.provider}, ${decision.aaMode}; fallback: eoa)`
    : `aa (${decision.provider}, ${decision.aaMode})`;
}
