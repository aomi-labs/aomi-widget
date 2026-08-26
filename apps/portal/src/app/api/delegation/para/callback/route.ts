import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParaCallback = {
  state?: unknown;
  para_jwt?: unknown;
  user_id?: unknown;
  key_id?: unknown;
  verification_token?: unknown;
};

function backendBaseUrl(): string {
  const configured =
    process.env.AOMI_PROXY_BACKEND_URL ??
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL;
  if (configured) {
    try {
      return new URL(configured).toString();
    } catch {
      // A browser-relative URL cannot be used for the server-side callback.
    }
  }
  if (process.env.VERCEL_ENV === "production") return "https://api.aomi.dev";
  if (process.env.VERCEL_ENV === "preview")
    return "https://api-staging.aomi.dev";
  return "http://127.0.0.1:8080";
}

function isCallback(
  value: ParaCallback | null,
): value is Required<ParaCallback> {
  return Boolean(
    value &&
    typeof value.state === "string" &&
    typeof value.para_jwt === "string" &&
    typeof value.user_id === "string",
  );
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ParaCallback | null;
  if (!isCallback(body)) {
    return NextResponse.json(
      { error: "invalid_para_callback" },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(
      new URL("/api/auth/para/callback", backendBaseUrl()),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "para_delegation_rejected" },
        { status: upstream.status },
      );
    }
    return NextResponse.json({ status: "connected" });
  } catch (error) {
    console.error("Para delegation callback upstream failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "para_delegation_unavailable" },
      { status: 502 },
    );
  }
}
