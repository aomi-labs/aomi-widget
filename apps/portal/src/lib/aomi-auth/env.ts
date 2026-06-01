// =============================================================================
// Env config for Aomi MCP + auth.
// =============================================================================
//
// Centralized so route handlers don't sprinkle `process.env` reads.
// All values are read lazily — Next route modules can be evaluated at build
// time, and we don't want to throw there.

export interface AomiAuthEnv {
  beUrl: string;
  authToken: string;
  baseUrl: string;
  devUserId: string;
  /** Aomi's Privy app ID. Public — surfaces in the /auth/privy/login page
   *  query so the React SDK can boot. If unset, the Privy provider isn't
   *  registered and /api/auth/privy/* returns 404. */
  privyAppId?: string;
}

export function readEnv(): AomiAuthEnv {
  const beUrl =
    process.env.AOMI_BE_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    "http://localhost:8080";

  // Static shared secret between BE and portal for /api/auth/begin and
  // /api/_internal/secrets. Both sides read from env.
  const authToken = process.env.AOMI_AUTH_TOKEN ?? "dev-aomi-auth-token";

  // Base URL the auth flow embeds in auth_url responses. In dev with ngrok,
  // set this to the ngrok URL so the user can click through from outside
  // localhost (e.g. a browser tab opened by Claude).
  const baseUrl =
    process.env.AOMI_PORTAL_BASE_URL ??
    process.env.NGROK_URL ??
    "http://localhost:3000";

  // Fallback Aomi user id used when the X-Aomi-User header is missing.
  // Useful for local MCP Inspector runs. Production replaces with plugin
  // OAuth bearer resolution.
  const devUserId =
    process.env.AOMI_DEV_USER_ID ?? "00000000-0000-0000-0000-000000000001";

  // Public — fine to read directly. The login page also reads it via
  // NEXT_PUBLIC_PRIVY_APP_ID since it boots client-side.
  const privyAppId =
    process.env.PRIVY_APP_ID ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  return { beUrl, authToken, baseUrl, devUserId, privyAppId };
}
