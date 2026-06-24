import { describe, it, expect } from "vitest";
import { validateOrigin } from "./csrf";

function request(opts: { origin?: string; referer?: string; url?: string } = {}): Request {
  const headers = new Headers();
  if (opts.origin) headers.set("origin", opts.origin);
  if (opts.referer) headers.set("referer", opts.referer);
  return new Request(opts.url ?? "http://localhost/api/launch/deploy", { headers });
}

describe("validateOrigin", () => {
  it("allows requests from the request origin", () => {
    const req = request({
      url: "https://portal.aomi.dev/api/launch/deploy",
      origin: "https://portal.aomi.dev",
    });
    expect(validateOrigin(req)).toBe(true);
  });

  it("rejects requests from a different origin", () => {
    const req = request({
      url: "https://portal.aomi.dev/api/launch/deploy",
      origin: "https://evil.com",
    });
    expect(validateOrigin(req)).toBe(false);
  });

  it("rejects requests with no origin or referer", () => {
    expect(validateOrigin(request())).toBe(false);
  });

  it("falls back to referer header when origin is missing", () => {
    const req = request({
      url: "https://portal.aomi.dev/api/launch/deploy",
      referer: "https://portal.aomi.dev/some-page",
    });
    expect(validateOrigin(req)).toBe(true);
  });

  it("compares only the origin (not the full URL)", () => {
    const req = request({
      url: "https://portal.aomi.dev/api/launch/deploy",
      origin: "https://portal.aomi.dev/some/deep/path",
    });
    expect(validateOrigin(req)).toBe(true);
  });

  it("rejects referer from a different host", () => {
    const req = request({
      url: "https://portal.aomi.dev/api/launch/deploy",
      referer: "https://evil.com/phish",
    });
    expect(validateOrigin(req)).toBe(false);
  });

  it("rejects malformed origin URLs", () => {
    const req = request({
      url: "https://portal.aomi.dev/api/launch/deploy",
      origin: "not-a-url",
    });
    expect(validateOrigin(req)).toBe(false);
  });

  it("handles port-specific origins correctly", () => {
    const req = request({
      url: "http://localhost:3000/api/launch/deploy",
      origin: "http://localhost:3000",
    });
    expect(validateOrigin(req)).toBe(true);
  });

  it("rejects same host but different port", () => {
    const req = request({
      url: "http://localhost:3000/api/launch/deploy",
      origin: "http://localhost:4000",
    });
    expect(validateOrigin(req)).toBe(false);
  });
});
