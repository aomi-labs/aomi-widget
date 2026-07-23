import type { PoolClient } from "pg";
import {
  createAomiUser,
  findAomiUserById,
  findProviderSubjectOwners,
  findSignalOwner,
  lockIdentityResolutionKeys,
  touchAomiUser,
  upsertAuthIdentity,
  withTransaction,
} from "../db/queries";
import type { VerifiedProviderIdentity } from "../providers/descriptor";
import type { DbAomiAuthIdentity, DbAomiUser, SignalRef } from "../types";

/** Identity resolution only needs to know whether a provider's subject is
 * globally unique across its environments; the rest of a provider descriptor's
 * policy is irrelevant here. */
export type IdentityResolutionPolicy = {
  subjectIsEnvironmentGlobal: boolean;
};

export type ResolveIdentityInput = {
  identity: VerifiedProviderIdentity;
  policy: IdentityResolutionPolicy;
  recoverySignals?: readonly SignalRef[];
  displayName?: string | null;
  avatarUrl?: string | null;
  /** Runs inside the same advisory-locked transaction as the resolution, after
   * the canonical user and its primary identity are persisted. Use it for
   * dependent rows (e.g. a verified-email identity) that must commit atomically
   * with a freshly created user: throwing here rolls the whole transaction back
   * so a failed dependent write can never orphan a just-created user. Errors are
   * re-thrown unchanged, so a non-recoverable conflict propagates instead of
   * being retried. */
  onResolved?: (
    result: IdentityResolutionResult,
    db: PoolClient,
  ) => Promise<void>;
};

export class IdentityConflictError extends Error {
  readonly code = "identity_conflict";

  constructor(readonly owners: readonly string[]) {
    super("identity_conflict");
    this.name = "IdentityConflictError";
  }
}

export type IdentityResolutionResult = {
  user: DbAomiUser;
  identity: DbAomiAuthIdentity;
  created: boolean;
};

export async function resolveVerifiedProviderIdentity(
  input: ResolveIdentityInput,
): Promise<IdentityResolutionResult> {
  const exactKey = credentialKey(input.identity);
  const globalKey = subjectKey(input.identity);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await withTransaction(async (db) => {
        await lockIdentityResolutionKeys(
          [
            exactKey,
            ...(input.policy.subjectIsEnvironmentGlobal ? [globalKey] : []),
            ...(input.recoverySignals ?? []).map(signalKey),
          ],
          db,
        );
        const result = await resolveLocked(input, db);
        if (input.onResolved) await input.onResolved(result, db);
        return result;
      });
    } catch (error) {
      if (attempt === 2 || !isRecoverableRace(error)) throw error;
    }
  }
  throw new Error("identity_resolution_retry_exhausted");
}

export async function attachVerifiedProviderIdentityToUser(input: {
  userId: string;
  identity: VerifiedProviderIdentity;
  policy: IdentityResolutionPolicy;
}): Promise<DbAomiAuthIdentity> {
  return withTransaction(async (db) => {
    await lockIdentityResolutionKeys(
      input.policy.subjectIsEnvironmentGlobal
        ? [credentialKey(input.identity), subjectKey(input.identity)]
        : [credentialKey(input.identity)],
      db,
    );
    const owners = await collectIdentityOwners(input.identity, input.policy, db);
    if ([...owners].some((owner) => owner !== input.userId)) {
      throw new IdentityConflictError([...owners].sort());
    }
    return upsertAuthIdentity({
      userId: input.userId,
      provider: input.identity.provider,
      issuerEnvironment: input.identity.issuerEnvironment,
      tenantId: input.identity.tenantId,
      subject: input.identity.subject,
      email: input.identity.email?.value,
      displayLabel: input.identity.email?.value,
      providerMetadata: input.identity.metadata,
      db,
    });
  });
}

/** Gather every canonical user that already owns this provider identity: the
 * exact `(provider, issuerEnvironment, tenantId, subject)` credential, plus —
 * when the provider's subject is environment-global — every user keyed by the
 * same `(provider, issuerEnvironment, subject)` across tenants. Shared by the
 * anonymous resolve path and the authenticated attach path so the two cannot
 * drift. */
