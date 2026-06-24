import { NextRequest, NextResponse } from "next/server";
import { pollDeviceSession } from "../../../../../lib/bff/cli-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PollBody = {
  device_code?: unknown;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: PollBody;
  try {
    body = (await req.json()) as PollBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.device_code !== "string" || !body.device_code.trim()) {
    return NextResponse.json(
      { error: "device_code is required" },
      { status: 400 },
    );
  }

  try {
    const result = await pollDeviceSession(
      body.device_code,
      req.headers.get("user-agent"),
    );
    if (result.status === "authorization_pending") {
      return NextResponse.json(result, { status: 428 });
    }
    if (result.status === "expired_token") {
      return NextResponse.json(result, { status: 400 });
    }
    if (result.status === "access_denied") {
      return NextResponse.json(result, { status: 403 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to poll CLI device session", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to poll device session" },
      { status: 500 },
    );
  }
}
