import { pool } from "../db/pool";
import {
  buildAccountResponse,
  countLoginFactors,
  createAomiUserForBetterAuth,
  deleteBetterAuthSiweWallet,
  findAuthIdentityById,
  findAomiUserById,
  findAomiUserByBetterAuthId,
  findSignalOwner,
  findWalletById,
  listBetterAuthSiweWallets,
  logAccountEvent,
  revokeAuthIdentity,
  revokeWallet,
  runAomiAuthSchema,
  touchAomiUser,
  updateAuthIdentityLabel,
  updateAomiUserProfile,
  updateWalletLabel,
  upsertAuthIdentity,
  upsertEmailIdentity,
  upsertWallet,
  withTransaction,
} from "../db/queries";
import type {
  AomiAccountResponse,
  AomiUserId,
  AuthIdentityProvider,
  DbAomiUser,
  LinkedVia,
  SignalRef,
  SignalResolution,
  WalletFamily,
  WalletKind,
} from "../types";
import { normalizeWalletAddress } from "./wallet-normalization";

export async function ensureAccountSchema(): Promise<void> {
  await runAomiAuthSchema(pool);
}

export async function getOrCreateAomiUserForBetterAuthSession(input: {
  betterAuthUserId: string;
  email?: string | null;
  emailVerified?: boolean;
  name?: string | null;
  avatarUrl?: string | null;
  accessSignals?: SignalRef[];
}): Promise<DbAomiUser> {
  await ensureAccountSchema();
  return withTransaction(async (db) => {
    const existing = await findAomiUserByBetterAuthId(
      input.betterAuthUserId,
      db,
    );
    if (existing) {
      await touchAomiUser(existing.id, db);
      await upsertAuthIdentity({
        userId: existing.id,
        provider: "better_auth",
        subject: input.betterAuthUserId,
        email: input.email,
        emailVerified: input.emailVerified,
        db,
      });
      if (input.email && input.emailVerified) {
        await upsertEmailIdentity({
          userId: existing.id,
          email: input.email,
          emailVerified: true,
          db,
        });
      }
      return existing;
    }

    const signalOwner = await findFirstSignalOwner(
      [
        ...(input.accessSignals ?? []),
        ...(await betterAuthSiweSignals(input.betterAuthUserId, db)),
      ],
      db,
    );
    if (signalOwner) {
      await touchAomiUser(signalOwner.id, db);
      await upsertAuthIdentity({
        userId: signalOwner.id,
        provider: "better_auth",
        subject: input.betterAuthUserId,
        email: input.email,
        emailVerified: input.emailVerified,
        db,
      });
      if (input.email && input.emailVerified) {
        await upsertEmailIdentity({
          userId: signalOwner.id,
          email: input.email,
          emailVerified: true,
          db,
        });
      }
      await logAccountEvent({
        userId: signalOwner.id,
        eventType: "session.attached",
        data: { betterAuthUserId: input.betterAuthUserId },
        db,
      });
      return signalOwner;
    }

    const user = await createAomiUserForBetterAuth({ ...input, db });
    await upsertAuthIdentity({
      userId: user.id,
      provider: "better_auth",
      subject: input.betterAuthUserId,
      email: input.email,
      emailVerified: input.emailVerified,
      db,
    });
    if (input.email && input.emailVerified) {
      await upsertEmailIdentity({
        userId: user.id,
        email: input.email,
        emailVerified: true,
        db,
      });
    }
    await logAccountEvent({
      userId: user.id,
      eventType: "user.created",
      data: { betterAuthUserId: input.betterAuthUserId },
      db,
    });
    return user;
  });
}

async function findFirstSignalOwner(
  signals: SignalRef[],
  db: Parameters<typeof findSignalOwner>[1],
): Promise<DbAomiUser | null> {
  const seen = new Set<string>();
  for (const signal of signals) {
    const key = JSON.stringify(signal);
    if (seen.has(key)) continue;
    seen.add(key);
    const ownerId = await findSignalOwner(signal, db);
    if (!ownerId) continue;
    const owner = await findAomiUserById(ownerId, db);
    if (owner) return owner;
  }
  return null;
}

async function betterAuthSiweSignals(
  betterAuthUserId: string,
  db: Parameters<typeof listBetterAuthSiweWallets>[1],
): Promise<SignalRef[]> {
  const wallets = await listBetterAuthSiweWallets(betterAuthUserId, db);
  return wallets.map((wallet) => ({
    type: "wallet" as const,
    family: "evm" as const,
    normalizedAddress: normalizeWalletAddress("evm", wallet.address),
    chainScope: null,
  }));
}

