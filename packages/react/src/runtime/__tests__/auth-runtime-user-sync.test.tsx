"use client";

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useUser, ExtUserProvider } from "@aomi-labs/react";
import { AomiAuthAdapterProvider } from "../../../../../apps/shadcn-registry/src/lib/auth-adapter/context";
import type { AomiAuthAdapter } from "../../../../../apps/shadcn-registry/src/lib/auth-adapter/types";

afterEach(() => {
  cleanup();
});

function UserStateProbe() {
  const { user } = useUser();
  return <pre data-testid="user-state">{JSON.stringify(user)}</pre>;
}

function connectedAdapter(
  overrides: Partial<AomiAuthAdapter["identity"]> = {},
): AomiAuthAdapter {
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

function renderWithAdapter(adapter: AomiAuthAdapter) {
  return render(
    <ExtUserProvider>
      <AomiAuthAdapterProvider value={adapter}>
        <UserStateProbe />
      </AomiAuthAdapterProvider>
    </ExtUserProvider>,
  );
}

describe("AomiAuthAdapterProvider user sync", () => {
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
        <AomiAuthAdapterProvider value={connectedAdapter()}>
          <UserStateProbe />
        </AomiAuthAdapterProvider>
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
});
