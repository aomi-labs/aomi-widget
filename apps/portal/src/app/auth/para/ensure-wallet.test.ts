import { describe, expect, it, vi } from "vitest";

import { ensureEmbeddedWallet } from "./ensure-wallet";

describe("ensureEmbeddedWallet", () => {
  it("does not create when a usable wallet of the family exists", async () => {
    const fetchWallets = vi.fn(async () => [
      { type: "SOLANA", address: "So111" },
      { type: "EVM", address: "0xabc" },
    ]);
    const createWallet = vi.fn(async () => ({}));

    const result = await ensureEmbeddedWallet({
      type: "EVM",
      fetchWallets,
      createWallet,
    });

    expect(result).toBeNull();
    expect(createWallet).not.toHaveBeenCalled();
  });

  it("creates the requested family when it is missing", async () => {
    const fetchWallets = vi.fn(async () => [{ type: "EVM", address: "0xabc" }]);
    const createWallet = vi.fn(async () => ({}));

    const result = await ensureEmbeddedWallet({
      type: "SOLANA",
      fetchWallets,
      createWallet,
    });

    expect(result).toBeNull();
    expect(createWallet).toHaveBeenCalledTimes(1);
    expect(createWallet).toHaveBeenCalledWith({ type: "SOLANA" });
  });

  it("ignores wallets without an address — the backend drops them", async () => {
    const fetchWallets = vi.fn(async () => [{ type: "EVM", address: "  " }]);
    const createWallet = vi.fn(async () => ({}));

    const result = await ensureEmbeddedWallet({
      type: "EVM",
      fetchWallets,
      createWallet,
    });

    expect(result).toBeNull();
    expect(createWallet).toHaveBeenCalledWith({ type: "EVM" });
  });

  it("tolerates a create failure when the wallet materialized anyway", async () => {
    const fetchWallets = vi
      .fn(async () => [{ type: "EVM", address: "0xabc" }])
      .mockResolvedValueOnce([]);
    const createWallet = vi.fn(async () => {
      throw new Error("wallet already exists");
    });

    const result = await ensureEmbeddedWallet({
      type: "EVM",
      fetchWallets,
      createWallet,
    });

    expect(result).toBeNull();
    expect(fetchWallets).toHaveBeenCalledTimes(2);
  });

  it("reports a create failure when the wallet is still missing", async () => {
    const fetchWallets = vi.fn(async () => []);
    const createWallet = vi.fn(async () => {
      throw new Error("keygen failed");
    });

    const result = await ensureEmbeddedWallet({
      type: "SOLANA",
      fetchWallets,
      createWallet,
    });

    expect(result).toBe(
      "Could not create your Para SOLANA wallet: keygen failed",
    );
  });

  it("reports a wallet-list read failure without attempting a create", async () => {
    const fetchWallets = vi.fn(async () => {
      throw new Error("session expired");
    });
    const createWallet = vi.fn(async () => ({}));

    const result = await ensureEmbeddedWallet({
      type: "EVM",
      fetchWallets,
      createWallet,
    });

    expect(result).toBe("Could not read your Para wallets: session expired");
    expect(createWallet).not.toHaveBeenCalled();
  });
});
