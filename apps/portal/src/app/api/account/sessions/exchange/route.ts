import {
  createRemoteJWKSet,
  importPKCS8,
  importSPKI,
  jwtVerify,
  SignJWT,
} from "jose";
import { NextRequest, NextResponse } from "next/server";

// AccountBearer token convention — must match the Rust `aomi-service` verifier
// (docs/topics/account-authentication/facts/service-identity.md).
const ISSUER = "aomi-bff";
const AUDIENCE = "aomi-backend";
const ACCOUNT_BEARER_TTL_SECONDS = 15 * 60;

type Provider = "para" | "privy";

type ExchangeBody = {
  provider?: unknown;
  provider_token?: unknown;
  providerToken?: unknown;
  token?: unknown;
  key_id?: unknown;
  keyId?: unknown;
};

type VerifiedIdentity = {
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
    const verified = await verifyCredential(
      (await request.json()) as ExchangeBody,
    );
    // Resolve the stable canonical user id (the backend only verifies/finds —
    // it never creates accounts), then sign it into `sub`.
    const canonicalUserId = await resolveCanonicalUserId(verified);
    const { privateKey, kid } = await signingKey();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + ACCOUNT_BEARER_TTL_SECONDS;
    const accessToken = await new SignJWT({ role: "user" })
      .setProtectedHeader({ alg: "EdDSA", kid })
      .setSubject(canonicalUserId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(expiresAt)
      .sign(privateKey);
    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_at: expiresAt,
      user_id: canonicalUserId,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Account exchange failed";
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * Resolve the **stable canonical user id** — the `sub` the backend keys sessions
 * and history on.
 *
 * ⚠️ Identity root is our **Better-Auth session**, not the provider. The live
 * path derives `sub` from our own account (Better Auth: our cookie, our UUID);
 * the provider (Privy/Para) is a *linked credential*, not the identity. So this
 * function's real input is the Better-Auth session — taking a verified provider
 * subject here is the scaffold shape, and `sub = subject` (the DID) is only a
 * stand-in for fresh logins. See the "Identity root" section of
 * docs/topics/account-authentication/facts/service-identity.md.
 *
 * Resolve-or-create against the account graph: read the existing account, return
 * its UUID, else create and return the new UUID. Atomic on the account key
 * (insert-on-conflict) so two concurrent first logins don't mint two users. The
 * id must be **stable**: a returning user (e.g. Alice with prior sessions)
 * resolves to her *existing* UUID — including across the migration that adopts
 * the account-graph store — or her history detaches.
 *
 * TODO(account-graph): implement against the Better-Auth account graph: take the
 * session (not a provider token), resolve-or-create our canonical UUID, and move
 * provider verification to a separate link-credential flow whose output is wallet
 * state (`user_state`), not this bearer. arixoneth's lane.
 */
async function resolveCanonicalUserId(
  verified: VerifiedIdentity,
): Promise<string> {
  return verified.subject;
}

async function verifyCredential(body: ExchangeBody): Promise<VerifiedIdentity> {
  const provider = stringValue(body.provider)?.toLowerCase();
  const token = stringValue(
    body.provider_token ?? body.providerToken ?? body.token,
  );
  if ((provider !== "privy" && provider !== "para") || !token) {
    throw new HttpError(400, "Missing provider credential");
  }
  return provider === "privy"
    ? verifyPrivy(token)
    : verifyPara(token, stringValue(body.key_id ?? body.keyId));
}

async function verifyPrivy(token: string): Promise<VerifiedIdentity> {
  const appId = env("PRIVY_APP_ID") ?? env("NEXT_PUBLIC_PRIVY_APP_ID");
  const key = (
    env("PRIVY_IDENTITY_JWT_VERIFICATION_KEY") ??
    env("PRIVY_JWT_VERIFICATION_KEY")
  )?.replaceAll("\\n", "\n");
  if (!appId || !key) {
    throw new HttpError(503, "Privy exchange is not configured");
  }

  const { payload } = await jwtVerify<Claims>(
    token,
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
  token: string,
  keyId?: string,
): Promise<VerifiedIdentity> {
  const audience =
    env("PARA_AUDIENCE") ??
    env("PARA_API_KEY") ??
    env("NEXT_PUBLIC_PARA_API_KEY");
  const jwksUrl = env("PARA_JWKS_URL");
  if (!audience || !jwksUrl) {
    throw new HttpError(503, "Para exchange is not configured");
  }

  const { payload, protectedHeader } = await jwtVerify<Claims>(
    token,
    jwks(jwksUrl),
    { audience },
  ).catch(() => {
    throw new HttpError(401, "Invalid Para credential");
  });
  if (keyId && protectedHeader.kid && keyId !== protectedHeader.kid) {
    throw new HttpError(401, "Invalid Para key id");
  }
  if (!payload.sub) throw new HttpError(401, "Invalid Para subject");
  return verifiedIdentity("para", payload);
}

function verifiedIdentity(
  provider: Provider,
  claims: Claims,
): VerifiedIdentity {
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

type SigningKey = { privateKey: Awaited<ReturnType<typeof importPKCS8>>; kid: string };
let cachedSigningKey: SigningKey | null = null;

/// The BFF's EdDSA signing key (PKCS#8 PEM) + its `kid`, from env. The private
/// key is a secret and never checked in; the matching public key lives in the
/// backend's `service.toml`.
async function signingKey(): Promise<SigningKey> {
  if (cachedSigningKey) return cachedSigningKey;
  const pem = env("PORTAL_ACCOUNT_BEARER_PRIVATE_KEY")?.replaceAll("\\n", "\n");
  const kid = env("PORTAL_ACCOUNT_BEARER_KID");
  if (!pem || !kid) {
    throw new HttpError(503, "Account bearer signing is not configured");
  }
  cachedSigningKey = { privateKey: await importPKCS8(pem, "EdDSA"), kid };
  return cachedSigningKey;
}

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
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
