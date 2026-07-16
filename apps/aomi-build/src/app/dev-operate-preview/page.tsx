"use client";

// TEMPORARY visual harness for the Operate pages. All four tabs render the
// REAL OperateView components; window.fetch is stubbed to serve ./fixtures
// (goal-digger: SVM, playground-example: SVM+EVM, geckoterminal: EVM) in the
// exact BFF wire shape. Only the app drill-down remains a design mock.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitHubSessionProvider } from "@build/components/control-plane/github-session-context";
import { OperateView } from "@build/features/operate/operate-view";
import type { OperateKind } from "@build/features/operate/client";
import { AppDetailMock } from "./detail-mock";
import {
  ALL_LOGS,
  ALL_TRANSACTIONS,
  APP_NAMES,
  FIXTURES,
  appFixture,
  type LogRecord,
  type TxRecord,
} from "./fixtures";

const SOURCE = { id: 141779906, repositoryLink: "aomi-labs/apps", apps: [] };

const CHAIN_IDS: Record<string, number> = { Ethereum: 1, Base: 8453 };

function txWire(tx: TxRecord) {
  return {
    id: tx.id,
    externalTxId: tx.externalTxId,
    application: tx.app,
    applicationId: appFixture(tx.app)?.meta.applicationId ?? null,
    status: tx.status,
    txHash: tx.hash ?? null,
    chainId: tx.family === "svm" ? 0 : (CHAIN_IDS[tx.chain] ?? 1),
    fromAddress: tx.from,
    toAddress: tx.to,
    value: tx.value,
    hasCalldata: Boolean(tx.calldata),
    calldataPreview: tx.calldata ?? null,
    description: tx.description,
    createdAt: tx.ts,
    updatedAt: tx.ts,
    submittedAt: tx.status === "created" ? null : tx.ts,
    family: tx.family,
    chainName: tx.chain,
    fromLabel: tx.fromLabel,
    toLabel: tx.toLabel,
    valueUsd: tx.valueUsd ?? null,
    block: tx.block ?? null,
    slot: tx.slot ?? null,
    confirmations: tx.confirmations ?? null,
    gasUsed: tx.gasUsed ?? null,
    gasLimit: tx.gasLimit ?? null,
    effGasPrice: tx.effGasPrice ?? null,
    computeUnits: tx.computeUnits ?? null,
    computeLimit: tx.computeLimit ?? null,
    priorityFee: tx.priorityFee ?? null,
    txFee: tx.txFee ?? null,
    platformFee: tx.platformFee ?? null,
    nonce: tx.nonce ?? null,
    method: tx.method ?? null,
    transfers: tx.transfers ?? null,
    revertReason: tx.revertReason ?? null,
    explorerUrl: tx.explorer ?? null,
    source: SOURCE,
  };
}

function logWire(log: LogRecord, index: number) {
  return {
    occurredAt: log.ts,
    eventType: log.eventType ?? "tool_invocation",
    id: `${log.app}-${log.ts}-${index}`,
    application: log.app,
    applicationId: appFixture(log.app)?.meta.applicationId ?? null,
    summary: log.summary,
    details: {},
    kind: log.kind,
    status: log.status,
    tool: log.tool ?? null,
    durationMs: log.durationMs ?? null,
    retries: log.retries ?? null,
    threadId: log.thread ?? null,
    args: log.args ?? null,
    result: log.result ?? null,
    source: SOURCE,
  };
}

const OBSERVABILITY = {
  sources: [SOURCE],
  scope: "owned_applications",
  monitoring: { provider: "grafana_prometheus", status: "ok", windowSeconds: 900 },
  dashboardLinks: [
    { label: "Open dashboard", url: "https://grafana.example.com/d/app", scope: "owned_applications" },
  ],
  platformMetrics: [],
  apps: FIXTURES.map((fixture) => ({
    applicationId: fixture.meta.applicationId,
    application: fixture.meta.name,
    active: fixture.meta.status !== "inactive",
    loaded: fixture.meta.status === "healthy",
    releaseTag: fixture.meta.releaseTag,
    sdkVersion: fixture.meta.sdkVersion,
    status: fixture.meta.status,
    source: SOURCE,
    metrics: {
      provider: "grafana_prometheus",
      windowSeconds: 900,
      available: true,
      trendWindowSeconds: 86400,
      ...fixture.card,
    },
  })),
};

