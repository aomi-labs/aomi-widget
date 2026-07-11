import type { Chain } from "viem";

import type { AAProvider } from "./types";
import { createAlchemyAAState } from "./alchemy/create";
import type { AAOwner } from "./owner";
import type { AAMode, AAState, AAWalletCall } from "./types";

export type { AAOwner } from "./owner";

export interface CreateAAStateOptions {
  provider: AAProvider;
  chain: Chain;
  owner: AAOwner;
  rpcUrl: string;
  callList: AAWalletCall[];
  mode?: AAMode;
  apiKey?: string;
  gasPolicyId?: string;
  sponsored?: boolean;
  /** Backend proxy base URL for Alchemy. Used when apiKey is omitted. */
  proxyBaseUrl?: string;
  /** Bearer presented to the (thread-authed) proxy. */
  proxyBearer?: string;
}

// ---------------------------------------------------------------------------
// Unified Creator
// ---------------------------------------------------------------------------

/**
 * Creates an AA state by instantiating the Alchemy smart account via
 * `@getpara/aa-alchemy` (Alchemy is the only provider; server-side AA and the
 * backend `/api/aa/v1/:chain_slug` proxy are Alchemy-shaped).
 */
export async function createAAProviderState(
  options: CreateAAStateOptions,
): Promise<AAState> {
  return createAlchemyAAState({
    chain: options.chain,
    owner: options.owner,
    rpcUrl: options.rpcUrl,
    callList: options.callList,
    mode: options.mode,
    apiKey: options.apiKey,
    gasPolicyId: options.gasPolicyId,
    sponsored: options.sponsored,
    proxyBaseUrl: options.proxyBaseUrl,
    proxyBearer: options.proxyBearer,
  });
}