export async function getAccountResponseForBetterAuthSession(input: {
  betterAuthUserId: string;
  email?: string | null;
  emailVerified?: boolean;
  name?: string | null;
  avatarUrl?: string | null;
  expiresAt?: Date | string | number | null;
  fresh?: boolean;
}): Promise<AomiAccountResponse> {
  const user = await getOrCreateAomiUserForBetterAuthSession(input);
  await syncSiweWalletsForUser({
    aomiUserId: user.id,
    betterAuthUserId: input.betterAuthUserId,
  });
  return buildAccountResponse({
    user,
    betterAuthUserId: input.betterAuthUserId,
    sessionExpiresAt: input.expiresAt,
    sessionFresh: input.fresh,
  });
}

export async function syncSiweWalletsForUser(input: {
  aomiUserId: AomiUserId;
  betterAuthUserId: string;
}): Promise<void> {
  await ensureAccountSchema();
  const wallets = await listBetterAuthSiweWallets(input.betterAuthUserId);
  for (const wallet of wallets) {
    await upsertVerifiedWallet({
      userId: input.aomiUserId,
      family: "evm",
      address: wallet.address,
      chainId: wallet.chainId,
      chainScope: null,
      kind: "external",
      provider: "siwe",
      linkedVia: "siwe",
    });
  }
}

export async function resolveSignal(input: {
  currentUserId: AomiUserId;
  signal: SignalRef;
}): Promise<SignalResolution> {
  await ensureAccountSchema();
  const ownerId = await findSignalOwner(input.signal);
  if (!ownerId) return { status: "linked" };
  if (ownerId === input.currentUserId) return { status: "noop" };

  await logAccountEvent({
    userId: input.currentUserId,
    actorUserId: input.currentUserId,
    eventType: signalEventType(input.signal, "conflict"),
    data: { signal: input.signal },
  });
  return {
    status: "conflict",
    reason: "already_linked_to_another_account",
    signalType: input.signal.type,
  };
}

export async function upsertVerifiedWallet(input: {
  userId: AomiUserId;
  family: WalletFamily;
  address: string;
  chainId?: number;
  chainScope?: string | null;
  kind: WalletKind;
  provider?: string | null;
  providerWalletId?: string | null;
  linkedVia: LinkedVia;
  label?: string | null;
}): Promise<SignalResolution> {
  const signal = {
    type: "wallet" as const,
    family: input.family,
    normalizedAddress: normalizeWalletAddress(input.family, input.address),
    chainScope: input.chainScope ?? null,
  };
  const resolution = await resolveSignal({
    currentUserId: input.userId,
    signal,
  });
  if (resolution.status === "conflict") return resolution;
  const siweSubject = siweIdentitySubject(input);
  const identityResolution = siweSubject
    ? await resolveSignal({
        currentUserId: input.userId,
        signal: {
          type: "identity",
          provider: "siwe",
          subject: siweSubject,
        },
      })
    : null;
  if (identityResolution?.status === "conflict") {
    return identityResolution;
  }
  await upsertWallet(input);
  if (resolution.status !== "noop") {
    await logAccountEvent({
      userId: input.userId,
      eventType: "wallet.linked",
      data: {
        family: input.family,
        address: input.address,
        linkedVia: input.linkedVia,
      },
    });
  }
  if (siweSubject) {
    await upsertAuthIdentity({
      userId: input.userId,
      provider: "siwe",
      subject: siweSubject,
    });
    if (identityResolution?.status !== "noop") {
      await logAccountEvent({
        userId: input.userId,
        eventType: "identity.linked",
        data: { provider: "siwe", subject: siweSubject },
      });
    }
  }
  if (resolution.status !== "noop") return resolution;
  return identityResolution?.status && identityResolution.status !== "noop"
    ? identityResolution
    : { status: "noop" };
}

export async function linkProviderIdentity(input: {
  userId: AomiUserId;
  provider: AuthIdentityProvider;
  subject: string;
  email?: string | null;
  emailVerified?: boolean;
  authMethod?: string | null;
  displayLabel?: string | null;
  providerMetadata?: Record<string, unknown>;
}): Promise<SignalResolution> {
  const identitySignal = {
    type: "identity" as const,
    provider: input.provider,
    subject: input.subject,
  };
  const identityResolution = await resolveSignal({
    currentUserId: input.userId,
    signal: identitySignal,
  });
  if (identityResolution.status === "conflict") {
    return identityResolution;
  }

  if (input.email && input.emailVerified) {
    const emailResolution = await resolveSignal({
      currentUserId: input.userId,
      signal: { type: "email", email: input.email },
    });
    if (emailResolution.status === "conflict") {
      return emailResolution;
    }
    await upsertEmailIdentity({
      userId: input.userId,
      email: input.email,
      emailVerified: true,
    });
  }

  await upsertAuthIdentity(input);
  if (input.email && input.emailVerified) {
    await updateAomiUserProfile({
      userId: input.userId,
      displayName: input.email,
      primaryEmail: input.email,
      primaryEmailVerified: true,
    });
  }
  if (identityResolution.status !== "noop") {
    await logAccountEvent({
      userId: input.userId,
      eventType: "identity.linked",
      data: { provider: input.provider, subject: input.subject },
    });
  }
  return identityResolution.status === "noop"
    ? { status: "noop" }
    : identityResolution;
}

