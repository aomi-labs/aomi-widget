import type { Chain } from "viem";

import type {
  AAConfig,
  AAChainConfig,
  AAExecutionMode,
  AAExecutionPlan,
  WalletExecutionCall,
} from "./types";

import {
  DEFAULT_AA_CONFIG,
  buildAAExecutionPlan,
  getAAChainConfig,
} from "./types";

import {
  readEnv,
  readGasPolicyEnv,
  ALCHEMY_API_KEY_ENVS,
  ALCHEMY_GAS_POLICY_ENVS,
  PIMLICO_API_KEY_ENVS,
} from "./env";

// ---------------------------------------------------------------------------
// Alchemy Config Resolution
// ---------------------------------------------------------------------------

export interface AlchemyResolveOptions {
  calls: WalletExecutionCall[] | null;
  localPrivateKey?: `0x${string}` | null;
  accountAbstractionConfig?: AAConfig;
  chainsById: Record<number, Chain>;
  chainSlugById?: Record<number, string>;
  getPreferredRpcUrl?: (chain: Chain) => string;
  modeOverride?: AAExecutionMode;
  publicOnly?: boolean;
  throwOnMissingConfig?: boolean;
}

export interface AlchemyResolvedConfig {
  chainConfig: AAChainConfig;
  plan: AAExecutionPlan;
  apiKey: string;
  chain: Chain;
  rpcUrl: string;
  gasPolicyId?: string;
  mode: AAExecutionMode;
}

export function resolveAlchemyConfig(
  options: AlchemyResolveOptions,
): AlchemyResolvedConfig | null {
  const {
    calls,
    localPrivateKey,
    accountAbstractionConfig = DEFAULT_AA_CONFIG,
    chainsById,
    chainSlugById = {},
    getPreferredRpcUrl = (chain) => chain.rpcUrls.default.http[0] ?? "",
    modeOverride,
    publicOnly = false,
    throwOnMissingConfig = false,
  } = options;

  if (!calls || localPrivateKey) {
    return null;
  }

  const config = {
    ...accountAbstractionConfig,
    provider: "alchemy",
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

  const apiKey = readEnv(ALCHEMY_API_KEY_ENVS, { publicOnly });
  if (!apiKey) {
    if (throwOnMissingConfig) {
      throw new Error("Alchemy AA requires ALCHEMY_API_KEY.");
    }
    return null;
  }

  const chain = chainsById[chainConfig.chainId];
  if (!chain) {
    return null;
  }

  const gasPolicyId = readGasPolicyEnv(
    chainConfig.chainId,
    chainSlugById,
    ALCHEMY_GAS_POLICY_ENVS,
    { publicOnly },
  );

  if (chainConfig.sponsorship === "required" && !gasPolicyId) {
    if (throwOnMissingConfig) {
      throw new Error(
        `Alchemy gas policy required for chain ${chainConfig.chainId} but not configured.`,
      );
    }
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

  const plan = buildAAExecutionPlan(config, resolvedChainConfig);

  return {
    chainConfig: resolvedChainConfig,
    plan,
    apiKey,
    chain,
    rpcUrl: getPreferredRpcUrl(chain),
    gasPolicyId,
    mode: resolvedChainConfig.defaultMode,
  };
}

// ---------------------------------------------------------------------------
// Pimlico Config Resolution
// ---------------------------------------------------------------------------

export interface PimlicoResolveOptions {
  calls: WalletExecutionCall[] | null;
  localPrivateKey?: `0x${string}` | null;
  accountAbstractionConfig?: AAConfig;
  chainsById: Record<number, Chain>;
  rpcUrl?: string;
  modeOverride?: AAExecutionMode;
  publicOnly?: boolean;
  throwOnMissingConfig?: boolean;
}

export interface PimlicoResolvedConfig {
  chainConfig: AAChainConfig;
  plan: AAExecutionPlan;
  apiKey: string;
  chain: Chain;
  rpcUrl?: string;
  mode: AAExecutionMode;
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
  } = options;

  if (!calls || localPrivateKey) {
    return null;
  }

  const config = {
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

  const apiKey = readEnv(PIMLICO_API_KEY_ENVS, { publicOnly });
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

  const plan = buildAAExecutionPlan(config, resolvedChainConfig);

  return {
    chainConfig: resolvedChainConfig,
    plan,
    apiKey,
    chain,
    rpcUrl,
    mode: resolvedChainConfig.defaultMode,
  };
}
