import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ExtUserProvider } from "@aomi-labs/react";
import { AomiWalletNetworkPreferencesProvider } from "../network-preferences";
import { useAomiAuthAdapter } from "../context";
import { AomiParaAdapterProvider } from "./para";

const paraMock = vi.hoisted(() => ({
  account: {
    isLoading: false,
    isConnected: false,
    embedded: { isConnected: false },
    external: {},
  } as {
    isLoading: boolean;
    isConnected: boolean;
    connectionType?: string;
    embedded: Record<string, unknown>;
    external: Record<string, unknown>;
  },
  issueJwtAsync: vi.fn(async () => ({ token: "jwt" })),
  openModal: vi.fn(),
}));

vi.mock("@getpara/react-sdk", () => ({
  Environment: { BETA: "BETA" },
  ParaProvider: ({ children }: { children: unknown }) => children,
  useAccount: () => paraMock.account,
  useClient: () => ({}),
  useIssueJwt: () => ({ issueJwtAsync: paraMock.issueJwtAsync }),
  useModal: () => ({ openModal: paraMock.openModal }),
}));

vi.mock("@getpara/react-sdk/styles.css", () => ({}));

vi.mock("./para-sol", () => ({
  DEFAULT_SOLANA_ENDPOINT: "https://api.mainnet-beta.solana.com",
  ParaSolanaWrapper: ({
    children,
  }: {
    children: (ready: boolean) => unknown;
  }) => children(true),
  buildParaSolanaMethods: () => ({}),
  connectPreferredSolanaWallet: vi.fn(async () => "unavailable"),
  detectSolanaTransport: () => undefined,
  getSolanaCapabilitySnapshot: () => undefined,
  resolveParaSolanaConfig: () => ({
    enabled: false,
    wallets: [],
    activeNetwork: {
      id: "solana-mainnet",
      label: "Mainnet",
      cluster: "solana:mainnet",
      rpcHttpUrl: "https://m.example",
    },
    cluster: "solana:mainnet",
    rpcHttpUrl: "https://m.example",
    rpcWsUrl: undefined,
    preferDirectSend: true,
    mobileChain: "mainnet-beta",
  }),
  useSafeSolanaWallet: () => ({
    wallets: [],
    publicKey: undefined,
    walletName: undefined,
    connecting: false,
    connect: undefined,
    disconnect: undefined,
    select: undefined,
  }),
}));

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

function IdentityProbe() {
  const adapter = useAomiAuthAdapter();
  return (
    <output data-testid="identity">{JSON.stringify(adapter.identity)}</output>
  );
}

function renderProvider() {
  return render(
    <ExtUserProvider>
      <AomiWalletNetworkPreferencesProvider
        storageKey="test-para"
        evmChains={evmChains}
        solanaNetworks={solanaNetworks}
      >
        <AomiParaAdapterProvider supportedChains={evmChains}>
          <IdentityProbe />
        </AomiParaAdapterProvider>
      </AomiWalletNetworkPreferencesProvider>
    </ExtUserProvider>,
  );
}

describe("AomiParaAdapterProvider", () => {
  beforeEach(() => {
    cleanup();
    paraMock.account = {
      isLoading: false,
      isConnected: false,
      embedded: { isConnected: false },
      external: {},
    };
    paraMock.issueJwtAsync.mockClear();
    paraMock.openModal.mockClear();
  });

  it("treats completed Google OAuth as connected before a wallet address is ready", () => {
    paraMock.account = {
      isLoading: false,
      isConnected: true,
      connectionType: "embedded",
      embedded: {
        isConnected: true,
        email: "alice@example.com",
        authMethods: new Set(["GOOGLE"]),
        wallets: [],
      },
      external: {},
    };

    renderProvider();

    const identity = JSON.parse(
      screen.getByTestId("identity").textContent ?? "{}",
    );
    expect(identity.status).toBe("connected");
    expect(identity.isConnected).toBe(true);
    expect(identity.primaryLabel).toBe("alice@example.com");
    expect(identity.secondaryLabel).toBe("Google");
    expect(identity.authMethod).toBe("google");
    expect(identity.authValue).toBe("alice@example.com");
    expect(identity.address).toBeUndefined();
    expect(identity.walletKind).toBeUndefined();
  });
});
