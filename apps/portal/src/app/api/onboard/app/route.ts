import { NextResponse } from "next/server";

export const runtime = "nodejs";

import {
  type BackendAppStatusResult,
  backendRequest,
  readOnboardDeployEnv,
} from "@portal/lib/onboard-deploy";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const name = params.get("name")?.trim();
  const releaseTag = params.get("releaseTag")?.trim();
  if (!name) {
    return NextResponse.json({ error: "missing `name`" }, { status: 400 });
  }
  try {
    const env = readOnboardDeployEnv();
    const query = new URLSearchParams();
    if (releaseTag) query.set("release_tag", releaseTag);
    const suffix = query.toString() ? `?${query}` : "";
    const result = await backendRequest<BackendAppStatusResult>(
      env,
      `/api/platforms/${encodeURIComponent(env.platform)}/apps/${encodeURIComponent(
        name,
      )}${suffix}`,
    );
    const app = result.app;
    return NextResponse.json({
      ok: Boolean(app?.is_active && app?.loaded),
      state: app?.is_active && app?.loaded ? "live" : "pending",
      app,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
