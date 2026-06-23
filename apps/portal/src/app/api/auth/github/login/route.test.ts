// @vitest-environment node
import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GitHub login route", () => {
  it("uses the staging build-app client id outside production", async () => {
    const res = await GET(new Request("http://localhost:3000/api/auth/github/login"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("https://github.com/login/oauth/authorize");
    expect(location).toContain("client_id=Iv23liYCfZYr4JhvfwgN");
    expect(location).toContain(
      encodeURIComponent("http://localhost:3000/api/auth/github/callback"),
    );
  });

  it("uses the production build-app client id on the production host", async () => {
    const res = await GET(new Request("https://portal.aomi.dev/api/auth/github/login"));
    expect(res.headers.get("location")).toContain("client_id=Iv23liMWx5sEbC2mMRBu");
  });
});
