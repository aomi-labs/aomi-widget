"use client";

import { useMemo, type ReactNode } from "react";
import {
  useAccount as useParaAccount,
  useModal,
} from "@getpara/react-sdk";
import {
  useAccount as useWagmiAccount,
  useSendTransaction,
  useSignTypedData,
  useSwitchChain,
} from "wagmi";
import type { WalletEip712Payload, WalletTxPayload } from "@aomi-labs/react";
import { AomiAuthAdapterContext } from "../context";
import {
  AOMI_AUTH_BOOTING_IDENTITY,
  AOMI_AUTH_DISCONNECTED_IDENTITY,
  type AomiAuthAdapter,
  type AomiAuthIdentity,
} from "../types";
import {
  formatAddress,
  formatAuthProvider,
  inferAuthProvider,
} from "../auth-identity";

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

function useSafeParaAccount(): ParaAccountShape {
  try {
    return useParaAccount() as ParaAccountShape;
  } catch {
    return DISCONNECTED_PARA_ACCOUNT;
  }
}

function useSafeParaModal(): {
  openModal: (args?: { step?: string }) => void;
} | null {
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

function useSafeSwitchChain(): {
  switchChainAsync?: (args: { chainId: number }) => Promise<unknown>;
  isPending: boolean;
} {
  try {
    const result = useSwitchChain();
    return {
      switchChainAsync: result.switchChainAsync,
      isPending: result.isPending,
    };
  } catch {
    return { switchChainAsync: undefined, isPending: false };
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

function useParaAuthAdapter(): AomiAuthAdapter {
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

  return useMemo(() => {
    const isConnected = Boolean(paraAccount.isConnected || wagmiConnected);
    const isBooting = paraAccount.isLoading && !isConnected;

    const embeddedPrimary =
      paraAccount.embedded.email ??
      paraAccount.embedded.farcasterUsername ??
      paraAccount.embedded.telegramUserId ??
      undefined;
    const embeddedWallet = paraAccount.embedded.wallets?.[0] as
      | { address?: string }
      | undefined;
    const embeddedAddress = embeddedWallet?.address;
    const externalAddress = paraAccount.external.evm?.address;
    const address =
      wagmiAddress ?? externalAddress ?? embeddedAddress ?? undefined;
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
            const txHash = await sendTransactionAsync({
              chainId: payload.chainId,
              to: payload.to as `0x${string}`,
              value: payload.value ? BigInt(payload.value) : undefined,
              data:
                payload.data && payload.data !== "0x"
                  ? (payload.data as `0x${string}`)
                  : undefined,
            });
            return { txHash, amount: payload.value };
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
    sendTransactionAsync,
    signTypedDataAsync,
    switchChainAsync,
    wagmiAddress,
    wagmiConnected,
  ]);
}

/**
 * Provides the Aomi auth adapter for apps using Para (social/embedded wallets)
 * with Wagmi EVM support.
 *
 * Wrap your app with Para's `ParaProvider` and Wagmi's `WagmiProvider` first,
 * then wrap with this to bridge them into the Aomi auth context.
 */
export function AomiParaProvider({ children }: { children: ReactNode }) {
  const adapter = useParaAuthAdapter();

  return (
    <AomiAuthAdapterContext.Provider value={adapter}>
      {children}
    </AomiAuthAdapterContext.Provider>
  );
}
