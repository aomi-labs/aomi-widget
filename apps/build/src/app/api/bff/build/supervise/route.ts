import { NextResponse } from "next/server";
import { superviseOnce } from "@build/server/bff/build/supervisor";

export const runtime = "nodejs";

/**
 * Supervisor tick — wire a Vercel Cron to this route (every minute) in
 * deployed envs; the dev server also ticks in-process. Guarded by
 * CRON_SECRET (Vercel injects the Authorization header for cron calls).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const anonDev =
    process.env.AOMI_BUILD_ALLOW_ANON === "1" &&
    process.env.NODE_ENV !== "production";
  if (!anonDev) {
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }
  try {
    const actions = await superviseOnce();
    return NextResponse.json({ actions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
