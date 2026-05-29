import { afterEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AomiAuthAdapter } from "@/lib/aomi-auth-adapter";
import { AomiAuthAdapterProvider } from "@/lib/aomi-auth-adapter";
import { AomiWalletNetworkPreferencesProvider } from "@/lib/aomi-auth-adapter/network-preferences";
import { WalletPickerProvider, useWalletPicker } from "./wallet-picker-context";
import { WalletPicker } from "./wallet-picker";

afterEach(cleanup);

const evmChains = [
  { id: 1, name: "Ethereum", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://eth.example"] } } },
] as const;
const solanaNetworks = [
  { id: "solana-mainnet", label: "Mainnet", cluster: "solana:mainnet", rpcHttpUrl: "https://m.example", isDefault: true },
] as const;

function makeAdapter(overrides: Partial<AomiAuthAdapter> = {}): AomiAuthAdapter {
  return {
    identity: {
      status: "connected", isConnected: true, address: "0xAAAAAAAA", chainId: 1,
      svmAddress: "9xQpubKey", authProvider: "google", primaryLabel: "0xAAA..AA",
    },
    isReady: true, isSwitchingChain: false,
    canConnect: true, canOpenAccountUI: true, canDisconnect: true,
    accounts: [
      { id: "mm", family: "evm", address: "0xAAAAAAAA", walletName: "MetaMask", active: true },
      { id: "phantom", family: "solana", address: "9xQpubKey", walletName: "Phantom", active: true },
    ],
    selectAccount: vi.fn(async () => undefined),
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    openAccountUI: vi.fn(async () => undefined),
    supportedNetworks: { evm: evmChains, solana: solanaNetworks },
    ...overrides,
  };
}

function OpenAndRender() {
  const { openPicker } = useWalletPicker();
  useEffect(() => { openPicker(); }, [openPicker]);
  return <WalletPicker />;
}

function renderPicker(adapter: AomiAuthAdapter) {
  return render(
    <AomiAuthAdapterProvider value={adapter}>
      <AomiWalletNetworkPreferencesProvider storageKey="test" evmChains={evmChains} solanaNetworks={solanaNetworks}>
        <WalletPickerProvider>
          <OpenAndRender />
        </WalletPickerProvider>
      </AomiWalletNetworkPreferencesProvider>
    </AomiAuthAdapterProvider>,
  );
}

describe("WalletPicker", () => {
  it("renders the Para provider row and both family sections with accounts", () => {
    renderPicker(makeAdapter());
    expect(screen.getByText("Para")).toBeTruthy();
    expect(screen.getByText(/^EVM$/)).toBeTruthy();
    expect(screen.getByText(/^Solana$/)).toBeTruthy();
    expect(screen.getByText("MetaMask")).toBeTruthy();
    expect(screen.getByText("Phantom")).toBeTruthy();
  });

  it("calls selectAccount when an account in the active family is clicked", () => {
    const adapter = makeAdapter({
      accounts: [
        { id: "mm", family: "evm", address: "0xAAAAAAAA", walletName: "MetaMask", active: false },
        { id: "rb", family: "evm", address: "0xBBBBBBBB", walletName: "Rabby", active: true },
      ],
    });
    renderPicker(adapter);
    fireEvent.click(screen.getByText("MetaMask"));
    expect(adapter.selectAccount).toHaveBeenCalledWith("mm");
  });
});
