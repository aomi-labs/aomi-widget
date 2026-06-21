import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";

import { validateOrigin } from "../csrf";
import { checkRateLimit, getClientIp } from "../rate-limit";
import {
  isValidDeploymentId,
  isValidInstallationId,
  isValidReleaseTags,
  isValidRepo,
} from "../validate-input";

describe("validateOrigin — property-based", () => {
  const savedAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://portal.aomi.dev";
  });

  afterEach(() => {
    if (savedAppUrl) process.env.NEXT_PUBLIC_APP_URL = savedAppUrl;
    else delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("accepts requests matching the configured origin", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "https://portal.aomi.dev",
          "https://portal.aomi.dev/",
          "https://portal.aomi.dev/some/path?q=1",
        ),
        (url) => {
          const req = new Request(url, {
            headers: { origin: url },
          });
          expect(validateOrigin(req)).toBe(true);
        },
      ),
      { numRuns: 10 },
    );
  });

  it("rejects requests from non-matching origins", () => {
    fc.assert(
      fc.property(
        fc.domain().filter((d) => d !== "portal.aomi.dev"),
        (domain) => {
          const url = `https://${domain}/`;
          const req = new Request(url, {
            headers: { origin: url },
          });
          expect(validateOrigin(req)).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("rejects requests with no origin header", () => {
    const req = new Request("https://portal.aomi.dev");
    expect(validateOrigin(req)).toBe(false);
  });

  it("rejects when NEXT_PUBLIC_APP_URL is not configured", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXTAUTH_URL;
    const req = new Request("https://portal.aomi.dev", {
      headers: { origin: "https://portal.aomi.dev" },
    });
    expect(validateOrigin(req)).toBe(false);
  });
});

describe("checkRateLimit — property-based", () => {
  it("allows first request from any IP", () => {
    fc.assert(
      fc.property(
        fc.ipV4().map((ip) => ip.replace(/^::ffff:/, "")),
        (ip) => {
          const { allowed } = checkRateLimit(ip);
          expect(allowed).toBe(true);
        },
      ),
      { numRuns: 30 },
    );
  });

  it("allows up to 10 requests per IP within the window", () => {
    fc.assert(
      fc.property(
        fc.ipV4().map((ip) => ip.replace(/^::ffff:/, "")),
        (ip) => {
          for (let i = 0; i < 10; i++) {
            const { allowed } = checkRateLimit(ip);
            expect(allowed).toBe(true);
          }
        },
      ),
      { numRuns: 10 },
    );
  });

  it("blocks the 11th request from the same IP", () => {
    fc.assert(
      fc.property(
        fc.ipV4().map((ip) => ip.replace(/^::ffff:/, "")),
        (ip) => {
          for (let i = 0; i < 10; i++) checkRateLimit(ip);
          const { allowed } = checkRateLimit(ip);
          expect(allowed).toBe(false);
        },
      ),
      { numRuns: 10 },
    );
  });
});

describe("getClientIp — property-based", () => {
  it("extracts the first IP from x-forwarded-for", () => {
    fc.assert(
      fc.property(
        fc.ipV4().map((ip) => ip.replace(/^::ffff:/, "")),
        fc.option(fc.ipV4().map((ip) => ip.replace(/^::ffff:/, ""))),
        fc.option(fc.ipV4().map((ip) => ip.replace(/^::ffff:/, ""))),
        (first, second, third) => {
          const header = [first, second, third].filter(Boolean).join(", ");
          const req = new Request("http://localhost", {
            headers: { "x-forwarded-for": header },
          });
          expect(getClientIp(req)).toBe(first);
        },
      ),
      { numRuns: 30 },
    );
  });

  it("falls back to x-real-ip when x-forwarded-for is missing", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("falls back to 'unknown' when no header is present", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("validate-input — property-based", () => {
  it("isValidInstallationId only accepts digit-only strings", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = isValidInstallationId(s);
        if (result) {
          expect(s.trim()).toMatch(/^\d+$/);
          expect(s.trim().length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 200 },
    );
  });

  it("isValidRepo only accepts owner/name format", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = isValidRepo(s);
        if (result) {
          const parts = s.trim().split("/");
          expect(parts).toHaveLength(2);
          expect(parts[0].length).toBeGreaterThan(0);
          expect(parts[1].length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 200 },
    );
  });

  it("isValidDeploymentId rejects empty and whitespace-only strings", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("", "  ", "\t", "\n", "   "),
        (s) => {
          expect(isValidDeploymentId(s)).toBe(false);
        },
      ),
      { numRuns: 10 },
    );
  });

  it("isValidDeploymentId accepts non-empty strings", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (s) => {
          if (s.trim().length > 0) {
            expect(isValidDeploymentId(s)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("isValidReleaseTags accepts only non-empty string arrays with non-empty elements", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.string({ minLength: 1, maxLength: 50 }), fc.constantFrom("", "  ", "\t")), { minLength: 0, maxLength: 10 }),
        (tags) => {
          const result = isValidReleaseTags(tags);
          if (result) {
            expect(tags.length).toBeGreaterThan(0);
            expect(tags.every((t) => typeof t === "string" && t.trim().length > 0)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
