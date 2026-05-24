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

  // -------------------------------------------------------------------------
  // Identity contract for the atomic POST /api/_internal/approvals call.
  // -------------------------------------------------------------------------
  //
  // Each provider knows what kind of identity it just authenticated; the
  // callback handler forwards this to the BE so it can upsert the right
  // `DbAuthIdentity` row.

  /** Stable identifier of the wallet provider behind this identity:
   *  'privy' / 'para' / 'dummy'. Matches `DbAuthIdentity.wallet_provider`. */
  walletProvider: string;

  /** Provider-issued stable subject (e.g. Privy DID). NULL when the
   *  provider has no equivalent (e.g. raw API-key apps). */
  walletProviderSubject: string | null;

  /** How the user proved who they are: 'email' / 'phone' / 'x' /
   *  'google' / 'wallet' / etc. Matches `DbAuthIdentity.auth_method`. */
  authMethod: string;

  /** Raw auth value the user authenticated with (email address, phone
   *  number, X handle, wallet address). BE normalizes for storage. */
  authValue: string;

  /** Mark this identity as primary for the user. False is fine for
   *  v1; the BE handles primary-uniqueness via the partial index. */
  isPrimary?: boolean;

  /** Optional opaque metadata the provider wants persisted on the
   *  identity row (e.g. Privy's linkedAccounts summary). */
  identityMetadata?: Record<string, unknown>;

  // -------------------------------------------------------------------------
  // Approval-level fields.
  // -------------------------------------------------------------------------

  /** 'oauth' / 'api_key' / 'delegated_signer'. v1 always 'oauth' for the
   *  providers we ship. */
  grantKind?: string;

  /** OAuth scopes (or equivalent) carried by this grant. Empty for v1
   *  unless the provider exposed them. */
  scopes?: string[];

  /** Unix timestamp (seconds) the credential expires. NULL for grants
   *  that don't expire (API keys, dummy). */
  expiresAt?: number;

  /** Approval-level metadata (e.g. session-signer config, sponsorship
   *  policy id). Separate from `identityMetadata` because it's per-
   *  approval (multiple approvals can share one identity over time). */
  approvalMetadata?: Record<string, unknown>;
}

export interface ProviderModule {
  /** Stable identifier — also the URL slug under `/api/auth/{name}`. */
  name: string;

  start(req: ProviderStartRequest): Promise<ProviderStartResponse>;

  callback(req: ProviderCallbackRequest): Promise<ProviderCallbackResponse>;
}
