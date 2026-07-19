import type {
  OperateAppDetailResult,
  OperateAppHealth,
  OperateLogEntry,
  OperateTransaction,
  UserSourceLatestDeployment,
} from "@aomi-labs/deploy";
import {
  FIXTURES,
  appFixture,
  type AppFixture,
  type ChainFamily,
  type LogRecord,
  type TxRecord,
} from "./fixtures";
import type { TxStatus } from "./fixtures/types";

export type LiveAppDetailPayload = {
  detail: OperateAppDetailResult;
  health: OperateAppHealth | null;
  transactions: OperateTransaction[];
  logs: OperateLogEntry[];
  deployments: UserSourceLatestDeployment[];
};

export type LiveAppDetailView = {
  app: AppFixture;
  exampleSections: string[];
};

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const numberLabel = (value: number | null, digits = 0) =>
  finite(value) ? value.toFixed(digits) : "—";

const percentLabel = (value: number | null) =>
  finite(value) ? `${(value * 100).toFixed(1)}%` : "—";

const durationLabel = (value: number | null) =>
  finite(value) ? `${Math.round(value)} ms` : "—";

const bytesLabel = (value: number | null) =>
  finite(value) ? `${(value / 1024 / 1024).toFixed(1)} MB` : "—";

function relativeTime(timestamp: number): string {
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}

function txStatus(status: string): TxStatus {
  if (["confirmed", "landed", "success"].includes(status)) return "confirmed";
  if (["submitted", "broadcast", "inflight"].includes(status))
    return "submitted";
  if (["failed", "reverted", "expired"].includes(status)) return "failed";
  return "created";
}

function transactionRow(tx: OperateTransaction, app: string): TxRecord {
  const family: ChainFamily =
    tx.family === "svm" || (!tx.family && tx.slot) ? "svm" : "evm";
  return {
    id: tx.id,
    family,
    ts: tx.createdAt,
    time: new Date(tx.createdAt * 1000).toISOString(),
    app,
    status: txStatus(tx.status),
    chain: tx.chainName ?? String(tx.chainId || "—"),
    from: tx.fromAddress,
    fromLabel: tx.fromLabel ?? tx.fromAddress,
    to: tx.toAddress,
    toLabel: tx.toLabel ?? tx.toAddress,
    value: tx.value,
    valueUsd: tx.valueUsd ?? undefined,
    description: tx.description ?? tx.method ?? tx.externalTxId,
    hash: tx.txHash ?? undefined,
    block: tx.block ?? undefined,
    confirmations: tx.confirmations ?? undefined,
    gasUsed: tx.gasUsed ?? undefined,
    gasLimit: tx.gasLimit ?? undefined,
    effGasPrice: tx.effGasPrice ?? undefined,
    nonce: tx.nonce ?? undefined,
    slot: tx.slot ?? undefined,
    computeUnits: tx.computeUnits ?? undefined,
    computeLimit: tx.computeLimit ?? undefined,
    priorityFee: tx.priorityFee ?? undefined,
    txFee: tx.txFee ?? undefined,
    platformFee: tx.platformFee ?? undefined,
    method: tx.method ?? undefined,
    transfers: tx.transfers ?? undefined,
    revertReason: tx.revertReason ?? undefined,
    thread: "—",
    externalTxId: tx.externalTxId,
    explorer: tx.explorerUrl ?? undefined,
  };
}

function logRow(row: OperateLogEntry, app: string): LogRecord {
  const date = new Date(row.occurredAt * 1000).toISOString();
  return {
    ts: row.occurredAt,
    day: date.slice(0, 10),
    at: `${date.slice(11, 16)} UTC`,
    app,
    kind: row.kind === "invocation" ? "invocation" : "event",
    status: row.status === "error" || row.status === "ok" ? row.status : "info",
    summary: row.summary,
    tool: row.tool ?? undefined,
    durationMs: row.durationMs ?? undefined,
    thread: row.threadId ?? undefined,
    retries: row.retries ?? undefined,
    args: row.args ?? undefined,
    result: row.result ?? undefined,
    eventType: row.eventType,
  };
}

