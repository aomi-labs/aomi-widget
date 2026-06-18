import { readAccountAuthEnv } from "../better-auth/env";
import {
  buildAccountResponse,
  findAomiUserByBetterAuthId,
} from "../db/queries";
import { verifyParaJwt } from "../providers/para";
import { verifyPrivyToken } from "../providers/privy";
import type {
  AomiAccountCredential,
  AomiAccountResponse,
  SignalResolution,
  VerifiedParaJwt,
  VerifiedPrivyToken,
} from "../types";
import {
  getOrCreateAomiUserForBetterAuthSession,
  linkProviderIdentity,
} from "./account-service";

export type ProviderExchangeResult =
  | { status: "linked"; account: AomiAccountResponse }
  | (SignalResolution & {
      status: "needs_confirmation" | "moved" | "merged" | "noop";
    });

export async function verifyProviderCredential(
  credential: AomiAccountCredential,
): Promise<
  | { provider: "privy"; token: VerifiedPrivyToken }
  | { provider: "para"; token: VerifiedParaJwt }
  | { provider: "cookie" }
> {
  const env = readAccountAuthEnv();
  const parsed = normalizeCredential(credential);
  if (parsed.provider === "cookie") return { provider: "cookie" };
  if (parsed.provider === "privy") {
    if (!env.privyAppId) throw new Error("Privy app id is not configured");
    return {
      provider: "privy",
      token: await verifyPrivyToken({
        token: parsed.providerToken,
        tokenKind: parsed.tokenKind,
        appId: env.privyAppId,
        accessTokenVerificationKey: env.privyAccessTokenVerificationKey,
        identityTokenVerificationKey: env.privyIdentityTokenVerificationKey,
      }),
    };
  }
  if (!env.paraAudience || !env.paraJwksUrl) {
    throw new Error("Para JWKS verification is not configured");
  }
  return {
    provider: "para",
    token: await verifyParaJwt({
      token: parsed.providerToken,
      expectedAudience: env.paraAudience,
      jwksUrl: env.paraJwksUrl,
      keyId: parsed.keyId,
    }),
  };
}

export async function exchangeProviderForExistingSession(input: {
  betterAuthUserId: string;
  credential: AomiAccountCredential;
  confirm?: boolean;
}): Promise<ProviderExchangeResult> {
  const verified = await verifyProviderCredential(input.credential);
  if (verified.provider === "cookie") {
    const user = await findAomiUserByBetterAuthId(input.betterAuthUserId);
    if (!user) throw new Error("Aomi user not found for session");
    return {
      status: "linked",
      account: await buildAccountResponse({
        user,
        betterAuthUserId: input.betterAuthUserId,
      }),
    };
  }

  const user = await getOrCreateAomiUserForBetterAuthSession({
    betterAuthUserId: input.betterAuthUserId,
    email: verified.token.email,
    emailVerified: verified.token.emailVerified,
    name: verified.token.email,
  });
  const resolution = await linkProviderIdentity({
    userId: user.id,
    provider: verified.provider,
    subject: verified.token.subject,
    email: verified.token.email,
    emailVerified: verified.token.emailVerified,
    providerMetadata: {
      expiresAt: verified.token.expiresAt,
      linkedAccounts:
        verified.provider === "privy"
          ? verified.token.linkedAccounts
          : undefined,
      wallets:
        verified.provider === "para" ? verified.token.wallets : undefined,
      connectedWallets:
        verified.provider === "para"
          ? verified.token.connectedWallets
          : undefined,
    },
    confirmed: input.confirm,
  });
  if (resolution.status === "needs_confirmation") return resolution;

  return {
    status: "linked",
    account: await buildAccountResponse({
      user,
      betterAuthUserId: input.betterAuthUserId,
    }),
  };
}

export function providerSessionUserSeed(
  verified:
    | { provider: "privy"; token: VerifiedPrivyToken }
    | { provider: "para"; token: VerifiedParaJwt },
): { email: string; emailVerified: boolean; name: string } {
  const email =
    verified.token.email ??
    `${verified.provider}-${verified.token.subject.replace(/[^a-zA-Z0-9_-]/g, "_")}@auth.aomi.local`;
  return {
    email,
    emailVerified: Boolean(
      verified.token.email && verified.token.emailVerified,
    ),
    name: verified.token.email ?? `${verified.provider} user`,
  };
}

function normalizeCredential(credential: AomiAccountCredential):
  | {
      provider: "privy";
      tokenKind: "identity_token" | "access_token";
      providerToken: string;
    }
  | {
      provider: "para";
      tokenKind: "session_jwt";
      providerToken: string;
      keyId?: string;
    }
  | { provider: "cookie" } {
  if ("kind" in credential && credential.kind === "cookie") {
    return { provider: "cookie" };
  }
  if ("kind" in credential && credential.kind === "token") {
    if (credential.provider === "privy") {
      return {
        provider: "privy",
        tokenKind: "identity_token",
        providerToken: credential.token,
      };
    }
    return {
      provider: "para",
      tokenKind: "session_jwt",
      providerToken: credential.token,
      keyId: credential.keyId,
    };
  }
  if (credential.provider === "privy") {
    return {
      provider: "privy",
      tokenKind: credential.tokenKind ?? "identity_token",
      providerToken: credential.providerToken,
    };
  }
  return {
    provider: "para",
    tokenKind: "session_jwt",
    providerToken: credential.providerToken,
    keyId: credential.keyId,
  };
}
