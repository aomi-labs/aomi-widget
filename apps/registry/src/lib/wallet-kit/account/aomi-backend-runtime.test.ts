import { describe, expect, it } from "vitest";
import {
  buildDefaultWalletLabel,
  resolveLinkedWalletName,
} from "./aomi-backend-runtime";

describe("resolveLinkedWalletName", () => {
  const accounts = [
    { id: "mm", address: "0xE9B0000000000000000000000000000000000018", walletName: "MetaMask" },
    { id: "privy-evm", address: "0xCC8000000000000000000000000000000000008f", walletName: "Privy Smart Wallet" },
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
