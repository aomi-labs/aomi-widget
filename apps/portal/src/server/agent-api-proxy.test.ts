import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ mintAgentApiBearer: vi.fn() }));

vi.mock("@aomi-labs/account", () => ({
  mintAgentApiBearer: mocks.mintAgentApiBearer,
}));

import { configuredAgentApiUrl, proxyAgentApi } from "./agent-api-proxy";

describe("Agent API proxy", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mocks.mintAgentApiBearer
      .mockReset()
      .mockResolvedValue({ bearer: "api-user" });
  });

  it("mints the API audience and preserves only protocol headers", async () => {
    vi.stubEnv("AOMI_AGENT_API_URL", "http://api-server:8082/");
    const upstream = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ sessionId: "session" }), {
        headers: {
          "content-type": "application/json",
          "payment-response": "paid",
          "set-cookie": "forbidden=1",
          "x-request-id": "upstream-request",
        },
      }),
    );
    const response = await proxyAgentApi(
      new Request("https://portal.example/v1/agent/chat?wait=1", {
        method: "POST",
        headers: {
          authorization: "Bearer attacker",
          cookie: "secret=1",
          "content-type": "application/json",
          "idempotency-key": "idem-1",
          "payment-signature": "payment",
          "x-request-id": "request-1",
        },
        body: "{}",
      }),
      "canonical-user",
      upstream,
    );

    expect(mocks.mintAgentApiBearer).toHaveBeenCalledWith("canonical-user");
    const [url, init] = upstream.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("http://api-server:8082/v1/agent/chat?wait=1");
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer api-user");
    expect(headers.get("cookie")).toBeNull();
    expect(headers.get("idempotency-key")).toBe("idem-1");
    expect(headers.get("payment-signature")).toBe("payment");
    expect(response.headers.get("payment-response")).toBe("paid");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("fails closed without a hosted API-server URL", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(() => configuredAgentApiUrl()).toThrow("AOMI_AGENT_API_URL");
  });
});
