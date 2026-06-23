import { NextResponse } from "next/server";

export const runtime = "nodejs";

import { getGitHubSession } from "@portal/lib/aomi-account/github-session";

// GET /api/auth/github/session — what the client needs to gate the UI: whether
// a GitHub session exists and its login. The github_user_id stays server-side.
export async function GET() {
  const session = await getGitHubSession();
  return NextResponse.json({
    signedIn: Boolean(session),
    githubLogin: session?.githubLogin ?? null,
  });
}
