"use client";

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useUser, ExtUserProvider } from "@aomi-labs/react";
import { AomiWalletKitContextProvider } from "../../../../../apps/shadcn-registry/src/lib/wallet-kit/context";
import type { AomiWalletKit } from "../../../../../apps/shadcn-registry/src/lib/wallet-kit/types";

afterEach(() => {
  cleanup();
});

function UserStateProbe() {
  const { user } = useUser();
  return <pre data-testid="user-state">{JSON.stringify(user)}</pre>;
}

function connectedAdapter(
  overrides: Partial<AomiWalletKit["identity"]> = {},
): AomiWalletKit {
  return {
    identity: {
      status: "connected",
      isConnected: true,
      address: "0x1111111111111111111111111111111111111111",
      chainId: 8453,
      ...overrides,
    },
    isReady: true,
    isSwitchingChain: false,
    canConnect: false,
    canOpenAccountUI: false,
    canDisconnect: false,
    accounts: [],
    selectAccount: async () => undefined,
    connect: async () => undefined,
  };
}

function renderWithAdapter(adapter: AomiWalletKit) {
  return render(
    <ExtUserProvider>
      <AomiWalletKitContextProvider value={adapter}>
        <UserStateProbe />
      </AomiWalletKitContextProvider>
    </ExtUserProvider>,
  );
}

describe("AomiWalletKitContextProvider user sync", () => {
  it("publishes wallet provider and sponsorship as first-class UserState fields", async () => {
    renderWithAdapter(
      connectedAdapter({
        walletProvider: "baseAccount",
        walletKind: "smart-account",
        aaMode: "4337",
        sponsored: true,
        sponsorProvider: "coinbase",
      }),
    );

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId("user-state").textContent!);
      expect(state).toMatchObject({
        connection: {
          is_connected: true,
          provider: "baseAccount",
        },
        evm: {
          address: "0x1111111111111111111111111111111111111111",
          chain_id: 8453,
          sponsorship: {
            sponsored: true,
            sponsor_provider: "coinbase",
          },
        },
      });
      expect(state.evm?.aa?.mode).toBeUndefined();
    });
  });

  it("clears wallet provider metadata when no verified provider is available", async () => {
    const { rerender } = renderWithAdapter(
      connectedAdapter({
        walletProvider: "baseAccount",
        walletKind: "smart-account",
        aaMode: "4337",
        sponsored: true,
        sponsorProvider: "coinbase",
      }),
    );

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId("user-state").textContent!);
      expect(state).toMatchObject({
        connection: {
          provider: "baseAccount",
        },
        evm: {
          sponsorship: {
            sponsored: true,
            sponsor_provider: "coinbase",
          },
        },
      });
    });

    rerender(
      <ExtUserProvider>
        <AomiWalletKitContextProvider value={connectedAdapter()}>
          <UserStateProbe />
        </AomiWalletKitContextProvider>
      </ExtUserProvider>,
    );

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId("user-state").textContent!);
      expect(state.connection.provider).toBeNull();
      expect(state.evm.sponsorship.sponsored).toBeNull();
      expect(state.evm.sponsorship.sponsor_provider).toBeNull();
    });
  });

  it("publishes Para as wallet provider with sponsor account when alchemy gas policy is set", async () => {
    renderWithAdapter(
      connectedAdapter({
        walletProvider: "para",
        walletKind: "eoa",
        aaMode: "none",
        authMethod: "google",
        sponsored: true,
        sponsorProvider: "alchemy",
        sponsorAccount: "gp_test_policy_id",
      }),
    );

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId("user-state").textContent!);
      expect(state).toMatchObject({
        connection: {
          provider: "para",
          auth_method: "google",
        },
        evm: {
          sponsorship: {
            sponsored: true,
            sponsor_provider: "alchemy",
            sponsor_account: "gp_test_policy_id",
          },
        },
      });
    });
  });

  it("publishes empty SVM capabilities instead of null for EVM-only identity", async () => {
    renderWithAdapter(connectedAdapter());

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId("user-state").textContent!);
      expect(state.svm.capabilities).toEqual([]);
    });
  });
});
