"use client";

import type { AppSource } from "@aomi-labs/deploy";
import {
  Activity,
  Bot,
  Gauge,
  ListFilter,
  ScrollText,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  useGitHubSession,
  type GitHubAccountState,
} from "@build/components/control-plane/github-session-context";
import {
  GitHubSignInPanel,
  LoadingPanel,
} from "@build/features/launch/components/deployments/ui/state-panels";
import { operateFetch, type OperateKind } from "./client";
import {
  bytesLabel,
  countLabel,
  numberLabel,
  percentLabel,
  truncateAddress,
  unitLabel,
} from "./format";
import { TransactionRows } from "./tx-rows";
import { EMPTY_LOGS_PAGE_FILTER, LogRows, type LogsPageFilter } from "./log-rows";
import { UsageRows } from "./usage-rows";

export { truncateAddress };

type Sourceish = AppSource & { apps?: unknown[] };

type OperatePayload = {
  sources?: Sourceish[];
  agents?: Array<Record<string, any>>;
  transactions?: Array<Record<string, any>>;
  daily?: Array<Record<string, any>>;
  breakdown?: Array<Record<string, any>>;
  statement?: Record<string, any> | null;
  logs?: Array<Record<string, any>>;
  apps?: Array<Record<string, any>>;
  dashboardLinks?: Array<Record<string, any>>;
  monitoring?: Record<string, any> | null;
  platformMetrics?: Array<Record<string, any>>;
  nextCursor?: unknown | null;
};

const meta = {
  agents: { title: "Agents", icon: Bot },
  transactions: { title: "Transactions", icon: WalletCards },
  usage: { title: "Usage", icon: Gauge },
  logs: { title: "Logs", icon: ScrollText },
  observability: { title: "Observability", icon: Activity },
} satisfies Record<OperateKind, { title: string; icon: typeof Bot }>;

function sourceLabel(source: Sourceish) {
  return source.repositoryLink || source.githubAccount || `Source ${source.id}`;
}

/** Keep shareable filters in the URL without triggering a navigation. */
function syncQuery(patch: Record<string, string | null>) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === "") url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  window.history.replaceState(null, "", url);
}

function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="border-border bg-surface-subtle text-dim rounded-md border px-4 py-10 text-center text-sm">
      <p className="text-foreground font-medium">No {title.toLowerCase()} yet</p>
      {description ? (
        <p className="mt-2 text-xs leading-5">{description}</p>
      ) : null}
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="bg-primary text-primary-foreground mt-4 inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium hover:opacity-90"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  healthy: "bg-emerald-500",
  not_loaded: "bg-amber-500",
  inactive: "bg-zinc-400",
};

