import { afterEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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
  const adapter: AomiWalletKit = {
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
  if (!overrides.walletModalRows) {
    adapter.walletModalRows = [
      ...adapter.accounts.map((account) => ({
        id: account.id,
        family: account.family,
        address: account.address,
        chainId: account.chainId,
        label: account.label ?? account.address,
        walletName: account.walletName,
        source: "live" as const,
        status: account.active ? ("active" as const) : ("connected" as const),
        linkedVia: account.linkedVia,
        manageable: account.manageable,
        actions: account.actions?.map((action) => ({
          kind: action.kind,
          label:
            action.label ??
            (action.kind === "manage"
              ? "Manage"
              : action.kind === "signout"
                ? "Sign out"
                : "Disconnect"),
        })) ?? [
          account.manageable
            ? ({ kind: "manage" as const, label: "Manage" } as const)
            : ({
                kind: "disconnect" as const,
                label: "Disconnect",
              } as const),
        ],
      })),
      ...(adapter.evmWallets ?? []).map((wallet) => ({
        id: wallet.id,
        family: wallet.family === "svm" ? ("svm" as const) : ("evm" as const),
        label: wallet.label,
        walletName: wallet.label,
        iconUrl: wallet.iconUrl,
        kind: wallet.kind,
        source: "option" as const,
        status:
          wallet.status === "unavailable"
            ? ("unavailable" as const)
            : ("available" as const),
        provider: wallet.connectorId,
        actions: [{ kind: "connect" as const, label: "Connect" }],
      })),
      ...(adapter.solanaWallets ?? []).map((wallet) => ({
        id: wallet.name,
        family: "svm" as const,
        label: wallet.name,
        walletName: wallet.name,
        iconUrl: wallet.iconUrl,
        kind: "solana" as const,
        source: "option" as const,
        status:
          wallet.ready === false
            ? ("unavailable" as const)
            : ("available" as const),
        actions: [{ kind: "connect" as const, label: "Connect" }],
      })),
      ...(adapter.socialLoginOptions ?? []).map((option) => ({
        id: option.id,
        family: "evm" as const,
        label: option.label,
        walletName: option.label,
        kind: "social" as const,
        source: "option" as const,
        status:
          option.status === "unavailable"
            ? ("unavailable" as const)
            : ("available" as const),
        actions: [{ kind: "authenticate" as const, label: "Sign in" }],
      })),
    ];
  }
  return adapter;
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
    // "Account" labels both the header button and the slide-in panel title.
    expect(screen.getAllByText("Account").length).toBeGreaterThan(0);
    expect(screen.queryByText(/^ETH$/)).toBeNull();
    expect(screen.queryByText(/^SOL$/)).toBeNull();
    // Each connected row carries a compact EVM/SVM family tag.
    expect(screen.getAllByText("EVM").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SVM").length).toBeGreaterThan(0);
    expect(screen.getAllByTitle("MetaMask").length).toBeGreaterThan(0);
    expect(screen.getAllByTitle("Phantom").length).toBeGreaterThan(0);
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

    expect(screen.getAllByText("Rabby Wallet").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MetaMask").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Disconnect Ethereum wallet")).toHaveLength(
      2,
    );
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

  it("auto-links the first connected EVM wallet for an empty account", async () => {
    const linkWallet = vi.fn(async () => undefined);
    renderPicker(
      makeAdapter({
        accountUser: { id: "user-1", displayName: "Ada Account" },
        accountWallets: [],
        linkWallet,
      }),
    );

    await waitFor(() => expect(linkWallet).toHaveBeenCalledTimes(1));
    expect(linkWallet).toHaveBeenCalledWith({
      accountId: "mm",
      family: "evm",
      address: "0xAAAAAAAA",
      chainId: undefined,
    });
  });

  it("does not auto-link additional connected wallets", async () => {
    const linkWallet = vi.fn(async () => undefined);
    renderPicker(
      makeAdapter({
        accountUser: { id: "user-1", displayName: "Ada Account" },
        accountWallets: [
          {
            id: "wallet-1",
            family: "evm",
            address: "0xBBBBBBBB",
            kind: "external",
            linkedVia: "siwe",
          },
        ],
        linkWallet,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(linkWallet).not.toHaveBeenCalled();
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

  it("slides to the account manager and can open the provider UI", async () => {
    const openAccountUI = vi.fn(async () => undefined);
    renderPicker(makeAdapter({ openAccountUI }));

    // "Account" navigates to the in-app account panel rather than opening the
    // provider modal directly.
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Manage your account" }),
      );
    });
    expect(openAccountUI).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Back to wallets" }),
    ).toBeTruthy();

    // The provider shortcut inside the panel hands off to the native UI.
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /open provider settings/i }),
      );
    });
    expect(openAccountUI).toHaveBeenCalled();
  });

  it("renders live account runtime data and runs linked wallet actions", async () => {
    const updateLinkedWallet = vi.fn(async () => undefined);
    const unlinkLinkedWallet = vi.fn(async () => undefined);
    renderPicker(
      makeAdapter({
        accountStatus: "ready",
        accountUser: {
          id: "user-1",
          displayName: "Ada Account",
          email: "ada@example.com",
        },
        accountLinkedAccounts: [
          {
            id: "identity-1",
            provider: "privy",
            subject: "did:privy:ada",
            email: "ada@example.com",
            emailVerified: true,
            displayLabel: "Privy",
          },
        ],
        accountWallets: [
          {
            id: "wallet-1",
            family: "evm",
            address: "0xAAAAAAAA",
            kind: "external",
            provider: "siwe",
            linkedVia: "siwe",
            label: "Treasury",
            capability: "write",
          },
        ],
        updateLinkedWallet,
        unlinkLinkedWallet,
      }),
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Manage your account" }),
      );
    });

    expect(screen.getByText("Verified account")).toBeTruthy();
    expect(screen.getByText("Connected now")).toBeTruthy();
    expect(screen.getByText("Account access")).toBeTruthy();
    expect(screen.getByText("Privy")).toBeTruthy();
    expect(screen.getAllByText("Treasury").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Write access/).length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Rename Treasury" }));
    });
    const input = screen.getByLabelText("Wallet label for Treasury");
    fireEvent.change(input, { target: { value: "Ops wallet" } });
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Save label for Treasury" }),
      );
    });
    expect(updateLinkedWallet).toHaveBeenCalledWith({
      walletId: "wallet-1",
      label: "Ops wallet",
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unlink Treasury" }));
    });
    expect(unlinkLinkedWallet).toHaveBeenCalledWith("wallet-1");
  });

  it("renders account move and merge confirmations", async () => {
    const confirm = vi.fn(async () => undefined);
    const dismiss = vi.fn();
    renderPicker(
      makeAdapter({
        accountConfirmation: {
          severity: "red",
          title: "Merge another account?",
          message: "This wallet is the last login method on another account.",
          confirmLabel: "Merge account",
          otherAccountWillClose: true,
          confirm,
          dismiss,
        },
      }),
    );

    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText("Merge another account?")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Merge account" }));
    });
    expect(confirm).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(dismiss).toHaveBeenCalled();
  });

  it("shows the account button for a wallet-only session without a provider UI", () => {
    renderPicker(
      makeAdapter({
        canOpenAccountUI: false,
        openAccountUI: undefined,
        identity: {
          status: "connected",
          isConnected: true,
          address: "0xAAAAAAAA",
          chainId: 1,
          primaryLabel: "0xAAA..AA",
        },
        accounts: [
          {
            id: "mm",
            family: "evm",
            address: "0xAAAAAAAA",
            walletName: "MetaMask",
            active: true,
          },
        ],
      }),
    );

    // The account button is gated on having a connected wallet, not on the
    // provider exposing a native account modal.
    expect(
      screen.getByRole("button", { name: "Manage your account" }),
    ).toBeTruthy();
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

  it("runs a full account sign-out even when a provider wallet is connected", async () => {
    const signOutAccount = vi.fn(async () => undefined);
    const disconnect = vi.fn(async () => undefined);
    renderPicker(
      makeAdapter({
        signOutAccount,
        disconnect,
        accounts: [
          {
            id: "para",
            family: "evm",
            address: "0xAAAAAAAA",
            walletName: "Para",
            active: true,
            manageable: true,
            actions: [
              { kind: "manage", label: "Manage" },
              { kind: "signout", label: "Sign out" },
            ],
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

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Manage your account" }),
      );
    });
    await act(async () => {
      fireEvent.click(screen.getByText("End this account session"));
    });

    expect(signOutAccount).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledWith({ family: "all" });
    expect(screen.getByRole("dialog")).toBeTruthy();
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
      screen
        .getAllByTitle("Embedded wallet")
        .some((node) => node.getAttribute("data-wallet-brand") === "para"),
    ).toBe(true);
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

  it("hides the provider sign-in row when a Privy session is connected", () => {
    const disconnect = vi.fn(async () => undefined);
    renderPicker(
      makeAdapter({
        canOpenAccountUI: false,
        openAccountUI: undefined,
        disconnect,
        identity: {
          status: "connected",
          isConnected: true,
          walletProvider: "privy",
          sessionProvider: "privy",
          walletProviderSubject: "did:privy:user",
          primaryLabel: "privy@example.com",
        },
        accounts: [
          {
            id: "privy-solana",
            family: "svm",
            address: "9xQpubKey",
            walletName: "Privy Solana",
            active: true,
            linkedVia: "privy",
            actions: [{ kind: "signout", label: "Sign out" }],
          },
        ],
        socialLoginOptions: [
          {
            id: "privy",
            label: "Email, wallet, or social",
            family: "multichain",
            kind: "social",
            status: "available",
            ready: true,
          },
        ],
      }),
    );

    expect(screen.queryByText("Email, wallet, or social")).toBeNull();
    expect(screen.queryByText("Quick sign-in")).toBeNull();
    // The account button shows for any connected wallet, including this Privy
    // session (which exposes no native account modal).
    expect(
      screen.getByRole("button", { name: "Manage your account" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });

  it("runs full account sign-out for provider-supplied sign-out rows", async () => {
    const signOutAccount = vi.fn(async () => undefined);
    const disconnect = vi.fn(async () => undefined);
    renderPicker(
      makeAdapter({
        signOutAccount,
        canOpenAccountUI: false,
        openAccountUI: undefined,
        disconnect,
        identity: {
          status: "connected",
          isConnected: true,
          walletProvider: "privy",
          sessionProvider: "privy",
          walletProviderSubject: "did:privy:user",
          primaryLabel: "privy@example.com",
        },
        accounts: [
          {
            id: "privy-solana",
            family: "svm",
            address: "9xQpubKey",
            walletName: "Privy Solana",
            active: true,
            linkedVia: "privy",
            actions: [{ kind: "signout", label: "Sign out" }],
          },
        ],
      }),
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Manage your account" }),
      );
    });
    await act(async () => {
      fireEvent.click(screen.getByText("End this account session"));
    });

    expect(signOutAccount).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledWith({ family: "all" });
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("shows one Privy sign-in row beside external wallets before provider sign-in", () => {
    renderPicker(
      makeAdapter({
        identity: {
          status: "connected",
          isConnected: true,
          address: "0xAAAAAAAA",
          chainId: 1,
          walletProvider: "privy",
          primaryLabel: "0xAAA..AA",
        },
        socialLoginOptions: [
          {
            id: "privy",
            label: "Email, wallet, or social",
            family: "multichain",
            kind: "social",
            status: "available",
            ready: true,
          },
        ],
      }),
    );

    const socialRow = screen.getByRole("button", {
      name: "Email, wallet, or social",
    });
    expect(within(socialRow).getByText("Privy")).toBeTruthy();
    expect(
      within(socialRow).getByText("Email, wallet, or social"),
    ).toBeTruthy();
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
