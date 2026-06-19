export interface AccountAuthEnv {
  betterAuthSecret: string;
  betterAuthUrl: string;
  databaseUrl: string;
  siweDomain: string;
  siweEmailDomain?: string;
  trustedOrigins: string[];
  privyAppId?: string;
  /** Server-only Privy app secret. Used as the Basic-auth password for the
   *  Privy REST API (`GET /v1/wallets`) to list wallets attested for a user.
   *  Never expose client-side. */
  privyAppSecret?: string;
  privyAccessTokenVerificationKey?: string;
  privyIdentityTokenVerificationKey?: string;
  paraAudience?: string;
  paraJwksUrl?: string;
  /** Server-only Para REST API key (`X-API-Key`). Used to list wallets attested
   *  for a user via `GET /v1/wallets`. Distinct from `paraAudience` (the public
   *  app id used as the JWT `aud`). Never expose client-side. */
  paraApiKey?: string;
}

export function readAccountAuthEnv(env = process.env): AccountAuthEnv {
  const betterAuthUrl =
    env.BETTER_AUTH_URL ?? env.AOMI_PORTAL_BASE_URL ?? "http://localhost:3001";
  const url = new URL(betterAuthUrl);
  return {
    betterAuthSecret:
      env.BETTER_AUTH_SECRET ??
      "dev-better-auth-secret-change-me-at-least-32-bytes",
    betterAuthUrl,
    databaseUrl:
      env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/aomi_auth",
    siweDomain: env.AOMI_AUTH_DOMAIN ?? url.host,
    siweEmailDomain: env.AOMI_AUTH_EMAIL_DOMAIN,
    trustedOrigins: parseCsv(env.AOMI_TRUSTED_ORIGINS ?? betterAuthUrl),
    privyAppId: env.PRIVY_APP_ID ?? env.NEXT_PUBLIC_PRIVY_APP_ID,
    privyAppSecret: env.PRIVY_APP_SECRET,
    privyAccessTokenVerificationKey: env.PRIVY_JWT_VERIFICATION_KEY,
    privyIdentityTokenVerificationKey:
      env.PRIVY_IDENTITY_JWT_VERIFICATION_KEY ?? env.PRIVY_JWT_VERIFICATION_KEY,
    paraAudience: env.PARA_API_KEY ?? env.NEXT_PUBLIC_PARA_API_KEY,
    paraJwksUrl: env.PARA_JWKS_URL,
    paraApiKey: env.PARA_API_SECRET_KEY,
  };
}

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
