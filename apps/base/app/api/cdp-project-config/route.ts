import { NextRequest, NextResponse } from "next/server";

type CoinbaseErrorBody = {
  errorMessage?: string;
};

function isValidProjectId(projectId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    projectId,
  );
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id")?.trim();

  if (!projectId) {
    return NextResponse.json(
      { error: "Set NEXT_PUBLIC_CDP_PROJECT_ID." },
      { status: 400 },
    );
  }

  if (!isValidProjectId(projectId)) {
    return NextResponse.json(
      {
        error:
          "NEXT_PUBLIC_CDP_PROJECT_ID must be the Coinbase CDP Project ID UUID, not an API key.",
      },
      { status: 400 },
    );
  }

  const response = await fetch(
    `https://api.cdp.coinbase.com/platform/v2/embedded-wallet-api/projects/${projectId}/config`,
    { cache: "no-store" },
  );

  if (response.ok) {
    return NextResponse.json({ ok: true });
  }

  let error = `Coinbase CDP project check failed with HTTP ${response.status}.`;
  try {
    const body = (await response.json()) as CoinbaseErrorBody;
    if (body.errorMessage) {
      error = body.errorMessage;
    }
  } catch {
    // Keep the status-based message.
  }

  return NextResponse.json({ error }, { status: response.status });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
