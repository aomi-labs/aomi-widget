import { describe, expect, it } from "vitest";

import { resolveWalletState } from "../src/session/state";

describe("resolveWalletState — owner/chain only", () => {
  it("records the connected owner and chain", () => {
    const state = resolveWalletState(undefined, "0xabc", 8453);
    expect(state.evm?.address).toBe("0xabc");
    expect(state.evm?.chain_id).toBe(8453);
    expect(state.connection?.is_connected).toBe(true);
  });

  it("defaults chain_id to 1 when unspecified", () => {
    const state = resolveWalletState(undefined, "0xabc", undefined);
    expect(state.evm?.chain_id).toBe(1);
  });

  it("never writes backend-authority aa/sponsorship into user_state", () => {
    const state = resolveWalletState(undefined, "0xabc", 8453);
    expect(state.evm).not.toHaveProperty("aa");
    expect(state.evm).not.toHaveProperty("sponsorship");
  });
});
