import type { ReleaseManifest, SecretSlot } from "../types";

const GITHUB_API = "https://api.github.com";

type ReleaseAsset = { name: string; url: string };

/**
 * Read the declared secret slots out of a release's `manifest.json` asset.
 *
 * Returns `{}` for any release that predates `aomi-build compile` writing the
 * slots, so activation of an older release is never blocked by their absence.
 */
export async function fetchReleaseSecretSlots(input: {
  platformRepo: string;
  releaseTag: string;
  githubToken: string;
  fetchImpl?: typeof fetch;
}): Promise<Record<string, SecretSlot[]>> {
  const doFetch = input.fetchImpl ?? fetch;
  const headers = {
    authorization: `Bearer ${input.githubToken}`,
    "x-github-api-version": "2022-11-28",
  };

  // Any failure below — a rejected fetch (network/DNS/timeout/abort) or a
  // response body that doesn't parse as JSON (even on a 200) — must degrade
  // to `{}` rather than throw. An old or unreachable release must never
  // block an activation.
  try {
    const releaseUrl = `${GITHUB_API}/repos/${input.platformRepo}/releases/tags/${encodeURIComponent(input.releaseTag)}`;
    const releaseRes = await doFetch(releaseUrl, {
      headers: { ...headers, accept: "application/vnd.github+json" },
    });
    if (!releaseRes.ok) return {};

    const release = (await releaseRes.json()) as { assets?: ReleaseAsset[] };
    const asset = release.assets?.find((a) => a.name === "manifest.json");
    if (!asset) return {};

    // The asset `url` (not browser_download_url) honours the bearer token, so
    // this works for private platform repos too.
    const assetRes = await doFetch(asset.url, {
      headers: { ...headers, accept: "application/octet-stream" },
    });
    if (!assetRes.ok) return {};

    const manifest = (await assetRes.json()) as ReleaseManifest;
    const slots: Record<string, SecretSlot[]> = {};
    for (const [app, plugin] of Object.entries(manifest.plugins ?? {})) {
      slots[app] = plugin.secrets ?? [];
    }
    return slots;
  } catch {
    return {};
  }
}
