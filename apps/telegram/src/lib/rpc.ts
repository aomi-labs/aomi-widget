import type { Chain } from "viem";
import { http } from "wagmi";

const ALCHEMY_NETWORK_BY_CHAIN_ID: Record<number, string> = {
  1: "eth-mainnet",
  137: "polygon-mainnet",
  42161: "arb-mainnet",
  10: "opt-mainnet",
  8453: "base-mainnet",
};

function getAlchemyRpcUrl(chainId: number): string | undefined {
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY?.trim();
  const network = ALCHEMY_NETWORK_BY_CHAIN_ID[chainId];
  if (!apiKey || !network) return undefined;
  return `https://${network}.g.alchemy.com/v2/${apiKey}`;
}

export function getPreferredRpcUrl(chain: Chain): string {
  return getAlchemyRpcUrl(chain.id) ?? chain.rpcUrls.default.http[0];
}

export function getPreferredTransport(chain: Chain) {
  return http(getPreferredRpcUrl(chain));
}
