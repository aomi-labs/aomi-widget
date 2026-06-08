import { useMemo } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExtUserProvider } from "@aomi-labs/react";
import type { AomiAuthAdapter } from "@/lib/aomi-auth-adapter";
import { AomiAuthAdapterProvider } from "@/lib/aomi-auth-adapter";
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
  svmAddress?: string;
  solanaReconnect?: boolean;
  onSelectNetwork?: (target: unknown) => void;
}): AomiAuthAdapter {
  return {
    identity: {
      status: options?.connected ? "connected" : "disconnected",
      isConnected: Boolean(options?.connected),
      primaryLabel: options?.connected ? "Wallet" : "Connect Account",
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
    supportedChains: evmChains,
    supportedNetworks: {
      evm: evmChains,
      solana: solanaNetworks,
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
  it("selects a Solana network via the tabbed picker (no family toggle)", async () => {
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
              onSelectNetwork: selectNetwork,
            })}
          />
        </AomiWalletNetworkPreferencesProvider>
      </ExtUserProvider>,
    );

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("button", { name: "Solana" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Solana" }));
    fireEvent.click(screen.getByRole("button", { name: /Solana Mainnet/i }));

    expect(
      screen.getByText(/adapter needs a wallet reconnect to change clusters/i),
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
