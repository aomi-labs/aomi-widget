// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ mintAccountBearer: vi.fn() }));

vi.mock("@aomi-labs/account", () => ({
  mintAccountBearer: mocks.mintAccountBearer,
}));

import { handlePipelineMcp } from "../pipeline-mcp-route";

const body = JSON.stringify({
  jsonrpc: "2.0",
  id: "paid-call",
  method: "tools/call",
  params: {
    name: "aomi_call_tool",
    arguments: {
      tool_id: "paid_tool",
      app: "public-paid",
      application_id: 42,
      platform: "community",
    },
  },
});

function request(paymentSignature?: string): Request {
  return new Request("https://portal.example/pipeline/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": "pipeline-paid-1",
      ...(paymentSignature ? { "payment-signature": paymentSignature } : {}),
    },
    body,
  });
}

describe("legacy Pipeline MCP x402 rollback", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.stubEnv("AOMI_PIPELINE_ROLLBACK_MODE", "legacy");
    vi.stubEnv("BACKEND_URL", "https://backend.example");
    mocks.mintAccountBearer
      .mockReset()
      .mockResolvedValue({ bearer: "account" });
  });

  it("retries a 402 with the same caller key and surfaces the receipt", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json(
          { error: "payment required" },
          {
            status: 402,
            headers: { "payment-required": "challenge" },
          },
        ),
      )
      .mockResolvedValueOnce(
        Response.json(
          { commands: [], followup: null },
          {
            headers: {
              "payment-response": "settled",
              "payment-receipt": "receipt-1",
            },
          },
        ),
      );

    const challenged = await handlePipelineMcp(request(), "canonical-user");
    expect(challenged.status).toBe(402);
    expect(challenged.headers.get("payment-required")).toBe("challenge");

    const settled = await handlePipelineMcp(
      request("signed-payment"),
      "canonical-user",
    );
    expect(settled.status).toBe(200);
    expect(settled.headers.get("payment-response")).toBe("settled");
    expect(settled.headers.get("payment-receipt")).toBe("receipt-1");

    expect(fetch).toHaveBeenCalledTimes(2);
    for (const [url, init] of fetch.mock.calls as [URL, RequestInit][]) {
      expect(url.toString()).toBe(
        "https://backend.example/api/exec/tool-call?app=public-paid&application_id=42&platform=community",
      );
      expect(new Headers(init.headers).get("idempotency-key")).toBe(
        "pipeline-paid-1",
      );
    }
    expect(
      new Headers((fetch.mock.calls[0]![1] as RequestInit).headers).get(
        "payment-signature",
      ),
    ).toBeNull();
    expect(
      new Headers((fetch.mock.calls[1]![1] as RequestInit).headers).get(
        "payment-signature",
      ),
    ).toBe("signed-payment");
  });
});
