// The capture harness (aa-1.5): off by default, records sign calls when
// enabled, passes non-sign members through untouched, and never swallows the
// real signature. Verified here so the live capture run isn't the first time
// we learn the harness is wired right.

import { afterEach, describe, expect, it, vi } from "vitest";

import { captureSigner, type AaSignatureCapture } from "../src/aa/capture";

type Captures = { __AOMI_AA_CAPTURES?: AaSignatureCapture[]; __AOMI_AA_CAPTURE?: boolean };

function fakeAccount() {
  return {
    address: "0xabc",
    sign: vi.fn(async ({ hash }: { hash: string }) => `sig(${hash})`),
    signMessage: vi.fn(async () => "0xmsgsig"),
    // The 7702 delegation path — Alchemy's `eip7702Auth` request routes here.
    signAuthorization: vi.fn(async () => ({ r: "0x1", s: "0x2", yParity: 0 })),
  };
}

afterEach(() => {
  const g = globalThis as Captures;
  delete g.__AOMI_AA_CAPTURE;
  delete g.__AOMI_AA_CAPTURES;
});

describe("captureSigner", () => {
  it("is a no-op when capture is disabled", () => {
    const account = fakeAccount();
    const wrapped = captureSigner(account, { mode: "7702", chainId: 1 });
    expect(wrapped).toBe(account); // same reference — not proxied
  });

  it("records the request and signature for each sign call when enabled", async () => {
    (globalThis as Captures).__AOMI_AA_CAPTURE = true;
    vi.spyOn(console, "info").mockImplementation(() => {});
    const account = fakeAccount();
    const wrapped = captureSigner(account, { mode: "7702", chainId: 8453 });

    const sig = await wrapped.sign({ hash: "0xdeadbeef" });

    expect(sig).toBe("sig(0xdeadbeef)"); // real signature flows through
    expect(account.sign).toHaveBeenCalledTimes(1); // underlying signer ran once
    const captures = (globalThis as Captures).__AOMI_AA_CAPTURES ?? [];
    expect(captures).toHaveLength(1);
    expect(captures[0]).toMatchObject({
      mode: "7702",
      chainId: 8453,
      method: "sign",
      args: [{ hash: "0xdeadbeef" }],
      signature: "sig(0xdeadbeef)",
    });
  });

  it("captures signAuthorization (the 7702 delegation sign call)", async () => {
    (globalThis as Captures).__AOMI_AA_CAPTURE = true;
    vi.spyOn(console, "info").mockImplementation(() => {});
    const account = fakeAccount();
    const wrapped = captureSigner(account, { mode: "7702", chainId: 42161 });

    const auth = { chainId: 42161, address: "0xdelegation", nonce: 7 };
    const sig = await wrapped.signAuthorization(auth);

    expect(sig).toEqual({ r: "0x1", s: "0x2", yParity: 0 });
    expect(account.signAuthorization).toHaveBeenCalledTimes(1);
    const captures = (globalThis as Captures).__AOMI_AA_CAPTURES ?? [];
    expect(captures).toHaveLength(1);
    expect(captures[0]).toMatchObject({
      mode: "7702",
      chainId: 42161,
      method: "signAuthorization",
      args: [auth],
      signature: { r: "0x1", s: "0x2", yParity: 0 },
    });
  });

  it("passes non-sign members through untouched", () => {
    (globalThis as Captures).__AOMI_AA_CAPTURE = true;
    const account = fakeAccount();
    const wrapped = captureSigner(account, { mode: "4337", chainId: 1 });
    expect(wrapped.address).toBe("0xabc");
    expect((globalThis as Captures).__AOMI_AA_CAPTURES ?? []).toHaveLength(0);
  });
});
