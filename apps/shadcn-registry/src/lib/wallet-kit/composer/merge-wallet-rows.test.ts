import { describe, expect, it } from "vitest";
import { mergeWalletRows } from "./merge-wallet-rows";
import type { AomiAccount } from "../types";
import type { AccountWallet } from "../account/types";

const liveEvmAccount: AomiAccount = {
  id: "metamask-1",
  family: "evm",
  address: "0xAbC0000000000000000000000000000000000000",
  label: "0xAbC..00",
  walletName: "MetaMask",
  active: true,
};

describe("account wallet row merging", () => {
  it("marks live rows linked when the account runtime knows the wallet", () => {
    const rows = mergeWalletRows({
      accounts: [liveEvmAccount],
      storedWallets: [
        {
          id: "stored-1",
          family: "evm",
          address: "0xabc0000000000000000000000000000000000000",
          kind: "external",
          linkedVia: "observed",
          capability: "read",
        },
      ],
    });

    expect(rows[0]).toMatchObject({
      linked: true,
      linkedVia: "observed",
      capability: "read",
    });
  });

  it("dedupes stored wallets against live rows by family and address", () => {
    const rows = mergeWalletRows({
      accounts: [{ ...liveEvmAccount, linked: true, capability: "write" }],
      storedWallets: [
        {
          id: "stored-1",
          family: "evm",
          address: "0xabc0000000000000000000000000000000000000",
          kind: "external",
          linkedVia: "observed",
          capability: "read",
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "metamask-1",
      status: "active",
      linked: true,
      capability: "write",
    });
  });

  it("keeps a disconnect action on inactive live wallet rows", () => {
    const rows = mergeWalletRows({
      accounts: [{ ...liveEvmAccount, active: false }],
    });

    expect(rows[0]?.actions).toEqual([
      { kind: "disconnect", label: "Disconnect" },
    ]);
  });

  it("renders stored external wallets with connect action", () => {
    const storedWallet: AccountWallet = {
      id: "stored-external",
      family: "evm",
      address: "0xdef0000000000000000000000000000000000000",
      kind: "external",
      linkedVia: "challenge",
      capability: "read",
    };

    const rows = mergeWalletRows({
      accounts: [],
      storedWallets: [storedWallet],
    });

    expect(rows[0]).toMatchObject({
      id: "stored-external",
      source: "stored",
      status: "stored",
      linked: true,
      capability: "read",
      actions: [{ kind: "connect", label: "Connect" }],
    });
  });

  it("renders signed-out stored embedded wallets with authenticate action", () => {
    const rows = mergeWalletRows({
      accounts: [],
      storedWallets: [
        {
          id: "para-embedded",
          family: "evm",
          address: "0x1230000000000000000000000000000000000000",
          kind: "embedded",
          provider: "para",
          linkedVia: "para",
        },
      ],
      auth: { provider: "para", status: "unauthenticated" },
    });

    expect(rows[0]?.actions).toEqual([
      { kind: "authenticate", label: "Sign in" },
    ]);
  });
});
