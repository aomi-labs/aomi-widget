import { createRemoteJWKSet, importSPKI, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import {
  mintAccountBearer,
  resolveOrCreateCanonicalUser,
} from "@aomi-labs/account";
import { setSessionCookie } from "@portal/lib/aomi-account/session";

// Account graph reads/writes + bearer signing need Node (pg, EdDSA), not Edge.
export const runtime = "nodejs";

type Provider = "para" | "privy";

type ExchangeBody = {
  provider?: unknown;
  provider_jwt?: unknown;
  providerJwt?: unknown;
  jwt?: unknown;
  key_id?: unknown;
  keyId?: unknown;
  application?: unknown;
  // TMP(account-graph): the connected embedded wallet address, used to bridge
  // returning wallet-first users to their existing account (see the
  // resolveOrCreateCanonicalUser call below).
  address?: unknown;
};

type VerifiedEmbeded = {
  provider: Provider;
  subject: string;
  email?: string;
  email_verified: boolean;
};

type Claims = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExchangeBody;
    const verified = await verifyCredential(body);

    // Resolve-or-create OUR canonical user for this linked credential, then
    // establish OUR session. The provider subject (a DID) is only the
    // credential key — `sub` is the canonical UUID the find-only backend
    // resolves. A returning user lands on her existing UUID (keeps her history);
    // only a new `(provider, subject)` mints a new account.
    const { userId } = await resolveOrCreateCanonicalUser({
      provider: verified.provider,
      subject: verified.subject,
      application: stringValue(body.application),
      // TMP(account-graph): bridge returning wallet-first users to their existing
      // (wallet-keyed) account + sessions, keyed by the connected address. Trusted
      // as supplied for this week's stopgap; the account-graph refactor will add
      // real wallet-ownership proof. See ResolveInput.walletAddress.
      walletAddress: stringValue(body.address),
    });

    // The AccountBearer is derived from the resolved user. Returned for the
    // current browser-held path; the session cookie is the seam for proxy-inject
    // (Option 2), where the browser holds nothing and the proxy adds the header.
    const { accessToken, expiresAt } = await mintAccountBearer(userId);

    const response = NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_at: expiresAt,
      user_id: userId,
    });
    await setSessionCookie(response, userId);
    return response;
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Account exchange failed";
    return NextResponse.json({ error: message }, { status });
  }
}

async function verifyCredential(body: ExchangeBody): Promise<VerifiedEmbeded> {
  const provider = stringValue(body.provider)?.toLowerCase();
  const jwt = stringValue(body.provider_jwt ?? body.providerJwt ?? body.jwt);
  if ((provider !== "privy" && provider !== "para") || !jwt) {
    throw new HttpError(400, "Missing provider credential");
  }
  return provider === "privy"
    ? verifyPrivy(jwt)
    : verifyPara(jwt, stringValue(body.key_id ?? body.keyId));
}

async function verifyPrivy(jwt: string): Promise<VerifiedEmbeded> {
  // Privy signs access + identity tokens with one app keypair, so there's a
  // single public verification key; `aud` is the (public) app id.
  const appId = env("NEXT_PUBLIC_PRIVY_APP_ID");
  const key = env("PRIVY_JWT_VERIFICATION_KEY")?.replaceAll("\\n", "\n");
  if (!appId || !key) {
    throw new HttpError(503, "Privy exchange is not configured");
  }

  const { payload } = await jwtVerify<Claims>(
    jwt,
    await importSPKI(key, "ES256"),
    { issuer: "privy.io", audience: appId },
  ).catch(() => {
    throw new HttpError(401, "Invalid Privy credential");
  });
  if (!payload.sub?.startsWith("did:privy:")) {
    throw new HttpError(401, "Invalid Privy subject");
  }
  return verifiedIdentity("privy", payload);
}

async function verifyPara(
  jwt: string,
  keyId?: string,
): Promise<VerifiedEmbeded> {
  if (!env("NEXT_PUBLIC_PARA_API_KEY")) {
    throw new HttpError(503, "Para exchange is not configured");
  }
  // Para sets `aud` to the API key's unique *ID* (a UUID from the dashboard),
  // NOT the API key string — so we validate against PARA_API_KEY_ID. When it's
  // unset we skip the audience check (the JWKS-verified signature already proves
  // the token is genuinely Para's); set PARA_API_KEY_ID to lock tokens to this
  // app before production.
  const audience = env("PARA_API_KEY_ID");

  const { payload, protectedHeader } = await verifyParaToken(
    jwt,
    audience ? { audience } : undefined,
  ).catch(() => {
    throw new HttpError(401, "Invalid Para credential");
  });
  if (keyId && protectedHeader.kid && keyId !== protectedHeader.kid) {
    throw new HttpError(401, "Invalid Para key id");
  }
  if (!payload.sub) throw new HttpError(401, "Invalid Para subject");
  return verifiedIdentity("para", payload);
}

function verifiedIdentity(provider: Provider, claims: Claims): VerifiedEmbeded {
  return {
    provider,
    subject: claims.sub!,
    email: cleanEmail(claims.email),
    email_verified: Boolean(claims.email_verified),
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

// Para publishes one JWKS per environment (docs.getpara.com), and tokens are
// signed by an environment-specific key — so the verify URL must match the env
// the login actually runs in, driven by NEXT_PUBLIC_PARA_ENVIRONMENT. (A BETA
// login is signed by a `kid` that is absent from the PROD JWKS, which made the
// previously-hardcoded PROD URL reject every BETA token.)
const PARA_JWKS_BY_ENV = {
  PROD: "https://api.getpara.com/.well-known/jwks.json",
  BETA: "https://api.beta.getpara.com/.well-known/jwks.json",
} as const;

// Verify against Para's env-configured JWKS first, then fall back to the other
// environment's — tokens are signed per-environment and the configured
// NEXT_PUBLIC_PARA_ENVIRONMENT can lag the SDK's actual environment, so we match
// whichever JWKS actually holds the token's `kid`.
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

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function cleanEmail(value: unknown): string | undefined {
  return typeof value === "string" && value.includes("@")
    ? value.trim().toLowerCase()
    : undefined;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
