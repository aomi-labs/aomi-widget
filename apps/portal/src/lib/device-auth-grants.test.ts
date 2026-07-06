import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import {
  clearDeviceAuthGrantsForTests,
  exchangeDeviceAuthGrant,
  issueDeviceAuthGrant,
  issueDeviceAuthLinkGrant,
  issueDeviceAuthLinkIntent,
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

  it("rejects loopback redirects outside the CLI callback path", () => {
    expect(() =>
      issueDeviceAuthGrant({
        state: "state_1234567890",
        codeChallenge: sha256Base64Url("verifier"),
        redirectUri: "http://127.0.0.1:49152/not-callback",
        sessionToken: "session-token",
        expiresAt: null,
      }),
    ).toThrow("invalid_redirect_uri");
  });

  it("accepts localhost CLI callback redirects", () => {
    const grant = issueDeviceAuthGrant({
      state: "state_1234567890",
      codeChallenge: sha256Base64Url("verifier"),
      redirectUri: "http://localhost:49152/callback",
      sessionToken: "session-token",
      expiresAt: null,
    });

    expect(grant.redirectUri).toBe("http://localhost:49152/callback");
  });

  it("exchanges a provider link grant only after matching the PKCE verifier", () => {
    const verifier = "verifier-123";
    const intent = issueDeviceAuthLinkIntent({
      state: "state_1234567890",
      codeChallenge: sha256Base64Url(verifier),
      redirectUri: "http://127.0.0.1:49152/callback",
      betterAuthUserId: "better-auth-user",
      provider: "privy",
    });
    const credential = {
      provider: "privy",
      tokenKind: "identity_token",
      providerToken: "provider-token",
    };
    const grant = issueDeviceAuthLinkGrant({
      linkIntent: intent.id,
      state: "state_1234567890",
      redirectUri: "http://127.0.0.1:49152/callback",
      provider: "privy",
      credential,
    });

    expect(
      exchangeDeviceAuthGrant({
        code: grant.code,
        state: "state_1234567890",
        codeVerifier: verifier,
        redirectUri: "http://127.0.0.1:49152/callback",
      }),
    ).toMatchObject({
      purpose: "link",
      betterAuthUserId: "better-auth-user",
      provider: "privy",
      credential,
    });
  });
});

function sha256Base64Url(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}
