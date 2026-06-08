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
    evmWallets: [
      {
        id: "metamask",
        label: "MetaMask",
        family: "evm",
        kind: "evm",
        status: "installed",
        ready: true,
        installed: true,
      },
      {
        id: "rabby",
        label: "Rabby",
        family: "evm",
        kind: "evm",
        status: "available",
        ready: true,
      },
      {
        id: "walletconnect",
        label: "WalletConnect",
        family: "multichain",
        kind: "walletconnect",
        status: "qr",
        ready: true,
      },
    ],
    connectEvmWallet: vi.fn(async () => undefined),
    socialLoginOptions: [
      {
        id: "google",
        label: "Continue with Email",
        family: "multichain",
        kind: "social",
        status: "available",
        ready: true,
        description: "Use email, or sign in with Google",
      },
    ],
    connectSocial: vi.fn(async () => undefined),
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
  it("renders wallet-first sections with connected accounts and sign-in options", () => {
    renderPicker(makeAdapter());
    expect(screen.getByText("Select a wallet")).toBeTruthy();
    expect(screen.getByText("Connected")).toBeTruthy();
    expect(screen.getAllByText("Wallets").length).toBeGreaterThan(0);
    expect(screen.getByText("Sign in another way")).toBeTruthy();
    expect(screen.getByText(/^ETH$/)).toBeTruthy();
    expect(screen.getByText(/^SOL$/)).toBeTruthy();
    expect(screen.getAllByText("MetaMask").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Phantom").length).toBeGreaterThan(0);
    expect(screen.getByText("Rabby")).toBeTruthy();
    expect(screen.getByText("WalletConnect")).toBeTruthy();
    expect(screen.getByText("Continue with Email")).toBeTruthy();
    expect(screen.getByText("Use email, or sign in with Google")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /connect with para/i }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Connect Para" })).toBeNull();
  });

  it("does not render inactive connected wallet switch rows", () => {
    renderPicker(
      makeAdapter({
        accounts: [
          {
            id: "rb-active",
            family: "evm",
            address: "0xBBBBBBBB",
            label: "0xBBB..BB",
            walletName: "Rabby Wallet",
            active: true,
          },
          {
            id: "rb-duplicate",
            family: "evm",
            address: "0xBBBBBBBB",
            label: "0xBBB..BB",
            walletName: "Rabby Wallet",
            active: false,
          },
          {
            id: "mm-duplicate",
            family: "evm",
            address: "0xBBBBBBBB",
            label: "0xBBB..BB",
            walletName: "MetaMask",
            active: false,
          },
        ],
      }),
    );

    expect(screen.getByText("Rabby Wallet")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Select Rabby Wallet wallet" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Select MetaMask wallet" }),
    ).toBeNull();
  });

  it("hides the connected section when only stale inactive accounts exist", () => {
    renderPicker(
      makeAdapter({
        identity: {
          status: "disconnected",
          isConnected: false,
        },
        accounts: [
          {
            id: "mm",
            family: "evm",
            address: "0xAAAAAAAA",
            walletName: "MetaMask",
            active: false,
          },
        ],
      }),
    );

    expect(screen.queryByText("Connected")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Select MetaMask wallet" }),
    ).toBeNull();
  });

  it("disconnects the EVM family from the connected summary", async () => {
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
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Disconnect Ethereum wallet"));
    });
    expect(adapter.disconnect).toHaveBeenCalledWith({ family: "evm" });
  });

  it("blocks wallet connection while a wallet request is unresolved", () => {
    const adapter = makeAdapter({
      connectEvmWallet: vi.fn(async () => undefined),
      accounts: [
        {
          id: "mm",
          family: "evm",
          address: "0xAAAAAAAA",
          walletName: "Rabby",
          active: true,
        },
      ],
    });
    renderPicker(adapter, true);
    fireEvent.click(screen.getByRole("button", { name: "Connect MetaMask" }));
    expect(adapter.connectEvmWallet).not.toHaveBeenCalled();
  });

  it("connects an explicitly selected EVM wallet", async () => {
    const connectEvmWallet = vi.fn(async () => undefined);
    renderPicker(
      makeAdapter({
        accounts: [],
        identity: {
          status: "disconnected",
          isConnected: false,
        },
        connectEvmWallet,
      }),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect MetaMask" }));
    });
    expect(connectEvmWallet).toHaveBeenCalledWith("metamask");
  });

  it("dedupes configured wallet aliases in the EVM wallet list", () => {
    renderPicker(
      makeAdapter({
        evmWallets: [
          {
            id: "rabby",
            label: "Rabby",
            family: "evm",
            kind: "evm",
            status: "installed",
            ready: true,
            installed: true,
          },
          {
            id: "rabby-wallet",
            label: "Rabby Wallet",
            family: "evm",
            kind: "evm",
            status: "installed",
            ready: true,
            installed: true,
          },
        ],
      }),
    );
    expect(
      screen.getAllByRole("button", { name: /Connect Rabby/ }),
    ).toHaveLength(1);
  });

  it("connects an explicitly selected Solana wallet", async () => {
    const connectSolanaWallet = vi.fn(async () => undefined);
    renderPicker(
      makeAdapter({
        solanaWallets: [{ name: "Solflare", installed: true, ready: true }],
        connectSolanaWallet,
      }),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect Solflare" }));
    });
    expect(connectSolanaWallet).toHaveBeenCalledWith("Solflare");
  });

  it("routes social sign-in through the adapter social action", async () => {
    const connectSocial = vi.fn(async () => undefined);
    renderPicker(makeAdapter({ connectSocial }));
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Continue with Email" }),
      );
    });
    expect(connectSocial).toHaveBeenCalledWith("google");
  });
});
