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
  createCliAAExecutor: vi.fn(),
  readState: vi.fn(),
  syncPendingTxsFromUserState: vi.fn(),
  writeState: vi.fn(),
  addSignedTx: vi.fn(),
}));

vi.mock("viem/accounts", async () => {
  const actual = await vi.importActual<typeof import("viem/accounts")>(
    "viem/accounts",
  );
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
  const actual = await vi.importActual<typeof import("../../src/aa")>(
    "../../src/aa",
  );
  return {
    ...actual,
    executeWalletCalls: mocks.executeWalletCalls,
  };
});

vi.mock("../../src/cli/aa", async () => {
  const actual = await vi.importActual<typeof import("../../src/cli/aa")>(
    "../../src/cli/aa",
  );
  return {
    ...actual,
    createCliAAExecutor: mocks.createCliAAExecutor,
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
    mocks.syncPendingTxsFromUserState.mockImplementation((state) => state.pendingTxs ?? []);
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
        execution: "eoa" as const,
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
        execution: "eoa" as const,
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
        execution: "eoa" as const,
        secrets: {},
      },
      ["tx-1"],
    );

    expect(mocks.executeWalletCalls).toHaveBeenCalled();
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
          execution: "eoa" as const,
          secrets: {},
        },
        ["tx-1"],
      ),
    ).rejects.toThrow();

    expect(mocks.executeWalletCalls).toHaveBeenCalledTimes(1);
    expect(mocks.sendSystemMessage).not.toHaveBeenCalled();
  });

  it("executes AA (7702) via the backend proxy and reports the modes", async () => {
    const execute = vi.fn().mockResolvedValue({
      txHash: "0x7702hash",
      txHashes: ["0x7702hash"],
      executionKind: "alchemy_7702",
      batched: true,
      sponsored: false,
      Delegation7702: "0x69007702764179f14F51cdce752f4f775d74E139",
    });
    mocks.createCliAAExecutor.mockResolvedValue({
      mode: "7702",
      signerAddress: MOCK_ADDRESS,
      smartAccount4337: null,
      delegation7702: "0x69007702764179f14F51cdce752f4f775d74E139",
      sponsored: false,
      execute,
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

    // One executor, reused for simulation identity and attempt 1.
    expect(mocks.createCliAAExecutor).toHaveBeenCalledTimes(1);
    expect(mocks.resolveWallet).toHaveBeenCalledWith(MOCK_ADDRESS, 1, {
      aaMode: "7702",
      smartAccount: null,
    });
    // Unsponsored 7702 keeps the injected fee call in the batch.
    expect(execute).toHaveBeenCalledWith([
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
    ]);
    expect(mocks.executeWalletCalls).not.toHaveBeenCalled();
    expect(
      JSON.parse(mocks.sendSystemMessage.mock.calls[0]?.[1] as string),
    ).toMatchObject({
      type: "wallet:tx_complete",
      payload: {
        execution_kind: "alchemy_7702",
        aa_requested_mode: "7702",
        aa_resolved_mode: "7702",
        delegation_7702: "0x69007702764179f14F51cdce752f4f775d74E139",
      },
    });
  });

  it("skips the native fee transfer for sponsored AA execution", async () => {
    const execute = vi.fn().mockResolvedValue({
      txHash: "0x4337hash",
      txHashes: ["0x4337hash"],
      executionKind: "alchemy_4337",
      batched: false,
      sponsored: true,
      SmartAccount4337: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    mocks.createCliAAExecutor.mockResolvedValue({
      mode: "4337",
      signerAddress: MOCK_ADDRESS,
      smartAccount4337: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      delegation7702: null,
      sponsored: true,
      execute,
    });

    await signCommand(
      {
        privateKey:
          "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        baseUrl: "http://127.0.0.1:8080",
        app: "default",
        apiKey: "test-key",
        execution: "aa" as const,
        aaMode: "4337" as const,
        secrets: {},
      },
      ["tx-1"],
    );

    expect(mocks.resolveWallet).toHaveBeenCalledWith(MOCK_ADDRESS, 1, {
      aaMode: "4337",
      smartAccount: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    // Sponsored batch drops the injected native fee call.
    expect(execute).toHaveBeenCalledWith([
      {
        to: "0x1111111111111111111111111111111111111111",
        value: 0n,
        data: "0x",
        chainId: 1,
      },
    ]);
  });

  it("falls back 7702 → 4337 → EOA in auto mode", async () => {
    const failingExecute = vi
      .fn()
      .mockRejectedValue(new Error("bundler rejected"));
    mocks.createCliAAExecutor.mockResolvedValue({
      mode: "7702",
      signerAddress: MOCK_ADDRESS,
      smartAccount4337: null,
      delegation7702: "0x69007702764179f14F51cdce752f4f775d74E139",
      sponsored: false,
      execute: failingExecute,
    });
    mocks.executeWalletCalls.mockResolvedValue({
      txHash: "0xeoahash",
      txHashes: ["0xeoahash"],
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

    // primary (reused) + alt executor
    expect(mocks.createCliAAExecutor).toHaveBeenCalledTimes(2);
    expect(failingExecute).toHaveBeenCalledTimes(2);
    expect(mocks.executeWalletCalls).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(mocks.sendSystemMessage.mock.calls[0]?.[1] as string),
    ).toMatchObject({
      payload: {
        execution_kind: "eoa",
        aa_requested_mode: "7702",
        aa_resolved_mode: "none",
        aa_fallback_reason: "aa_failed_fallback_eoa",
      },
    });
  });

  it("fails closed with --aa when both AA modes fail", async () => {
    const failingExecute = vi
      .fn()
      .mockRejectedValue(new Error("bundler rejected"));
    mocks.createCliAAExecutor.mockResolvedValue({
      mode: "7702",
      signerAddress: MOCK_ADDRESS,
      smartAccount4337: null,
      delegation7702: "0x69007702764179f14F51cdce752f4f775d74E139",
      sponsored: false,
      execute: failingExecute,
    });

    await expect(
      signCommand(
        {
          privateKey:
            "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          baseUrl: "http://127.0.0.1:8080",
          app: "default",
          apiKey: "test-key",
          execution: "aa" as const,
          secrets: {},
        },
        ["tx-1"],
      ),
    ).rejects.toThrow();

    expect(failingExecute).toHaveBeenCalledTimes(2);
    expect(mocks.executeWalletCalls).not.toHaveBeenCalled();
    expect(mocks.sendSystemMessage).not.toHaveBeenCalled();
  });
});
