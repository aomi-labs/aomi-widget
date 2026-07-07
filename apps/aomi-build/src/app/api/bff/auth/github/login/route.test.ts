// @vitest-environment node
import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GitHub login route", () => {
  it("uses the staging one-shot-app client id outside production", async () => {
    const res = await GET(new Request("http://localhost:3000/api/bff/auth/github/login"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("https://github.com/login/oauth/authorize");
    expect(location).toContain("client_id=Iv23lilgvJz13pJekLSZ");
    expect(location).toContain(
      encodeURIComponent("http://localhost:3000/api/bff/auth/github/callback"),
    );
  });

  it("uses the production one-shot-app client id on the production host", async () => {
    const res = await GET(new Request("https://build.aomi.dev/api/bff/auth/github/login"));
    expect(res.headers.get("location")).toContain("client_id=Iv23li4wPpAfoGOJ6v0Q");
  });
});
