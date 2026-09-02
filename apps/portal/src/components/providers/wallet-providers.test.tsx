import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const walletKit = vi.hoisted(() => ({
  auth: undefined as unknown,
  providerMounts: 0,
  privyDelegationMounts: 0,
}));

const navigation = vi.hoisted(() => ({
  pathname: "/settings",
  search: "",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

vi.mock("@aomi-labs/widget-lib", () => ({
  AomiWalletKitProvider: ({
    auth,
    children,
  }: {
    auth: unknown;
    children: ReactNode;
  }) => {
    walletKit.auth = auth;
    walletKit.providerMounts += 1;
    return <div data-testid="wallet-provider-root">{children}</div>;
  },
  FullTestnetWalletRouter: ({ children }: { children: ReactNode }) => children,
  arcTestnet: { id: 5042002 },
  megaeth: { id: 4326 },
  monad: { id: 143 },
  monadTestnet: { id: 10143 },
  robinhood: { id: 46630 },
  useFullTestnet: (chains: unknown) => ({
    enabled: false,
    routedChains: chains,
    routedChainIds: new Set<number>(),
  }),
}));

vi.mock("@aomi-labs/widget-lib/providers/para", () => ({}));
vi.mock("@aomi-labs/widget-lib/providers/privy", () => ({
  PrivyDelegationProvider: ({ children }: { children: ReactNode }) => {
    walletKit.privyDelegationMounts += 1;
    return <div data-testid="privy-delegation-root">{children}</div>;
  },
}));
vi.mock("@portal/components/providers/e2e-wallet-provider", () => ({
  E2EWalletProvider: ({ children }: { children: ReactNode }) => children,
}));

describe("WalletProviders Privy configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    walletKit.auth = undefined;
    walletKit.providerMounts = 0;
    walletKit.privyDelegationMounts = 0;
    navigation.pathname = "/settings";
    navigation.search = "";
  });

  it("leaves enabled login methods under Privy's authority", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRIVY_APP_ID", "privy-app");
    const { WalletProviders } = await import("./wallet-providers");

    const view = render(
      <WalletProviders>
        <span>child</span>
      </WalletProviders>,
    );

    expect(walletKit.auth).toEqual({ provider: "privy" });
    expect(view.getAllByTestId("wallet-provider-root")).toHaveLength(1);
    expect(view.getAllByTestId("privy-delegation-root")).toHaveLength(1);
  });

  it("mounts no auth SDK while a device route is choosing a provider", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRIVY_APP_ID", "privy-app");
    vi.stubEnv("NEXT_PUBLIC_PARA_API_KEY", "para-key");
    navigation.pathname = "/device-auth";
    const { WalletProviders } = await import("./wallet-providers");

    const view = render(
      <WalletProviders>
        <span>child</span>
      </WalletProviders>,
    );

    expect(walletKit.auth).toBe(false);
    expect(view.getAllByTestId("wallet-provider-root")).toHaveLength(1);
    expect(walletKit.privyDelegationMounts).toBe(0);
  });

  it("mounts exactly the Para auth SDK selected by a device route", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRIVY_APP_ID", "privy-app");
    vi.stubEnv("NEXT_PUBLIC_PARA_API_KEY", "para-key");
    navigation.pathname = "/oauth/device";
    navigation.search = "provider=para";
    const { WalletProviders } = await import("./wallet-providers");

    const view = render(
      <WalletProviders>
        <span>child</span>
      </WalletProviders>,
    );

    expect(walletKit.auth).toEqual({
      provider: "para",
      methods: ["email", "google"],
    });
    expect(view.getAllByTestId("wallet-provider-root")).toHaveLength(1);
    expect(walletKit.privyDelegationMounts).toBe(0);
  });

  it("does not mount a selected provider whose public config is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRIVY_APP_ID", "privy-app");
    vi.stubEnv("NEXT_PUBLIC_PARA_API_KEY", "");
    navigation.pathname = "/device-auth";
    navigation.search = "provider=para";
    const { WalletProviders } = await import("./wallet-providers");

    const view = render(
      <WalletProviders>
        <span>child</span>
      </WalletProviders>,
    );

    expect(walletKit.auth).toBe(false);
    expect(view.getAllByTestId("wallet-provider-root")).toHaveLength(1);
  });
});
