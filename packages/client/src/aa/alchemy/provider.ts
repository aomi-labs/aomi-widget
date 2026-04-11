import type { Chain } from "viem";

import type {
  AAConfig,
  AAMode,
  AAState,
  SmartAccount,
  WalletCall,
} from "../types";
import { DEFAULT_AA_CONFIG } from "../types";
import { resolveAlchemyConfig } from "./resolve";

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
    calls: WalletCall[] | null,
    localPrivateKey: `0x${string}` | null,
  ): AAState<TAccount> {
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

    const query = useAlchemyAA(params);

    return {
      resolved: resolved ?? null,
      account: query.account,
      pending: Boolean(resolved && query.pending),
      error: query.error ?? null,
    };
  };
}
