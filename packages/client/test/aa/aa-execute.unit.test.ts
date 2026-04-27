import { beforeEach, describe, expect, it, vi } from "vitest";
import { mainnet } from "viem/chains";

const { createPublicClientMock, getTransactionMock } = vi.hoisted(() => ({
  createPublicClientMock: vi.fn(),
  getTransactionMock: vi.fn(),
}));

vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return {
    ...actual,
    createPublicClient: createPublicClientMock,
    http: vi.fn(() => ({ transport: "http" })),
  };
});

import { executeWalletCalls, type AAState } from "../../src/aa";

const TX_HASH = "0xabc123";
const CALL_LIST = [
  {
    to: "0x1111111111111111111111111111111111111111",
    value: "0",
    chainId: 1,
  },
] as const;

const BATCH_CALL_LIST = [
  {
    to: "0x1111111111111111111111111111111111111111" as `0x${string}`,
    value: 1n,
    data: "0x" as `0x${string}`,
    chainId: 1,
  },
  {
    to: "0x2222222222222222222222222222222222222222" as `0x${string}`,
    value: 2n,
    data: "0x" as `0x${string}`,
    chainId: 1,
  },
];

function make7702ProviderState(
  overrides: Partial<NonNullable<AAState["account"]>> = {},
): AAState {
  return {
    resolved: {
      provider: "alchemy",
      chainId: 1,
      mode: "7702",
      batchingEnabled: true,
      sponsorship: "optional",
      fallbackToEoa: false,
    },
    account: {
      provider: "ALCHEMY",
      mode: "7702",
      AAAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      sendTransaction: vi.fn().mockResolvedValue({ transactionHash: TX_HASH }),
      sendBatchTransaction: vi.fn(),
      ...overrides,
    },
    pending: false,
    error: null,
  };
}

function make4337ProviderState(
  overrides: Partial<NonNullable<AAState["account"]>> = {},
): AAState {
  return {
    resolved: {
      provider: "alchemy",
      chainId: 1,
      mode: "4337",
      batchingEnabled: true,
      sponsorship: "optional",
      fallbackToEoa: false,
    },
    account: {
      provider: "ALCHEMY",
      mode: "4337",
      AAAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      sendTransaction: vi.fn().mockResolvedValue({ transactionHash: TX_HASH }),
      sendBatchTransaction: vi.fn(),
      ...overrides,
    },
    pending: false,
    error: null,
  };
}

describe("executeWalletCalls AA execution", () => {
  beforeEach(() => {
    createPublicClientMock.mockReset();
    getTransactionMock.mockReset();
    createPublicClientMock.mockReturnValue({
      getTransaction: getTransactionMock,
    });
  });

  it("reads the 7702 delegation target from viem authorizationList.address", async () => {
    getTransactionMock.mockResolvedValue({
      authorizationList: [
        {
          address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
      ],
    });

    const result = await executeWalletCalls({
      callList: [...CALL_LIST],
      currentChainId: 1,
      capabilities: undefined,
      localPrivateKey: null,
      providerState: make7702ProviderState(),
      sendCallsSyncAsync: vi.fn(),
      sendTransactionAsync: vi.fn(),
      switchChainAsync: vi.fn(),
      chainsById: { [mainnet.id]: mainnet },
      getPreferredRpcUrl: () => "https://example-rpc.invalid",
    });

    expect(createPublicClientMock).toHaveBeenCalledTimes(1);
    expect(getTransactionMock).toHaveBeenCalledWith({ hash: TX_HASH });
    expect(result).toMatchObject({
      txHash: TX_HASH,
      executionKind: "alchemy_7702",
      delegationAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
  });

  it("does not fetch the transaction when the AA object already has a 7702 delegation address", async () => {
    const result = await executeWalletCalls({
      callList: [...CALL_LIST],
      currentChainId: 1,
      capabilities: undefined,
      localPrivateKey: null,
      providerState: make7702ProviderState({
        delegationAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
      }),
      sendCallsSyncAsync: vi.fn(),
      sendTransactionAsync: vi.fn(),
      switchChainAsync: vi.fn(),
      chainsById: { [mainnet.id]: mainnet },
      getPreferredRpcUrl: () => "https://example-rpc.invalid",
    });

    expect(createPublicClientMock).not.toHaveBeenCalled();
    expect(result.delegationAddress).toBe(
      "0xcccccccccccccccccccccccccccccccccccccccc",
    );
  });

  it("falls back to EOA execution when 4337 bundler submission repeatedly fails", async () => {
    const providerState = make4337ProviderState({
      sendBatchTransaction: vi.fn().mockRejectedValue(
        new Error("This bundle id is unknown / has not been submitted."),
      ),
    });
    const sendTransactionAsync = vi
      .fn()
      .mockResolvedValueOnce("0x111")
      .mockResolvedValueOnce("0x222");

    const result = await executeWalletCalls({
      callList: BATCH_CALL_LIST,
      currentChainId: 1,
      capabilities: undefined,
      localPrivateKey: null,
      providerState,
      sendCallsSyncAsync: vi.fn(),
      sendTransactionAsync,
      switchChainAsync: vi.fn(),
      chainsById: { [mainnet.id]: mainnet },
      getPreferredRpcUrl: () => "https://example-rpc.invalid",
    });

    expect(providerState.account?.sendBatchTransaction).toHaveBeenCalledTimes(2);
    expect(sendTransactionAsync).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      executionKind: "eoa",
      txHashes: ["0x111", "0x222"],
      batched: true,
      sponsored: false,
    });
  });

  it("falls back to EOA execution when 4337 gas estimation reverts", async () => {
    const providerState = make4337ProviderState({
      sendBatchTransaction: vi.fn().mockRejectedValue(
        new Error("eth_estimateUserOperationGas failed: execution reverted"),
      ),
    });
    const sendTransactionAsync = vi
      .fn()
      .mockResolvedValueOnce("0x333")
      .mockResolvedValueOnce("0x444");

    const result = await executeWalletCalls({
      callList: BATCH_CALL_LIST,
      currentChainId: 1,
      capabilities: undefined,
      localPrivateKey: null,
      providerState,
      sendCallsSyncAsync: vi.fn(),
      sendTransactionAsync,
      switchChainAsync: vi.fn(),
      chainsById: { [mainnet.id]: mainnet },
      getPreferredRpcUrl: () => "https://example-rpc.invalid",
    });

    expect(providerState.account?.sendBatchTransaction).toHaveBeenCalledTimes(1);
    expect(sendTransactionAsync).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      executionKind: "eoa",
      txHashes: ["0x333", "0x444"],
      batched: true,
      sponsored: false,
    });
  });
});
