import { NextRequest, NextResponse } from "next/server";

const DEFAULT_TEMPO_RPC_URL = "https://rpc.moderato.tempo.xyz";

function getTempoRpcUpstream(): string {
  const candidates = [
    process.env.TEMPO_RPC_UPSTREAM_URL,
    process.env.NEXT_PUBLIC_TEMPO_RPC_URL,
    DEFAULT_TEMPO_RPC_URL,
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (!trimmed || trimmed.startsWith("/")) continue;
    return trimmed;
  }

  return DEFAULT_TEMPO_RPC_URL;
}

function buildForwardHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");

  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (authorization) {
    headers.set("authorization", authorization);
  }

  return headers;
}

function isJsonRpcErrorPayload(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as { error?: unknown };
    return Boolean(parsed && typeof parsed === "object" && "error" in parsed);
  } catch {
    return false;
  }
}

async function forwardTempoRpc(request: NextRequest): Promise<NextResponse> {
  const upstream = getTempoRpcUpstream();
  const bodyText = await request.text();

  let response: Response;
  try {
    response = await fetch(upstream, {
      method: "POST",
      headers: buildForwardHeaders(request),
      body: bodyText,
      cache: "no-store",
    });
  } catch (error) {
    console.error("[tempo-rpc-proxy] upstream network failure", {
      upstream,
      body: bodyText,
      error,
    });
    return NextResponse.json(
      { error: "tempo rpc upstream network failure" },
      { status: 502 },
    );
  }

  const responseText = await response.text();
  if (!response.ok || isJsonRpcErrorPayload(responseText)) {
    console.error("[tempo-rpc-proxy] upstream failure", {
      upstream,
      status: response.status,
      statusText: response.statusText,
      body: bodyText,
      response: responseText,
    });
  }

  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  headers.set("x-aomi-tempo-rpc-proxy", "1");

  return new NextResponse(responseText, {
    status: response.status,
    headers,
  });
}

export async function POST(request: NextRequest) {
  return forwardTempoRpc(request);
}

