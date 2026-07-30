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

import { resourceGet } from "./backend";

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
      routeFamily: "/api/mcp",
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
});
