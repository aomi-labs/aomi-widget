import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchReleaseSecretSlots,
  missingSecretsForActivation,
} from "../src/bff/release-manifest";
import type { DeploymentClient } from "../src/client";

function fakeFetch(routes: Record<string, { status: number; body: unknown }>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const hit = routes[url];
    if (!hit) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(hit.body), { status: hit.status });
  }) as unknown as typeof fetch;
}

const RELEASE_URL =
  "https://api.github.com/repos/aomi-labs/community/releases/tags/v1";

describe("fetchReleaseSecretSlots", () => {
  it("returns the declared slots per app", async () => {
    const fetchImpl = fakeFetch({
      [RELEASE_URL]: {
        status: 200,
        body: { assets: [{ name: "manifest.json", url: "https://api.github.com/asset/1" }] },
      },
      "https://api.github.com/asset/1": {
        status: 200,
        body: {
          plugins: {
            binance: {
              file: "libbinance.dylib",
              sha256: "x",
              secrets: [
                { name: "BINANCE_API_KEY", description: "d", required: true },
              ],
            },
          },
        },
      },
    });

    const slots = await fetchReleaseSecretSlots({
      platformRepo: "aomi-labs/community",
      releaseTag: "v1",
      githubToken: "t",
      fetchImpl,
    });

    expect(slots.binance.map((s) => s.name)).toEqual(["BINANCE_API_KEY"]);
  });

  it("returns {} when the release has no manifest.json (older releases)", async () => {
    const fetchImpl = fakeFetch({
      [RELEASE_URL]: { status: 200, body: { assets: [] } },
    });
    await expect(
      fetchReleaseSecretSlots({
        platformRepo: "aomi-labs/community",
        releaseTag: "v1",
        githubToken: "t",
        fetchImpl,
      }),
    ).resolves.toEqual({});
  });

  it("returns {} when the release does not exist", async () => {
    const fetchImpl = fakeFetch({});
    await expect(
      fetchReleaseSecretSlots({
        platformRepo: "aomi-labs/community",
        releaseTag: "v1",
        githubToken: "t",
        fetchImpl,
      }),
    ).resolves.toEqual({});
  });

  it("returns {} when the fetch call rejects (network failure)", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    await expect(
      fetchReleaseSecretSlots({
        platformRepo: "aomi-labs/community",
        releaseTag: "v1",
        githubToken: "t",
        fetchImpl,
      }),
    ).resolves.toEqual({});
  });

  it("returns {} when the release response body is not valid JSON", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === RELEASE_URL) {
        return new Response("<html>oops</html>", { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;

    await expect(
      fetchReleaseSecretSlots({
        platformRepo: "aomi-labs/community",
        releaseTag: "v1",
        githubToken: "t",
        fetchImpl,
      }),
    ).resolves.toEqual({});
  });

  it("returns {} when the asset response body is not valid JSON", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === RELEASE_URL) {
        return new Response(
          JSON.stringify({
            assets: [{ name: "manifest.json", url: "https://api.github.com/asset/1" }],
          }),
          { status: 200 },
        );
      }
      if (url === "https://api.github.com/asset/1") {
        return new Response("<html>oops</html>", { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;

    await expect(
      fetchReleaseSecretSlots({
        platformRepo: "aomi-labs/community",
        releaseTag: "v1",
        githubToken: "t",
        fetchImpl,
      }),
    ).resolves.toEqual({});
  });
});

describe("missingSecretsForActivation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("reports only the required slots with no configured key", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === RELEASE_URL) {
        return new Response(
          JSON.stringify({
            assets: [
              { name: "manifest.json", url: "https://api.github.com/asset/1" },
            ],
          }),
          { status: 200 },
        );
      }
      if (url === "https://api.github.com/asset/1") {
        return new Response(
          JSON.stringify({
            plugins: {
              binance: {
                file: "libbinance.dylib",
                sha256: "x",
                secrets: [
                  { name: "BINANCE_API_KEY", description: "d", required: true },
                  {
                    name: "BINANCE_SECRET_KEY",
                    description: "d",
                    required: true,
                  },
                ],
              },
            },
          }),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchImpl);

    const client = {
      listAppSecrets: vi.fn(async () => ({
        byApp: { binance: ["$SECRET:APP:binance::BINANCE_API_KEY"] },
      })),
      // Production shape: `listUserSources` (the source of `input.source`)
      // deliberately returns `latest_deployment: null` — the helper must
      // resolve `platformRepo` itself via the detail endpoint.
      getUserSourceLatestDeployment: vi.fn(async () => ({
        platformRepo: "aomi-labs/community",
      })),
    } as unknown as DeploymentClient;

    const missing = await missingSecretsForActivation({
      client,
      githubUserId: "gh-1",
      platform: "community",
      githubToken: "t",
      source: {
        id: 42,
        latestDeployment: null,
      } as never,
      pairs: [{ app: "binance", releaseTag: "v1" }],
    });
    expect(missing).toEqual({ binance: ["BINANCE_SECRET_KEY"] });
    expect(client.getUserSourceLatestDeployment).toHaveBeenCalledWith({
      githubUserId: "gh-1",
      platform: "community",
      appSourceId: 42,
    });
  });

  it("never blocks activation when the platform repo is unknown", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);

    // No deployment at all for this source: the detail endpoint itself
    // returns null, so platformRepo is genuinely unknown and the helper must
    // still fail open (never block activation).
    const client = {
      listAppSecrets: vi.fn(),
      getUserSourceLatestDeployment: vi.fn(async () => null),
    } as unknown as DeploymentClient;
    const missing = await missingSecretsForActivation({
      client,
      githubUserId: "gh-1",
      platform: "community",
      githubToken: "t",
      source: { id: 42, latestDeployment: null } as never,
      pairs: [{ app: "binance", releaseTag: "v1" }],
    });
    expect(missing).toEqual({});
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(client.listAppSecrets).not.toHaveBeenCalled();
  });
});
