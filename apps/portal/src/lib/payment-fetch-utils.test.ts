// @vitest-environment node
// Pure helpers — no DOM. The jsdom Request/AbortSignal classes reject some
// shapes we use (e.g. passing a foreign Request as init), but Node's native
// Fetch handles them fine.
import { describe, expect, it } from "vitest";
import {
  narrowAutoMethod,
  readExplicitMethod,
} from "./payment-fetch-utils";

const FLAGS_BOTH_ON = { mppEnabled: true, x402Enabled: true };
const FLAGS_BOTH_OFF = { mppEnabled: false, x402Enabled: false };
const FLAGS_MPP_ONLY = { mppEnabled: true, x402Enabled: false };
const FLAGS_X402_ONLY = { mppEnabled: false, x402Enabled: true };

const ABS = "https://api.example.com/api/chat?session=abc";
const REL = "/api/chat?session=abc";

describe("narrowAutoMethod", () => {
  it("is a no-op when both wallets are on (Auto handled by chain)", () => {
    expect(narrowAutoMethod(ABS, FLAGS_BOTH_ON)).toBe(ABS);
    expect(narrowAutoMethod(REL, FLAGS_BOTH_ON)).toBe(REL);
  });

  it("is a no-op when both wallets are off", () => {
    expect(narrowAutoMethod(ABS, FLAGS_BOTH_OFF)).toBe(ABS);
    expect(narrowAutoMethod(REL, FLAGS_BOTH_OFF)).toBe(REL);
  });

  it("is a no-op when only MPP is on (backend stops at tempo naturally)", () => {
    expect(narrowAutoMethod(ABS, FLAGS_MPP_ONLY)).toBe(ABS);
    expect(narrowAutoMethod(REL, FLAGS_MPP_ONLY)).toBe(REL);
  });

  it("forces coinbase on absolute string when MPP off + x402 on", () => {
    const got = narrowAutoMethod(ABS, FLAGS_X402_ONLY);
    expect(typeof got).toBe("string");
    const url = new URL(got as string);
    expect(url.searchParams.get("payment_method")).toBe("coinbase");
    expect(url.searchParams.get("session")).toBe("abc");
  });

  it("forces coinbase on relative string with existing query", () => {
    const got = narrowAutoMethod(REL, FLAGS_X402_ONLY);
    expect(typeof got).toBe("string");
    expect(got as string).toMatch(/[?&]payment_method=coinbase/);
    expect(got as string).toMatch(/[?&]session=abc/);
  });

  it("forces coinbase on relative string without existing query", () => {
    expect(narrowAutoMethod("/api/chat", FLAGS_X402_ONLY)).toBe(
      "/api/chat?payment_method=coinbase",
    );
  });

  it("is a no-op when payment_method is already present (per-thread choice wins)", () => {
    const explicitTempo = `${ABS}&payment_method=tempo`;
    expect(narrowAutoMethod(explicitTempo, FLAGS_X402_ONLY)).toBe(explicitTempo);

    const explicitRel = `${REL}&payment_method=tempo`;
    expect(narrowAutoMethod(explicitRel, FLAGS_X402_ONLY)).toBe(explicitRel);
  });

  it("handles URL instances via .href, not .url", () => {
    const u = new URL(ABS);
    const got = narrowAutoMethod(u, FLAGS_X402_ONLY);
    expect(got).toBeInstanceOf(URL);
    expect((got as URL).searchParams.get("payment_method")).toBe("coinbase");
    // Source URL must not be mutated.
    expect(u.searchParams.has("payment_method")).toBe(false);
  });

  it("URL with payment_method already set is a no-op", () => {
    const u = new URL(`${ABS}&payment_method=tempo`);
    expect(narrowAutoMethod(u, FLAGS_X402_ONLY)).toBe(u);
  });

  it("handles Request inputs and the rebuilt Request carries the body", async () => {
    const body = JSON.stringify({ ping: "pong" });
    const req = new Request(ABS, {
      method: "POST",
      body,
      headers: { "content-type": "application/json", "x-test": "1" },
    });
    const got = narrowAutoMethod(req, FLAGS_X402_ONLY);
    expect(got).toBeInstanceOf(Request);
    const next = got as Request;
    const nextUrl = new URL(next.url);
    expect(nextUrl.searchParams.get("payment_method")).toBe("coinbase");
    expect(next.method).toBe("POST");
    expect(next.headers.get("x-test")).toBe("1");
    // The new Request carries the body (the dispatcher clones it before
    // fetching so the wrapper retry can re-read).
    expect(await next.clone().text()).toBe(body);
    expect(await next.text()).toBe(body);
  });

  it("Request with payment_method already set returns the original", () => {
    const req = new Request(`${ABS}&payment_method=tempo`, { method: "POST" });
    expect(narrowAutoMethod(req, FLAGS_X402_ONLY)).toBe(req);
  });
});

describe("readExplicitMethod", () => {
  it("returns null for Auto on absolute string", () => {
    expect(readExplicitMethod(ABS)).toBeNull();
  });

  it("returns null for Auto on relative string", () => {
    expect(readExplicitMethod(REL)).toBeNull();
  });

  it("reads payment_method from absolute string", () => {
    expect(readExplicitMethod(`${ABS}&payment_method=coinbase`)).toBe(
      "coinbase",
    );
    expect(readExplicitMethod(`${ABS}&payment_method=tempo`)).toBe("tempo");
  });

  it("reads payment_method from relative string", () => {
    expect(readExplicitMethod(`${REL}&payment_method=coinbase`)).toBe(
      "coinbase",
    );
    expect(readExplicitMethod("/api/chat?payment_method=tempo")).toBe("tempo");
  });

  it("reads payment_method from URL instance", () => {
    const u = new URL(`${ABS}&payment_method=coinbase`);
    expect(readExplicitMethod(u)).toBe("coinbase");
  });

  it("reads payment_method from Request instance", () => {
    const req = new Request(`${ABS}&payment_method=tempo`, { method: "POST" });
    expect(readExplicitMethod(req)).toBe("tempo");
  });
});
