import "server-only";

import { NextResponse } from "next/server";
import type {
  BotRegistration,
  OperateLogCursor,
  OperateLogsResult,
  OperateAppDetailResult,
  OperateObservabilityResult,
  OperatePartnerPayments,
  OperateStatementResult,
  OperateTransactionCursor,
  OperateTransactionsResult,
  OperateUsageResult,
  UserSource,
  UserSourceLatestDeployment,
} from "@aomi-labs/deploy";
import {
  EXAMPLE_SOURCE,
  exampleStatement,
} from "@build/features/operate/fixtures/wire";
import {
  caipChainId,
  caipChainLabel,
  creditsToUsd,
} from "@build/features/operate/format";
import { deploymentClient } from "@build/server/bff/backend";
import { authorize } from "@build/server/bff/auth";
import {
  launchConfig,
  resolveLaunchPlatform,
} from "@build/server/bff/launch/config";
import { launchErrorResponse } from "@build/server/bff/launch/errors";
import { TimedPromiseCache } from "@build/server/bff/timed-promise-cache";

type DeploymentClientInstance = Awaited<ReturnType<typeof deploymentClient>>;

// An unbounded fan-out is a thundering herd: an account with 100+ sources fired
// every per-source read at once and saturated the manager's connection pool, so
// most reads timed out waiting to acquire and the page hung on "Loading". Cap
// the wave instead — the pool is the scarce resource, not our event loop.
const SOURCE_FANOUT_LIMIT = 6;

// Beyond this a source is treated as unavailable rather than allowed to hold a
// fan-out slot (and the whole page) open. Comfortably above a healthy read.
const SOURCE_READ_TIMEOUT_MS = 8_000;

// Capping concurrency alone still lets a degraded manager stretch a large
// account over batches × timeout. Bound the whole fan-out too: sources we never
// got to are dropped like any other failure, so the page renders what it has
// instead of stalling. Well under the platform's function timeout.
const SOURCE_FANOUT_BUDGET_MS = 20_000;

async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = {
          status: "fulfilled",
          value: await run(items[index]),
        };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

// Losing the race does not cancel the underlying read — it stays in the promise
// cache and can still land for the next request, which is what we want.
function withTimeout<T>(
  load: () => Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  if (ms <= 0) {
    return Promise.reject(new Error(`${label} skipped: fan-out budget spent`));
  }
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    load(),
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}

type Settled<T> = {
  ok: T[];
  /** Source ids this read could not cover, for the page's degraded notice. */
  dropped: number[];
};

// Fan out a per-source read and keep only the sources that succeed. One source
// failing — a freshly scaffolded source with no deployed app, or a transient
// backend blip — must not take down the whole operate page; drop it and render
// the healthy sources instead of failing the entire request. Report what was
// lost: a page silently missing most of the account reads as a complete page.
async function settleBySource<T>(
  sources: UserSource[],
  run: (source: UserSource) => Promise<T>,
): Promise<Settled<T>> {
  const deadline = Date.now() + SOURCE_FANOUT_BUDGET_MS;
  const settled = await mapWithLimit(sources, SOURCE_FANOUT_LIMIT, (source) =>
    withTimeout(
      () => run(source),
      Math.min(SOURCE_READ_TIMEOUT_MS, deadline - Date.now()),
      `operate read for source ${source.id}`,
    ),
  );
  const ok: T[] = [];
  const dropped: number[] = [];
  settled.forEach((result, index) => {
    const source = sources[index];
    if (result.status === "fulfilled") {
      ok.push(result.value);
    } else {
      if (source) dropped.push(source.id);
      console.warn(
        `operate: dropping source ${source?.id} from this page:`,
        result.reason instanceof Error ? result.reason.message : result.reason,
      );
    }
  });
  return { ok, dropped };
}

export type OperateDegraded = {
  /** Sources this page could not read. */
  dropped: number;
  /** Sources the page should have covered. */
  total: number;
};

