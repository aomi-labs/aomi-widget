// =============================================================================
// Dummy provider — proves the loop end-to-end.
// =============================================================================
//
// `start` renders an inline Approve page (no third-party redirect). The
// page POSTs back to /api/auth/dummy/callback with the state token; the
// callback returns a synthesized DUMMY_TOKEN that the runtime stashes.
//
// This module exists so we can validate the whole begin → user click →
// callback → secret-store → grant → await pipeline before wiring any real
// OAuth.

import type {
  ProviderCallbackRequest,
  ProviderCallbackResponse,
  ProviderModule,
  ProviderStartRequest,
  ProviderStartResponse,
} from "./types";

function approvePage(state: string, callbackUrl: string): string {
  // Minimal HTML — no styling, no framework. The user sees a button, clicks
  // it, the form POSTs to the callback URL with the state token.
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Dummy approve</title></head>
  <body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem;">
    <h1>Approve dummy connection</h1>
    <p>A caller is requesting to connect the <strong>dummy</strong> provider for your Aomi account.</p>
    <p>State: <code>${escapeHtml(state)}</code></p>
    <form method="post" action="${escapeHtml(callbackUrl)}">
      <input type="hidden" name="state" value="${escapeHtml(state)}" />
      <button type="submit" style="padding: 0.5rem 1rem; font-size: 1rem;">Approve</button>
    </form>
  </body>
</html>`;
}

function donePage(label: string): string {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Connected</title></head>
  <body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem;">
    <h1>Connected</h1>
    <p><strong>${escapeHtml(label)}</strong> is now linked to your Aomi account.</p>
    <p>You can close this tab.</p>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const dummyProvider: ProviderModule = {
  name: "dummy",

  async start(req: ProviderStartRequest): Promise<ProviderStartResponse> {
    const callbackUrl = `${req.baseUrl}/api/auth/dummy/callback`;
    return {
      kind: "html",
      body: approvePage(req.pending.stateToken, callbackUrl),
    };
  },

  async callback(
    req: ProviderCallbackRequest,
  ): Promise<ProviderCallbackResponse> {
    // Synthesize a fake token — namespaced by user so multiple users don't
    // collide in a memory secret store during testing.
    const token = `dummy_token_${req.pending.userId}_${Date.now()}`;
    const label = `Dummy — ${req.pending.userId.slice(0, 8)}`;
    // Synthetic identity material so the BE atomic-approval endpoint can
    // upsert a DbAuthIdentity row for this dummy login. We treat it as a
    // global Aomi identity (application=null) with email-method auth on
    // a synthesized address.
    const syntheticEmail = `${req.pending.userId}@dummy.aomi.local`;
    return {
      secrets: { DUMMY_TOKEN: token },
      displayLabel: label,
      body: donePage(label),
      walletProvider: "dummy",
      walletProviderSubject: `dummy:${req.pending.userId}`,
      authMethod: "email",
      authValue: syntheticEmail,
      isPrimary: false,
      grantKind: "oauth",
      identityMetadata: { synthetic: true },
    };
  },
};
