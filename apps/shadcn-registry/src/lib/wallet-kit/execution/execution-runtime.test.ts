import { describe, expect, it, vi } from "vitest";
import { arbitrum } from "viem/chains";
import type { EvmWalletRuntime } from "../runtime/evm/wallet-runtime";
import { buildEvmExecutionRuntime } from "./execution-runtime";

describe("buildEvmExecutionRuntime", () => {
  it("does not switch again when the caller already selected the transaction chain", async () => {
    const sendTransactionAsync = vi.fn().mockResolvedValue("0x111");
    const switchChainAsync = vi.fn();
    const evm = {
      activeConnector: { id: "wallet" },
      activeEvmConnection: { chainId: 8453 },
      chainsById: { [arbitrum.id]: arbitrum },
      getWalletClientFor: vi.fn(),
      sendCallsSyncAsync: undefined,
      sendTransactionAsync,
      shouldUseExternalSigner: false,
      signMessageAsync: undefined,
      signTypedDataAsync: undefined,
      switchChainAsync,
      walletClient: undefined,
    } as unknown as EvmWalletRuntime;

    const runtime = buildEvmExecutionRuntime(evm);
    await runtime.sendTransaction?.(
      {
        to: "0x1111111111111111111111111111111111111111",
        value: "1",
        data: "0x",
        chainId: arbitrum.id,
      },
      { chainIdAlreadySelected: arbitrum.id },
    );

    expect(switchChainAsync).not.toHaveBeenCalled();
    expect(sendTransactionAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: arbitrum.id,
        connector: evm.activeConnector,
      }),
    );
  });

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
    const signMessage = vi.fn().mockResolvedValue("0xowner-signature");
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
        chain_family: "evm",
        chain_id: 4326,
        signer: "0x1111111111111111111111111111111111111111",
        executor: "0x1111111111111111111111111111111111111111",
        aa_mode: "7702",
        tx_ids: [4],
        signature_requests: [
          {
            kind: "personal_sign",
            message:
              "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            raw_payload:
              "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          },
        ],
        description: "Test AA action",
        sponsored: true,
      }),
    ).resolves.toEqual({ signatures: ["0xowner-signature"] });

    expect(getWalletClientFor).toHaveBeenCalledWith({
      connector: evm.activeConnector,
      chainId: 4326,
    });
    expect(signMessage).toHaveBeenCalledWith({
      account: "0x1111111111111111111111111111111111111111",
      message: {
        raw: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    });
    expect(evm.signMessageForAccount).not.toHaveBeenCalled();
  });
});
