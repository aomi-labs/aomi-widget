"use client";

// TEMPORARY visual harness for the Operate pages — renders the real
// OperateView against fixture data by stubbing window.fetch. Delete after use.

import { useState } from "react";
import { GitHubSessionProvider } from "@build/components/control-plane/github-session-context";
import { OperateView } from "@build/features/operate/operate-view";
import type { OperateKind } from "@build/features/operate/client";
import { AppDetailMock } from "./detail-mock";
import { TxTableMock } from "./tx-detail-mock";
import { UsageMock } from "./usage-mock";
import { EMPTY_LOGS_FILTER, LogsMock, type LogsFilter } from "./logs-mock";

const NOW = Math.floor(Date.now() / 1000);
const SOURCE = { id: 141779906, repositoryLink: "aomi-labs/apps", apps: [] };

const OBSERVABILITY = {
  sources: [SOURCE],
  scope: "owned_applications",
  monitoring: { provider: "grafana_prometheus", status: "ok", windowSeconds: 900 },
  dashboardLinks: [
    { label: "Open dashboard", url: "https://grafana.example.com/d/app", scope: "owned_applications" },
  ],
  platformMetrics: [],
  apps: [
    {
      applicationId: 77,
      application: "goal-digger",
      active: true,
      loaded: true,
      releaseTag: "apps-141779906-r1dac12ad71-goal-digger",
      sdkVersion: "3.0.2",
      status: "healthy",
      source: SOURCE,
      metrics: {
        provider: "grafana_prometheus",
        windowSeconds: 900,
        available: true,
        requestsPerMinute: 0.4,
        errorRate: 0.025,
        p95LatencyMs: 8400,
        inflightRequests: 2,
        trendWindowSeconds: 86400,
        chats24h: 47,
        toolCalls24h: 130,
        transactions24h: 12,
        chatsHourly: [0, 1, 0, 2, 3, 1, 0, 0, 2, 4, 5, 3, 2, 1, 0, 1, 3, 4, 6, 3, 2, 1, 2, 1],
        toolCallsHourly: [0, 2, 1, 5, 8, 3, 1, 0, 6, 11, 14, 9, 5, 3, 1, 2, 8, 12, 17, 9, 6, 3, 3, 1],
        transactionsHourly: [0, 0, 0, 0, 1, 0, 0, 0, 1, 2, 1, 1, 0, 0, 0, 0, 1, 1, 2, 1, 0, 0, 1, 0],
        toolErrorRate: 0.12,
        txErrorRate: 0,
        coldStartMs: 1250,
        dylibBytes: 4718592,
      },
    },
    {
      applicationId: 78,
      application: "geckoterminal",
      active: true,
      loaded: true,
      releaseTag: "apps-141779906-r229e1090c5-geckoterminal",
      sdkVersion: "3.0.2",
      status: "healthy",
      source: SOURCE,
      metrics: {
        provider: "grafana_prometheus",
        windowSeconds: 900,
        available: true,
        requestsPerMinute: 0.1,
        errorRate: 0,
        p95LatencyMs: 3200,
        inflightRequests: 0,
        trendWindowSeconds: 86400,
        chats24h: 18,
        toolCalls24h: 52,
        transactions24h: 0,
        chatsHourly: [0, 0, 1, 0, 2, 1, 0, 0, 1, 2, 2, 1, 1, 0, 0, 0, 1, 2, 2, 1, 1, 0, 0, 0],
        toolCallsHourly: [0, 0, 3, 0, 5, 2, 0, 0, 4, 6, 7, 3, 2, 0, 0, 0, 3, 5, 6, 3, 2, 1, 0, 0],
        transactionsHourly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        toolErrorRate: 0.019,
        txErrorRate: null,
        coldStartMs: 890,
        dylibBytes: 2097152,
      },
    },
    {
      applicationId: 79,
      application: "playground-example",
      active: true,
      loaded: false,
      releaseTag: null,
      sdkVersion: null,
      status: "not_loaded",
      source: SOURCE,
      metrics: {
        provider: "grafana_prometheus",
        windowSeconds: 300,
        available: true,
        requestsPerMinute: 42,
        errorRate: 0.025,
        p95LatencyMs: 1234,
        inflightRequests: 3,
        trendWindowSeconds: null,
        chats24h: null,
        toolCalls24h: null,
        transactions24h: null,
        chatsHourly: null,
        toolCallsHourly: null,
        transactionsHourly: null,
        toolErrorRate: null,
        txErrorRate: null,
        coldStartMs: null,
        dylibBytes: null,
      },
    },
  ],
};

