import "server-only";

import { NextResponse } from "next/server";
import type {
  BotRegistration,
  OperateLogCursor,
  OperateLogsResult,
  OperateObservabilityResult,
  OperatePartnerPayments,
  OperateStatementResult,
  OperateTransactionCursor,
  OperateTransactionsResult,
  OperateUsageResult,
  UserSource,
} from "@aomi-labs/deploy";
import {
  EXAMPLE_SOURCE,
  exampleStatement,
} from "@build/features/operate/fixtures/wire";
import { deploymentClient } from "@build/server/bff/backend";
import { authorize } from "@build/server/bff/auth";
import { launchConfig } from "@build/server/bff/launch/config";
import { launchErrorResponse } from "@build/server/bff/launch/errors";

type DeploymentClientInstance = Awaited<ReturnType<typeof deploymentClient>>;

// Fan out a per-source read and keep only the sources that succeed. One source
// failing — a freshly scaffolded source with no deployed app, or a transient
// backend blip — must not take down the whole operate page; drop it and render
// the healthy sources instead of failing the entire request.
async function settleBySource<T>(
  sources: UserSource[],
  run: (source: UserSource) => Promise<T>,
): Promise<T[]> {
  const settled = await Promise.allSettled(sources.map(run));
  const ok: T[] = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      ok.push(result.value);
    } else {
      console.warn(
        `operate: dropping source ${sources[index]?.id} from this page:`,
        result.reason instanceof Error ? result.reason.message : result.reason,
      );
    }
  });
  return ok;
}

function isValidAppSourceId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function pageLimit(params: URLSearchParams, fallback: number, max: number) {
  const value = Number(params.get("limit") ?? String(fallback));
  return Number.isSafeInteger(value) && value > 0
    ? Math.min(value, max)
    : fallback;
}

type CompositeCursor = {
  perSource?: Record<string, unknown>;
};

function parseCompositeCursor(value: string | null): CompositeCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as CompositeCursor;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function sourceCursor(
  cursor: CompositeCursor | null,
  sourceId: number,
): unknown | undefined {
  return cursor?.perSource?.[String(sourceId)];
}

function transactionCursorFor(row: {
  createdAt: number;
  id: string;
}): OperateTransactionCursor {
  return { createdAt: row.createdAt, id: row.id };
}

function logCursorFor(row: {
  occurredAt: number;
  eventType: string;
  id: string;
}): OperateLogCursor {
  return {
    occurredAt: row.occurredAt,
    eventType: row.eventType,
    id: row.id,
  };
}

function mergedPartnerPayments(
  rows: Array<{ source: UserSource; payments: OperatePartnerPayments }>,
) {
  const sum = (pick: (summary: OperatePartnerPayments["summary"]) => number) =>
    rows.reduce((total, row) => total + pick(row.payments.summary), 0);
  const eventById = new Map<
    string,
    OperatePartnerPayments["events"][number] & { source: UserSource }
  >();
  for (const row of rows) {
    for (const event of row.payments.events) {
      const key = `${event.kind}:${event.id}`;
      const existing = eventById.get(key);
      if (!existing) {
        eventById.set(key, { ...event, source: row.source });
      } else if (existing.applicationId !== event.applicationId) {
        // A recipient-bucket settlement can clear fees for apps in multiple
        // projects. It belongs to the beneficiary, not whichever project the
        // BFF happened to merge first.
        existing.application = null;
        existing.applicationId = null;
      }
    }
  }
  const events = [...eventById.values()].sort(
    (a, b) => b.occurredAt - a.occurredAt || b.id.localeCompare(a.id),
  );
  const buckets = [
    ...new Map(
      rows.flatMap((row) =>
        row.payments.buckets.map((bucket) => [bucket.id, bucket]),
      ),
    ).values(),
  ];
  const settlementEvents = events.filter(
    (event) => event.kind === "settlement_confirmed",
  );
  const outstandingCredits = buckets.reduce(
    (total, bucket) => total + bucket.outstandingCredits,
    0,
  );
  return {
    available: rows.some((row) => row.payments.available),
    scope: "recipient_bucket",
    summary: {
      accruedCredits: sum((summary) => summary.accruedCredits),
      accruedUsd: sum((summary) => summary.accruedUsd),
      settledCredits: settlementEvents.reduce(
        (total, event) => total + event.credits,
        0,
      ),
      settledUsd: settlementEvents.reduce(
        (total, event) => total + event.usd,
        0,
      ),
      outstandingCredits,
      outstandingUsd: outstandingCredits / 100,
      pricedCalls: sum((summary) => summary.pricedCalls),
      settlements: settlementEvents.length,
    },
    resources: rows.flatMap((row) =>
      row.payments.resources.map((resource) => ({
        ...resource,
        source: row.source,
      })),
    ),
    buckets,
    events,
  };
}

