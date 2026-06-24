// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { GET } from "./route";

vi.mock("@portal/lib/aomi-account/github-session", () => ({
  setGitHubSessionCookie: vi.fn(),
}));

describe("GitHub dev session route", () => {
  it("is not available off localhost", async () => {
    const res = await GET(
      new Request(
        "https://chat-staging.aomi.dev/api/auth/github/dev-session?login=alice",
      ),
    );
    expect(res.status).toBe(404);
  });

  it("requires a login on localhost", async () => {
    const res = await GET(
      new Request("http://localhost:3000/api/auth/github/dev-session"),
    );
    expect(res.status).toBe(400);
  });
});
