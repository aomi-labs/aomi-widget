import "server-only";

import { getPool } from "@aomi-labs/account";

import {
  asRecord,
  type OAuthClient,
  parseJson,
  randomToken,
  type TokenPayload,
} from "./oauth-common";

export interface OAuthPersistence {
  client(clientId: string): Promise<OAuthClient | null>;
  claimRefresh(raw: string): Promise<{ id: string; claim: string } | null>;
  finishRefresh(claim: { id: string; claim: string }): Promise<void>;
  restoreRefresh(
    claim: { id: string; claim: string },
    raw: string,
  ): Promise<void>;
  issueFromSession(input: {
    sessionToken: string;
    clientId: string;
    scopes: string[];
  }): Promise<TokenPayload | null>;
  access(raw: string): Promise<{
    betterAuthUserId: string;
    email: string | null;
    emailVerified: boolean;
    name: string | null;
    image: string | null;
    clientId: string;
    scopes: string[];
  } | null>;
}

export class PostgresOAuthPersistence implements OAuthPersistence {
  async client(clientId: string): Promise<OAuthClient | null> {
    const result = await getPool().query<{
      metadata: string | null;
      disabled: boolean;
    }>(
      `select metadata, disabled from ba_oauth_applications where client_id = $1`,
      [clientId],
    );
    const row = result.rows[0];
    if (!row) return null;
    const metadata = asRecord(parseJson(row.metadata));
    return {
      clientId,
      disabled: row.disabled,
      directWalletGrants: Array.isArray(metadata?.aomiDirectWalletGrants)
        ? metadata.aomiDirectWalletGrants.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
    };
  }

  async claimRefresh(raw: string) {
    const claim = `rotating_${randomToken()}`;
    const result = await getPool().query<{ id: string }>(
      `update ba_oauth_access_tokens set refresh_token = $2, updated_at = now()
        where refresh_token = $1 and refresh_token_expires_at > now()
        returning id`,
      [raw, claim],
    );
    return result.rows[0] ? { id: result.rows[0].id, claim } : null;
  }

  async finishRefresh(claim: { id: string; claim: string }): Promise<void> {
    await getPool().query(
      `delete from ba_oauth_access_tokens where id = $1 and refresh_token = $2`,
      [claim.id, claim.claim],
    );
  }

  async restoreRefresh(
    claim: { id: string; claim: string },
    raw: string,
  ): Promise<void> {
    await getPool().query(
      `update ba_oauth_access_tokens set refresh_token = $3, updated_at = now()
        where id = $1 and refresh_token = $2`,
      [claim.id, claim.claim, raw],
    );
  }

  async issueFromSession(input: {
    sessionToken: string;
    clientId: string;
    scopes: string[];
  }): Promise<TokenPayload | null> {
    const db = await getPool().connect();
    try {
      await db.query("begin");
      const session = await db.query<{ user_id: string }>(
        `select s.user_id from ba_sessions s
          join ba_oauth_applications a on a.client_id = $2 and a.disabled = false
         where s.token = $1 and s.expires_at > now()
         for update of s`,
        [input.sessionToken, input.clientId],
      );
      const userId = session.rows[0]?.user_id;
      if (!userId) {
        await db.query("rollback");
        return null;
      }
      const accessToken = randomToken();
      const refreshToken = randomToken();
      await db.query(
        `insert into ba_oauth_access_tokens
          (id, access_token, refresh_token, access_token_expires_at,
           refresh_token_expires_at, client_id, user_id, scopes, created_at, updated_at)
         values ($1, $2, $3, now() + interval '1 hour', now() + interval '7 days',
                 $4, $5, $6, now(), now())`,
        [
          randomToken(),
          accessToken,
          refreshToken,
          input.clientId,
          userId,
          input.scopes.join(" "),
        ],
      );
      await db.query(`delete from ba_sessions where token = $1`, [
        input.sessionToken,
      ]);
      await db.query("commit");
      return {
        access_token: accessToken,
        refresh_token: input.scopes.includes("offline_access")
          ? refreshToken
          : undefined,
        token_type: "Bearer",
        expires_in: 3600,
        scope: input.scopes.join(" "),
      };
    } catch (error) {
      await db.query("rollback");
      throw error;
    } finally {
      db.release();
    }
  }

  async access(raw: string) {
    const result = await getPool().query<{
      user_id: string;
      email: string | null;
      email_verified: boolean;
      name: string | null;
      image: string | null;
      client_id: string;
      scopes: string;
    }>(
      `select u.id as user_id, u.email, u.email_verified, u.name, u.image,
              t.client_id, t.scopes
         from ba_oauth_access_tokens t
         join ba_users u on u.id = t.user_id
         join ba_oauth_applications a on a.client_id = t.client_id
        where t.access_token = $1 and t.access_token_expires_at > now()
          and a.disabled = false`,
      [raw],
    );
    const row = result.rows[0];
    return row
      ? {
          betterAuthUserId: row.user_id,
          email: row.email,
          emailVerified: row.email_verified,
          name: row.name,
          image: row.image,
          clientId: row.client_id,
          scopes: row.scopes.split(/\s+/).filter(Boolean),
        }
      : null;
  }
}
