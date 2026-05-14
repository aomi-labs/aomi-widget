import { describe, expect, it, vi } from "vitest";
import { mainnet } from "viem/chains";
import {
  DISABLED_PROVIDER_STATE,
  type WalletTxPayload,
} from "@aomi-labs/react";

import { executeAdapterTransaction } from "./wallet-execution";

const CALLS: NonNullable<WalletTxPayload["calls"]> = [
  {
    txId: 1,
    to: "0x1111111111111111111111111111111111111111",
    value: "1",
    data: "0x",
    chainId: 1,
  },
  {
    txId: 0,
    to: "0x2222222222222222222222222222222222222222",
    value: "2",
    data: "0x",
    chainId: 1,
  },
];

function strictFeeBatchPayload(): WalletTxPayload {
  return {
    aaPreference: "eip7702",
    aaStrict: true,
    calls: CALLS,
  };
}

describe("executeAdapterTransaction fallback behavior", () => {
  it("falls back to native wallet execution when Para AA provider state is unavailable", async () => {
    const sendTransactionAsync = vi
      .fn()
      .mockResolvedValueOnce("0x111")
      .mockResolvedValueOnce("0x222");
    const sendCallsSyncAsync = vi.fn();
    const resolveAAProviderState = vi.fn().mockResolvedValue({
      providerState: DISABLED_PROVIDER_STATE,
      resolvedMode: "7702",
      fallbackReason: "aa_provider_not_configured_fallback_eoa",
    });

    const result = await executeAdapterTransaction({
      payload: strictFeeBatchPayload(),
      state: {
        currentChainId: 1,
        sendCallsSyncAsync,
        sendTransactionAsync,
        switchChainAsync: vi.fn(),
        chainsById: { [mainnet.id]: mainnet },
      },
      shouldUseExternalSigner: false,
      resolveAAProviderState,
    });

    expect(resolveAAProviderState).toHaveBeenCalledTimes(2);
    expect(sendCallsSyncAsync).not.toHaveBeenCalled();
    expect(sendTransactionAsync).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      txHash: "0x222",
      aaRequestedMode: "7702",
      aaResolvedMode: "none",
      aaFallbackReason: "aa_provider_not_configured_fallback_eoa",
      executionKind: "eoa",
      batched: true,
      sponsored: false,
    });
  });

  it("keeps Base Account atomic batching optional unless sponsorship is required", async () => {
    const sendCallsSyncAsync = vi
      .fn()
      .mockRejectedValue(
        new Error("Unsupported non-optional capabilities: atomic"),
      );
    const sendTransactionAsync = vi
      .fn()
      .mockResolvedValueOnce("0x111")
      .mockResolvedValueOnce("0x222");

    const result = await executeAdapterTransaction({
      payload: strictFeeBatchPayload(),
      state: {
        currentChainId: 1,
        capabilities: {
          "eip155:1": { atomic: { status: "ready" } },
        },
        nativeWalletExecution: {
          executionKind: "base_account_4337",
          sponsorship: { mode: "disabled" },
        },
        sendCallsSyncAsync,
        sendTransactionAsync,
        switchChainAsync: vi.fn(),
        chainsById: { [mainnet.id]: mainnet },
      },
    });

    expect(sendCallsSyncAsync).toHaveBeenCalledWith({
      chainId: 1,
      calls: expect.any(Array),
      capabilities: {
        atomic: { optional: true },
      },
      forceAtomic: false,
      status: expect.any(Function),
      throwOnFailure: true,
      timeout: undefined,
      version: undefined,
    });
    expect(sendTransactionAsync).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      txHash: "0x222",
      aaRequestedMode: "7702",
      aaResolvedMode: "none",
      executionKind: "eoa",
      batched: true,
      sponsored: false,
    });
  });

  it("requires sponsored atomic sendCalls for Base Account fee batches", async () => {
    const sendCallsSyncAsync = vi.fn().mockResolvedValue({
      receipts: [{ transactionHash: "0x111" }, { transactionHash: "0x222" }],
      status: "success",
    });
    const sendTransactionAsync = vi.fn();

    const result = await executeAdapterTransaction({
      payload: strictFeeBatchPayload(),
      state: {
        currentChainId: 1,
        capabilities: {
          "eip155:1": {
            atomic: { status: "ready" },
            paymasterService: { supported: true },
          },
        },
        nativeWalletExecution: {
          executionKind: "base_account_4337",
          sendCallsVersion: "1.0",
          sendCallsTimeoutMs: 45_000,
          sponsorship: {
            mode: "required",
            getPaymasterServiceUrl: () => "https://paymaster.example.test",
          },
        },
        sendCallsSyncAsync,
        sendTransactionAsync,
        switchChainAsync: vi.fn(),
        chainsById: { [mainnet.id]: mainnet },
      },
    });

    expect(sendCallsSyncAsync).toHaveBeenCalledWith({
      chainId: 1,
      calls: expect.any(Array),
      capabilities: {
        atomic: { required: true },
        paymasterService: {
          url: "https://paymaster.example.test",
          context: {},
        },
      },
      forceAtomic: true,
      status: expect.any(Function),
      throwOnFailure: true,
      timeout: 45_000,
      version: "1.0",
    });
    expect(sendTransactionAsync).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      txHash: "0x222",
      aaRequestedMode: "7702",
      aaResolvedMode: "4337",
      executionKind: "base_account_4337",
      batched: true,
      sponsored: true,
    });
  });

  it("does not fall back to sequential sends when sponsored atomic sendCalls fails", async () => {
    const sendCallsSyncAsync = vi
      .fn()
      .mockRejectedValue(new Error("wallet_prepareCalls failed"));
    const sendTransactionAsync = vi.fn();

    await expect(
      executeAdapterTransaction({
        payload: strictFeeBatchPayload(),
        state: {
          currentChainId: 1,
          capabilities: {
            "eip155:1": {
              atomic: { status: "ready" },
              paymasterService: { supported: true },
            },
          },
          nativeWalletExecution: {
            executionKind: "base_account_4337",
            sponsorship: {
              mode: "required",
              getPaymasterServiceUrl: () => "https://paymaster.example.test",
            },
          },
          sendCallsSyncAsync,
          sendTransactionAsync,
          switchChainAsync: vi.fn(),
          chainsById: { [mainnet.id]: mainnet },
        },
      }),
    ).rejects.toThrow("wallet_prepareCalls failed");

    expect(sendCallsSyncAsync).toHaveBeenCalledTimes(1);
    expect(sendTransactionAsync).not.toHaveBeenCalled();
  });

  it("does not submit native wallet fallback twice when unresolved AA fallback times out", async () => {
    const timeoutError = new Error(
      'Timed out while waiting for call bundle with id "0x123" to be confirmed.',
    );
    const sendCallsSyncAsync = vi.fn().mockRejectedValue(timeoutError);
    const sendTransactionAsync = vi.fn();
    const resolveAAProviderState = vi.fn().mockResolvedValue({
      providerState: DISABLED_PROVIDER_STATE,
      resolvedMode: "4337",
      fallbackReason: "aa_provider_not_configured_fallback_eoa",
    });

    await expect(
      executeAdapterTransaction({
        payload: strictFeeBatchPayload(),
        state: {
          currentChainId: 1,
          capabilities: {
            "eip155:1": { atomic: { status: "ready" } },
          },
          sendCallsSyncAsync,
          sendTransactionAsync,
          switchChainAsync: vi.fn(),
          chainsById: { [mainnet.id]: mainnet },
        },
        shouldUseExternalSigner: true,
        resolveAAProviderState,
      }),
    ).rejects.toThrow("Timed out while waiting for call bundle");

    expect(resolveAAProviderState).toHaveBeenCalledTimes(1);
    expect(sendCallsSyncAsync).toHaveBeenCalledTimes(1);
    expect(sendTransactionAsync).not.toHaveBeenCalled();
  });

  it("fails closed for aaStrict when resolved AA execution fails without an unresolved-provider fallback", async () => {
    const sendTransactionAsync = vi.fn();
    const resolveAAProviderState = vi.fn().mockResolvedValue({
      providerState: {
        resolved: {
          provider: "alchemy",
          chainId: 1,
          mode: "4337",
          batchingEnabled: true,
          sponsorship: "required",
        },
        account: null,
        pending: false,
        error: new Error("aa execution failed"),
      },
      resolvedMode: "4337",
    });

    await expect(
      executeAdapterTransaction({
        payload: {
          ...strictFeeBatchPayload(),
          aaPreference: "eip4337",
        },
        state: {
          currentChainId: 1,
          sendCallsSyncAsync: vi.fn(),
          sendTransactionAsync,
          switchChainAsync: vi.fn(),
          chainsById: { [mainnet.id]: mainnet },
        },
        resolveAAProviderState,
      }),
    ).rejects.toThrow("aa_required_execution_failed");

    expect(resolveAAProviderState).toHaveBeenCalledTimes(1);
    expect(sendTransactionAsync).not.toHaveBeenCalled();
  });

  it("keeps native fallback when a resolved AA failure is followed by unresolved AA setup", async () => {
    const sendTransactionAsync = vi
      .fn()
      .mockResolvedValueOnce("0x111")
      .mockResolvedValueOnce("0x222");
    const resolveAAProviderState = vi
      .fn()
      .mockResolvedValueOnce({
        providerState: {
          resolved: {
            provider: "alchemy",
            chainId: 1,
            mode: "7702",
            batchingEnabled: true,
            sponsorship: "disabled",
          },
          account: null,
          pending: false,
          error: new Error("aa execution failed"),
        },
        resolvedMode: "7702",
      })
      .mockResolvedValueOnce({
        providerState: DISABLED_PROVIDER_STATE,
        resolvedMode: "4337",
        fallbackReason: "aa_provider_not_configured_fallback_eoa",
      });

    const result = await executeAdapterTransaction({
      payload: strictFeeBatchPayload(),
      state: {
        currentChainId: 1,
        sendCallsSyncAsync: vi.fn(),
        sendTransactionAsync,
        switchChainAsync: vi.fn(),
        chainsById: { [mainnet.id]: mainnet },
      },
      resolveAAProviderState,
    });

    expect(resolveAAProviderState).toHaveBeenCalledTimes(2);
    expect(sendTransactionAsync).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      txHash: "0x222",
      aaResolvedMode: "none",
      executionKind: "eoa",
      batched: true,
    });
  });
});
