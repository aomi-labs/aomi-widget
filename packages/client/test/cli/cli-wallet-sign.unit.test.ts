import { beforeEach, describe, expect, it, vi } from "vitest";

const MOCK_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

const mocks = vi.hoisted(() => ({
  simulateBatch: vi.fn(),
  fetchState: vi.fn(),
  sendSystemMessage: vi.fn(),
  syncUserState: vi.fn(),
  resolveWallet: vi.fn(),
  close: vi.fn(),
  executeWalletCalls: vi.fn(),
  readState: vi.fn(),
  syncPendingTxsFromUserState: vi.fn(),
  writeState: vi.fn(),
  addSignedTx: vi.fn(),
}));

vi.mock("viem/accounts", async () => {
  const actual =
    await vi.importActual<typeof import("viem/accounts")>("viem/accounts");
  return {
    ...actual,
    privateKeyToAccount: vi.fn(() => ({ address: MOCK_ADDRESS })),
  };
});

vi.mock("../../src/session", () => ({
  ClientSession: class MockClientSession {
    client = {
      simulateBatch: mocks.simulateBatch,
      fetchState: mocks.fetchState,
      sendSystemMessage: mocks.sendSystemMessage,
    };

    resolveUserState = vi.fn();
    resolveWallet = mocks.resolveWallet;
    syncUserState = mocks.syncUserState;
    close = mocks.close;
  },
}));

vi.mock("../../src/aa", async () => {
  const actual =
    await vi.importActual<typeof import("../../src/aa")>("../../src/aa");
  return {
    ...actual,
    executeWalletCalls: mocks.executeWalletCalls,
  };
});

vi.mock("../../src/cli/state", async () => {
  const actual = await vi.importActual<typeof import("../../src/cli/state")>(
    "../../src/cli/state",
  );
  return {
    ...actual,
    readState: mocks.readState,
    syncPendingTxsFromUserState: mocks.syncPendingTxsFromUserState,
    writeState: mocks.writeState,
    addSignedTx: mocks.addSignedTx,
  };
});

import { signCommand } from "../../src/cli/commands/wallet";

