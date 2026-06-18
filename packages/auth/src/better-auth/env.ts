export interface AccountAuthEnv {
  betterAuthSecret: string;
  betterAuthUrl: string;
  databaseUrl: string;
  siweDomain: string;
  siweEmailDomain?: string;
  trustedOrigins: string[];
  privyAppId?: string;
  privyAccessTokenVerificationKey?: string;
  privyIdentityTokenVerificationKey?: string;
  paraAudience?: string;
  paraJwksUrl?: string;
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
    privyAccessTokenVerificationKey: env.PRIVY_JWT_VERIFICATION_KEY,
    privyIdentityTokenVerificationKey:
      env.PRIVY_IDENTITY_JWT_VERIFICATION_KEY ?? env.PRIVY_JWT_VERIFICATION_KEY,
    paraAudience: env.PARA_API_KEY ?? env.NEXT_PUBLIC_PARA_API_KEY,
    paraJwksUrl: env.PARA_JWKS_URL,
  };
}

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
