import type { JwtOptions } from "better-auth/plugins";
import type { AccountAuthEnv } from "./env";
import { getOrCreateAomiUserForBetterAuthSession } from "../service/account-service";

export const AOMI_BACKEND_JWT_SCOPE = "aomi:api";
export const AOMI_BACKEND_JWT_ALLOWED_CLAIMS = [
  "iss",
  "aud",
  "sub",
  "iat",
  "exp",
  "nbf",
  "jti",
  "sid",
  "aomi_user_id",
  "scope",
] as const;

export type AomiBackendJwtClaim = (typeof AOMI_BACKEND_JWT_ALLOWED_CLAIMS)[number];

export type AomiBackendJwtCustomClaims = {
  sid: string;
  aomi_user_id: string;
  scope: string;
};

type BetterAuthJwtSession = {
  user: {
    id: string;
    email?: string | null;
    emailVerified?: boolean | null;
    name?: string | null;
    image?: string | null;
  };
  session: {
    id: string;
  };
};

type ResolveAomiUserForBackendJwt = (input: {
  betterAuthUserId: string;
  email?: string | null;
  emailVerified?: boolean | null;
  name?: string | null;
  avatarUrl?: string | null;
}) => Promise<{ id: string }>;

type BackendJwtPayloadOptions = {
  scope?: string;
  resolveUser?: ResolveAomiUserForBackendJwt;
};

export async function defineAomiBackendJwtPayload(
  session: BetterAuthJwtSession,
  options: BackendJwtPayloadOptions = {},
): Promise<AomiBackendJwtCustomClaims> {
  const resolveUser =
    options.resolveUser ?? getOrCreateAomiUserForBetterAuthSession;
  const user = await resolveUser({
    betterAuthUserId: session.user.id,
    email: session.user.email,
    emailVerified: session.user.emailVerified ?? undefined,
    name: session.user.name,
    avatarUrl: session.user.image,
  });
  return {
    sid: session.session.id,
    aomi_user_id: user.id,
    scope: options.scope ?? AOMI_BACKEND_JWT_SCOPE,
  };
}

export function getAomiBackendJwtSubject(session: BetterAuthJwtSession): string {
  return session.user.id;
}

export function createAomiBackendJwtOptions(
  env: AccountAuthEnv,
  options: BackendJwtPayloadOptions = {},
): JwtOptions {
  return {
    disableSettingJwtHeader: true,
    jwks: {
      jwksPath: env.backendJwtJwksPath,
      keyPairConfig: {
        alg: "EdDSA",
        crv: "Ed25519",
      },
    },
    jwt: {
      issuer: env.backendJwtIssuer,
      audience: env.backendJwtAudience,
      expirationTime: env.backendJwtExpiresIn,
      getSubject: getAomiBackendJwtSubject,
      definePayload: (session) =>
        defineAomiBackendJwtPayload(session, {
          ...options,
          scope: options.scope ?? env.backendJwtScope,
        }),
    },
  };
}
