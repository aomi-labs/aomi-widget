import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  handler: vi.fn(),
}));

vi.mock("@aomi-labs/account/better-auth", () => ({
  auth: {
    api: { getSession: mocks.getSession },
    handler: mocks.handler,
  },
  aomiOAuthResources: () => ({
    portalOrigin: "https://portal.example",
  }),
  guestScopesForAomiResource: (_resource: string, scopes: string[]) => scopes,
}));
vi.mock("@portal/server/oauth/cors", () => ({
  applyManagedWidgetCors: vi.fn(),
  isManagedWidgetClientOrigin: vi.fn(),
  managedWidgetPreflight: vi.fn(),
  oauthBodyClientId: vi.fn(),
  publicDiscoveryResponse: vi.fn(),
}));
vi.mock("@portal/server/oauth/request-policy", () => ({
  enforceAomiOAuthRequestPolicy: vi.fn().mockResolvedValue(null),
}));

import { POST } from "./route";

beforeEach(() => {
  mocks.getSession.mockReset();
  mocks.handler.mockReset().mockResolvedValue(Response.json({ ok: true }));
});

describe("anonymous sign-in", () => {
  it("cannot replace an existing signed-in session", async () => {
    mocks.getSession.mockResolvedValue({
      session: { id: "session-1" },
      user: { id: "user-1", isAnonymous: false },
    });

    const response = await POST(
      new Request("https://portal.example/api/auth/sign-in/anonymous", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: "session_exists",
    });
    expect(mocks.handler).not.toHaveBeenCalled();
  });

  it("creates an anonymous session only when no session exists", async () => {
    mocks.getSession.mockResolvedValue(null);
    const request = new Request(
      "https://portal.example/api/auth/sign-in/anonymous",
      { method: "POST" },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.handler).toHaveBeenCalledWith(request);
  });
});
