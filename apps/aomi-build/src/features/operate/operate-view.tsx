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

type Sourceish = AppSource & { apps?: unknown[] };

type OperatePayload = {
  sources?: Sourceish[];
  agents?: Array<Record<string, any>>;
  transactions?: Array<Record<string, any>>;
  daily?: Array<Record<string, any>>;
  breakdown?: Array<Record<string, any>>;
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

function secondsLabel(value: unknown) {
  const n = Number(value ?? 0);
  return n > 0 ? new Date(n * 1000).toLocaleString() : "";
}

/** Truncate 0x addresses for dense table cells; leave short/empty values alone. */
export function truncateAddress(value: unknown, chars = 4): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.length <= chars * 2 + 2) return raw;
  return `${raw.slice(0, chars + 2)}…${raw.slice(-chars)}`;
}

function valueLabel(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "0") return "—";
  return raw;
}

function numberLabel(value: unknown, digits = 1) {
  if (value === null || value === undefined || value === "") return "No data";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "No data";
}

function percentLabel(value: unknown) {
  if (value === null || value === undefined || value === "") return "No data";
  const n = Number(value);
  return Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : "No data";
}

function unitLabel(value: unknown, unit: string, digits = 1) {
  const label = numberLabel(value, digits);
  return label === "No data" ? label : `${label} ${unit}`;
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-border bg-surface-subtle text-dim rounded-md border px-4 py-10 text-center text-sm">
      <p>No {title.toLowerCase()} found.</p>
      {description ? (
        <p className="mt-2 text-xs leading-5">{description}</p>
      ) : null}
    </div>
  );
}

function Rows({
  kind,
  payload,
}: {
  kind: OperateKind;
  payload: OperatePayload;
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
          description="On-chain actions from your apps show up here. Deploy an app, configure its Environment, and use it in chat to generate activity."
        />
      );
    return (
      <div className="border-border overflow-x-auto rounded-md border">
        <table className="divide-border min-w-full divide-y text-sm">
          <thead className="bg-surface-subtle text-dim text-left text-xs uppercase">
            <tr>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">App</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Chain</th>
              <th className="px-3 py-2">From</th>
              <th className="px-3 py-2">To</th>
              <th className="px-3 py-2">Value</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Hash</th>
            </tr>
          </thead>
          <tbody className="divide-border bg-surface divide-y">
            {rows.map((tx) => (
              <tr key={tx.id}>
                <td className="text-dim whitespace-nowrap px-3 py-2">
                  {secondsLabel(tx.createdAt)}
                </td>
                <td className="px-3 py-2">{tx.application}</td>
                <td className="px-3 py-2">{tx.status}</td>
                <td className="px-3 py-2">{tx.chainId}</td>
                <td
                  className="max-w-36 truncate px-3 py-2 font-mono text-xs"
                  title={String(tx.fromAddress ?? "")}
                >
                  {truncateAddress(tx.fromAddress)}
                </td>
                <td
                  className="max-w-36 truncate px-3 py-2 font-mono text-xs"
                  title={String(tx.toAddress ?? "")}
                >
                  {truncateAddress(tx.toAddress)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                  {valueLabel(tx.value)}
                </td>
                <td
                  className="max-w-56 truncate px-3 py-2 text-xs"
                  title={String(tx.description ?? "")}
                >
                  {tx.description ? String(tx.description) : "—"}
                </td>
                <td
                  className="max-w-36 truncate px-3 py-2 font-mono text-xs"
                  title={String(tx.txHash ?? "")}
                >
                  {truncateAddress(tx.txHash)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (kind === "usage") {
    const daily = payload.daily ?? [];
    const breakdown = payload.breakdown ?? [];
    if (!daily.length && !breakdown.length)
      return (
        <EmptyState
          title="Usage"
          description="Credit and token totals appear after your apps run chat turns. This is a usage meter — not invoices or partner fee settlements. Plans and balance will live under Account → Billing when wired."
        />
      );
    return (
      <div className="space-y-3">
        <p className="text-dim text-xs leading-5">
          Platform LLM/token credits by app and day. Partner tool fees (when
          priced) settle in chat — they are not listed here.{" "}
          <Link href="/settings/billing" className="text-foreground hover:underline">
            Account → Billing
          </Link>{" "}
          will hold plans and invoices once connected.
        </p>
        <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="border-border overflow-x-auto rounded-md border">
          <table className="divide-border min-w-full divide-y text-sm">
            <thead className="bg-surface-subtle text-dim text-left text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Day</th>
                <th className="px-3 py-2">App</th>
                <th className="px-3 py-2">Input</th>
                <th className="px-3 py-2">Output</th>
                <th className="px-3 py-2">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-border bg-surface divide-y">
              {daily.map((row, index) => (
                <tr
                  key={`${row.source?.id}-${row.periodUtcDay}-${row.application}-${index}`}
                >
                  <td className="px-3 py-2">{row.periodUtcDay}</td>
                  <td className="px-3 py-2">{row.application}</td>
                  <td className="px-3 py-2">{row.inputTokens}</td>
                  <td className="px-3 py-2">{row.outputTokens}</td>
                  <td className="px-3 py-2">
                    {Number(row.creditsUsed ?? 0).toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-border bg-surface rounded-md border p-3">
          <div className="text-dim mb-2 text-xs uppercase">Breakdown</div>
          <div className="space-y-2">
            {breakdown.map((row, index) => (
              <div
                key={`${row.source?.id}-${row.provider}-${row.model}-${index}`}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate">
                  {row.provider}/{row.model}
                </span>
                <span className="text-dim">
                  {Number(row.creditsUsed ?? 0).toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    );
  }

  if (kind === "logs") {
    const rows = payload.logs ?? [];
    if (!rows.length) return <EmptyState title="Logs" />;
    return (
      <div className="space-y-2">
        {rows.map((entry) => (
          <div
            key={`${entry.eventType}-${entry.id}`}
            className="border-border bg-surface rounded-md border px-3 py-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>{entry.summary}</span>
              <span className="text-dim text-xs">
                {secondsLabel(entry.occurredAt)}
              </span>
            </div>
            <div className="text-dim mt-1 text-xs">
              {entry.eventType} · {entry.application}
            </div>
          </div>
        ))}
      </div>
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
                <span className="text-dim text-xs">{app.status}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div>
                  <div className="text-dim">Requests/min</div>
                  <div className="text-foreground font-medium">
                    {numberLabel(metrics.requestsPerMinute)}
                  </div>
                </div>
                <div>
                  <div className="text-dim">Error rate</div>
                  <div className="text-foreground font-medium">
                    {percentLabel(metrics.errorRate)}
                  </div>
                </div>
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

export function OperateView({ kind }: { kind: OperateKind }) {
  const { account } = useGitHubSession();
  const accountCacheKey = operateAccountCacheKey(account);
  const initialCacheKey = accountCacheKey
    ? operateCacheKey(accountCacheKey, kind, null)
    : null;
  const [sourceId, setSourceId] = useState<number | null>(null);
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
          <Rows kind={kind} payload={payload} />
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
