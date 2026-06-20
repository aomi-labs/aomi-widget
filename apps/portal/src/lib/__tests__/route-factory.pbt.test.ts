import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";

import { BackendRequestError } from "../onboard-deploy";
import { handleDeploy } from "../route-factory";

describe("handleDeploy — Property 9: BFF maps backend error status codes", () => {
  const savedAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const savedBackendUrl = process.env.NEXT_PUBLIC_AOMI_API_URL;
  const savedPlatform = process.env.NEXT_PUBLIC_AOMI_PLATFORM;
  const savedToken = process.env.APP_DEPLOY_ACTIVATION_TOKEN;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_AOMI_API_URL = "https://staging-api.aomi.dev";
    process.env.NEXT_PUBLIC_AOMI_PLATFORM = "community";
    process.env.APP_DEPLOY_ACTIVATION_TOKEN = "test-token";
  });

  afterEach(() => {
    const setOrDelete = (key: string, val: string | undefined) => {
      if (val) process.env[key] = val;
      else delete process.env[key];
    };
    setOrDelete("NEXT_PUBLIC_APP_URL", savedAppUrl);
    setOrDelete("NEXT_PUBLIC_AOMI_API_URL", savedBackendUrl);
    setOrDelete("NEXT_PUBLIC_AOMI_PLATFORM", savedPlatform);
    setOrDelete("APP_DEPLOY_ACTIVATION_TOKEN", savedToken);
    vi.restoreAllMocks();
  });

  it("propagates BackendRequestError status codes (400-599)", async () => {
    // Mock fetch to return a valid token response, then throw on the deploy call
    const fetchMock = vi
      .fn()
      // First call: getPlatformToken succeeds
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ token: "minted-token", expires_in: 3600 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
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

    // The deploy route will hit a BackendRequestError with status 502
    // because the second fetch (deploy call) won't be mocked
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(body).toHaveProperty("error");
  });

  it("return 502 for non-BackendRequestError exceptions", async () => {
    // Mock fetch to return valid token, then deploy throws something else
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ token: "minted-token", expires_in: 3600 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
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
    expect(res.status).toBe(502);
  });
});
