import {
  buildAccountResponse,
  findAomiUserById,
  withTransaction,
} from "../db/queries";
import type {
  AomiAccountCredential,
  AomiAccountResponse,
  AomiUserId,
  DbAomiUser,
  SignalRef,
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
import { normalizeWalletAddress } from "./wallet-normalization";

export {
  createDefaultProviderCredentialVerifiers,
  isVerifiedProviderTokenCredential,
  providerSessionUserSeed,
  verifyProviderCredential,
};

export type ProviderExchangeResult =
  | { status: "linked"; account: AomiAccountResponse }
  | (SignalResolution & { status: "conflict" | "noop" });

class ProviderLinkRollback extends Error {
  constructor(readonly resolution: SignalResolution & { status: "conflict" }) {
    super(resolution.reason);
  }
}

export async function linkVerifiedProviderCredentialForUser(input: {
  userId: AomiUserId;
  verified: VerifiedProviderTokenCredential;
}): Promise<
  | { status: "linked"; user: DbAomiUser | null }
  | (SignalResolution & { status: "conflict" })
> {
  try {
    await withTransaction(async (db) => {
      const resolution = await linkProviderIdentity({
        userId: input.userId,
        provider: input.verified.provider,
        subject: input.verified.token.subject,
        email: input.verified.token.email,
        emailVerified: input.verified.token.emailVerified,
        displayLabel: input.verified.token.displayLabel,
        providerMetadata: input.verified.token.providerMetadata,
        db,
      });
      if (resolution.status === "conflict") {
        throw new ProviderLinkRollback(resolution);
      }
      const walletResolution = await syncProviderAttestedWallets({
        userId: input.userId,
        provider: input.verified.walletAttestationProvider,
        subject: input.verified.token.subject,
        email: input.verified.token.email,
        fallbackAttested: input.verified.token.walletAttestations,
        db,
      });
      if (walletResolution.status === "conflict") {
        throw new ProviderLinkRollback(walletResolution);
      }
    });
  } catch (error) {
    if (error instanceof ProviderLinkRollback) return error.resolution;
    throw error;
  }

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
  const seed = providerSessionUserSeed(verified);
  let user: Awaited<ReturnType<typeof getOrCreateAomiUserForBetterAuthSession>>;
  try {
    user = await getOrCreateAomiUserForBetterAuthSession({
      betterAuthUserId: input.betterAuthUserId,
      email: seed.email,
      emailVerified: seed.emailVerified,
      name: seed.name,
      accessSignals: providerAccessSignals(verified),
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

export function providerAccessSignals(
  verified: VerifiedProviderTokenCredential,
): SignalRef[] {
  const signals: SignalRef[] = [
    {
      type: "identity",
      provider: verified.provider,
      subject: verified.token.subject,
    },
  ];
  if (verified.token.email && verified.token.emailVerified) {
    signals.push({
      type: "email",
      email: verified.token.email.trim().toLowerCase(),
    });
  }
  for (const wallet of verified.token.walletAttestations ?? []) {
    signals.push({
      type: "wallet",
      family: wallet.family,
      normalizedAddress: normalizeWalletAddress(wallet.family, wallet.address),
      chainScope: wallet.chainScope,
    });
  }
  return signals;
}
