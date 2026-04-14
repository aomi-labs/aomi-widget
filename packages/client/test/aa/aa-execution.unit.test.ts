import { describe, expect, it, vi } from "vitest";
import { mainnet, polygon } from "viem/chains";

import { executeWalletCalls, type AAState } from "../../src/aa";

function makeProviderState(params: {
  mode: "7702" | "4337";
  sendTransaction?: ReturnType<typeof vi.fn>;
  sendBatchTransaction?: ReturnType<typeof vi.fn>;
}): AAState {
  return {
    resolved: {
      provider: "alchemy",
      chainId: params.mode === "7702" ? mainnet.id : polygon.id,
      mode: params.mode,
      batchingEnabled: true,
      sponsorship: "optional",
      fallbackToEoa: false,
    },
    account: {
      provider: "ALCHEMY",
      mode: params.mode,
      AAAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      delegationAddress:
        params.mode === "7702"
          ? "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
          : undefined,
      sendTransaction:
        params.sendTransaction ??
        vi.fn().mockResolvedValue({ transactionHash: "0xsingle" }),
      sendBatchTransaction:
        params.sendBatchTransaction ??
        vi.fn().mockResolvedValue({ transactionHash: "0xbatch" }),
    },
    pending: false,
    error: null,
  };
}

describe("executeWalletCalls via AA", () => {
  it("executes a batched 7702 transaction and exposes delegation metadata", async () => {
    const sendBatchTransaction = vi
      .fn()
      .mockResolvedValue({ transactionHash: "0x7702batch" });
    const providerState = makeProviderState({
      mode: "7702",
      sendBatchTransaction,
    });

    const result = await executeWalletCalls({
      callList: [
        {
          to: "0x0000000000000000000000000000000000000000" as `0x${string}`,
          value: 0n,
          data: "0x" as `0x${string}`,
          chainId: 1,
        },
        {
          to: "0x0000000000000000000000000000000000000000" as `0x${string}`,
          value: 0n,
          data: "0x" as `0x${string}`,
          chainId: 1,
        },
      ],
      currentChainId: 1,
      capabilities: undefined,
      localPrivateKey: null,
      providerState,
      sendCallsSyncAsync: vi.fn(),
      sendTransactionAsync: vi.fn(),
      switchChainAsync: vi.fn(),
      chainsById: {
        [mainnet.id]: mainnet,
      },
      getPreferredRpcUrl: () => "https://example-rpc.invalid",
    });

    expect(sendBatchTransaction).toHaveBeenCalledWith([
      {
        to: "0x0000000000000000000000000000000000000000",
        value: 0n,
        data: "0x",
      },
      {
        to: "0x0000000000000000000000000000000000000000",
        value: 0n,
        data: "0x",
      },
    ]);
    expect(result).toEqual({
      txHash: "0x7702batch",
      txHashes: ["0x7702batch"],
      executionKind: "alchemy_7702",
      batched: true,
      sponsored: true,
      AAAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      delegationAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
  });

  it("executes a single 4337 transaction without delegation metadata", async () => {
    const sendTransaction = vi
      .fn()
      .mockResolvedValue({ transactionHash: "0x4337single" });
    const sendBatchTransaction = vi.fn();
    const providerState = makeProviderState({
      mode: "4337",
      sendTransaction,
      sendBatchTransaction,
    });

    const result = await executeWalletCalls({
      callList: [
        {
          to: "0x1111111111111111111111111111111111111111" as `0x${string}`,
          value: 1n,
          chainId: 137,
        },
      ],
      currentChainId: 137,
      capabilities: undefined,
      localPrivateKey: null,
      providerState,
      sendCallsSyncAsync: vi.fn(),
      sendTransactionAsync: vi.fn(),
      switchChainAsync: vi.fn(),
      chainsById: {
        [polygon.id]: polygon,
      },
      getPreferredRpcUrl: () => "https://example-rpc.invalid",
    });

    expect(sendTransaction).toHaveBeenCalledWith({
      to: "0x1111111111111111111111111111111111111111",
      value: 1n,
      data: undefined,
    });
    expect(sendBatchTransaction).not.toHaveBeenCalled();
    expect(result).toEqual({
      txHash: "0x4337single",
      txHashes: ["0x4337single"],
      executionKind: "alchemy_4337",
      batched: false,
      sponsored: true,
      AAAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      delegationAddress: undefined,
    });
  });
});
