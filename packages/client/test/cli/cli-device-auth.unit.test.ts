import { describe, expect, it, vi } from "vitest";

import {
  buildDeviceAuthUrl,
  getDeviceProviderCredential,
  signInWithDeviceProvider,
} from "../../src/cli/device-auth";

describe("CLI device provider auth", () => {
  it("builds the provider auth URL with PKCE and loopback redirect", () => {
    const url = buildDeviceAuthUrl({
      portalUrl: "https://chat.aomi.dev",
      state: "state-123",
      codeChallenge: "challenge-123",
      redirectUri: "http://127.0.0.1:12345/callback",
      provider: "privy",
    });

    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://chat.aomi.dev");
    expect(parsed.pathname).toBe("/device-auth");
    expect(parsed.searchParams.get("state")).toBe("state-123");
    expect(parsed.searchParams.get("code_challenge")).toBe("challenge-123");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "http://127.0.0.1:12345/callback",
    );
    expect(parsed.searchParams.get("provider")).toBe("privy");
  });

  it("builds provider link URLs with link mode", () => {
    const url = buildDeviceAuthUrl({
      portalUrl: "https://chat.aomi.dev",
      state: "state-123",
      codeChallenge: "challenge-123",
      redirectUri: "http://127.0.0.1:12345/callback",
      provider: "para",
      mode: "link",
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get("provider")).toBe("para");
    expect(parsed.searchParams.get("mode")).toBe("link");
  });

  it("exchanges a loopback callback code for a BetterAuth session", async () => {
    const originalFetch = globalThis.fetch;
    const exchangeFetch = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        const target = String(url);
        if (target.startsWith("http://127.0.0.1:")) {
          return originalFetch(url, init);
        }
        if (target === "https://chat.aomi.dev/api/aomi/device-auth/exchange") {
          const body = JSON.parse(String(init?.body));
          expect(body.code).toBe("grant-code");
          expect(body.state).toMatch(/^[A-Za-z0-9_-]+$/);
          expect(body.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
          expect(body.redirectUri).toMatch(
            /^http:\/\/127\.0\.0\.1:\d+\/callback$/,
          );
          return Response.json({
            sessionToken: "better-auth-session",
            expiresAt: "2032-03-04T05:06:07.000Z",
            betterAuthUserId: "ba-user",
            provider: "para",
          });
        }
        if (target === "https://chat.aomi.dev/api/aomi/account") {
          expect(new Headers(init?.headers).get("Authorization")).toBe(
            "Bearer better-auth-session",
          );
          return Response.json({
            session: {
              betterAuthUserId: "ba-user",
              expiresAt: "2032-03-04T05:06:07.000Z",
            },
          });
        }
        throw new Error(`unexpected fetch: ${target}`);
      },
    );
    vi.stubGlobal("fetch", exchangeFetch);

    try {
      const result = await signInWithDeviceProvider({
        baseUrl: "https://chat.aomi.dev",
        provider: "para",
        openBrowser: async (url) => {
          const parsed = new URL(url);
          expect(parsed.searchParams.get("provider")).toBe("para");
          const redirectUri = parsed.searchParams.get("redirect_uri");
          const state = parsed.searchParams.get("state");
          expect(redirectUri).toBeTruthy();
          expect(state).toBeTruthy();
          await originalFetch(
            `${redirectUri}?code=grant-code&state=${encodeURIComponent(
              state ?? "",
            )}`,
          );
        },
        timeoutMs: 5_000,
      });

      expect(result.provider).toBe("para");
      expect(result.auth).toEqual({
        sessionToken: "better-auth-session",
        expiresAt: Date.parse("2032-03-04T05:06:07.000Z"),
        betterAuthUserId: "ba-user",
      });
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("receives provider credentials over the loopback callback for account linking", async () => {
    const originalFetch = globalThis.fetch;
    try {
      const result = await getDeviceProviderCredential({
        baseUrl: "https://chat.aomi.dev",
        provider: "privy",
        openBrowser: async (url) => {
          const parsed = new URL(url);
          expect(parsed.searchParams.get("provider")).toBe("privy");
          expect(parsed.searchParams.get("mode")).toBe("link");
          const redirectUri = parsed.searchParams.get("redirect_uri");
          const state = parsed.searchParams.get("state");
          expect(redirectUri).toBeTruthy();
          expect(state).toBeTruthy();
          const form = new URLSearchParams({
            state: state ?? "",
            provider: "privy",
            credential: JSON.stringify({
              provider: "privy",
              tokenKind: "identity_token",
              providerToken: "provider-token",
            }),
          });
          await originalFetch(redirectUri!, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: form.toString(),
          });
        },
        timeoutMs: 5_000,
      });

      expect(result).toEqual({
        provider: "privy",
        credential: {
          provider: "privy",
          tokenKind: "identity_token",
          providerToken: "provider-token",
        },
      });
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });
});
