import {
  buildAccountResponse,
  findAomiUserById,
  findAomiUserByBetterAuthId,
} from "../db/queries";
import type {
  AomiAccountCredential,
  AomiAccountResponse,
  SignalResolution,
} from "../types";
import {
  createDefaultProviderCredentialVerifiers,
  isVerifiedProviderTokenCredential,
  verifyProviderCredential,
  providerSessionUserSeed,
} from "../providers/account-credentials";
import {
  getOrCreateAomiUserForBetterAuthSession,
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
  const user = await getOrCreateAomiUserForBetterAuthSession({
    betterAuthUserId: input.betterAuthUserId,
    email: seed.email,
    emailVerified: seed.emailVerified,
    name: seed.name,
  });
  const resolution = await linkProviderIdentity({
    userId: user.id,
    provider: verified.provider,
    subject: verified.token.subject,
    email: verified.token.email,
    emailVerified: verified.token.emailVerified,
    displayLabel: verified.token.displayLabel,
    providerMetadata: verified.token.providerMetadata,
  });
  if (resolution.status === "conflict") return resolution;
  await syncProviderAttestedWallets({
    userId: user.id,
    provider: verified.walletAttestationProvider,
    subject: verified.token.subject,
    email: verified.token.email,
  });
  const updatedUser = await findAomiUserById(user.id);

  return {
    status: "linked",
    account: await buildAccountResponse({
      user: updatedUser ?? user,
      betterAuthUserId: input.betterAuthUserId,
    }),
  };
}
