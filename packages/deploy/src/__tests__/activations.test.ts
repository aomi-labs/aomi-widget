// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeploymentClient } from "../client";

let client: DeploymentClient;

beforeEach(() => {
  client = new DeploymentClient({
    aomi: {
      backendUrl: "https://staging-api.example.com",
      activationToken: "act-token",
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listActivations", () => {
  it("maps snake_case activations to camelCase", async () => {
    const payload = {
      ok: true,
      app: "my-bot",
      current_release_tag: "apps-1-r0123abcdef-my-bot-bbbbbbbbbbbb",
      activations: [
        {
          deployment_id: "dep_1_r0123abcdef_bbbbbbbbbbbb",
          release_tag: "apps-1-r0123abcdef-my-bot-bbbbbbbbbbbb",
          action: "rollback",
          actor: "cecilia",
          created_at: "2025-06-15T15:06:40Z",
          current: true,
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await client.listActivations({
      platform: "community",
      app: "my-bot",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain(
      "/api/platforms/community/apps/my-bot/activations",
    );
    expect(result.app).toBe("my-bot");
    expect(result.currentReleaseTag).toBe(
      "apps-1-r0123abcdef-my-bot-bbbbbbbbbbbb",
    );
    expect(result.activations[0]).toEqual({
      deploymentId: "dep_1_r0123abcdef_bbbbbbbbbbbb",
      releaseTag: "apps-1-r0123abcdef-my-bot-bbbbbbbbbbbb",
      action: "rollback",
      actor: "cecilia",
      createdAt: 1750000000,
      current: true,
    });
  });
});