function chainId(chain: string | null): number {
  const value = Number(chain?.split(":")[1] ?? 0);
  return Number.isSafeInteger(value) ? value : 0;
}

function chainName(chain: string | null): string | null {
  switch (chain) {
    case "eip155:1":
      return "Ethereum";
    case "eip155:8453":
      return "Base";
    case "eip155:84532":
      return "Base Sepolia";
    case "eip155:11155111":
      return "Sepolia";
    default:
      return chain;
  }
}

function mergedNextCursor<T extends { source: { id: number } }>(
  previous: CompositeCursor | null,
  visible: T[],
  allRows: T[],
  results: Array<{ nextCursor: unknown }>,
  cursorFor: (row: T) => unknown,
): CompositeCursor | null {
  const hasMore =
    allRows.length > visible.length ||
    results.some((result) => result.nextCursor != null);
  if (!hasMore) return null;
  const perSource: Record<string, unknown> = {
    ...(previous?.perSource ?? {}),
  };
  for (const row of visible) {
    perSource[String(row.source.id)] = cursorFor(row);
  }
  return { perSource };
}

// Every operate route re-derives the caller's owned sources, and one page
// load fires several of them at once. Cache the ownership lookup — including
// the in-flight promise, so concurrent widgets coalesce onto one backend
// call — for a short window per user+platform. Reads only; a 15s-stale
// source list is harmless for usage/logs/observability pages.
const SOURCES_CACHE_TTL_MS = 15_000;
const sourcesCache = new Map<
  string,
  { at: number; sources: Promise<UserSource[]> }
>();

// Test seam: the cache would otherwise leak one test's source list into the
// next within the 15s TTL.
export function clearSourcesCacheForTesting() {
  sourcesCache.clear();
}

function cachedUserSources(
  client: DeploymentClientInstance,
  githubUserId: string,
  platform: string,
): Promise<UserSource[]> {
  const key = `${githubUserId}\u0000${platform}`;
  const hit = sourcesCache.get(key);
  if (hit && Date.now() - hit.at < SOURCES_CACHE_TTL_MS) return hit.sources;
  const sources = client.listUserSources({ githubUserId, platform });
  sourcesCache.set(key, { at: Date.now(), sources });
  sources.catch(() => sourcesCache.delete(key));
  return sources;
}

async function ownedSources(req: Request): Promise<
  | {
      response: NextResponse;
    }
  | {
      githubUserId: string;
      platform: string;
      sources: UserSource[];
      client: DeploymentClientInstance;
    }
> {
  const auth = await authorize(req);
  if ("response" in auth) return auth;
  const { session } = auth;
  const config = launchConfig();
  const client = await deploymentClient();
  const params = new URL(req.url).searchParams;
  const requestedSourceId = Number(params.get("appSourceId"));
  const sources = await cachedUserSources(
    client,
    session.githubUserId,
    config.platform,
  );
  if (params.has("appSourceId")) {
    if (!isValidAppSourceId(requestedSourceId)) {
      return {
        response: NextResponse.json(
          { error: "missing or invalid `appSourceId`" },
          { status: 400 },
        ),
      };
    }
    const source = sources.find(
      (candidate) => candidate.id === requestedSourceId,
    );
    if (!source) {
      return {
        response: NextResponse.json(
          { error: "source not found for this user" },
          { status: 404 },
        ),
      };
    }
    return {
      githubUserId: session.githubUserId,
      platform: config.platform,
      sources: [source],
      client,
    };
  }
  return {
    githubUserId: session.githubUserId,
    platform: config.platform,
    sources,
    client,
  };
}

