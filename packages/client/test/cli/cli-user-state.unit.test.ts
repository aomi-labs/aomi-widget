import { describe, expect, it } from "vitest";
import {
  buildCliUserState,
  pendingTxsFromBackendUserState,
  walletSnapshotFromUserState,
} from "../../src/cli/user-state";
import { UserState } from "../../src/types";

describe("CLI user state AA fields", () => {
  it("omits execution context when aa is unspecified", () => {
    const state = buildCliUserState("0xabc", 8453);
    expect(state).toMatchObject({
      evm: { address: "0xabc", chain_id: 8453 },
      connection: { is_connected: true },
      ext: { client_type: "ts_cli" },
    });
    expect(state.evm?.aa).toBeUndefined();
    expect(UserState.walletKind(state)).toBe("eoa");
  });

  it("maps null aaMode input to aa.mode=none", () => {
    expect(buildCliUserState("0xabc", 8453, { aaMode: null })).toMatchObject({
      evm: { address: "0xabc", chain_id: 8453, aa: { mode: "none" } },
      connection: { is_connected: true },
    });
  });

  it("maps 4337 with separate smart account to eoa walletKind", () => {
    const state = buildCliUserState("0xabc", 8453, {
      aaMode: "4337",
      smartAccount: "0xdef",
    });
    expect(state).toMatchObject({
      evm: {
        address: "0xabc",
        chain_id: 8453,
        aa: { mode: "4337", smart_account: "0xdef" },
      },
      connection: { is_connected: true },
    });
    // smart_account !== connected address → derived kind is eoa.
    expect(UserState.walletKind(state)).toBe("eoa");
  });

  it("derives aaMode and smartAccount from nested UserState schema", () => {
    const snapshot = walletSnapshotFromUserState({
      evm: {
        address: "0xdef",
        chain_id: 8453,
        aa: { mode: "4337", smart_account: "0xdef" },
      },
      connection: { is_connected: true },
    });

    expect(snapshot).toEqual({
      publicKey: "0xdef",
      chainId: 8453,
      aaMode: "4337",
      smartAccount: "0xdef",
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
});
