import {
  buildAccountResponse,
  findAomiUserById,
  findSignalOwner,
  upsertEmailIdentity,
} from "../db/queries";
import type {
  AomiAccountCredential,
  AomiAccountResponse,
  AomiUserId,
  DbAomiAuthIdentity,
  DbAomiUser,
  SignalRef,
  SignalResolution,
} from "../types";
import {
  createDefaultProviderCredentialVerifiers,
  isVerifiedProviderTokenCredential,
  nativeProviderResolutionPolicy,
  providerSessionUserSeed,
  toVerifiedProviderIdentity,
  type VerifiedProviderTokenCredential,
  verifyProviderCredential,
} from "../providers";
import type { AttestedWallet } from "../providers/wallet-attestation";
import type {
  VerifiedProviderIdentity,
  WidgetProviderPolicy,
} from "../providers/descriptor";
import {
  betterAuthWalletSignals,
  ensureAccountSchema,
  fetchAttestedProviderWallets,
  isIdentityAlreadyLinkedError,
  linkProviderIdentity,
  mergeProviderWalletAttestations,
  syncProviderWallets,
} from "./account-service";
import {
  attachVerifiedProviderIdentityToUser,
  IdentityConflictError,
  resolveVerifiedProviderIdentity,
} from "./identity-resolution";
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

type ProviderLinkResult =
  | {
      status: "linked";
      user: DbAomiUser | null;
      identity: DbAomiAuthIdentity;
    }
  | (SignalResolution & { status: "conflict" });

type ProviderSignInResult =
  | {
      status: "linked";
      user: DbAomiUser;
      identity: DbAomiAuthIdentity;
    }
  | (SignalResolution & { status: "conflict" });

class ProviderLinkRollback extends Error {
  constructor(readonly resolution: SignalResolution & { status: "conflict" }) {
    super(resolution.reason);
  }
}

export async function signInWithVerifiedProviderCredential(input: {
  betterAuthUserId: string;
  verified: VerifiedProviderTokenCredential;
  email?: string | null;
  name?: string | null;
}): Promise<ProviderLinkResult> {
  await ensureAccountSchema();
  const prepared = await prepareVerifiedCredential(input.verified);
  const betterAuthIdentity = betterAuthSignal(input.betterAuthUserId);
  const resolution = await signInWithVerifiedProviderIdentity({
    identity: prepared.identity,
    policy: nativeProviderResolutionPolicy(prepared.identity.provider),
    additionalRecoverySignals: [
      betterAuthIdentity,
      ...(await betterAuthWalletSignals(input.betterAuthUserId)),
    ],
    wallets: prepared.wallets,
    displayName: input.name ?? input.email,
    onResolved: async (user, db) => {
      const betterAuthResolution = await linkProviderIdentity({
        userId: user.id,
        ...betterAuthIdentity,
        db,
      });
      if (betterAuthResolution.status === "conflict") {
        throw new ProviderLinkRollback(betterAuthResolution);
      }
    },
  });
  return resolution.status === "conflict"
    ? resolution
    : {
        status: "linked",
        user: resolution.user,
        identity: resolution.identity,
      };
}

export async function signInWithVerifiedProviderIdentity(input: {
  identity: VerifiedProviderIdentity;
  policy: Pick<WidgetProviderPolicy, "subjectIsEnvironmentGlobal">;
  wallets?: readonly AttestedWallet[];
  additionalRecoverySignals?: readonly SignalRef[];
  displayName?: string | null;
  onResolved?: (user: DbAomiUser, db: import("pg").PoolClient) => Promise<void>;
}): Promise<ProviderSignInResult> {
  await ensureAccountSchema();
  const wallets = [...(input.wallets ?? input.identity.walletAttestations)];
  try {
    const resolution = await resolveVerifiedProviderIdentity({
      identity: input.identity,
      policy: input.policy,
      recoverySignals: [
        ...(input.additionalRecoverySignals ?? []),
        ...providerRecoverySignals(input.identity, wallets),
      ],
      displayName: input.displayName ?? input.identity.email?.value,
      onResolved: async (result, db) => {
        await input.onResolved?.(result.user, db);
        await persistProviderDependents(
          result.user.id,
          input.identity,
          wallets,
          db,
        );
      },
    });
    return {
      status: "linked",
      user: resolution.user,
      identity: resolution.identity,
    };
  } catch (error) {
    return providerConflict(error);
  }
}

