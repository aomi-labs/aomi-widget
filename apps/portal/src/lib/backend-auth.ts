"use client";

/**
 * Which credential the widget presents to the Rust backend for data calls
 * (`/api/sessions`, `/api/chat`, `/api/state`). Selected explicitly by
 * `NEXT_PUBLIC_AOMI_AUTH_MODE` — never by hostname.
 *
 *   "legacy"      — exchange the wallet provider token for a backend account
 *                   bearer at `POST /api/account/sessions/exchange`.
 *   "better-auth" — use the Better Auth/BFF account session and the
 *                   product-mono-compatible AomiBearer minted by this BFF. In
 *                   same-origin portal calls the Next proxy injects that bearer
 *                   server-side; direct-backend callers fetch the same bearer at
 *                   `GET /api/bff/auth/token`.
 *
 * Default is "legacy" so an empty/misconfigured env does not silently switch a
 * deployment. The BetterAuth identity layer (sessions, account graph,
 * SIWE/provider linking) runs regardless of this flag — it only selects the
 * backend data bearer path.
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