// A route may fan out more than once over the same sources (transactions and
// statements, say). One source failing both reads is still one missing source,
// so union the ids rather than summing. Undefined — not a zeroed object — when
// nothing was lost, so the key stays off the wire on a healthy page.
function degradedFrom(
  sources: UserSource[],
  ...dropped: number[][]
): OperateDegraded | undefined {
  const ids = new Set(dropped.flat());
  return ids.size ? { dropped: ids.size, total: sources.length } : undefined;
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
      outstandingUsd: creditsToUsd(outstandingCredits),
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

// Reads are account- and source-scoped. The promise cache also coalesces
// concurrent widgets onto one manager request.
const CACHE_TTL_MS = 15_000;
const readCache = {
  sources: new TimedPromiseCache<UserSource[]>(CACHE_TTL_MS),
  transactions: new TimedPromiseCache<OperateTransactionsResult>(CACHE_TTL_MS),
  usage: new TimedPromiseCache<OperateUsageResult>(CACHE_TTL_MS),
  statement: new TimedPromiseCache<OperateStatementResult>(CACHE_TTL_MS),
  logs: new TimedPromiseCache<OperateLogsResult>(CACHE_TTL_MS),
  observability: new TimedPromiseCache<OperateObservabilityResult>(
    CACHE_TTL_MS,
  ),
  appDetail: new TimedPromiseCache<OperateAppDetailResult>(CACHE_TTL_MS),
  deployments: new TimedPromiseCache<UserSourceLatestDeployment[]>(
    CACHE_TTL_MS,
  ),
};

// Test seam: caches would otherwise leak one test's reads into the next.
export function clearOperateCachesForTesting() {
  Object.values(readCache).forEach((cache) => cache.clear());
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
  const platform = resolveLaunchPlatform(
    params.get("platform") ?? undefined,
    config,
  );
  if (!platform) {
    return {
      response: NextResponse.json(
        { error: "missing or invalid `platform`" },
        { status: 400 },
      ),
    };
  }
  const requestedSourceId = Number(params.get("appSourceId"));
  const sources = await readCache.sources.get(
    [session.githubUserId, platform],
    () =>
      client.listUserSources({
        githubUserId: session.githubUserId,
        platform,
      }),
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
      platform,
      sources: [source],
      client,
    };
  }
  return {
    githubUserId: session.githubUserId,
    platform,
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
    const status = params.get("status") ?? undefined;
    const [transactionReads, statementReads] = await Promise.all([
      settleBySource<OperateTransactionsResult>(owned.sources, (source) =>
        readCache.transactions.get(
          [
            owned.githubUserId,
            owned.platform,
            source.id,
            { limit, status, cursor: sourceCursor(cursor, source.id) },
          ],
          () =>
            owned.client.listUserSourceTransactions({
              githubUserId: owned.githubUserId,
              platform: owned.platform,
              appSourceId: source.id,
              limit,
              status,
              cursor: sourceCursor(cursor, source.id) as
                | OperateTransactionCursor
                | string
                | undefined,
            }),
        ),
      ),
      cursor
        ? Promise.resolve({
            ok: [],
            dropped: [],
          } as Settled<OperateStatementResult>)
        : settleBySource<OperateStatementResult>(owned.sources, (source) =>
            readCache.statement.get(
              [owned.githubUserId, owned.platform, source.id, null],
              () =>
                owned.client.getUserSourceStatement({
                  githubUserId: owned.githubUserId,
                  platform: owned.platform,
                  appSourceId: source.id,
                }),
            ),
          ),
    ]);
    const results = transactionReads.ok;
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
      statementReads.ok.map((statement) => ({
        source: statement.source as UserSource,
        payments: statement.payments,
      })),
    );
    const payouts =
      params.get("status") && params.get("status") !== "confirmed"
        ? []
        : payments.events
            .filter((event) => event.kind === "settlement_confirmed")
            .map((event) => {
              const provider =
                event.paymentMethod.toLowerCase() === "coinbase"
                  ? "Coinbase"
                  : event.paymentMethod;
              return {
                id: `partner-payout:${event.id}`,
                kind: "partner_payout",
                externalTxId: event.receiptId ?? event.id,
                application: event.application ?? "Partner payout",
                applicationId: event.applicationId,
                status: "confirmed",
                txHash: event.receiptId,
                chainId: caipChainId(event.chain),
                fromAddress: "",
                toAddress: event.recipient,
                value: `${event.assetAmount ?? event.usd} ${event.asset ?? "USD"}`,
                hasCalldata: false,
                calldataPreview: null,
                description: `Partner settlement via ${provider}`,
                createdAt: event.occurredAt,
                updatedAt: event.occurredAt,
                submittedAt: event.occurredAt,
                family: "evm",
                chainName: caipChainLabel(event.chain) || null,
                fromLabel: null,
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
                method: provider === "Coinbase" ? "Coinbase x402" : provider,
                transfers: [],
                revertReason: null,
                explorerUrl: event.explorerUrl,
                payment: {
                  credits: event.credits,
                  recipient: event.recipient,
                  scope: payments.scope,
                },
                source: event.source,
                platform: owned.platform,
              };
            });
    // Statement-backed payouts have no transaction cursor. Include the full
    // deduplicated overlay on page one, alongside one normal page of app
    // transactions, so an older settlement cannot be sliced out forever.
    const visibleAppTransactions = appTransactions.slice(0, limit);
    const transactions = [...visibleAppTransactions, ...payouts].sort(
      (a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id),
    );
    return NextResponse.json({
      // Every source the account owns, not just the ones this read covered:
      // the filter dropdown is how a user retries a dropped source on its own.
      sources: owned.sources,
      transactions,
      degraded: degradedFrom(
        owned.sources,
        transactionReads.dropped,
        statementReads.dropped,
      ),
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
    const [usageReads, statementReads] = await Promise.all([
      settleBySource<OperateUsageResult>(owned.sources, (source) =>
        readCache.usage.get(
          [owned.githubUserId, owned.platform, source.id, dates],
          () =>
            owned.client.getUserSourceUsage({
              githubUserId: owned.githubUserId,
              platform: owned.platform,
              appSourceId: source.id,
              ...dates,
            }),
        ),
      ),
      settleBySource<OperateStatementResult>(owned.sources, (source) =>
        readCache.statement.get(
          [owned.githubUserId, owned.platform, source.id, dates],
          () =>
            owned.client.getUserSourceStatement({
              githubUserId: owned.githubUserId,
              platform: owned.platform,
              appSourceId: source.id,
              ...dates,
            }),
        ),
      ),
    ]);
    const results = usageReads.ok;
    // `available: false` is a backend that has no statement for this source,
    // not a read we lost — it belongs in the example-statement fallback below,
    // not in the degraded count.
    const statements = statementReads.ok.filter(
      (statement) => statement.available,
    );
    const sum = (pick: (s: OperateStatementResult) => number) =>
      statements.reduce((total, statement) => total + pick(statement), 0);
    return NextResponse.json({
      // Every source the account owns, not just the ones this read covered:
      // the filter dropdown is how a user retries a dropped source on its own.
      sources: owned.sources,
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
      degraded: degradedFrom(
        owned.sources,
        usageReads.dropped,
        statementReads.dropped,
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
    const type = params.get("type") ?? undefined;
    const logReads = await settleBySource<OperateLogsResult>(
      owned.sources,
      (source) =>
        readCache.logs.get(
          [
            owned.githubUserId,
            owned.platform,
            source.id,
            { limit, type, cursor: sourceCursor(cursor, source.id) },
          ],
          () =>
            owned.client.listUserSourceLogs({
              githubUserId: owned.githubUserId,
              platform: owned.platform,
              appSourceId: source.id,
              limit,
              type,
              cursor: sourceCursor(cursor, source.id) as
                | OperateLogCursor
                | string
                | undefined,
            }),
        ),
    );
    const results = logReads.ok;
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
      // Every source the account owns, not just the ones this read covered:
      // the filter dropdown is how a user retries a dropped source on its own.
      sources: owned.sources,
      logs: visible.map(({ cursorSources: _cursorSources, ...log }) => log),
      degraded: degradedFrom(owned.sources, logReads.dropped),
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
    const observabilityReads = await settleBySource<OperateObservabilityResult>(
      owned.sources,
      (source) =>
        readCache.observability.get(
          [owned.githubUserId, owned.platform, source.id],
          () =>
            owned.client.getUserSourceObservability({
              githubUserId: owned.githubUserId,
              platform: owned.platform,
              appSourceId: source.id,
            }),
        ),
    );
    const results = observabilityReads.ok;
    const apps = results.flatMap((result) =>
      result.apps.map((app) => ({
        ...app,
        source: result.source,
        platform: result.platform,
      })),
    );
    return NextResponse.json({
      // Every source the account owns, not just the ones this read covered:
      // the filter dropdown is how a user retries a dropped source on its own.
      sources: owned.sources,
      degraded: degradedFrom(owned.sources, observabilityReads.dropped),
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
        readCache.appDetail.get(
          [owned.githubUserId, owned.platform, source.id, { applicationId }],
          () =>
            owned.client.getUserSourceAppDetail({ ...input, applicationId }),
        ),
        readCache.observability.get(
          [owned.githubUserId, owned.platform, source.id],
          () => owned.client.getUserSourceObservability(input),
        ),
        readCache.transactions.get(
          [owned.githubUserId, owned.platform, source.id, { limit: 100 }],
          () =>
            owned.client.listUserSourceTransactions({ ...input, limit: 100 }),
        ),
        readCache.logs.get(
          [owned.githubUserId, owned.platform, source.id, { limit: 200 }],
          () => owned.client.listUserSourceLogs({ ...input, limit: 200 }),
        ),
        readCache.deployments.get(
          [owned.githubUserId, owned.platform, source.id, { limit: 20 }],
          () => owned.client.listUserSourceDeployments({ ...input, limit: 20 }),
        ),
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
