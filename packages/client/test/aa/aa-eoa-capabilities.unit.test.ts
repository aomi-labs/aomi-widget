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
  it("uses direct EOA signing for a single call even when atomic sendCalls is supported", async () => {
    const sendCallsSyncAsync = vi.fn().mockResolvedValue({
      receipts: [{ transactionHash: "0xabc" }],
    });
    const sendTransactionAsync = vi.fn().mockResolvedValue("0xsingle");
    const singleCall = [CALL_LIST[0]];

    const result = await executeWalletCalls({
      callList: singleCall,
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

    expect(sendCallsSyncAsync).not.toHaveBeenCalled();
    expect(sendTransactionAsync).toHaveBeenCalledWith({
      chainId: 1,
      to: singleCall[0].to,
      value: singleCall[0].value,
      data: undefined,
    });
    expect(result).toMatchObject({
      txHash: "0xsingle",
      txHashes: ["0xsingle"],
      executionKind: "eoa",
      batched: false,
      sponsored: false,
    });
  });

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
          data: undefined,
        },
        {
          to: CALL_LIST[1].to,
          value: CALL_LIST[1].value,
          data: undefined,
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
    const sendCallsSyncAsync = vi
      .fn()
      .mockRejectedValue(
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
      data: undefined,
    });
    expect(sendTransactionAsync).toHaveBeenNthCalledWith(2, {
      chainId: 1,
      to: CALL_LIST[1].to,
      value: CALL_LIST[1].value,
      data: undefined,
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
