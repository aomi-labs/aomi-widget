import { afterEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { AomiRuntimeApiProvider, ExtUserProvider } from "@aomi-labs/react";
import type { AomiAuthAdapter } from "@/lib/aomi-auth-adapter";
import { AomiAuthAdapterProvider } from "@/lib/aomi-auth-adapter";
import { AomiWalletNetworkPreferencesProvider } from "@/lib/aomi-auth-adapter/network-preferences";
import { WalletPickerProvider, useWalletPicker } from "./wallet-picker-context";
import { WalletPicker } from "./wallet-picker";

afterEach(cleanup);

const evmChains = [
  {
    id: 1,
    name: "Ethereum",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://eth.example"] } },
  },
] as const;
const solanaNetworks = [
  {
    id: "solana-mainnet",
    label: "Mainnet",
    cluster: "solana:mainnet",
    rpcHttpUrl: "https://m.example",
    isDefault: true,
  },
] as const;

function makeAdapter(
  overrides: Partial<AomiAuthAdapter> = {},
): AomiAuthAdapter {
  return {
    identity: {
      status: "connected",
      isConnected: true,
      address: "0xAAAAAAAA",
      chainId: 1,
      svmAddress: "9xQpubKey",
      authProvider: "google",
      primaryLabel: "0xAAA..AA",
    },
    isReady: true,
    isSwitchingChain: false,
    canConnect: true,
    canOpenAccountUI: true,
    canDisconnect: true,
    accounts: [
      {
        id: "mm",
        family: "evm",
        address: "0xAAAAAAAA",
        walletName: "MetaMask",
        active: true,
      },
      {
        id: "phantom",
        family: "solana",
        address: "9xQpubKey",
        walletName: "Phantom",
        active: true,
      },
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
  useEffect(() => {
    openPicker();
  }, [openPicker]);
  return <WalletPicker />;
}

function renderPicker(
  adapter: AomiAuthAdapter,
  hasBlockingWalletRequests = false,
) {
  const runtime = {
    hasBlockingWalletRequests,
    showNotification: vi.fn(),
  };
  return render(
    <ExtUserProvider>
      <AomiRuntimeApiProvider value={runtime as never}>
        <AomiAuthAdapterProvider value={adapter}>
          <AomiWalletNetworkPreferencesProvider
            storageKey="test"
            evmChains={evmChains}
            solanaNetworks={solanaNetworks}
          >
            <WalletPickerProvider>
              <OpenAndRender />
            </WalletPickerProvider>
          </AomiWalletNetworkPreferencesProvider>
        </AomiAuthAdapterProvider>
      </AomiRuntimeApiProvider>
    </ExtUserProvider>,
  );
}

describe("WalletPicker", () => {
  it("renders the Para provider row and both family sections with accounts", () => {
    renderPicker(makeAdapter());
    expect(screen.getByText("Para")).toBeTruthy();
    expect(screen.getAllByText(/^EVM$/).length).toBeGreaterThan(0);
    expect(screen.getByText(/^Solana$/)).toBeTruthy();
    expect(screen.getAllByText("MetaMask").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Phantom").length).toBeGreaterThan(0);
  });

  it("calls selectAccount when an account in the active family is clicked", () => {
    const adapter = makeAdapter({
      accounts: [
        {
          id: "mm",
          family: "evm",
          address: "0xAAAAAAAA",
          walletName: "MetaMask",
          active: false,
        },
        {
          id: "rb",
          family: "evm",
          address: "0xBBBBBBBB",
          walletName: "Rabby",
          active: true,
        },
      ],
    });
    renderPicker(adapter);
    fireEvent.click(screen.getByText("MetaMask"));
    expect(adapter.selectAccount).toHaveBeenCalledWith("mm");
  });

  it("selects an account in any family directly (no family switch needed)", () => {
    const adapter = makeAdapter({
      accounts: [
        {
          id: "mm",
          family: "evm",
          address: "0xAAAAAAAA",
          walletName: "MetaMask",
          active: true,
        },
        {
          id: "phantom",
          family: "solana",
          address: "9xQpubKey",
          walletName: "Phantom",
          active: false,
        },
      ],
    });
    renderPicker(adapter);
    // Both families are always active — no "Switch to X" affordance.
    expect(screen.queryByText(/Switch to/i)).toBeNull();
    // Clicking the (inactive) Solana account selects it directly.
    fireEvent.click(screen.getByText("Phantom"));
    expect(adapter.selectAccount).toHaveBeenCalledWith("phantom");
  });

  it("disconnects an EVM account by accountId", () => {
    const adapter = makeAdapter({
      accounts: [
        {
          id: "mm",
          family: "evm",
          address: "0xAAAAAAAA",
          walletName: "MetaMask",
          active: true,
        },
      ],
    });
    renderPicker(adapter);
    fireEvent.click(screen.getByLabelText("Disconnect"));
    expect(adapter.disconnect).toHaveBeenCalledWith({ accountId: "mm" });
  });

  it("blocks wallet selection while a wallet request is unresolved", () => {
    const adapter = makeAdapter({
      accounts: [
        {
          id: "mm",
          family: "evm",
          address: "0xAAAAAAAA",
          walletName: "MetaMask",
          active: false,
        },
        {
          id: "rb",
          family: "evm",
          address: "0xBBBBBBBB",
          walletName: "Rabby",
          active: true,
        },
      ],
    });
    renderPicker(adapter, true);
    fireEvent.click(screen.getByText("MetaMask"));
    expect(adapter.selectAccount).not.toHaveBeenCalled();
  });

  it("connects an explicitly selected Solana wallet", () => {
    const connectSolanaWallet = vi.fn(async () => undefined);
    renderPicker(
      makeAdapter({
        solanaWallets: [{ name: "Solflare", installed: true, ready: true }],
        connectSolanaWallet,
      }),
    );
    fireEvent.click(screen.getByText("Solflare"));
    expect(connectSolanaWallet).toHaveBeenCalledWith("Solflare");
  });
});
