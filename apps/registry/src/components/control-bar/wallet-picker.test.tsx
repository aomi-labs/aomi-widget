import { afterEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { AomiRuntimeApiProvider, ExtUserProvider } from "@aomi-labs/react";
import type { AomiWalletKit } from "@/lib/wallet-kit";
import { AomiWalletKitContextProvider } from "@/lib/wallet-kit";
import { AomiWalletNetworkPreferencesProvider } from "@/lib/wallet-kit/network-preferences";
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

function makeAdapter(overrides: Partial<AomiWalletKit> = {}): AomiWalletKit {
  return {
    identity: {
      status: "connected",
      isConnected: true,
      address: "0xAAAAAAAA",
      chainId: 1,
      svmAddress: "9xQpubKey",
      authProvider: "google",
      walletProvider: "para",
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
        family: "svm",
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
        status: "installed",
        ready: true,
        installed: true,
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
        label: "Email or Google",
        family: "multichain",
        kind: "social",
        status: "available",
        ready: true,
        description: "Fast account sign-in",
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
  adapter: AomiWalletKit,
  hasBlockingWalletRequests = false,
) {
  const runtime = {
    hasBlockingWalletRequests,
    showNotification: vi.fn(),
  };
  return render(
    <ExtUserProvider>
      <AomiRuntimeApiProvider value={runtime as never}>
        <AomiWalletKitContextProvider value={adapter}>
          <AomiWalletNetworkPreferencesProvider
            storageKey="test"
            evmChains={evmChains}
            solanaNetworks={solanaNetworks}
          >
            <WalletPickerProvider>
              <OpenAndRender />
            </WalletPickerProvider>
          </AomiWalletNetworkPreferencesProvider>
        </AomiWalletKitContextProvider>
      </AomiRuntimeApiProvider>
    </ExtUserProvider>,
  );
}

// When connected, the add-wallet options live behind a collapsed expander.
function openAddWallets() {
  const trigger = screen.queryByRole("button", { name: "Add another wallet" });
  if (trigger) fireEvent.click(trigger);
}

describe("WalletPicker", () => {
  it("renders connected accounts with EVM/SVM tags and a collapsible add-wallet list", () => {
    renderPicker(makeAdapter());
    expect(screen.getByText("Manage wallets")).toBeTruthy();
    const connectedLabel = screen.getByText("Connected");
    const addLabel = screen.getByRole("button", { name: "Add another wallet" });
    // Para isn't connected here (MetaMask + Phantom), so the Para sign-in row
    // stays available under "Quick sign-in".
    const quickSignInLabel = screen.getByText("Quick sign-in");
    // Order is Connected -> Quick sign-in -> Add another wallet.
    expect(
      connectedLabel.compareDocumentPosition(quickSignInLabel) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      quickSignInLabel.compareDocumentPosition(addLabel) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Manage your account" }),
    ).toBeTruthy();
    expect(screen.getByText("Account")).toBeTruthy();
    expect(screen.queryByText(/^ETH$/)).toBeNull();
    expect(screen.queryByText(/^SOL$/)).toBeNull();
    // Each connected row carries a compact EVM/SVM family tag.
    expect(screen.getByText("EVM")).toBeTruthy();
    expect(screen.getByText("SVM")).toBeTruthy();
    expect(screen.getAllByTitle("MetaMask").length).toBeGreaterThan(0);
    expect(screen.getByTitle("Phantom")).toBeTruthy();
    expect(screen.getAllByText("MetaMask").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Phantom").length).toBeGreaterThan(0);
    expect(screen.getByText("Email or Google")).toBeTruthy();

    // Add-wallet options stay collapsed (hidden from the a11y tree) until expanded.
    expect(addLabel.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: "Link Rabby" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Link WalletConnect" }),
    ).toBeNull();
    fireEvent.click(addLabel);
    expect(addLabel.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Link Rabby" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Link WalletConnect" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Link Browser wallet" }),
    ).toBeTruthy();
    // An already-connected brand (MetaMask) is not offered as an add option.
    expect(screen.queryByRole("button", { name: "Link MetaMask" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /connect with para/i }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Connect Para" })).toBeNull();
  });

  it("renders inactive connected EVM wallets and can make one active", async () => {
    const selectAccount = vi.fn(async () => undefined);
    // The adapter dedupes same-address connectors, so the picker receives one
    // row per distinct address. Two genuinely different addresses stay distinct.
    renderPicker(
      makeAdapter({
        selectAccount,
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
            id: "mm-other",
            family: "evm",
            address: "0xCCCCCCCC",
            label: "0xCCC..CC",
            walletName: "MetaMask",
            active: false,
          },
        ],
      }),
    );

    expect(screen.getByText("Rabby Wallet")).toBeTruthy();
    expect(screen.getAllByText("MetaMask").length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Make MetaMask active"));
    });
    expect(selectAccount).toHaveBeenCalledWith("mm-other");
  });

  it("orders quick sign-in above the wallet list when disconnected", () => {
    renderPicker(
      makeAdapter({
        identity: { status: "disconnected", isConnected: false },
        accounts: [],
      }),
    );
    expect(screen.queryByText("Connected")).toBeNull();
    const quickSignInLabel = screen.getByText("Quick sign-in");
    const walletsLabel = screen.getByText("Wallets");
    expect(
      quickSignInLabel.compareDocumentPosition(walletsLabel) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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

  it("disconnects the active EVM account from the connected summary", async () => {
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
    expect(adapter.disconnect).toHaveBeenCalledWith({ accountId: "mm" });
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
    openAddWallets();
    fireEvent.click(screen.getByRole("button", { name: "Link MetaMask" }));
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
    openAddWallets();
    expect(screen.getAllByRole("button", { name: /Link Rabby/ })).toHaveLength(
      1,
    );
  });

  it("connects an explicitly selected Solana wallet", async () => {
    const connectSolanaWallet = vi.fn(async () => undefined);
    renderPicker(
      makeAdapter({
        solanaWallets: [{ name: "Solflare", installed: true, ready: true }],
        connectSolanaWallet,
      }),
    );
    openAddWallets();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Link Solflare" }));
    });
    expect(connectSolanaWallet).toHaveBeenCalledWith("Solflare");
  });

  it("routes social sign-in through the adapter social action", async () => {
    const connectSocial = vi.fn(async () => undefined);
    // Social sign-in shows only in the disconnected onboarding state.
    renderPicker(
      makeAdapter({
        connectSocial,
        identity: { status: "disconnected", isConnected: false },
        accounts: [],
      }),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Email or Google" }));
    });
    expect(connectSocial).toHaveBeenCalledWith("google");
  });

  it("brands the social row as the account provider with the method beneath", () => {
    renderPicker(
      makeAdapter({
        identity: {
          status: "disconnected",
          isConnected: false,
          walletProvider: "para",
        },
        accounts: [],
      }),
    );
    const socialRow = screen.getByRole("button", { name: "Email or Google" });
    // Title = provider brand ("Para"); subtitle = the sign-in method.
    expect(within(socialRow).getByText("Para")).toBeTruthy();
    expect(within(socialRow).getByText("Email or Google")).toBeTruthy();
    // Provider brand mark, not the generic mail icon.
    expect(within(socialRow).getByTitle("Para")).toBeTruthy();
  });

  it("falls back to the method label when no account provider brand exists", () => {
    renderPicker(
      makeAdapter({
        identity: { status: "disconnected", isConnected: false },
        accounts: [],
      }),
    );
    const socialRow = screen.getByRole("button", { name: "Email or Google" });
    expect(within(socialRow).queryByTitle("Para")).toBeNull();
  });

  it("stays open without a success popup after a direct wallet link", async () => {
    const connectEvmWallet = vi.fn(async () => undefined);
    renderPicker(makeAdapter({ connectEvmWallet }));
    openAddWallets();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Link Rabby" }));
    });
    expect(connectEvmWallet).toHaveBeenCalledWith("rabby");
    // No success banner, and the picker stays open (the new wallet just lands
    // in the connected list).
    expect(screen.queryByText("Wallet connected")).toBeNull();
    expect(screen.getByText("Manage wallets")).toBeTruthy();
  });

  it("keeps a dual-chain wallet connectable on both families", () => {
    renderPicker(
      makeAdapter({
        identity: { status: "disconnected", isConnected: false },
        accounts: [],
        evmWallets: [
          {
            id: "phantom-evm",
            label: "Phantom",
            family: "evm",
            kind: "evm",
            status: "installed",
            ready: true,
            installed: true,
          },
        ],
        solanaWallets: [{ name: "Phantom", installed: true, ready: true }],
      }),
    );
    // Family-scoped dedup keeps Phantom reachable as both EVM and Solana.
    expect(
      screen.getAllByRole("button", { name: "Connect Phantom" }),
    ).toHaveLength(2);
  });

  it("opens account management from the picker header", async () => {
    const openAccountUI = vi.fn(async () => undefined);
    renderPicker(makeAdapter({ openAccountUI }));

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Manage your account" }),
      );
    });

    expect(openAccountUI).toHaveBeenCalled();
  });

  it("shows a per-row manage action only for manageable wallets", async () => {
    const openAccountUI = vi.fn(async () => undefined);
    renderPicker(
      makeAdapter({
        openAccountUI,
        accounts: [
          {
            id: "para",
            family: "evm",
            address: "0xAAAAAAAA",
            walletName: "Para",
            active: true,
            manageable: true,
          },
          {
            id: "phantom",
            family: "svm",
            address: "9xQpubKey",
            walletName: "Phantom",
            active: true,
          },
        ],
      }),
    );

    // Para is manageable -> a manage button; Phantom isn't -> none.
    expect(screen.getByRole("button", { name: "Manage Para" })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Disconnect Ethereum wallet" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Manage Phantom" })).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Manage Para" }));
    });

    expect(openAccountUI).toHaveBeenCalledWith({ family: "evm" });
  });

  it("uses the Para brand mark for manageable Para accounts with generic names", () => {
    renderPicker(
      makeAdapter({
        identity: {
          status: "connected",
          isConnected: true,
          walletProvider: "para",
          sessionProvider: "para",
        },
        accounts: [
          {
            id: "embedded-session",
            family: "evm",
            address: "0xAAAAAAAA",
            walletName: "Embedded wallet",
            active: true,
            manageable: true,
          },
        ],
      }),
    );

    expect(
      screen.getByTitle("Embedded wallet").getAttribute("data-wallet-brand"),
    ).toBe("para");
  });

  it("hides the social sign-in row when the Para account is connected", () => {
    renderPicker(
      makeAdapter({
        accounts: [
          {
            id: "para",
            family: "evm",
            address: "0xAAAAAAAA",
            walletName: "Para",
            active: true,
            manageable: true,
          },
        ],
      }),
    );

    expect(screen.queryByText("Email or Google")).toBeNull();
    expect(screen.queryByText("Link additional accounts")).toBeNull();
    expect(screen.queryByText("Quick sign-in")).toBeNull();
  });

  it("shows the Para sign-in row when only external wallets are connected", () => {
    // Default harness connects MetaMask + Phantom (no Para account), so Para
    // stays reachable to (re)connect above "Add another wallet".
    renderPicker(makeAdapter());
    expect(screen.getByText("Email or Google")).toBeTruthy();
    expect(screen.getByText("Quick sign-in")).toBeTruthy();
  });

  it("hides the per-row manage action when the adapter can't open account UI", () => {
    renderPicker(
      makeAdapter({
        canOpenAccountUI: false,
        accounts: [
          {
            id: "para",
            family: "evm",
            address: "0xAAAAAAAA",
            walletName: "Para",
            active: true,
            manageable: true,
          },
        ],
      }),
    );

    expect(screen.queryByRole("button", { name: "Manage Para" })).toBeNull();
  });
});
