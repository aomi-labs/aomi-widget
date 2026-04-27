import { describe, expect, it, vi } from "vitest";
import { mainnet } from "viem/chains";

import { DISABLED_PROVIDER_STATE, executeWalletCalls } from "../../src/aa";

const CALL_LIST = [
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

describe("executeWalletCalls EOA capability handling", () => {
  it("requests atomic as optional for sendCalls", async () => {
    const sendCallsSyncAsync = vi.fn().mockResolvedValue({
      receipts: [{ transactionHash: "0xabc" }, { transactionHash: "0xdef" }],
    });
    const sendTransactionAsync = vi.fn();

    const result = await executeWalletCalls({
      callList: CALL_LIST,
      currentChainId: 1,
      capabilities: {
        "eip155:1": { atomic: { status: "ready" } },
      },
      localPrivateKey: null,
      providerState: DISABLED_PROVIDER_STATE,
      sendCallsSyncAsync,
      sendTransactionAsync,
      switchChainAsync: vi.fn(),
      chainsById: { [mainnet.id]: mainnet },
      getPreferredRpcUrl: () => "https://example-rpc.invalid",
    });

    expect(sendCallsSyncAsync).toHaveBeenCalledWith({
      chainId: 1,
      calls: [
        {
          to: CALL_LIST[0].to,
          value: CALL_LIST[0].value,
          data: CALL_LIST[0].data,
        },
        {
          to: CALL_LIST[1].to,
          value: CALL_LIST[1].value,
          data: CALL_LIST[1].data,
        },
      ],
      capabilities: {
        atomic: { optional: true },
      },
    });
    expect(sendTransactionAsync).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      txHash: "0xdef",
      txHashes: ["0xabc", "0xdef"],
      executionKind: "eoa",
      batched: true,
      sponsored: false,
    });
  });

  it("falls back to sequential sendTransaction when atomic capability is rejected", async () => {
    const sendCallsSyncAsync = vi.fn().mockRejectedValue(
      new Error("Unsupported non-optional capabilities: atomic"),
    );
    const sendTransactionAsync = vi
      .fn()
      .mockResolvedValueOnce("0x111")
      .mockResolvedValueOnce("0x222");

    const result = await executeWalletCalls({
      callList: CALL_LIST,
      currentChainId: 1,
      capabilities: {
        "eip155:1": { atomic: { status: "ready" } },
      },
      localPrivateKey: null,
      providerState: DISABLED_PROVIDER_STATE,
      sendCallsSyncAsync,
      sendTransactionAsync,
      switchChainAsync: vi.fn(),
      chainsById: { [mainnet.id]: mainnet },
      getPreferredRpcUrl: () => "https://example-rpc.invalid",
    });

    expect(sendCallsSyncAsync).toHaveBeenCalledTimes(1);
    expect(sendTransactionAsync).toHaveBeenCalledTimes(2);
    expect(sendTransactionAsync).toHaveBeenNthCalledWith(1, {
      chainId: 1,
      to: CALL_LIST[0].to,
      value: CALL_LIST[0].value,
      data: CALL_LIST[0].data,
    });
    expect(sendTransactionAsync).toHaveBeenNthCalledWith(2, {
      chainId: 1,
      to: CALL_LIST[1].to,
      value: CALL_LIST[1].value,
      data: CALL_LIST[1].data,
    });
    expect(result).toMatchObject({
      txHash: "0x222",
      txHashes: ["0x111", "0x222"],
      executionKind: "eoa",
      batched: true,
      sponsored: false,
    });
  });
});
