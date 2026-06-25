import { NextResponse } from "next/server";

export const runtime = "nodejs";

import { clearGitHubSessionCookie } from "@portal/server/aomi-account/github-session";

// POST /api/bff/auth/github/signout — drop the portal GitHub session.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearGitHubSessionCookie(res);
  return res;
}
