import { NextResponse } from "next/server";

export const runtime = "nodejs";

import {
  BackendError,
  getDeploymentClient,
  onboardConfig,
  onboardErrorResponse,
} from "@portal/lib/onboard-deploy";
import { checkRateLimit, getClientIp } from "@portal/lib/rate-limit";
import { validateOrigin } from "@portal/lib/csrf";
import { isValidRepo } from "@portal/lib/validate-input";

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
      repo?: unknown;
    };

    if (!isValidRepo(body.repo)) {
      return NextResponse.json(
        { error: "missing or invalid `repo`" },
        { status: 400 },
      );
    }

    const repo = body.repo;
    const config = onboardConfig();
    const client = await getDeploymentClient();
    const source = await client.syncSource({ platform: config.platform, repo });
    if (!source.installationId) {
      return NextResponse.json(
        { error: "backend did not return an installation id" },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      repo: source.repositoryLink ?? repo,
      installationId: String(source.installationId),
      appSourceId: source.id,
      source,
    });
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) {
      return NextResponse.json(
        {
          error:
            "GitHub install not found. Make sure the GitHub App is installed on this repository.",
        },
        { status: 404 },
      );
    }
    return onboardErrorResponse(err);
  }
}
