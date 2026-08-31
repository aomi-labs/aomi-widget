import { describe, expect, it } from "vitest";
import {
  buildUnifiedAccountWallets,
  isProviderSigningWallet,
  visibleSignInMethods,
} from "./wallet-management-model";

describe("buildUnifiedAccountWallets", () => {
  it("deduplicates connected, linked, and policy records by family and address", () => {
    const rows = buildUnifiedAccountWallets({
      accounts: [
        {
          id: "rabby",
          family: "evm",
          address: "0xABC",
          walletName: "Rabby",
          walletKind: "external",
          active: true,
        },
      ],
      linkedWallets: [
        {
          id: "wallet-1",
          family: "evm",
          address: "0xabc",
          kind: "external",
          linkedVia: "siwe",
        },
      ],
      policies: [
        {
          id: "evm:0xabc",
          chain: "evm",
          address: "0xabc",
          linkedVia: "siwe",
          desiredMode: "manual",
          authVersion: 1,
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      walletName: "Rabby",
      connected: true,
      linked: true,
      active: true,
      connectedAccountId: "rabby",
      accountWalletId: "wallet-1",
    });
  });

  it("sorts the active wallet before connected and linked-only wallets", () => {
    const rows = buildUnifiedAccountWallets({
      accounts: [
        { id: "two", family: "svm", address: "Two", active: false },
        { id: "one", family: "evm", address: "0x1", active: true },
      ],
      linkedWallets: [
        {
          id: "three",
          family: "evm",
          address: "0x3",
          linkedVia: "siwe",
        },
      ],
      policies: [],
    });

    expect(rows.map((row) => row.address)).toEqual(["0x1", "Two", "0x3"]);
  });
});

describe("wallet management classification", () => {
  it("keeps public wallet proofs out of provider signing controls", () => {
    expect(
      isProviderSigningWallet({
        id: "external",
        chain: "evm",
        address: "0x1",
        linkedVia: "siwe",
        desiredMode: "manual",
        authVersion: 1,
      }),
    ).toBe(false);
    expect(
      isProviderSigningWallet({
        id: "para",
        chain: "evm",
        address: "0x2",
        linkedVia: "para",
        desiredMode: "auto",
        authVersion: 1,
      }),
    ).toBe(true);
  });

  it("hides transport wallet identities but keeps user sign-in methods", () => {
    expect(
      visibleSignInMethods([
        { id: "ba", provider: "better_auth", subject: "internal" },
        { id: "wallet", provider: "siwe", subject: "0x1" },
        { id: "google", provider: "google", subject: "person" },
        { id: "email", provider: "email", subject: "person@example.com" },
      ]).map((account) => account.provider),
    ).toEqual(["google", "email"]);
  });
});
