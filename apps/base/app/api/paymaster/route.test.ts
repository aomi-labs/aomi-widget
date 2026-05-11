import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const PAYMASTER_BODY = JSON.stringify({
  id: 1,
  jsonrpc: "2.0",
  method: "pm_getPaymasterStubData",
  params: [{}],
});

function paymasterRequest(headers: HeadersInit = {}) {
  return new NextRequest("http://localhost:3000/api/paymaster", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: PAYMASTER_BODY,
  });
}

async function loadRoute() {
  process.env.PIMLICO_PAYMASTER_URL = "https://pimlico.example/rpc";

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      return new Response(
        JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          result: {},
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
    }),
  );

  return import("./route");
}

describe("paymaster route security gates", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    delete process.env.PAYMASTER_ALLOWED_ORIGINS;
    delete process.env.PAYMASTER_ALLOW_ORIGINLESS_REQUESTS;
    delete process.env.PAYMASTER_TRUST_FORWARDED_IP_HEADERS;
    delete process.env.PIMLICO_PAYMASTER_URL;
    delete process.env.VERCEL;
  });

  it("rejects requests without an Origin header", async () => {
    const { POST } = await loadRoute();

    const response = await POST(paymasterRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Origin is not allowed",
    });
  });

  it("accepts explicitly configured paymaster origins", async () => {
    process.env.PAYMASTER_ALLOWED_ORIGINS = "https://base.test";
    const { POST } = await loadRoute();

    const response = await POST(
      paymasterRequest({
        origin: "https://base.test",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://base.test",
    );
  });

  it("accepts origin-less native wallet requests only when explicitly enabled", async () => {
    process.env.PAYMASTER_ALLOW_ORIGINLESS_REQUESTS = "1";
    const { POST } = await loadRoute();

    const response = await POST(paymasterRequest());

    expect(response.status).toBe(200);
  });

  it("allows ERC-7677 accepted-payment-token probes", async () => {
    process.env.PAYMASTER_ALLOW_ORIGINLESS_REQUESTS = "1";
    const { POST } = await loadRoute();

    const response = await POST(
      new NextRequest("http://localhost:3000/api/paymaster", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "pm_getAcceptedPaymentTokens",
          params: ["0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789", "0x2105", {}],
        }),
      }),
    );

    expect(response.status).toBe(200);
  });

  it("does not use untrusted forwarded IP headers as the rate-limit key", async () => {
    const { POST } = await loadRoute();

    for (let index = 0; index < 30; index += 1) {
      const response = await POST(
        paymasterRequest({
          origin: "http://localhost:3000",
          "x-forwarded-for": `203.0.113.${index}`,
        }),
      );

      expect(response.status).toBe(200);
    }

    const response = await POST(
      paymasterRequest({
        origin: "http://localhost:3000",
        "x-forwarded-for": "203.0.113.200",
      }),
    );

    expect(response.status).toBe(429);
  });
});
