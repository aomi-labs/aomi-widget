"use client";

import type { Chain } from "viem";
import {
  useAccount,
  useCapabilities,
  useConfig,
  useConnect,
  useConnections,
  useConnectors,
  useDisconnect,
  useReconnect,
  useSendCallsSync,
  useSendTransaction,
  useSignMessage,
  useSignTypedData,
  useSwitchAccount,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import type { Connector } from "wagmi";
import type { executeWalletCalls } from "@aomi-labs/react";
import { normalizeAtomicCapabilities } from "./wallet-execution";

export type WagmiAccountShape = {
  address?: `0x${string}`;
  chainId?: number;
  isConnected: boolean;
  connector?: { id?: string; name?: string; type?: string; uid?: string };
};

export type WagmiConfigShape = {
  chains: readonly Chain[];
  connectors: readonly Connector[];
};

const DISCONNECTED_WAGMI_ACCOUNT: WagmiAccountShape = {
  address: undefined,
  chainId: undefined,
  isConnected: false,
};

const DISCONNECTED_WAGMI_CONFIG: WagmiConfigShape = {
  chains: [],
  connectors: [],
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
      connectors: config.connectors ?? [],
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

export function useSafeSignMessage(): {
  signMessageAsync?: (args: unknown) => Promise<string>;
} {
  try {
    return useSignMessage() as {
      signMessageAsync?: (args: unknown) => Promise<string>;
    };
  } catch {
    return { signMessageAsync: undefined };
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
      sendCallsSyncAsync: async ({
        calls,
        capabilities,
        chainId,
        forceAtomic,
        pollingInterval,
        status,
        throwOnFailure,
        timeout,
        version,
      }) => {
        return sendCallsSyncAsync({
          calls,
          capabilities,
          chainId,
          forceAtomic,
          pollingInterval,
          status,
          throwOnFailure,
          timeout,
          version,
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

export function useSafeReconnect(): {
  reconnect?: ReturnType<typeof useReconnect>["reconnect"];
} {
  try {
    const { reconnect } = useReconnect();
    return { reconnect };
  } catch {
    return { reconnect: undefined };
  }
}

export function useSafeConnectors(): ReturnType<typeof useConnectors> {
  try {
    return useConnectors();
  } catch {
    return [];
  }
}

export type WagmiConnectionShape = {
  connectorId: string;
  connectorName: string;
  address: `0x${string}`;
  chainId?: number;
};

export function useSafeConnections(): WagmiConnectionShape[] {
  try {
    const connections = useConnections();
    return connections.flatMap((connection) =>
      connection.accounts
        .filter((address): address is `0x${string}` => address.startsWith("0x"))
        .map((address) => ({
          connectorId: connection.connector.uid,
          connectorName: connection.connector.name,
          address,
          chainId: connection.chainId,
        })),
    );
  } catch {
    return [];
  }
}

export function useSafeSwitchAccount(): {
  switchAccountAsync?: (args: {
    connector: Parameters<
      ReturnType<typeof useSwitchAccount>["switchAccountAsync"]
    >[0]["connector"];
  }) => Promise<unknown>;
} {
  try {
    const { switchAccountAsync } = useSwitchAccount();
    return { switchAccountAsync };
  } catch {
    return { switchAccountAsync: undefined };
  }
}
