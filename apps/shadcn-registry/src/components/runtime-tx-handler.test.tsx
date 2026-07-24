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
  selectedSolanaNetwork: {
    id: "solana-devnet",
    cluster: "solana:devnet",
  },
  supportedNetworks: {
    solana: [
      { id: "solana-devnet", cluster: "solana:devnet" },
      { id: "solana-mainnet", cluster: "solana:mainnet" },
    ],
  },
  selectNetwork: vi.fn(),
  solanaNetworkSwitchRequiresReconnect: false,
  signSolanaTransaction: vi.fn(),
  signSolanaMessage: vi.fn(),
  sendSolanaTransaction: vi.fn(),
  signTypedData: undefined as
    | ((payload: Record<string, unknown>) => Promise<{ signature: string }>)
    | undefined,
  signMessage: vi.fn(),
}));

vi.mock("@aomi-labs/react", () => ({
  UserState: {
    address: () => undefined,
  },
  appendFeeCallToPayload: vi.fn(),
  hydrateTxPayloadFromUserState: vi.fn((payload) => payload),
  parseChainId: vi.fn(),
  toViemSignTypedDataArgs: vi.fn(),
  toViemSignMessageArgs: vi.fn((payload: Record<string, unknown>) =>
    typeof payload.non_typed_data === "string"
      ? { message: payload.non_typed_data }
      : null,
  ),
  useAomiRuntime: () => runtimeState,
}));

vi.mock("../lib/wallet-kit", () => ({
  useAomiWalletKit: () => authState,
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
    authState.sendSolanaTransaction.mockReset();
    authState.signTypedData = undefined;
    authState.signMessage.mockReset();
    authState.selectedSolanaNetwork = {
      id: "solana-devnet",
      cluster: "solana:devnet",
    };
    authState.solanaNetworkSwitchRequiresReconnect = false;
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

  it("accepts mainnet-beta send requests and invokes the Solana wallet", async () => {
    authState.selectedSolanaNetwork = {
      id: "solana-mainnet",
      cluster: "solana:mainnet",
    };
    authState.sendSolanaTransaction.mockResolvedValue({
      signature: "SOLANA_SIGNATURE",
    });
    runtimeState.pendingWalletRequests = [
      {
        id: "solana_send-1",
        kind: "solana_send",
        payload: {
          unsignedTx: "AQID",
          cluster: "mainnet-beta",
          pendingSolanaId: 1,
          pendingSolanaIds: [1],
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(authState.sendSolanaTransaction).toHaveBeenCalledWith({
        unsignedTx: "AQID",
        cluster: "mainnet-beta",
        pendingSolanaId: 1,
        pendingSolanaIds: [1],
      });
    });
    expect(authState.selectNetwork).not.toHaveBeenCalled();
    expect(runtimeState.resolveWalletRequest).toHaveBeenCalledWith(
      "solana_send-1",
      { kind: "solana_send", signature: "SOLANA_SIGNATURE" },
    );
    expect(runtimeState.rejectWalletRequest).not.toHaveBeenCalled();
  });

  it("rejects signing when the requested cluster requires reconnecting", async () => {
    authState.solanaNetworkSwitchRequiresReconnect = true;
    runtimeState.pendingWalletRequests = [
      {
        id: "solana_sign-10",
        kind: "solana_sign",
        payload: {
          unsignedTx: "AQID",
          cluster: "solana:mainnet",
          pendingSolanaId: 10,
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(runtimeState.rejectWalletRequest).toHaveBeenCalledWith(
        "solana_sign-10",
        expect.stringContaining("Reconnect"),
      );
    });
    expect(authState.signSolanaTransaction).not.toHaveBeenCalled();
  });

  it("signs a plain EVM message when typed-data signing is unavailable", async () => {
    authState.signMessage.mockResolvedValue({ signature: "0xsignature" });
    runtimeState.pendingWalletRequests = [
      {
        id: "eip712_sign-11",
        kind: "eip712_sign",
        payload: {
          non_typed_data: "AOMI_E2E_SAFE_SIGN",
          description: "Sign a harmless E2E message",
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(authState.signMessage).toHaveBeenCalledWith({
        non_typed_data: "AOMI_E2E_SAFE_SIGN",
        description: "Sign a harmless E2E message",
      });
    });
    expect(runtimeState.resolveWalletRequest).toHaveBeenCalledWith(
      "eip712_sign-11",
      { kind: "eip712_sign", signature: "0xsignature" },
    );
    expect(runtimeState.rejectWalletRequest).not.toHaveBeenCalled();
  });
});
