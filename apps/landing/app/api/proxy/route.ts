import { NextRequest, NextResponse } from "next/server";

/**
 * Allowlisted upstream hosts the proxy can forward to.
 * Prevents open-relay abuse.
 */
const ALLOWED_HOSTS = new Set([
  // Polymarket
  "gamma-api.polymarket.com",
  "data-api.polymarket.com",
  "clob.polymarket.com",
  // DefiLlama
  "coins.llama.fi",
  "yields.llama.fi",
  "api.llama.fi",
  "bridges.llama.fi",
  // Aggregators
  "api.0x.org",
  "li.quest",
  "api.cow.fi",
  // X (Twitter)
  "api.x.com",
]);

function isAllowed(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

async function proxy(req: NextRequest): Promise<NextResponse> {
  const targetUrl = req.nextUrl.searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing ?url= parameter" },
      { status: 400 },
    );
  }

  if (!isAllowed(targetUrl)) {
    return NextResponse.json(
      { error: "Host not in allowlist" },
      { status: 403 },
    );
  }

  // Forward headers (skip host/origin/cookie — those are ours, not the target's)
  const forwardHeaders = new Headers();
  const skipHeaders = new Set([
    "host",
    "origin",
    "referer",
    "cookie",
    "connection",
    "content-length",
  ]);
  req.headers.forEach((value, key) => {
    if (!skipHeaders.has(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  });

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined,
    });

    const body = await upstream.text();

    return new NextResponse(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Upstream request failed", detail: String(err) },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
