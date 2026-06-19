import { describe, expect, it } from "vitest";
import {
  buildCliUserState,
  pendingSolTxsFromBackendUserState,
  pendingTxsFromBackendUserState,
  walletSnapshotFromUserState,
} from "../../src/cli/user-state";

describe("CLI user state AA fields", () => {
  it("builds explicit null AA state by default", () => {
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

  it("builds Solana user state when the active app is svm", () => {
    expect(
      buildCliUserState("6ihjJiFMrn8VM1HLX8EMqAt8Ym8JxZCqxBai2bYHviZG", undefined, {
        app: "svm",
      }),
    ).toMatchObject({
      connection: {
        is_connected: true,
      },
      svm: {
        address: "6ihjJiFMrn8VM1HLX8EMqAt8Ym8JxZCqxBai2bYHviZG",
      },
      ext: { client_type: "ts_cli" },
    });
  });

  it("round-trips 4337 smart-account context", () => {
    const snapshot = walletSnapshotFromUserState({
      connection: { is_connected: true },
      evm: {
        address: "0xabc",
        chain_id: 8453,
        aa: { mode: "4337", smart_account: "0xabc" },
      },
    });

    expect(snapshot).toEqual({
      publicKey: "0xabc",
      chainId: 8453,
      aaMode: "4337",
      smartAccount: "0xabc",
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
      unsignedTx: "U1ZN",
      description: "new svm pipeline request",
      cluster: "solana:mainnet",
      signer: "So1aBcCanonicalSigner",
    });
  });
});
