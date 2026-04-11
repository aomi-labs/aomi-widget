import type { Chain } from "viem";

import type {
  AAConfig,
  AAMode,
  AAState,
  SmartAccount,
  WalletCall,
} from "../types";
import { DEFAULT_AA_CONFIG } from "../types";
import { resolvePimlicoConfig } from "./resolve";

export interface PimlicoHookParams {
  enabled: boolean;
  apiKey: string;
  chain: Chain;
  mode: AAMode;
  rpcUrl?: string;
}

type PimlicoHookState<TAccount extends SmartAccount = SmartAccount> = {
  account?: TAccount | null;
  pending?: boolean;
  error?: Error | null;
};

export type UsePimlicoAAHook<TAccount extends SmartAccount = SmartAccount> = (
  params?: PimlicoHookParams,
) => PimlicoHookState<TAccount>;

export interface CreatePimlicoAAProviderOptions<
  TAccount extends SmartAccount = SmartAccount,
> {
  accountAbstractionConfig?: AAConfig;
  usePimlicoAA: UsePimlicoAAHook<TAccount>;
  chainsById: Record<number, Chain>;
  apiKeyEnvVar?: string;
  rpcUrl?: string;
}

export function createPimlicoAAProvider<
  TAccount extends SmartAccount = SmartAccount,
>({
  accountAbstractionConfig = DEFAULT_AA_CONFIG,
  usePimlicoAA,
  chainsById,
  rpcUrl,
}: CreatePimlicoAAProviderOptions<TAccount>) {
  return function usePimlicoAAProvider(
    calls: WalletCall[] | null,
    localPrivateKey: `0x${string}` | null,
  ): AAState<TAccount> {
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

    const query = usePimlicoAA(params);

    return {
      resolved: resolved ?? null,
      account: query.account,
      pending: Boolean(resolved && query.pending),
      error: query.error ?? null,
    };
  };
}
