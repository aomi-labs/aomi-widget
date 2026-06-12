import { NextResponse } from "next/server";

import {
  appNameFromReleaseTag,
  getDeploymentClient,
  readDeployEnv,
} from "@portal/lib/deploy";

// Activate a built release on the backend, using the proxy's platform-wide
// activation token (no per-user code needed — the one-shot model).
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      slug?: string;
      releaseTag?: string;
      actor?: string;
    };
    if (!body.releaseTag) {
      return NextResponse.json(
        { error: "missing `releaseTag`" },
        { status: 400 },
      );
    }
    const appName = body.slug ?? appNameFromReleaseTag(body.releaseTag);
    if (!appName) {
      return NextResponse.json(
        {
          error:
            "missing `slug` and could not derive app name from `releaseTag`",
        },
        { status: 400 },
      );
    }

    const env = readDeployEnv();
    if (!env.activationToken) {
      return NextResponse.json(
        {
          error:
            "activation is not configured: set APP_DEPLOY_ACTIVATION_TOKEN",
        },
        { status: 503 },
      );
    }
    const client = getDeploymentClient(env);
    const result = await client.activate({
      platform: env.platform,
      target: { kind: "release_tags", value: [body.releaseTag] },
      apps: [appName],
      targetTags: ["staging"],
      actor: body.actor ?? appName,
    });

    return NextResponse.json(result);
  } catch (err) {
    // The activate path can still hit the standing backend 502 — surface the
    // descriptive message so the UI can show it + offer retry, never hang.
    const message = err instanceof Error ? err.message : String(err);
    const status =
      typeof (err as { status?: number })?.status === "number"
        ? (err as { status: number }).status
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
