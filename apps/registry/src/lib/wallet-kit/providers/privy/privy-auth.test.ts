import { describe, expect, it } from "vitest";
import {
  buildPrivyClientConfig,
  privyLoginMethodsToOptions,
} from "./privy-auth";

describe("privyLoginMethodsToOptions", () => {
  it("collapses multiple Privy methods into one provider row", () => {
    expect(privyLoginMethodsToOptions(["email", "google", "wallet"])).toEqual([
      expect.objectContaining({
        id: "privy",
        label: "Email, wallet, or social",
        kind: "social",
        status: "available",
      }),
    ]);
  });

  it("keeps the existing Google-only label", () => {
    expect(privyLoginMethodsToOptions(["google"])[0]?.label).toBe(
      "Email or Google",
    );
  });
});

describe("buildPrivyClientConfig", () => {
  it("creates both Ethereum and Solana embedded wallets for all users", () => {
    expect(buildPrivyClientConfig({}).embeddedWallets).toMatchObject({
      ethereum: { createOnLogin: "all-users" },
      solana: { createOnLogin: "all-users" },
    });
  });
});
