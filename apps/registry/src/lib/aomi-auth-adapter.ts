"use client";

import { useMemo } from "react";
import {
  useAccount as useParaAccount,
  useModal,
} from "@getpara/react-sdk";
import type { Chain } from "viem";
import {
  useAccount as useWagmiAccount,
  useConfig,
  useSendTransaction,
  useSignTypedData,
  useSwitchChain,
} from "wagmi";
import type {
  WalletEip712Payload,
  WalletTxPayload,
} from "@aomi-labs/react";
import {
  DISABLED_PROVIDER_STATE,
  executeWalletCalls,
  toAAWalletCall,
} from "@aomi-labs/react";
import {
  AOMI_AUTH_BOOTING_IDENTITY,
  AOMI_AUTH_DISCONNECTED_IDENTITY,
  formatAddress,
  formatAuthProvider,
  inferAuthProvider,
  type AomiAuthIdentity,
} from "./auth-identity";

type ParaAccountShape = {
  isLoading: boolean;
  isConnected: boolean;
  embedded: {
    email?: string;
    farcasterUsername?: string;
    telegramUserId?: string;
    authMethods?: Set<unknown>;
    wallets?: Array<{ address?: string }>;
  };
  external: {
    evm?: {
      address?: string;
      chainId?: number | string;
    };
  };
};

type WagmiAccountShape = {
  address?: `0x${string}`;
  chainId?: number;
  isConnected: boolean;
};

type WagmiConfigShape = {
  chains: readonly Chain[];
};

function getPreferredRpcUrl(chain: Chain): string {
  return chain.rpcUrls.default.http[0]
    ?? chain.rpcUrls.public?.http[0]
    ?? "";
}

export type AomiAuthAdapter = {
  identity: AomiAuthIdentity;
  isReady: boolean;
  isSwitchingChain: boolean;
  canConnect: boolean;
  canManageAccount: boolean;
  connect: () => Promise<void>;
  manageAccount: () => Promise<void>;
  switchChain?: (chainId: number) => Promise<void>;
  sendTransaction?: (
    payload: WalletTxPayload,
  ) => Promise<{ txHash: string; amount?: string }>;
  signTypedData?: (
    payload: WalletEip712Payload,
  ) => Promise<{ signature: string }>;
};

const DISCONNECTED_PARA_ACCOUNT: ParaAccountShape = {
  isLoading: false,
  isConnected: false,
  embedded: {},
  external: {},
};

const DISCONNECTED_WAGMI_ACCOUNT: WagmiAccountShape = {
  address: undefined,
  chainId: undefined,
  isConnected: false,
};

const DISCONNECTED_WAGMI_CONFIG: WagmiConfigShape = {
  chains: [],
};

function useSafeParaAccount(): ParaAccountShape {
  try {
    return useParaAccount() as ParaAccountShape;
  } catch {
    return DISCONNECTED_PARA_ACCOUNT;
  }
}

function useSafeParaModal(): { openModal: (args?: { step?: string }) => void } | null {
  try {
    return useModal() as { openModal: (args?: { step?: string }) => void };
  } catch {
    return null;
  }
}

function useSafeWagmiAccount(): WagmiAccountShape {
  try {
    return useWagmiAccount() as WagmiAccountShape;
  } catch {
    return DISCONNECTED_WAGMI_ACCOUNT;
  }
}

function useSafeWagmiConfig(): WagmiConfigShape {
  try {
    const config = useConfig();
    return {
      chains: config.chains ?? [],
    };
  } catch {
    return DISCONNECTED_WAGMI_CONFIG;
  }
}

function useSafeSwitchChain(): {
  switchChain?: (args: { chainId: number }) => void;
  switchChainAsync?: (args: { chainId: number }) => Promise<unknown>;
  isPending: boolean;
} {
  try {
    const result = useSwitchChain();
    return {
      switchChain: result.switchChain,
      switchChainAsync: result.switchChainAsync,
      isPending: result.isPending,
    };
  } catch {
    return {
      switchChain: undefined,
      switchChainAsync: undefined,
      isPending: false,
    };
  }
}

function useSafeSendTransaction(): {
  sendTransactionAsync?: (args: {
    chainId?: number;
    to: `0x${string}`;
    value?: bigint;
    data?: `0x${string}`;
  }) => Promise<string>;
} {
  try {
    return useSendTransaction() as {
      sendTransactionAsync?: (args: {
        chainId?: number;
        to: `0x${string}`;
        value?: bigint;
        data?: `0x${string}`;
      }) => Promise<string>;
    };
  } catch {
    return { sendTransactionAsync: undefined };
  }
}

function useSafeSignTypedData(): {
  signTypedDataAsync?: (args: unknown) => Promise<string>;
} {
  try {
    return useSignTypedData() as {
      signTypedDataAsync?: (args: unknown) => Promise<string>;
    };
  } catch {
    return { signTypedDataAsync: undefined };
  }
}

