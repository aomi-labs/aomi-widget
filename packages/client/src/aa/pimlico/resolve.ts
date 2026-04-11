import type { Chain } from "viem";

import type {
  AAConfig,
  AAResolvedConfig,
  AAMode,
  WalletCall,
} from "../types";
import {
  DEFAULT_AA_CONFIG,
  buildAAExecutionPlan,
  getAAChainConfig,
} from "../types";
import { readEnv } from "../env";
import { PIMLICO_API_KEY_ENVS } from "./env";

export interface PimlicoResolveOptions {
  calls: WalletCall[] | null;
  localPrivateKey?: `0x${string}` | null;
  accountAbstractionConfig?: AAConfig;
  chainsById: Record<number, Chain>;
  rpcUrl?: string;
  modeOverride?: AAMode;
  publicOnly?: boolean;
  throwOnMissingConfig?: boolean;
  apiKey?: string;
}

export interface PimlicoResolvedConfig extends AAResolvedConfig {
  apiKey: string;
  chain: Chain;
  rpcUrl?: string;
}

export function resolvePimlicoConfig(
  options: PimlicoResolveOptions,
): PimlicoResolvedConfig | null {
  const {
    calls,
    localPrivateKey,
    accountAbstractionConfig = DEFAULT_AA_CONFIG,
    chainsById,
    rpcUrl,
    modeOverride,
    publicOnly = false,
    throwOnMissingConfig = false,
    apiKey: preResolvedApiKey,
  } = options;

  if (!calls || localPrivateKey) {
    return null;
  }

  const config: AAConfig = {
    ...accountAbstractionConfig,
    provider: "pimlico",
  };

  const chainConfig = getAAChainConfig(config, calls, chainsById);
  if (!chainConfig) {
    if (throwOnMissingConfig) {
      const chainIds = Array.from(new Set(calls.map((c) => c.chainId)));
      throw new Error(
        `AA is not configured for chain ${chainIds[0]}, or batching is disabled for that chain.`,
      );
    }
    return null;
  }

  const apiKey = preResolvedApiKey ?? readEnv(PIMLICO_API_KEY_ENVS, { publicOnly });
  if (!apiKey) {
    if (throwOnMissingConfig) {
      throw new Error("Pimlico AA requires PIMLICO_API_KEY.");
    }
    return null;
  }

  const chain = chainsById[chainConfig.chainId];
  if (!chain) {
    return null;
  }

  if (modeOverride && !chainConfig.supportedModes.includes(modeOverride)) {
    if (throwOnMissingConfig) {
      throw new Error(
        `AA mode "${modeOverride}" is not supported on chain ${chainConfig.chainId}.`,
      );
    }
    return null;
  }

  const resolvedChainConfig = modeOverride
    ? { ...chainConfig, defaultMode: modeOverride }
    : chainConfig;

  const resolved = buildAAExecutionPlan(config, resolvedChainConfig);

  return {
    ...resolved,
    apiKey,
    chain,
    rpcUrl,
    mode: resolvedChainConfig.defaultMode,
  };
}
