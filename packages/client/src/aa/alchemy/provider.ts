import type { Chain } from "viem";

import type {
  AAConfig,
  AAMode,
  AAResolvedConfig,
  AAState,
  SmartAccount,
  AAWalletCall,
} from "../types";
import { DEFAULT_AA_CONFIG, getAAChainConfig, buildAAExecutionPlan } from "../types";

export interface AlchemyHookParams {
  enabled: boolean;
  apiKey: string;
  chain: Chain;
  rpcUrl: string;
  gasPolicyId?: string;
  mode: AAMode;
}

type AlchemyHookState<TAccount extends SmartAccount = SmartAccount> = {
  account?: TAccount | null;
  pending?: boolean;
  error?: Error | null;
};

export type UseAlchemyAAHook<TAccount extends SmartAccount = SmartAccount> = (
  params?: AlchemyHookParams,
) => AlchemyHookState<TAccount>;

export interface CreateAlchemyAAProviderOptions<
  TAccount extends SmartAccount = SmartAccount,
> {
  accountAbstractionConfig?: AAConfig;
  useAlchemyAA: UseAlchemyAAHook<TAccount>;
  chainsById: Record<number, Chain>;
  chainSlugById: Record<number, string>;
  getPreferredRpcUrl: (chain: Chain) => string;
  apiKeyEnvVar?: string;
  gasPolicyEnvVar?: string;
}

/**
 * Resolve Alchemy config for the React hook path (public env vars only).
 */
function resolveForHook(params: {
  calls: AAWalletCall[] | null;
  localPrivateKey: `0x${string}` | null;
  accountAbstractionConfig: AAConfig;
  chainsById: Record<number, Chain>;
  chainSlugById: Record<number, string>;
  getPreferredRpcUrl: (chain: Chain) => string;
}): (AAResolvedConfig & { apiKey: string; chain: Chain; rpcUrl: string; gasPolicyId?: string }) | null {
  const { calls, localPrivateKey, accountAbstractionConfig, chainsById, getPreferredRpcUrl } = params;

  if (!calls || localPrivateKey) return null;

  const config = { ...accountAbstractionConfig, provider: "alchemy" as const };
  const chainConfig = getAAChainConfig(config, calls, chainsById);
  if (!chainConfig) return null;

  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY?.trim();
  if (!apiKey) return null;

  const chain = chainsById[chainConfig.chainId];
  if (!chain) return null;

  const gasPolicyId = process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID?.trim();
  const resolved = buildAAExecutionPlan(config, chainConfig);

  return {
    ...resolved,
    apiKey,
    chain,
    rpcUrl: getPreferredRpcUrl(chain),
    gasPolicyId,
    mode: chainConfig.defaultMode,
  };
}

export function createAlchemyAAProvider<
  TAccount extends SmartAccount = SmartAccount,
>({
  accountAbstractionConfig = DEFAULT_AA_CONFIG,
  useAlchemyAA,
  chainsById,
  chainSlugById,
  getPreferredRpcUrl,
}: CreateAlchemyAAProviderOptions<TAccount>) {
  return function useAlchemyAAProvider(
    calls: AAWalletCall[] | null,
    localPrivateKey: `0x${string}` | null,
  ): AAState<TAccount> {
    const resolved = resolveForHook({
      calls,
      localPrivateKey,
      accountAbstractionConfig,
      chainsById,
      chainSlugById,
      getPreferredRpcUrl,
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

    const query = useAlchemyAA(params);

    return {
      resolved: resolved ?? null,
      account: query.account,
      pending: Boolean(resolved && query.pending),
      error: query.error ?? null,
    };
  };
}
