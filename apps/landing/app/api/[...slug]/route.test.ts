import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type RouteContext = { params: Promise<{ slug?: string[] }> };

function context(slug: string[]): RouteContext {
  return { params: Promise.resolve({ slug }) };
}

function request(
  path: string,
  init: ConstructorParameters<typeof NextRequest>[1] = {},
): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, init);
}

async function loadRoute() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }),
  );

  return import("./route");
}

describe("Landing backend proxy route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env.AOMI_PROXY_BACKEND_URL = "https://backend.example";
  });

  it("forwards current thread collection routes used by the SDK", async () => {
    const { GET } = await loadRoute();

    const response = await GET(request("/api/threads"), context(["threads"]));

    expect(response.status).toBe(200);
    const [target] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(target)).toBe("https://backend.example/api/threads");
  });

  it("forwards current thread app routes used by the SDK", async () => {
    const { GET } = await loadRoute();

    const response = await GET(
      request("/api/thread/apps"),
      context(["thread", "apps"]),
    );

    expect(response.status).toBe(200);
    const [target] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(target)).toBe("https://backend.example/api/thread/apps");
  });

  it("rewrites legacy session routes to current backend thread routes", async () => {
    const { PATCH } = await loadRoute();

    const response = await PATCH(
      request("/api/sessions/thread-1", { method: "PATCH" }),
      context(["sessions", "thread-1"]),
    );

    expect(response.status).toBe(200);
    const [target] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(target)).toBe("https://backend.example/api/threads/thread-1");
  });

  it("rewrites legacy session app routes to current backend thread app routes", async () => {
    const { GET } = await loadRoute();

    const response = await GET(
      request("/api/session/models"),
      context(["session", "models"]),
    );

    expect(response.status).toBe(200);
    const [target] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(target)).toBe("https://backend.example/api/thread/models");
  });
});