async function collectIdentityOwners(
  identity: VerifiedProviderIdentity,
  policy: IdentityResolutionPolicy,
  db: PoolClient,
): Promise<Set<string>> {
  const owners = new Set<string>();
  const exactOwner = await findSignalOwner(
    {
      type: "identity",
      provider: identity.provider,
      issuerEnvironment: identity.issuerEnvironment,
      tenantId: identity.tenantId,
      subject: identity.subject,
    },
    db,
  );
  if (exactOwner) owners.add(exactOwner);

  if (policy.subjectIsEnvironmentGlobal) {
    for (const owner of await findProviderSubjectOwners(
      identity.provider,
      identity.issuerEnvironment,
      identity.subject,
      db,
    )) {
      owners.add(owner);
    }
  }
  return owners;
}

async function resolveLocked(
  input: ResolveIdentityInput,
  db: PoolClient,
): Promise<IdentityResolutionResult> {
  const owners = await collectIdentityOwners(input.identity, input.policy, db);

  for (const signal of dedupeSignals(input.recoverySignals ?? [])) {
    const owner = await findSignalOwner(signal, db);
    if (owner) owners.add(owner);
  }

  if (owners.size > 1) throw new IdentityConflictError([...owners].sort());

  const ownerId = owners.values().next().value as string | undefined;
  const created = !ownerId;
  let user = ownerId
    ? await findAomiUserById(ownerId, db)
    : await createAomiUser({
        email: input.identity.email?.value,
        displayName:
          input.displayName ?? input.identity.email?.value ?? undefined,
        avatarUrl: input.avatarUrl,
        db,
      });
  if (!user) throw new Error("identity_owner_not_active");

  if (!created) await touchAomiUser(user.id, db);
  const identity = await upsertAuthIdentity({
    userId: user.id,
    provider: input.identity.provider,
    issuerEnvironment: input.identity.issuerEnvironment,
    tenantId: input.identity.tenantId,
    subject: input.identity.subject,
    email: input.identity.email?.value,
    displayLabel: input.displayName ?? input.identity.email?.value,
    providerMetadata: input.identity.metadata,
    db,
  });
  // Provider claims may seed a newly created user, but they are not profile
  // ownership signals. Never overwrite an existing canonical profile during
  // authentication: the claimed email/display name may belong to another
  // historical row, and profile refresh must not make login fail on the
  // users.username uniqueness constraint. Explicit profile edits use the
  // account profile route instead.
  return { user, identity, created };
}

function credentialKey(identity: VerifiedProviderIdentity): string {
  return lockKey([
    "aomi-provider-exact",
    identity.provider,
    identity.issuerEnvironment,
    identity.tenantId,
    identity.subject,
  ]);
}

function subjectKey(identity: VerifiedProviderIdentity): string {
  return lockKey([
    "aomi-provider-subject",
    identity.provider,
    identity.issuerEnvironment,
    identity.subject,
  ]);
}

function signalKey(signal: SignalRef): string {
  if (signal.type === "identity") {
    return lockKey([
      "aomi-provider-exact",
      signal.provider,
      signal.issuerEnvironment,
      signal.tenantId,
      signal.subject,
    ]);
  }
  if (signal.type === "wallet") {
    return lockKey([
      "aomi-wallet",
      signal.family,
      signal.normalizedAddress,
      signal.chainScope ?? "global",
    ]);
  }
  return lockKey(["aomi-email", signal.email.trim().toLowerCase()]);
}

function lockKey(parts: readonly string[]): string {
  // PostgreSQL text values reject NUL bytes. JSON preserves unambiguous part
  // boundaries while remaining valid UTF-8 for hashtextextended().
  return JSON.stringify(parts);
}

function dedupeSignals(signals: readonly SignalRef[]): SignalRef[] {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    const key = JSON.stringify(signal);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isRecoverableRace(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  return code === "23505" || code === "40001" || code === "40P01";
}
