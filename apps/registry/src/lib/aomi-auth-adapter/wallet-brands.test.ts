import { describe, expect, it } from "vitest";
import {
  canonicalWalletKey,
  dedupeWalletOptions,
  detectEvmProviderBrand,
} from "./wallet-brands";

describe("canonicalWalletKey", () => {
  it("collapses ids, labels and rdns onto one brand key", () => {
    expect(canonicalWalletKey("MetaMask")).toBe("metamask");
    expect(canonicalWalletKey("io.metamask")).toBe("metamask");
    expect(canonicalWalletKey("Rabby Wallet")).toBe("rabby");
    expect(canonicalWalletKey("Coinbase Wallet")).toBe("coinbase");
    expect(canonicalWalletKey("uid-123 Phantom")).toBe("phantom");
    expect(canonicalWalletKey("Para Solana")).toBe("para");
  });

  it("echoes the normalized input for unknown brands", () => {
    expect(canonicalWalletKey("Some New Wallet")).toBe("somenewwallet");
  });
});

describe("detectEvmProviderBrand", () => {
  it("prefers specific brand flags over the compatibility isMetaMask flag", () => {
    expect(
      detectEvmProviderBrand({ isRabby: true, isMetaMask: true }),
    ).toBe("Rabby");
    expect(
      detectEvmProviderBrand({ isPhantom: true, isMetaMask: true }),
    ).toBe("Phantom");
    expect(
      detectEvmProviderBrand({ isRainbow: true, isMetaMask: true }),
    ).toBe("Rainbow");
  });

  it("detects plain MetaMask", () => {
    expect(detectEvmProviderBrand({ isMetaMask: true })).toBe("MetaMask");
  });

  it("returns undefined for unbranded or missing providers", () => {
    expect(detectEvmProviderBrand({})).toBeUndefined();
    expect(detectEvmProviderBrand(null)).toBeUndefined();
    expect(detectEvmProviderBrand(undefined)).toBeUndefined();
    expect(detectEvmProviderBrand("not-an-object")).toBeUndefined();
  });
});

describe("dedupeWalletOptions", () => {
  it("prefers rdns-backed EIP-6963 options over branded duplicates", () => {
    const options = dedupeWalletOptions([
      {
        id: "metaMaskSDK-uid",
        connectorId: "metaMaskSDK",
        label: "MetaMask",
        family: "evm",
        kind: "evm",
        status: "installed",
      },
      {
        id: "io.metamask-uid",
        connectorId: "io.metamask",
        label: "MetaMask",
        family: "evm",
        kind: "evm",
        status: "installed",
      },
    ]);

    expect(options).toHaveLength(1);
    expect(options[0]?.id).toBe("io.metamask-uid");
  });
});
