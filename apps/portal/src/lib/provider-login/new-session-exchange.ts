/**
 * New-session provider sign-in. Verifies the Privy/Para token and mints a
 * Better Auth session cookie. Distinct from `EXISTING_SESSION_PROVIDER_EXCHANGE_PATH`,
 * which requires an already-authenticated principal and only links.
 *
 * Do not fold these into one URL that branches on "has a cookie": a widget
 * (credentials omit) or a missing session must not be able to mint a portal
 * cookie, and a link call must not silently create an account.
 */
export const NEW_SESSION_PROVIDER_EXCHANGE_PATH =
  "/api/auth/aomi/provider/exchange";

export const EXISTING_SESSION_PROVIDER_EXCHANGE_PATH =
  "/api/aomi/provider/exchange";

export function exchangeNewSessionProviderCredential(
  credential: unknown,
): Promise<Response> {
  return fetch(NEW_SESSION_PROVIDER_EXCHANGE_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(credential),
  });
}
