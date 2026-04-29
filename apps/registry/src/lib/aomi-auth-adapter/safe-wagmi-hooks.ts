"use client";

import type { Chain } from "viem";
import {
  useAccount,
  useCapabilities,
  useConfig,
  useConnect,
  useConnectors,
  useDisconnect,
  useSendCallsSync,
  useSendTransaction,
  useSignTypedData,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import type { executeWalletCalls } from "@aomi-labs/react";
import { normalizeAtomicCapabilities } from "./wallet-execution";

export type WagmiAccountShape = {
  address?: `0x${string}`;
  chainId?: number;
  isConnected: boolean;
  connector?: { id?: string; name?: string; type?: string };
};

export type WagmiConfigShape = {
  chains: readonly Chain[];
};

const DISCONNECTED_WAGMI_ACCOUNT: WagmiAccountShape = {
  address: undefined,
  chainId: undefined,
  isConnected: false,
};

const DISCONNECTED_WAGMI_CONFIG: WagmiConfigShape = {
  chains: [],
};

export function useSafeWagmiAccount(): WagmiAccountShape {
  try {
    return useAccount() as WagmiAccountShape;
  } catch {
    return DISCONNECTED_WAGMI_ACCOUNT;
  }
}

export function useSafeWalletClient(): {
  walletClient?: ReturnType<typeof useWalletClient>["data"];
} {
  try {
    const { data } = useWalletClient();
    return { walletClient: data };
  } catch {
    return { walletClient: undefined };
  }
}

export function useSafeWagmiConfig(): WagmiConfigShape {
  try {
    const config = useConfig();
    return {
      chains: config.chains ?? [],
    };
  } catch {
    return DISCONNECTED_WAGMI_CONFIG;
  }
}

export function useSafeSwitchChain(): {
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
    return {
      switchChainAsync: undefined,
      isPending: false,
    };
  }
}

export function useSafeSendTransaction(): {
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

export function useSafeSignTypedData(): {
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

export function useSafeCapabilities(): {
  capabilities?: Parameters<typeof executeWalletCalls>[0]["capabilities"];
} {
  try {
    const { data } = useCapabilities();
    return {
      capabilities: normalizeAtomicCapabilities(
        data as Parameters<typeof executeWalletCalls>[0]["capabilities"],
      ),
    };
  } catch {
    return { capabilities: undefined };
  }
}

export function useSafeSendCallsSync(): {
  sendCallsSyncAsync?: Parameters<
    typeof executeWalletCalls
  >[0]["sendCallsSyncAsync"];
} {
  try {
    const { sendCallsSyncAsync } = useSendCallsSync();
    return {
      sendCallsSyncAsync: async ({ calls, capabilities, chainId }) => {
        return sendCallsSyncAsync({
          calls,
          capabilities,
          chainId,
          timeout: 0,
        });
      },
    };
  } catch {
    return { sendCallsSyncAsync: undefined };
  }
}

export function useSafeConnect(): {
  connectAsync?: ReturnType<typeof useConnect>["connectAsync"];
  isPending: boolean;
} {
  try {
    const { connectAsync, isPending } = useConnect();
    return { connectAsync, isPending };
  } catch {
    return { connectAsync: undefined, isPending: false };
  }
}

export function useSafeDisconnect(): {
  disconnectAsync?: ReturnType<typeof useDisconnect>["disconnectAsync"];
  isPending: boolean;
} {
  try {
    const { disconnectAsync, isPending } = useDisconnect();
    return { disconnectAsync, isPending };
  } catch {
    return { disconnectAsync: undefined, isPending: false };
  }
}

export function useSafeConnectors(): ReturnType<typeof useConnectors> {
  try {
    return useConnectors();
  } catch {
    return [];
  }
}