const TRANSACTIONS = {
  sources: [SOURCE],
  transactions: [
    {
      id: "tx-1",
      application: "goal-digger",
      status: "submitted",
      chainId: 8453,
      fromAddress: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      toAddress: "0x2626664c2603336E57B271c5C0b26F421741e481",
      value: "250000000000000000",
      description: "Swap 0.25 ETH → USDC on Uniswap v3",
      txHash: "0x6a3f9e2b8c1d4e5f6a3f9e2b8c1d4e5f6a3f9e2b8c1d4e5f6a3f9e2b8c1d4e5f",
      createdAt: NOW - 540,
      source: SOURCE,
    },
    {
      id: "tx-2",
      application: "goal-digger",
      status: "submitted",
      chainId: 1,
      fromAddress: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      toAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      value: "0",
      description: "Approve USDC for Aave v3 pool",
      txHash: "0x91c4d5e6f7a8b91c4d5e6f7a8b91c4d5e6f7a8b91c4d5e6f7a8b91c4d5e6f7a8",
      createdAt: NOW - 3800,
      source: SOURCE,
    },
    {
      id: "tx-3",
      application: "geckoterminal",
      status: "failed",
      chainId: 8453,
      fromAddress: "0x1b8aB79C2c1a530dE1cA4F7BdD4e8fBbF4e2Ea41",
      toAddress: "0x827922686190790b37229fd06084350E74485b72",
      value: "50000000000000000",
      description: "Bridge 0.05 ETH to Arbitrum",
      txHash: null,
      createdAt: NOW - 9200,
      source: SOURCE,
    },
    {
      id: "tx-4",
      application: "goal-digger",
      status: "created",
      chainId: 1,
      fromAddress: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      toAddress: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      value: "1200000000000000000",
      description: "Add 1.2 ETH liquidity to ETH/USDC",
      txHash: null,
      createdAt: NOW - 86000,
      source: SOURCE,
    },
  ],
  nextCursor: { perSource: { "141779906": { createdAt: NOW - 86000, id: "tx-4" } } },
};

const USAGE = {
  sources: [SOURCE],
  range: { fromDate: "2026-07-08", toDate: "2026-07-15", maxDays: 31 },
  daily: [
    { periodUtcDay: "2026-07-15", application: "goal-digger", inputTokens: 412_000, outputTokens: 58_400, creditsUsed: 3.4182, source: SOURCE },
    { periodUtcDay: "2026-07-15", application: "geckoterminal", inputTokens: 96_500, outputTokens: 12_100, creditsUsed: 0.7841, source: SOURCE },
    { periodUtcDay: "2026-07-14", application: "goal-digger", inputTokens: 380_200, outputTokens: 51_900, creditsUsed: 3.1027, source: SOURCE },
    { periodUtcDay: "2026-07-14", application: "geckoterminal", inputTokens: 121_800, outputTokens: 15_600, creditsUsed: 0.9915, source: SOURCE },
    { periodUtcDay: "2026-07-13", application: "goal-digger", inputTokens: 295_400, outputTokens: 44_300, creditsUsed: 2.4472, source: SOURCE },
  ],
  breakdown: [
    { provider: "anthropic", model: "claude-opus-4-8", paymentMethod: "quota", inputTokens: 1_100_000, outputTokens: 152_000, creditsUsed: 9.1204, events: 152, source: SOURCE },
    { provider: "anthropic", model: "claude-haiku-4-5", paymentMethod: "quota", inputTokens: 206_000, outputTokens: 30_300, creditsUsed: 1.6233, events: 88, source: SOURCE },
  ],
};

