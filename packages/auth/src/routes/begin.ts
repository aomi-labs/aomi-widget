// =============================================================================
// /api/auth/begin — BE-facing handler (Path 2).
// =============================================================================
//
// Server-to-server entrypoint for the BE to kick off an OAuth flow without
// going through MCP. Guarded by X-Aomi-Auth (v1 shared static token; future:
// mTLS + signed service token).
//
// Body: { user_id, provider }
// Reply: { state_token, auth_url, expires_at }
//
// Path 1 (Claude → MCP) does NOT hit this route — it calls beginAuth()
// programmatically inside the mcp-core runtime.

import { beginAuth } from "../api/begin";
import type { ProviderRegistry } from "../providers/registry";
import type { Store } from "../store";

export interface BeginHandlerDeps {
  store: Store;
  providers: ProviderRegistry;
  baseUrl: string;
  authToken: string;
}

export function makeBeginHandler(deps: BeginHandlerDeps) {
  return async function beginHandler(req: Request): Promise<Response> {
    if (req.method !== "POST") {
      return text(405, "method not allowed");
    }
    const supplied = req.headers.get("x-aomi-auth");
    if (!supplied || supplied !== deps.authToken) {
      return text(401, "unauthorized");
    }

    let body: { user_id?: string; provider?: string };
    try {
      body = (await req.json()) as { user_id?: string; provider?: string };
    } catch {
      return text(400, "invalid JSON body");
    }

    if (!body.user_id || !body.provider) {
      return text(400, "user_id and provider required");
    }

    try {
      const result = await beginAuth(
        {
          store: deps.store,
          providers: deps.providers,
          baseUrl: deps.baseUrl,
        },
        { userId: body.user_id, initiator: "be" },
        { provider: body.provider },
      );
      return Response.json({
        state_token: result.stateToken,
        auth_url: result.authUrl,
        expires_at: result.expiresAt,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return text(400, msg);
    }
  };
}

function text(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
