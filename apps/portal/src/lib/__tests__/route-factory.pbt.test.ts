import { afterEach, describe, expect, it, vi } from "vitest";

import { handleDeploy } from "../route-factory";

vi.mock("@aomi-labs/account", () => ({
  portalService: () => ({
    mint: vi.fn(async () => ({
      accessToken: "service-token",
      expiresAt: Date.now() + 300_000,
    })),
  }),
}));

describe("handleDeploy — Property 9: BFF maps backend error status codes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("propagates BackendRequestError status codes (400-599)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ source: { id: 123 } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: "deploy rejected" }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const POST = handleDeploy(false);
    const req = new Request("http://localhost:3000/api/onboard/deploy", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        installationId: "123456789",
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body).toEqual({ error: "deploy rejected" });
  });

  it("return 502 for non-BackendRequestError exceptions", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const POST = handleDeploy(false);
    const req = new Request("http://localhost:3000/api/onboard/deploy", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        installationId: "123456789",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
  });
});
