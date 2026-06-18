// =============================================================================
// /api/mcp-auth/{provider}/start — browser entrypoint.
// =============================================================================
//
// Lifts the state token off the query string, loads the pending row to
// validate the provider matches, delegates to the provider's `start()` to
// render HTML or issue a redirect.
//
// Returns a standard Web Response so it can be mounted in any Next route.

import type { ProviderRegistry } from "../providers/registry";
import type { Store } from "../store";

export interface StartHandlerDeps {
  store: Store;
  providers: ProviderRegistry;
  baseUrl: string;
}

export function makeStartHandler(deps: StartHandlerDeps) {
  return async function startHandler(
    req: Request,
    ctx: { providerName: string },
  ): Promise<Response> {
    const url = new URL(req.url);
    const state = url.searchParams.get("state");
    if (!state) {
      return text(400, "missing state");
    }

    const provider = deps.providers.get(ctx.providerName);
    if (!provider) {
      return text(404, `unknown provider '${ctx.providerName}'`);
    }

    const pending = await deps.store.getPendingAuth(state);
    if (!pending) {
      return text(404, "pending auth not found or expired");
    }
    if (pending.walletProvider !== ctx.providerName) {
      return text(400, `state token is for provider '${pending.walletProvider}'`);
    }
    if (pending.completedAt) {
      return text(409, "this auth flow already completed");
    }

    const result = await provider.start({ pending, baseUrl: deps.baseUrl });
    if (result.kind === "redirect" && result.redirectUrl) {
      return Response.redirect(result.redirectUrl, 302);
    }
    if (result.kind === "html" && result.body) {
      return new Response(result.body, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return text(500, "provider returned no body or redirect");
  };
}

function text(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
