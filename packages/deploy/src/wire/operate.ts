/**
 * Operate-surface response mappers: transactions, usage, statements,
 * billing/payments, logs, observability, and app detail. Split out for file size.
 */
import type {
  OperateAppDetailResult,
  OperateLogCursor,
  OperateLogEntry,
  OperateLogsResult,
  OperateObservabilityResult,
  OperateStatementResult,
  OperateTransaction,
  OperateTransactionCursor,
  OperateTransactionsResult,
  OperateUsageResult,
  UserProjectRef,
} from "../types";
import { camelAppPricing, camelProject, timestampSeconds } from "./responses";

export function encodeTransactionCursor(
  cursor: OperateTransactionCursor | string | null | undefined,
): string | null {
  if (!cursor) return null;
  if (typeof cursor === "string") return cursor;
  return JSON.stringify({ created_at: cursor.createdAt, id: cursor.id });
}

export function encodeLogCursor(
  cursor: OperateLogCursor | string | null | undefined,
): string | null {
  if (!cursor) return null;
  if (typeof cursor === "string") return cursor;
  return JSON.stringify({
    occurred_at: cursor.occurredAt,
    event_type: cursor.eventType,
    id: cursor.id,
  });
}

export function camelTransactionCursor(
  raw: unknown,
): OperateTransactionCursor | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, any>;
  const createdAt = timestampSeconds(c.created_at ?? c.createdAt);
  const id = String(c.id ?? "");
  return createdAt && id ? { createdAt, id } : null;
}

export function camelLogCursor(raw: unknown): OperateLogCursor | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, any>;
  const occurredAt = timestampSeconds(c.occurred_at ?? c.occurredAt);
  const eventType = String(c.event_type ?? c.eventType ?? "");
  const id = String(c.id ?? "");
  return occurredAt && eventType && id ? { occurredAt, eventType, id } : null;
}

export function optString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

export function optNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

export function camelTransactionRow(
  row: Record<string, any>,
): OperateTransaction {
  return {
    id: String(row.id ?? ""),
    externalTxId: String(row.external_tx_id ?? row.externalTxId ?? ""),
    application: String(row.application ?? ""),
    applicationId: row.application_id ?? row.applicationId ?? null,
    status: String(row.status ?? ""),
    txHash: row.tx_hash ?? row.txHash ?? null,
    chainId: Number(row.chain_id ?? row.chainId ?? 0),
    fromAddress: String(row.from_address ?? row.fromAddress ?? ""),
    toAddress: String(row.to_address ?? row.toAddress ?? ""),
    value: String(row.value ?? "0"),
    hasCalldata: Boolean(row.has_calldata ?? row.hasCalldata),
    calldataPreview: row.calldata_preview ?? row.calldataPreview ?? null,
    description: row.description ?? null,
    createdAt: timestampSeconds(row.created_at ?? row.createdAt),
    updatedAt: timestampSeconds(row.updated_at ?? row.updatedAt),
    submittedAt:
      row.submitted_at == null && row.submittedAt == null
        ? null
        : timestampSeconds(row.submitted_at ?? row.submittedAt),
    family: (row.family ?? null) as "evm" | "svm" | null,
    chainName: optString(row.chain_name ?? row.chainName),
    fromLabel: optString(row.from_label ?? row.fromLabel),
    toLabel: optString(row.to_label ?? row.toLabel),
    valueUsd: optString(row.value_usd ?? row.valueUsd),
    block: optString(row.block),
    slot: optString(row.slot),
    confirmations: optNumber(row.confirmations),
    gasUsed: optString(row.gas_used ?? row.gasUsed),
    gasLimit: optString(row.gas_limit ?? row.gasLimit),
    effGasPrice: optString(row.eff_gas_price ?? row.effGasPrice),
    computeUnits: optString(row.compute_units ?? row.computeUnits),
    computeLimit: optString(row.compute_limit ?? row.computeLimit),
    priorityFee: optString(row.priority_fee ?? row.priorityFee),
    txFee: optString(row.tx_fee ?? row.txFee),
    platformFee: optString(row.platform_fee ?? row.platformFee),
    nonce: optNumber(row.nonce),
    method: optString(row.method),
    transfers: Array.isArray(row.transfers) ? row.transfers.map(String) : null,
    revertReason: optString(row.revert_reason ?? row.revertReason),
    explorerUrl: optString(row.explorer_url ?? row.explorerUrl),
  };
}

