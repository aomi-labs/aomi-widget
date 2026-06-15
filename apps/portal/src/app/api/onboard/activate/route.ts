import { NextResponse } from "next/server";

export const runtime = "nodejs";

import {
  activationEnv,
  type BackendActivationResult,
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
