import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useUser, UserContextProvider } from "@aomi-labs/react";
import { AomiAuthAdapterProvider } from "../../../../../apps/registry/src/lib/aomi-auth-adapter/context";
import { AomiAuthRuntimeUserSync } from "../../../../../apps/registry/src/lib/aomi-auth-adapter/runtime-user-sync";
import type { AomiAuthAdapter } from "../../../../../apps/registry/src/lib/aomi-auth-adapter/types";

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
    connect: async () => undefined,
  };
}

function renderWithAdapter(adapter: AomiAuthAdapter) {
  return render(
    <UserContextProvider>
      <AomiAuthAdapterProvider value={adapter}>
        <AomiAuthRuntimeUserSync />
        <UserStateProbe />
      </AomiAuthAdapterProvider>
    </UserContextProvider>,
  );
}

describe("AomiAuthRuntimeUserSync", () => {
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
        address: "0x1111111111111111111111111111111111111111",
        chain_id: 8453,
        is_connected: true,
        wallet_provider: "baseAccount",
        wallet_kind: "smart-account",
        aa_mode: "4337",
        sponsored: true,
        sponsor_provider: "coinbase",
      });
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
        wallet_provider: "baseAccount",
        sponsored: true,
        sponsor_provider: "coinbase",
      });
    });

    rerender(
      <UserContextProvider>
        <AomiAuthAdapterProvider value={connectedAdapter()}>
          <AomiAuthRuntimeUserSync />
          <UserStateProbe />
        </AomiAuthAdapterProvider>
      </UserContextProvider>,
    );

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId("user-state").textContent!);
      expect(state.wallet_provider).toBeNull();
      expect(state.sponsored).toBeNull();
      expect(state.sponsor_provider).toBeNull();
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
        wallet_provider: "para",
        auth_method: "google",
        sponsored: true,
        sponsor_provider: "alchemy",
        sponsor_account: "gp_test_policy_id",
      });
    });
  });
});
