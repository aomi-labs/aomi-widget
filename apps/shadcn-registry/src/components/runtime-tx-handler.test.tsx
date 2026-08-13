import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runtimeState = vi.hoisted(() => ({
  user: {},
  pendingWalletRequests: [] as Array<Record<string, unknown>>,
  resolveWalletRequest: vi.fn(),
  rejectWalletRequest: vi.fn(),
  startWalletRequest: vi.fn(),
  simulateBatchTransactions: vi.fn(),
  showNotification: vi.fn(),
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
    evm: [
      { id: 8453, name: "Base" },
      { id: 42161, name: "Arbitrum One" },
    ],
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
  signAaRequests: vi.fn(),
  sendTransaction: vi.fn(),
  switchChain: vi.fn() as ((chainId: number) => Promise<void>) | undefined,
  supportedChains: [{ id: 4326, name: "MegaETH" }],
}));

vi.mock("@aomi-labs/react", () => ({
  cn: (...values: Array<string | undefined | false>) =>
    values.filter(Boolean).join(" "),
  UserState: {
    address: () => undefined,
  },
  appendFeeCallToPayload: vi.fn(),
  hydrateTxPayloadFromUserState: vi.fn((payload) => payload),
  parseChainId: vi.fn((value: unknown) => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
  }),
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
    runtimeState.startWalletRequest.mockReset();
    runtimeState.simulateBatchTransactions.mockReset();
    authState.selectNetwork.mockReset();
    authState.signSolanaTransaction.mockReset();
    authState.signSolanaMessage.mockReset();
    authState.sendSolanaTransaction.mockReset();
    authState.signTypedData = undefined;
    authState.signMessage.mockReset();
    authState.signAaRequests.mockReset();
    authState.sendTransaction.mockReset();
    authState.switchChain = vi.fn(async () => undefined);
    authState.identity.chainId = 8453;
    authState.supportedNetworks.evm = [
      { id: 8453, name: "Base" },
      { id: 42161, name: "Arbitrum One" },
    ];
    authState.selectedSolanaNetwork = {
      id: "solana-devnet",
      cluster: "solana:devnet",
    };
    authState.solanaNetworkSwitchRequiresReconnect = false;
  });

  afterEach(() => {
    cleanup();
  });

  function stageTransaction(chainId: number) {
    runtimeState.simulateBatchTransactions.mockResolvedValue({ fee: null });
    authState.sendTransaction.mockResolvedValue({ txHash: "0xabc" });
    runtimeState.pendingWalletRequests = [
      {
        id: `transaction-${chainId}`,
        kind: "transaction",
        payload: {
          calls: [
            {
              txId: 1,
              to: "0x1111111111111111111111111111111111111111",
              value: "0",
              data: "0x",
              chainId,
            },
          ],
        },
        timestamp: Date.now(),
      },
    ];
  }

  it("switches to the staged transaction chain before simulation and send", async () => {
    stageTransaction(42161);

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(authState.sendTransaction).toHaveBeenCalledTimes(1);
    });
    expect(authState.switchChain).toHaveBeenCalledWith(42161);
    expect(runtimeState.simulateBatchTransactions).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ chainId: 42161 }),
    );
    expect(
      (authState.switchChain as ReturnType<typeof vi.fn>).mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      runtimeState.simulateBatchTransactions.mock.invocationCallOrder[0],
    );
    expect(
      runtimeState.simulateBatchTransactions.mock.invocationCallOrder[0],
    ).toBeLessThan(authState.sendTransaction.mock.invocationCallOrder[0]);
    expect(authState.sendTransaction).toHaveBeenCalledWith(expect.any(Object), {
      chainIdAlreadySelected: 42161,
    });
  });

  it("does not switch when the staged transaction is already on the wallet chain", async () => {
    stageTransaction(8453);

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(authState.sendTransaction).toHaveBeenCalledTimes(1);
    });
    expect(authState.switchChain).not.toHaveBeenCalled();
  });

  it("rejects an unsupported staged transaction chain before simulation or send", async () => {
    stageTransaction(10);

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(runtimeState.rejectWalletRequest).toHaveBeenCalledWith(
        "transaction-10",
        expect.stringContaining("does not support chain 10"),
      );
    });
    expect(runtimeState.simulateBatchTransactions).not.toHaveBeenCalled();
    expect(authState.sendTransaction).not.toHaveBeenCalled();
  });

  it("rejects with manual guidance when the adapter cannot switch chains", async () => {
    stageTransaction(42161);
    authState.switchChain = undefined;

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(runtimeState.rejectWalletRequest).toHaveBeenCalledWith(
        "transaction-42161",
        expect.stringContaining("Switch networks manually"),
      );
    });
    expect(authState.sendTransaction).not.toHaveBeenCalled();
  });

  it("routes a rejected wallet switch through the existing request rejection", async () => {
    stageTransaction(42161);
    authState.switchChain = vi.fn(async () => {
      throw new Error("User rejected the request");
    });

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(runtimeState.rejectWalletRequest).toHaveBeenCalledWith(
        "transaction-42161",
        "User rejected the request",
      );
    });
    expect(authState.sendTransaction).not.toHaveBeenCalled();
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

  it("waits for explicit approval before asking Privy for AA signatures", async () => {
    authState.signAaRequests.mockResolvedValue({
      signatures: ["0xauthorization", "0xuserop"],
    });
    runtimeState.pendingWalletRequests = [
      {
        id: "aa-7-8-9",
        kind: "aa_sign",
        payload: {
          chain_family: "evm",
          chain_id: 4326,
          signer: "0x1111111111111111111111111111111111111111",
          executor: "0x1111111111111111111111111111111111111111",
          aa_mode: "7702",
          tx_ids: [7, 8, 9],
          sponsored: true,
          description: "Execute three calls",
          signature_requests: [
            {
              kind: "eip7702_authorization",
              contract_address: "0x0000000000000000000000000000000000007702",
              chain_id: 4326,
              nonce: 0,
              raw_payload: `0x${"11".repeat(32)}`,
            },
            {
              kind: "personal_sign",
              message: "0xprepared-user-operation",
              raw_payload: `0x${"22".repeat(32)}`,
            },
          ],
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    expect(screen.getByText("Approve account action")).toBeInTheDocument();
    expect(screen.getByText("MegaETH")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(authState.signAaRequests).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Review & sign (2)" }));

    await waitFor(() => {
      expect(authState.signAaRequests).toHaveBeenCalledTimes(1);
    });
    expect(runtimeState.resolveWalletRequest).toHaveBeenCalledWith("aa-7-8-9", {
      kind: "aa_sign",
      signatures: ["0xauthorization", "0xuserop"],
    });
  });
});
