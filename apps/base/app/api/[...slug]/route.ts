import { NextRequest, NextResponse } from "next/server";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "cookie",
  "host",
  "origin",
  "referer",
  "transfer-encoding",
]);

const ALLOWED_REQUEST_HEADERS = new Set([
  "accept",
  "authorization",
  "content-type",
  "aomi-app-key",
  "x-session-id",
]);

const ALLOWED_ROUTES: Array<{
  pattern: RegExp;
  methods: ReadonlySet<string>;
}> = [
  { pattern: /^\/api\/state$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/chat$/, methods: new Set(["POST"]) },
  { pattern: /^\/api\/system$/, methods: new Set(["POST"]) },
  { pattern: /^\/api\/interrupt$/, methods: new Set(["POST"]) },
  { pattern: /^\/api\/secrets$/, methods: new Set(["POST", "DELETE"]) },
  { pattern: /^\/api\/secrets\/[^/]+$/, methods: new Set(["DELETE"]) },
  { pattern: /^\/api\/updates$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/sessions$/, methods: new Set(["GET", "POST"]) },
  {
    pattern: /^\/api\/sessions\/[^/]+$/,
    methods: new Set(["GET", "PATCH", "DELETE"]),
  },
  { pattern: /^\/api\/events$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/auth\/privy\/begin$/, methods: new Set(["POST"]) },
  { pattern: /^\/api\/account$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/account\/exchange$/, methods: new Set(["POST"]) },
  { pattern: /^\/api\/account\/usage$/, methods: new Set(["GET"]) },
  {
    pattern: /^\/api\/account\/app-keys$/,
    methods: new Set(["GET", "POST"]),
  },
  {
    pattern: /^\/api\/account\/app-keys\/[^/]+$/,
    methods: new Set(["DELETE"]),
  },
  {
    pattern: /^\/api\/account\/bots$/,
    methods: new Set(["GET", "POST"]),
  },
  {
    pattern: /^\/api\/account\/bots\/[^/]+$/,
    methods: new Set(["DELETE"]),
  },
  {
    pattern: /^\/api\/account\/approvals$/,
    methods: new Set(["GET", "POST"]),
  },
  {
    pattern: /^\/api\/account\/approvals\/[^/]+$/,
    methods: new Set(["DELETE"]),
  },
  { pattern: /^\/api\/account\/payment$/, methods: new Set(["GET"]) },
  {
    pattern: /^\/api\/account\/payment\/byok$/,
    methods: new Set(["POST"]),
  },
  {
    pattern: /^\/api\/account\/payment\/byok\/[^/]+$/,
    methods: new Set(["DELETE"]),
  },
  {
    pattern: /^\/api\/account\/payment\/tempo$/,
    methods: new Set(["POST", "DELETE"]),
  },
  { pattern: /^\/api\/session\/apps$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/session\/models$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/session\/model$/, methods: new Set(["POST"]) },
  { pattern: /^\/api\/simulate$/, methods: new Set(["POST"]) },
];

const UPSTREAM_BASE_URL =
  process.env.AOMI_PROXY_BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "https://api.aomi.dev";

function buildUpstreamUrl(req: NextRequest, slug: string[] | undefined): URL {
  const target = new URL(`/api/${(slug ?? []).join("/")}`, UPSTREAM_BASE_URL);
  target.search = req.nextUrl.search;
  return target;
}

function isAllowedProxyRequest(pathname: string, method: string): boolean {
  return ALLOWED_ROUTES.some(
    (route) => route.pattern.test(pathname) && route.methods.has(method),
  );
}

function copyRequestHeaders(req: NextRequest): Headers {
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (
      ALLOWED_REQUEST_HEADERS.has(lowerKey) &&
      !HOP_BY_HOP_HEADERS.has(lowerKey)
    ) {
      headers.set(key, value);
    }
  });
  return headers;
}

function copyResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  const cacheControl = upstream.headers.get("cache-control");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (contentType?.includes("text/event-stream")) {
    headers.set("cache-control", "no-cache, no-transform");
  } else if (cacheControl) {
    headers.set("cache-control", cacheControl);
  }

  return headers;
}

async function handle(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> },
): Promise<NextResponse> {
  const { slug } = await context.params;
  const upstreamUrl = buildUpstreamUrl(req, slug);

  if (!isAllowedProxyRequest(upstreamUrl.pathname, req.method)) {
    return NextResponse.json(
      { error: "Unsupported API route" },
      { status: 404 },
    );
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: copyRequestHeaders(req),
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : await req.text(),
      redirect: "manual",
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: copyResponseHeaders(upstream),
    });
  } catch (error) {
    console.error("Aomi upstream request failed", {
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Upstream request failed",
      },
      { status: 502 },
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
