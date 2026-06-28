"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { http, type Chain, type Transport } from "viem";
import { useAccount, useSwitchChain } from "wagmi";

const FULL_TESTNET_ENABLED =
  process.env.NEXT_PUBLIC_USE_FULL_TESTNET === "true";
const FULL_TESTNET_RPC_MAP_RAW =
  process.env.NEXT_PUBLIC_FULL_TESTNET_RPC_MAP?.trim() ?? "";

function parseRpcOverrides(raw: string): Record<number, string> {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  const overrides: Record<number, string> = {};
  const writeOverride = (chainIdRaw: string, rpcUrlRaw: string) => {
    const chainId = Number(chainIdRaw.trim());
    const rpcUrl = rpcUrlRaw.trim();
    if (!Number.isInteger(chainId) || chainId <= 0 || !rpcUrl) return;

    try {
      overrides[chainId] = new URL(rpcUrl).toString();
    } catch {
      // Ignore malformed URLs so one bad env entry does not break the app.
    }
  };

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      for (const [chainId, rpcUrl] of Object.entries(parsed ?? {})) {
        if (typeof rpcUrl === "string") {
          writeOverride(chainId, rpcUrl);
        }
      }
    } catch {
      return {};
    }
    return overrides;
  }

  for (const part of trimmed.split(",")) {
    const [chainId, ...rpcUrlParts] = part.split("=");
    if (!chainId || rpcUrlParts.length === 0) continue;
    writeOverride(chainId, rpcUrlParts.join("="));
  }

  return overrides;
}

const FULL_TESTNET_RPC_OVERRIDES = parseRpcOverrides(FULL_TESTNET_RPC_MAP_RAW);

export function isFullTestnet(): boolean {
  return (
    FULL_TESTNET_ENABLED && Object.keys(FULL_TESTNET_RPC_OVERRIDES).length > 0
  );
}

export function useFullTestnet<T extends readonly [Chain, ...Chain[]]>(
  chains: T,
) {
  return useMemo(() => {
    const enabled = isFullTestnet();
    const routedChains = (enabled
      ? chains.map((chain) => {
          const rpcUrl = FULL_TESTNET_RPC_OVERRIDES[chain.id];
          if (!rpcUrl) return chain;

          return {
            ...chain,
            rpcUrls: {
              ...chain.rpcUrls,
              default: {
                ...chain.rpcUrls.default,
                http: [rpcUrl],
              },
              public: chain.rpcUrls.public
                ? {
                    ...chain.rpcUrls.public,
                    http: [rpcUrl],
                  }
                : {
                    http: [rpcUrl],
                  },
            },
          };
        })
      : chains) as unknown as T;

    return {
      enabled,
      routedChains,
      routedChainIds: new Set(
        Object.keys(FULL_TESTNET_RPC_OVERRIDES).map(Number),
      ) as ReadonlySet<number>,
      transports: Object.fromEntries(
        routedChains.map((chain) => [
          chain.id,
          http(chain.rpcUrls.default.http[0]),
        ]),
      ) as Record<number, Transport>,
    };
  }, [chains]);
}

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
