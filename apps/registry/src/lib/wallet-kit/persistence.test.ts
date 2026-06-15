import { afterEach, describe, expect, it } from "vitest";
import { loadWalletPreferences, saveWalletPreferences } from "./persistence";

afterEach(() => {
  globalThis.localStorage?.clear();
});

describe("wallet preferences persistence", () => {
  it("round-trips preferences", () => {
    saveWalletPreferences("para", {
      selectedFamily: "svm",
      selectedEvmChainId: 8453,
      selectedSolanaNetworkId: "solana-mainnet",
    });
    expect(loadWalletPreferences("para")).toEqual({
      selectedFamily: "svm",
      selectedEvmChainId: 8453,
      selectedSolanaNetworkId: "solana-mainnet",
    });
  });

  it("returns {} when nothing stored", () => {
    expect(loadWalletPreferences("para")).toEqual({});
  });

  it("returns {} on malformed JSON", () => {
    globalThis.localStorage.setItem("aomi.wallet-preferences.para", "{not json");
    expect(loadWalletPreferences("para")).toEqual({});
  });

  it("scopes by key", () => {
    saveWalletPreferences("para", { selectedFamily: "evm" });
    expect(loadWalletPreferences("privy")).toEqual({});
  });

  it("keeps svm wire-family preferences in the internal vocabulary", () => {
    globalThis.localStorage.setItem(
      "aomi.wallet-preferences.para",
      JSON.stringify({ selectedFamily: "svm" }),
    );
    expect(loadWalletPreferences("para")).toEqual({ selectedFamily: "svm" });
    expect(globalThis.localStorage.getItem("aomi.wallet-preferences.para")).toBe(
      JSON.stringify({ selectedFamily: "svm" }),
    );
  });
});
