// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const accountMocks = vi.hoisted(() => ({
  createWidgetSiweChallenge: vi.fn(),
  verifyWidgetSiweProof: vi.fn(),
}));

vi.mock("@aomi-labs/account/widget-auth", () => ({
  ...accountMocks,
  WidgetAuthError: class WidgetAuthError extends Error {},
  observedWidgetOrigin: (request: Request) =>
    request.headers.get("origin") ?? null,
}));

import { OPTIONS as nonceOptions, POST as noncePost } from "./nonce/route";
import { POST as verifyPost } from "./verify/route";

const origin = "https://customer.example";

function request(path: string, body?: unknown): NextRequest {
  return new NextRequest(`https://chat.aomi.dev${path}`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("widget SIWE routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a wire-format challenge with credential-free CORS", async () => {
    accountMocks.createWidgetSiweChallenge.mockResolvedValue({
      nonce: "nonce-1",
      domain: "customer.example",
      uri: origin,
      issuedAt: "2026-07-15T00:00:00.000Z",
      expirationTime: "2026-07-15T00:05:00.000Z",
    });

    const response = await noncePost(
      request("/api/widget/auth/siwe/nonce", {
        wallet_address: "0x1111111111111111111111111111111111111111",
        chain_id: 1,
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      nonce: "nonce-1",
      issued_at: "2026-07-15T00:00:00.000Z",
      expiration_time: "2026-07-15T00:05:00.000Z",
    });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBeNull();
  });

  it("returns an opaque widget session without exposing an AccountBearer", async () => {
    accountMocks.verifyWidgetSiweProof.mockResolvedValue({
      token: "aomi_wst_secret",
      tokenType: "Bearer",
      expiresAt: 1_773_187_800,
      userId: "user-1",
    });

    const response = await verifyPost(
      request("/api/widget/auth/siwe/verify", {
        message: "signed message",
        signature: "0xsigned",
        wallet_address: "0x1111111111111111111111111111111111111111",
        chain_id: 1,
      }),
    );

    await expect(response.json()).resolves.toEqual({
      access_token: "aomi_wst_secret",
      token_type: "Bearer",
      expires_at: 1_773_187_800,
      user_id: "user-1",
    });
  });

  it("allows only the nonce route's declared preflight methods", () => {
    const response = nonceOptions(
      new NextRequest("https://chat.aomi.dev/api/widget/auth/siwe/nonce", {
        method: "OPTIONS",
        headers: { Origin: origin },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "POST, OPTIONS",
    );
  });
});
