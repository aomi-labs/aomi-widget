// @vitest-environment node

import { describe, expect, it } from "vitest";
import { resolveLandingAomiPortalUrl } from "./aomi-portal-url";

describe("resolveLandingAomiPortalUrl", () => {
  it("pairs an Aomi Landing preview with the same Portal branch preview", () => {
    expect(
      resolveLandingAomiPortalUrl({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        VERCEL_BRANCH_URL:
          "landing-page-git-codex-auth-fix-aomi-labs.vercel.app",
      }),
    ).toBe("https://chat-portal-git-codex-auth-fix-aomi-labs.vercel.app");
  });

  it("keeps an explicit Portal URL as the deployment override", () => {
    expect(
      resolveLandingAomiPortalUrl({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        VERCEL_BRANCH_URL:
          "landing-page-git-codex-auth-fix-aomi-labs.vercel.app",
        NEXT_PUBLIC_AOMI_PORTAL_URL: "https://custom-chat.example.com/",
      }),
    ).toBe("https://custom-chat.example.com");
  });

  it("does not derive a Portal host from an unrelated Vercel project", () => {
    expect(
      resolveLandingAomiPortalUrl({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        VERCEL_BRANCH_URL: "customer-app-git-main-aomi-labs.vercel.app",
      }),
    ).toBe("https://chat.aomi.dev");
  });

  it("uses the canonical production and local Portal URLs", () => {
    expect(resolveLandingAomiPortalUrl({ NODE_ENV: "production" })).toBe(
      "https://chat.aomi.dev",
    );
    expect(resolveLandingAomiPortalUrl({ NODE_ENV: "development" })).toBe(
      "http://localhost:3000",
    );
  });
});
