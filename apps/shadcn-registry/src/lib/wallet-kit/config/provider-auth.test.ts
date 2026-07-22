import { describe, expect, it } from "vitest";
import { providerAuth } from "./provider-auth";

describe("providerAuth", () => {
  it("configures an arbitrary provider without changing the transport", () => {
    const config = providerAuth({
      provider: "fake-provider",
      environment: "TEST",
      methods: ["email"],
      config: { publicKey: "browser-visible" },
    });

    expect(config).toEqual({
      provider: "fake-provider",
      environment: "TEST",
      methods: ["email"],
      providers: {
        "fake-provider": { publicKey: "browser-visible" },
      },
    });
  });
});
