import { describe, expect, it } from "vitest";
import {
  buildCliUserState,
  pendingSolTxsFromBackendUserState,
  pendingTxsFromBackendUserState,
  walletSnapshotFromUserState,
} from "../../src/cli/user-state";

describe("buildCliUserState", () => {
  it("builds an EVM-only block from an explicit address", () => {
    expect(buildCliUserState("0xabc", 8453)).toMatchObject({
      connection: {
        is_connected: true,
      },
      evm: {
        address: "0xabc",
        chain_id: 8453,
      },
      ext: { client_type: "ts_cli" },
    });
  });

  it("builds a Solana-only block from an explicit svm address", () => {
    expect(
      buildCliUserState(undefined, undefined, {
        svmAddress: "6ihjJiFMrn8VM1HLX8EMqAt8Ym8JxZCqxBai2bYHviZG",
        svmCluster: "solana:mainnet",
      }),
    ).toMatchObject({
      connection: {
        is_connected: true,
      },
      svm: {
        address: "6ihjJiFMrn8VM1HLX8EMqAt8Ym8JxZCqxBai2bYHviZG",
        cluster: "solana:mainnet",
      },
      ext: { client_type: "ts_cli" },
    });
  });

  it("builds both wallet blocks when both addresses are configured", () => {
    expect(
      buildCliUserState("0xabc", 8453, {
        svmAddress: "6ihjJiFMrn8VM1HLX8EMqAt8Ym8JxZCqxBai2bYHviZG",
        svmCluster: "solana:devnet",
      }),
    ).toMatchObject({
      connection: { is_connected: true },
      evm: { address: "0xabc", chain_id: 8453 },
      svm: {
        address: "6ihjJiFMrn8VM1HLX8EMqAt8Ym8JxZCqxBai2bYHviZG",
        cluster: "solana:devnet",
      },
    });
  });

  it("never injects a cluster the caller did not resolve", () => {
    const state = buildCliUserState(undefined, undefined, {
      svmAddress: "6ihjJiFMrn8VM1HLX8EMqAt8Ym8JxZCqxBai2bYHviZG",
    });
    expect(state.svm).toEqual({
      address: "6ihjJiFMrn8VM1HLX8EMqAt8Ym8JxZCqxBai2bYHviZG",
    });
  });

  it("emits no wallet blocks and no connection without addresses", () => {
    expect(buildCliUserState()).toEqual({
      ext: { client_type: "ts_cli" },
    });
  });

  it("snapshots owner/chain only and ignores backend-authority aa", () => {
    const snapshot = walletSnapshotFromUserState({
      connection: { is_connected: true },
      evm: {
        address: "0xabc",
        chain_id: 8453,
        // aa is backend authority; even if present it must not surface here.
        aa: { mode: "4337", smart_account: "0xabc" },
      },
    } as unknown as Parameters<typeof walletSnapshotFromUserState>[0]);

    expect(snapshot).toEqual({
      publicKey: "0xabc",
      chainId: 8453,
    });
  });
});

