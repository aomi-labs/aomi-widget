import type { Chain } from "viem";

import type {
  AAConfig,
  AAExecutionMode,
  AALike,
  AAProviderQuery,
  AAProviderState,
  WalletExecutionCall,
} from "./types";

import {
  DEFAULT_AA_CONFIG,
  buildAAExecutionPlan,
  getAAChainConfig,
} from "./types";

// ---------------------------------------------------------------------------
// Alchemy-Specific Types
// ---------------------------------------------------------------------------

export interface AlchemyHookParams {
  enabled: boolean;
  apiKey: string;
  chain: Chain;
  rpcUrl: string;
  gasPolicyId?: string;
  mode: AAExecutionMode;
}

export type UseAlchemyAAHook<
  TAA extends AALike = AALike,
  TQuery extends AAProviderQuery<TAA> = AAProviderQuery<TAA>,
> = (params?: AlchemyHookParams) => TQuery;

export interface CreateAlchemyAAProviderOptions<
  TAA extends AALike = AALike,
  TQuery extends AAProviderQuery<TAA> = AAProviderQuery<TAA>,
> {
  accountAbstractionConfig?: AAConfig;
  useAlchemyAA: UseAlchemyAAHook<TAA, TQuery>;
  chainsById: Record<number, Chain>;
  chainSlugById: Record<number, string>;
  getPreferredRpcUrl: (chain: Chain) => string;
  apiKeyEnvVar?: string;
  gasPolicyEnvVar?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_ALCHEMY_API_KEY_ENV_VAR = "NEXT_PUBLIC_ALCHEMY_API_KEY";
const DEFAULT_ALCHEMY_GAS_POLICY_ENV_VAR = "NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readPublicEnv(name: string | undefined): string | undefined {
  if (!name) {
    return undefined;
  }
  const value = process.env[name];
  return value?.trim() ? value.trim() : undefined;
}

function defaultGasPolicyEnvVar(
  chainId: number,
  chainSlugById: Record<number, string>,
  baseName: string,
): string | undefined {
  const slug = chainSlugById[chainId];
  return slug ? `${baseName}_${slug.toUpperCase()}` : undefined;
}

// ---------------------------------------------------------------------------
// Provider Factory
// ---------------------------------------------------------------------------

export function createAlchemyAAProvider<
  TAA extends AALike = AALike,
  TQuery extends AAProviderQuery<TAA> = AAProviderQuery<TAA>,
>({
  accountAbstractionConfig = DEFAULT_AA_CONFIG,
  useAlchemyAA,
  chainsById,
  chainSlugById,
  getPreferredRpcUrl,
  apiKeyEnvVar = DEFAULT_ALCHEMY_API_KEY_ENV_VAR,
  gasPolicyEnvVar = DEFAULT_ALCHEMY_GAS_POLICY_ENV_VAR,
}: CreateAlchemyAAProviderOptions<TAA, TQuery>) {
  return function useAlchemyAAProvider(
    calls: WalletExecutionCall[] | null,
    localPrivateKey: `0x${string}` | null,
  ): AAProviderState<TAA> {
    const resolved = resolveAlchemyProviderConfig({
      calls,
      localPrivateKey,
      accountAbstractionConfig,
      chainsById,
      chainSlugById,
      getPreferredRpcUrl,
      apiKeyEnvVar,
      gasPolicyEnvVar,
    });

    const query = useAlchemyAA(resolved?.params) as TQuery;

    return {
      plan: resolved?.plan ?? null,
      query,
      AA: query.AA,
      isPending: Boolean(resolved && query.isPending),
      error: query.error ?? null,
    };
  };
}

// ---------------------------------------------------------------------------
// Config Resolution
// ---------------------------------------------------------------------------

function resolveAlchemyProviderConfig({
  calls,
  localPrivateKey,
  accountAbstractionConfig,
  chainsById,
  chainSlugById,
  getPreferredRpcUrl,
  apiKeyEnvVar,
  gasPolicyEnvVar,
}: {
  calls: WalletExecutionCall[] | null;
  localPrivateKey: `0x${string}` | null;
  accountAbstractionConfig: AAConfig;
  chainsById: Record<number, Chain>;
  chainSlugById: Record<number, string>;
  getPreferredRpcUrl: (chain: Chain) => string;
  apiKeyEnvVar: string;
  gasPolicyEnvVar: string;
}) {
  if (!calls || localPrivateKey) {
    return null;
  }

  const chainConfig = getAAChainConfig(
    accountAbstractionConfig,
    calls,
    chainsById,
  );
  if (!chainConfig) {
    return null;
  }

  const apiKey = readPublicEnv(apiKeyEnvVar);
  if (!apiKey) {
    return null;
  }

  const chain = chainsById[chainConfig.chainId];
  if (!chain) {
    return null;
  }

  const gasPolicyId =
    readPublicEnv(defaultGasPolicyEnvVar(chainConfig.chainId, chainSlugById, gasPolicyEnvVar)) ??
    readPublicEnv(gasPolicyEnvVar);

  if (chainConfig.sponsorship === "required" && !gasPolicyId) {
    return null;
  }

  return {
    chainConfig,
    plan: buildAAExecutionPlan(accountAbstractionConfig, chainConfig),
    params: {
      enabled: true,
      apiKey,
      chain,
      rpcUrl: getPreferredRpcUrl(chain),
      gasPolicyId,
      mode: chainConfig.defaultMode,
    } satisfies AlchemyHookParams,
  };
}
