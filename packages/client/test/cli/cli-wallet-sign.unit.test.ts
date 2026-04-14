import { beforeEach, describe, expect, it, vi } from "vitest";

const MOCK_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

const mocks = vi.hoisted(() => ({
  simulateBatch: vi.fn(),
  sendSystemMessage: vi.fn(),
  syncUserState: vi.fn(),
  resolveWallet: vi.fn(),
  close: vi.fn(),
  executeWalletCalls: vi.fn(),
  createCliProviderState: vi.fn(),
  readState: vi.fn(),
  writeState: vi.fn(),
  removePendingTx: vi.fn(),
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
      sendSystemMessage: mocks.sendSystemMessage,
    };

    resolveUserState = vi.fn();
    resolveWallet = mocks.resolveWallet;
    syncUserState = mocks.syncUserState;
    close = mocks.close;
  },
}));

vi.mock("../../src/aa", () => ({
  executeWalletCalls: mocks.executeWalletCalls,
}));

vi.mock("../../src/cli/execution", async () => {
  const actual = await vi.importActual<typeof import("../../src/cli/execution")>(
    "../../src/cli/execution",
  );
  return {
    ...actual,
    createCliProviderState: mocks.createCliProviderState,
    describeExecutionDecision: vi.fn(() => "EOA"),
    resolveCliExecutionDecision: vi.fn(() => ({ execution: "eoa" })),
  };
});

vi.mock("../../src/cli/state", async () => {
  const actual = await vi.importActual<typeof import("../../src/cli/state")>(
    "../../src/cli/state",
  );
  return {
    ...actual,
    readState: mocks.readState,
    writeState: mocks.writeState,
    removePendingTx: mocks.removePendingTx,
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
    mocks.syncUserState.mockResolvedValue(undefined);
    mocks.createCliProviderState.mockResolvedValue({ providerState: "mock" });
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
      chainId: 1,
      pendingTxs: [
        {
          id: "tx-1",
          kind: "transaction",
          to: "0x1111111111111111111111111111111111111111",
          value: "0",
          data: "0x",
          chainId: 1,
          description: "send zero",
          timestamp: Date.now(),
          payload: {},
        },
      ],
      signedTxs: [],
    });
  });

  it("passes explicit from and chainId into simulateBatch and appends the fee call", async () => {
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
        },
      ],
      {
        from: MOCK_ADDRESS,
        chainId: 1,
      },
    );

    expect(mocks.createCliProviderState).toHaveBeenCalledWith(
      expect.objectContaining({
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
  });
});
