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

  return NextResponse.json(
    {
      error:
        "Onboarding status is not wired yet — pending the backend application_id contract.",
    },
    { status: 501 },
  );
}
