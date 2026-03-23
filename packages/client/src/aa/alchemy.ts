import type { Chain } from "viem";

import type {
  AAConfig,
  AAExecutionMode,
  AALike,
  AAProviderQuery,
  AAProviderState,
  WalletExecutionCall,
} from "./types";

import { DEFAULT_AA_CONFIG } from "./types";
import { resolveAlchemyConfig } from "./resolve";

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
}: CreateAlchemyAAProviderOptions<TAA, TQuery>) {
  return function useAlchemyAAProvider(
    calls: WalletExecutionCall[] | null,
    localPrivateKey: `0x${string}` | null,
  ): AAProviderState<TAA> {
    const resolved = resolveAlchemyConfig({
      calls,
      localPrivateKey,
      accountAbstractionConfig,
      chainsById,
      chainSlugById,
      getPreferredRpcUrl,
      publicOnly: true,
    });

    const params = resolved
      ? ({
          enabled: true,
          apiKey: resolved.apiKey,
          chain: resolved.chain,
          rpcUrl: resolved.rpcUrl,
          gasPolicyId: resolved.gasPolicyId,
          mode: resolved.mode,
        } satisfies AlchemyHookParams)
      : undefined;

    const query = useAlchemyAA(params) as TQuery;

    return {
      plan: resolved?.plan ?? null,
      query,
      AA: query.AA,
      isPending: Boolean(resolved && query.isPending),
      error: query.error ?? null,
    };
  };
}