export function camelOperateTransactions(
  raw: Record<string, unknown>,
  fallbackPlatform = "",
): OperateTransactionsResult {
  return {
    project: camelProject(raw.project),
    platform: String(raw.platform ?? fallbackPlatform),
    transactions: ((raw.transactions ?? []) as Record<string, any>[]).map(
      camelTransactionRow,
    ),
    nextCursor: camelTransactionCursor(raw.next_cursor ?? raw.nextCursor),
  };
}

export function camelUserProjectRefs(
  raw: unknown,
  fallbackPlatform = "",
): UserProjectRef[] {
  return ((raw ?? []) as Record<string, any>[]).map((entry) => ({
    project: camelProject(entry.project),
    platform: String(entry.platform ?? fallbackPlatform),
  }));
}

export function camelOperateUsage(
  raw: Record<string, unknown>,
  fallbackPlatform = "",
): OperateUsageResult {
  const range = (raw.range ?? {}) as Record<string, any>;
  return {
    project: camelProject(raw.project),
    platform: String(raw.platform ?? fallbackPlatform),
    range: {
      fromDate: String(range.from_date ?? range.fromDate ?? ""),
      toDate: String(range.to_date ?? range.toDate ?? ""),
      maxDays: Number(range.max_days ?? range.maxDays ?? 90),
    },
    daily: ((raw.daily ?? []) as Record<string, any>[]).map((row) => ({
      periodUtcDay: String(row.period_utc_day ?? row.periodUtcDay ?? ""),
      application: String(row.application ?? ""),
      applicationId: Number(row.application_id ?? row.applicationId ?? 0),
      inputTokens: Number(row.input_tokens ?? row.inputTokens ?? 0),
      outputTokens: Number(row.output_tokens ?? row.outputTokens ?? 0),
      creditsUsed: Number(row.credits_used ?? row.creditsUsed ?? 0),
    })),
    breakdown: ((raw.breakdown ?? []) as Record<string, any>[]).map((row) => ({
      provider: String(row.provider ?? ""),
      model: String(row.model ?? ""),
      paymentMethod: String(row.payment_method ?? row.paymentMethod ?? ""),
      inputTokens: Number(row.input_tokens ?? row.inputTokens ?? 0),
      outputTokens: Number(row.output_tokens ?? row.outputTokens ?? 0),
      creditsUsed: Number(row.credits_used ?? row.creditsUsed ?? 0),
      events: Number(row.events ?? 0),
    })),
  };
}

export function camelOperateStatement(
  raw: Record<string, unknown>,
  fallbackPlatform = "",
): OperateStatementResult {
  const range = (raw.range ?? {}) as Record<string, any>;
  const summary = (raw.summary ?? {}) as Record<string, any>;
  return {
    project: camelProject(raw.project),
    platform: String(raw.platform ?? fallbackPlatform),
    range: {
      fromDate: String(range.from_date ?? range.fromDate ?? ""),
      toDate: String(range.to_date ?? range.toDate ?? ""),
    },
    available: Boolean(raw.available),
    summary: {
      grossRevenue: Number(summary.gross_revenue ?? summary.grossRevenue ?? 0),
      platformFees: Number(summary.platform_fees ?? summary.platformFees ?? 0),
      serviceCharges: Number(
        summary.service_charges ?? summary.serviceCharges ?? 0,
      ),
      net: Number(summary.net ?? 0),
    },
    revenue: ((raw.revenue ?? []) as Record<string, any>[]).map((row) => ({
      subject: String(row.subject ?? ""),
      application: String(row.application ?? ""),
      applicationId: row.application_id ?? row.applicationId ?? null,
      events: Number(row.events ?? 0),
      gross: Number(row.gross ?? 0),
      platformFee: Number(row.platform_fee ?? row.platformFee ?? 0),
      net: Number(row.net ?? 0),
    })),
    charges: ((raw.charges ?? []) as Record<string, any>[]).map((row) => ({
      item: String(row.item ?? ""),
      application: String(row.application ?? ""),
      applicationId: row.application_id ?? row.applicationId ?? null,
      events: Number(row.events ?? 0),
      amount: Number(row.amount ?? 0),
    })),
    entries: ((raw.entries ?? []) as Record<string, any>[]).map((row) => ({
      day: String(row.day ?? ""),
      application: String(row.application ?? ""),
      subject: String(row.subject ?? ""),
      events: Number(row.events ?? 0),
      gross: Number(row.gross ?? 0),
      platformFee: Number(row.platform_fee ?? row.platformFee ?? 0),
      net: Number(row.net ?? 0),
    })),
    payments: camelPartnerPayments(raw.payments),
  };
}

