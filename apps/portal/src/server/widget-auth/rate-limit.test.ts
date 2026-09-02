import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ counts: new Map<string, number>() }));

vi.mock("@aomi-labs/account/widget-auth", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@aomi-labs/account/widget-auth")>();
  return {
    ...original,
    checkWidgetAuthRateLimit: vi.fn(
      async (input: { origin: string; clientAddress: string }) => {
        const key = `${input.origin}|${input.clientAddress}`;
        const next = (mocks.counts.get(key) ?? 0) + 1;
        mocks.counts.set(key, next);
        return { allowed: next <= 60 };
      },
    ),
  };
});

import { widgetAuthRateLimit, widgetClientAddress } from "./rate-limit";
import { widgetRoute } from "./response";

function requestFromIp(
  verifiedIp: string,
  forwardedIp = "198.51.100.200",
): Request {
  return new Request("http://localhost:3002/api/auth/widget/exchange", {
    method: "POST",
    headers: {
      Origin: "http://localhost:3000",
      "x-vercel-forwarded-for": verifiedIp,
      "x-forwarded-for": forwardedIp,
    },
  });
}

describe("widgetAuthRateLimit", () => {
  beforeEach(() => mocks.counts.clear());

  it("blocks the 61st request from the same edge-verified client", async () => {
    let result: Response | null = null;
    for (let i = 0; i < 61; i++) {
      result = await widgetAuthRateLimit(requestFromIp("203.0.113.10"));
    }
    expect(result?.status).toBe(429);
  });

  it("does not let arbitrary forwarding headers reset the quota", async () => {
    let result: Response | null = null;
    for (let i = 0; i < 61; i++) {
      result = await widgetAuthRateLimit(
        requestFromIp("203.0.113.20", `198.51.100.${i}`),
      );
    }
    expect(result?.status).toBe(429);
  });

  it("uses only the Vercel-owned address header in a deployment", () => {
    expect(
      widgetClientAddress(
        requestFromIp("203.0.113.30", "192.0.2.1"),
        { VERCEL: "1" },
      ),
    ).toBe("203.0.113.30");
  });

  it("falls back to one conservative bucket for malformed addresses", () => {
    expect(
      widgetClientAddress(requestFromIp("spoofed, 203.0.113.30"), {
        VERCEL: "1",
      }),
    ).toBe("unknown");
  });

  it("keeps widget CORS headers on a limited response", async () => {
    const handler = widgetRoute(async (request: Request) => {
      const limited = await widgetAuthRateLimit(request);
      return limited ?? Response.json({ ok: true });
    }, "widget.test_rate_limit");
    let response: Response | null = null;
    for (let i = 0; i < 61; i++) {
      response = await handler(requestFromIp("203.0.113.40"));
    }
    expect(response?.status).toBe(429);
    expect(response?.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3000",
    );
    expect(response?.headers.get("Vary")).toContain("Origin");
    expect(response?.headers.get("Access-Control-Allow-Credentials")).toBeNull();
  });
});
