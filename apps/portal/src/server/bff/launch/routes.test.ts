// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { launchDeployRoute, launchStatusRoute } from "./routes";

vi.mock("@aomi-labs/account", () => ({
  portalService: () => ({
    mint: vi.fn(async () => ({
      accessToken: "service-token",
      expiresAt: Date.now() + 300_000,
    })),
  }),
}));

describe("launchDeployRoute", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("propagates BackendError status codes (400-599)", async () => {
    // Deploy is a single backend call now — by appSourceId, no resolve step.
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "deploy rejected" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const POST = launchDeployRoute(false);
    const req = new Request("http://localhost:3000/api/launch/deploy", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ appSourceId: 123 }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(res.status).toBe(409);
    expect(body).toEqual({ error: "deploy rejected" });
  });

  it("rejects a missing appSourceId before calling the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const POST = launchDeployRoute(false);
    const req = new Request("http://localhost:3000/api/launch/deploy", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ installationId: "123456789" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 502 for non-BackendError exceptions", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const POST = launchDeployRoute(false);
    const req = new Request("http://localhost:3000/api/launch/deploy", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ appSourceId: 123 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
  });
});

describe("launchStatusRoute", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("propagates backend 404 instead of masking deployment status as pending", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "deployment not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await launchStatusRoute(
      new Request(
        "http://localhost:3000/api/launch/status?deploymentId=dep_141780080_r2849901c35_af4f107b0331",
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: "deployment not found" });
  });
});
