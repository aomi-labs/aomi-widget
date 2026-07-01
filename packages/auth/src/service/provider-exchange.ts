import {
  buildAccountResponse,
  findAomiUserById,
  findAomiUserByBetterAuthId,
} from "../db/queries";
import type {
  AomiAccountCredential,
  AomiAccountResponse,
  AomiUserId,
  DbAomiUser,
  SignalResolution,
} from "../types";
import {
  createDefaultProviderCredentialVerifiers,
  isVerifiedProviderTokenCredential,
  type VerifiedProviderTokenCredential,
  verifyProviderCredential,
  providerSessionUserSeed,
} from "../providers/account-credentials";
import {
  getOrCreateAomiUserForBetterAuthSession,
  isIdentityAlreadyLinkedError,
  linkProviderIdentity,
  syncProviderAttestedWallets,
} from "./account-service";

export {
  createDefaultProviderCredentialVerifiers,
  isVerifiedProviderTokenCredential,
  providerSessionUserSeed,
  verifyProviderCredential,
};

export type ProviderExchangeResult =
  | { status: "linked"; account: AomiAccountResponse }
  | (SignalResolution & { status: "conflict" | "noop" });

export async function linkVerifiedProviderCredentialForUser(input: {
  userId: AomiUserId;
  verified: VerifiedProviderTokenCredential;
}): Promise<
  | { status: "linked"; user: DbAomiUser | null }
  | (SignalResolution & { status: "conflict" })
> {
  const resolution = await linkProviderIdentity({
    userId: input.userId,
    provider: input.verified.provider,
    subject: input.verified.token.subject,
    email: input.verified.token.email,
    emailVerified: input.verified.token.emailVerified,
    displayLabel: input.verified.token.displayLabel,
    providerMetadata: input.verified.token.providerMetadata,
  });
  if (resolution.status === "conflict") return resolution;
  await syncProviderAttestedWallets({
    userId: input.userId,
    provider: input.verified.walletAttestationProvider,
    subject: input.verified.token.subject,
    email: input.verified.token.email,
  });

  return {
    status: "linked",
    user: await findAomiUserById(input.userId),
  };
}

export async function exchangeProviderForExistingSession(input: {
  betterAuthUserId: string;
  credential: AomiAccountCredential;
}): Promise<ProviderExchangeResult> {
  const verified = await verifyProviderCredential(input.credential);
  if (!isVerifiedProviderTokenCredential(verified)) {
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

  const seed = providerSessionUserSeed(verified);
  let user: Awaited<ReturnType<typeof getOrCreateAomiUserForBetterAuthSession>>;
  try {
    user = await getOrCreateAomiUserForBetterAuthSession({
      betterAuthUserId: input.betterAuthUserId,
      email: seed.email,
      emailVerified: seed.emailVerified,
      name: seed.name,
    });
  } catch (error) {
    if (isIdentityAlreadyLinkedError(error)) {
      return {
        status: "conflict",
        reason: "already_linked_to_another_account",
        signalType: "identity",
      };
    }
    throw error;
  }
  const resolution = await linkVerifiedProviderCredentialForUser({
    userId: user.id,
    verified,
  });
  if (resolution.status === "conflict") return resolution;

  return {
    status: "linked",
    account: await buildAccountResponse({
      user: resolution.user ?? user,
      betterAuthUserId: input.betterAuthUserId,
    }),
  };
}
