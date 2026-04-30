import { describe, expect, it } from "vitest";
import { pendingTxsFromBackendUserState } from "../../src/cli/user-state";

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
});
