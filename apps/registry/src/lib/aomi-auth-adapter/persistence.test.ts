import { afterEach, describe, expect, it } from "vitest";
import { loadWalletPreferences, saveWalletPreferences } from "./persistence";

afterEach(() => {
  globalThis.localStorage?.clear();
});

describe("wallet preferences persistence", () => {
  it("round-trips preferences", () => {
    saveWalletPreferences("para", {
      selectedFamily: "solana",
      selectedEvmChainId: 8453,
      selectedSolanaNetworkId: "solana-mainnet",
    });
    expect(loadWalletPreferences("para")).toEqual({
      selectedFamily: "solana",
      selectedEvmChainId: 8453,
      selectedSolanaNetworkId: "solana-mainnet",
    });
  });

  it("returns {} when nothing stored", () => {
    expect(loadWalletPreferences("para")).toEqual({});
  });

  it("returns {} on malformed JSON", () => {
    globalThis.localStorage.setItem(
      "aomi.wallet-preferences.para",
      "{not json",
    );
    expect(loadWalletPreferences("para")).toEqual({});
  });

  it("scopes by key", () => {
    saveWalletPreferences("para", { selectedFamily: "evm" });
    expect(loadWalletPreferences("privy")).toEqual({});
  });

  it("migrates svm wire-family preferences back to the solana UI value", () => {
    globalThis.localStorage.setItem(
      "aomi.wallet-preferences.para",
      JSON.stringify({ selectedFamily: "svm" }),
    );
    expect(loadWalletPreferences("para")).toEqual({ selectedFamily: "solana" });
    expect(
      globalThis.localStorage.getItem("aomi.wallet-preferences.para"),
    ).toBe(JSON.stringify({ selectedFamily: "solana" }));
  });
});
