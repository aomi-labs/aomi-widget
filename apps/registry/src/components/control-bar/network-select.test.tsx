import { useMemo } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Chain } from "viem";
import { ExtUserProvider } from "@aomi-labs/react";
import type { AomiAuthAdapter } from "@/lib/aomi-auth-adapter";
import { AomiAuthAdapterProvider } from "@/lib/aomi-auth-adapter";
import type { SolanaNetworkOption } from "@/lib/aomi-auth-adapter/types";
import {
  AomiWalletNetworkPreferencesProvider,
  useAomiWalletNetworkPreferences,
} from "@/lib/aomi-auth-adapter/network-preferences";
import { NetworkSelect } from "./network-select";
import { ConnectButton } from "./connect-button";

const evmChains = [
  {
    id: 8453,
    name: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://base.example"] } },
  },
] as const;

const evmChainsMulti = [
  ...evmChains,
  {
    id: 1,
    name: "Ethereum",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://eth.example"] } },
  },
] as const;

const solanaNetworks = [
  {
    id: "solana-devnet",
    label: "Solana Devnet",
    cluster: "solana:devnet",
    rpcHttpUrl: "https://api.devnet.solana.com",
    isDefault: true,
  },
  {
    id: "solana-mainnet",
    label: "Solana Mainnet",
    cluster: "solana:mainnet",
    rpcHttpUrl: "https://api.mainnet-beta.solana.com",
  },
] as const;

afterEach(() => {
  cleanup();
});

function createHarnessAdapter(options?: {
  connected?: boolean;
  address?: string;
  svmAddress?: string;
  solanaReconnect?: boolean;
  evmChains?: readonly Chain[];
  solanaNetworks?: readonly SolanaNetworkOption[];
  onSelectNetwork?: (target: unknown) => void;
}): AomiAuthAdapter {
  const harnessEvmChains = options?.evmChains ?? evmChains;
  const harnessSolanaNetworks = options?.solanaNetworks ?? solanaNetworks;
  return {
    identity: {
      status: options?.connected ? "connected" : "disconnected",
      isConnected: Boolean(options?.connected),
      primaryLabel: options?.connected ? "Wallet" : "Connect Account",
      address: options?.address,
      chainId: 8453,
      svmAddress: options?.svmAddress,
      solanaCluster: "solana:devnet",
    },
    isReady: true,
    isSwitchingChain: false,
    canConnect: true,
    canOpenAccountUI: Boolean(options?.connected),
    canDisconnect: false,
    accounts: [],
    selectAccount: vi.fn(async () => undefined),
    supportedChains: harnessEvmChains,
    supportedNetworks: {
      evm: harnessEvmChains,
      solana: harnessSolanaNetworks,
    },
    solanaNetworkSwitchRequiresReconnect: options?.solanaReconnect,
    connect: async () => undefined,
    openAccountUI: async () => undefined,
    selectNetwork: async (target) => {
      options?.onSelectNetwork?.(target);
    },
  };
}

function Harness({
  adapter,
  onConnect,
  onOpenAccountUI,
}: {
  adapter?: AomiAuthAdapter;
  onConnect?: () => void;
  onOpenAccountUI?: () => void;
}) {
  const preferences = useAomiWalletNetworkPreferences();

  const value = useMemo<AomiAuthAdapter>(() => {
    const baseAdapter =
      adapter ??
      createHarnessAdapter({
        onSelectNetwork: (target) => preferences.selectTarget(target as never),
      });

    return {
      ...baseAdapter,
      connect: async () => {
        onConnect?.();
      },
      openAccountUI: async () => {
        onOpenAccountUI?.();
      },
      selectNetwork: async (target) => {
        if (baseAdapter.selectNetwork) {
          await baseAdapter.selectNetwork(target);
        } else {
          preferences.selectTarget(target);
        }
      },
    };
  }, [adapter, onConnect, onOpenAccountUI, preferences]);

  return (
    <AomiAuthAdapterProvider value={value}>
      <NetworkSelect />
      <ConnectButton />
    </AomiAuthAdapterProvider>
  );
}

describe("NetworkSelect", () => {
  it("selects a Solana network from the unified list when both families are connected", async () => {
    const selectNetwork = vi.fn();
    render(
      <ExtUserProvider>
        <AomiWalletNetworkPreferencesProvider
          evmChains={evmChains}
          solanaNetworks={solanaNetworks}
        >
          <Harness
            adapter={createHarnessAdapter({
              connected: true,
              address: "0xda6f0000000000000000000000000000000000f0",
              svmAddress: "So11111111111111111111111111111111111111112",
              onSelectNetwork: selectNetwork,
            })}
          />
        </AomiWalletNetworkPreferencesProvider>
      </ExtUserProvider>,
    );

    fireEvent.click(screen.getByRole("combobox"));
    // Both families connected -> EVM + Solana groups render together, no tab.
    expect(screen.getByRole("button", { name: /^Base/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Solana Mainnet/i }));

    await waitFor(() => {
      expect(selectNetwork).toHaveBeenCalledWith({
        family: "solana",
        networkId: "solana-mainnet",
      });
    });
  });

  it("confirms destructive Para-style Solana network switches", async () => {
    const selectNetwork = vi.fn();
    render(
      <ExtUserProvider>
        <AomiWalletNetworkPreferencesProvider
          evmChains={evmChains}
          solanaNetworks={solanaNetworks}
        >
          <Harness
            adapter={createHarnessAdapter({
              connected: true,
              svmAddress: "So11111111111111111111111111111111111111112",
              solanaReconnect: true,
              onSelectNetwork: selectNetwork,
            })}
          />
        </AomiWalletNetworkPreferencesProvider>
      </ExtUserProvider>,
    );

    fireEvent.click(screen.getByRole("combobox"));
    // Solana-only connection -> no EVM rows, no family tab.
    expect(screen.queryByRole("button", { name: /^Base/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Solana Mainnet/i }));

    expect(
      screen.getByText(/needs to reconnect to change clusters/i),
    ).toBeTruthy();
    expect(selectNetwork).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Switch Network" }));

    await waitFor(() => {
      expect(selectNetwork).toHaveBeenCalledWith({
        family: "solana",
        networkId: "solana-mainnet",
      });
    });
  });

  it("hides Solana networks when only an EVM wallet is connected", async () => {
    render(
      <ExtUserProvider>
        <AomiWalletNetworkPreferencesProvider
          evmChains={evmChainsMulti}
          solanaNetworks={solanaNetworks}
        >
          <Harness
            adapter={createHarnessAdapter({
              connected: true,
              address: "0xda6f0000000000000000000000000000000000f0",
              evmChains: evmChainsMulti,
            })}
          />
        </AomiWalletNetworkPreferencesProvider>
      </ExtUserProvider>,
    );

    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("button", { name: /^Base/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Ethereum/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Solana/i })).toBeNull();
  });

  it("connects without a family selection", async () => {
    const onConnect = vi.fn();
    render(
      <ExtUserProvider>
        <AomiWalletNetworkPreferencesProvider
          evmChains={evmChains}
          solanaNetworks={solanaNetworks}
        >
          <Harness onConnect={onConnect} />
        </AomiWalletNetworkPreferencesProvider>
      </ExtUserProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Connect account" }));

    await waitFor(() => {
      expect(onConnect).toHaveBeenCalled();
    });
  });
});
