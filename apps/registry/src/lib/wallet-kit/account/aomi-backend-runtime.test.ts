import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSiweMessage,
  buildWalletLinkMessage,
  buildDefaultWalletLabel,
  normalizeAccountWalletProvider,
  resolveAuthMessageConfig,
  resolveLinkedWalletName,
  useAomiBackendAccountRuntime,
} from "./aomi-backend-runtime";
import type { AomiAccountCredential } from "../types";

const mockState = vi.hoisted(() => ({
  accountClient: null as null | {
    getAccount: ReturnType<typeof vi.fn>;
    exchangeProviderCredential: ReturnType<typeof vi.fn>;
    createSiweNonce: ReturnType<typeof vi.fn>;
    verifySiwe: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    deleteAccount: ReturnType<typeof vi.fn>;
    updateAccount: ReturnType<typeof vi.fn>;
  },
}));

vi.mock("./aomi-backend-client", () => ({
  createAomiBackendAccountClient: vi.fn(() => mockState.accountClient),
}));

beforeEach(() => {
  mockState.accountClient = {
    getAccount: vi.fn().mockResolvedValue({
      user: null,
      linkedAccounts: [],
      wallets: [],
      session: null,
    }),
    exchangeProviderCredential: vi.fn(() => new Promise(() => undefined)),
    createSiweNonce: vi.fn(),
    verifySiwe: vi.fn(),
    signOut: vi.fn(),
    deleteAccount: vi.fn(),
    updateAccount: vi.fn(),
  };
});

describe("useAomiBackendAccountRuntime", () => {
  it("lets provider-credential session exchange create the account before auto-SIWE", async () => {
    const credential: AomiAccountCredential = {
      provider: "para",
      tokenKind: "session_jwt",
      providerToken: "provider-session",
    };
    const getCredential = vi.fn().mockResolvedValue(credential);
    const signMessageAsync = vi.fn().mockResolvedValue("0xsig");

    renderHook(() =>
      useAomiBackendAccountRuntime({
        enabled: true,
        baseUrl: "http://localhost:3000",
        auth: {
          status: "authenticated",
          provider: "para",
          subject: "para-user",
          getCredential,
        },
        evm: {
          activeEvmConnection: {
            address: "0x1111111111111111111111111111111111111111",
            chainId: 1,
          },
          activeAccount: undefined,
          accounts: () => [],
          signMessageAsync,
        },
      }),
    );

    await waitFor(() => {
      expect(
        mockState.accountClient?.exchangeProviderCredential,
      ).toHaveBeenCalledWith(credential, { hasAccount: false });
    });

    expect(mockState.accountClient?.createSiweNonce).not.toHaveBeenCalled();
    expect(signMessageAsync).not.toHaveBeenCalled();
  });
});

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

  it("keeps localhost host:port auth domains intact", () => {
    const config = resolveAuthMessageConfig({
      authDomain: "localhost:3000",
      authUri: "http://localhost:3000",
    });

    expect(config).toEqual({
      domain: "localhost:3000",
      uri: "http://localhost:3000",
    });
    expect(
      buildSiweMessage({
        address: "0x1111111111111111111111111111111111111111",
        chainId: 1,
        nonce: "nonce",
        ...config,
      }).split("\n")[0],
    ).toBe("localhost:3000 wants you to sign in with your Ethereum account:");
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

  it("falls back to the browser origin instead of building blank-domain messages", () => {
    const linkMessage = buildWalletLinkMessage({
      address: "0x1111111111111111111111111111111111111111",
      chainId: 1,
      nonce: "nonce",
      domain: " ",
      uri: " ",
    });
    const siweMessage = buildSiweMessage({
      address: "0x1111111111111111111111111111111111111111",
      chainId: 1,
      nonce: "nonce",
      domain: " ",
      uri: " ",
    });

    expect(linkMessage).not.toMatch(/^ wants /);
    expect(siweMessage).not.toMatch(/^ wants /);
    expect(linkMessage).toMatch(
      /^localhost(?::\d+)? wants to link this wallet/,
    );
    expect(siweMessage).toMatch(/^localhost(?::\d+)? wants you to sign in/);
  });

  it("ignores blank auth domains when building messages", () => {
    expect(
      resolveAuthMessageConfig({
        baseUrl: "http://localhost:3001",
        authDomain: " ",
      }),
    ).toEqual({
      domain: "localhost:3001",
      uri: "http://localhost:3001",
    });
  });
});
