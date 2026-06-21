import { NextResponse } from "next/server";

export const runtime = "nodejs";

import { checkRateLimit, getClientIp } from "@portal/lib/rate-limit";
import { isValidRepo } from "@portal/lib/validate-input";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const repo = new URL(req.url).searchParams.get("repo");
  if (!isValidRepo(repo)) {
    return NextResponse.json(
      { error: "missing or invalid `repo`" },
      { status: 400 },
    );
  }

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "aomi-portal",
    };
    const token = process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`https://api.github.com/repos/${repo}`, { headers });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ exists: false, fromTemplate: false });
      }
      return NextResponse.json(
        { error: `GitHub API error (${res.status})` },
        { status: 502 },
      );
    }

    const templateFullName = (
      (body as Record<string, unknown>)?.template_repository as Record<string, unknown> | undefined
    )?.full_name as string | undefined;
    const fromTemplate =
      typeof templateFullName === "string" &&
      templateFullName.toLowerCase().startsWith("aomi-labs/");

    return NextResponse.json({ exists: true, fromTemplate });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