export function camelPartnerPayments(raw: unknown) {
  const payments = (raw ?? {}) as Record<string, any>;
  const summary = (payments.summary ?? {}) as Record<string, any>;
  return {
    available: Boolean(payments.available),
    scope: String(payments.scope ?? "recipient_bucket"),
    summary: {
      accruedCredits: Number(
        summary.accrued_credits ?? summary.accruedCredits ?? 0,
      ),
      accruedUsd: Number(summary.accrued_usd ?? summary.accruedUsd ?? 0),
      settledCredits: Number(
        summary.settled_credits ?? summary.settledCredits ?? 0,
      ),
      settledUsd: Number(summary.settled_usd ?? summary.settledUsd ?? 0),
      outstandingCredits: Number(
        summary.outstanding_credits ?? summary.outstandingCredits ?? 0,
      ),
      outstandingUsd: Number(
        summary.outstanding_usd ?? summary.outstandingUsd ?? 0,
      ),
      pricedCalls: Number(summary.priced_calls ?? summary.pricedCalls ?? 0),
      settlements: Number(summary.settlements ?? 0),
    },
    resources: ((payments.resources ?? []) as Record<string, any>[]).map(
      (resource) => ({
        application: String(resource.application ?? ""),
        applicationId:
          resource.application_id ?? resource.applicationId ?? null,
        tool: String(resource.tool ?? ""),
        flatCredits: Number(resource.flat_credits ?? resource.flatCredits ?? 0),
        flatUsd: Number(resource.flat_usd ?? resource.flatUsd ?? 0),
        beneficiary: resource.beneficiary ?? null,
        recipient: resource.recipient ?? null,
        chain: resource.chain ?? null,
        beneficiaryType:
          resource.beneficiary_type ?? resource.beneficiaryType ?? null,
        observedCalls: Number(
          resource.observed_calls ?? resource.observedCalls ?? 0,
        ),
      }),
    ),
    buckets: ((payments.buckets ?? []) as Record<string, any>[]).map(
      (bucket) => ({
        id: String(bucket.id ?? ""),
        recipient: String(bucket.recipient ?? ""),
        outstandingCredits: Number(
          bucket.outstanding_credits ?? bucket.outstandingCredits ?? 0,
        ),
        outstandingUsd: Number(
          bucket.outstanding_usd ?? bucket.outstandingUsd ?? 0,
        ),
      }),
    ),
    events: ((payments.events ?? []) as Record<string, any>[]).map((event) => ({
      id: String(event.id ?? ""),
      kind: String(event.kind ?? ""),
      occurredAt: timestampSeconds(event.occurred_at ?? event.occurredAt),
      application: event.application ?? null,
      applicationId: event.application_id ?? event.applicationId ?? null,
      tools: Array.isArray(event.tools) ? event.tools.map(String) : [],
      credits: Number(event.credits ?? 0),
      usd: Number(event.usd ?? 0),
      asset: event.asset ?? null,
      assetAmount:
        event.asset_amount === null || event.asset_amount === undefined
          ? (event.assetAmount ?? null)
          : Number(event.asset_amount),
      recipient: String(event.recipient ?? ""),
      paymentMethod: String(event.payment_method ?? event.paymentMethod ?? ""),
      receiptId: event.receipt_id ?? event.receiptId ?? null,
      chain: event.chain ?? null,
      explorerUrl: event.explorer_url ?? event.explorerUrl ?? null,
    })),
  };
}

export function camelLogRow(row: Record<string, any>): OperateLogEntry {
  const details = (row.details ?? {}) as Record<string, any>;
  const rawModelKey = details.model_key ?? details.modelKey;
  const modelKeyId =
    rawModelKey && typeof rawModelKey === "object"
      ? optNumber(rawModelKey.id)
      : null;
  const modelKey =
    modelKeyId !== null && Number.isFinite(modelKeyId)
      ? {
          id: modelKeyId,
          label: optString(rawModelKey.label),
          prefix: optString(rawModelKey.prefix),
        }
      : null;
  return {
    occurredAt: timestampSeconds(row.occurred_at ?? row.occurredAt),
    eventType: String(row.event_type ?? row.eventType ?? ""),
    id: String(row.id ?? ""),
    application: String(row.application ?? ""),
    applicationId: row.application_id ?? row.applicationId ?? null,
    summary: String(row.summary ?? ""),
    details,
    modelKey,
    kind: (row.kind ?? null) as "invocation" | "event" | null,
    status: (row.status ?? null) as "ok" | "error" | "info" | null,
    tool: optString(row.tool),
    durationMs: optNumber(row.duration_ms ?? row.durationMs),
    retries: optNumber(row.retries),
    threadId: optString(row.thread_id ?? row.threadId),
    args: optString(row.args),
    result: optString(row.result),
  };
}

