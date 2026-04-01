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
import { resolvePimlicoConfig } from "./resolve";

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
// Provider Factory
// ---------------------------------------------------------------------------

export function createPimlicoAAProvider<
  TAA extends AALike = AALike,
  TQuery extends AAProviderQuery<TAA> = AAProviderQuery<TAA>,
>({
  accountAbstractionConfig = DEFAULT_AA_CONFIG,
  usePimlicoAA,
  chainsById,
  rpcUrl,
}: CreatePimlicoAAProviderOptions<TAA, TQuery>) {
  return function usePimlicoAAProvider(
    calls: WalletExecutionCall[] | null,
    localPrivateKey: `0x${string}` | null,
  ): AAProviderState<TAA> {
    const resolved = resolvePimlicoConfig({
      calls,
      localPrivateKey,
      accountAbstractionConfig,
      chainsById,
      rpcUrl,
      publicOnly: true,
    });

    const params = resolved
      ? ({
          enabled: true,
          apiKey: resolved.apiKey,
          chain: resolved.chain,
          mode: resolved.mode,
          rpcUrl: resolved.rpcUrl,
        } satisfies PimlicoHookParams)
      : undefined;

    const query = usePimlicoAA(params) as TQuery;

    return {
      plan: resolved?.plan ?? null,
      query,
      AA: query.AA,
      isPending: Boolean(resolved && query.isPending),
      error: query.error ?? null,
    };
  };
}
