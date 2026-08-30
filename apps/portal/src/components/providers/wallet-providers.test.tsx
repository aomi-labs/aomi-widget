import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const walletKit = vi.hoisted(() => ({
  auth: undefined as unknown,
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
    return children;
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
  PrivyDelegationProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@portal/components/providers/e2e-wallet-provider", () => ({
  E2EWalletProvider: ({ children }: { children: ReactNode }) => children,
}));

describe("WalletProviders Privy configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    walletKit.auth = undefined;
  });

  it("leaves enabled login methods under Privy's authority", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRIVY_APP_ID", "privy-app");
    const { WalletProviders } = await import("./wallet-providers");

    render(
      <WalletProviders>
        <span>child</span>
      </WalletProviders>,
    );

    expect(walletKit.auth).toEqual({ provider: "privy" });
  });
});
