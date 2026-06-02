import { describe, expect, it } from "vitest";
import { buildAccounts, isAccountSelectable } from "./accounts";

describe("buildAccounts", () => {
  it("tags EVM connections and marks the active one", () => {
    const accounts = buildAccounts({
      evmConnections: [
        { id: "mm", walletName: "MetaMask", address: "0xAAA", chainId: 1 },
        { id: "rb", walletName: "Rabby", address: "0xBBB", chainId: 1 },
      ],
      activeEvmAddress: "0xbbb",
      solanaConnections: [],
    });
    expect(accounts).toHaveLength(2);
    expect(accounts[0]).toMatchObject({ family: "evm", walletName: "MetaMask", active: false });
    expect(accounts[1]).toMatchObject({ family: "evm", walletName: "Rabby", active: true });
  });

  it("adds connected Solana wallets and marks the selected address active", () => {
    const accounts = buildAccounts({
      evmConnections: [],
      activeEvmAddress: undefined,
      solanaConnections: [
        { publicKey: "9xQpub", walletName: "Phantom" },
        { publicKey: "AbCpub", walletName: "Solflare" },
      ],
      activeSolanaAddress: "AbCpub",
    });
    expect(accounts).toHaveLength(2);
    expect(accounts[0]).toMatchObject({ family: "solana", address: "9xQpub", active: false });
    expect(accounts[1]).toMatchObject({ family: "solana", address: "AbCpub", active: true });
    expect(accounts[0].id).toBe("Phantom");
  });

  it("preserves Solana address case while matching the active wallet", () => {
    const accounts = buildAccounts({
      evmConnections: [],
      activeEvmAddress: undefined,
      solanaConnections: [{ publicKey: "9xQpub" }],
      activeSolanaAddress: "9XQPUB",
    });
    expect(accounts[0]).toMatchObject({ family: "solana", id: "9xQpub", active: false });
  });

  it("returns both families for a dual connection", () => {
    const accounts = buildAccounts({
      evmConnections: [{ id: "mm", walletName: "MetaMask", address: "0xAAA", chainId: 1 }],
      activeEvmAddress: "0xAAA",
      solanaConnections: [{ publicKey: "9xQpub", walletName: "Phantom" }],
      activeSolanaAddress: "9xQpub",
    });
    expect(accounts.filter((a) => a.family === "evm")).toHaveLength(1);
    expect(accounts.filter((a) => a.family === "solana")).toHaveLength(1);
  });

  it("returns empty when nothing is connected", () => {
    expect(buildAccounts({ evmConnections: [], activeEvmAddress: undefined })).toEqual([]);
  });
});

describe("isAccountSelectable", () => {
  it("only allows accounts in the active family", () => {
    const evm = { id: "x", family: "evm", address: "0x", active: false } as const;
    expect(isAccountSelectable(evm, "evm")).toBe(true);
    expect(isAccountSelectable(evm, "solana")).toBe(false);
  });
});
