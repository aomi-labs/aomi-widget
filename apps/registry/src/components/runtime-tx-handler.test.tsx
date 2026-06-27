import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runtimeState = vi.hoisted(() => ({
  user: {},
  pendingWalletRequests: [] as Array<Record<string, unknown>>,
  resolveWalletRequest: vi.fn(),
  rejectWalletRequest: vi.fn(),
  simulateBatchTransactions: vi.fn(),
}));

const authState = vi.hoisted(() => ({
  identity: {
    chainId: 8453,
    svmAddress: "So11111111111111111111111111111111111111112",
    solanaWalletName: "Test Wallet",
  },
  isReady: true,
  activeFamily: "solana",
  activeNetwork: { family: "solana", networkId: "solana-devnet" },
  supportedNetworks: {
    solana: [
      { id: "solana-devnet", cluster: "solana:devnet" },
      { id: "solana-mainnet", cluster: "solana:mainnet" },
    ],
  },
  selectNetwork: vi.fn(),
  signSolanaTransaction: vi.fn(),
  signSolanaMessage: vi.fn(),
}));

vi.mock("@aomi-labs/react", () => ({
  UserState: {
    address: () => undefined,
  },
  appendFeeCallToPayload: vi.fn(),
  hydrateTxPayloadFromUserState: vi.fn((payload) => payload),
  parseChainId: vi.fn(),
  toViemSignTypedDataArgs: vi.fn(),
  useAomiRuntime: () => runtimeState,
}));

vi.mock("../lib/aomi-auth-adapter", () => ({
  useAomiAuthAdapter: () => authState,
}));

import { RuntimeTxHandler } from "./runtime-tx-handler";

describe("RuntimeTxHandler", () => {
  beforeEach(() => {
    runtimeState.user = {};
    runtimeState.pendingWalletRequests = [];
    runtimeState.resolveWalletRequest.mockReset();
    runtimeState.rejectWalletRequest.mockReset();
    runtimeState.simulateBatchTransactions.mockReset();
    authState.selectNetwork.mockReset();
    authState.signSolanaTransaction.mockReset();
    authState.signSolanaMessage.mockReset();
    authState.activeNetwork = { family: "solana", networkId: "solana-devnet" };
  });

  afterEach(() => {
    cleanup();
  });

  it("dispatches solana_sign requests through signSolanaTransaction", async () => {
    authState.signSolanaTransaction.mockResolvedValue({
      signedTx: "SIGNED_TX",
    });
    runtimeState.pendingWalletRequests = [
      {
        id: "solana_sign-7",
        kind: "solana_sign",
        payload: {
          unsignedTx: "AQID",
          description: "Swap 1 USDC for SOL",
          cluster: "solana:devnet",
          pendingSolanaId: 7,
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(authState.signSolanaTransaction).toHaveBeenCalledWith({
        unsignedTx: "AQID",
        description: "Swap 1 USDC for SOL",
        cluster: "solana:devnet",
        pendingSolanaId: 7,
      });
    });
    expect(runtimeState.resolveWalletRequest).toHaveBeenCalledWith(
      "solana_sign-7",
      { kind: "solana_sign", signedTx: "SIGNED_TX" },
    );
    expect(runtimeState.rejectWalletRequest).not.toHaveBeenCalled();
  });

  it("dispatches solana_sign_message requests through signSolanaMessage", async () => {
    authState.signSolanaMessage.mockResolvedValue({ signature: "SIG_BASE64" });
    runtimeState.pendingWalletRequests = [
      {
        id: "solana_sign_message-9",
        kind: "solana_sign_message",
        payload: {
          message: "TWVtbw==",
          description: "Sign login proof",
          cluster: "solana:devnet",
          pendingSolanaId: 9,
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(authState.signSolanaMessage).toHaveBeenCalledWith({
        message: "TWVtbw==",
        description: "Sign login proof",
        cluster: "solana:devnet",
        pendingSolanaId: 9,
      });
    });
    expect(runtimeState.resolveWalletRequest).toHaveBeenCalledWith(
      "solana_sign_message-9",
      { kind: "solana_sign_message", signature: "SIG_BASE64" },
    );
    expect(runtimeState.rejectWalletRequest).not.toHaveBeenCalled();
  });
});
