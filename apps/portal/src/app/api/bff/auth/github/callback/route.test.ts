// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { GET } from "./route";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => undefined,
  })),
}));

describe("GitHub callback route", () => {
  it("redirects callback failures back to settings with the launch marker", async () => {
    const res = await GET(
      new Request("http://localhost:3000/api/bff/auth/github/callback?code=x&state=y"),
    );
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname).toBe("/settings");
    expect(location.searchParams.get("launch")).toBe("github");
    expect(location.searchParams.get("github_error")).toBe("invalid_oauth_state");
  });
});