export function camelOperateLogs(
  raw: Record<string, unknown>,
  fallbackPlatform = "",
): OperateLogsResult {
  return {
    project: camelProject(raw.project),
    platform: String(raw.platform ?? fallbackPlatform),
    logs: ((raw.logs ?? []) as Record<string, any>[]).map(camelLogRow),
    nextCursor: camelLogCursor(raw.next_cursor ?? raw.nextCursor),
  };
}

export function camelOperateObservability(
  raw: Record<string, unknown>,
  fallbackPlatform = "",
): OperateObservabilityResult {
  const monitoring = (raw.monitoring ?? {}) as Record<string, any>;
  return {
    project: camelProject(raw.project),
    platform: String(raw.platform ?? fallbackPlatform),
    scope: String(raw.scope ?? "owned_applications"),
    monitoring:
      raw.monitoring && typeof raw.monitoring === "object"
        ? {
            provider: String(monitoring.provider ?? ""),
            status: String(monitoring.status ?? ""),
            windowSeconds: Number(
              monitoring.window_seconds ?? monitoring.windowSeconds ?? 0,
            ),
          }
        : null,
    apps: ((raw.apps ?? []) as Record<string, any>[]).map((app) => ({
      applicationId: Number(app.application_id ?? app.applicationId ?? 0),
      application: String(app.application ?? ""),
      active: Boolean(app.active),
      loaded: Boolean(app.loaded),
      releaseTag: app.release_tag ?? app.releaseTag ?? null,
      sdkVersion: app.sdk_version ?? app.sdkVersion ?? null,
      status: String(app.status ?? ""),
      metrics: camelOperateAppMetrics(app.metrics),
      pricing: camelAppPricing(app.pricing),
    })),
    dashboardLinks: (
      (raw.dashboard_links ?? raw.dashboardLinks ?? []) as Record<string, any>[]
    ).map((link) => ({
      label: String(link.label ?? ""),
      url: String(link.url ?? ""),
      scope: String(link.scope ?? ""),
    })),
    platformMetrics: (
      (raw.platform_metrics ?? raw.platformMetrics ?? []) as Record<
        string,
        any
      >[]
    ).map((metric) => ({
      label: String(metric.label ?? ""),
      value:
        metric.value === null || metric.value === undefined
          ? null
          : Number(metric.value),
      unit: String(metric.unit ?? ""),
      scope: String(metric.scope ?? ""),
      description:
        typeof metric.description === "string" ? metric.description : undefined,
    })),
    payments: camelPartnerPayments(raw.payments),
  };
}

