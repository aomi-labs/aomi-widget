import { NextResponse } from "next/server";

import { buildActivationRequest, buildActivationRequestDiscordBody } from "@aomi-labs/deploy";
import { appSlug, readDeployEnv } from "@portal/lib/deploy";

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
    const app = appSlug(body.app) || appSlug(githubAccount);

    const input = {
      email,
      githubAccount,
      app,
      platform: env.platform,
      repo: "",
    };
    const payload = buildActivationRequest(input);
    const discordBody = buildActivationRequestDiscordBody(input, {
      opsMention: env.opsMention,
    });
    let posted = false;
    if (env.discordWebhook) {
      const res = await fetch(env.discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discordBody),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Discord webhook returned ${res.status}: ${text.trim()}`);
      }
      posted = true;
    }

    return NextResponse.json({ posted, app: payload.app });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
