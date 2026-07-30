import "server-only";

import { NextResponse } from "next/server";
import { deploymentClient } from "@build/server/bff/backend";
import { resolveLaunchPlatform } from "./config";
import { buildFailures } from "@build/server/bff/failures";
import { authorize } from "@build/server/bff/auth";

export async function sourceSdkUpgradeRoute(req: Request) {
  const auth = await authorize(req, { write: true });
  if ("response" in auth) return auth.response;
  const { session } = auth;
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
    return buildFailures.handle({
      source: "launch",
      error,
      context: {
        routeFamily: new URL(req.url).pathname,
        operation: "deployment.sdk_upgrade",
        method: req.method,
      },
    }).response;
  }
}

/**
 * Read-only merge poll for the upgrade PR — the cheap counterpart to
 * {@link sourceSdkUpgradeRoute}. A GET, so no CSRF/origin gate; the backend
 * answers with a single GitHub call (no repo tarball, no branch mutation),
 * making it safe for the launch flow's 45s recheck loop.
 */
export async function sourceSdkUpgradeStatusRoute(req: Request) {
  const auth = await authorize(req);
  if ("response" in auth) return auth.response;
  const { session } = auth;
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
    const platform = resolveLaunchPlatform(params.get("platform") ?? undefined);
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
    return buildFailures.handle({
      source: "launch",
      error,
      context: {
        routeFamily: new URL(req.url).pathname,
        operation: "deployment.sdk_upgrade_status",
        method: req.method,
      },
    }).response;
  }
}
