import { describe, expect, it, vi } from "vitest";
import { fetchReleaseSecretSlots } from "../src/bff/release-manifest";

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
});
