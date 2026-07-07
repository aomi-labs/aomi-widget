import { describe, expect, it } from "vitest";
import {
  buildAccountAccessEntries,
  providerBackedAccountProvider,
} from "./wallet-account-model";

describe("providerBackedAccountProvider", () => {
  it("treats custom embedded and smart-account wallets as provider-backed", () => {
    expect(
      providerBackedAccountProvider({
        provider: "custom",
        kind: "embedded",
      }),
    ).toBe("custom");
    expect(
      providerBackedAccountProvider({
        provider: "custom",
        kind: "smart_account",
      }),
    ).toBe("custom");
  });

  it("keeps external provider-tagged wallets standalone", () => {
    expect(
      providerBackedAccountProvider({
        provider: "custom",
        kind: "external",
      }),
    ).toBeNull();
  });

  it("does not treat SIWE verification as a provider-backed account", () => {
    expect(
      providerBackedAccountProvider({
        provider: "siwe",
        linkedVia: "siwe",
        source: "live",
      }),
    ).toBeNull();
  });

  it("groups explicit live provider rows when no stored kind is available yet", () => {
    expect(
      providerBackedAccountProvider({
        provider: "custom",
        source: "live",
      }),
    ).toBe("custom");
  });
});

describe("buildAccountAccessEntries", () => {
  it("omits provider-backed wallets from account access", () => {
    const result = buildAccountAccessEntries(
      [
        {
          id: "identity-custom",
          provider: "custom",
          subject: "custom-user",
        },
      ],
      [
        {
          id: "wallet-custom",
          family: "evm",
          address: "0x1111111111111111111111111111111111111111",
          kind: "embedded",
          provider: "custom",
          linkedVia: "custom",
        },
      ],
    );

    expect(result.standaloneAccounts).toHaveLength(1);
    expect(result.standaloneWallets).toEqual([]);
  });
});
