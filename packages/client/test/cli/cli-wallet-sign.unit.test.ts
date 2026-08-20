import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const MOCK_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

const mocks = vi.hoisted(() => ({
  simulateBatch: vi.fn(),
  fetchState: vi.fn(),
  sendSystemMessage: vi.fn(),
  syncUserState: vi.fn(),
  resolveWallet: vi.fn(),
  fetchCurrentState: vi.fn(),
  getPendingRequests: vi.fn(),
  resolve: vi.fn(),
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
    fetchCurrentState = mocks.fetchCurrentState;
    getPendingRequests = mocks.getPendingRequests;
    resolve = mocks.resolve;
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
      txHash: "0xfee",
      txHashes: ["0xabc", "0xfee"],
      executionKind: "eoa",
      batched: true,
      sponsored: false,
    });
    mocks.fetchCurrentState.mockResolvedValue(undefined);
    mocks.getPendingRequests.mockReturnValue([]);
    mocks.resolve.mockResolvedValue(undefined);

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

  it("submits Agent batch hashes through ClientSession without a legacy callback", async () => {
    mocks.simulateBatch.mockResolvedValue({
      result: {
        batch_success: true,
        stateful: true,
        from: MOCK_ADDRESS,
        network: "mainnet",
        total_gas: 42_000,
        steps: [],
      },
    });
    mocks.executeWalletCalls.mockResolvedValue({
      txHash: "0xleg2",
      txHashes: ["0xleg1", "0xleg2"],
      executionKind: "eoa",
      batched: true,
      sponsored: false,
    });
    mocks.readState.mockReturnValue({
      sessionId: "session-1",
      baseUrl: "http://127.0.0.1:8080",
      app: "default",
      publicKey: MOCK_ADDRESS,
      privateKey:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      chainId: 1,
      pendingTxs: [
        {
          id: "tx-1",
          agentRequestId: "act_batch",
          kind: "transaction",
          to: "0x1111111111111111111111111111111111111111",
          value: "0",
          data: "0x",
          chainId: 1,
          timestamp: Date.now(),
          payload: {
            requestId: "act_batch",
            calls: [
              {
                txId: 1,
                to: "0x1111111111111111111111111111111111111111",
                value: "0",
                data: "0x",
                chainId: 1,
              },
              {
                txId: 2,
                to: "0x2222222222222222222222222222222222222222",
                value: "0",
                data: "0x",
                chainId: 1,
              },
            ],
          },
        },
      ],
      signedTxs: [],
    });

    await signCommand(
      {
        privateKey:
          "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        baseUrl: "http://127.0.0.1:8080",
        app: "default",
        secrets: {},
      },
      ["tx-1"],
    );

    expect(mocks.fetchCurrentState).toHaveBeenCalledTimes(1);
    expect(mocks.resolve).toHaveBeenCalledWith("act_batch", {
      kind: "transaction",
      txHash: "0xleg2",
      txHashes: ["0xleg1", "0xleg2"],
      completedTxIds: [1, 2],
      failedTxIds: [],
      failureReason: undefined,
      batched: true,
      callCount: 2,
    });
    expect(mocks.sendSystemMessage).not.toHaveBeenCalled();
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
    expect(mocks.resolveWallet).toHaveBeenCalledWith(MOCK_ADDRESS, 1);

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
        service_fee: {
          status: "confirmed",
          amount_wei: "1000000000000",
          recipient: "0x9C7a99480c59955a635123EDa064456393e519f5",
          tx_hash: "0xfee",
          retryable: false,
        },
        pending_tx_ids: [1],
        batched: false,
        call_count: 1,
      },
    });
  });

  it("records and reports a confirmed action when the service-fee leg fails", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    mocks.simulateBatch.mockResolvedValue({
      result: {
        batch_success: true,
        stateful: true,
        from: MOCK_ADDRESS,
        network: "mainnet",
        total_gas: 21_000,
        fee: {
          recipient: "0x9C7a99480c59955a635123EDa064456393e519f5",
          amount_wei: "12633000000",
          token: "native",
        },
        steps: [],
      },
    });
    mocks.executeWalletCalls.mockRejectedValue(
      Object.assign(
        new Error("in-flight transaction limit reached for delegated accounts"),
        {
          partial: {
            completedTxHashes: ["0xaction"],
            failedCallIndex: 1,
            failureReason:
              "in-flight transaction limit reached for delegated accounts",
          },
        },
      ),
    );

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

    expect(logSpy).toHaveBeenCalledWith(
      "Fee:     0.000000012633 ETH (12633000000 wei) → 0x9C7a99480c59955a635123EDa064456393e519f5",
    );
    expect(mocks.executeWalletCalls).toHaveBeenCalledTimes(1);
    expect(mocks.sendSystemMessage).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(mocks.sendSystemMessage.mock.calls[0]?.[1] as string),
    ).toMatchObject({
      type: "wallet:tx_complete",
      payload: {
        txHash: "0xaction",
        status: "success",
        pending_tx_ids: [1],
        service_fee: {
          status: "failed",
          amount_wei: "12633000000",
          recipient: "0x9C7a99480c59955a635123EDa064456393e519f5",
          error: "in-flight transaction limit reached for delegated accounts",
          retryable: false,
        },
      },
    });

    const journalIndex = mocks.writeState.mock.calls.findIndex(([state]) => {
      const record = state.signedTxs?.[0];
      return record?.txHash === "0xaction";
    });
    expect(journalIndex).toBeGreaterThanOrEqual(0);
    const journalState = mocks.writeState.mock.calls[journalIndex]?.[0];
    expect(journalState.pendingTxs).toEqual([]);
    expect(journalState.signedTxs?.[0]).toMatchObject({
      id: "tx-1",
      pendingTxId: 1,
      txHash: "0xaction",
      backendNotified: true,
      serviceFeeStatus: "failed",
      serviceFeeAmountWei: "12633000000",
    });
    expect(
      mocks.writeState.mock.invocationCallOrder[journalIndex],
    ).toBeLessThan(mocks.sendSystemMessage.mock.invocationCallOrder[0]);
  });

  it("replays only the backend callback for a journaled staged id", async () => {
    mocks.readState.mockReturnValue({
      sessionId: "session-1",
      baseUrl: "http://127.0.0.1:8080",
      app: "default",
      apiKey: "test-key",
      publicKey: MOCK_ADDRESS,
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
          timestamp: 1,
          payload: { txId: 1 },
        },
      ],
      signedTxs: [
        {
          id: "tx-1",
          kind: "transaction",
          pendingTxId: 1,
          txHash: "0xaction",
          txHashes: ["0xaction"],
          executionKind: "eoa",
          batched: false,
          sponsored: false,
          backendNotified: false,
          serviceFeeStatus: "failed",
          serviceFeeAmountWei: "12633000000",
          serviceFeeRecipient: "0x9C7a99480c59955a635123EDa064456393e519f5",
          serviceFeeError:
            "in-flight transaction limit reached for delegated accounts",
          timestamp: 1,
        },
      ],
    });

    await signCommand(
      {
        baseUrl: "http://127.0.0.1:8080",
        app: "default",
        apiKey: "test-key",
        secrets: {},
      },
      ["tx-1"],
    );

    expect(mocks.executeWalletCalls).not.toHaveBeenCalled();
    expect(mocks.sendSystemMessage).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(mocks.sendSystemMessage.mock.calls[0]?.[1] as string),
    ).toMatchObject({
      type: "wallet:tx_complete",
      payload: {
        txHash: "0xaction",
        pending_tx_ids: [1],
        status: "success",
      },
    });
  });

  it("ignores a zero-valued fee and still signs the transaction", async () => {
    mocks.executeWalletCalls.mockResolvedValue({
      txHash: "0xabc",
      txHashes: ["0xabc"],
      executionKind: "eoa",
      batched: false,
      sponsored: false,
    });
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
