import { NextResponse } from "next/server";

export const runtime = "nodejs";

import {
  type BackendAppSourceResult,
  BackendRequestError,
  backendRequest,
  readOnboardDeployEnv,
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
    const env = await readOnboardDeployEnv();
    const result = await backendRequest<BackendAppSourceResult>(
      env,
      `/api/platforms/${encodeURIComponent(env.platform)}/sources/sync-installed`,
      {
        method: "POST",
        body: { repo },
      },
    );
    const source = result.source;
    if (!source?.installation_id) {
      return NextResponse.json(
        { error: "backend did not return an installation id" },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      repo: source.repository_link ?? repo,
      installationId: String(source.installation_id),
      appSourceId: source.id,
      source,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("/sources/sync-installed failed (404)")) {
      return NextResponse.json(
        {
          error:
            "GitHub install not found. Make sure the GitHub App is installed on this repository.",
        },
        { status: 404 },
      );
    }
    const status =
      err instanceof BackendRequestError && err.status >= 400 && err.status < 600
        ? err.status
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
