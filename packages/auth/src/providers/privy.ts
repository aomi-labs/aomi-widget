// =============================================================================
// Privy provider — Aomi-owned Privy app login.
// =============================================================================
//
// Variant A in the design: Alice authenticates with Privy through *Aomi's*
// Privy app. Her embedded wallet lives under Aomi's app, so Aomi BE can sign
// on her behalf for whatever protocol (byreal perps, dydx, aave, …) without
// going through any third party's backend.
//
// Why Privy is special compared to a generic OAuth provider:
//
//   * Privy has no generic hosted-login → callback?code=... flow. Login
//     happens via their React SDK inside a page you host. After the user
//     completes their chosen login method (email/SMS/wallet/etc.), the SDK
//     exposes the access token (an ES256 JWT, sub = user's Privy DID) and
//     the list of linked wallets.
//
//   * Therefore `start()` here doesn't render Privy's login UI inline — it
//     redirects to a portal-hosted Next.js page that mounts
//     `<PrivyProvider>` and drives the login flow client-side. That page
//     POSTs the collected credentials back to this provider's `callback()`,
//     which stashes them via the SecretStore.
//
// What gets stashed at callback time (v0):
//
//   PRIVY_ACCESS_TOKEN   The JWT. ~1h lifetime. BE uses it to call
//                        `POST /v1/wallets/authenticate` later for an
//                        ephemeral signing key.
//   PRIVY_USER_ID        Alice's Privy DID (the JWT's `sub` claim).
//   PRIVY_WALLET_ID      The wallet's stable ID — used in
//                        `POST /v1/wallets/{wallet_id}/rpc`.
//   PRIVY_WALLET_ADDRESS Alice's EVM address. Not a secret (it's public),
//                        but stashed here so every BE caller doesn't have
//                        to look it up via the wallet ID.
//
// What's deliberately NOT here (separate PRs):
//
//   * The /auth/privy/login Next.js page. That belongs to the portal app
//     (apps/portal/...), not to this package. The page hosts the React SDK
//     and POSTs to /api/auth/privy/callback with the fields above.
//
//   * Server-side JWT validation. The state token already gates the
//     callback (single-use, provider-bound). BE will validate the JWT on
//     first use via `/v1/wallets/authenticate` — bogus tokens fail there.
//     Layer in JWKS verification later if we ever want pre-validation.
//
//   * The authorization-key-as-owner upgrade that lets Aomi BE sign for
//     Alice's wallet when she's offline. That's a Privy API call against
//     the wallet (configures an Aomi-controlled P-256 key as an owner) and
//     is a BE-side concern, not a provider concern.

import type {
  ProviderCallbackRequest,
  ProviderCallbackResponse,
  ProviderModule,
  ProviderStartRequest,
  ProviderStartResponse,
} from "./types";

export interface PrivyProviderConfig {
  /** Aomi's Privy app ID. Surfaces in the `start` redirect so the portal
   *  page can boot `<PrivyProvider>` with the right credential. Public. */
  appId: string;

  /** Optional override of where the portal hosts the login page. Defaults
   *  to `${baseUrl}/auth/privy`. Override in tests or if the portal moves
   *  the page. */
  loginPagePath?: string;
}

/** Fields the portal-hosted login page POSTs to /api/auth/privy/callback
 *  after Alice completes login. Snake_case to match the rest of the auth
 *  HTTP surface (begin/await use snake_case wire fields). */
interface PrivyCallbackBody {
  state: string;
  access_token: string;
  user_id: string;
  wallet_id: string;
  wallet_address: string;
}

export function makePrivyProvider(config: PrivyProviderConfig): ProviderModule {
  const loginPath = config.loginPagePath ?? "/auth/privy";

  return {
    name: "privy",

    async start(req: ProviderStartRequest): Promise<ProviderStartResponse> {
      // Redirect to the portal-hosted React page. That page reads `state`
      // and `app_id` off the query string, mounts <PrivyProvider>, and
      // drives login. After login it POSTs to /api/auth/privy/callback.
      const url = new URL(loginPath, req.baseUrl);
      url.searchParams.set("state", req.pending.stateToken);
      url.searchParams.set("app_id", config.appId);
      return {
        kind: "redirect",
        redirectUrl: url.toString(),
      };
    },

    async callback(
      req: ProviderCallbackRequest,
    ): Promise<ProviderCallbackResponse> {
      const body = parseCallbackBody(req);

      // Sanity-check `user_id` shape — Privy DIDs look like `did:privy:...`.
      // Cheap defense against the portal page POSTing something obviously
      // wrong. Real validation happens BE-side when the JWT is used.
      if (!body.user_id.startsWith("did:privy:")) {
        throw new Error(
          `privy callback: user_id does not look like a Privy DID`,
        );
      }
      if (!/^0x[0-9a-fA-F]{40}$/.test(body.wallet_address)) {
        throw new Error(
          `privy callback: wallet_address is not a 40-char hex EVM address`,
        );
      }

      const labelAddr = `${body.wallet_address.slice(0, 6)}…${body.wallet_address.slice(-4)}`;

      return {
        secrets: {
          PRIVY_ACCESS_TOKEN: body.access_token,
          PRIVY_USER_ID: body.user_id,
          PRIVY_WALLET_ID: body.wallet_id,
          PRIVY_WALLET_ADDRESS: body.wallet_address,
        },
        displayLabel: `Privy — ${labelAddr}`,
        body: donePage(labelAddr),
      };
    },
  };
}

function parseCallbackBody(req: ProviderCallbackRequest): PrivyCallbackBody {
  const src = req.body ?? {};
  const required = [
    "state",
    "access_token",
    "user_id",
    "wallet_id",
    "wallet_address",
  ] as const;
  for (const k of required) {
    if (!src[k] || typeof src[k] !== "string") {
      throw new Error(`privy callback: missing required field '${k}'`);
    }
  }
  return {
    state: src.state,
    access_token: src.access_token,
    user_id: src.user_id,
    wallet_id: src.wallet_id,
    wallet_address: src.wallet_address,
  };
}

function donePage(labelAddr: string): string {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Privy connected</title></head>
  <body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem;">
    <h1>Privy connected</h1>
    <p>Your Privy wallet <code>${escapeHtml(labelAddr)}</code> is now linked to your Aomi account.</p>
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
