import { beforeEach, describe, expect, it, vi } from "vitest";
import { mainnet } from "viem/chains";

const createPublicClientMock = vi.fn();
const getTransactionMock = vi.fn();

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
});
