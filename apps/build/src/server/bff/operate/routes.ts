import "server-only";

import { NextResponse } from "next/server";
import type {
  BotRegistration,
  OperateLogCursor,
  OperateLogsResult,
  OperateObservabilityResult,
  OperateStatementResult,
  OperateTransactionCursor,
  OperateTransactionsResult,
  OperateUsageResult,
  UserSource,
} from "@aomi-labs/deploy";
import { checkRateLimit, getClientIp } from "@build/lib/rate-limit";
import {
  EXAMPLE_SOURCE,
  exampleStatement,
} from "@build/features/operate/fixtures/wire";
import { deploymentClient } from "@build/server/bff/backend";
import { getGitHubSession } from "@build/server/cookies/github";
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

function checkRead(req: Request): NextResponse | null {
  return checkRateLimit(getClientIp(req)).allowed
    ? null
    : NextResponse.json({ error: "Too many requests" }, { status: 429 });
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
  const blocked = checkRead(req);
  if (blocked) return { response: blocked };
  const session = await getGitHubSession();
  if (!session) {
    return {
      response: NextResponse.json(
        { error: "not signed in with GitHub" },
        { status: 401 },
      ),
    };
  }
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

export async function operateTransactionsRoute(req: Request) {
  try {
    const owned = await ownedSources(req);
    if ("response" in owned) return owned.response;
    const params = new URL(req.url).searchParams;
    const limit = pageLimit(params, 50, 100);
    const cursor = parseCompositeCursor(params.get("cursor"));
    const results: OperateTransactionsResult[] = await settleBySource(
      owned.sources,
      (source) =>
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
    );
    const transactions = results
      .flatMap((result) =>
        result.transactions.map((transaction) => ({
          ...transaction,
          source: result.source,
          platform: result.platform,
        })),
      )
      .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
    const visible = transactions.slice(0, limit);
    return NextResponse.json({
      sources: results.map((result) => result.source),
      transactions: visible,
      nextCursor: mergedNextCursor(
        cursor,
        visible,
        transactions,
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
    const logs = results
      .flatMap((result) =>
        result.logs.map((entry) => ({
          ...entry,
          source: result.source,
          platform: result.platform,
        })),
      )
      .sort(
        (a, b) =>
          b.occurredAt - a.occurredAt ||
          b.eventType.localeCompare(a.eventType) ||
          b.id.localeCompare(a.id),
      );
    const visible = logs.slice(0, limit);
    return NextResponse.json({
      sources: results.map((result) => result.source),
      logs: visible,
      nextCursor: mergedNextCursor(
        cursor,
        visible,
        logs,
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
