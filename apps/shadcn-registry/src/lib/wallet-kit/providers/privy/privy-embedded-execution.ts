"use client";

import type { Hex } from "viem";

/**
 * The slice of Privy's `ConnectedWallet` the embedded EOA execution path uses.
 * Narrow on purpose: the tests build one from a couple of stubs.
 */
export type PrivyEmbeddedEvmWallet = {
  address: string;
  /** CAIP-2, e.g. `eip155:8453`. */
  chainId?: string;
  switchChain: (chainId: `0x${string}` | number) => Promise<void>;
  getEthereumProvider: () => Promise<{
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  }>;
};

/** `eip155:8453` -> `8453`. Undefined for anything that isn't an EVM CAIP-2. */
export function parseCaip2EvmChainId(
  caip2: string | undefined,
): number | undefined {
  if (!caip2) return undefined;
  const [namespace, reference] = caip2.split(":");
  if (namespace !== "eip155") return undefined;
  const chainId = Number(reference);
  return Number.isInteger(chainId) && chainId > 0 ? chainId : undefined;
}

function toQuantity(value: bigint): Hex {
  return `0x${value.toString(16)}`;
}

/**
 * Put the embedded wallet on `chainId` if it isn't already.
 *
 * Privy pins a provider to the chain it was built on and does not migrate
 * existing instances, so callers must re-request `getEthereumProvider()`
 * afterwards — `sendPrivyEmbeddedTransaction` does exactly that.
 */
export async function switchPrivyEmbeddedChain(
  wallet: PrivyEmbeddedEvmWallet,
  chainId: number,
): Promise<void> {
  if (parseCaip2EvmChainId(wallet.chainId) === chainId) return;
  await wallet.switchChain(chainId);
}

/**
 * Broadcast one call from Privy's embedded EOA.
 *
 * This is the path the portal takes for every Privy user without a client
 * smart account. Without it the kit had no EVM send for the embedded wallet
 * at all: the request fell through to a wagmi connector that was never
 * connected, threw, and was rejected before any Privy prompt could appear.
 */
export async function sendPrivyEmbeddedTransaction({
  wallet,
  owner,
  chainId,
  to,
  value,
  data,
}: {
  wallet: PrivyEmbeddedEvmWallet;
  owner: string;
  chainId: number;
  to: Hex;
  value: bigint;
  data?: Hex;
}): Promise<string> {
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error("The active Privy EOA is not the requested sender");
  }
  await switchPrivyEmbeddedChain(wallet, chainId);
  const provider = await wallet.getEthereumProvider();
  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: owner,
        to,
        value: toQuantity(value),
        ...(data ? { data } : {}),
      },
    ],
  });
  if (typeof hash !== "string") {
    throw new Error("Privy returned an invalid transaction hash");
  }
  return hash;
}
