import { describe, expect, it, vi } from "vitest";

const register = vi.hoisted(() => vi.fn());

vi.mock("./privy-plugin", () => ({
  registerAomiPrivyWalletProvider: register,
}));

import { privyAuth } from "./widget-auth";

describe("privyAuth", () => {
  it("returns providerless auth when the app id is absent", () => {
    expect(privyAuth({ appId: undefined })).toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it("registers Privy and returns widget auth configuration", () => {
    expect(privyAuth({ appId: " app-id ", appName: "Client" })).toEqual({
      provider: "privy",
      methods: undefined,
      providers: {
        privy: {
          appId: "app-id",
          appName: "Client",
          appLogoUrl: undefined,
        },
      },
    });
    expect(register).toHaveBeenCalledOnce();
  });
});
