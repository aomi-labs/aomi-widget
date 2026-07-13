import { describe, expect, it, vi } from "vitest";

const register = vi.hoisted(() => vi.fn());

vi.mock("./para-plugin", () => ({
  registerAomiParaWalletProvider: register,
}));

import { paraAuth } from "./widget-auth";

describe("paraAuth", () => {
  it("returns providerless auth when the publishable key is absent", () => {
    expect(paraAuth({ apiKey: " " })).toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it("registers Para and returns widget auth configuration", () => {
    expect(
      paraAuth({ apiKey: " key ", environment: "PROD", appName: "Client" }),
    ).toEqual({
      provider: "para",
      methods: ["email", "google"],
      providers: {
        para: {
          apiKey: "key",
          environment: "PROD",
          appName: "Client",
          appDescription: "Aomi widget",
          appUrl: undefined,
        },
      },
    });
    expect(register).toHaveBeenCalledOnce();
  });
});