export function camelOperateAppDetail(
  raw: Record<string, unknown>,
  fallbackPlatform = "",
): OperateAppDetailResult {
  const app = (raw.app ?? {}) as Record<string, any>;
  const funnel = (raw.funnel ?? {}) as Record<string, any>;
  const credits = (raw.credits ?? {}) as Record<string, any>;
  const lifecycle = (raw.lifecycle ?? {}) as Record<string, any>;
  const hourly = (raw.hourly ?? {}) as Record<string, any>;
  const series = (value: unknown): number[] | null =>
    Array.isArray(value) ? value.map(Number) : null;
  const nullableSeries = (value: unknown): Array<number | null> | null =>
    Array.isArray(value)
      ? value.map((item) => {
          if (item === null || item === undefined) return null;
          const numeric = Number(item);
          return Number.isFinite(numeric) ? numeric : null;
        })
      : null;
  return {
    project: camelProject(raw.project),
    platform: String(raw.platform ?? fallbackPlatform),
    windowSeconds: Number(raw.window_seconds ?? raw.windowSeconds ?? 0),
    app: {
      applicationId: Number(app.application_id ?? app.applicationId ?? 0),
      name: String(app.name ?? ""),
      releaseTag: optString(app.release_tag ?? app.releaseTag),
      sdkVersion: optString(app.sdk_version ?? app.sdkVersion),
      active: Boolean(app.active),
      loaded: Boolean(app.loaded),
      status: String(app.status ?? ""),
    },
    funnel: {
      chats24h: optNumber(funnel.chats_24h ?? funnel.chats24h),
      toolCalls24h: optNumber(funnel.tool_calls_24h ?? funnel.toolCalls24h),
      txProposed24h: optNumber(funnel.tx_proposed_24h ?? funnel.txProposed24h),
      txSubmitted24h: optNumber(
        funnel.tx_submitted_24h ?? funnel.txSubmitted24h,
      ),
      txConfirmed24h: optNumber(
        funnel.tx_confirmed_24h ?? funnel.txConfirmed24h,
      ),
      txReverted24h: optNumber(funnel.tx_reverted_24h ?? funnel.txReverted24h),
    },
    activeUsers24h: optNumber(raw.active_users_24h ?? raw.activeUsers24h),
    credits: {
      credits24h: optNumber(credits.credits_24h ?? credits.credits24h),
      creditsPerTurn24h: optNumber(
        credits.credits_per_turn_24h ?? credits.creditsPerTurn24h,
      ),
      creditsDaily: (
        (credits.credits_daily ?? credits.creditsDaily ?? []) as Record<
          string,
          any
        >[]
      ).map((row) => ({
        day: String(row.day ?? ""),
        credits: Number(row.credits ?? 0),
      })),
    },
    tools: ((raw.tools ?? []) as Record<string, any>[]).map((row) => {
      const lastError = (row.last_error ?? row.lastError) as
        | Record<string, any>
        | null
        | undefined;
      return {
        tool: String(row.tool ?? ""),
        calls: optNumber(row.calls),
        errors: optNumber(row.errors),
        errorRate: optNumber(row.error_rate ?? row.errorRate),
        p95Ms: optNumber(row.p95_ms ?? row.p95Ms),
        lastError: lastError
          ? {
              message: optString(lastError.message),
              occurredAt: Number(
                lastError.occurred_at ?? lastError.occurredAt ?? 0,
              ),
            }
          : null,
      };
    }),
    lifecycle: {
      coldStartMs: optNumber(lifecycle.cold_start_ms ?? lifecycle.coldStartMs),
      dylibBytes: optNumber(lifecycle.dylib_bytes ?? lifecycle.dylibBytes),
      loads24h: optNumber(lifecycle.loads_24h ?? lifecycle.loads24h),
      evictions24h: optNumber(
        lifecycle.evictions_24h ?? lifecycle.evictions24h,
      ),
    },
    hourly: {
      chats: series(hourly.chats),
      toolCalls: series(hourly.tool_calls ?? hourly.toolCalls),
      p95LatencyMs: nullableSeries(
        hourly.p95_latency_ms ?? hourly.p95LatencyMs,
      ),
      transactions: series(hourly.transactions),
    },
  };
}

function camelOperateAppMetrics(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const metrics = raw as Record<string, any>;
  const metricNumber = (snake: string, camel: string): number | null => {
    const value = metrics[snake] ?? metrics[camel];
    return value === null || value === undefined ? null : Number(value);
  };
  const metricSeries = (snake: string, camel: string): number[] | null => {
    const value = metrics[snake] ?? metrics[camel];
    return Array.isArray(value) ? value.map(Number) : null;
  };
  return {
    provider: String(metrics.provider ?? ""),
    windowSeconds: Number(metrics.window_seconds ?? metrics.windowSeconds ?? 0),
    available: Boolean(metrics.available),
    requestsPerMinute: metricNumber("requests_per_minute", "requestsPerMinute"),
    errorRate: metricNumber("error_rate", "errorRate"),
    p95LatencyMs: metricNumber("p95_latency_ms", "p95LatencyMs"),
    inflightRequests: metricNumber("inflight_requests", "inflightRequests"),
    trendWindowSeconds: metricNumber(
      "trend_window_seconds",
      "trendWindowSeconds",
    ),
    chats24h: metricNumber("chats_24h", "chats24h"),
    toolCalls24h: metricNumber("tool_calls_24h", "toolCalls24h"),
    transactions24h: metricNumber("transactions_24h", "transactions24h"),
    chatsHourly: metricSeries("chats_hourly", "chatsHourly"),
    toolCallsHourly: metricSeries("tool_calls_hourly", "toolCallsHourly"),
    transactionsHourly: metricSeries(
      "transactions_hourly",
      "transactionsHourly",
    ),
    toolErrorRate: metricNumber("tool_error_rate", "toolErrorRate"),
    txErrorRate: metricNumber("tx_error_rate", "txErrorRate"),
    coldStartMs: metricNumber("cold_start_ms", "coldStartMs"),
    dylibBytes: metricNumber("dylib_bytes", "dylibBytes"),
  };
}
