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

type AccountAuthEnvInput = Record<string, string | undefined>;

const DEV_BETTER_AUTH_SECRET =
  "dev-better-auth-secret-change-me-at-least-32-bytes";
const DEV_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/aomi_auth";

export function readAccountAuthEnv(
  env: AccountAuthEnvInput = process.env,
): AccountAuthEnv {
  const betterAuthUrl = resolveBetterAuthUrl(env);
  const url = new URL(betterAuthUrl);
  const allowDevDefaults = isAccountAuthLocalRuntime(env);
  return {
    betterAuthSecret: requiredAuthEnvValue({
      env,
      key: "BETTER_AUTH_SECRET",
      devDefault: DEV_BETTER_AUTH_SECRET,
      allowDevDefaults,
    }),
    betterAuthUrl,
    databaseUrl: requiredAuthEnvValue({
      env,
      key: "DATABASE_URL",
      devDefault: DEV_DATABASE_URL,
      allowDevDefaults,
    }),
    siweDomain: resolveSiweDomain(env, url.host),
    siweEmailDomain: env.AOMI_AUTH_EMAIL_DOMAIN,
    trustedOrigins: collectTrustedOrigins(env, betterAuthUrl),
    privyAppId: env.PRIVY_APP_ID ?? env.NEXT_PUBLIC_PRIVY_APP_ID,
    privyAppSecret: env.PRIVY_APP_SECRET,
    privyAccessTokenVerificationKey: env.PRIVY_JWT_VERIFICATION_KEY,
    privyIdentityTokenVerificationKey:
      env.PRIVY_IDENTITY_JWT_VERIFICATION_KEY ?? env.PRIVY_JWT_VERIFICATION_KEY,
    paraAudience:
      env.PARA_JWT_AUDIENCE ??
      env.PARA_AUDIENCE ??
      env.PARA_API_KEY ??
      env.NEXT_PUBLIC_PARA_API_KEY,
    paraJwksUrl: env.PARA_JWKS_URL,
    paraApiKey: env.PARA_API_SECRET_KEY,
  };
}

export function isAccountAuthLocalRuntime(
  env: AccountAuthEnvInput = process.env,
): boolean {
  return env.NODE_ENV === "development" || env.NODE_ENV === "test";
}

function requiredAuthEnvValue(input: {
  env: AccountAuthEnvInput;
  key: "BETTER_AUTH_SECRET" | "DATABASE_URL";
  devDefault: string;
  allowDevDefaults: boolean;
}): string {
  const value = input.env[input.key]?.trim();
  if (value && (input.allowDevDefaults || value !== input.devDefault)) {
    return value;
  }
  if (input.allowDevDefaults) return input.devDefault;
  throw new Error(
    `${input.key} must be configured outside NODE_ENV=development/test`,
  );
}

function resolveBetterAuthUrl(env: AccountAuthEnvInput): string {
  const vercelDeploymentUrl = firstUrl(env.VERCEL_BRANCH_URL, env.VERCEL_URL);

  if (env.VERCEL_ENV === "preview" && vercelDeploymentUrl) {
    return vercelDeploymentUrl;
  }

  return (
    firstUrl(
      env.BETTER_AUTH_URL,
      env.AOMI_PORTAL_BASE_URL,
      env.VERCEL_PROJECT_PRODUCTION_URL,
      env.VERCEL_URL,
    ) ?? "http://localhost:3001"
  );
}

function collectTrustedOrigins(
  env: AccountAuthEnvInput,
  betterAuthUrl: string,
): string[] {
  return uniqueOrigins([
    ...parseCsv(env.AOMI_TRUSTED_ORIGINS),
    betterAuthUrl,
    firstUrl(env.VERCEL_BRANCH_URL),
    firstUrl(env.VERCEL_URL),
    firstUrl(env.VERCEL_PROJECT_PRODUCTION_URL),
  ]);
}

function resolveSiweDomain(
  env: AccountAuthEnvInput,
  fallbackHost: string,
): string {
  if (env.VERCEL_ENV === "preview") return fallbackHost;
  return env.AOMI_AUTH_DOMAIN ?? fallbackHost;
}

function firstUrl(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const normalized = normalizeUrl(value);
    if (normalized) return normalized;
  }
  return undefined;
}

function normalizeUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return undefined;
  }
}

function uniqueOrigins(values: Array<string | undefined>): string[] {
  const origins: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const origin = normalizeUrl(value);
    if (!origin || seen.has(origin)) continue;
    seen.add(origin);
    origins.push(origin);
  }
  return origins;
}

function parseCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
