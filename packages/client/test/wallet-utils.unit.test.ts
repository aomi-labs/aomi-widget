import { describe, expect, it } from "vitest";

import {
  hydrateTxPayloadFromUserState,
  normalizeEip712Payload,
  normalizeTxPayload,
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
      }),
    ).toEqual({
      txIds: [17],
      txId: 17,
      aaPreference: "eip4337",
      requestId: undefined,
      to: undefined,
      value: undefined,
      data: undefined,
      chainId: undefined,
    });
  });

  it("retains mixed wallet transaction payloads (raw call + tx_ids)", () => {
    expect(
      normalizeTxPayload({
        tx_ids: [22],
        aa_preference: "eip7702",
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f33749",
        value: "1000",
        data: "0x1234",
      }),
    ).toEqual({
      txIds: [22],
      txId: 22,
      aaPreference: "eip7702",
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
});
