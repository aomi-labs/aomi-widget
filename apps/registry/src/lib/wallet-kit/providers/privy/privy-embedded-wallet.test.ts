import { describe, expect, it } from "vitest";
import type { ConnectedWallet } from "@privy-io/react-auth";
import { pickPrivyEmbeddedEvmWallet } from "./privy-auth";

type MinimalConnectedWallet = Pick<
  ConnectedWallet,
  "type" | "address" | "walletClientType" | "connectorType" | "imported"
> & { meta?: unknown };

function wallet(
  overrides: Partial<MinimalConnectedWallet>,
): ConnectedWallet {
  return {
    type: "ethereum",
    address: "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
    walletClientType: "privy",
    connectorType: "embedded",
    imported: false,
    ...overrides,
  } as unknown as ConnectedWallet;
}

describe("pickPrivyEmbeddedEvmWallet", () => {
  it("picks the non-imported privy embedded EVM wallet", () => {
    const picked = pickPrivyEmbeddedEvmWallet([
      wallet({ address: "0xAAAA", walletClientType: "metamask" }),
      wallet({ address: "0xCCCC", walletClientType: "privy" }),
    ]);
    expect(picked?.address).toBe("0xCCCC");
  });

  it("recognizes the privy-v2 embedded client type", () => {
    const picked = pickPrivyEmbeddedEvmWallet([
      wallet({ address: "0xBBBB", walletClientType: "privy-v2" }),
    ]);
    expect(picked?.address).toBe("0xBBBB");
  });

  it("skips imported embedded wallets (not custodied by this app)", () => {
    const picked = pickPrivyEmbeddedEvmWallet([
      wallet({ address: "0xIMPORTED", imported: true }),
    ]);
    expect(picked).toBeUndefined();
  });

  it("skips external wallets (MetaMask / Rainbow / WalletConnect)", () => {
    const picked = pickPrivyEmbeddedEvmWallet([
      wallet({ address: "0xMM", walletClientType: "metamask" }),
      wallet({ address: "0xRB", walletClientType: "rainbow" }),
      wallet({
        address: "0xWC",
        walletClientType: "wallet_connect",
        connectorType: "wallet_connect",
      }),
    ]);
    expect(picked).toBeUndefined();
  });

  it("skips Solana embedded wallets", () => {
    const picked = pickPrivyEmbeddedEvmWallet([
      wallet({
        type: "solana" as ConnectedWallet["type"],
        address: "SoLAddr",
        walletClientType: "privy",
      }),
    ]);
    expect(picked).toBeUndefined();
  });

  it("returns undefined when there are no wallets", () => {
    expect(pickPrivyEmbeddedEvmWallet([])).toBeUndefined();
  });

  it("prefers the embedded EVM wallet over external wallets in a mixed set", () => {
    const picked = pickPrivyEmbeddedEvmWallet([
      wallet({ address: "0xMM", walletClientType: "metamask" }),
      wallet({ address: "0xEMB", walletClientType: "privy" }),
      wallet({
        type: "solana" as ConnectedWallet["type"],
        address: "SoL",
        walletClientType: "privy",
      }),
    ]);
    expect(picked?.address).toBe("0xEMB");
  });
});
