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
    };

function resolveAAProvider(config: CliConfig): CliAAProvider {
  const provider = config.aaProvider ?? resolveDefaultProvider();
  if (!isProviderConfigured(provider)) {
    const envName =
      provider === "alchemy" ? "ALCHEMY_API_KEY" : "PIMLICO_API_KEY";
    throw new Error(
      `AA provider "${provider}" is selected but ${envName} is not configured.`,
    );
  }
  return provider;
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

  const provider = resolveAAProvider(config);

  // Resolve plan via the unified config resolver to get the mode
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
  };
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
    privateKey,
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

  return `aa (${decision.provider}, ${decision.aaMode})`;
}