export async function operateBotsRoute(req: Request) {
  const owned = await ownedSources(req);
  if ("response" in owned) return owned.response;
  try {
    const bots = await owned.client.listUserBots({
      githubUserId: owned.githubUserId,
      platform: owned.platform,
    });
    return NextResponse.json({
      sources: owned.sources,
      bots,
    });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function operateBotsCreateRoute(req: Request) {
  const owned = await ownedSources(req);
  if ("response" in owned) return owned.response;

  const body = (await req.json().catch(() => ({}))) as {
    applicationIds?: unknown;
    primaryApplicationId?: unknown;
    credential?: unknown;
    label?: unknown;
    threadMode?: unknown;
  };
  if (
    !Array.isArray(body.applicationIds) ||
    body.applicationIds.length === 0 ||
    body.applicationIds.some((id) => typeof id !== "number") ||
    typeof body.primaryApplicationId !== "number"
  ) {
    return NextResponse.json(
      { error: "missing or invalid app mappings" },
      { status: 400 },
    );
  }
  if (typeof body.credential !== "string" || !body.credential.trim()) {
    return NextResponse.json(
      { error: "missing `credential`" },
      { status: 400 },
    );
  }
  const allowedApplicationIds = new Set(
    owned.sources.flatMap((source) => (source.apps ?? []).map((app) => app.id)),
  );
  const applicationIds = body.applicationIds as number[];
  if (new Set(applicationIds).size !== applicationIds.length) {
    return NextResponse.json(
      { error: "`applicationIds` must be unique" },
      { status: 400 },
    );
  }
  if (
    !applicationIds.every((id) => allowedApplicationIds.has(id)) ||
    !applicationIds.includes(body.primaryApplicationId)
  ) {
    return NextResponse.json(
      { error: "selected apps are not owned by this user" },
      { status: 403 },
    );
  }

  try {
    const bot: BotRegistration = await owned.client.createUserBot({
      githubUserId: owned.githubUserId,
      platform: owned.platform,
      applicationIds,
      primaryApplicationId: body.primaryApplicationId,
      botPlatform: "telegram",
      credential: body.credential.trim(),
      label: typeof body.label === "string" ? body.label : undefined,
      threadMode:
        typeof body.threadMode === "string" ? body.threadMode : undefined,
    });
    return NextResponse.json({ bot }, { status: 201 });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function operateBotsDeleteRoute(req: Request) {
  const owned = await ownedSources(req);
  if ("response" in owned) return owned.response;

  const params = new URL(req.url).searchParams;
  const botId = params.get("botId");
  if (!botId) {
    return NextResponse.json({ error: "missing `botId`" }, { status: 400 });
  }
  try {
    await owned.client.deleteUserBot({
      githubUserId: owned.githubUserId,
      platform: owned.platform,
      botId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function operateBotsUpdateRoute(req: Request) {
  const owned = await ownedSources(req);
  if ("response" in owned) return owned.response;
  const body = (await req.json().catch(() => ({}))) as {
    botId?: unknown;
    applicationIds?: unknown;
    primaryApplicationId?: unknown;
  };
  if (
    typeof body.botId !== "string" ||
    !Array.isArray(body.applicationIds) ||
    body.applicationIds.length === 0 ||
    body.applicationIds.some((id) => typeof id !== "number") ||
    typeof body.primaryApplicationId !== "number"
  ) {
    return NextResponse.json(
      { error: "invalid bot mapping update" },
      { status: 400 },
    );
  }
  const allowed = new Set(
    owned.sources.flatMap((source) => (source.apps ?? []).map((app) => app.id)),
  );
  const applicationIds = body.applicationIds as number[];
  if (new Set(applicationIds).size !== applicationIds.length) {
    return NextResponse.json(
      { error: "`applicationIds` must be unique" },
      { status: 400 },
    );
  }
  if (
    !applicationIds.every((id) => allowed.has(id)) ||
    !applicationIds.includes(body.primaryApplicationId)
  ) {
    return NextResponse.json(
      { error: "selected apps are not owned by this user" },
      { status: 403 },
    );
  }
  try {
    const bot = await owned.client.updateUserBot({
      githubUserId: owned.githubUserId,
      platform: owned.platform,
      botId: body.botId,
      applicationIds,
      primaryApplicationId: body.primaryApplicationId,
    });
    return NextResponse.json({ bot });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

// ── model keys (funder-ladder app rung, builder-owned) ─────────────────────

/// GET → { sources, keys }: the builder's key inventory with grants, plus
/// their sources (for the "apply to projects" picker). Never key material.
export async function operateModelKeysRoute(req: Request) {
  const owned = await ownedSources(req);
  if ("response" in owned) return owned.response;
  try {
    const keys = await owned.client.listBuilderModelKeys({
      githubUserId: owned.githubUserId,
      platform: owned.platform,
    });
    return NextResponse.json({ sources: owned.sources, keys });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

/// POST { provider, key, label? } → create; with `keyId` → rotate in place.
export async function operateModelKeysSaveRoute(req: Request) {
  const owned = await ownedSources(req);
  if ("response" in owned) return owned.response;

  const body = (await req.json().catch(() => ({}))) as {
    keyId?: unknown;
    provider?: unknown;
    key?: unknown;
    label?: unknown;
  };
  if (typeof body.provider !== "string" || !body.provider.trim()) {
    return NextResponse.json({ error: "missing `provider`" }, { status: 400 });
  }
  if (typeof body.key !== "string" || !body.key.trim()) {
    return NextResponse.json({ error: "missing `key`" }, { status: 400 });
  }
  if (body.keyId !== undefined && typeof body.keyId !== "number") {
    return NextResponse.json({ error: "invalid `keyId`" }, { status: 400 });
  }

  try {
    const key = await owned.client.saveBuilderModelKey({
      githubUserId: owned.githubUserId,
      platform: owned.platform,
      keyId: body.keyId as number | undefined,
      provider: body.provider.trim(),
      key: body.key.trim(),
      label: typeof body.label === "string" ? body.label : undefined,
    });
    return NextResponse.json({ key }, { status: 201 });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

/// PUT { keyId, applicationIds } → replace the key's grant set.
export async function operateModelKeysGrantsRoute(req: Request) {
  const owned = await ownedSources(req);
  if ("response" in owned) return owned.response;

  const body = (await req.json().catch(() => ({}))) as {
    keyId?: unknown;
    applicationIds?: unknown;
  };
  if (
    typeof body.keyId !== "number" ||
    !Array.isArray(body.applicationIds) ||
    body.applicationIds.some((id) => typeof id !== "number")
  ) {
    return NextResponse.json(
      { error: "missing or invalid `keyId` / `applicationIds`" },
      { status: 400 },
    );
  }

  try {
    const key = await owned.client.setModelKeyGrants({
      githubUserId: owned.githubUserId,
      platform: owned.platform,
      keyId: body.keyId,
      applicationIds: body.applicationIds as number[],
    });
    return NextResponse.json({ key });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function operateModelKeysDeleteRoute(req: Request) {
  const owned = await ownedSources(req);
  if ("response" in owned) return owned.response;

  const params = new URL(req.url).searchParams;
  const keyId = Number(params.get("keyId"));
  if (!Number.isFinite(keyId) || keyId <= 0) {
    return NextResponse.json(
      { error: "missing or invalid `keyId`" },
      { status: 400 },
    );
  }

  try {
    await owned.client.deleteBuilderModelKey({
      githubUserId: owned.githubUserId,
      platform: owned.platform,
      keyId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function operateTransactionsRoute(req: Request) {
  try {
    const owned = await ownedSources(req);
    if ("response" in owned) return owned.response;
    const params = new URL(req.url).searchParams;
    const limit = pageLimit(params, 50, 100);
    const cursor = parseCompositeCursor(params.get("cursor"));
    const [results, statements] = await Promise.all([
      settleBySource<OperateTransactionsResult>(owned.sources, (source) =>
        owned.client.listUserSourceTransactions({
          githubUserId: owned.githubUserId,
          platform: owned.platform,
          appSourceId: source.id,
          limit,
          status: params.get("status") ?? undefined,
          cursor: sourceCursor(cursor, source.id) as
            | OperateTransactionCursor
            | string
            | undefined,
        }),
      ),
      cursor
        ? Promise.resolve([])
        : settleBySource<OperateStatementResult>(owned.sources, (source) =>
            owned.client.getUserSourceStatement({
              githubUserId: owned.githubUserId,
              platform: owned.platform,
              appSourceId: source.id,
            }),
          ),
    ]);
    const appTransactions = results
      .flatMap((result) =>
        result.transactions.map((transaction) => ({
          ...transaction,
          kind: "app_transaction",
          source: result.source,
          platform: result.platform,
        })),
      )
      .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
    const payments = mergedPartnerPayments(
      statements.map((statement) => ({
        source: statement.source as UserSource,
        payments: statement.payments,
      })),
    );
    const payouts =
      params.get("status") && params.get("status") !== "confirmed"
        ? []
        : payments.events
            .filter((event) => event.kind === "settlement_confirmed")
            .map((event) => ({
              id: `partner-payout:${event.id}`,
              kind: "partner_payout",
              externalTxId: event.receiptId ?? event.id,
              application: event.application ?? "Partner payout",
              applicationId: event.applicationId,
              status: "confirmed",
              txHash: event.receiptId,
              chainId: chainId(event.chain),
              fromAddress: "",
              toAddress: event.recipient,
              value: `${event.assetAmount ?? event.usd} ${event.asset ?? "USD"}`,
              hasCalldata: false,
              calldataPreview: null,
              description: `Partner payout via ${event.paymentMethod}`,
              createdAt: event.occurredAt,
              updatedAt: event.occurredAt,
              submittedAt: event.occurredAt,
              family: "evm",
              chainName: chainName(event.chain),
              fromLabel: "settlement payer",
              toLabel: "beneficiary",
              valueUsd: `$${event.usd.toFixed(2)}`,
              block: null,
              slot: null,
              confirmations: null,
              gasUsed: null,
              gasLimit: null,
              effGasPrice: null,
              computeUnits: null,
              computeLimit: null,
              priorityFee: null,
              txFee: null,
              platformFee: null,
              nonce: null,
              method: "x402 settlement",
              transfers: [
                `${event.assetAmount ?? event.usd} ${event.asset ?? "USD"} → ${event.recipient}`,
              ],
              revertReason: null,
              explorerUrl: event.explorerUrl,
              payment: {
                credits: event.credits,
                recipient: event.recipient,
                scope: payments.scope,
              },
              source: event.source,
              platform: owned.platform,
            }));
    // Statement-backed payouts have no transaction cursor. Include the full
    // deduplicated overlay on page one, alongside one normal page of app
    // transactions, so an older settlement cannot be sliced out forever.
    const visibleAppTransactions = appTransactions.slice(0, limit);
    const transactions = [...visibleAppTransactions, ...payouts].sort(
      (a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id),
    );
    return NextResponse.json({
      sources: results.map((result) => result.source),
      transactions,
      nextCursor: mergedNextCursor(
        cursor,
        visibleAppTransactions,
        appTransactions,
        results,
        transactionCursorFor,
      ),
    });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function operateUsageRoute(req: Request) {
  try {
    const owned = await ownedSources(req);
    if ("response" in owned) return owned.response;
    const params = new URL(req.url).searchParams;
    const dates = {
      fromDate: params.get("fromDate") ?? undefined,
      toDate: params.get("toDate") ?? undefined,
    };
    // The statement lives on its own manager endpoint. A backend without it
    // (or with `available: false` — statement_entries not migrated) drops out
    // of `statements`; until BE parity lands we serve the example statement
    // instead (flagged `example: true`) so the design ships visible.
    const [results, statements] = await Promise.all([
      settleBySource<OperateUsageResult>(owned.sources, (source) =>
        owned.client.getUserSourceUsage({
          githubUserId: owned.githubUserId,
          platform: owned.platform,
          appSourceId: source.id,
          ...dates,
        }),
      ),
      settleBySource<OperateStatementResult>(owned.sources, (source) =>
        owned.client.getUserSourceStatement({
          githubUserId: owned.githubUserId,
          platform: owned.platform,
          appSourceId: source.id,
          ...dates,
        }),
      ).then((rows) => rows.filter((statement) => statement.available)),
    ]);
    const sum = (pick: (s: OperateStatementResult) => number) =>
      statements.reduce((total, statement) => total + pick(statement), 0);
    return NextResponse.json({
      sources: results.map((result) => result.source),
      range: results[0]?.range ?? null,
      daily: results.flatMap((result) =>
        result.daily.map((row) => ({
          ...row,
          source: result.source,
          platform: result.platform,
        })),
      ),
      breakdown: results.flatMap((result) =>
        result.breakdown.map((row) => ({
          ...row,
          source: result.source,
          platform: result.platform,
        })),
      ),
      example: statements.length ? undefined : true,
      statement: statements.length
        ? {
            range: statements[0].range,
            summary: {
              grossRevenue: sum((s) => s.summary.grossRevenue),
              platformFees: sum((s) => s.summary.platformFees),
              serviceCharges: sum((s) => s.summary.serviceCharges),
              net: sum((s) => s.summary.net),
            },
            revenue: statements.flatMap((statement) =>
              statement.revenue.map((row) => ({
                ...row,
                source: statement.source,
              })),
            ),
            charges: statements.flatMap((statement) =>
              statement.charges.map((row) => ({
                ...row,
                source: statement.source,
              })),
            ),
            entries: statements
              .flatMap((statement) =>
                statement.entries.map((row) => ({
                  ...row,
                  source: statement.source,
                })),
              )
              .sort(
                (a, b) =>
                  b.day.localeCompare(a.day) ||
                  a.application.localeCompare(b.application),
              ),
            payments: mergedPartnerPayments(
              statements.map((statement) => ({
                source: statement.source as UserSource,
                payments: statement.payments,
              })),
            ),
          }
        : exampleStatement(owned.sources[0] ?? EXAMPLE_SOURCE),
    });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function operateLogsRoute(req: Request) {
  try {
    const owned = await ownedSources(req);
    if ("response" in owned) return owned.response;
    const params = new URL(req.url).searchParams;
    const limit = pageLimit(params, 100, 200);
    const cursor = parseCompositeCursor(params.get("cursor"));
    const results: OperateLogsResult[] = await settleBySource(
      owned.sources,
      (source) =>
        owned.client.listUserSourceLogs({
          githubUserId: owned.githubUserId,
          platform: owned.platform,
          appSourceId: source.id,
          limit,
          type: params.get("type") ?? undefined,
          cursor: sourceCursor(cursor, source.id) as
            | OperateLogCursor
            | string
            | undefined,
        }),
    );
    const sourcedLogs = results.flatMap((result) =>
      result.logs.map((entry) => ({
        ...entry,
        source: result.source,
        platform: result.platform,
      })),
    );
    const logById = new Map<
      string,
      (typeof sourcedLogs)[number] & { cursorSources: UserSource[] }
    >();
    for (const log of sourcedLogs) {
      const sharedSettlement = log.details.source === "partner_settlement";
      const key = sharedSettlement
        ? `partner-settlement:${log.id}`
        : `${log.source.id}:${log.eventType}:${log.id}`;
      const existing = logById.get(key);
      if (existing) {
        existing.cursorSources.push(log.source as UserSource);
      } else {
        logById.set(key, {
          ...log,
          cursorSources: [log.source as UserSource],
        });
      }
    }
    const logs = [...logById.values()].sort(
      (a, b) =>
        b.occurredAt - a.occurredAt ||
        b.eventType.localeCompare(a.eventType) ||
        b.id.localeCompare(a.id),
    );
    const visible = logs.slice(0, limit);
    const cursorRows = visible.flatMap((log) =>
      log.cursorSources.map((source) => ({ ...log, source })),
    );
    return NextResponse.json({
      sources: results.map((result) => result.source),
      logs: visible.map(({ cursorSources: _cursorSources, ...log }) => log),
      nextCursor: mergedNextCursor(
        cursor,
        cursorRows,
        sourcedLogs,
        results,
        logCursorFor,
      ),
    });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function operateObservabilityRoute(req: Request) {
  try {
    const owned = await ownedSources(req);
    if ("response" in owned) return owned.response;
    const results: OperateObservabilityResult[] = await settleBySource(
      owned.sources,
      (source) =>
        owned.client.getUserSourceObservability({
          githubUserId: owned.githubUserId,
          platform: owned.platform,
          appSourceId: source.id,
        }),
    );
    const apps = results.flatMap((result) =>
      result.apps.map((app) => ({
        ...app,
        source: result.source,
        platform: result.platform,
      })),
    );
    return NextResponse.json({
      sources: results.map((result) => result.source),
      scope: "owned_applications",
      monitoring: {
        provider: "grafana_prometheus",
        status: results.some((result) => result.monitoring?.status === "ok")
          ? results.some((result) => result.monitoring?.status !== "ok")
            ? "partial"
            : "ok"
          : (results[0]?.monitoring?.status ?? "unconfigured"),
        windowSeconds: results[0]?.monitoring?.windowSeconds ?? 0,
      },
      apps,
      payments: mergedPartnerPayments(
        results.map((result) => ({
          source: result.source as UserSource,
          payments: result.payments,
        })),
      ),
      dashboardLinks: results.flatMap((result) => result.dashboardLinks),
      platformMetrics: results[0]?.platformMetrics ?? [],
    });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function operateAppDetailRoute(req: Request) {
  const params = new URL(req.url).searchParams;
  const applicationId = Number(params.get("applicationId"));
  if (!isValidAppSourceId(applicationId)) {
    return NextResponse.json(
      { error: "missing or invalid `applicationId`" },
      { status: 400 },
    );
  }

  try {
    const owned = await ownedSources(req);
    if ("response" in owned) return owned.response;
    const source = owned.sources[0];
    if (!source) {
      return NextResponse.json(
        { error: "source not found for this user" },
        { status: 404 },
      );
    }

    const input = {
      githubUserId: owned.githubUserId,
      platform: owned.platform,
      appSourceId: source.id,
    };
    const [detail, observability, transactionsResult, logsResult, deployments] =
      await Promise.all([
        owned.client.getUserSourceAppDetail({ ...input, applicationId }),
        owned.client.getUserSourceObservability(input),
        owned.client.listUserSourceTransactions({ ...input, limit: 100 }),
        owned.client.listUserSourceLogs({ ...input, limit: 200 }),
        owned.client.listUserSourceDeployments({ ...input, limit: 20 }),
      ]);

    return NextResponse.json({
      detail,
      health:
        observability.apps.find((app) => app.applicationId === applicationId) ??
        null,
      transactions: transactionsResult.transactions
        .filter((row) => row.applicationId === applicationId)
        .slice(0, 4),
      logs: logsResult.logs
        .filter((row) => row.applicationId === applicationId)
        .slice(0, 4),
      deployments,
    });
  } catch (err) {
    return launchErrorResponse(err);
  }
}
