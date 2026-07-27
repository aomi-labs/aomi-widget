import "server-only";

import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@build/lib/rate-limit";
import { validateOrigin } from "@build/lib/csrf";
import { getGitHubSession } from "@build/server/cookies/github";
import { deploymentClient } from "@build/server/bff/backend";
import { launchConfig, resolveLaunchPlatform } from "./config";
import { launchErrorResponse } from "./errors";

export async function sourceSdkUpgradeRoute(req: Request) {
  if (!checkRateLimit(getClientIp(req)).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const session = await getGitHubSession();
  if (!session) {
    return NextResponse.json(
      { error: "not signed in with GitHub" },
      { status: 401 },
    );
  }
  const body: unknown = await req.json().catch(() => null);
  const platformValue =
    body && typeof body === "object" && "platform" in body
      ? body.platform
      : undefined;
  const appSourceId = Number(
    body && typeof body === "object" && "appSourceId" in body
      ? body.appSourceId
      : undefined,
  );
  if (!Number.isSafeInteger(appSourceId) || appSourceId <= 0) {
    return NextResponse.json(
      { error: "missing or invalid `appSourceId`" },
      { status: 400 },
    );
  }

  try {
    const platform = resolveLaunchPlatform(platformValue);
    if (!platform) {
      return NextResponse.json(
        { error: "unknown or unavailable `platform`" },
        { status: 400 },
      );
    }
    const client = await deploymentClient();
    const result = await client.upgradeUserSourceSdk({
      appSourceId,
      githubUserId: session.githubUserId,
      platform,
    });
    return NextResponse.json(result);
  } catch (error) {
    return launchErrorResponse(error);
  }
}

/**
 * Read-only merge poll for the upgrade PR — the cheap counterpart to
 * {@link sourceSdkUpgradeRoute}. A GET, so no CSRF/origin gate; the backend
 * answers with a single GitHub call (no repo tarball, no branch mutation),
 * making it safe for the launch flow's 45s recheck loop.
 */
export async function sourceSdkUpgradeStatusRoute(req: Request) {
  if (!checkRateLimit(getClientIp(req)).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const session = await getGitHubSession();
  if (!session) {
    return NextResponse.json(
      { error: "not signed in with GitHub" },
      { status: 401 },
    );
  }
  const appSourceId = Number(
    new URL(req.url).searchParams.get("appSourceId") ?? undefined,
  );
  if (!Number.isSafeInteger(appSourceId) || appSourceId <= 0) {
    return NextResponse.json(
      { error: "missing or invalid `appSourceId`" },
      { status: 400 },
    );
  }

  try {
    const params = new URL(req.url).searchParams;
    const platform = resolveLaunchPlatform(
      params.get("platform") ?? undefined,
      launchConfig(),
    );
    if (!platform) {
      return NextResponse.json(
        { error: "unknown or unavailable `platform`" },
        { status: 400 },
      );
    }
    const client = await deploymentClient();
    const result = await client.sdkUpgradeStatus({
      appSourceId,
      githubUserId: session.githubUserId,
      platform,
    });
    return NextResponse.json(result);
  } catch (error) {
    return launchErrorResponse(error);
  }
}
