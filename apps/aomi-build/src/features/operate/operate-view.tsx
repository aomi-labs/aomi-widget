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
import { useEffect, useMemo, useState } from "react";
import { useGitHubSession } from "@build/components/control-plane/github-session-context";
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

function EmptyState({ title }: { title: string }) {
  return (
    <div className="border-border bg-surface-subtle text-dim rounded-md border px-4 py-10 text-center text-sm">
      No {title.toLowerCase()} found.
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
    if (!rows.length) return <EmptyState title="Transactions" />;
    return (
      <div className="border-border overflow-x-auto rounded-md border">
        <table className="divide-border min-w-full divide-y text-sm">
          <thead className="bg-surface-subtle text-dim text-left text-xs uppercase">
            <tr>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">App</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Chain</th>
              <th className="px-3 py-2">To</th>
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
                <td className="max-w-48 truncate px-3 py-2 font-mono text-xs">
                  {tx.toAddress}
                </td>
                <td className="max-w-48 truncate px-3 py-2 font-mono text-xs">
                  {tx.txHash ?? ""}
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
    if (!daily.length && !breakdown.length) return <EmptyState title="Usage" />;
    return (
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
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {apps.map((app) => (
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
        </div>
      ))}
    </div>
  );
}

export function OperateView({ kind }: { kind: OperateKind }) {
  const { account } = useGitHubSession();
  const [payload, setPayload] = useState<OperatePayload | null>(null);
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    setError(null);
    setPayload(null);
    operateFetch<OperatePayload>(kind, sourceId)
      .then((next) => {
        if (alive) setPayload(next);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [account.loading, account.signedIn, kind, sourceId]);

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
      setPayload((current) => {
        if (!current) return next;
        if (kind === "transactions") {
          return {
            ...next,
            sources: current.sources ?? next.sources,
            transactions: [
              ...(current.transactions ?? []),
              ...(next.transactions ?? []),
            ],
          };
        }
        if (kind === "logs") {
          return {
            ...next,
            sources: current.sources ?? next.sources,
            logs: [...(current.logs ?? []), ...(next.logs ?? [])],
          };
        }
        return next;
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
