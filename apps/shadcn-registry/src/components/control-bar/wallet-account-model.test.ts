import { beforeAll, describe, expect, it } from "vitest";
import { registerWalletProvider } from "../../lib/wallet-kit/providers/plugin-registry";
import {
  buildAccountAccessEntries,
  isProviderAuthProvider,
  providerBackedAccountProvider,
} from "./wallet-account-model";

// `isProviderAuthProvider` derives the provider-auth set from the plugin
// registry (a plugin with an `authMode`) rather than hardcoding names. Register
// minimal stand-ins so these unit tests exercise that path without importing
// the full provider modules.
beforeAll(() => {
  registerWalletProvider({ id: "para", authMode: "additive" });
  registerWalletProvider({ id: "privy", authMode: "additive" });
});

describe("isProviderAuthProvider", () => {
  it("recognizes providers whose registered plugin declares an authMode", () => {
    expect(isProviderAuthProvider("para")).toBe(true);
    expect(isProviderAuthProvider("PARA")).toBe(true);
    expect(isProviderAuthProvider("privy")).toBe(true);
  });

  it("returns false for unregistered / non-auth providers and empties", () => {
    expect(isProviderAuthProvider("custom")).toBe(false);
    expect(isProviderAuthProvider("siwe")).toBe(false);
    expect(isProviderAuthProvider(undefined)).toBe(false);
    expect(isProviderAuthProvider("")).toBe(false);
  });
});

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
