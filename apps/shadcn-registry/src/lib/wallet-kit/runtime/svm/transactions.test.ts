import { describe, expect, it, vi } from "vitest";
import type { SafeSvmWalletState } from "./wallet-runtime";
import { buildSvmTransactionMethods } from "./transactions";

function wallet(
  overrides: Partial<SafeSvmWalletState> = {},
): SafeSvmWalletState {
  return {
    publicKey: "So11111111111111111111111111111111111111112",
    connected: true,
    connecting: false,
    disconnecting: false,
    walletName: "Test Wallet",
    wallets: [],
    select: undefined,
    connect: undefined,
    disconnect: undefined,
    signTransaction: undefined,
    signAllTransactions: undefined,
    signMessage: undefined,
    sendTransaction: vi.fn(),
    ...overrides,
  };
}

describe("buildSvmTransactionMethods", () => {
  it("omits direct sign-and-send when preferDirectSend is disabled", () => {
    const execution = buildSvmTransactionMethods(wallet(), {
      preferDirectSend: false,
      rpcHttpUrl: "https://solana.example",
    });

    expect(execution.signAndSendSolanaTransaction).toBeUndefined();
    expect(execution.sendSolanaTransaction).toBeTypeOf("function");
  });
});
