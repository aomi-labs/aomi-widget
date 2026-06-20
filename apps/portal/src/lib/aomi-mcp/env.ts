// =============================================================================
// Env config for the portal MCP backend bridge.
// =============================================================================
//
// Centralized so route handlers don't sprinkle `process.env` reads.
// All values are read lazily because Next route modules can be evaluated at
// build time.

export interface AomiMcpEnv {
  beUrl: string;
  authToken: string;
  devUserId: string;
}

export function readAomiMcpEnv(): AomiMcpEnv {
  const beUrl =
    process.env.AOMI_BE_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    "http://localhost:8080";

  const authToken = process.env.AOMI_AUTH_TOKEN ?? "dev-aomi-auth-token";
  const devUserId =
    process.env.AOMI_DEV_USER_ID ?? "00000000-0000-0000-0000-000000000001";

  return {
    beUrl,
    authToken,
    devUserId,
  };
}
