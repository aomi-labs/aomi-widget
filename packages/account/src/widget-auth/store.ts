import { randomUUID } from "node:crypto";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { z } from "zod";
import { getPool } from "../db/pool";

const challengeBase = {
  origin: z.string().url(),
  address: z.string().min(1),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
};

const siweChallengeSchema = z.object({
  kind: z.literal("siwe_challenge"),
  ...challengeBase,
  chainId: z.number().int().positive(),
});

const siwsChallengeSchema = z.object({
  kind: z.literal("siws_challenge"),
  ...challengeBase,
  chainId: z.string().min(1),
});

const widgetSessionSchema = z.object({
  kind: z.literal("widget_session"),
  sessionId: z.string().uuid(),
  origin: z.string().url(),
  userId: z.string().min(1),
  authMethod: z.string().min(1),
  providerIdentityId: z.string().min(1).optional(),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

const ticketSchema = z.discriminatedUnion("kind", [
  siweChallengeSchema,
  siwsChallengeSchema,
  widgetSessionSchema,
]);

export type WidgetSessionTicket = z.infer<typeof widgetSessionSchema>;
export type WidgetAuthTicket = z.infer<typeof ticketSchema>;
type Db = Pool | PoolClient;
type TicketRow = QueryResultRow & { value: string };

export type WidgetAuthStore = {
  write: typeof writeWidgetAuthTicket;
  read: typeof readWidgetAuthTicket;
  consume: typeof consumeWidgetAuthTicket;
  delete: typeof deleteWidgetAuthTicket;
};

export const widgetAuthStore: WidgetAuthStore = {
  write: writeWidgetAuthTicket,
  read: readWidgetAuthTicket,
  consume: consumeWidgetAuthTicket,
  delete: deleteWidgetAuthTicket,
};

export async function writeWidgetAuthTicket(input: {
  identifier: string;
  ticket: WidgetAuthTicket;
  expiresAt: Date;
  db?: Db;
}): Promise<void> {
  await (input.db ?? getPool()).query(
    `insert into ba_verifications
       (id, identifier, value, expires_at, created_at, updated_at)
     values ($1, $2, $3, $4, now(), now())`,
    [
      randomUUID(),
      input.identifier,
      JSON.stringify(input.ticket),
      input.expiresAt,
    ],
  );
}

export async function readWidgetAuthTicket(input: {
  identifier: string;
  now: Date;
  db?: Db;
}): Promise<WidgetAuthTicket | null> {
  const result = await (input.db ?? getPool()).query<TicketRow>(
    `select value from ba_verifications
      where identifier = $1 and expires_at > $2
      order by created_at desc limit 1`,
    [input.identifier, input.now],
  );
  return parseTicket(result.rows[0]?.value);
}

export async function consumeWidgetAuthTicket(input: {
  identifier: string;
  now: Date;
  db?: Db;
}): Promise<WidgetAuthTicket | null> {
  const result = await (input.db ?? getPool()).query<TicketRow>(
    `delete from ba_verifications
      where identifier = $1 and expires_at > $2 returning value`,
    [input.identifier, input.now],
  );
  return parseTicket(result.rows[0]?.value);
}

export async function deleteWidgetAuthTicket(input: {
  identifier: string;
  db?: Db;
}): Promise<boolean> {
  const result = await (input.db ?? getPool()).query(
    `delete from ba_verifications where identifier = $1`,
    [input.identifier],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteWidgetSessionsForProviderIdentity(input: {
  providerIdentityId: string;
  db?: Db;
}): Promise<number> {
  const result = await (input.db ?? getPool()).query(
    `delete from ba_verifications
      where identifier like 'aomi:widget:session:%'
        and value::jsonb ->> 'providerIdentityId' = $1`,
    [input.providerIdentityId],
  );
  return result.rowCount ?? 0;
}

function parseTicket(value: string | undefined): WidgetAuthTicket | null {
  if (!value) return null;
  try {
    const result = ticketSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