describe("pendingTxsFromBackendUserState", () => {
  it("strips data from native_transfer entries", () => {
    const result = pendingTxsFromBackendUserState({
      pending_txs: {
        1: {
          to: "0x742d35Cc6634C0532925a3b844Bc9e7595f33749",
          value: "0",
          data: "0x8a4068dd",
          kind: "native_transfer",
          chain_id: 10,
        },
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0].data).toBeUndefined();
    expect(result[0].payload).toMatchObject({ data: undefined });
  });

  it("preserves data on contract call entries", () => {
    const result = pendingTxsFromBackendUserState({
      pending_txs: {
        2: {
          to: "0x742d35Cc6634C0532925a3b844Bc9e7595f33749",
          value: "0",
          data: "0xa9059cbb0000000000000000000000001234",
          kind: "contract_call",
          chain_id: 10,
        },
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0].data).toBe("0xa9059cbb0000000000000000000000001234");
    expect(result[0].payload).toMatchObject({
      data: "0xa9059cbb0000000000000000000000001234",
    });
  });

  it("retains the authoritative staged sender", () => {
    const result = pendingTxsFromBackendUserState({
      pending: {
        evm_txs: {
          4: {
            from: "0x1234567890abcdef1234567890abcdef12345678",
            to: "0x742d35Cc6634C0532925a3b844Bc9e7595f33749",
            value: "0",
            data: "0x",
            kind: "contract_call",
            chain_id: 4326,
          },
        },
      },
    });

    expect(result[0]).toMatchObject({
      from: "0x1234567890AbcdEF1234567890aBcdef12345678",
      chainId: 4326,
    });
    expect(result[0].payload).toMatchObject({
      from: "0x1234567890AbcdEF1234567890aBcdef12345678",
    });
  });

  it("preserves data when kind is absent", () => {
    const result = pendingTxsFromBackendUserState({
      pending_txs: {
        3: {
          to: "0x742d35Cc6634C0532925a3b844Bc9e7595f33749",
          value: "0",
          data: "0xdeadbeef",
          chain_id: 1,
        },
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0].data).toBe("0xdeadbeef");
  });

  it("rebuilds eip712 requests from canonical pending.evm_sigs", () => {
    const result = pendingTxsFromBackendUserState({
      pending: {
        evm_sigs: {
          11: {
            description: "Permit2 signature",
            typed_data: {
              domain: { chainId: 8453, name: "Permit2" },
              types: { Permit: [{ name: "owner", type: "address" }] },
              primaryType: "Permit",
              message: { owner: "0xabc" },
            },
          },
        },
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "tx-11",
      kind: "eip712_sign",
      eip712Id: 11,
      description: "Permit2 signature",
    });
  });
});

describe("pendingSolTxsFromBackendUserState", () => {
  it("rebuilds Solana requests from legacy pending.solana_txs", () => {
    const result = pendingSolTxsFromBackendUserState({
      pending_solana_txs: {
        21: {
          request_kind: "send_transaction",
          description: "bridge back to main wallet",
          cluster: "solana:devnet",
          unsigned_tx: "U0VORE1F",
          signer: "So1aBcExampleSigner",
        },
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "tx-21",
      solanaId: 21,
      unsignedTx: "U0VORE1F",
      description: "bridge back to main wallet",
      cluster: "solana:devnet",
      signer: "So1aBcExampleSigner",
    });
  });

  it("rebuilds Solana requests from canonical pending.svm_ixs", () => {
    const result = pendingSolTxsFromBackendUserState({
      pending: {
        svm_ixs: {
          22: {
            request_kind: "send_transaction",
            description: "new svm pipeline request",
            cluster: "solana:mainnet",
            unsigned_tx: "U1ZN",
            signer: "So1aBcCanonicalSigner",
          },
        },
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "tx-22",
      solanaId: 22,
      solanaIds: [22],
      requestKind: "solana_send",
      unsignedTx: "U1ZN",
      description: "new svm pipeline request",
      cluster: "solana:mainnet",
      signer: "So1aBcCanonicalSigner",
    });
  });

  it("preserves an event-derived unsigned tx while its staged ix is pending", () => {
    const existing = {
      id: "tx-23",
      solanaId: 23,
      solanaIds: [23],
      requestKind: "solana_send" as const,
      unsignedTx: "RVZFTlQtVU5TSUdORUQ=",
      cluster: "devnet",
      timestamp: 1,
      payload: {},
    };

    expect(
      pendingSolTxsFromBackendUserState(
        { pending: { svm_ixs: { 23: { cluster: "devnet" } } } },
        [existing],
      ),
    ).toEqual([existing]);
    expect(
      pendingSolTxsFromBackendUserState({ pending: { svm_ixs: {} } }, [
        existing,
      ]),
    ).toEqual([]);
  });

  it("rebuilds Solana message-sign requests from pending.svm_sigs", () => {
    const result = pendingSolTxsFromBackendUserState({
      pending: {
        svm_sigs: {
          24: {
            kind: "message_sign",
            message_base64: "YXV0aC1ub25jZQ==",
            description: "sign authentication nonce",
            signer: "So1aBcCanonicalSigner",
          },
        },
      },
    });

    expect(result).toEqual([
      expect.objectContaining({
        id: "tx-24",
        solanaId: 24,
        requestKind: "solana_sign_message",
        message: "YXV0aC1ub25jZQ==",
        signer: "So1aBcCanonicalSigner",
      }),
    ]);
  });
});
