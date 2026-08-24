// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mintAccountBearer: vi.fn(),
  logPortalUpstreamFailure: vi.fn(),
}));

vi.mock("@aomi-labs/account", () => ({
  mintAccountBearer: mocks.mintAccountBearer,
}));

vi.mock("@portal/server/backend-url", () => ({
  configuredBackendUrl: () => "https://api.example.test",
}));

vi.mock("@portal/server/bff/failures", () => ({
  portalFailures: {
    handle: (input: {
      upstream: string;
      status: number;
      response: { status: number };
      context: Record<string, unknown>;
    }) =>
      mocks.logPortalUpstreamFailure({
        ...input.context,
        status: input.response.status,
        upstream: input.upstream,
        upstreamStatus: input.status,
      }),
  },
}));

import { execRun, resourceGet, toolCall } from "./backend";

describe("MCP backend observability", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.mintAccountBearer.mockReset();
    mocks.logPortalUpstreamFailure.mockReset();
    mocks.mintAccountBearer.mockResolvedValue({ bearer: "account-bearer" });
  });

  it("logs a Rust 5xx once without changing the backend result", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("private upstream failure", { status: 503 }),
    );

    const result = await resourceGet("canonical-user", "/api/resource/apps");

    expect(result).toEqual({
      ok: false,
      status: 503,
      body: { error: "private upstream failure" },
    });
    expect(mocks.logPortalUpstreamFailure).toHaveBeenCalledTimes(1);
    expect(mocks.logPortalUpstreamFailure).toHaveBeenCalledWith({
      routeFamily: "/pipeline/mcp",
      operation: "mcp_resource_get",
      method: "GET",
      status: 200,
      upstream: "rust",
      upstreamStatus: 503,
    });
    expect(
      JSON.stringify(mocks.logPortalUpstreamFailure.mock.calls),
    ).not.toContain("private upstream failure");
  });

  it("preserves the existing malformed JSON fallback", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      resourceGet("canonical-user", "/api/resource/apps"),
    ).resolves.toEqual({
      ok: true,
      status: 200,
      body: { error: "not-json" },
    });
    expect(mocks.logPortalUpstreamFailure).not.toHaveBeenCalled();
  });

  it("preserves an ordinary upstream 4xx response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('{"error":"not_found"}', { status: 404 }),
    );

    await expect(
      resourceGet("canonical-user", "/api/resource/apps"),
    ).resolves.toEqual({
      ok: false,
      status: 404,
      body: { error: "not_found" },
    });
    expect(mocks.logPortalUpstreamFailure).not.toHaveBeenCalled();
  });

  it("binds direct tool execution identity, idempotency, and payment", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ commands: [] }));

    await toolCall(
      "canonical-user",
      "thread-1",
      {
        tool_id: "swap",
        arguments: { amount: 1 },
        app: "public-swap",
        application_id: 42,
        platform: "community",
        skills: ["swap"],
      },
      "call-1",
      "payment-1",
    );

    const request = fetch.mock.calls[0]![0] as URL;
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(request.toString()).toBe(
      "https://api.example.test/api/exec/tool-call?app=public-swap&application_id=42&platform=community",
    );
    const headers = new Headers(init.headers);
    expect(headers.get("idempotency-key")).toBe("call-1");
    expect(headers.get("payment-signature")).toBe("payment-1");
    expect(headers.get("x-thread-id")).toBe("thread-1");
    expect(JSON.parse(init.body as string)).toMatchObject({
      app: "public-swap",
      application_id: 42,
      platform: "community",
      public_pipeline: true,
      skills: ["swap"],
    });
  });

  it("binds run execution to the same identity and caller key", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ value: null, steps: [] }));

    await execRun(
      "canonical-user",
      "thread-2",
      { program: "return value", app: "default", skills: [] },
      "run-1",
    );

    const request = fetch.mock.calls[0]![0] as URL;
    const init = fetch.mock.calls[0]![1] as RequestInit;
    expect(request.toString()).toBe(
      "https://api.example.test/api/exec/run?app=default",
    );
    expect(new Headers(init.headers).get("idempotency-key")).toBe("run-1");
    expect(JSON.parse(init.body as string)).toMatchObject({
      app: "default",
      public_pipeline: true,
    });
  });

  it("preserves upstream x402 challenge and settlement metadata", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { error: "payment required" },
        {
          status: 402,
          headers: {
            "payment-required": "challenge",
            "payment-response": "settlement",
            "payment-receipt": "receipt",
          },
        },
      ),
    );

    await expect(
      execRun(
        "canonical-user",
        "thread-2",
        { program: "return value", app: "default", skills: [] },
        "run-payment",
      ),
    ).resolves.toEqual({
      ok: false,
      status: 402,
      body: { error: "payment required" },
      payment: {
        required: "challenge",
        response: "settlement",
        receipt: "receipt",
      },
    });
  });
});
