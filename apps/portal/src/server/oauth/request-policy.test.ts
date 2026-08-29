import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enforceAomiOAuthRequestPolicy } from "./request-policy";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "postgres://test.invalid/aomi");
  vi.stubEnv("BETTER_AUTH_URL", "https://portal.example");
});

afterEach(() => vi.unstubAllEnvs());

describe("OAuth request policy", () => {
  it("requires exactly one exact resource and matching scopes", async () => {
    const authorize = (query: string) =>
      enforceAomiOAuthRequestPolicy(
        new Request(
          `https://portal.example/api/auth/oauth2/authorize?${query}`,
        ),
      );
    await expect(
      authorize(
        new URLSearchParams({
          resource: "https://portal.example/v1/agent",
          scope: "agent:read",
        }).toString(),
      ),
    ).resolves.toBeNull();
    await expect(authorize("scope=agent%3Aread")).resolves.toMatchObject({
      status: 400,
    });
    const multiple = new URLSearchParams({ scope: "agent:read" });
    multiple.append("resource", "https://portal.example/v1/agent");
    multiple.append("resource", "https://portal.example/v1/agent/mcp");
    await expect(authorize(multiple.toString())).resolves.toMatchObject({
      status: 400,
    });
    await expect(
      authorize(
        new URLSearchParams({
          resource: "https://portal.example/v1/agent",
          scope: "pipeline:execute",
        }).toString(),
      ),
    ).resolves.toMatchObject({ status: 400 });
  });

  it("limits unauthenticated DCR to an exact MCP resource", async () => {
    const register = (resource: string) =>
      enforceAomiOAuthRequestPolicy(
        new Request("https://portal.example/api/auth/oauth2/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            token_endpoint_auth_method: "none",
            grant_types: ["authorization_code", "refresh_token"],
            resources: [resource],
            scope: "agent:read mcp:agent",
          }),
        }),
      );
    await expect(
      register("https://portal.example/v1/agent/mcp"),
    ).resolves.toBeNull();
    await expect(
      register(`https://portal.example/${["agent", "mcp"].join("/")}`),
    ).resolves.toMatchObject({ status: 400 });
    await expect(
      register("https://portal.example/v1/agent"),
    ).resolves.toMatchObject({ status: 400 });
  });
});
