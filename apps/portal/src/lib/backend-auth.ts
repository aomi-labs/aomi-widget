"use client";

/**
 * Which credential the widget presents to the Rust backend for data calls
 * (`/api/sessions`, `/api/chat`, `/api/state`). Selected explicitly by
 * `NEXT_PUBLIC_AOMI_AUTH_MODE` — never by hostname.
 *
 *   "legacy"      — exchange the wallet provider token for a backend account
 *                   bearer at `POST /api/account/sessions/exchange`. This is the
 *                   path that works today; keep it until the backend trusts our
 *                   BFF-issued token.
 *   "better-auth" — fetch a BFF-signed JWT from `GET /api/auth/token` and send
 *                   it as the bearer. This only works once the Rust backend is
 *                   provisioned to verify our issuer's key. NOTE: production
 *                   (product-mono `origin/main`) verifies an EdDSA, role-based
 *                   "AomiBearer" minted by the BFF — see
 *                   product-mono `docs/topics/account-authentication/facts/service-identity.md`.
 *                   That is a different token shape than today's BetterAuth
 *                   `/api/auth/token` output, so do not flip this on against
 *                   production until the portal mints an AomiBearer whose
 *                   `iss`/`kid` is trusted in the backend's `service.<env>.toml`.
 *
 * Default is "legacy" so an empty/misconfigured env can never silently switch a
 * deployment onto a token the backend can't verify. The BetterAuth identity
 * layer (sessions, account graph, SIWE/provider linking) runs regardless of this
 * flag — it only selects the backend data bearer.
 */
export type BackendAuthMode = "legacy" | "better-auth";

export function getBackendAuthMode(): BackendAuthMode {
  const raw = process.env.NEXT_PUBLIC_AOMI_AUTH_MODE;
  return typeof raw === "string" && raw.trim().toLowerCase() === "better-auth"
    ? "better-auth"
    : "legacy";
}

export function shouldUseBetterAuthBackendJwt(): boolean {
  return getBackendAuthMode() === "better-auth";
}
