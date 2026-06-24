import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, getClientIp } from "./rate-limit";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function request(opts: { forwarded?: string; realIp?: string } = {}): Request {
  const headers = new Headers();
  if (opts.forwarded) headers.set("x-forwarded-for", opts.forwarded);
  if (opts.realIp) headers.set("x-real-ip", opts.realIp);
  return new Request("http://localhost/api/launch/deploy", { headers });
}

describe("checkRateLimit", () => {
  it("allows the first request from a new IP", () => {
    const result = checkRateLimit("10.0.0.1");
    expect(result.allowed).toBe(true);
  });

  it("allows requests under the limit", () => {
    for (let i = 0; i < 59; i++) {
      expect(checkRateLimit("10.0.0.1").allowed).toBe(true);
    }
  });

  it("blocks the 61st request within the window", () => {
    for (let i = 0; i < 60; i++) {
      checkRateLimit("10.0.0.1");
    }
    expect(checkRateLimit("10.0.0.1").allowed).toBe(false);
  });

  it("resets the window after 60 seconds", () => {
    for (let i = 0; i < 60; i++) {
      checkRateLimit("10.0.0.1");
    }
    expect(checkRateLimit("10.0.0.1").allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit("10.0.0.1").allowed).toBe(true);
  });

  it("tracks different IPs independently", () => {
    for (let i = 0; i < 60; i++) {
      checkRateLimit("10.0.0.1");
    }
    expect(checkRateLimit("10.0.0.1").allowed).toBe(false);
    expect(checkRateLimit("10.0.0.2").allowed).toBe(true);
    expect(checkRateLimit("10.0.0.3").allowed).toBe(true);
  });

  it("allows many requests from many IPs", () => {
    for (const ip of ["10.0.0.1", "10.0.0.2", "10.0.0.3"]) {
      for (let i = 0; i < 60; i++) {
        checkRateLimit(ip);
      }
    }
    expect(checkRateLimit("10.0.0.1").allowed).toBe(false);
    expect(checkRateLimit("10.0.0.2").allowed).toBe(false);
    expect(checkRateLimit("10.0.0.3").allowed).toBe(false);
    expect(checkRateLimit("10.0.0.4").allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("reads x-forwarded-for first", () => {
    const req = request({ forwarded: "203.0.113.1, 10.0.0.1" });
    expect(getClientIp(req)).toBe("203.0.113.1");
  });

  it("reads the first IP when multiple are listed", () => {
    const req = request({ forwarded: "198.51.100.2, 203.0.113.5, 10.0.0.1" });
    expect(getClientIp(req)).toBe("198.51.100.2");
  });

  it("falls back to x-real-ip", () => {
    const req = request({ realIp: "198.51.100.3" });
    expect(getClientIp(req)).toBe("198.51.100.3");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const req = request({ forwarded: "203.0.113.1", realIp: "10.0.0.1" });
    expect(getClientIp(req)).toBe("203.0.113.1");
  });

  it("falls back to 'unknown' when no headers are present", () => {
    expect(getClientIp(request())).toBe("unknown");
  });

  it("trims whitespace from IP values", () => {
    const req = request({ forwarded: "  203.0.113.1  ,  10.0.0.1  " });
    expect(getClientIp(req)).toBe("203.0.113.1");
  });
});
