// =============================================================================
// /api/mcp-auth/{provider}/callback — browser POST or GET (real OAuth).
// =============================================================================
//
// Resolves state → pending row → provider.callback(). Provider returns
// credential material + identity contract; this handler forwards everything
// to BE via `BeApprovalsStore.completeApproval()`. BE atomically:
//
//   1. ensures DbUser
//   2. ensures DbAuthIdentity
//   3. ingests secrets into SecretVault (keyed by auth_identity_id)
//   4. inserts DbAccessApproval
//
// then returns `{auth_identity_id, approval_id}`. We mirror a local
// in-memory `access_approval` row keyed off the BE-returned `approvalId`
// so portal's existing `Store.getActiveApproval` lookups keep working
// during the transition. Once portal switches to reading approvals
// directly from BE, the local mirror goes away.
//
// At no point does the auth runtime log secret values. Provider responses
// are consumed inline and thrown away.

import type { ProviderRegistry } from "../providers/registry";
import type { BeApprovalsStore } from "../secret-store/be-approvals";
import type { Store } from "../store";
import type { AccessApproval } from "../types";

export interface CallbackHandlerDeps {
  store: Store;
  providers: ProviderRegistry;
  approvalsStore: BeApprovalsStore;
  now?: () => number;
}

export function makeCallbackHandler(deps: CallbackHandlerDeps) {
  return async function callbackHandler(
    req: Request,
    ctx: { providerName: string; application?: string | null },
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
    if (pending.walletProvider !== ctx.providerName) {
      return text(400, `state token is for provider '${pending.walletProvider}'`);
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

    // `application` comes from the pending row, which was set authoritatively
    // at `beginAuth` time. We ignore `ctx.application` here — if the
    // route handler wants to enforce scoping, it should do so before
    // calling this handler.
    const application = pending.application;
    let beResult: { authIdentityId: number; approvalId: number };
    try {
      beResult = await deps.approvalsStore.completeApproval({
        userId: pending.userId,
        application,
        walletProvider: result.walletProvider,
        walletProviderSubject: result.walletProviderSubject,
        authMethod: result.authMethod,
        authValue: result.authValue,
        isPrimary: result.isPrimary ?? false,
        identityMetadata: result.identityMetadata,
        grantKind: result.grantKind ?? "oauth",
        scopes: result.scopes,
        displayLabel: result.displayLabel,
        expiresAt: result.expiresAt,
        approvalMetadata: result.approvalMetadata,
        secrets: result.secrets,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await deps.store.failPendingAuth(state, `be approvals call failed: ${msg}`);
      return text(500, "auth failed");
    }

    const now = (deps.now ?? Date.now)();
    // Local mirror of the row BE just persisted. Uses BE's `approval_id`
    // as the primary key so the two views agree. The opaque
    // `secretHandle` here just points back at BE's identity-scoped vault
    // (the BE side reads it via `SecretVault::get_identity_secret`).
    const approval: AccessApproval = {
      id: String(beResult.approvalId),
      userId: pending.userId,
      application,
      walletProvider: result.walletProvider,
      displayLabel: result.displayLabel,
      secretHandle: `identity:${beResult.authIdentityId}`,
      grantedAt: now,
    };
    await deps.store.insertApproval(approval);
    await deps.store.completePendingAuth(state, approval.id);

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
