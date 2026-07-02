import { readAccountAuthEnv, type AccountAuthEnv } from "../better-auth/env";
import type {
  AomiAccountCredential,
  AccountCredentialProvider,
} from "../types";
import { verifyParaJwt } from "./para";
import { verifyPrivyToken } from "./privy";
import type { AttestedWalletProvider } from "./wallet-attestation";

export type VerifiedProviderToken = {
  subject: string;
  expiresAt: number;
  email?: string;
  emailVerified?: boolean;
  displayLabel?: string;
  providerMetadata: Record<string, unknown>;
};

export type VerifiedProviderTokenCredential = {
  provider: AccountCredentialProvider;
  token: VerifiedProviderToken;
  walletAttestationProvider: AttestedWalletProvider;
};

export type VerifiedProviderCredential = VerifiedProviderTokenCredential;

type NormalizedProviderCredential = {
  kind: "provider";
} & ProviderTokenCredential;

export type ProviderTokenCredential = {
  provider: AccountCredentialProvider;
  tokenKind?: string;
  providerToken: string;
  keyId?: string;
};

export type ProviderCredentialVerifier = (
  credential: ProviderTokenCredential,
) => Promise<VerifiedProviderTokenCredential>;

export type ProviderCredentialVerifierRegistry = Record<
  string,
  ProviderCredentialVerifier | undefined
>;

export type VerifyProviderCredentialOptions = {
  env?: AccountAuthEnv;
  verifiers?: ProviderCredentialVerifierRegistry;
};

export async function verifyProviderCredential(
  credential: AomiAccountCredential,
  optionsOrEnv: VerifyProviderCredentialOptions | AccountAuthEnv = {},
): Promise<VerifiedProviderCredential> {
  const options = normalizeVerifyOptions(optionsOrEnv);
  const parsed = normalizeCredential(credential);

  const verifiers =
    options.verifiers ??
    createDefaultProviderCredentialVerifiers(
      options.env ?? readAccountAuthEnv(),
    );
  const verifier = verifiers[parsed.provider];
  if (!verifier) {
    throw new Error(
      `Unsupported account credential provider: ${parsed.provider}`,
    );
  }
  return verifier({
    provider: parsed.provider,
    tokenKind: parsed.tokenKind,
    providerToken: parsed.providerToken,
    keyId: parsed.keyId,
  });
}

export function isVerifiedProviderTokenCredential(
  verified: VerifiedProviderCredential,
): verified is VerifiedProviderTokenCredential {
  return "token" in verified;
}

export function createDefaultProviderCredentialVerifiers(
  env: AccountAuthEnv = readAccountAuthEnv(),
): ProviderCredentialVerifierRegistry {
  return {
    privy: createPrivyCredentialVerifier(env),
    para: createParaCredentialVerifier(env),
  };
}

function createPrivyCredentialVerifier(
  env: AccountAuthEnv,
): ProviderCredentialVerifier {
  return async (credential) => {
    if (!env.privyAppId) throw new Error("Privy app id is not configured");
    const tokenKind =
      credential.tokenKind === "access_token"
        ? "access_token"
        : "identity_token";
    const token = await verifyPrivyToken({
      token: credential.providerToken,
      tokenKind,
      appId: env.privyAppId,
      accessTokenVerificationKey: env.privyAccessTokenVerificationKey,
      identityTokenVerificationKey: env.privyIdentityTokenVerificationKey,
    });
    return {
      provider: "privy",
      walletAttestationProvider: "privy",
      token: {
        subject: token.subject,
        expiresAt: token.expiresAt,
        email: token.email,
        emailVerified: token.emailVerified,
        displayLabel: token.displayLabel,
        providerMetadata: {
          expiresAt: token.expiresAt,
          displayLabel: token.displayLabel,
          linkedAccounts: token.linkedAccounts,
        },
      },
    };
  };
}

function createParaCredentialVerifier(
  env: AccountAuthEnv,
): ProviderCredentialVerifier {
  return async (credential) => {
    // The Para session JWT is the only Para token shape accepted today; keep
    // the verifier branch local so future Para variants do not affect callers.
    if (!env.paraAudience || !env.paraJwksUrl) {
      throw new Error("Para JWKS verification is not configured");
    }
    const token = await verifyParaJwt({
      token: credential.providerToken,
      expectedAudience: env.paraAudience,
      jwksUrl: env.paraJwksUrl,
      keyId: credential.keyId,
    });
    return {
      provider: "para",
      walletAttestationProvider: "para",
      token: {
        subject: token.subject,
        expiresAt: token.expiresAt,
        email: token.email,
        emailVerified: token.emailVerified,
        displayLabel: token.displayLabel,
        providerMetadata: {
          expiresAt: token.expiresAt,
          displayLabel: token.displayLabel,
          wallets: token.wallets,
          connectedWallets: token.connectedWallets,
        },
      },
    };
  };
}

export function providerSessionUserSeed(
  verified: VerifiedProviderTokenCredential,
): { email: string; emailVerified: boolean; name: string } {
  const providerEmail = verified.token.email?.trim();
  const verifiedEmail =
    providerEmail && verified.token.emailVerified ? providerEmail : undefined;
  const displayLabel = verified.token.displayLabel?.trim() || undefined;
  const email = verifiedEmail ?? providerSubjectEmail(verified);
  return {
    email,
    emailVerified: Boolean(verifiedEmail),
    name: verifiedEmail ?? displayLabel ?? `${verified.provider} user`,
  };
}

function providerSubjectEmail(
  verified: VerifiedProviderTokenCredential,
): string {
  const subject = verified.token.subject.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${verified.provider}-${subject}@auth.aomi.local`;
}

function normalizeCredential(
  credential: AomiAccountCredential,
): NormalizedProviderCredential {
  if (credential.provider === "privy") {
    return {
      kind: "provider",
      provider: "privy",
      tokenKind: credential.tokenKind ?? "identity_token",
      providerToken: credential.providerToken,
    };
  }
  if (credential.provider === "para") {
    return {
      kind: "provider",
      provider: "para",
      tokenKind: "session_jwt",
      providerToken: credential.providerToken,
      keyId: credential.keyId,
    };
  }
  const unsupportedProvider = (credential as { provider?: unknown }).provider;
  throw new Error(
    `Unsupported account credential provider: ${String(unsupportedProvider)}`,
  );
}

function normalizeVerifyOptions(
  value: VerifyProviderCredentialOptions | AccountAuthEnv,
): VerifyProviderCredentialOptions {
  if ("betterAuthSecret" in value) return { env: value };
  return value;
}
