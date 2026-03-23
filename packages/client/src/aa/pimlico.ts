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
// Pimlico-Specific Types
// ---------------------------------------------------------------------------

export interface PimlicoHookParams {
  enabled: boolean;
  apiKey: string;
  chain: Chain;
  mode: AAExecutionMode;
  rpcUrl?: string;
}

export type UsePimlicoAAHook<
  TAA extends AALike = AALike,
  TQuery extends AAProviderQuery<TAA> = AAProviderQuery<TAA>,
> = (params?: PimlicoHookParams) => TQuery;

export interface CreatePimlicoAAProviderOptions<
  TAA extends AALike = AALike,
  TQuery extends AAProviderQuery<TAA> = AAProviderQuery<TAA>,
> {
  accountAbstractionConfig?: AAConfig;
  usePimlicoAA: UsePimlicoAAHook<TAA, TQuery>;
  chainsById: Record<number, Chain>;
  apiKeyEnvVar?: string;
  rpcUrl?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PIMLICO_API_KEY_ENV_VAR = "NEXT_PUBLIC_PIMLICO_API_KEY";

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

// ---------------------------------------------------------------------------
// Provider Factory
// ---------------------------------------------------------------------------

export function createPimlicoAAProvider<
  TAA extends AALike = AALike,
  TQuery extends AAProviderQuery<TAA> = AAProviderQuery<TAA>,
>({
  accountAbstractionConfig = DEFAULT_AA_CONFIG,
  usePimlicoAA,
  chainsById,
  apiKeyEnvVar = DEFAULT_PIMLICO_API_KEY_ENV_VAR,
  rpcUrl,
}: CreatePimlicoAAProviderOptions<TAA, TQuery>) {
  return function usePimlicoAAProvider(
    calls: WalletExecutionCall[] | null,
    localPrivateKey: `0x${string}` | null,
  ): AAProviderState<TAA> {
    const resolved = resolvePimlicoProviderConfig({
      calls,
      localPrivateKey,
      accountAbstractionConfig,
      chainsById,
      apiKeyEnvVar,
      rpcUrl,
    });

    const query = usePimlicoAA(resolved?.params) as TQuery;

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

function resolvePimlicoProviderConfig({
  calls,
  localPrivateKey,
  accountAbstractionConfig,
  chainsById,
  apiKeyEnvVar,
  rpcUrl,
}: {
  calls: WalletExecutionCall[] | null;
  localPrivateKey: `0x${string}` | null;
  accountAbstractionConfig: AAConfig;
  chainsById: Record<number, Chain>;
  apiKeyEnvVar: string;
  rpcUrl?: string;
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

  return {
    chainConfig,
    plan: buildAAExecutionPlan(accountAbstractionConfig, chainConfig),
    params: {
      enabled: true,
      apiKey,
      chain,
      mode: chainConfig.defaultMode,
      rpcUrl,
    } satisfies PimlicoHookParams,
  };
}
