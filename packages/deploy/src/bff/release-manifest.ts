import type { DeploymentClient } from "../client";
import type { ReleaseManifest, SecretSlot, UserSource } from "../types";
import { missingRequiredSecrets } from "../secrets";

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

/**
 * Required slots the apps declare (from each release's manifest.json) that have
 * no value in the vault yet, keyed by app name. Empty object = safe to activate.
 *
 * Returns `{}` when the GitHub token or the source's platform repo is unknown —
 * activation must never be blocked by our inability to read the manifest.
 *
 * `input.source` normally comes from `listUserSources`, and the backend
 * deliberately returns `latest_deployment: null` on that list endpoint (it's
 * lazy there). So `input.source.latestDeployment?.platformRepo` is checked
 * first as a cheap path (in case a caller ever passes an already-populated
 * source), but the real value comes from the per-source latest-deployment
 * detail endpoint, which does populate `platformRepo`. `platformRepo` is a
 * platform-level constant across a source's deployments, so the latest
 * deployment's value is correct for any release tag being gated here.
 */
export async function missingSecretsForActivation(input: {
  client: DeploymentClient;
  githubUserId: string;
  platform: string;
  source: UserSource;
  pairs: { app: string; releaseTag: string }[];
  githubToken?: string;
}): Promise<Record<string, string[]>> {
  const githubToken = input.githubToken ?? process.env.GITHUB_TOKEN?.trim();
  if (!githubToken) return {};

  let platformRepo = input.source.latestDeployment?.platformRepo ?? undefined;
  if (!platformRepo) {
    try {
      const latest = await input.client.getUserSourceLatestDeployment({
        githubUserId: input.githubUserId,
        platform: input.platform,
        appSourceId: input.source.id,
      });
      platformRepo = latest?.platformRepo ?? undefined;
    } catch {
      return {}; // couldn't read deployment state → fail open, never block activation
    }
  }
  if (!platformRepo) return {};

  const configured = await input.client.listAppSecrets({
    githubUserId: input.githubUserId,
    sourceId: String(input.source.id),
  });

  const missing: Record<string, string[]> = {};
  for (const pair of input.pairs) {
    const slots = await fetchReleaseSecretSlots({
      platformRepo,
      releaseTag: pair.releaseTag,
      githubToken,
    });
    const configuredKeys = (configured.byApp[pair.app] ?? []).map(
      (handle) => handle.split("::").pop() ?? handle,
    );
    const unfilled = missingRequiredSecrets(slots[pair.app], configuredKeys);
    if (unfilled.length > 0) {
      missing[pair.app] = unfilled.map((slot) => slot.name);
    }
  }
  return missing;
}
