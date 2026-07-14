// @vitest-environment node

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

function request(input: {
  origin?: string;
  method?: string;
  requestHeaders?: string;
}): NextRequest {
  const headers = new Headers();
  if (input.origin) headers.set("Origin", input.origin);
  if (input.requestHeaders) {
    headers.set("Access-Control-Request-Headers", input.requestHeaders);
  }
  return new NextRequest("http://127.0.0.1:3000/api/aomi/account", {
    method: input.method ?? "GET",
    headers,
  });
}

describe("Portal cross-origin API policy", () => {
  it("allows the hosted Landing origin with credentials", () => {
    const response = proxy(request({ origin: "https://aomi.dev" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://aomi.dev",
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
      "true",
    );
    expect(response.headers.get("Vary")).toContain("Origin");
  });

  it("allows first-party Landing Vercel previews with credentials", () => {
    const origin =
      "https://landing-page-git-codex-auth-fix-aomi-labs.vercel.app";
    const response = proxy(request({ origin }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  });

  it("does not trust unrelated Vercel projects", async () => {
    const response = proxy(
      request({ origin: "https://attacker-git-main-aomi-labs.vercel.app" }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
  });

  it("allows the standard local Landing origin in development and test", () => {
    const response = proxy(request({ origin: "http://127.0.0.1:3001" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://127.0.0.1:3001",
    );
  });

  it("answers an allowed preflight before it reaches an API route", () => {
    const response = proxy(
      request({
        origin: "http://localhost:3001",
        method: "OPTIONS",
        requestHeaders: "content-type,x-thread-id",
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "X-Thread-Id",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "POST",
    );
  });

  it("rejects browser API calls from untrusted origins", async () => {
    const response = proxy(request({ origin: "https://evil.example" }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Origin is not allowed",
    });
    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
    expect(response.headers.get("Vary")).toContain("Origin");
  });

  it("does not interfere with server, CLI, or same-origin requests", () => {
    const response = proxy(request({}));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
  });
});
