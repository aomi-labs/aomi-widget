import { NextRequest, NextResponse } from "next/server";
import { startDeviceSession } from "../../../../../lib/bff/cli-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const started = await startDeviceSession(req.nextUrl.origin);
    return NextResponse.json(started);
  } catch (error) {
    console.error("Failed to start CLI device session", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to start device session" },
      { status: 500 },
    );
  }
}
