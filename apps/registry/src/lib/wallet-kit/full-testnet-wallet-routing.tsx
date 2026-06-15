"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import type { Chain } from "viem";
import { useAccount, useSwitchChain } from "wagmi";

export {
  isFullTestnet,
  parseRpcOverrides,
  useFullTestnet,
} from "./full-testnet-config";

type FullTestnetWalletRouterProps = {
  enabled: boolean;
  chains: readonly Chain[];
  routedChainIds: ReadonlySet<number>;
  logLabel?: string;
  children?: ReactNode;
};

export function FullTestnetWalletRouter({
  enabled,
  chains,
  routedChainIds,
  logLabel = "FullTestnetWalletRouter",
  children,
}: FullTestnetWalletRouterProps) {
  const { isConnected, chainId, connector } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const attemptedChainIdsRef = useRef(new Set<number>());
  const chainsById = useMemo(
    () => Object.fromEntries(chains.map((chain) => [chain.id, chain])),
    [chains],
  ) as Record<number, Chain>;

  useEffect(() => {
    if (!enabled || !isConnected || !chainId || !routedChainIds.has(chainId)) {
      return;
    }
    if (attemptedChainIdsRef.current.has(chainId)) {
      return;
    }

    attemptedChainIdsRef.current.add(chainId);

    const ensureWalletOnChain = async () => {
      const chain = chainsById[chainId];
      if (!chain) return;

      try {
        const provider = await connector?.getProvider();
        if (provider && typeof provider === "object" && "request" in provider) {
          try {
            await (
              provider as {
                request: (args: {
                  method: string;
                  params?: unknown[];
                }) => Promise<unknown>;
              }
            ).request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${chain.id.toString(16)}`,
                  chainName: chain.name,
                  nativeCurrency: chain.nativeCurrency,
                  rpcUrls: chain.rpcUrls.default.http,
                  blockExplorerUrls: chain.blockExplorers?.default?.url
                    ? [chain.blockExplorers.default.url]
                    : undefined,
                },
              ],
            });
          } catch (error) {
            console.info(`[${logLabel}] wallet_addEthereumChain result`, error);
          }
        }

        if (switchChainAsync) {
          await switchChainAsync({ chainId });
        }
      } catch (error) {
        console.error(
          `[${logLabel}] Failed to route wallet for chain ${chainId}`,
          error,
        );
      }
    };

    void ensureWalletOnChain();
  }, [
    chainId,
    chainsById,
    connector,
    enabled,
    isConnected,
    logLabel,
    routedChainIds,
    switchChainAsync,
  ]);

  return <>{children}</>;
}
