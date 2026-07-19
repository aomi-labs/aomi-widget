import { describe, expect, it } from "vitest";

import { resolveWalletState } from "../src/session/state";

// The browser path must declare `provider: "alchemy"` in user_state.evm.aa so
// a browser/portal auto-sign session passes the backend's `aa_provider ==
// "alchemy"` filter and routes through the BE AA lane (not the plain-EOA path).
describe("resolveWalletState — AA provider declaration", () => {
  const aaOf = (s: ReturnType<typeof resolveWalletState>) =>
    (s.evm as { aa?: Record<string, unknown> } | undefined)?.aa ?? {};

  it("declares provider 'alchemy' for 4337", () => {
    const s = resolveWalletState(undefined, "0xabc", 8453, {
      aaMode: "4337",
      smartAccount4337: "0xsmart",
    });
    expect(aaOf(s)).toMatchObject({
      mode: "4337",
      provider: "alchemy",
      smart_account: "0xsmart",
    });
  });

  it("declares provider 'alchemy' for 7702", () => {
    const s = resolveWalletState(undefined, "0xabc", 1, {
      aaMode: "7702",
      delegation7702: "0xdel",
    });
    expect(aaOf(s)).toMatchObject({
      mode: "7702",
      provider: "alchemy",
      delegation_7702: "0xdel",
    });
  });

  it("omits provider when AA is off (mode 'none')", () => {
    const s = resolveWalletState(undefined, "0xabc", 1, { aaMode: "none" });
    expect(aaOf(s)).toMatchObject({ mode: "none" });
    expect(aaOf(s).provider).toBeUndefined();
  });
});
