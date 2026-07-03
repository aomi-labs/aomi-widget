import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import {
  clearDeviceAuthGrantsForTests,
  exchangeDeviceAuthGrant,
  issueDeviceAuthGrant,
} from "./device-auth-grants";

describe("device auth grants", () => {
  afterEach(() => {
    clearDeviceAuthGrantsForTests();
  });

  it("exchanges a valid grant once", () => {
    const verifier = "verifier-123";
    const grant = issueDeviceAuthGrant({
      state: "state_1234567890",
      codeChallenge: sha256Base64Url(verifier),
      redirectUri: "http://127.0.0.1:49152/callback",
      sessionToken: "session-token",
      expiresAt: "2031-01-01T00:00:00.000Z",
      betterAuthUserId: "better-auth-user",
      provider: "privy",
    });

    expect(
      exchangeDeviceAuthGrant({
        code: grant.code,
        state: "state_1234567890",
        codeVerifier: verifier,
        redirectUri: "http://127.0.0.1:49152/callback",
      }),
    ).toMatchObject({
      sessionToken: "session-token",
      betterAuthUserId: "better-auth-user",
      provider: "privy",
    });
    expect(
      exchangeDeviceAuthGrant({
        code: grant.code,
        state: "state_1234567890",
        codeVerifier: verifier,
        redirectUri: "http://127.0.0.1:49152/callback",
      }),
    ).toBeNull();
  });

  it("rejects non-loopback redirects", () => {
    expect(() =>
      issueDeviceAuthGrant({
        state: "state_1234567890",
        codeChallenge: sha256Base64Url("verifier"),
        redirectUri: "https://example.com/callback",
        sessionToken: "session-token",
        expiresAt: null,
      }),
    ).toThrow("invalid_redirect_uri");
  });
});

function sha256Base64Url(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}
