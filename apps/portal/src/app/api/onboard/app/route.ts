import { NextResponse } from "next/server";

export const runtime = "nodejs";

import {
  getDeploymentClient,
  onboardConfig,
  onboardErrorResponse,
} from "@portal/lib/onboard-deploy";
import { checkRateLimit, getClientIp } from "@portal/lib/rate-limit";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const params = new URL(req.url).searchParams;
  const name = params.get("name")?.trim();
  const releaseTag = params.get("releaseTag")?.trim();

  if (!name) {
    return NextResponse.json({ error: "missing `name`" }, { status: 400 });
  }

  try {
    const config = onboardConfig();
    const client = await getDeploymentClient();
    const app = await client.getApp({
      platform: config.platform,
      app: name,
      releaseTag: releaseTag || undefined,
    });
    const live = app.isActive && app.loaded;
    return NextResponse.json({
      ok: Boolean(live),
      state: live ? "live" : "pending",
      // Keep the snake-cased wire shape the onboarding client reads.
      app: {
        name: app.name,
        is_active: app.isActive,
        loaded: app.loaded,
        app_release_tag: app.appReleaseTag,
      },
    });
  } catch (err) {
    return onboardErrorResponse(err);
  }
}
