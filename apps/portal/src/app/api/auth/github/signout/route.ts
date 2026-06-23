import { NextResponse } from "next/server";

export const runtime = "nodejs";

import { clearGitHubSessionCookie } from "@portal/lib/aomi-account/github-session";

// POST /api/auth/github/signout — drop the portal GitHub session.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearGitHubSessionCookie(res);
  return res;
}
