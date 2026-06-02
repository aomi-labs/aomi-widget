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
//     which forwards them to `BeApprovalsStore.completeApproval()`.
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
//   * The authorization-key-as-owner upgrade that lets Aomi BE sign for
//     Alice's wallet when she's offline. That's a Privy API call against
//     the wallet (configures an Aomi-controlled P-256 key as an owner) and
//     is a BE-side concern, not a provider concern.

import { importSPKI, jwtVerify } from "jose";
import type {
  ProviderCallbackRequest,
  ProviderCallbackResponse,
  ProviderModule,
  ProviderStartRequest,
  ProviderStartResponse,
} from "./types";

export interface VerifiedPrivyAccessToken {
  userId: string;
  sessionId: string;
  expiration: number;
}

export type VerifyPrivyAccessToken = (
  accessToken: string,
) => Promise<VerifiedPrivyAccessToken>;

export interface PrivyProviderConfig {
  /** Aomi's Privy app ID. Surfaces in the `start` redirect so the portal
   *  page can boot `<PrivyProvider>` with the right credential. Public. */
  appId: string;

  /** Optional override of where the portal hosts the login page. Defaults
   *  to `${baseUrl}/auth/privy`. Override in tests or if the portal moves
   *  the page. */
  loginPagePath?: string;

  /** Verifies the browser-provided Privy access token on the server. The
   *  callback must never trust browser-reported user IDs without this. */
  verifyAccessToken: VerifyPrivyAccessToken;
}

export interface PrivyJwtVerifierConfig {
  /** Aomi's Privy app ID. Checked against the JWT audience. */
  appId: string;

  /** SPKI public key copied from the Privy dashboard. */
  jwtVerificationKey: string;
}

/** Build a verifier for Privy's ES256 access tokens. Privy documents
 *  issuer `privy.io` and the app ID audience as required checks. */
export function makePrivyJwtVerifier(
  config: PrivyJwtVerifierConfig,
): VerifyPrivyAccessToken {
  const verificationKey = importSPKI(config.jwtVerificationKey, "ES256");

  return async (accessToken: string): Promise<VerifiedPrivyAccessToken> => {
    const { payload } = await jwtVerify(accessToken, await verificationKey, {
      algorithms: ["ES256"],
      audience: config.appId,
      issuer: "privy.io",
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.sid !== "string" ||
      typeof payload.exp !== "number"
    ) {
      throw new Error(
        "privy callback: access token is missing required claims",
      );
    }
    return {
      userId: payload.sub,
      sessionId: payload.sid,
      expiration: payload.exp,
    };
  };
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
      const verifiedToken = await config.verifyAccessToken(body.access_token);

      // The browser reports `user_id`, but the signed token subject is
      // authoritative. Reject cross-subject linking before secrets persist.
      if (verifiedToken.userId !== body.user_id) {
        throw new Error(
          "privy callback: user_id does not match verified token subject",
        );
      }
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
        // Identity contract for BE upsert. v1 client page only collects
        // the Privy DID + wallet address; the auth-method/value pair is
        // synthesized from the DID until the login page also forwards
        // the linked-account info (email/phone/etc).
        walletProvider: "privy",
        walletProviderSubject: body.user_id,
        authMethod: "privy_did",
        authValue: body.user_id,
        isPrimary: false,
        grantKind: "oauth",
        expiresAt: verifiedToken.expiration,
        identityMetadata: {
          privy_session_id: verifiedToken.sessionId,
          wallet_address: body.wallet_address,
          wallet_id: body.wallet_id,
        },
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
