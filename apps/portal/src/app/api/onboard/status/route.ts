import { NextResponse } from "next/server";

// =============================================================================
// Onboarding deploy status — BFF seam (STUB, pending backend; Codex).
//
//   GET /api/onboard/status?releaseTag=<tag>
//
//   Response { state: "building" | "activating" | "live" | "failed",
//              releaseTag: string,
//              message?: string }
//
// Backend should report release/activation progress for an in-flight onboarding
// deploy keyed by release tag, returning "live" once the app is loaded and
// serving. The FE polls this until live (or failed).
// =============================================================================
export async function GET(req: Request) {
  const releaseTag = new URL(req.url).searchParams.get("releaseTag");
  if (!releaseTag) {
    return NextResponse.json(
      { error: "missing `releaseTag`" },
      { status: 400 },
    );
  }

  // Dev-only mock (see deploy route). The mock release tag embeds its start
  // time; report ~6s of "building" then "live" so the poll UI is visible.
  if (process.env.APP_ONBOARD_MOCK === "1") {
    const m = releaseTag.match(/-(\d{10,})$/);
    const startMs = m ? Number(m[1]) : 0;
    const state = Date.now() - startMs < 6000 ? "building" : "live";
    return NextResponse.json({ state, releaseTag });
  }

  return NextResponse.json(
    {
      error:
        "Onboarding status is not wired yet — pending the backend application_id contract.",
    },
    { status: 501 },
  );
}
