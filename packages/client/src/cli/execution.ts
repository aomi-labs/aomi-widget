import type { Chain } from "viem";

import {
  DISABLED_PROVIDER_STATE,
  type AAProviderState,
  type WalletExecutionCall,
  resolveDefaultProvider,
  isProviderConfigured,
  resolveAlchemyConfig,
  resolvePimlicoConfig,
  createAAProviderState,
} from "../aa";
import type { CliAAProvider, CliAAMode, CliConfig } from "./types";

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

  return {
    execution: "aa",
    provider,
    aaMode: resolved.plan.mode,
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
