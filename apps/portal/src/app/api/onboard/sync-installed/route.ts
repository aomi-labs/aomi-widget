import { NextResponse } from "next/server";

import {
  type BackendAppSourceResult,
  backendRequest,
  readOnboardDeployEnv,
} from "@portal/lib/onboard-deploy";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      repo?: string;
    };
    const repo = body.repo?.trim();
    if (!repo) {
      return NextResponse.json({ error: "missing `repo`" }, { status: 400 });
    }
    const env = readOnboardDeployEnv();
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
            "the backend returned 404 for the GitHub install sync endpoint, so the portal could not ask GitHub for the live installation state. Restart or deploy the backend with POST /api/platforms/:platform/sources/sync-installed.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
