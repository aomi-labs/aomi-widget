import { beforeEach, describe, expect, it, vi } from "vitest";
import { mainnet } from "viem/chains";

const MOCK_HASH = "0xabc123";
const MOCK_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const PRIVATE_KEY =
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" as const;

const sendTransactionMock = vi.fn();
const waitForReceiptMock = vi.fn();
const createWalletClientMock = vi.fn();
const createPublicClientMock = vi.fn();

vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return {
    ...actual,
    createWalletClient: createWalletClientMock,
    createPublicClient: createPublicClientMock,
    http: vi.fn(() => ({ transport: "http" })),
  };
});

vi.mock("viem/accounts", async () => {
  const actual = await vi.importActual<typeof import("viem/accounts")>(
    "viem/accounts",
  );
  return {
    ...actual,
    privateKeyToAccount: vi.fn(() => ({ address: MOCK_ADDRESS })),
  };
});

import {
  DISABLED_PROVIDER_STATE,
  executeWalletCalls,
} from "../src/aa";
import { toSignedTxMetadata } from "../src/cli/tables";
import type { PendingTx } from "../src/cli/state";
import {
  formatSignedTxLine,
  pendingTxToCallList,
  toSignedTransactionRecord,
} from "../src/cli/transactions";

describe("CLI wallet generic AA execution", () => {
  beforeEach(() => {
    sendTransactionMock.mockReset();
    waitForReceiptMock.mockReset();
    createWalletClientMock.mockReset();
    createPublicClientMock.mockReset();

    sendTransactionMock.mockResolvedValue(MOCK_HASH);
    waitForReceiptMock.mockResolvedValue({ status: "success" });
    createWalletClientMock.mockReturnValue({
      sendTransaction: sendTransactionMock,
    });
    createPublicClientMock.mockReturnValue({
      waitForTransactionReceipt: waitForReceiptMock,
    });
  });

  it("maps a pending transaction into a single shared executor call", () => {
    const pendingTx: PendingTx = {
      id: "tx-1",
      kind: "transaction",
      to: "0x1111111111111111111111111111111111111111",
      value: "42",
      data: "0xdeadbeef",
      chainId: 1,
      timestamp: Date.now(),
      payload: {},
    };

    expect(pendingTxToCallList(pendingTx)).toEqual([
      {
        to: pendingTx.to,
        value: pendingTx.value,
        data: pendingTx.data,
        chainId: pendingTx.chainId,
      },
    ]);
  });

  it("routes disabled provider state through the private-key EOA path", async () => {
    const result = await executeWalletCalls({
      callList: [
        {
          to: "0x1111111111111111111111111111111111111111",
          value: "5",
          chainId: 1,
        },
      ],
      currentChainId: 1,
      capabilities: undefined,
      localPrivateKey:
        "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      providerState: DISABLED_PROVIDER_STATE,
      sendCallsSyncAsync: vi.fn(),
      sendTransactionAsync: vi.fn(),
      switchChainAsync: vi.fn(),
      chainsById: {
        [mainnet.id]: mainnet,
      },
      getPreferredRpcUrl: () => "https://example-rpc.invalid",
    });

    expect(createWalletClientMock).toHaveBeenCalledTimes(1);
    expect(createPublicClientMock).toHaveBeenCalledTimes(1);
    expect(sendTransactionMock).toHaveBeenCalledTimes(1);
    expect(waitForReceiptMock).toHaveBeenCalledWith({ hash: MOCK_HASH });
    expect(result).toMatchObject({
      txHash: MOCK_HASH,
      txHashes: [MOCK_HASH],
      executionKind: "eoa",
      batched: false,
      sponsored: false,
    });
  });

  it("supports multi-call execution and returns all hashes", async () => {
    sendTransactionMock
      .mockResolvedValueOnce("0xaaa111")
      .mockResolvedValueOnce("0xbbb222");

    const result = await executeWalletCalls({
      callList: [
        {
          to: "0x1111111111111111111111111111111111111111",
          value: "5",
          chainId: 1,
        },
        {
          to: "0x2222222222222222222222222222222222222222",
          value: "7",
          chainId: 1,
        },
      ],
      currentChainId: 1,
      capabilities: undefined,
      localPrivateKey: PRIVATE_KEY,
      providerState: DISABLED_PROVIDER_STATE,
      sendCallsSyncAsync: vi.fn(),
      sendTransactionAsync: vi.fn(),
      switchChainAsync: vi.fn(),
      chainsById: {
        [mainnet.id]: mainnet,
      },
      getPreferredRpcUrl: () => "https://example-rpc.invalid",
    });

    expect(sendTransactionMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      txHash: "0xbbb222",
      txHashes: ["0xaaa111", "0xbbb222"],
      executionKind: "eoa",
      batched: true,
      sponsored: false,
    });
  });

  it("persists shared execution metadata onto signed transaction records", () => {
    const pendingTx: PendingTx = {
      id: "tx-7",
      kind: "transaction",
      to: "0x1111111111111111111111111111111111111111",
      value: "99",
      data: undefined,
      chainId: 1,
      timestamp: Date.now(),
      payload: {},
    };

    const record = toSignedTransactionRecord(
      pendingTx,
      {
        txHash: MOCK_HASH,
        txHashes: [MOCK_HASH],
        executionKind: "eoa",
        batched: false,
        sponsored: false,
      },
      MOCK_ADDRESS,
      1,
      123,
    );

    expect(record).toMatchObject({
      id: "tx-7",
      kind: "transaction",
      txHash: MOCK_HASH,
      txHashes: [MOCK_HASH],
      executionKind: "eoa",
      batched: false,
      sponsored: false,
      from: MOCK_ADDRESS,
      to: pendingTx.to,
      value: pendingTx.value,
      chainId: 1,
      timestamp: 123,
    });

    expect(toSignedTxMetadata(record)).toMatchObject({
      txHash: MOCK_HASH,
      txHashes: [MOCK_HASH],
      executionKind: "eoa",
      aaProvider: null,
      aaMode: null,
      batched: false,
      sponsored: false,
    });
  });

  it("formats signed transaction output with execution metadata", () => {
    const line = formatSignedTxLine(
      {
        id: "tx-9",
        kind: "transaction",
        txHash: MOCK_HASH,
        txHashes: [MOCK_HASH, "0xdef456"],
        executionKind: "eoa",
        aaProvider: "alchemy",
        aaMode: "7702",
        batched: true,
        sponsored: true,
        AAAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        delegationAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        to: "0x1111111111111111111111111111111111111111",
        value: "10",
        timestamp: 0,
      },
      "  ✅",
    );

    expect(line).toContain("exec: eoa");
    expect(line).toContain("provider: alchemy");
    expect(line).toContain("mode: 7702");
    expect(line).toContain("txs: 2");
    expect(line).toContain("sponsored");
    expect(line).toContain("aa: 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(line).toContain(
      "delegation: 0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    );
  });
});