const LOGS = {
  sources: [SOURCE],
  logs: [
    {
      id: "log-1",
      eventType: "deployment",
      application: "goal-digger",
      summary: "Activated release apps-141779906-r1dac12ad71-goal-digger",
      occurredAt: NOW - 700,
      details: {},
      source: SOURCE,
    },
    {
      id: "log-2",
      eventType: "tool_error",
      application: "goal-digger",
      summary: "swap_quote failed: slippage exceeded (12 retries in 1h)",
      occurredAt: NOW - 4100,
      details: {},
      source: SOURCE,
    },
    {
      id: "log-3",
      eventType: "app_loaded",
      application: "geckoterminal",
      summary: "Cold start in 890 ms (dylib 2.0 MB, SDK 3.0.2)",
      occurredAt: NOW - 8600,
      details: {},
      source: SOURCE,
    },
    {
      id: "log-4",
      eventType: "sdk_upgrade",
      application: "playground-example",
      summary: "Stranded on SDK 3.0.1 — rebuild queued by auto-heal",
      occurredAt: NOW - 90000,
      details: {},
      source: SOURCE,
    },
  ],
  nextCursor: null,
};

const SESSION = {
  signedIn: true,
  githubLogin: "cecilia",
  githubAvatarUrl: null,
  installationId: 1,
};

function stubFetch() {
  if (typeof window === "undefined") return;
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("/api/bff/auth/github/status")) return Response.json(SESSION);
    if (url.includes("/api/bff/operate/observability")) return Response.json(OBSERVABILITY);
    if (url.includes("/api/bff/operate/transactions")) return Response.json(TRANSACTIONS);
    if (url.includes("/api/bff/operate/usage")) return Response.json(USAGE);
    if (url.includes("/api/bff/operate/logs")) return Response.json(LOGS);
    return real(input, init);
  };
}

// Logs stays a top-level destination hosting the trace stream; the
// observability drill-down deep-links here with app+tool filters applied
// (card → drill-down → trace) so the drill-down page itself stays lean.
const KINDS: OperateKind[] = ["observability", "transactions", "usage", "logs"];

export default function DevOperatePreview() {
  const [ready] = useState(() => {
    stubFetch();
    return true;
  });
  const [kind, setKind] = useState<OperateKind>("observability");
  const [detail, setDetail] = useState(false);
  const [logsFilter, setLogsFilter] = useState<LogsFilter>(EMPTY_LOGS_FILTER);
  const [txAppFilter, setTxAppFilter] = useState<string | null>(null);
  const [txOpen, setTxOpen] = useState<string | null>("tx-1");
  if (!ready) return null;
  if (detail) {
    return (
      <AppDetailMock
        onBack={() => setDetail(false)}
        onOpenTrace={(tool) => {
          setLogsFilter({ app: "goal-digger", tool, errorsOnly: false });
          setDetail(false);
          setKind("logs");
        }}
        onOpenTx={(txId) => {
          setTxAppFilter("goal-digger");
          setTxOpen(txId);
          setDetail(false);
          setKind("transactions");
        }}
      />
    );
  }
  return (
    <GitHubSessionProvider>
      <div className="border-border mx-auto flex w-full max-w-7xl gap-2 border-b px-4 pt-4 sm:px-6 lg:px-8">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-t-md px-3 py-1.5 text-sm capitalize ${
              k === kind ? "bg-surface text-foreground border-border border border-b-0" : "text-dim"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      {kind === "transactions" ? (
        // Design mock: etherscan-style row expansion (post receipt-writeback).
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold">Transactions</h1>
          <TxTableMock
            key={`${txAppFilter ?? "all"}-${txOpen ?? "none"}`}
            appFilter={txAppFilter}
            onAppFilterChange={setTxAppFilter}
            initialOpen={txOpen}
          />
        </div>
      ) : kind === "usage" ? (
        // Design mock: builder-facing revenue-share statement, not a token meter.
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold">Usage</h1>
          <UsageMock />
        </div>
      ) : kind === "logs" ? (
        // Design mock: unified trace + event stream with filters; the
        // drill-down's tool rows land here with app+tool pre-applied.
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold">Logs</h1>
          <LogsMock filter={logsFilter} onChange={setLogsFilter} />
        </div>
      ) : (
        // Harness-only: clicking the goal-digger card opens the detail mock.
        <div
          onClickCapture={(event) => {
            if (kind !== "observability") return;
            const card = (event.target as HTMLElement).closest("div.rounded-md.border");
            if (card?.textContent?.includes("goal-digger")) setDetail(true);
          }}
        >
          <OperateView key={kind} kind={kind} />
        </div>
      )}
    </GitHubSessionProvider>
  );
}
