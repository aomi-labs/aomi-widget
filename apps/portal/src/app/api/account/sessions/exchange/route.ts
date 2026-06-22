import { createRemoteJWKSet, importSPKI, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { resolveOrCreateCanonicalUser } from "@portal/lib/aomi-account/account-graph";
import { mintAccountBearer } from "@portal/lib/aomi-account/bearer";
import { setSessionCookie } from "@portal/lib/aomi-account/session";

// Account graph reads/writes + bearer signing need Node (pg, EdDSA), not Edge.
export const runtime = "nodejs";

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

    // Resolve-or-create OUR canonical user for this linked credential, then
    // establish OUR session. The provider subject (a DID) is only the
    // credential key — `sub` is the canonical UUID the find-only backend
    // resolves. A returning user lands on her existing UUID (keeps her history);
    // only a new `(provider, subject)` mints a new account.
    const { userId } = await resolveOrCreateCanonicalUser({
      provider: verified.provider,
      subject: verified.subject,
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
