import { resolveAccountTrustedOrigins } from "@aomi-labs/account/better-auth/env";
import { type NextRequest, NextResponse } from "next/server";

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const ALLOWED_HEADERS = [
  "Accept",
  "Authorization",
  "Content-Type",
  "Aomi-App-Key",
  "Last-Event-ID",
  "X-Session-Id",
  "X-Thread-Id",
].join(", ");

function appendVary(headers: Headers, value: string): void {
  const current = headers.get("Vary");
  const values = new Set(
    (current ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
  values.add(value);
  headers.set("Vary", [...values].join(", "));
}

function applyCorsHeaders(
  response: NextResponse,
  origin: string,
): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  response.headers.set("Access-Control-Max-Age", "86400");
  appendVary(response.headers, "Origin");
  return response;
}

export function proxy(request: NextRequest): NextResponse {
  const origin = request.headers.get("Origin");
  if (!origin) {
    return NextResponse.next();
  }

  const trustedOrigins = new Set(resolveAccountTrustedOrigins());
  if (!trustedOrigins.has(origin)) {
    const response = NextResponse.json(
      { error: "Origin is not allowed" },
      { status: 403 },
    );
    appendVary(response.headers, "Origin");
    return response;
  }

  if (request.method === "OPTIONS") {
    return applyCorsHeaders(new NextResponse(null, { status: 204 }), origin);
  }

  return applyCorsHeaders(NextResponse.next(), origin);
}

export const config = {
  matcher: "/api/:path*",
};
