import { NextResponse } from "next/server";

import {
  activationEnv,
  type BackendActivationResult,
  type BackendAppStatusResult,
  backendRequest,
  readOnboardDeployEnv,
} from "@portal/lib/onboard-deploy";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      releaseTags?: string[];
      apps?: string[];
      actor?: string;
    };
    const releaseTags = (body.releaseTags ?? [])
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (releaseTags.length === 0) {
      return NextResponse.json(
        { error: "missing `releaseTags`" },
        { status: 400 },
      );
    }
    const apps = (body.apps ?? []).map((app) => app.trim()).filter(Boolean);
    if (apps.length > 0 && apps.length !== releaseTags.length) {
      return NextResponse.json(
        { error: "`apps` must match `releaseTags` length" },
        { status: 400 },
      );
    }
    const env = await activationEnv(readOnboardDeployEnv());
    if (apps.length === releaseTags.length && apps.length > 0) {
      const activatedApps = [];
      for (let index = 0; index < apps.length; index += 1) {
        const name = apps[index];
        const releaseTag = releaseTags[index];
        try {
          await backendRequest(env, `/api/platforms/${encodeURIComponent(env.platform)}/apps/${encodeURIComponent(name)}/activate`, {
            method: "POST",
            body: {
              app_release_tag: releaseTag,
              is_public: true,
              ...(env.targetTags.length ? { target_tags: env.targetTags } : {}),
            },
          });
          const status = await backendRequest<BackendAppStatusResult>(
            env,
            `/api/platforms/${encodeURIComponent(env.platform)}/apps/${encodeURIComponent(
              name,
            )}?release_tag=${encodeURIComponent(releaseTag)}`,
          );
          activatedApps.push({
            name,
            release_tag: releaseTag,
            is_active: Boolean(status.app?.is_active),
            loaded: Boolean(status.app?.loaded),
            error: null,
          });
        } catch (error) {
          activatedApps.push({
            name,
            release_tag: releaseTag,
            is_active: false,
            loaded: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      return NextResponse.json({
        ok: activatedApps.every((app) => app.is_active && app.loaded),
        activation: {
          status: activatedApps.every((app) => app.is_active && app.loaded)
            ? "activated"
            : "partial_failed",
          apps: activatedApps,
        },
      });
    }
    const result = await backendRequest<BackendActivationResult>(
      env,
      `/api/platforms/${encodeURIComponent(env.platform)}/apps/activate`,
      {
        method: "POST",
        body: {
          target: { kind: "release_tags", value: releaseTags },
          ...(apps.length ? { apps } : {}),
          ...(env.targetTags.length ? { target_tags: env.targetTags } : {}),
        },
      },
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
