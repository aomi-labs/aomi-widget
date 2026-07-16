import "server-only";

import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@build/lib/rate-limit";
import { validateOrigin } from "@build/lib/csrf";
import { getGitHubSession } from "@build/server/cookies/github";
import { deploymentClient } from "@build/server/bff/backend";
import { launchConfig } from "./config";
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
    const client = await deploymentClient();
    const result = await client.upgradeUserSourceSdk({
      appSourceId,
      githubUserId: session.githubUserId,
      platform: launchConfig().platform,
    });
    return NextResponse.json(result);
  } catch (error) {
    return launchErrorResponse(error);
  }
}
