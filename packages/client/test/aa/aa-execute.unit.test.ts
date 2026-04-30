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
      sponsorship: "disabled",
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

  it("passes the preferred RPC URL when fetching the 7702 delegation", async () => {
    getTransactionMock.mockResolvedValue({ authorizationList: [] });
    const getPreferredRpcUrl = vi.fn().mockReturnValue("https://my-rpc.invalid");

    await executeWalletCalls({
      callList: [...CALL_LIST],
      currentChainId: 1,
      capabilities: undefined,
      localPrivateKey: null,
      providerState: make7702ProviderState(),
      sendCallsSyncAsync: vi.fn(),
      sendTransactionAsync: vi.fn(),
      switchChainAsync: vi.fn(),
      chainsById: { [mainnet.id]: mainnet },
      getPreferredRpcUrl,
    });

    expect(getPreferredRpcUrl).toHaveBeenCalledWith(mainnet);
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

  it("retries once on transient bundler submission errors then propagates", async () => {
    const providerState = make4337ProviderState({
      sendBatchTransaction: vi.fn().mockRejectedValue(
        new Error("This bundle id is unknown / has not been submitted."),
      ),
    });
    const sendTransactionAsync = vi.fn();

    await expect(
      executeWalletCalls({
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
      }),
    ).rejects.toThrow("This bundle id is unknown / has not been submitted.");

    expect(providerState.account?.sendBatchTransaction).toHaveBeenCalledTimes(2);
    expect(sendTransactionAsync).not.toHaveBeenCalled();
  });

  it("propagates 4337 gas estimation revert without falling back to EOA", async () => {
    const providerState = make4337ProviderState({
      sendBatchTransaction: vi.fn().mockRejectedValue(
        new Error("eth_estimateUserOperationGas failed: execution reverted"),
      ),
    });
    const sendTransactionAsync = vi.fn();

    await expect(
      executeWalletCalls({
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
      }),
    ).rejects.toThrow("eth_estimateUserOperationGas failed: execution reverted");

    expect(providerState.account?.sendBatchTransaction).toHaveBeenCalledTimes(1);
    expect(sendTransactionAsync).not.toHaveBeenCalled();
  });

  it("propagates wallet_prepareCalls AA23 validation error without falling back to EOA", async () => {
    const providerState = make4337ProviderState({
      sendBatchTransaction: vi.fn().mockRejectedValue(
        new Error(
          "wallet_prepareCalls failed: validation reverted: [reason]: AA23 reverted",
        ),
      ),
    });
    const sendTransactionAsync = vi.fn();

    await expect(
      executeWalletCalls({
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
      }),
    ).rejects.toThrow("wallet_prepareCalls failed: validation reverted: [reason]: AA23 reverted");

    expect(providerState.account?.sendBatchTransaction).toHaveBeenCalledTimes(1);
    expect(sendTransactionAsync).not.toHaveBeenCalled();
  });
});