export async function linkVerifiedProviderIdentityForUser(input: {
  userId: AomiUserId;
  identity: VerifiedProviderIdentity;
  policy: Pick<WidgetProviderPolicy, "subjectIsEnvironmentGlobal">;
  wallets?: readonly AttestedWallet[];
}): Promise<ProviderLinkResult> {
  await ensureAccountSchema();
  const wallets = [...(input.wallets ?? input.identity.walletAttestations)];
  try {
    const identity = await attachVerifiedProviderIdentityToUser({
      userId: input.userId,
      identity: input.identity,
      policy: input.policy,
      recoverySignals: providerRecoverySignals(input.identity, wallets),
      onAttached: async (_identity, db) => {
        await persistProviderDependents(
          input.userId,
          input.identity,
          wallets,
          db,
        );
      },
    });
    return {
      status: "linked",
      user: await findAomiUserById(input.userId),
      identity,
    };
  } catch (error) {
    return providerConflict(error);
  }
}

export async function linkVerifiedProviderCredentialForUser(input: {
  userId: AomiUserId;
  verified: VerifiedProviderTokenCredential;
}): Promise<ProviderLinkResult> {
  const prepared = await prepareVerifiedCredential(input.verified);
  return linkVerifiedProviderIdentityForUser({
    userId: input.userId,
    identity: prepared.identity,
    policy: nativeProviderResolutionPolicy(prepared.identity.provider),
    wallets: prepared.wallets,
  });
}

export async function exchangeProviderForExistingSession(input: {
  betterAuthUserId: string;
  currentUserId?: AomiUserId;
  credential: AomiAccountCredential;
}): Promise<ProviderExchangeResult> {
  const verified = await verifyProviderCredential(input.credential);
  const betterAuthOwner = await findSignalOwner(
    betterAuthSignal(input.betterAuthUserId),
  );
  const userId = input.currentUserId ?? betterAuthOwner;
  if (!userId || betterAuthOwner !== userId) {
    return conflict("identity");
  }

  const resolution = await linkVerifiedProviderCredentialForUser({
    userId,
    verified,
  });
  if (resolution.status === "conflict") return resolution;
  const user = resolution.user ?? (await findAomiUserById(userId));
  if (!user) throw new Error("current_account_not_found");

  return {
    status: "linked",
    account: await buildAccountResponse({
      user,
      session: {
        carrier: "better_auth",
        betterAuthUserId: input.betterAuthUserId,
      },
    }),
  };
}

async function prepareVerifiedCredential(
  verified: VerifiedProviderTokenCredential,
): Promise<{
  identity: VerifiedProviderIdentity;
  wallets: AttestedWallet[];
}> {
  const fetched = await fetchAttestedProviderWallets({
    provider: verified.walletAttestationProvider,
    subject: verified.token.subject,
    email: verified.token.email,
  });
  const wallets = mergeProviderWalletAttestations(
    fetched ?? [],
    verified.token.walletAttestations ?? [],
  );
  return {
    identity: {
      ...toVerifiedProviderIdentity(verified),
      walletAttestations: wallets,
    },
    wallets,
  };
}

function betterAuthSignal(subject: string) {
  return {
    type: "identity" as const,
    provider: "better_auth" as const,
    issuerEnvironment: "aomi",
    tenantId: "portal",
    subject,
  };
}

function providerRecoverySignals(
  identity: VerifiedProviderIdentity,
  wallets: readonly AttestedWallet[],
): SignalRef[] {
  return [
    ...(identity.email?.verified
      ? [{ type: "email" as const, email: identity.email.value }]
      : []),
    ...wallets.map((wallet) => ({
      type: "wallet" as const,
      family: wallet.family,
      normalizedAddress: normalizeWalletAddress(wallet.family, wallet.address),
      chainScope: wallet.chainScope,
    })),
  ];
}

async function persistProviderDependents(
  userId: AomiUserId,
  identity: VerifiedProviderIdentity,
  wallets: readonly AttestedWallet[],
  db: import("pg").PoolClient,
): Promise<void> {
  if (identity.email?.verified) {
    await upsertEmailIdentity({
      userId,
      email: identity.email.value,
      db,
    });
  }
  if (!wallets.length) return;
  const provider = wallets[0]?.provider;
  if (
    !provider ||
    provider !== identity.provider ||
    wallets.some((wallet) => wallet.provider !== provider)
  ) {
    throw new Error("provider_wallet_attestation_mismatch");
  }
  const resolution = await syncProviderWallets({
    userId,
    provider,
    issuerEnvironment: identity.issuerEnvironment,
    tenantId: identity.tenantId,
    subject: identity.subject,
    attested: [...wallets],
    db,
  });
  if (resolution.status === "conflict") {
    throw new ProviderLinkRollback(resolution);
  }
}

function providerConflict(
  error: unknown,
): SignalResolution & { status: "conflict" } {
  if (error instanceof ProviderLinkRollback) return error.resolution;
  if (error instanceof IdentityConflictError) {
    return conflict(error.signalType);
  }
  if (isIdentityAlreadyLinkedError(error)) return conflict("identity");
  throw error;
}

function conflict(
  signalType: SignalRef["type"],
): SignalResolution & { status: "conflict" } {
  return {
    status: "conflict",
    reason: "already_linked_to_another_account",
    signalType,
  };
}