function Sparkline({ points }: { points: number[] }) {
  const max = Math.max(...points, 1);
  const step = points.length > 1 ? 100 / (points.length - 1) : 100;
  const path = points
    .map(
      (p, i) =>
        `${(i * step).toFixed(1)},${(23 - (p / max) * 20).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      className="text-dim h-6 w-full"
      aria-hidden
    >
      <polyline
        points={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** 24h count tile with an hourly sparkline; renders nothing without data. */
function TrendTile({
  label,
  count,
  series,
}: {
  label: string;
  count: unknown;
  series?: number[] | null;
}) {
  return (
    <div className="min-w-0">
      <div className="text-dim">{label}</div>
      <div className="text-foreground text-base font-semibold">
        {countLabel(count)}
      </div>
      {series?.length ? <Sparkline points={series} /> : null}
    </div>
  );
}

type ViewState = {
  txAppFilter: string | null;
  setTxAppFilter: (app: string | null) => void;
  txOpen: string | null;
  setTxOpen: (id: string | null) => void;
  logsFilter: LogsPageFilter;
  setLogsFilter: (filter: LogsPageFilter) => void;
  logOpen: string | null;
  setLogOpen: (id: string | null) => void;
};

function Rows({
  kind,
  payload,
  view,
}: {
  kind: OperateKind;
  payload: OperatePayload;
  view: ViewState;
}) {
  if (kind === "agents") {
    const rows = payload.agents ?? [];
    if (!rows.length) return <EmptyState title="Agents" />;
    return (
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((agent) => (
          <div
            key={`${agent.source?.id}-${agent.id}`}
            className="border-border bg-surface rounded-md border px-3 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{agent.name}</div>
                <div className="text-dim truncate text-xs">
                  {agent.source?.repositoryLink}
                </div>
              </div>
              <span className="text-dim text-xs">
                {agent.loaded ? "Loaded" : "Idle"}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "transactions") {
    const rows = payload.transactions ?? [];
    if (!rows.length)
      return (
        <EmptyState
          title="Transactions"
          description="On-chain actions from your apps show up here after chat activity."
          actionHref="/projects"
          actionLabel="Open Projects"
        />
      );
    const apps = [...new Set(rows.map((tx) => String(tx.application)))];
    return (
      <TransactionRows
        rows={rows}
        apps={apps}
        appFilter={view.txAppFilter}
        onAppFilterChange={(app) => {
          view.setTxAppFilter(app);
          syncQuery({ app });
        }}
        openId={view.txOpen}
        onToggle={(id) => {
          view.setTxOpen(id);
          syncQuery({ tx: id });
        }}
      />
    );
  }

  if (kind === "usage") {
    const daily = payload.daily ?? [];
    const breakdown = payload.breakdown ?? [];
    if (!daily.length && !breakdown.length && !payload.statement)
      return (
        <EmptyState
          title="Usage"
          description="Credits and tokens appear after your apps run chat turns. This is a meter, not Billing."
          actionHref="/projects"
          actionLabel="Open Projects"
        />
      );
    return <UsageRows payload={payload} />;
  }

  if (kind === "logs") {
    const rows = payload.logs ?? [];
    if (!rows.length) return <EmptyState title="Logs" />;
    const apps = [...new Set(rows.map((row) => String(row.application)))];
    const tools = [
      ...new Set(
        rows
          .filter((row) => row.tool != null)
          .map((row) => String(row.tool)),
      ),
    ];
    return (
      <LogRows
        rows={rows}
        apps={apps}
        tools={tools}
        filter={view.logsFilter}
        onFilterChange={(filter) => {
          view.setLogsFilter(filter);
          syncQuery({
            app: filter.app,
            tool: filter.tool,
            errors: filter.errorsOnly ? "1" : null,
          });
        }}
        openId={view.logOpen}
        onToggle={view.setLogOpen}
      />
    );
  }

  const apps = payload.apps ?? [];
  if (!apps.length) return <EmptyState title="Observability" />;
  const monitoring = payload.monitoring;
  const platformMetrics = payload.platformMetrics ?? [];
  const dashboardLinks = payload.dashboardLinks ?? [];
  return (
    <div className="space-y-4">
      <div className="border-border bg-surface-subtle flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
        <div>
          <span className="text-dim">Monitoring</span>{" "}
          <span className="text-foreground">
            {monitoring?.status ?? "unconfigured"}
          </span>
          {monitoring?.windowSeconds ? (
            <span className="text-dim">
              {" "}
              · {Math.round(Number(monitoring.windowSeconds) / 60)}m window
            </span>
          ) : null}
        </div>
        {dashboardLinks.length ? (
          <div className="flex flex-wrap gap-2">
            {dashboardLinks.map((link, index) => (
              <a
                key={`${link.url}-${index}`}
                href={String(link.url)}
                target="_blank"
                rel="noreferrer"
                className="border-border bg-surface hover:bg-accent-hover rounded-md border px-2 py-1 text-xs"
              >
                {link.label || "Open dashboard"}
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {apps.map((app) => {
          const metrics = app.metrics ?? {};
          const hasTrend =
            metrics.chats24h != null ||
            metrics.toolCalls24h != null ||
            metrics.transactions24h != null;
          const hasErrorSplit =
            metrics.toolErrorRate != null || metrics.txErrorRate != null;
          const lifecycle = [
            app.sdkVersion ? `SDK ${app.sdkVersion}` : null,
            metrics.coldStartMs != null
              ? `cold start ${unitLabel(metrics.coldStartMs, "ms", 0)}`
              : null,
            bytesLabel(metrics.dylibBytes),
          ].filter(Boolean);
          return (
            <div
              key={`${app.source?.id}-${app.applicationId}`}
              className="border-border bg-surface rounded-md border px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {app.application}
                  </div>
                  <div className="text-dim truncate text-xs">
                    {app.releaseTag ?? "No release"}
                  </div>
                </div>
                <span className="text-dim flex items-center gap-1.5 text-xs">
                  <span
                    className={`size-2 rounded-full ${STATUS_DOT[String(app.status)] ?? "bg-zinc-400"}`}
                  />
                  {app.status}
                </span>
              </div>
              {hasTrend ? (
                <div className="mt-3 grid grid-cols-3 gap-x-3 text-xs">
                  <TrendTile
                    label="Chats 24h"
                    count={metrics.chats24h}
                    series={metrics.chatsHourly}
                  />
                  <TrendTile
                    label="Tool calls 24h"
                    count={metrics.toolCalls24h}
                    series={metrics.toolCallsHourly}
                  />
                  <TrendTile
                    label="Tx 24h"
                    count={metrics.transactions24h}
                    series={metrics.transactionsHourly}
                  />
                </div>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                {hasTrend ? null : (
                  <div>
                    <div className="text-dim">Requests/min</div>
                    <div className="text-foreground font-medium">
                      {numberLabel(metrics.requestsPerMinute)}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-dim">
                    {hasErrorSplit ? "Chat errors" : "Error rate"}
                  </div>
                  <div className="text-foreground font-medium">
                    {percentLabel(metrics.errorRate)}
                  </div>
                </div>
                {hasErrorSplit ? (
                  <>
                    <div>
                      <div className="text-dim">Tool errors</div>
                      <div className="text-foreground font-medium">
                        {percentLabel(metrics.toolErrorRate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-dim">Tx failures</div>
                      <div className="text-foreground font-medium">
                        {percentLabel(metrics.txErrorRate)}
                      </div>
                    </div>
                  </>
                ) : null}
                <div>
                  <div className="text-dim">P95 latency</div>
                  <div className="text-foreground font-medium">
                    {unitLabel(metrics.p95LatencyMs, "ms", 0)}
                  </div>
                </div>
                <div>
                  <div className="text-dim">Inflight</div>
                  <div className="text-foreground font-medium">
                    {numberLabel(metrics.inflightRequests, 0)}
                  </div>
                </div>
              </div>
              {lifecycle.length ? (
                <div className="border-border text-dim mt-3 border-t pt-2 text-xs">
                  {lifecycle.join(" · ")}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {platformMetrics.length ? (
        <div className="border-border overflow-hidden rounded-md border">
          <table className="divide-border min-w-full divide-y text-sm">
            <thead className="bg-surface-subtle text-dim text-left text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Platform metric</th>
                <th className="px-3 py-2">Value</th>
                <th className="px-3 py-2">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-border bg-surface divide-y">
              {platformMetrics.map((metric, index) => (
                <tr key={`${metric.label}-${index}`}>
                  <td className="px-3 py-2">
                    <div>{metric.label}</div>
                    {metric.description ? (
                      <div className="text-dim text-xs">
                        {metric.description}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {unitLabel(metric.value, String(metric.unit ?? ""))}
                  </td>
                  <td className="text-dim px-3 py-2">{metric.scope}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

// Module-level cache so switching away from an Operate tab and back shows the
// last-known data instantly while it revalidates in the background, instead of
// resetting to the "Loading" state on every remount. Lives for the SPA session.
const operateCache = new Map<string, OperatePayload>();

function operateAccountCacheKey(account: GitHubAccountState): string | null {
  if (!account.signedIn || !account.githubLogin) return null;
  return account.githubLogin.toLowerCase();
}

function operateCacheKey(
  accountKey: string,
  kind: OperateKind,
  sourceId: number | null,
): string {
  return `${accountKey}:${kind}:${sourceId ?? "all"}`;
}

function projectIdFromSearch(raw: string | null): number | null {
  if (!raw) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function OperateView({ kind }: { kind: OperateKind }) {
  const { account } = useGitHubSession();
  const searchParams = useSearchParams();
  const projectFromUrl = projectIdFromSearch(searchParams.get("project"));
  const appFromUrl = searchParams.get("app");
  const toolFromUrl = searchParams.get("tool");
  const errorsFromUrl = searchParams.get("errors") === "1";
  const txFromUrl = searchParams.get("tx");
  const accountCacheKey = operateAccountCacheKey(account);
  const [sourceId, setSourceId] = useState<number | null>(projectFromUrl);
  const [txAppFilter, setTxAppFilter] = useState<string | null>(appFromUrl);
  const [txOpen, setTxOpen] = useState<string | null>(txFromUrl);
  const [logsFilter, setLogsFilter] = useState<LogsPageFilter>({
    ...EMPTY_LOGS_PAGE_FILTER,
    app: appFromUrl,
    tool: toolFromUrl,
    errorsOnly: errorsFromUrl,
  });
  const [logOpen, setLogOpen] = useState<string | null>(null);
  const initialCacheKey = accountCacheKey
    ? operateCacheKey(accountCacheKey, kind, sourceId)
    : null;
  const [payload, setPayload] = useState<OperatePayload | null>(
    () => (initialCacheKey ? operateCache.get(initialCacheKey) : null) ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(
    () => (initialCacheKey ? !operateCache.has(initialCacheKey) : true),
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const Icon = meta[kind].icon;
  const sources = useMemo(() => payload?.sources ?? [], [payload?.sources]);
  const canPage = kind === "transactions" || kind === "logs";
  const nextCursor = canPage ? payload?.nextCursor : null;

  useEffect(() => {
    if (projectFromUrl != null) setSourceId(projectFromUrl);
  }, [projectFromUrl]);

  // Deep links (?app=&tool=&errors=&tx=) win over local filter state so a
  // pasted investigation URL always lands on what it pointed at.
  useEffect(() => {
    if (appFromUrl != null) {
      setTxAppFilter(appFromUrl);
      setLogsFilter((current) => ({ ...current, app: appFromUrl }));
    }
  }, [appFromUrl]);
  useEffect(() => {
    if (toolFromUrl != null) {
      setLogsFilter((current) => ({ ...current, tool: toolFromUrl }));
    }
  }, [toolFromUrl]);
  useEffect(() => {
    if (txFromUrl != null) setTxOpen(txFromUrl);
  }, [txFromUrl]);

  useEffect(() => {
    if (account.loading) {
      setLoading(true);
      setError(null);
      setPayload(null);
      return;
    }
    if (!account.signedIn) {
      setLoading(false);
      setError(null);
      setPayload(null);
      return;
    }
    let alive = true;
    const key = accountCacheKey
      ? operateCacheKey(accountCacheKey, kind, sourceId)
      : null;
    const cached = key ? operateCache.get(key) : null;
    setError(null);
    if (cached) {
      // Show last-known data immediately and revalidate silently.
      setPayload(cached);
      setLoading(false);
    } else {
      setPayload(null);
      setLoading(true);
    }
    operateFetch<OperatePayload>(kind, sourceId)
      .then((next) => {
        if (key) operateCache.set(key, next);
        if (alive) setPayload(next);
      })
      .catch((err) => {
        // Keep showing stale data if we have it; only surface the error when
        // there is nothing cached to fall back on.
        if (alive && (!key || !operateCache.has(key))) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [account.loading, account.signedIn, accountCacheKey, kind, sourceId]);

  if (account.loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <LoadingPanel label="Checking GitHub session..." />
      </div>
    );
  }

  if (!account.signedIn) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <GitHubSignInPanel error={null} />
      </div>
    );
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const next = await operateFetch<OperatePayload>(
        kind,
        sourceId,
        nextCursor,
      );
      const key = accountCacheKey
        ? operateCacheKey(accountCacheKey, kind, sourceId)
        : null;
      setPayload((current) => {
        if (!current) {
          if (key) operateCache.set(key, next);
          return next;
        }
        let merged: OperatePayload;
        if (kind === "transactions") {
          merged = {
            ...next,
            sources: current.sources ?? next.sources,
            transactions: [
              ...(current.transactions ?? []),
              ...(next.transactions ?? []),
            ],
          };
        } else if (kind === "logs") {
          merged = {
            ...next,
            sources: current.sources ?? next.sources,
            logs: [...(current.logs ?? []), ...(next.logs ?? [])],
          };
        } else {
          merged = next;
        }
        if (key) operateCache.set(key, merged);
        return merged;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingMore(false);
    }
  }

  const view: ViewState = {
    txAppFilter,
    setTxAppFilter,
    txOpen,
    setTxOpen,
    logsFilter,
    setLogsFilter,
    logOpen,
    setLogOpen,
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="text-dim size-5" />
          <h1 className="text-xl font-semibold">{meta[kind].title}</h1>
        </div>
        <label className="text-dim flex items-center gap-2 text-sm">
          <ListFilter className="size-4" />
          <select
            value={sourceId ?? ""}
            onChange={(event) =>
              setSourceId(
                event.target.value ? Number(event.target.value) : null,
              )
            }
            className="border-border bg-surface text-foreground h-9 rounded-md border px-2"
          >
            <option value="">All sources</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {sourceLabel(source)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <div className="border-border bg-surface-subtle text-dim rounded-md border px-4 py-10 text-center text-sm">
          Loading
        </div>
      ) : error ? (
        <div className="border-danger/30 bg-danger/5 text-danger rounded-md border px-4 py-3 text-sm">
          {error}
        </div>
      ) : payload ? (
        <>
          <Rows kind={kind} payload={payload} view={view} />
          {nextCursor ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="border-border bg-surface hover:bg-accent-hover disabled:text-dim h-9 rounded-md border px-3 text-sm"
              >
                {loadingMore ? "Loading" : "Load more"}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
