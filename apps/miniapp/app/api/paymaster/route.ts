import { NextRequest, NextResponse } from "next/server";

const ALLOWED_PAYMASTER_METHODS = new Set([
  "pm_getAcceptedPaymentTokens",
  "pm_getPaymasterStubData",
  "pm_getPaymasterData",
]);

const PIMLICO_PAYMASTER_URL = process.env.PIMLICO_PAYMASTER_URL;
const PAYMASTER_ALLOWED_ORIGINS = new Set(
  headerValues(process.env.PAYMASTER_ALLOWED_ORIGINS).map(normalizeOrigin),
);
const TRUST_FORWARDED_IP_HEADERS =
  process.env.PAYMASTER_TRUST_FORWARDED_IP_HEADERS === "1" ||
  process.env.PAYMASTER_TRUST_FORWARDED_IP_HEADERS === "true" ||
  process.env.VERCEL === "1";
const ALLOW_ORIGINLESS_REQUESTS =
  process.env.PAYMASTER_ALLOW_ORIGINLESS_REQUESTS === "1" ||
  process.env.PAYMASTER_ALLOW_ORIGINLESS_REQUESTS === "true";

const SPONSOR_NAME =
  process.env.PAYMASTER_SPONSOR_NAME ??
  process.env.NEXT_PUBLIC_WALLET_APP_NAME ??
  "Aomi";

const SPONSOR_ICON = process.env.PAYMASTER_SPONSOR_ICON;
const MAX_BODY_BYTES = 128_000;
const MAX_BATCH_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const TRUSTED_WALLET_ORIGINS = new Set([
  "https://keys.coinbase.com",
  "https://wallet.coinbase.com",
  "https://account.base.app",
]);
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

type JsonRpcRequest = {
  id?: string | number | null;
  jsonrpc?: string;
  method?: string;
  params?: unknown;
};

type JsonRpcResponse = {
  id?: string | number | null;
  jsonrpc?: string;
  result?: unknown;
  error?: unknown;
};

function headerValues(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(origin: string): string {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.trim().replace(/\/$/, "");
  }
}

function requestOrigins(req: NextRequest): Set<string> {
  const origins = new Set<string>([normalizeOrigin(req.nextUrl.origin)]);
  const hosts = [
    ...headerValues(req.headers.get("host")),
    ...headerValues(req.headers.get("x-forwarded-host")),
  ];
  const protocols = [
    ...headerValues(req.headers.get("x-forwarded-proto")),
    req.nextUrl.protocol.replace(/:$/, ""),
  ].filter(Boolean);

  for (const host of hosts) {
    for (const protocol of protocols) {
      origins.add(normalizeOrigin(`${protocol}://${host}`));
    }
  }

  return origins;
}

function allowedCorsOrigin(req: NextRequest): string | undefined {
  const origin = req.headers.get("origin");
  if (!origin) return undefined;
  const normalizedOrigin = normalizeOrigin(origin);
  if (
    requestOrigins(req).has(normalizedOrigin) ||
    TRUSTED_WALLET_ORIGINS.has(normalizedOrigin) ||
    PAYMASTER_ALLOWED_ORIGINS.has(normalizedOrigin)
  ) {
    return normalizedOrigin;
  }
  return undefined;
}

function corsHeaders(req: NextRequest): HeadersInit {
  const allowOrigin = allowedCorsOrigin(req);

  return {
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    ...(allowOrigin ? { "access-control-allow-origin": allowOrigin } : {}),
    ...(allowOrigin ? { vary: "origin" } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRequests(value: unknown): JsonRpcRequest[] | null {
  if (Array.isArray(value)) {
    return value.every(isRecord) ? (value as JsonRpcRequest[]) : null;
  }
  return isRecord(value) ? [value as JsonRpcRequest] : null;
}

function validateRequestMethods(requests: JsonRpcRequest[]): boolean {
  if (requests.length === 0 || requests.length > MAX_BATCH_REQUESTS)
    return false;

  return requests.every(
    (request) =>
      request.jsonrpc === "2.0" &&
      typeof request.method === "string" &&
      ALLOWED_PAYMASTER_METHODS.has(request.method) &&
      Array.isArray(request.params) &&
      request.params.length > 0,
  );
}

function isAllowedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return ALLOW_ORIGINLESS_REQUESTS;
  return Boolean(allowedCorsOrigin(req));
}

function clientKey(req: NextRequest): string {
  if (TRUST_FORWARDED_IP_HEADERS) {
    const forwardedIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip")?.trim();

    if (forwardedIp) return `ip:${forwardedIp}`;
  }

  return `origin:${allowedCorsOrigin(req) ?? "unknown"}`;
}

function rateLimit(req: NextRequest): boolean {
  const key = clientKey(req);
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) return false;

  bucket.count += 1;
  return true;
}

function sponsorPayload() {
  return {
    name: SPONSOR_NAME,
    ...(SPONSOR_ICON ? { icon: SPONSOR_ICON } : {}),
  };
}

function addSponsorToResult(result: unknown): unknown {
  if (!isRecord(result)) return result;
  if (isRecord(result.sponsor)) return result;
  return {
    ...result,
    sponsor: sponsorPayload(),
  };
}

function addSponsorMetadata(
  upstreamBody: unknown,
  requests: JsonRpcRequest[],
): unknown {
  const methodsById = new Map(
    requests.map((request) => [request.id ?? null, request.method]),
  );

  const transformResponse = (response: unknown): unknown => {
    if (!isRecord(response)) return response;

    const rpcResponse = response as JsonRpcResponse;
    const method = methodsById.get(rpcResponse.id ?? null);
    if (method !== "pm_getPaymasterStubData" || rpcResponse.error) {
      return response;
    }

    return {
      ...rpcResponse,
      result: addSponsorToResult(rpcResponse.result),
    };
  };

  return Array.isArray(upstreamBody)
    ? upstreamBody.map(transformResponse)
    : transformResponse(upstreamBody);
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req),
  });
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);

  if (!isAllowedOrigin(req)) {
    return NextResponse.json(
      { error: "Origin is not allowed" },
      { status: 403, headers },
    );
  }

  if (!rateLimit(req)) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers },
    );
  }

  if (!PIMLICO_PAYMASTER_URL) {
    return NextResponse.json(
      { error: "PIMLICO_PAYMASTER_URL is not configured" },
      { status: 500, headers },
    );
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "JSON-RPC body is too large" },
      { status: 413, headers },
    );
  }

  const body = await req.text();
  if (body.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "JSON-RPC body is too large" },
      { status: 413, headers },
    );
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON-RPC body" },
      { status: 400, headers },
    );
  }

  const requests = getRequests(parsedBody);
  if (!requests || !validateRequestMethods(requests)) {
    return NextResponse.json(
      { error: "Unsupported paymaster JSON-RPC method" },
      { status: 400, headers },
    );
  }

  const upstream = await fetch(PIMLICO_PAYMASTER_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cache: "no-store",
  });

  const responseText = await upstream.text();
  let responseBody: unknown;
  try {
    responseBody = JSON.parse(responseText);
  } catch {
    return new NextResponse(responseText, {
      status: upstream.status,
      headers: {
        ...headers,
        "content-type":
          upstream.headers.get("content-type") ?? "text/plain; charset=utf-8",
      },
    });
  }

  return NextResponse.json(addSponsorMetadata(responseBody, requests), {
    status: upstream.status,
    headers,
  });
}
