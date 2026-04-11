import type { Chain } from "viem";

import type { AAProvider } from "./env";
import { createAlchemyAAState } from "./alchemy/create";
import { createPimlicoAAState } from "./pimlico/create";
import type { AAOwner } from "./owner";
import type { AAMode, AAState, WalletCall } from "./types";

export type { AAOwner } from "./owner";

export interface CreateAAStateOptions {
  provider: AAProvider;
  chain: Chain;
  owner: AAOwner;
  rpcUrl: string;
  callList: WalletCall[];
  mode?: AAMode;
  apiKey?: string;
  gasPolicyId?: string;
  sponsored?: boolean;
}

// ---------------------------------------------------------------------------
// Unified Creator
// ---------------------------------------------------------------------------

/**
 * Creates an AA state by instantiating the appropriate smart account via
 * `@getpara/aa-alchemy` or `@getpara/aa-pimlico`.
 */
export async function createAAProviderState(
  options: CreateAAStateOptions,
): Promise<AAState> {
  if (options.provider === "alchemy") {
    return createAlchemyAAState({
      chain: options.chain,
      owner: options.owner,
      rpcUrl: options.rpcUrl,
      callList: options.callList,
      mode: options.mode,
      apiKey: options.apiKey,
      gasPolicyId: options.gasPolicyId,
      sponsored: options.sponsored,
    });
  }

  return createPimlicoAAState({
    chain: options.chain,
    owner: options.owner,
    rpcUrl: options.rpcUrl,
    callList: options.callList,
    mode: options.mode,
    apiKey: options.apiKey,
  });
}
