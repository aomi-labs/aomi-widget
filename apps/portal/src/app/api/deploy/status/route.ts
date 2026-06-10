import { NextResponse } from "next/server";

import {
  appNameFromReleaseTag,
  getDeploymentClient,
  readDeployEnv,
} from "@portal/lib/deploy";

function errorBody(err: unknown): string {
  const body = (err as { body?: string })?.body;
  if (!body) return err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(body) as { error?: string };
    return parsed.error ?? body;
  } catch {
    return body;
  }
}

function isReleasePending(message: string): boolean {
  return (
    message.includes("failed to fetch/install release") ||
    message.includes("Verify the app_release_tag exists") ||
    (message.includes("release") && message.includes("not found"))
  );
}

// Poll release readiness by attempting backend activation. The platform backend
// has no read-only deploy status route; activation is what proves that the
// release tag is available and the runtime can load the app.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const releaseTag = url.searchParams.get("releaseTag");

  if (!releaseTag) {
    return NextResponse.json(
      { error: "missing `releaseTag`" },
      { status: 400 },
    );
  }
  const appName = slug ?? appNameFromReleaseTag(releaseTag);
  if (!appName) {
    return NextResponse.json(
      {
        error: "missing `slug` and could not derive app name from `releaseTag`",
      },
      { status: 400 },
    );
  }

  try {
    const env = readDeployEnv();
    const client = getDeploymentClient(env);
    const activation = await client.activate({
      platform: env.platform,
      target: { kind: "release_tags", value: [releaseTag] },
      apps: [appName],
      targetTags: ["staging"],
      actor: appName,
    });
    const loaded = activation.activation.apps.every((app) => app.loaded);
    return NextResponse.json({
      ci: null,
      release: loaded ? "ready" : "building",
      releaseTag,
      activation,
      message: loaded
        ? undefined
        : "Release installed but runtime load is pending",
    });
  } catch (err) {
    const message = errorBody(err);
    if (isReleasePending(message)) {
      return NextResponse.json({
        ci: null,
        release: "building",
        releaseTag,
        message,
      });
    }
    return NextResponse.json(
      { error: message },
      {
        status:
          typeof (err as { status?: number })?.status === "number"
            ? (err as { status: number }).status
            : 502,
      },
    );
  }
}