function releases(
  payload: LiveAppDetailPayload,
): AppFixture["detail"]["releases"] {
  const currentTag = payload.detail.app.releaseTag;
  const seen = new Set<string>();
  return payload.deployments.flatMap((deployment) =>
    deployment.apps.flatMap((app) => {
      if (
        app.applicationId !== payload.detail.app.applicationId &&
        app.name !== payload.detail.app.name
      ) {
        return [];
      }
      const tag = app.releaseTag ?? app.appReleaseTag;
      if (!tag || seen.has(tag)) return [];
      seen.add(tag);
      return [
        {
          tag,
          when: deployment.createdAt ? relativeTime(deployment.createdAt) : "—",
          current: tag === currentTag,
          note: deployment.ciStatus ?? deployment.state ?? "deployed",
        },
      ];
    }),
  );
}

export function liveAppDetailView(
  payload: LiveAppDetailPayload,
): LiveAppDetailView {
  const detail = payload.detail;
  const fallback = appFixture(detail.app.name) ?? FIXTURES[0]!;
  const example = new Set<string>();
  const fallbackNumber = (
    value: number | null,
    replacement: number,
    section: string,
  ) => {
    if (finite(value)) return value;
    example.add(section);
    return replacement;
  };
  const fallbackKpi = (index: number, value: string, section: string) => {
    if (value !== "—") return value;
    example.add(section);
    return fallback.detail.kpis[index]?.value ?? "—";
  };

  const funnelValues = [
    detail.funnel.chats24h,
    detail.funnel.toolCalls24h,
    detail.funnel.txProposed24h,
    detail.funnel.txSubmitted24h,
    detail.funnel.txConfirmed24h,
  ];
  const funnelLabels = [
    "Chats",
    "Tool calls",
    "Tx proposed",
    "Tx submitted",
    "Tx confirmed",
  ];
  const funnel = funnelLabels.map((label, index) => ({
    label,
    value: fallbackNumber(
      funnelValues[index] ?? null,
      fallback.detail.funnel[index]?.value ?? 0,
      "Conversion funnel",
    ),
  }));

  const transactions = payload.transactions.map((tx) =>
    transactionRow(tx, detail.app.name),
  );
  const families = [...new Set(transactions.map((tx) => tx.family))];
  if (!families.length) example.add("Chain families");

  const health = payload.health?.metrics;
  const activeUsers = numberLabel(detail.activeUsers24h);
  const credits24h = numberLabel(detail.credits.credits24h, 2);
  const creditsPerTurn = numberLabel(detail.credits.creditsPerTurn24h, 2);
  const p95 = durationLabel(health?.p95LatencyMs ?? null);
  const inflight = numberLabel(health?.inflightRequests ?? null);
  const chatErrors = percentLabel(health?.errorRate ?? null);
  const toolErrors = percentLabel(health?.toolErrorRate ?? null);
  const txFailures = percentLabel(health?.txErrorRate ?? null);

  const realTools = detail.tools.map((tool) => ({
    tool: tool.tool,
    calls: tool.calls ?? 0,
    errors: tool.errors ?? 0,
    errorRate: percentLabel(tool.errorRate),
    p95: durationLabel(tool.p95Ms),
    last: tool.lastError
      ? `${tool.lastError.message ?? "error"} · ${relativeTime(tool.lastError.occurredAt)}`
      : "—",
    bad: finite(tool.errorRate) && tool.errorRate >= 0.1,
  }));
  if (!realTools.length) example.add("Tool health");

  const realReleases = releases(payload);
  if (!realReleases.length) example.add("Release history");

  example.add("P95 latency history");
  const chatsHourly = detail.hourly.chats ?? fallback.detail.chatsHourly;
  const toolCallsHourly =
    detail.hourly.toolCalls ?? fallback.detail.toolCallsHourly;
  if (!detail.hourly.chats || !detail.hourly.toolCalls) {
    example.add("Activity history");
  }
  const creditsDaily = detail.credits.creditsDaily.length
    ? {
        days: detail.credits.creditsDaily.map((row) => row.day),
        values: detail.credits.creditsDaily.map((row) => row.credits),
      }
    : fallback.detail.creditsDaily;
  if (!detail.credits.creditsDaily.length) example.add("Credit history");

  const app: AppFixture = {
    meta: {
      name: detail.app.name,
      applicationId: detail.app.applicationId,
      families: families.length ? families : fallback.meta.families,
      releaseTag: detail.app.releaseTag,
      sdkVersion: detail.app.sdkVersion,
      status:
        detail.app.status === "healthy" ||
        detail.app.status === "not_loaded" ||
        detail.app.status === "inactive"
          ? detail.app.status
          : "inactive",
      repo: detail.source.repositoryLink ?? fallback.meta.repo,
    },
    card: {
      ...fallback.card,
      requestsPerMinute: health?.requestsPerMinute ?? null,
      errorRate: health?.errorRate ?? null,
      p95LatencyMs: health?.p95LatencyMs ?? null,
      inflightRequests: health?.inflightRequests ?? null,
      chats24h: detail.funnel.chats24h,
      toolCalls24h: detail.funnel.toolCalls24h,
      transactions24h: health?.transactions24h ?? null,
      chatsHourly: detail.hourly.chats,
      toolCallsHourly: detail.hourly.toolCalls,
      transactionsHourly: detail.hourly.transactions,
      toolErrorRate: health?.toolErrorRate ?? null,
      txErrorRate: health?.txErrorRate ?? null,
      coldStartMs: detail.lifecycle.coldStartMs,
      dylibBytes: detail.lifecycle.dylibBytes,
    },
    detail: {
      funnel,
      funnelNote: [
        `${numberLabel(detail.activeUsers24h)} active users`,
        `${numberLabel(detail.funnel.txReverted24h)} reverted`,
      ],
      kpis: [
        {
          label: "Active users",
          value: fallbackKpi(0, activeUsers, "User activity"),
          sub: "24h",
        },
        {
          label: "Credits",
          value: fallbackKpi(1, credits24h, "Credit KPIs"),
          sub: "24h",
        },
        {
          label: "Credits / turn",
          value: fallbackKpi(2, creditsPerTurn, "Credit KPIs"),
          sub: "24h",
        },
        {
          label: "P95 latency",
          value: fallbackKpi(3, p95, "Latency KPI"),
        },
        {
          label: "Inflight",
          value: fallbackKpi(4, inflight, "Inflight KPI"),
        },
        {
          label: "Chat errors",
          value: fallbackKpi(5, chatErrors, "Error KPIs"),
        },
        {
          label: "Tool errors",
          value: fallbackKpi(6, toolErrors, "Error KPIs"),
        },
        {
          label: "Tx failures",
          value: fallbackKpi(7, txFailures, "Error KPIs"),
        },
      ],
      chatsHourly,
      toolCallsHourly,
      p95Hourly: fallback.detail.p95Hourly,
      creditsDaily,
      tools: realTools.length ? realTools : fallback.detail.tools,
      toolsSummary: realTools.length
        ? (() => {
            const calls = realTools.reduce((sum, row) => sum + row.calls, 0);
            const errors = realTools.reduce((sum, row) => sum + row.errors, 0);
            return `${calls} calls · ${errors} ${errors === 1 ? "error" : "errors"}`;
          })()
        : fallback.detail.toolsSummary,
      fees24h: "receipt fees shown per transaction",
      lifecycle: [
        ["Cold start", durationLabel(detail.lifecycle.coldStartMs)],
        ["Binary", bytesLabel(detail.lifecycle.dylibBytes)],
        ["Loaded instances", numberLabel(detail.lifecycle.loads24h)],
        ["Evictions", numberLabel(detail.lifecycle.evictions24h)],
      ],
      releases: realReleases.length ? realReleases : fallback.detail.releases,
    },
    transactions,
    logs: payload.logs.map((row) => logRow(row, detail.app.name)),
    statement: fallback.statement,
  };

  return { app, exampleSections: [...example] };
}
