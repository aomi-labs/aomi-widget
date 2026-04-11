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
import { readEnv, readGasPolicyEnv } from "../env";
import {
  ALCHEMY_API_KEY_ENVS,
  ALCHEMY_GAS_POLICY_ENVS,
} from "./env";

export interface AlchemyResolveOptions {
  calls: WalletCall[] | null;
  localPrivateKey?: `0x${string}` | null;
  accountAbstractionConfig?: AAConfig;
  chainsById: Record<number, Chain>;
  chainSlugById?: Record<number, string>;
  getPreferredRpcUrl?: (chain: Chain) => string;
  modeOverride?: AAMode;
  publicOnly?: boolean;
  throwOnMissingConfig?: boolean;
  apiKey?: string;
  gasPolicyId?: string;
}

export interface AlchemyResolvedConfig extends AAResolvedConfig {
  apiKey: string;
  chain: Chain;
  rpcUrl: string;
  gasPolicyId?: string;
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
    apiKey: preResolvedApiKey,
    gasPolicyId: preResolvedGasPolicyId,
  } = options;

  if (!calls || localPrivateKey) {
    return null;
  }

  const config: AAConfig = {
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

  const apiKey = preResolvedApiKey ?? readEnv(ALCHEMY_API_KEY_ENVS, { publicOnly });
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

  const gasPolicyId = preResolvedGasPolicyId
    ?? readGasPolicyEnv(
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

  const resolved = buildAAExecutionPlan(config, resolvedChainConfig);

  return {
    ...resolved,
    apiKey,
    chain,
    rpcUrl: getPreferredRpcUrl(chain),
    gasPolicyId,
    mode: resolvedChainConfig.defaultMode,
  };
}
