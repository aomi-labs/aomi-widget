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
        txId: 7,
        pending_tx_id: 7,
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f33749",
        value: "0",
        data: "0x",
        chain_id: 8453,
      }),
    ).toEqual({
      txId: 7,
      to: "0x742D35cc6634C0532925a3b844bC9e7595f33749",
      value: "0",
      data: "0x",
      chainId: 8453,
    });
  });

  it("accepts id-only wallet transaction requests", () => {
    expect(
      normalizeTxPayload({
        pending_tx_id: "17",
      }),
    ).toEqual({
      txId: 17,
      to: undefined,
      value: undefined,
      data: undefined,
      chainId: undefined,
    });
  });

  it("retains mixed wallet transaction payloads (raw call + pending id)", () => {
    expect(
      normalizeTxPayload({
        pending_tx_id: 22,
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f33749",
        value: "1000",
        data: "0x1234",
      }),
    ).toEqual({
      txId: 22,
      to: "0x742D35cc6634C0532925a3b844bC9e7595f33749",
      value: "1000",
      data: "0x1234",
      chainId: undefined,
    });
  });

  it("rejects wallet transaction requests when id and to are both missing", () => {
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
      to: "0x742D35cc6634C0532925a3b844bC9e7595f33749",
      value: "5",
      data: "0x",
      chainId: 8453,
    });
  });

  it("throws pending_tx_not_found when strict hydration misses tx id", () => {
    expect(() =>
      hydrateTxPayloadFromUserState(
        {
          txId: 404,
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