export function useAomiAuthAdapter(): AomiAuthAdapter {
  const paraAccount = useSafeParaAccount();
  const paraModal = useSafeParaModal();
  const {
    address: wagmiAddress,
    chainId,
    isConnected: wagmiConnected,
  } = useSafeWagmiAccount();
  const { switchChainAsync, isPending } = useSafeSwitchChain();
  const { sendTransactionAsync } = useSafeSendTransaction();
  const { signTypedDataAsync } = useSafeSignTypedData();
  const wagmiConfig = useSafeWagmiConfig();

  const chainsById = useMemo<Record<number, Chain>>(
    () =>
      Object.fromEntries(
        (wagmiConfig.chains ?? []).map((chain) => [chain.id, chain]),
      ),
    [wagmiConfig.chains],
  );

  return useMemo(() => {
    const isConnected = Boolean(paraAccount.isConnected || wagmiConnected);
    const isBooting = paraAccount.isLoading && !isConnected;

    const embeddedPrimary =
      paraAccount.embedded.email
      ?? paraAccount.embedded.farcasterUsername
      ?? paraAccount.embedded.telegramUserId
      ?? undefined;
    const embeddedWallet = paraAccount.embedded.wallets?.[0] as
      | { address?: string }
      | undefined;
    const embeddedAddress = embeddedWallet?.address;
    const externalAddress = paraAccount.external.evm?.address;
    const address = wagmiAddress ?? externalAddress ?? embeddedAddress ?? undefined;
    const authProvider = inferAuthProvider(paraAccount.embedded.authMethods);
    const providerLabel = formatAuthProvider(authProvider);

    const identity: AomiAuthIdentity = isBooting
      ? {
          ...AOMI_AUTH_BOOTING_IDENTITY,
          chainId: chainId ?? undefined,
        }
      : isConnected && embeddedPrimary
        ? {
            status: "connected",
            isConnected: true,
            address,
            chainId: chainId ?? undefined,
            authProvider,
            primaryLabel: embeddedPrimary,
            secondaryLabel: providerLabel,
          }
        : isConnected && address
          ? {
              status: "connected",
              isConnected: true,
              address,
              chainId: chainId ?? undefined,
              authProvider,
              primaryLabel: formatAddress(address) ?? "Connected wallet",
              secondaryLabel: undefined,
            }
          : {
              ...AOMI_AUTH_DISCONNECTED_IDENTITY,
              chainId: chainId ?? undefined,
              authProvider,
            };

    return {
      identity,
      isReady: !isBooting,
      isSwitchingChain: isPending,
      canConnect: Boolean(paraModal) && !identity.isConnected,
      canManageAccount: Boolean(paraModal) && identity.isConnected,
      connect: async () => {
        paraModal?.openModal({ step: "AUTH_MAIN" });
      },
      manageAccount: async () => {
        paraModal?.openModal({ step: "ACCOUNT_MAIN" });
      },
      switchChain: switchChainAsync
        ? async (nextChainId: number) => {
            await switchChainAsync({ chainId: nextChainId });
          }
        : undefined,
      sendTransaction: sendTransactionAsync
        ? async (payload: WalletTxPayload) => {
            if (!payload.to) {
              throw new Error("pending_transaction_missing_call_data");
            }

            const call = toAAWalletCall(payload, payload.chainId ?? chainId ?? 1);
            const execution = await executeWalletCalls({
              callList: [call],
              currentChainId: chainId ?? call.chainId,
              capabilities: undefined,
              localPrivateKey: null,
              providerState: DISABLED_PROVIDER_STATE,
              sendCallsSyncAsync: async () => {
                throw new Error("wallet_send_calls_not_supported");
              },
              sendTransactionAsync: async ({
                chainId: txChainId,
                to,
                value,
                data,
              }) => {
                return sendTransactionAsync({
                  chainId: txChainId,
                  to,
                  value,
                  data,
                });
              },
              switchChainAsync: switchChainAsync
                ? async ({ chainId: nextChainId }) => {
                    await switchChainAsync({ chainId: nextChainId });
                  }
                : async () => {
                    throw new Error("wallet_switch_chain_not_supported");
                  },
              chainsById,
              getPreferredRpcUrl,
            });

            return {
              txHash: execution.txHash,
              amount: payload.value,
            };
          }
        : undefined,
      signTypedData: signTypedDataAsync
        ? async (payload: WalletEip712Payload) => {
            const signature = await signTypedDataAsync(payload as never);
            return { signature };
          }
        : undefined,
    };
  }, [
    chainId,
    isPending,
    paraAccount.embedded,
    paraAccount.external,
    paraAccount.isConnected,
    paraAccount.isLoading,
    paraModal,
    chainsById,
    sendTransactionAsync,
    signTypedDataAsync,
    switchChainAsync,
    wagmiAddress,
    wagmiConnected,
  ]);
}
