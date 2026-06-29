import { describe, expect, it } from "vitest";
import {
  buildSiweMessage,
  buildWalletLinkMessage,
  buildDefaultWalletLabel,
  normalizeAccountWalletProvider,
  resolveAuthMessageConfig,
  resolveLinkedWalletName,
} from "./aomi-backend-runtime";

describe("resolveLinkedWalletName", () => {
  const accounts = [
    {
      id: "mm",
      address: "0xE9B0000000000000000000000000000000000018",
      walletName: "MetaMask",
    },
    {
      id: "privy-evm",
      address: "0xCC8000000000000000000000000000000000008f",
      walletName: "Privy Smart Wallet",
    },
  ];

  it("names the linked wallet, not the active signer (the reported bug)", () => {
    // Linking MetaMask while the Privy smart wallet is the active EVM signer.
    expect(
      resolveLinkedWalletName({
        accounts,
        accountId: "mm",
        address: "0xE9B0000000000000000000000000000000000018",
        fallbackWalletName: "Privy Smart Wallet",
      }),
    ).toBe("MetaMask");
  });

  it("matches by address case-insensitively when no account id is given", () => {
    expect(
      resolveLinkedWalletName({
        accounts,
        address: "0xe9b0000000000000000000000000000000000018",
      }),
    ).toBe("MetaMask");
  });

  it("falls back to the active connection name when not in the live set", () => {
    expect(
      resolveLinkedWalletName({
        accounts,
        address: "0xDEAD000000000000000000000000000000000000",
        fallbackWalletName: "Rabby",
      }),
    ).toBe("Rabby");
  });
});

describe("buildDefaultWalletLabel", () => {
  it("brands and counts per family", () => {
    expect(
      buildDefaultWalletLabel({
        walletName: "MetaMask",
        existingWallets: [],
        family: "evm",
      }),
    ).toBe("MetaMask 1");
  });

  it("increments past same-brand wallets", () => {
    expect(
      buildDefaultWalletLabel({
        walletName: "MetaMask",
        existingWallets: [
          {
            id: "w1",
            family: "evm",
            address: "0x1",
            linkedVia: "siwe",
            label: "MetaMask 1",
          },
        ],
        family: "evm",
      }),
    ).toBe("MetaMask 2");
  });

  it("falls back to 'Wallet' for an unknown brand", () => {
    expect(
      buildDefaultWalletLabel({
        walletName: undefined,
        existingWallets: [],
        family: "evm",
      }),
    ).toBe("Wallet 1");
  });
});

describe("normalizeAccountWalletProvider", () => {
  it("classifies linked backend wallets that match live embedded provider accounts", () => {
    expect(
      normalizeAccountWalletProvider(
        {
          id: "wallet-1",
          family: "evm",
          address: "0xE7700000000000000000000000000000000000A6",
          linkedVia: "para",
          label: "Para 1",
        },
        [
          {
            family: "evm",
            address: "0xe7700000000000000000000000000000000000a6",
            provider: "para",
            walletKind: "embedded",
          },
        ],
      ),
    ).toMatchObject({
      provider: "para",
      kind: "embedded",
    });
  });

  it("does not reclassify external wallets just because they are live", () => {
    const wallet = {
      id: "wallet-1",
      family: "evm" as const,
      address: "0xE7700000000000000000000000000000000000A6",
      linkedVia: "siwe" as const,
      label: "MetaMask 1",
    };

    expect(
      normalizeAccountWalletProvider(wallet, [
        {
          family: "evm",
          address: "0xe7700000000000000000000000000000000000a6",
          provider: undefined,
          walletKind: undefined,
        },
      ]),
    ).toEqual(wallet);
  });

  it("classifies provider-linked backend wallets even when the wallet is not currently live", () => {
    expect(
      normalizeAccountWalletProvider(
        {
          id: "wallet-1",
          family: "evm",
          address: "0xE7700000000000000000000000000000000000A6",
          linkedVia: "privy",
          label: "Privy 1",
        },
        [],
      ),
    ).toMatchObject({
      provider: "privy",
      kind: "embedded",
    });
  });
});

describe("auth message config", () => {
  it("uses the backend base URL as the SIWE domain when configured", () => {
    expect(
      resolveAuthMessageConfig({
        baseUrl: "https://portal.aomi.dev/api",
      }),
    ).toEqual({
      domain: "portal.aomi.dev",
      uri: "https://portal.aomi.dev",
    });
  });

  it("lets callers override the auth domain and URI", () => {
    expect(
      resolveAuthMessageConfig({
        baseUrl: "https://proxy.example.com",
        authDomain: "auth.example.com",
        authUri: "https://auth.example.com/",
      }),
    ).toEqual({
      domain: "auth.example.com",
      uri: "https://auth.example.com",
    });
  });

  it("builds SIWE and wallet-link messages with the auth domain", () => {
    expect(
      buildSiweMessage({
        address: "0x1111111111111111111111111111111111111111",
        chainId: 1,
        nonce: "nonce",
        domain: "portal.aomi.dev",
        uri: "https://portal.aomi.dev",
      }),
    ).toContain("portal.aomi.dev wants you to sign in");
    expect(
      buildWalletLinkMessage({
        address: "0x1111111111111111111111111111111111111111",
        chainId: 1,
        nonce: "nonce",
        domain: "portal.aomi.dev",
        uri: "https://portal.aomi.dev",
      }),
    ).toContain("URI: https://portal.aomi.dev");
  });
});
