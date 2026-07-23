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

    expect(result.providerAccounts).toEqual([]);
    expect(result.standaloneAccounts).toHaveLength(1);
    expect(result.standaloneWallets).toEqual([]);
  });

  it("merges tenant-scoped provider identities with their EVM and SVM wallets", () => {
    const result = buildAccountAccessEntries(
      [
        {
          id: "identity-para-portal",
          provider: "para",
          subject: "para:user/123",
        },
        {
          id: "identity-para-widget",
          provider: "para",
          subject: "para:user/123",
        },
      ],
      [
        {
          id: "wallet-evm",
          family: "evm",
          address: "0x1111111111111111111111111111111111111111",
          kind: "embedded",
          provider: "para",
          linkedVia: "para",
        },
        {
          id: "wallet-svm",
          family: "svm",
          address: "53GfExampleSolanaAddress",
          kind: "embedded",
          provider: "para",
          linkedVia: "para",
        },
      ],
    );

    expect(result.providerAccounts).toHaveLength(1);
    expect(result.providerAccounts[0]).toMatchObject({
      key: "provider:para",
      provider: "para",
    });
    expect(
      result.providerAccounts[0]?.accounts.map((account) => account.id),
    ).toEqual(["identity-para-portal", "identity-para-widget"]);
    expect(
      result.providerAccounts[0]?.wallets.map((wallet) => wallet.family),
    ).toEqual(["evm", "svm"]);
    expect(result.standaloneAccounts).toEqual([]);
    expect(result.standaloneWallets).toEqual([]);
  });
});
