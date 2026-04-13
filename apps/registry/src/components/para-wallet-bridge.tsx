"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import ParaWeb, {
  ParaEvent,
  getClient,
  setIsOpen,
} from "@getpara/react-sdk";
import {
  useAccount,
  useSendTransaction,
  useSignTypedData,
  useSwitchChain,
} from "wagmi";
import {
  toViemSignTypedDataArgs,
  type WalletEip712Payload,
  type WalletTxPayload,
} from "@aomi-labs/react";
import type { AccountIdentity } from "../lib/account-identity";
import { formatAddress } from "../lib/account-identity";
import {
  WalletAdapterContext,
  DISCONNECTED_ADAPTER,
  type WalletAdapter,
} from "../lib/aomi-wallet-adapter";

const useLocalhost = process.env.NEXT_PUBLIC_USE_LOCALHOST === "true";
const LOCALHOST_CHAIN_ID = 31337;

function parseChainId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.startsWith("0x")) {
    const parsedHex = Number.parseInt(trimmed.slice(2), 16);
    return Number.isFinite(parsedHex) ? parsedHex : undefined;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function LocalhostNetworkEnforcer({ children }: { children: ReactNode }) {
  const { isConnected, chainId, connector } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (!useLocalhost) return;
    if (!isConnected || chainId === LOCALHOST_CHAIN_ID) return;

    void (async () => {
      try {
        const provider = await connector?.getProvider();
        if (provider && typeof provider === "object" && "request" in provider) {
          const ethProvider = provider as {
            request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
          };
          try {
            await ethProvider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${LOCALHOST_CHAIN_ID.toString(16)}`,
                  chainName: "Localhost",
                  nativeCurrency: {
                    name: "Ether",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: ["http://127.0.0.1:8545"],
                },
              ],
            });
          } catch {
            // Chain may already be configured in the wallet.
          }
        }

        switchChain({ chainId: LOCALHOST_CHAIN_ID });
      } catch (error) {
        console.error("[ParaWalletBridge] Failed to switch localhost:", error);
      }
    })();
  }, [chainId, connector, isConnected, switchChain]);

  return <>{children}</>;
}

function useParaAuthState(paraClient: ParaWeb | null) {
  const [paraAddress, setParaAddress] = useState<string | undefined>();
  const [paraEmail, setParaEmail] = useState<string | undefined>();
  const [paraLoggedIn, setParaLoggedIn] = useState(false);

  const syncState = useCallback(async () => {
    if (!paraClient) return;
    try {
      const loggedIn = await paraClient.isFullyLoggedIn();
      setParaLoggedIn(loggedIn);
      if (loggedIn) {
        const wallets = paraClient.getWallets();
        const firstWallet = Object.values(wallets).find(
          (wallet) => wallet.address && wallet.type === "EVM",
        );
        setParaAddress(firstWallet?.address ?? undefined);
        setParaEmail(paraClient.getEmail() ?? undefined);
      } else {
        setParaAddress(undefined);
        setParaEmail(undefined);
      }
    } catch {
      // Session check may fail if no session exists.
    }
  }, [paraClient]);

  useEffect(() => {
    void syncState();
  }, [syncState]);

  useEffect(() => {
    if (typeof window === "undefined" || !paraClient) return;

    const handler = () => {
      void syncState();
    };

    const events = [
      ParaEvent.LOGIN_EVENT,
      ParaEvent.LOGOUT_EVENT,
      ParaEvent.ACCOUNT_SETUP_EVENT,
      ParaEvent.ACCOUNT_CREATION_EVENT,
      ParaEvent.WALLETS_CHANGE_EVENT,
    ];

    for (const event of events) {
      window.addEventListener(event, handler);
    }

    return () => {
      for (const event of events) {
        window.removeEventListener(event, handler);
      }
    };
  }, [paraClient, syncState]);

  return { paraAddress, paraEmail, paraLoggedIn };
}

function useParaClient(): ParaWeb | null {
  const [client, setClient] = useState<ParaWeb | null>(() => {
    try {
      return (getClient() as ParaWeb) ?? null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (client) return;

    let cancelled = false;
    const interval = setInterval(() => {
      try {
        const nextClient = getClient() as ParaWeb | null;
        if (nextClient && !cancelled) {
          setClient(nextClient);
          clearInterval(interval);
        }
      } catch {
        // Store not ready yet.
      }
    }, 150);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [client]);

  return client;
}

export function ParaWalletBridge({
  children,
  onOpenModal,
}: {
  children: ReactNode;
  onOpenModal?: (step: "AUTH_MAIN" | "ACCOUNT_MAIN") => void;
}) {
  const paraClient = useParaClient();
  const { address: wagmiAddress, chainId, isConnected: wagmiConnected } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { signTypedDataAsync } = useSignTypedData();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const { paraAddress, paraEmail, paraLoggedIn } = useParaAuthState(paraClient);

  const effectiveAddress = wagmiConnected && wagmiAddress ? wagmiAddress : paraAddress;
  const effectiveConnected = wagmiConnected || paraLoggedIn;
  const isParaAuth = !wagmiConnected && paraLoggedIn;

  const identity = useMemo<AccountIdentity>(() => {
    if (effectiveConnected && effectiveAddress) {
      if (isParaAuth && paraEmail) {
        return {
          kind: "social",
          isConnected: true,
          address: effectiveAddress,
          chainId: chainId ?? undefined,
          authProvider: "google",
          primaryLabel: paraEmail,
          secondaryLabel: "Google",
        };
      }

      return {
        kind: "wallet",
        isConnected: true,
        address: effectiveAddress,
        chainId: chainId ?? undefined,
        authProvider: undefined,
        primaryLabel: formatAddress(effectiveAddress) ?? "Connected wallet",
      };
    }

    return {
      ...DISCONNECTED_ADAPTER.identity,
      chainId: chainId ?? undefined,
    };
  }, [chainId, effectiveAddress, effectiveConnected, isParaAuth, paraEmail]);

  const adapter = useMemo<WalletAdapter>(() => {
    return {
      identity,
      isReady: Boolean(paraClient),
      isSwitchingChain,
      canConnect: Boolean(paraClient),
      canManageAccount: effectiveConnected,
      connect: async () => {
        if (onOpenModal) {
          onOpenModal("AUTH_MAIN");
          return;
        }
        setIsOpen(true);
      },
      manageAccount: async () => {
        if (onOpenModal) {
          onOpenModal("ACCOUNT_MAIN");
          return;
        }
        setIsOpen(true);
      },
      switchChain: switchChainAsync
        ? async (nextChainId: number) => {
            await switchChainAsync({ chainId: nextChainId });
          }
        : undefined,
      sendTransaction: sendTransactionAsync
        ? async (payload: WalletTxPayload) => {
            if (
              payload.chainId &&
              payload.chainId !== chainId &&
              switchChainAsync
            ) {
              await switchChainAsync({ chainId: payload.chainId });
            }

            const txHash = await sendTransactionAsync({
              to: payload.to as `0x${string}`,
              value: payload.value ? BigInt(payload.value) : undefined,
              data:
                payload.data && payload.data !== "0x"
                  ? (payload.data as `0x${string}`)
                  : undefined,
            });

            return {
              txHash,
              amount: payload.value,
            };
          }
        : undefined,
      signTypedData: signTypedDataAsync
        ? async (payload: WalletEip712Payload) => {
            const signArgs = toViemSignTypedDataArgs(payload);
            if (!signArgs) {
              throw new Error("Missing typed_data payload");
            }

            const requestChainId = parseChainId(signArgs.domain?.chainId);
            if (
              requestChainId &&
              requestChainId !== chainId &&
              switchChainAsync
            ) {
              await switchChainAsync({ chainId: requestChainId });
            }

            const signature = await signTypedDataAsync(signArgs as never);
            return { signature };
          }
        : undefined,
    };
  }, [
    chainId,
    effectiveConnected,
    identity,
    isSwitchingChain,
    onOpenModal,
    paraClient,
    sendTransactionAsync,
    signTypedDataAsync,
    switchChainAsync,
  ]);

  return (
    <WalletAdapterContext.Provider value={adapter}>
      <LocalhostNetworkEnforcer>{children}</LocalhostNetworkEnforcer>
    </WalletAdapterContext.Provider>
  );
}
