import { readAccountAuthEnv } from "../better-auth/env";
import { pool } from "../db/pool";
import {
  buildAccountResponse,
  clearAomiBetterAuthUserIds,
  countLoginFactors,
  createAomiUserForBetterAuth,
  deleteBetterAuthSiweWallet,
  findAuthIdentityById,
  findAomiUserById,
  findAomiUserByBetterAuthId,
  findSignalOwner,
  findWalletById,
  listBetterAuthSiweWallets,
  listWalletsForUser,
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
import { createDefaultWalletAttesters } from "../providers/default-wallet-attesters";
import {
  fetchAttestedWallets,
  type AttestedWallet,
  type AttestedWalletProvider,
  type WalletAttestationLogger,
  type WalletAttesterRegistry,
} from "../providers/wallet-attestation";
import type {
  AomiAccountResponse,
  AomiUserId,
  AuthIdentityProvider,
  DbAomiUser,
  DbAomiWallet,
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
        db,
      });
      if (input.email && input.emailVerified) {
        await upsertEmailIdentity({
          userId: existing.id,
          email: input.email,
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
        db,
      });
      if (input.email && input.emailVerified) {
        await upsertEmailIdentity({
          userId: signalOwner.id,
          email: input.email,
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
      db,
    });
    if (input.email && input.emailVerified) {
      await upsertEmailIdentity({
        userId: user.id,
        email: input.email,
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
    });
  }

  await upsertAuthIdentity(input);
  if (input.email && input.emailVerified) {
    await updateAomiUserProfile({
      userId: input.userId,
      displayName: input.email,
      primaryEmail: input.email,
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

/** Sync embedded wallets a provider attests for the user into the
 *  `aomi_wallets` graph. Server-side attestation replaces a SIWE/SIWS
 *  signature for custodied embedded wallets (and is the only SVM ownership
 *  proof available today).
 *
 *  On success: upserts every attested wallet as `kind='embedded'`,
 *  `linked_via=provider`, and soft-revokes any previously-linked embedded
 *  wallet from the same provider that the provider no longer attests
 *  (reconciliation). Only touches `kind='embedded'` rows for this provider —
 *  SIWE external wallets and the other provider's embedded wallets are
 *  never touched.
 *
 *  On fetch failure: logs and returns without revoking anything, so a
 *  transient provider API outage can't wipe a user's wallet graph. */
export async function syncProviderWallets(input: {
  userId: AomiUserId;
  provider: AttestedWalletProvider;
  attested: AttestedWallet[];
  db?: import("pg").Pool | import("pg").PoolClient;
}): Promise<void> {
  const keepKeys = new Set(
    input.attested.map((w) => walletKeyString(w.family, w.address)),
  );

  // 1. Upsert every attested wallet. A cross-account collision on one
  //    address must not abort the rest of the sync — log and continue.
  for (const wallet of input.attested) {
    try {
      await upsertWallet({
        userId: input.userId,
        family: wallet.family,
        address: wallet.address,
        chainScope: wallet.chainScope,
        kind: "embedded",
        provider: input.provider,
        providerWalletId: wallet.providerWalletId,
        linkedVia: input.provider,
        db: input.db,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "wallet_already_linked_to_another_account") {
        await logAccountEvent({
          userId: input.userId,
          eventType: "wallet.link_conflict",
          data: {
            family: wallet.family,
            address: wallet.address,
            provider: wallet.provider,
          },
          db: input.db,
        });
        continue;
      }
      throw error;
    }
  }

  // 2. Reconcile: soft-revoke embedded wallets from this provider that the
  //    provider no longer attests.
  const existing = await listWalletsForUser(input.userId, input.db);
  for (const wallet of existing) {
    if (wallet.kind !== "embedded") continue;
    if (wallet.provider !== input.provider) continue;
    if (keepKeys.has(walletKeyString(wallet.family, wallet.address))) continue;
    const revoked = await revokeWallet({
      userId: input.userId,
      walletId: wallet.id,
      db: input.db,
    });
    if (revoked) {
      await logAccountEvent({
        userId: input.userId,
        eventType: "wallet.unlinked",
        data: {
          family: wallet.family,
          address: wallet.address,
          provider: wallet.provider,
          reason: "provider_no_longer_attests",
        },
        db: input.db,
      });
    }
  }
}

/** Fetch attested embedded wallets for a verified provider subject using the
 *  server-side provider API. Returns `null` when the provider's REST
 *  credentials aren't configured (graceful degradation: callers fall back to
 *  identity-only behavior) or when the fetch fails (so the caller can skip
 *  the sync without revoking live rows). */
export async function fetchAttestedProviderWallets(input: {
  provider: AttestedWalletProvider;
  /** Verified token subject: `did:privy:…` for Privy, Para user id for Para. */
  subject: string;
  email?: string | null;
  attesters?: WalletAttesterRegistry;
  logger?: WalletAttestationLogger;
}): Promise<AttestedWallet[] | null> {
  return fetchAttestedWallets({
    request: {
      provider: input.provider,
      subject: input.subject,
      email: input.email,
    },
    attesters: input.attesters ?? createDefaultWalletAttesters(),
    logger: input.logger ?? console,
  });
}

/** Best-effort embedded-wallet sync after a successful provider identity link.
 * No-ops when provider REST credentials are unconfigured or the provider fetch
 * fails; existing wallet rows are only reconciled after a successful fetch. */
export async function syncProviderAttestedWallets(input: {
  userId: AomiUserId;
  provider: AttestedWalletProvider;
  subject: string;
  email?: string | null;
  db?: import("pg").Pool | import("pg").PoolClient;
  attesters?: WalletAttesterRegistry;
  logger?: WalletAttestationLogger;
}): Promise<void> {
  const attested = await fetchAttestedProviderWallets({
    provider: input.provider,
    subject: input.subject,
    email: input.email,
    attesters: input.attesters,
    logger: input.logger,
  });
  if (!attested) return;
  await syncProviderWallets({
    userId: input.userId,
    provider: input.provider,
    attested,
    db: input.db,
  });
}

function walletKeyString(family: WalletFamily, address: string): string {
  return `${family}:${normalizeWalletAddress(family, address)}`;
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
    const detached = await deleteBetterAuthSiweWallet({
      address: wallet.address,
      chainId: Number(wallet.chainScope) || undefined,
      syntheticEmails: siweSyntheticEmails(wallet.address),
    });
    for (const betterAuthUserId of detached.betterAuthUserIds) {
      await revokeAuthIdentity({
        userId: input.userId,
        provider: "better_auth",
        subject: betterAuthUserId,
      });
    }
    await clearAomiBetterAuthUserIds({
      userId: input.userId,
      betterAuthUserIds: detached.betterAuthUserIds,
    });
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

function siweSyntheticEmails(address: string): string[] {
  const env = readAccountAuthEnv();
  const domains = new Set<string>(["aomi.dev"]);
  if (env.siweEmailDomain) domains.add(env.siweEmailDomain);
  try {
    const url = new URL(env.betterAuthUrl);
    domains.add(url.origin);
    domains.add(url.host);
  } catch {
    // readAccountAuthEnv validates the fallback URL; this only guards tests.
  }

  const addresses = new Set([
    address.trim(),
    normalizeWalletAddress("evm", address),
  ]);
  const emails = new Set<string>();
  for (const addr of addresses) {
    if (!addr) continue;
    for (const domain of domains) {
      const cleanedDomain = domain.trim().replace(/^@/, "");
      if (!cleanedDomain) continue;
      emails.add(`${addr}@${cleanedDomain}`.toLowerCase());
    }
  }
  return [...emails];
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
