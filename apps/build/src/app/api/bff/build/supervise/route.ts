import { NextResponse } from "next/server";
import { superviseOnce } from "@build/server/bff/build/supervisor";
import { buildFailures } from "@build/server/bff/failures";

export const runtime = "nodejs";

/**
 * Supervisor tick — hit this route every minute in deployed envs (Supabase
 * pg_cron on the run store's project; root vercel.json is shared across
 * Vercel projects, so a Vercel Cron there would bleed to landing/portal);
 * the dev server also ticks in-process. Guarded by
 * BUILD_RUN_CHECKER_CRON_SECRET as the Authorization bearer.
 */
export async function GET(req: Request) {
  const secret = process.env.BUILD_RUN_CHECKER_CRON_SECRET;
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
    const message = error instanceof Error ? error.message : String(error);
    return buildFailures.handle({
      source: "local",
      error,
      response: { status: 500, error: message },
      context: {
        routeFamily: "/api/bff/build/supervise",
        operation: "build.supervisor_request",
        method: req.method,
      },
    }).response;
  }
}
