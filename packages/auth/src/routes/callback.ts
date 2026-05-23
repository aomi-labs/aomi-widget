// =============================================================================
// /api/auth/{provider}/callback — browser POST or GET (real OAuth).
// =============================================================================
//
// Resolves state → pending row → provider.callback(). Provider returns the
// credential material; this handler stashes it via SecretStore, inserts an
// access_approval row, marks pending complete.
//
// At no point does the auth runtime log secret values. Provider responses
// are consumed inline and thrown away.

import type { ProviderRegistry } from "../providers/registry";
import type { SecretStore } from "../secret-store";
import type { Store } from "../store";
import type { AccessApproval } from "../types";

export interface CallbackHandlerDeps {
  store: Store;
  providers: ProviderRegistry;
  secretStore: SecretStore;
  now?: () => number;
  generateId?: () => string;
}

export function makeCallbackHandler(deps: CallbackHandlerDeps) {
  return async function callbackHandler(
    req: Request,
    ctx: { providerName: string },
  ): Promise<Response> {
    const url = new URL(req.url);
    const query = Object.fromEntries(url.searchParams.entries());

    let body: Record<string, string> | undefined;
    if (req.method === "POST") {
      const ct = req.headers.get("content-type") ?? "";
      if (ct.includes("application/x-www-form-urlencoded")) {
        const form = await req.formData();
        body = {};
        for (const [k, v] of form.entries()) body[k] = String(v);
      } else if (ct.includes("application/json")) {
        body = (await req.json()) as Record<string, string>;
      }
    }

    const state = (body?.state ?? query.state) as string | undefined;
    if (!state) return text(400, "missing state");

    const provider = deps.providers.get(ctx.providerName);
    if (!provider) return text(404, `unknown provider '${ctx.providerName}'`);

    const pending = await deps.store.getPendingAuth(state);
    if (!pending) return text(404, "pending auth not found");
    if (pending.provider !== ctx.providerName) {
      return text(400, `state token is for provider '${pending.provider}'`);
    }
    if (pending.completedAt) {
      return text(409, "this auth flow already completed");
    }

    let result;
    try {
      result = await provider.callback({ pending, query, body });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await deps.store.failPendingAuth(state, `provider callback failed: ${msg}`);
      return text(500, "auth failed");
    }

    let handles: Record<string, string>;
    try {
      handles = await deps.secretStore.put({
        userId: pending.userId,
        application: ctx.providerName,
        secrets: result.secrets,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await deps.store.failPendingAuth(state, `secret store put failed: ${msg}`);
      return text(500, "auth failed");
    }

    const now = (deps.now ?? Date.now)();
    const approvalId = (deps.generateId ?? defaultId)();
    // Store handles as a JSON map with sorted keys — deterministic regardless
    // of BE's HashMap iteration order. The post-v1 proxy decodes via
    // JSON.parse to get back `Record<name, handle>` and looks up by name.
    const sortedHandles: Record<string, string> = {};
    for (const name of Object.keys(handles).sort()) {
      sortedHandles[name] = handles[name];
    }
    const secretHandle = JSON.stringify(sortedHandles);

    const approval: AccessApproval = {
      id: approvalId,
      userId: pending.userId,
      application: ctx.providerName,
      displayLabel: result.displayLabel,
      secretHandle,
      grantedAt: now,
    };
    await deps.store.insertApproval(approval);
    await deps.store.completePendingAuth(state, approvalId);

    const bodyHtml = result.body ?? `<!doctype html><p>Connected ${ctx.providerName}.</p>`;
    return new Response(bodyHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  };
}

function text(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function defaultId(): string {
  return crypto.randomUUID();
}
