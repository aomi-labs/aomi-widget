import { describe, expect, it } from "vitest";

import { resolveWalletState } from "../src/session/state";

describe("resolveWalletState — AA provider declaration", () => {
  const aaOf = (state: ReturnType<typeof resolveWalletState>) =>
    state.evm?.aa ?? {};

  it("declares provider 'alchemy' for 4337", () => {
    const state = resolveWalletState(undefined, "0xabc", 8453, {
      aaMode: "4337",
      smartAccount4337: "0xsmart",
    });
    expect(aaOf(state)).toMatchObject({
      mode: "4337",
      provider: "alchemy",
      smart_account: "0xsmart",
    });
  });

  it("declares provider 'alchemy' for 7702", () => {
    const state = resolveWalletState(undefined, "0xabc", 1, {
      aaMode: "7702",
      delegation7702: "0xdel",
    });
    expect(aaOf(state)).toMatchObject({
      mode: "7702",
      provider: "alchemy",
      delegation_7702: "0xdel",
    });
  });

  it("omits provider when AA is off (mode 'none')", () => {
    const state = resolveWalletState(undefined, "0xabc", 1, { aaMode: "none" });
    expect(aaOf(state)).toMatchObject({ mode: "none" });
    expect(aaOf(state).provider).toBeUndefined();
  });
});
