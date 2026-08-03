// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./bearer", () => ({ mintAccountBearer: vi.fn() }));

import { mintAccountBearer } from "./bearer";
import { createBackendProxy, type AllowedRoute } from "./proxy";

const mintMock = vi.mocked(mintAccountBearer);
type NextRequestInit = ConstructorParameters<typeof NextRequest>[1];

function proxyRequest(path: string, init?: NextRequestInit) {
  const url = new URL(`https://portal.aomi.dev${path}`);
  const slug = url.pathname
    .replace(/^\/api\/?/, "")
    .split("/")
    .filter(Boolean);
  return [
    new NextRequest(url, init),
    { params: Promise.resolve({ slug }) },
  ] as const;
}

function createTestProxy(options: {
  allowedRoutes: ReadonlyArray<AllowedRoute>;
  resolveCanonicalUserId: () => Promise<string | null>;
}) {
  return createBackendProxy({
    allowedRoutes: options.allowedRoutes,
    upstreamBaseUrl: "https://backend.aomi.dev",
    resolveCanonicalUserId: options.resolveCanonicalUserId,
  });
}

describe("createBackendProxy auth handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fails closed when a session resolves but bearer minting fails", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mintMock.mockRejectedValue(new Error("signing key missing"));
    const { GET } = createTestProxy({
      allowedRoutes: [
        {
          pattern: /^\/api\/account$/,
          methods: new Set(["GET"]),
        },
      ],
      resolveCanonicalUserId: async () => "user-123",
    });

    const response = await GET(...proxyRequest("/api/account"));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Account bearer mint failed",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still forwards explicitly public routes anonymously", async () => {
    const fetchMock = vi.fn(async (_input: URL, _init?: RequestInit) =>
      Response.json({ ok: true }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = createTestProxy({
      allowedRoutes: [
        {
          pattern: /^\/api\/thread\/state$/,
          methods: new Set(["GET"]),
          auth: "optional",
        },
      ],
      resolveCanonicalUserId: async () => null,
    });

    const response = await GET(
      ...proxyRequest("/api/thread/state", {
        headers: {
          authorization: "Bearer user-supplied",
          cookie: "better-auth.session_token=session",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1];
    if (!init) throw new Error("Expected upstream fetch init");
    const headers = new Headers(init.headers);
    expect(headers.has("authorization")).toBe(false);
    expect(headers.has("cookie")).toBe(false);
  });

  it("rejects protected routes instead of forwarding without Authorization", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = createTestProxy({
      allowedRoutes: [
        {
          pattern: /^\/api\/account$/,
          methods: new Set(["GET"]),
        },
      ],
      resolveCanonicalUserId: async () => null,
    });

    const response = await GET(...proxyRequest("/api/account"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
