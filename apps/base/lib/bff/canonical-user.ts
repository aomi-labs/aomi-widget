import { randomUUID } from "node:crypto";
import type { PgClient } from "./db";
import { nowSeconds } from "./crypto";
import { withTransaction } from "./db";

export type BetterAuthWalletLink = {
  chainType: string;
  chainId: number;
  address: string;
};

export type BetterAuthLegacyLinks = {
  privySubjects?: string[];
  wallets?: BetterAuthWalletLink[];
  verifiedEmails?: string[];
};

export type CanonicalUser = {
  userId: string;
};

function normalizeEvmAddress(chainType: string, address: string): string {
  return chainType.trim().toLowerCase() === "evm"
    ? address.trim().toLowerCase()
    : address.trim();
}

async function getBetterAuthMapping(
  client: PgClient,
  betterAuthUserId: string,
): Promise<string | undefined> {
  const { rows } = await client.query<{ user_id: string }>(
    `
      SELECT user_id
      FROM auth_identities
      WHERE application IS NULL
        AND wallet_provider = 'betterauth'
        AND wallet_provider_subject = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [betterAuthUserId],
  );
  return rows[0]?.user_id;
}

async function ensureUser(client: PgClient, userId: string): Promise<void> {
  const now = nowSeconds();
  await client.query(
    `
      INSERT INTO users (id, username, created_at, updated_at)
      VALUES ($1, NULL, $2, $2)
      ON CONFLICT (id) DO NOTHING
    `,
    [userId, now],
  );
}

async function ensureBetterAuthMapping(
  client: PgClient,
  userId: string,
  betterAuthUserId: string,
): Promise<string> {
  const now = nowSeconds();
  await client.query(
    `
      INSERT INTO auth_identities (
        user_id,
        application,
        wallet_provider,
        wallet_provider_subject,
        auth_method,
        auth_value,
        auth_value_normalized,
        auth_verified_at,
        is_primary,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        NULL,
        'betterauth',
        $2,
        'betterauth',
        $2,
        lower(btrim($2)),
        $3,
        true,
        '{"source":"betterauth_bff"}'::jsonb,
        $3,
        $3
      )
      ON CONFLICT DO NOTHING
    `,
    [userId, betterAuthUserId, now],
  );

  const mappedUserId = await getBetterAuthMapping(client, betterAuthUserId);
  if (!mappedUserId) {
    throw new Error("BetterAuth mapping insert failed");
  }
  if (mappedUserId !== userId) {
    throw new Error(
      `BetterAuth user ${betterAuthUserId} is already bound to ${mappedUserId}`,
    );
  }
  return mappedUserId;
}

async function addPrivyCandidates(
  client: PgClient,
  candidateUserIds: Set<string>,
  subjects: readonly string[],
): Promise<void> {
  for (const rawSubject of subjects) {
    const subject = rawSubject.trim();
    if (!subject) continue;
    const { rows } = await client.query<{ user_id: string }>(
      `
        SELECT DISTINCT user_id
        FROM auth_identities
        WHERE wallet_provider = 'privy'
          AND wallet_provider_subject = $1
      `,
      [subject],
    );
    for (const row of rows) candidateUserIds.add(row.user_id);
  }
}

async function addWalletCandidates(
  client: PgClient,
  candidateUserIds: Set<string>,
  wallets: readonly BetterAuthWalletLink[],
): Promise<void> {
  for (const wallet of wallets) {
    const chainType = wallet.chainType.trim().toLowerCase();
    const address = normalizeEvmAddress(chainType, wallet.address);
    if (!chainType || !address) continue;
    const { rows } = await client.query<{ user_id: string }>(
      `
        SELECT DISTINCT iw.user_id
        FROM identity_wallets iw
        JOIN public_keyes pk ON pk.id = iw.public_key_id
        WHERE pk.chain_type = $1
          AND pk.chain_id = $2
          AND pk.address = $3
      `,
      [chainType, wallet.chainId, address],
    );
    for (const row of rows) candidateUserIds.add(row.user_id);
  }
}

async function addVerifiedEmailCandidates(
  client: PgClient,
  candidateUserIds: Set<string>,
  emails: readonly string[],
): Promise<void> {
  for (const rawEmail of emails) {
    const email = rawEmail.trim();
    if (!email) continue;
    const { rows } = await client.query<{ user_id: string }>(
      `
        SELECT DISTINCT user_id
        FROM auth_identities
        WHERE application IS NULL
          AND auth_method = 'email'
          AND auth_value_normalized = lower(btrim($1))
          AND auth_verified_at IS NOT NULL
      `,
      [email],
    );
    if (rows.length > 1) {
      throw new Error(`Verified email ${email} matches multiple Aomi users`);
    }
    if (rows[0]) candidateUserIds.add(rows[0].user_id);
  }
}

export async function resolveBetterAuthCanonicalUser(
  betterAuthUserId: string,
  legacy: BetterAuthLegacyLinks = {},
): Promise<CanonicalUser> {
  const subject = betterAuthUserId.trim();
  if (!subject) {
    throw new Error("BetterAuth user id cannot be empty");
  }

  return withTransaction(async (client) => {
    const existing = await getBetterAuthMapping(client, subject);
    if (existing) return { userId: existing };

    const candidateUserIds = new Set<string>();
    await addPrivyCandidates(client, candidateUserIds, legacy.privySubjects ?? []);
    await addWalletCandidates(client, candidateUserIds, legacy.wallets ?? []);
    await addVerifiedEmailCandidates(
      client,
      candidateUserIds,
      legacy.verifiedEmails ?? [],
    );

    if (candidateUserIds.size > 1) {
      throw new Error(
        `BetterAuth user ${subject} matches multiple Aomi users: ${Array.from(
          candidateUserIds,
        ).join(", ")}`,
      );
    }

    const userId = Array.from(candidateUserIds)[0] ?? randomUUID();
    await ensureUser(client, userId);
    const mappedUserId = await ensureBetterAuthMapping(client, userId, subject);
    return { userId: mappedUserId };
  });
}

