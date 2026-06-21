import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateOrigin } from "./csrf";

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.NEXTAUTH_URL;
});

function request(opts: { origin?: string; referer?: string } = {}): Request {
  const headers = new Headers();
  if (opts.origin) headers.set("origin", opts.origin);
  if (opts.referer) headers.set("referer", opts.referer);
  return new Request("http://localhost/api/onboard/deploy", { headers });
}

describe("validateOrigin", () => {
  it("returns true when no origin env var is configured (fail-open)", () => {
    expect(validateOrigin(request({ origin: "https://evil.com" }))).toBe(true);
  });

  it("returns true when no origin env var and no headers are present", () => {
    expect(validateOrigin(request())).toBe(true);
  });

  it("allows requests from the configured NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://portal.aomi.dev";
    const req = request({ origin: "https://portal.aomi.dev" });
    expect(validateOrigin(req)).toBe(true);
  });

  it("allows requests from NEXTAUTH_URL fallback", () => {
    process.env.NEXTAUTH_URL = "https://portal.aomi.dev";
    const req = request({ origin: "https://portal.aomi.dev" });
    expect(validateOrigin(req)).toBe(true);
  });

  it("prefers NEXT_PUBLIC_APP_URL over NEXTAUTH_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.aomi.dev";
    process.env.NEXTAUTH_URL = "https://auth.aomi.dev";
    const appReq = request({ origin: "https://app.aomi.dev" });
    const authReq = request({ origin: "https://auth.aomi.dev" });
    expect(validateOrigin(appReq)).toBe(true);
    expect(validateOrigin(authReq)).toBe(false);
  });

  it("rejects requests from a different origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://portal.aomi.dev";
    const req = request({ origin: "https://evil.com" });
    expect(validateOrigin(req)).toBe(false);
  });

  it("rejects requests with no origin or referer when env is set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://portal.aomi.dev";
    expect(validateOrigin(request())).toBe(false);
  });

  it("falls back to referer header when origin is missing", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://portal.aomi.dev";
    const req = request({ referer: "https://portal.aomi.dev/some-page" });
    expect(validateOrigin(req)).toBe(true);
  });

  it("compares only the origin (not the full URL)", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://portal.aomi.dev";
    const req = request({ origin: "https://portal.aomi.dev/some/deep/path" });
    expect(validateOrigin(req)).toBe(true);
  });

  it("rejects referer from a different host", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://portal.aomi.dev";
    const req = request({ referer: "https://evil.com/phish" });
    expect(validateOrigin(req)).toBe(false);
  });

  it("rejects malformed origin URLs", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://portal.aomi.dev";
    const req = request({ origin: "not-a-url" });
    expect(validateOrigin(req)).toBe(false);
  });

  it("handles trailing slashes on allowed origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://portal.aomi.dev/";
    const req = request({ origin: "https://portal.aomi.dev" });
    expect(validateOrigin(req)).toBe(true);
  });

  it("handles port-specific origins correctly", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    const req = request({ origin: "http://localhost:3000" });
    expect(validateOrigin(req)).toBe(true);
  });

  it("rejects same host but different port", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    const req = request({ origin: "http://localhost:4000" });
    expect(validateOrigin(req)).toBe(false);
  });
});
