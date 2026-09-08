import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AomiWalletKitContextProvider } from "./context";
import { AOMI_SESSION_DISCONNECTED_IDENTITY } from "./identity";
import type { AomiWalletKit } from "./types";

const setUser = vi.hoisted(() => vi.fn());
vi.mock("@aomi-labs/react", () => ({ useUser: () => ({ setUser }) }));

describe("connector facts versus selected transaction account", () => {
  it("preserves an agent selection during network refresh, but resets it on a wallet switch or reconnect", () => {
    const wallet = {
      identity: {
        ...AOMI_SESSION_DISCONNECTED_IDENTITY,
        isConnected: true,
        address: "0xLogin",
        chainId: 1,
      },
    } as AomiWalletKit;
    const view = render(
      <AomiWalletKitContextProvider value={wallet}>
        {null}
      </AomiWalletKitContextProvider>,
    );
    expect(setUser.mock.lastCall?.[0].evm.address).toBe("0xLogin");
    const network = {
      ...wallet,
      identity: { ...wallet.identity, chainId: 8453 },
    };
    view.rerender(
      <AomiWalletKitContextProvider value={network}>
        {null}
      </AomiWalletKitContextProvider>,
    );
    expect(setUser.mock.lastCall?.[0].evm).toEqual({ chain_id: 8453 });
    const switched = {
      ...network,
      identity: { ...network.identity, address: "0xOther" },
    };
    view.rerender(
      <AomiWalletKitContextProvider value={switched}>
        {null}
      </AomiWalletKitContextProvider>,
    );
    expect(setUser.mock.lastCall?.[0].evm.address).toBe("0xOther");
    view.rerender(
      <AomiWalletKitContextProvider
        value={{
          ...switched,
          identity: { ...switched.identity, isConnected: false },
        }}
      >
        {null}
      </AomiWalletKitContextProvider>,
    );
    view.rerender(
      <AomiWalletKitContextProvider value={switched}>
        {null}
      </AomiWalletKitContextProvider>,
    );
    expect(setUser.mock.lastCall?.[0].evm.address).toBe("0xOther");
  });
});
