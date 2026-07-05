import type { PgClient } from "./db";
import { getPool, withTransaction } from "./db";
import { nowSeconds, randomToken, sha256 } from "./crypto";

const DEVICE_TTL_SECONDS = Number(
  process.env.AOMI_CLI_DEVICE_TTL_SECONDS ?? "600",
);
const CLI_SESSION_TTL_SECONDS = Number(
  process.env.AOMI_CLI_SESSION_TTL_SECONDS ?? String(30 * 24 * 60 * 60),
);
const DEVICE_INTERVAL_SECONDS = Number(
  process.env.AOMI_CLI_DEVICE_INTERVAL_SECONDS ?? "2",
);

export type DeviceStartResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_at: number;
  interval: number;
};

export async function startDeviceSession(
  origin: string,
): Promise<DeviceStartResponse> {
  const deviceCode = randomToken(32);
  const userCode = randomToken(5).slice(0, 8).toUpperCase();
  const now = nowSeconds();
  const expiresAt = now + DEVICE_TTL_SECONDS;
  await getPool().query(
    `
      INSERT INTO bff_cli_device_sessions (
        device_code_hash,
        user_code_hash,
        status,
        expires_at,
        interval_seconds,
        created_at,
        updated_at
      )
      VALUES ($1, $2, 'pending', $3, $4, $5, $5)
    `,
    [
      sha256(deviceCode),
      sha256(userCode),
      expiresAt,
      DEVICE_INTERVAL_SECONDS,
      now,
    ],
  );

  const verificationBase =
    process.env.AOMI_CLI_DEVICE_VERIFICATION_URL ??
    `${origin.replace(/\/+$/, "")}/api/cli/device/approve`;
  const verificationUri = `${verificationBase}?user_code=${encodeURIComponent(userCode)}`;

  return {
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: verificationUri,
    expires_at: expiresAt,
    interval: DEVICE_INTERVAL_SECONDS,
  };
}

export async function approveDeviceSession(
  userCode: string,
  userId: string,
): Promise<boolean> {
  const now = nowSeconds();
  const result = await getPool().query(
    `
      UPDATE bff_cli_device_sessions
      SET status = 'approved',
          user_id = $2,
          updated_at = $3
      WHERE user_code_hash = $1
        AND status = 'pending'
        AND expires_at > $3
      RETURNING id
    `,
    [sha256(userCode.trim().toUpperCase()), userId, now],
  );
  return result.rowCount === 1;
}

async function createCliCredential(
  client: PgClient,
  userId: string,
  userAgent: string | null,
): Promise<{ credential: string; expiresAt: number }> {
  const credential = `aomi_cli_${randomToken(32)}`;
  const now = nowSeconds();
  const expiresAt = now + CLI_SESSION_TTL_SECONDS;
  await client.query(
    `
      INSERT INTO bff_cli_sessions (
        token_hash,
        user_id,
        created_at,
        expires_at,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [sha256(credential), userId, now, expiresAt, userAgent],
  );
  return { credential, expiresAt };
}

export async function pollDeviceSession(
  deviceCode: string,
  userAgent: string | null,
): Promise<
  | { status: "authorization_pending"; interval: number }
  | { status: "expired_token" }
  | { status: "access_denied" }
  | { status: "ok"; credential: string; expires_at: number; user_id: string }
> {
  return withTransaction(async (client) => {
    const now = nowSeconds();
    const { rows } = await client.query<{
      id: number;
      status: string;
      user_id: string | null;
      expires_at: number;
      interval_seconds: number;
    }>(
      `
        SELECT id, status, user_id, expires_at, interval_seconds
        FROM bff_cli_device_sessions
        WHERE device_code_hash = $1
        FOR UPDATE
      `,
      [sha256(deviceCode)],
    );
    const row = rows[0];
    if (!row || row.expires_at <= now) return { status: "expired_token" };
    if (row.status === "denied") return { status: "access_denied" };
    if (row.status !== "approved" || !row.user_id) {
      return {
        status: "authorization_pending",
        interval: row.interval_seconds,
      };
    }

    const credential = await createCliCredential(
      client,
      row.user_id,
      userAgent,
    );
    await client.query(
      `
        UPDATE bff_cli_device_sessions
        SET status = 'consumed',
            consumed_at = $2,
            updated_at = $2
        WHERE id = $1
      `,
      [row.id, now],
    );
    return {
      status: "ok",
      credential: credential.credential,
      expires_at: credential.expiresAt,
      user_id: row.user_id,
    };
  });
}

export async function resolveCliCredential(
  credential: string,
): Promise<string | undefined> {
  const now = nowSeconds();
  const { rows } = await getPool().query<{ user_id: string }>(
    `
      UPDATE bff_cli_sessions
      SET last_used_at = $2
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > $2
      RETURNING user_id
    `,
    [sha256(credential), now],
  );
  return rows[0]?.user_id;
}
