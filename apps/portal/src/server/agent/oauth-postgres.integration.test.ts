import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import type { PostgresOAuthPersistence } from "./oauth";

const integration =
  process.env.API_UNIFICATION_DATABASE_TEST === "1" ? describe : describe.skip;

integration("PostgreSQL OAuth rotation and device bridge", () => {
  const suffix = randomBytes(8).toString("hex");
  const userId = `ba_api_test_${suffix}`;
  const clientId = `oauth_client_${suffix}`;
  const sessionToken = `ba_session_${suffix}`;
  let store: PostgresOAuthPersistence;
  let pool: Pool;

  beforeAll(async () => {
    const account = await import("@aomi-labs/account");
    const oauth = await import("./oauth");
    pool = account.getPool();
    store = new oauth.PostgresOAuthPersistence();
    await pool.query(
      `insert into ba_users
        (id, name, email, email_verified, image, created_at, updated_at)
       values ($1, 'API test', $2, true, null, now(), now())`,
      [userId, `${userId}@example.test`],
    );
    await pool.query(
      `insert into ba_oauth_applications
        (id, name, metadata, client_id, redirect_urls, type, disabled,
         created_at, updated_at)
       values ($1, 'API test CLI', '{}', $2, 'http://127.0.0.1/callback',
               'public', false, now(), now())`,
      [`app_${suffix}`, clientId],
    );
    await pool.query(
      `insert into ba_sessions
        (id, expires_at, token, created_at, updated_at, user_id)
       values ($1, now() + interval '10 minutes', $2, now(), now(), $3)`,
      [`session_${suffix}`, sessionToken, userId],
    );
  });

  afterAll(async () => {
    await pool.query(`delete from ba_users where id = $1`, [userId]);
  });

  it("exchanges one temporary login session and rotates refresh exactly once", async () => {
    const issued = await store.issueFromSession({
      sessionToken,
      clientId,
      scopes: ["agent", "offline_access"],
    });
    expect(issued?.access_token).toBeTruthy();
    expect(issued?.refresh_token).toBeTruthy();

    const session = await pool.query(
      `select 1 from ba_sessions where token = $1`,
      [sessionToken],
    );
    expect(session.rowCount).toBe(0);

    const access = await store.access(issued!.access_token);
    expect(access).toMatchObject({
      betterAuthUserId: userId,
      clientId,
      scopes: ["agent", "offline_access"],
    });

    const claim = await store.claimRefresh(issued!.refresh_token!);
    expect(claim).not.toBeNull();
    await expect(
      store.claimRefresh(issued!.refresh_token!),
    ).resolves.toBeNull();
    await store.restoreRefresh(claim!, issued!.refresh_token!);
    const reclaimed = await store.claimRefresh(issued!.refresh_token!);
    expect(reclaimed).not.toBeNull();
    await store.finishRefresh(reclaimed!);
    await expect(
      store.claimRefresh(issued!.refresh_token!),
    ).resolves.toBeNull();
  });
});
