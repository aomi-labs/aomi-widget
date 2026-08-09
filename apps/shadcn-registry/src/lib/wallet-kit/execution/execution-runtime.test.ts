import { describe, expect, it, vi } from "vitest";
import type { EvmWalletRuntime } from "../runtime/evm/wallet-runtime";
import { buildEvmExecutionRuntime } from "./execution-runtime";

describe("buildEvmExecutionRuntime", () => {
  it("routes plain-message signing through the selected account signer", async () => {
    const signMessageForAccount = vi.fn().mockResolvedValue("0xsignature");
    const signMessageAsync = vi.fn();
    const evm = {
      activeAccount: { id: "para-account" },
      activeEvmConnection: { chainId: 1 },
      chainsById: {},
      getWalletClientFor: vi.fn(),
      sendCallsSyncAsync: undefined,
      sendTransactionAsync: undefined,
      shouldUseExternalSigner: false,
      signMessageAsync,
      signMessageForAccount,
      signTypedDataAsync: undefined,
      switchChainAsync: undefined,
      walletClient: undefined,
    } as unknown as EvmWalletRuntime;

    const runtime = buildEvmExecutionRuntime(evm);
    await expect(
      runtime.signMessage?.({
        non_typed_data: "AOMI_E2E_SAFE_SIGN",
        description: "Sign a harmless message",
      }),
    ).resolves.toEqual({ signature: "0xsignature" });

    expect(signMessageForAccount).toHaveBeenCalledWith({
      accountId: "para-account",
      message: "AOMI_E2E_SAFE_SIGN",
      chainId: 1,
    });
    expect(signMessageAsync).not.toHaveBeenCalled();
  });

  it("signs an AA personal_sign request as raw bytes in provider order", async () => {
    const signMessage = vi
      .fn()
      .mockResolvedValueOnce("0xowner-signature-1")
      .mockResolvedValueOnce("0xowner-signature-2");
    const getWalletClientFor = vi.fn().mockResolvedValue({ signMessage });
    const evm = {
      activeAccount: {
        id: "owner",
        address: "0x1111111111111111111111111111111111111111",
      },
      activeConnector: { id: "wallet" },
      activeEvmConnection: { chainId: 4326 },
      chainsById: {},
      getWalletClientFor,
      sendCallsSyncAsync: undefined,
      sendTransactionAsync: undefined,
      shouldUseExternalSigner: false,
      signMessageAsync: undefined,
      signMessageForAccount: vi.fn(),
      signTypedDataAsync: undefined,
      switchChainAsync: undefined,
      walletClient: undefined,
    } as unknown as EvmWalletRuntime;

    const runtime = buildEvmExecutionRuntime(evm);
    await expect(
      runtime.signAaRequests?.({
        operationId: "operation-1",
        chainId: 4326,
        owner: "0x1111111111111111111111111111111111111111",
        executor: "0x1111111111111111111111111111111111111111",
        expiresAt: "2026-08-08T00:00:00Z",
        callsDigest:
          "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        calls: [],
        fees: [],
        signatureRequests: [
          {
            kind: "personal_sign",
            message:
              "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          },
          {
            kind: "personal_sign",
            message:
              "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          },
        ],
      }),
    ).resolves.toEqual({
      signatures: ["0xowner-signature-1", "0xowner-signature-2"],
    });

    expect(getWalletClientFor).toHaveBeenCalledWith({
      connector: evm.activeConnector,
      chainId: 4326,
    });
    expect(signMessage.mock.calls).toEqual([
      [
        {
          account: "0x1111111111111111111111111111111111111111",
          message: {
            raw: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          },
        },
      ],
      [
        {
          account: "0x1111111111111111111111111111111111111111",
          message: {
            raw: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          },
        },
      ],
    ]);
    expect(evm.signMessageForAccount).not.toHaveBeenCalled();
  });

  it("rejects an AA request when the active owner or chain changed", async () => {
    const evm = {
      activeAccount: {
        id: "owner",
        address: "0x1111111111111111111111111111111111111111",
      },
      activeConnector: { id: "wallet" },
      activeEvmConnection: { chainId: 1 },
      chainsById: {},
      getWalletClientFor: vi.fn(),
      sendCallsSyncAsync: undefined,
      sendTransactionAsync: undefined,
      shouldUseExternalSigner: false,
      signMessageAsync: undefined,
      signMessageForAccount: vi.fn(),
      signTypedDataAsync: undefined,
      switchChainAsync: undefined,
      walletClient: undefined,
    } as unknown as EvmWalletRuntime;
    const runtime = buildEvmExecutionRuntime(evm);
    const request = {
      operationId: "operation-1",
      chainId: 8453,
      owner: "0x2222222222222222222222222222222222222222" as const,
      executor: "0x3333333333333333333333333333333333333333" as const,
      expiresAt: "2026-08-08T00:00:00Z",
      callsDigest:
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const,
      calls: [],
      fees: [],
      signatureRequests: [],
    };

    await expect(runtime.signAaRequests?.(request)).rejects.toThrow(
      "active wallet is not the prepared AA owner",
    );
    await expect(
      runtime.signAaRequests?.({
        ...request,
        owner: "0x1111111111111111111111111111111111111111",
      }),
    ).rejects.toThrow("active chain does not match");
    expect(evm.getWalletClientFor).not.toHaveBeenCalled();
  });
});
