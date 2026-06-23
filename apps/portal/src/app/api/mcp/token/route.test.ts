import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mintAccountBearer } from "@aomi-labs/account";
import { getSessionedCanonicalId } from "@portal/lib/aomi-account/session";

import { GET } from "./route";

vi.mock("@aomi-labs/account", () => ({
  mintAccountBearer: vi.fn(),
}));

vi.mock("@portal/lib/aomi-account/session", () => ({
  getSessionedCanonicalId: vi.fn(),
}));

const mintAccountBearerMock = vi.mocked(mintAccountBearer);
const getSessionedCanonicalIdMock = vi.mocked(getSessionedCanonicalId);

function request(): NextRequest {
  return new NextRequest("http://localhost/api/mcp/token");
}

describe("GET /api/mcp/token", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("rejects requests without a portal session", async () => {
    getSessionedCanonicalIdMock.mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Portal session required",
    });
    expect(mintAccountBearerMock).not.toHaveBeenCalled();
  });

  it("mints a user bearer for the session canonical id", async () => {
    getSessionedCanonicalIdMock.mockResolvedValue("user-1");
    mintAccountBearerMock.mockResolvedValue({
      accessToken: "signed-bearer",
      expiresAt: 123,
    });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(mintAccountBearerMock).toHaveBeenCalledWith("user-1");
    await expect(response.json()).resolves.toEqual({
      access_token: "signed-bearer",
      token_type: "Bearer",
      expires_at: 123,
      user_id: "user-1",
    });
  });

  it("returns unavailable when bearer minting is misconfigured", async () => {
    getSessionedCanonicalIdMock.mockResolvedValue("user-1");
    mintAccountBearerMock.mockRejectedValue(new Error("missing signing key"));

    const response = await GET(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Could not mint MCP bearer",
    });
  });
});
