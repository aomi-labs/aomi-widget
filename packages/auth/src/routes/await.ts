// =============================================================================
// /api/auth/await/{state} — long-poll endpoint.
// =============================================================================
//
// Wraps awaitAuth() in a Web Request/Response. Used by both MCP (Path 1)
// over HTTP and the BE (Path 2) over HTTP. Programmatic callers should
// import awaitAuth directly (and get the camelCase TS shape).
//
// Wire shape (snake_case, matches /api/auth/begin):
//   { "status": "pending" }
//   { "status": "completed", "approval_id": "..." }
//   { "status": "failed", "error": "..." }

import { awaitAuth } from "../api/await";
import type { Store } from "../store";
import type { AwaitResult } from "../types";

export interface AwaitHandlerDeps {
  store: Store;
}

export function makeAwaitHandler(deps: AwaitHandlerDeps) {
  return async function awaitHandler(
    req: Request,
    ctx: { state: string },
  ): Promise<Response> {
    const url = new URL(req.url);
    const timeoutMs = parseIntOrDefault(
      url.searchParams.get("timeout_ms"),
      60_000,
    );
    const pollMs = parseIntOrDefault(url.searchParams.get("poll_ms"), 500);

    const result = await awaitAuth(
      { store: deps.store },
      { stateToken: ctx.state, timeoutMs, pollMs },
    );

    return Response.json(toWire(result));
  };
}

function toWire(result: AwaitResult): Record<string, unknown> {
  if (result.status === "completed") {
    return { status: "completed", approval_id: result.approvalId };
  }
  return result;
}

function parseIntOrDefault(v: string | null, def: number): number {
  if (!v) return def;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}
