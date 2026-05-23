// =============================================================================
// Provider contract.
// =============================================================================
//
// A provider plugs into the auth flow at three points:
//
//   1. `start` — what the user sees when they open the auth URL. Most real
//      providers redirect to a third-party authorize endpoint here. The
//      dummy provider just renders an "Approve" page.
//
//   2. `callback` — what runs when the third party returns the user. The
//      provider materializes the credential (OAuth code → token exchange,
//      API-key form submission, …) and hands a name→value map back. The
//      runtime stashes it via the SecretStore + writes the metadata row.
//
//   3. `displayLabel` — what to render in app_grants for the user.
//
// Providers are pure functions of their inputs; they don't touch the store
// or secret-store themselves. The route handler factories in `routes/` do.

import type { PendingAuth } from "../types";

export interface ProviderStartRequest {
  pending: PendingAuth;
  baseUrl: string;
}

export interface ProviderStartResponse {
  /** Either an HTML body to render directly (e.g. dummy "Approve" page)
   *  or a redirect URL (e.g. real OAuth authorize endpoint). */
  kind: "html" | "redirect";
  body?: string;
  redirectUrl?: string;
}

export interface ProviderCallbackRequest {
  pending: PendingAuth;
  query: Record<string, string>;
  body?: Record<string, string>;
}

export interface ProviderCallbackResponse {
  /** Credential slots to stash (name → value). */
  secrets: Record<string, string>;
  /** What to show the user as the grant label. */
  displayLabel: string;
  /** Optional HTML to render in the browser instead of a generic "done"
   *  page. Most providers should leave this unset. */
  body?: string;
}

export interface ProviderModule {
  /** Stable identifier — also the URL slug under `/api/auth/{name}`. */
  name: string;

  start(req: ProviderStartRequest): Promise<ProviderStartResponse>;

  callback(req: ProviderCallbackRequest): Promise<ProviderCallbackResponse>;
}
