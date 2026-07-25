// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeploymentClient } from "../src/client";

function client() {
  return new DeploymentClient({
    aomi: { backendUrl: "https://api.test", activationToken: "t" },
  });
}

describe("DeploymentClient bots", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lists bots for an owned source", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          bot_registrations: [
            {
              id: "b1",
              platform: "telegram",
              status: "active",
              label: null,
              default_app: "binance",
              platform_bot_id: "123",
              platform_username: "mybot",
              webhook_url: "https://x/y",
              thread_mode: "single",
              created_at: 1,
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchImpl);

    const bots = await client().listUserSourceBots({
      githubUserId: "gh-1",
      platform: "community",
      appSourceId: 42,
    });

    expect(bots[0].platformUsername).toBe("mybot");
    expect(bots[0].defaultApp).toBe("binance");
    expect(fetchImpl.mock.calls[0][0]).toContain(
      "/api/integrations/github-app/user/sources/42/bots?",
    );
  });

  it("never surfaces a credential field", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          bot_registration: {
            id: "b1",
            platform: "telegram",
            status: "active",
            default_app: "binance",
            platform_bot_id: "1",
            thread_mode: "single",
            created_at: 1,
            credential_ciphertext: "LEAK",
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchImpl);

    const bot = await client().createUserSourceBot({
      githubUserId: "gh-1",
      platform: "community",
      appSourceId: 42,
      applicationId: 7,
      botPlatform: "telegram",
      credential: "tok",
    } as never);
    expect(JSON.stringify(bot)).not.toContain("LEAK");
  });
});
