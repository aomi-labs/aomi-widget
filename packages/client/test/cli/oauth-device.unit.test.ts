import { describe, expect, it, vi } from "vitest";

import { refreshCliOAuthSession } from "../../src/cli/auth";
import { signInWithOAuthDevice } from "../../src/cli/oauth-device";

describe("CLI OAuth device bridge", () => {
  it("registers, opens verification, tolerates pending, and stores only public tokens", async () => {
    const responses = [
      Response.json(
        { clientId: "cli_client", redirectUris: [] },
        { status: 201 },
      ),
      Response.json({
        device_code: "device_code",
        user_code: "ABCD-EFGH",
        verification_uri: "https://chat.aomi.dev/connect/device",
        verification_uri_complete:
          "https://chat.aomi.dev/connect/device?user_code=ABCD-EFGH",
        expires_in: 900,
        interval: 1,
      }),
      Response.json({ error: "authorization_pending" }, { status: 400 }),
      Response.json({
        access_token: "aomi_at_access",
        refresh_token: "aomi_rt_refresh",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "agent offline_access",
      }),
    ];
    const fetcher = vi.fn(async () => responses.shift()!);
    const openBrowser = vi.fn();
    let now = 1_000;

    const result = await signInWithOAuthDevice({
      baseUrl: "https://chat.aomi.dev",
      fetch: fetcher as typeof fetch,
      openBrowser,
      now: () => now,
      wait: async (ms) => {
        now += ms;
      },
    });

    expect(openBrowser).toHaveBeenCalledWith(
      "https://chat.aomi.dev/connect/device?user_code=ABCD-EFGH",
    );
    expect(result.auth).toEqual({
      sessionToken: "aomi_at_access",
      oauthRefreshToken: "aomi_rt_refresh",
      oauthClientId: "cli_client",
      expiresAt: 3_603_000,
    });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("rotates and replaces the persisted refresh credential", async () => {
    const refreshed = await refreshCliOAuthSession({
      baseUrl: "https://chat.aomi.dev",
      auth: {
        sessionToken: "aomi_at_old",
        oauthRefreshToken: "aomi_rt_old",
        oauthClientId: "cli_client",
        expiresAt: 1,
      },
      now: () => 2_000,
      fetch: vi.fn(async () =>
        Response.json({
          access_token: "aomi_at_next",
          refresh_token: "aomi_rt_next",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "agent offline_access",
        }),
      ) as typeof fetch,
    });
    expect(refreshed).toMatchObject({
      sessionToken: "aomi_at_next",
      oauthRefreshToken: "aomi_rt_next",
      expiresAt: 3_602_000,
    });
  });
});
