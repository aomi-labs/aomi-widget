import { describe, expect, it } from "vitest";

import {
  hydrateTxPayloadFromUserState,
  normalizeEip712Payload,
  normalizeSolanaWalletRequest,
  normalizeTxPayload,
  toViemSignMessageArgs,
} from "../src/index";

describe("wallet payload normalization", () => {
  it("retains backend tx identifiers on wallet transaction requests", () => {
    expect(
      normalizeTxPayload({
        tx_ids: [7],
        aa_preference: "auto",
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f33749",
        value: "0",
        data: "0x",
        chain_id: 8453,
      }),
    ).toEqual({
      txIds: [7],
      txId: 7,
      aaPreference: "auto",
      requestId: undefined,
      to: "0x742D35cc6634C0532925a3b844bC9e7595f33749",
      value: "0",
      data: "0x",
      chainId: 8453,
    });
  });

  it("accepts id-only wallet transaction requests", () => {
    expect(
      normalizeTxPayload({
        tx_ids: ["17"],
        aa_preference: "eip4337",
        aa_strict: true,
      }),
    ).toEqual({
      txIds: [17],
      txId: 17,
      aaPreference: "eip4337",
      aaStrict: true,
      requestId: undefined,
      to: undefined,
      value: undefined,
      data: undefined,
      chainId: undefined,
    });
  });

  it("rejects malformed and unsafe chain IDs", () => {
    expect(
      normalizeTxPayload({ tx_ids: [1], chain_id: "8453abc" })?.chainId,
    ).toBeUndefined();
    expect(
      normalizeTxPayload({ tx_ids: [1], chain_id: "0x2105zz" })?.chainId,
    ).toBeUndefined();
    expect(
      normalizeTxPayload({ tx_ids: [1], chain_id: "9007199254740993" })
        ?.chainId,
    ).toBeUndefined();
    expect(
      normalizeTxPayload({
        tx_ids: [1],
        chain_id: Number.MAX_SAFE_INTEGER + 1,
      })?.chainId,
    ).toBeUndefined();
    expect(
      normalizeTxPayload({ tx_ids: [1], chain_id: 1.5 })?.chainId,
    ).toBeUndefined();
    expect(
      normalizeTxPayload({ tx_ids: [1], chain_id: 0 })?.chainId,
    ).toBeUndefined();
    expect(
      normalizeTxPayload({ tx_ids: [1], chain_id: -1 })?.chainId,
    ).toBeUndefined();
    expect(normalizeTxPayload({ tx_ids: [1], chain_id: "8453" })?.chainId).toBe(
      8453,
    );
    expect(
      normalizeTxPayload({ tx_ids: [1], chain_id: "0x2105" })?.chainId,
    ).toBe(8453);
    expect(normalizeTxPayload({ tx_ids: [1], chain_id: 8453 })?.chainId).toBe(
      8453,
    );
  });

  it("retains mixed wallet transaction payloads (raw call + tx_ids)", () => {
    expect(
      normalizeTxPayload({
        tx_ids: [22],
        aa_preference: "eip7702",
        aaStrict: true,
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f33749",
        value: "1000",
        data: "0x1234",
      }),
    ).toEqual({
      txIds: [22],
      txId: 22,
      aaPreference: "eip7702",
      aaStrict: true,
      requestId: undefined,
      to: "0x742D35cc6634C0532925a3b844bC9e7595f33749",
      value: "1000",
      data: "0x1234",
      chainId: undefined,
    });
  });

  it("rejects wallet transaction requests when tx_ids is missing", () => {
    expect(
      normalizeTxPayload({
        value: "1",
        data: "0x",
      }),
    ).toBeNull();
  });

  it("hydrates id-only tx payloads from user_state.pending_txs", () => {
    const hydrated = hydrateTxPayloadFromUserState(
      {
        txId: 9,
        txIds: [9],
        aaPreference: "auto",
      },
      {
        pending_txs: {
          9: {
            to: "0x742d35Cc6634C0532925a3b844Bc9e7595f33749",
            value: "5",
            data: "0x",
            chain_id: 8453,
          },
        },
      },
      { strict: true },
    );

    expect(hydrated).toEqual({
      txId: 9,
      txIds: [9],
      aaPreference: "auto",
      to: "0x742D35cc6634C0532925a3b844bC9e7595f33749",
      value: "5",
      data: "0x",
      chainId: 8453,
      calls: [
        {
          txId: 9,
          to: "0x742D35cc6634C0532925a3b844bC9e7595f33749",
          value: "5",
          data: "0x",
          chainId: 8453,
          from: undefined,
          gas: undefined,
          description: undefined,
        },
      ],
    });
  });

  it("hydrates id-only tx payloads from nested user_state.pending.evm_txs", () => {
    const hydrated = hydrateTxPayloadFromUserState(
      {
        txId: 10,
        txIds: [10],
        aaPreference: "auto",
      },
      {
        pending: {
          evmTxs: {
            10: {
              to: "0x742d35Cc6634C0532925a3b844Bc9e7595f33749",
              value: "7",
              data: "0x",
              chainId: "8453",
            },
          },
        },
      },
      { strict: true },
    );

    expect(hydrated).toMatchObject({
      txId: 10,
      txIds: [10],
      to: "0x742D35cc6634C0532925a3b844bC9e7595f33749",
      value: "7",
      data: "0x",
      chainId: 8453,
      calls: [
        expect.objectContaining({
          txId: 10,
          value: "7",
          chainId: 8453,
        }),
      ],
    });
  });

  it("strips stray calldata from hydrated native transfers", () => {
    const hydrated = hydrateTxPayloadFromUserState(
      {
        txId: 9,
        txIds: [9],
        aaPreference: "auto",
      },
      {
        pending_txs: {
          9: {
            to: "0x742d35Cc6634C0532925a3b844Bc9e7595f33749",
            value: "0",
            data: "0x8a4068dd",
            kind: "native_transfer",
            chain_id: 1,
          },
        },
      },
      { strict: true },
    );

    expect(hydrated).toEqual({
      txId: 9,
      txIds: [9],
      aaPreference: "auto",
      to: "0x742D35cc6634C0532925a3b844bC9e7595f33749",
      value: "0",
      data: undefined,
      chainId: 1,
      calls: [
        {
          txId: 9,
          to: "0x742D35cc6634C0532925a3b844bC9e7595f33749",
          value: "0",
          data: undefined,
          chainId: 1,
          from: undefined,
          gas: undefined,
          description: undefined,
        },
      ],
    });
  });

  it("throws pending_tx_not_found when strict hydration misses tx id", () => {
    expect(() =>
      hydrateTxPayloadFromUserState(
        {
          txId: 404,
          txIds: [404],
        },
        {
          pending_txs: {
            1: {
              to: "0x742d35Cc6634C0532925a3b844Bc9e7595f33749",
            },
          },
        },
        { strict: true },
      ),
    ).toThrow("pending_tx_not_found");
  });

  it("retains backend eip712 identifiers on wallet signature requests", () => {
    expect(
      normalizeEip712Payload({
        eip712Id: 11,
        pending_eip712_id: "11",
        typed_data: {
          domain: { chainId: 8453, name: "Permit2" },
          types: { Permit: [{ name: "owner", type: "address" }] },
          primaryType: "Permit",
          message: { owner: "0x123" },
        },
        description: "Permit2 signature",
      }),
    ).toEqual({
      eip712Id: 11,
      typed_data: {
        domain: { chainId: 8453, name: "Permit2" },
        types: { Permit: [{ name: "owner", type: "address" }] },
        primaryType: "Permit",
        message: { owner: "0x123" },
      },
      description: "Permit2 signature",
    });
  });

  it("normalizes backend svm wallet_tx_request payloads into a Solana send request", () => {
    expect(
      normalizeSolanaWalletRequest({
        chain_family: "svm",
        svm_tx_ids: [12],
        request_kind: "send_transaction",
        unsigned_tx: "U0VORE1F",
        cluster: "solana:devnet",
        description: "send 0.01 SOL",
        pending_solana_id: 12,
      }),
    ).toEqual({
      kind: "solana_send",
      payload: {
        unsignedTx: "U0VORE1F",
        description: "send 0.01 SOL",
        cluster: "solana:devnet",
        pendingSolanaId: 12,
        pendingSolanaIds: [12],
      },
    });
  });

  it("normalizes backend svm message_sign payloads into a Solana message-sign request", () => {
    expect(
      normalizeSolanaWalletRequest({
        chain_kind: "svm",
        request_kind: "message_sign",
        kind: "solana_sign_message",
        message_base64: "TWVtbw==",
        cluster: "solana:devnet",
        description: "sign login proof",
        pending_solana_id: 17,
      }),
    ).toEqual({
      kind: "solana_sign_message",
      payload: {
        message: "TWVtbw==",
        description: "sign login proof",
        cluster: "solana:devnet",
        pendingSolanaId: 17,
      },
    });
  });

  it("retains ERC-191 non-typed signature payloads", () => {
    expect(
      normalizeEip712Payload({
        pending_eip712_id: "12",
        non_typed_data: "Sign in with Ethereum",
        description: "Login signature",
      }),
    ).toEqual({
      eip712Id: 12,
      typed_data: undefined,
      non_typed_data: "Sign in with Ethereum",
      description: "Login signature",
    });
  });

  it("converts ERC-191 hex strings into raw byte signMessage args", () => {
    expect(
      toViemSignMessageArgs({
        non_typed_data: "0x5369676e20696e",
      }),
    ).toEqual({
      message: { raw: "0x5369676e20696e" },
    });
  });

  it("converts ERC-191 text strings into text signMessage args", () => {
    expect(
      toViemSignMessageArgs({
        non_typed_data: "Sign in with Ethereum",
      }),
    ).toEqual({
      message: "Sign in with Ethereum",
    });
  });
});
