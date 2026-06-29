import { createRemoteJWKSet, importSPKI, jwtVerify } from "jose";

/**
 * Provider-credential verification (Privy / Para) for the auth exchange.
 *
 * DROP-IN NOTE (arixon's BetterAuth, `codex/widget-auth-pre-rust`): the *shapes*
 * here mirror `@aomi-labs/auth/providers` — `ProviderTokenCredential` (input),
 * `VerifiedProviderToken` (output), and the `verifyProviderCredential` /
 * `verifyPrivyToken` / `verifyParaJwt` seam — so his verifiers replace these with
 * no exchange-route change at merge. (The exchange *flow* still gets reframed:
 * ours creates the session from the provider; his links a provider to an existing
 * BetterAuth session. See docs/handoffs/base-siwe-betterauth-dropin.md.)
 */
export type AccountCredentialProvider = "privy" | "para" | (string & {});

/** The normalized provider credential a verifier consumes (his shape). */
export type ProviderTokenCredential = {
  provider: AccountCredentialProvider;
  providerToken: string;
  tokenKind?: string;
  keyId?: string;
};

/** A verified provider token (his shape) — `subject` is the credential key. */
export type VerifiedProviderToken = {
  subject: string;
  expiresAt?: number;
  email?: string;
  emailVerified?: boolean;
  providerMetadata: Record<string, unknown>;
};

export type VerifiedProviderTokenCredential = {
  provider: AccountCredentialProvider;
  token: VerifiedProviderToken;
};

export type ProviderCredentialVerifier = (
  credential: ProviderTokenCredential,
) => Promise<VerifiedProviderToken>;

/** Carries an HTTP status so the route maps verification failures faithfully. */
export class ProviderCredentialError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Claims = {
  sub?: string;
  exp?: number;
  email?: string;
  email_verified?: boolean;
  [key: string]: unknown;
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

/**
 * Verify a Privy access/identity token. Privy signs with one app keypair, so a
 * single ES256 public key verifies it; `aud` is the (public) app id.
 */
export async function verifyPrivyToken(input: {
  token: string;
  appId: string;
  verificationKey: string;
}): Promise<VerifiedProviderToken> {
  const key = input.verificationKey.replaceAll("\\n", "\n");
  const { payload } = await jwtVerify<Claims>(
    input.token,
    await importSPKI(key, "ES256"),
    { issuer: "privy.io", audience: input.appId },
  ).catch(() => {
    throw new ProviderCredentialError(401, "Invalid Privy credential");
  });
  if (!payload.sub?.startsWith("did:privy:")) {
    throw new ProviderCredentialError(401, "Invalid Privy subject");
  }
  return toVerifiedToken(payload);
}

/**
 * Verify a Para JWT against Para's env-specific JWKS. `expectedAudience` is the
 * API key's unique *ID* (PARA_API_KEY_ID); when unset the audience check is
 * skipped (the JWKS-verified signature already proves the token is Para's).
 */
export async function verifyParaJwt(input: {
  token: string;
  expectedAudience?: string;
  keyId?: string;
}): Promise<VerifiedProviderToken> {
  const { payload, protectedHeader } = await verifyParaToken(
    input.token,
    input.expectedAudience ? { audience: input.expectedAudience } : undefined,
  ).catch(() => {
    throw new ProviderCredentialError(401, "Invalid Para credential");
  });
  if (input.keyId && protectedHeader.kid && input.keyId !== protectedHeader.kid) {
    throw new ProviderCredentialError(401, "Invalid Para key id");
  }
  if (!payload.sub) throw new ProviderCredentialError(401, "Invalid Para subject");
  return toVerifiedToken(payload);
}

/**
 * Dispatch a normalized credential to its provider verifier (his
 * `verifyProviderCredential` seam). Reads provider config from env, matching the
 * exchange's existing behavior.
 */
export async function verifyProviderCredential(
  credential: ProviderTokenCredential,
): Promise<VerifiedProviderTokenCredential> {
  const provider = credential.provider?.toLowerCase();
  if (!credential.providerToken) {
    throw new ProviderCredentialError(400, "Missing provider credential");
  }

  if (provider === "privy") {
    const appId = env("NEXT_PUBLIC_PRIVY_APP_ID");
    const verificationKey = env("PRIVY_JWT_VERIFICATION_KEY");
    if (!appId || !verificationKey) {
      throw new ProviderCredentialError(503, "Privy exchange is not configured");
    }
    return {
      provider: "privy",
      token: await verifyPrivyToken({
        token: credential.providerToken,
        appId,
        verificationKey,
      }),
    };
  }

  if (provider === "para") {
    if (!env("NEXT_PUBLIC_PARA_API_KEY")) {
      throw new ProviderCredentialError(503, "Para exchange is not configured");
    }
    return {
      provider: "para",
      token: await verifyParaJwt({
        token: credential.providerToken,
        expectedAudience: env("PARA_API_KEY_ID"),
        keyId: credential.keyId,
      }),
    };
  }

  throw new ProviderCredentialError(
    400,
    `Unsupported account credential provider: ${credential.provider}`,
  );
}

function toVerifiedToken(payload: Claims): VerifiedProviderToken {
  return {
    subject: payload.sub!,
    expiresAt: typeof payload.exp === "number" ? payload.exp : undefined,
    email: cleanEmail(payload.email),
    emailVerified: Boolean(payload.email_verified),
    providerMetadata: { ...payload },
  };
}

function jwks(url: string): ReturnType<typeof createRemoteJWKSet> {
  const cached = jwksCache.get(url);
  if (cached) return cached;
  const next = createRemoteJWKSet(new URL(url));
  jwksCache.set(url, next);
  return next;
}

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

// Para publishes one JWKS per environment (docs.getpara.com); tokens are signed
// by an environment-specific key, so the verify URL must match the env the login
// ran in, driven by NEXT_PUBLIC_PARA_ENVIRONMENT.
const PARA_JWKS_BY_ENV = {
  PROD: "https://api.getpara.com/.well-known/jwks.json",
  BETA: "https://api.beta.getpara.com/.well-known/jwks.json",
} as const;

// Verify against the env-configured JWKS first, then fall back to the other —
// the configured NEXT_PUBLIC_PARA_ENVIRONMENT can lag the SDK's actual env, so we
// match whichever JWKS actually holds the token's `kid`.
async function verifyParaToken(
  jwt: string,
  options: Parameters<typeof jwtVerify>[2],
) {
  const urls =
    env("NEXT_PUBLIC_PARA_ENVIRONMENT")?.toUpperCase() === "BETA"
      ? [PARA_JWKS_BY_ENV.BETA, PARA_JWKS_BY_ENV.PROD]
      : [PARA_JWKS_BY_ENV.PROD, PARA_JWKS_BY_ENV.BETA];
  let lastError: unknown;
  for (const url of urls) {
    try {
      return await jwtVerify<Claims>(jwt, jwks(url), options);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function cleanEmail(value: unknown): string | undefined {
  return typeof value === "string" && value.includes("@")
    ? value.trim().toLowerCase()
    : undefined;
}