const TRANSACTIONS = {
  sources: [SOURCE],
  transactions: ALL_TRANSACTIONS.map(txWire),
  nextCursor: null,
};

const LOGS = {
  sources: [SOURCE],
  logs: ALL_LOGS.map(logWire),
  nextCursor: null,
};

const USAGE = {
  sources: [SOURCE],
  range: { fromDate: "2026-07-01", toDate: "2026-07-15", maxDays: 31 },
  daily: [],
  breakdown: [
    { provider: "anthropic", model: "claude-opus-4-8", paymentMethod: "quota", inputTokens: 1_100_000, outputTokens: 152_000, creditsUsed: 9.1204, events: 152, source: SOURCE },
    { provider: "anthropic", model: "claude-haiku-4-5", paymentMethod: "quota", inputTokens: 206_000, outputTokens: 30_300, creditsUsed: 1.6233, events: 88, source: SOURCE },
  ],
  statement: {
    summary: {
      gross: "$183.25",
      platformFees: "−$28.33",
      serviceCharges: "−$31.90",
      net: "+$123.02",
      period: "Jul 1 – Jul 15",
    },
    revenue: FIXTURES.flatMap((fixture) =>
      fixture.usage.revenue.map((row) => ({
        stream: row.stream,
        pricing: row.how,
        application: fixture.meta.name,
        activity: row.events,
        gross: row.gross,
        platformFee: row.take,
        net: row.net,
        unpriced: Boolean(row.dim),
      })),
    ),
    charges: FIXTURES.flatMap((fixture) =>
      fixture.usage.charges.map((row) => ({
        item: row.item,
        application: fixture.meta.name,
        description: row.detail,
        amount: row.amount,
        keySource: row.badge === "BYOK" ? "byok" : row.badge ? "managed" : null,
      })),
    ),
    ledger: FIXTURES.flatMap((fixture) =>
      fixture.usage.ledger.map((row) => ({
        occurredAt: row.ts,
        day: row.day,
        application: fixture.meta.name,
        entry: row.entry,
        gross: row.gross,
        platformFee: row.fee,
        modelCost: row.model,
        net: row.net,
      })),
    ).sort((a, b) => b.occurredAt - a.occurredAt),
  },
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
    if (url.includes("/api/bff/operate/logs")) return Response.json(LOGS);
    if (url.includes("/api/bff/operate/usage")) return Response.json(USAGE);
    return real(input, init);
  };
}

const KINDS: OperateKind[] = ["observability", "transactions", "usage", "logs"];

export default function DevOperatePreview() {
  const [ready] = useState(() => {
    stubFetch();
    return true;
  });
  const router = useRouter();
  const [kind, setKind] = useState<OperateKind>("observability");
  const [detailApp, setDetailApp] = useState<string | null>(null);
  if (!ready) return null;

  const detail = detailApp ? appFixture(detailApp) : undefined;
  if (detail) {
    return (
      <AppDetailMock
        app={detail}
        onBack={() => setDetailApp(null)}
        onOpenTrace={(tool) => {
          // Deep link through real URL params — the same links the product uses.
          router.replace(
            `/dev-operate-preview?app=${encodeURIComponent(detail.meta.name)}&tool=${encodeURIComponent(tool)}`,
            { scroll: false },
          );
          setDetailApp(null);
          setKind("logs");
        }}
        onOpenTx={(txId) => {
          router.replace(
            `/dev-operate-preview?app=${encodeURIComponent(detail.meta.name)}&tx=${encodeURIComponent(txId)}`,
            { scroll: false },
          );
          setDetailApp(null);
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
      {/* Harness-only: clicking any app card opens its drill-down mock. */}
      <div
        onClickCapture={(event) => {
          if (kind !== "observability") return;
          const card = (event.target as HTMLElement).closest("div.rounded-md.border");
          const name = APP_NAMES.find((appName) => card?.textContent?.includes(appName));
          if (name) setDetailApp(name);
        }}
      >
        <OperateView key={kind} kind={kind} />
      </div>
    </GitHubSessionProvider>
  );
}
