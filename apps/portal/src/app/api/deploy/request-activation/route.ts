import { NextResponse } from "next/server";

import { appSlug, getDeploymentClient, readDeployEnv } from "@portal/lib/deploy";

// "Publish your own app" — post an activation (access) request to ops via the
// SDK. Ops invite the GitHub account + issue a per-app code out-of-band. No
// token is ever part of this request.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      githubAccount?: string;
      email?: string;
      app?: string;
    };
    const githubAccount = (body.githubAccount ?? "").trim();
    const email = (body.email ?? "").trim();
    if (!githubAccount || !email) {
      return NextResponse.json({ error: "GitHub account and email are required" }, { status: 400 });
    }

    const env = readDeployEnv();
    const client = getDeploymentClient(env);
    const app = appSlug(body.app) || appSlug(githubAccount);

    const { payload, posted } = await client.requestActivation({
      email,
      githubAccount,
      app,
      actor: githubAccount,
    });

    return NextResponse.json({ posted, app: payload.app });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