describe("CLI wallet sign simulation integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.simulateBatch.mockResolvedValue({
      result: {
        batch_success: true,
        stateful: true,
        from: MOCK_ADDRESS,
        network: "mainnet",
        total_gas: 21_000,
        fee: {
          recipient: "0x9C7a99480c59955a635123EDa064456393e519f5",
          amount_wei: "1000000000000",
          token: "native",
        },
        steps: [],
      },
    });
    mocks.sendSystemMessage.mockResolvedValue(undefined);
    mocks.fetchState.mockResolvedValue({
      user_state: {
        address: "0x9999999999999999999999999999999999999999",
        chain_id: 1,
        is_connected: true,
        pending_txs: {
          "1": {
            chain_id: 1,
            from: "0x9999999999999999999999999999999999999999",
            to: "0x1111111111111111111111111111111111111111",
            value: "0",
            gas: null,
            data: "0x",
            label: "send zero",
            kind: "wallet_tx",
            batch_status: "Batch [1] pending",
          },
        },
        pending_eip712s: {},
      },
    });
    mocks.syncUserState.mockResolvedValue({
      user_state: {
        address: MOCK_ADDRESS,
        chain_id: 1,
        is_connected: true,
        pending_txs: {},
        pending_eip712s: {},
      },
    });
    mocks.syncPendingTxsFromUserState.mockImplementation(
      (state) => state.pendingTxs ?? [],
    );
    mocks.executeWalletCalls.mockResolvedValue({
      txHash: "0xabc",
      txHashes: ["0xabc"],
      executionKind: "eoa",
      batched: true,
      sponsored: false,
    });

    mocks.readState.mockReturnValue({
      sessionId: "session-1",
      baseUrl: "http://127.0.0.1:8080",
      app: "default",
      apiKey: "test-key",
      publicKey: "0x9999999999999999999999999999999999999999",
      privateKey:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      chainId: 1,
      pendingTxs: [
        {
          id: "tx-1",
          kind: "transaction",
          txId: 1,
          to: "0x1111111111111111111111111111111111111111",
          value: "0",
          data: "0x",
          chainId: 1,
          description: "send zero",
          timestamp: Date.now(),
          payload: { txId: 1 },
        },
      ],
      signedTxs: [],
    });
  });

  it("aborts when fee recipient is an invalid address", async () => {
    mocks.simulateBatch.mockResolvedValue({
      result: {
        batch_success: true,
        stateful: true,
        from: MOCK_ADDRESS,
        network: "mainnet",
        total_gas: 21_000,
        fee: {
          recipient: "not-an-address",
          amount_wei: "1000000000000",
          token: "native",
        },
        steps: [],
      },
    });

    // Fee validation error propagates → fatal() → CliExit
    await expect(
      signCommand(
        {
          privateKey:
            "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          baseUrl: "http://127.0.0.1:8080",
          app: "default",
          apiKey: "test-key",
          secrets: {},
        },
        ["tx-1"],
      ),
    ).rejects.toThrow();

    // Must not have attempted execution
    expect(mocks.executeWalletCalls).not.toHaveBeenCalled();
  });

  it("aborts when fee exceeds the safety limit", async () => {
    mocks.simulateBatch.mockResolvedValue({
      result: {
        batch_success: true,
        stateful: true,
        from: MOCK_ADDRESS,
        network: "mainnet",
        total_gas: 21_000,
        fee: {
          recipient: "0x9C7a99480c59955a635123EDa064456393e519f5",
          amount_wei: "999000000000000000000", // 999 ETH
          token: "native",
        },
        steps: [],
      },
    });

    await expect(
      signCommand(
        {
          privateKey:
            "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          baseUrl: "http://127.0.0.1:8080",
          app: "default",
          apiKey: "test-key",
          secrets: {},
        },
        ["tx-1"],
      ),
    ).rejects.toThrow();

    expect(mocks.executeWalletCalls).not.toHaveBeenCalled();
  });

  it("syncs wallet state, injects the fee call, and executes via EOA", async () => {
    await signCommand(
      {
        privateKey:
          "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        baseUrl: "http://127.0.0.1:8080",
        app: "default",
        apiKey: "test-key",
        secrets: {},
      },
      ["tx-1"],
    );

    expect(mocks.simulateBatch).toHaveBeenCalledWith(
      "session-1",
      [
        {
          to: "0x1111111111111111111111111111111111111111",
          value: "0",
          data: "0x",
          label: "send zero",
          chain_id: 1,
        },
      ],
      {
        chainId: 1,
      },
    );
    expect(mocks.resolveWallet).toHaveBeenCalledWith(MOCK_ADDRESS, 1, {
      aaMode: null,
      smartAccount: null,
    });

    // Fee call is appended and the whole batch signs with the local key.
    expect(mocks.executeWalletCalls).toHaveBeenCalledWith(
      expect.objectContaining({
        localPrivateKey:
          "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        callList: [
          {
            to: "0x1111111111111111111111111111111111111111",
            value: 0n,
            data: "0x",
            chainId: 1,
          },
          {
            to: "0x9C7a99480c59955a635123EDa064456393e519f5",
            value: 1000000000000n,
            chainId: 1,
          },
        ],
      }),
    );

    expect(mocks.sendSystemMessage).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(mocks.sendSystemMessage.mock.calls[0]?.[1] as string),
    ).toMatchObject({
      type: "wallet:tx_complete",
      payload: {
        pending_tx_ids: [1],
        execution_kind: "eoa",
        aa_requested_mode: "none",
        aa_resolved_mode: "none",
      },
    });
  });

  it("reports the requested EOA transaction hash separately from its service fee", async () => {
    mocks.executeWalletCalls.mockResolvedValue({
      txHash: "0xfee",
      txHashes: ["0xaction", "0xfee"],
      executionKind: "eoa",
      batched: true,
      sponsored: false,
    });

    await signCommand(
      {
        privateKey:
          "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        baseUrl: "http://127.0.0.1:8080",
        app: "default",
        apiKey: "test-key",
        secrets: {},
      },
      ["tx-1"],
    );

    const callback = JSON.parse(
      mocks.sendSystemMessage.mock.calls[0]?.[1] as string,
    );
    expect(callback).toMatchObject({
      type: "wallet:tx_complete",
      payload: {
        txHash: "0xaction",
        service_fee_tx_hash: "0xfee",
        pending_tx_ids: [1],
        batched: false,
        call_count: 1,
      },
    });
  });

  it("ignores a zero-valued fee and still signs the transaction", async () => {
    mocks.simulateBatch.mockResolvedValue({
      result: {
        batch_success: true,
        stateful: true,
        from: MOCK_ADDRESS,
        network: "mainnet",
        total_gas: 21_000,
        fee: {
          recipient: "0x9C7a99480c59955a635123EDa064456393e519f5",
          amount_wei: "0",
          token: "native",
        },
        steps: [],
      },
    });

    await signCommand(
      {
        privateKey:
          "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        baseUrl: "http://127.0.0.1:8080",
        app: "default",
        apiKey: "test-key",
        secrets: {},
      },
      ["tx-1"],
    );

    expect(mocks.executeWalletCalls).toHaveBeenCalledWith(
      expect.objectContaining({
        callList: [
          {
            to: "0x1111111111111111111111111111111111111111",
            value: 0n,
            data: "0x",
            chainId: 1,
          },
        ],
      }),
    );
  });

  it("uses the saved private key when no override is passed", async () => {
    await signCommand(
      {
        baseUrl: "http://127.0.0.1:8080",
        app: "default",
        apiKey: "test-key",
        secrets: {},
      },
      ["tx-1"],
    );

    expect(mocks.executeWalletCalls).toHaveBeenCalled();
  });

  it("rejects an AA execution request — AA runs in the backend lane", async () => {
    await expect(
      signCommand(
        {
          privateKey:
            "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          baseUrl: "http://127.0.0.1:8080",
          app: "default",
          apiKey: "test-key",
          secrets: {},
          execution: "aa",
          aaMode: "7702",
        },
        ["tx-1"],
      ),
    ).rejects.toThrow();

    expect(mocks.executeWalletCalls).not.toHaveBeenCalled();
    expect(mocks.sendSystemMessage).not.toHaveBeenCalled();
  });

  it("propagates execution failure without a fallback retry", async () => {
    mocks.executeWalletCalls.mockRejectedValue(new Error("nonce too low"));

    await expect(
      signCommand(
        {
          privateKey:
            "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          baseUrl: "http://127.0.0.1:8080",
          app: "default",
          apiKey: "test-key",
          secrets: {},
        },
        ["tx-1"],
      ),
    ).rejects.toThrow();

    expect(mocks.executeWalletCalls).toHaveBeenCalledTimes(1);
    expect(mocks.sendSystemMessage).not.toHaveBeenCalled();
  });
});
