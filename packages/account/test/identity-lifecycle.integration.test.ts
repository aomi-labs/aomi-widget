// @vitest-environment node

import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const DATABASE_URL = process.env.AOMI_AUTH_TEST_DATABASE_URL;
const describeWithDatabase = DATABASE_URL ? describe : describe.skip;

describeWithDatabase("identity lifecycle persistence", () => {
  let pool: Pool;
  let ids: ReturnType<typeof testIds>;

  beforeAll(async () => {
    const { Pool: PgPool } = await import("pg");
    pool = new PgPool({ connectionString: DATABASE_URL });
    const schema = await pool.query(
      `select to_regclass('public.ba_users') as users,
              to_regclass('public.ba_sessions') as sessions,
              to_regclass('public.ba_oauth_refresh_tokens') as refresh_tokens,
              to_regclass('public.ba_oauth_access_tokens') as access_tokens,
              to_regclass('public.ba_oauth_consents') as consents,
              to_regclass('public.ba_oauth_device_codes') as device_codes,
              to_regclass('public.ba_verifications') as verifications`,
    );
    if (Object.values(schema.rows[0] ?? {}).some((value) => value === null)) {
      throw new Error(
        "AOMI_AUTH_TEST_DATABASE_URL must target a disposable database with the current Better Auth migrations",
      );
    }
  });

  afterEach(async () => {
    if (!pool || !ids) return;
    await pool.query(`delete from ba_verifications where id = $1`, [ids.wst]);
    await pool.query(`delete from ba_users where id = $1`, [ids.user]);
    await pool.query(`delete from ba_oauth_clients where client_id = $1`, [
      ids.client,
    ]);
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("revokes two browser sessions, OAuth tokens, consent, and WST storage", async () => {
    ids = testIds();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60_000);
    await pool.query(
      `insert into ba_users
         (id, name, email, email_verified, created_at, updated_at, is_anonymous)
       values ($1, 'Lifecycle test', $2, true, $3, $3, false)`,
      [ids.user, `${ids.user}@example.invalid`, now],
    );
    await pool.query(
      `insert into ba_sessions
         (id, expires_at, token, created_at, updated_at, user_id)
       values ($1, $3, $2, $4, $4, $5),
              ($6, $3, $7, $4, $4, $5)`,
      [
        ids.sessionA,
        ids.sessionTokenA,
        expiresAt,
        now,
        ids.user,
        ids.sessionB,
        ids.sessionTokenB,
      ],
    );
    await pool.query(
      `insert into ba_oauth_clients (id, client_id, redirect_uris)
       values ($1, $2, '[]'::jsonb)`,
      [ids.clientRow, ids.client],
    );
    await pool.query(
      `insert into ba_oauth_refresh_tokens
         (id, token, client_id, user_id, expires_at, created_at, scopes)
       values ($1, $2, $3, $4, $5, $6, '["agent:read"]'::jsonb)`,
      [ids.refresh, ids.refreshToken, ids.client, ids.user, expiresAt, now],
    );
    await pool.query(
      `insert into ba_oauth_access_tokens
         (id, token, client_id, user_id, refresh_id, expires_at, created_at, scopes)
       values ($1, $2, $3, $4, $5, $6, $7, '["agent:read"]'::jsonb)`,
      [
        ids.access,
        ids.accessToken,
        ids.client,
        ids.user,
        ids.refresh,
        expiresAt,
        now,
      ],
    );
    await pool.query(
      `insert into ba_oauth_consents
         (id, client_id, user_id, scopes, created_at, updated_at)
       values ($1, $2, $3, '["agent:read"]'::jsonb, $4, $4)`,
      [ids.consent, ids.client, ids.user, now],
    );
    await pool.query(
      `insert into ba_oauth_device_codes
         (id, device_code, user_code, user_id, expires_at, status, client_id,
          scope, resources, oauth_client_id)
       values ($1, $2, $3, $4, $5, 'approved', $6, 'agent:read',
               '["https://portal.example/v1/agent"]'::jsonb, $6)`,
      [
        ids.device,
        ids.deviceCode,
        ids.userCode,
        ids.user,
        expiresAt,
        ids.client,
      ],
    );
    await pool.query(
      `insert into ba_verifications
         (id, identifier, value, expires_at, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $5)`,
      [
        ids.wst,
        `aomi:widget:session:${ids.wst}`,
        JSON.stringify({
          kind: "widget_session",
          userId: ids.user,
          origin: "https://widget.example",
          authMethod: "para",
          issuedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        }),
        expiresAt,
        now,
      ],
    );

    const { deleteBetterAuthUsers } = await import("../src/db/queries");
    const { deleteWidgetSessionsForUser } =
      await import("../src/widget-auth/store");
    await expect(
      deleteBetterAuthUsers({ betterAuthUserIds: [ids.user], db: pool }),
    ).resolves.toBe(1);
    await expect(
      deleteWidgetSessionsForUser({ userId: ids.user, db: pool }),
    ).resolves.toBe(1);

    for (const [table, id] of [
      ["ba_users", ids.user],
      ["ba_sessions", ids.sessionA],
      ["ba_sessions", ids.sessionB],
      ["ba_oauth_refresh_tokens", ids.refresh],
      ["ba_oauth_access_tokens", ids.access],
      ["ba_oauth_consents", ids.consent],
      ["ba_oauth_device_codes", ids.device],
      ["ba_verifications", ids.wst],
    ] as const) {
      const remaining = await pool.query(
        `select 1 from ${table} where id = $1`,
        [id],
      );
      expect(remaining.rowCount, `${table}:${id}`).toBe(0);
    }
  });
});

function testIds() {
  const suffix = randomUUID();
  return {
    user: `lifecycle-user-${suffix}`,
    sessionA: `lifecycle-session-a-${suffix}`,
    sessionB: `lifecycle-session-b-${suffix}`,
    sessionTokenA: `lifecycle-session-token-a-${suffix}`,
    sessionTokenB: `lifecycle-session-token-b-${suffix}`,
    clientRow: `lifecycle-client-row-${suffix}`,
    client: `lifecycle-client-${suffix}`,
    refresh: `lifecycle-refresh-${suffix}`,
    refreshToken: `lifecycle-refresh-token-${suffix}`,
    access: `lifecycle-access-${suffix}`,
    accessToken: `lifecycle-access-token-${suffix}`,
    consent: `lifecycle-consent-${suffix}`,
    device: `lifecycle-device-${suffix}`,
    deviceCode: `lifecycle-device-code-${suffix}`,
    userCode: `LIFE-${suffix.slice(0, 8)}`,
    wst: `lifecycle-wst-${suffix}`,
  };
}
