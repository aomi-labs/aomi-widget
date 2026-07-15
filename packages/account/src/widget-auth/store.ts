import { randomUUID } from "node:crypto";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { z } from "zod";
import { getPool } from "../db/pool";

const siweChallengeSchema = z.object({
  kind: z.literal("siwe_challenge"),
  origin: z.string().url(),
  address: z.string(),
  chainId: z.number().int().positive(),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

const widgetSessionSchema = z.object({
  kind: z.literal("widget_session"),
  origin: z.string().url(),
  userId: z.string().min(1),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

const ticketSchema = z.discriminatedUnion("kind", [
  siweChallengeSchema,
  widgetSessionSchema,
]);

export type SiweChallengeTicket = z.infer<typeof siweChallengeSchema>;
export type WidgetSessionTicket = z.infer<typeof widgetSessionSchema>;
export type WidgetAuthTicket = z.infer<typeof ticketSchema>;

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

type Db = Pool | PoolClient;

type TicketRow = QueryResultRow & {
  value: string;
};

export async function writeWidgetAuthTicket(input: {
  identifier: string;
  ticket: WidgetAuthTicket;
  expiresAt: Date;
  db?: Db;
}): Promise<void> {
  const db = input.db ?? getPool();
  await db.query(
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
  const db = input.db ?? getPool();
  const result = await db.query<TicketRow>(
    `select value
       from ba_verifications
      where identifier = $1 and expires_at > $2
      order by created_at desc
      limit 1`,
    [input.identifier, input.now],
  );
  return parseTicket(result.rows[0]?.value);
}

export async function consumeWidgetAuthTicket(input: {
  identifier: string;
  now: Date;
  db?: Db;
}): Promise<WidgetAuthTicket | null> {
  const db = input.db ?? getPool();
  const result = await db.query<TicketRow>(
    `delete from ba_verifications
      where identifier = $1 and expires_at > $2
      returning value`,
    [input.identifier, input.now],
  );
  return parseTicket(result.rows[0]?.value);
}

export async function deleteWidgetAuthTicket(input: {
  identifier: string;
  db?: Db;
}): Promise<boolean> {
  const db = input.db ?? getPool();
  const result = await db.query(
    `delete from ba_verifications where identifier = $1`,
    [input.identifier],
  );
  return (result.rowCount ?? 0) > 0;
}

function parseTicket(value: string | undefined): WidgetAuthTicket | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    const result = ticketSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
