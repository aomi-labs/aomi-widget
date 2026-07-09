import "server-only";

import { NextResponse } from "next/server";
import type {
  OperateLogCursor,
  OperateLogsResult,
  OperateObservabilityResult,
  OperateTransactionCursor,
  OperateTransactionsResult,
  OperateUsageResult,
  UserSource,
} from "@aomi-labs/deploy";
import { checkRateLimit, getClientIp } from "@build/lib/rate-limit";
import { deploymentClient } from "@build/server/bff/backend";
import { getGitHubSession } from "@build/server/cookies/github";
import { launchConfig } from "@build/server/bff/launch/config";
import { launchErrorResponse } from "@build/server/bff/launch/errors";

type DeploymentClientInstance = Awaited<ReturnType<typeof deploymentClient>>;

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
  const sources = await client.listUserSources({
    githubUserId: session.githubUserId,
    platform: config.platform,
  });
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

export async function operateAgentsRoute(req: Request) {
  try {
    const owned = await ownedSources(req);
    if ("response" in owned) return owned.response;
    const results = await Promise.all(
      owned.sources.map((source) =>
        owned.client.listUserSourceAgents({
          githubUserId: owned.githubUserId,
          platform: owned.platform,
          appSourceId: source.id,
        }),
      ),
    );
    return NextResponse.json({
      sources: results.map((result) => result.source),
      agents: results.flatMap((result) =>
        result.agents.map((agent) => ({
          ...agent,
          source: result.source,
          platform: result.platform,
        })),
      ),
    });
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
    const results: OperateTransactionsResult[] = await Promise.all(
      owned.sources.map((source) =>
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
    const results: OperateUsageResult[] = await Promise.all(
      owned.sources.map((source) =>
        owned.client.getUserSourceUsage({
          githubUserId: owned.githubUserId,
          platform: owned.platform,
          appSourceId: source.id,
          fromDate: params.get("fromDate") ?? undefined,
          toDate: params.get("toDate") ?? undefined,
        }),
      ),
    );
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
    const results: OperateLogsResult[] = await Promise.all(
      owned.sources.map((source) =>
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
      ),
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
    const results: OperateObservabilityResult[] = await Promise.all(
      owned.sources.map((source) =>
        owned.client.getUserSourceObservability({
          githubUserId: owned.githubUserId,
          platform: owned.platform,
          appSourceId: source.id,
        }),
      ),
    );
    return NextResponse.json({
      sources: results.map((result) => result.source),
      scope: "owned_applications",
      apps: results.flatMap((result) =>
        result.apps.map((app) => ({
          ...app,
          source: result.source,
          platform: result.platform,
        })),
      ),
      dashboardLinks: results.flatMap((result) => result.dashboardLinks),
      platformMetrics: [],
    });
  } catch (err) {
    return launchErrorResponse(err);
  }
}
