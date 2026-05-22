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
      primaryLabel: "0x1111..11",
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
  it("publishes verified wallet provider metadata for connected adapters", async () => {
    renderWithAdapter(
      connectedAdapter({
        authProvider: "baseAccount",
        secondaryLabel: "Base Account",
      }),
    );

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId("user-state").textContent!);
      expect(state).toMatchObject({
        connection: {
          is_connected: true,
          primary_family: "evm",
          provider: "baseAccount",
          provider_label: "Base Account",
        },
        evm: {
          address: "0x1111111111111111111111111111111111111111",
          chain_id: 8453,
        },
        ext: {
          walletProvider: "baseAccount",
          walletProviderLabel: "Base Account",
        },
      });
    });
  });

  it("clears wallet provider metadata when no verified provider is available", async () => {
    const { rerender } = renderWithAdapter(
      connectedAdapter({
        authProvider: "baseAccount",
        secondaryLabel: "Base Account",
      }),
    );

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId("user-state").textContent!);
      expect(state.ext).toMatchObject({
        walletProvider: "baseAccount",
        walletProviderLabel: "Base Account",
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
      expect(state.ext).toBeUndefined();
    });
  });
});
