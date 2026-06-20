import { NextResponse } from "next/server";

export const runtime = "nodejs";

import {
  activationEnv,
  type BackendActivationResult,
  BackendRequestError,
  backendRequest,
  readOnboardDeployEnv,
} from "@portal/lib/onboard-deploy";
import { checkRateLimit, getClientIp } from "@portal/lib/rate-limit";
import { validateOrigin } from "@portal/lib/csrf";
import { isValidReleaseTags } from "@portal/lib/validate-input";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      releaseTags?: unknown;
      apps?: string[];
      actor?: string;
    };

    if (!isValidReleaseTags(body.releaseTags)) {
      return NextResponse.json(
        { error: "missing or invalid `releaseTags`" },
        { status: 400 },
      );
    }

    const releaseTags = body.releaseTags;
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
    const status =
      err instanceof BackendRequestError && err.status >= 400 && err.status < 600
        ? err.status
        : 502;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status },
    );
  }
}