export async function unlinkAuthIdentity(input: {
  userId: AomiUserId;
  identityId: string;
}): Promise<"revoked" | "not_found" | "last_factor" | "protected"> {
  const identity = await findAuthIdentityById(input.identityId);
  if (!identity || identity.userId !== input.userId) return "not_found";
  if (
    identity.provider === "better_auth" ||
    identity.provider === "siwe" ||
    identity.provider === "email"
  ) {
    return "protected";
  }
  const factorCount = await countLoginFactors(input.userId);
  if (factorCount <= 1) return "last_factor";
  const revoked = await revokeAuthIdentity({
    userId: input.userId,
    provider: identity.provider,
    subject: identity.subject,
  });
  if (!revoked) return "not_found";
  await logAccountEvent({
    userId: input.userId,
    eventType: "identity.revoked",
    data: { identityId: input.identityId, provider: identity.provider },
  });
  return "revoked";
}

export async function renameAuthIdentity(input: {
  userId: AomiUserId;
  identityId: string;
  displayLabel: string | null;
}): Promise<"updated" | "not_found" | "protected"> {
  const identity = await findAuthIdentityById(input.identityId);
  if (!identity || identity.userId !== input.userId) return "not_found";
  if (
    identity.provider === "better_auth" ||
    identity.provider === "siwe" ||
    identity.provider === "email"
  ) {
    return "protected";
  }
  const label = sanitizeLabel(input.displayLabel);
  const updated = await updateAuthIdentityLabel({
    userId: input.userId,
    identityId: input.identityId,
    displayLabel: label,
  });
  if (!updated) return "not_found";
  await logAccountEvent({
    userId: input.userId,
    eventType: "identity.label_updated",
    data: { identityId: input.identityId, label },
  });
  return "updated";
}

export async function renameWallet(input: {
  userId: AomiUserId;
  walletId: string;
  label: string | null;
}): Promise<boolean> {
  const label = sanitizeLabel(input.label);
  const wallet = await updateWalletLabel({
    userId: input.userId,
    walletId: input.walletId,
    label,
  });
  if (!wallet) return false;
  await logAccountEvent({
    userId: input.userId,
    eventType: "wallet.label_updated",
    data: { walletId: input.walletId, label },
  });
  return true;
}

export async function unlinkWallet(input: {
  userId: AomiUserId;
  walletId: string;
  betterAuthUserId?: string | null;
}): Promise<"revoked" | "not_found" | "last_factor"> {
  const wallet = await findWalletById(input.walletId);
  if (!wallet || wallet.userId !== input.userId) return "not_found";
  const factorCount = await countLoginFactors(input.userId);
  if (factorCount <= 1 && wallet.kind !== "embedded") return "last_factor";
  const revoked = await revokeWallet(input);
  if (!revoked) return "not_found";
  const siweSubject = siweIdentitySubject(wallet);
  if (siweSubject) {
    await revokeAuthIdentity({
      userId: input.userId,
      provider: "siwe",
      subject: siweSubject,
    });
    if (input.betterAuthUserId) {
      await deleteBetterAuthSiweWallet({
        betterAuthUserId: input.betterAuthUserId,
        address: wallet.address,
        chainId: Number(wallet.chainScope) || undefined,
      });
    }
  }
  await logAccountEvent({
    userId: input.userId,
    eventType: "wallet.revoked",
    data: { walletId: input.walletId },
  });
  return "revoked";
}

export async function updateAccountProfile(input: {
  userId: AomiUserId;
  displayName?: string | null;
  avatarUrl?: string | null;
}): Promise<void> {
  await updateAomiUserProfile({
    userId: input.userId,
    displayName:
      input.displayName === undefined
        ? undefined
        : sanitizeDisplayName(input.displayName),
    avatarUrl: input.avatarUrl,
  });
  await logAccountEvent({
    userId: input.userId,
    eventType: "account.profile_updated",
    data: {
      displayName: input.displayName === undefined ? undefined : "[updated]",
      avatarUrl: input.avatarUrl ? "[updated]" : null,
    },
  });
}

function signalEventType(signal: SignalRef, suffix: string): string {
  if (signal.type === "wallet") return `wallet.${suffix}`;
  if (signal.type === "email") return `email.${suffix}`;
  return `identity.${suffix}`;
}

function siweIdentitySubject(input: {
  family: WalletFamily;
  address: string;
  linkedVia: LinkedVia;
}): string | null {
  if (input.family !== "evm" || input.linkedVia !== "siwe") return null;
  return `eip155:*:${normalizeWalletAddress("evm", input.address)}`;
}

function sanitizeLabel(value: string | null): string | null {
  if (value == null) return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return cleaned ? cleaned.slice(0, 80) : null;
}

function sanitizeDisplayName(value: string | null): string | null {
  if (value == null) return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return cleaned ? cleaned.slice(0, 80) : null;
}
