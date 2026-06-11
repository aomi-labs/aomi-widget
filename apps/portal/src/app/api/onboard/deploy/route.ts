import { NextResponse } from "next/server";

// =============================================================================
// Onboarding deploy — BFF seam (STUB, pending the backend application_id
// contract; backend work owned by Codex).
//
// The FE onboarding flow calls this once a GitHub App installation exists.
//
//   Request  { path: "oneshot" | "bootstrap",
//              installationId: string,
//              repo?: string,        // owner/name (bootstrap supplies it;
//                                    //  oneshot creates it backend-side)
//              actor?: string }
//
//   Response { repo: string,         // owner/name actually deployed
//              releaseTag: string,
//              applicationId?: string }  // opaque backend app identity
//
// Backend should: resolve the installation -> token, (oneshot) create the repo
// from aomi-labs/playground-example via the broad App, deploy source-bound, and
// return the release tag + application id. The runtime stays agnostic to which
// App — addressing is by application identity, not GitHub installation. The FE
// then polls /api/onboard/status until the release is live.
// =============================================================================
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    path?: string;
    installationId?: string;
    repo?: string;
    actor?: string;
  };

  if (!body.installationId) {
    return NextResponse.json(
      { error: "missing `installationId`" },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      error:
        "Onboarding deploy is not wired yet — pending the backend application_id contract.",
    },
    { status: 501 },
  );
}
