"use client";

/**
 * Wire layer for the usage statement.
 *
 * `GET /api/account/statement?from_date&to_date` returns the **model subject
 * only** (`aomi_account::model_statement` over `llm_usage_events`) — per app,
 * per model, per payment method. Tool-invocation and outcome subjects have no
 * ledger writer yet, so the adapter renders them as *absent* (`null`), never
 * as zero: the UI's "—" means "not charged", and nothing on screen is invented.
 */

import { accountScopedFetch } from "@portal/lib/settings-api";
import type {
  AppModelRow,
  AppUsageEntry,
  MonthlyStatement,
  UsagePayment,
} from "./types";

/** One line of the wire statement (backend `ModelStatementLine`). */
export type WireModelLine = {
  model: string;
  provider: string;
  /** `"null"` (tier allowance) / `"byok"` / a stream method (`"coinbase"`, …). */
  payment_method: string;
  turns: number;
  input_tokens: number;
  output_tokens: number;
  credits_used: number;
  usd: number;
};

export type WireAppStatement = {
  app: string;
  turns: number;
  input_tokens: number;
  output_tokens: number;
  credits_used: number;
  usd: number;
  by_model: WireModelLine[];
};

export type WirePaymentLeg = {
  method: string;
  credits_used: number;
  usd: number;
  paid_credits: number;
  paid_usd: number;
};

export type WireModelStatement = {
  period_utc_from: string;
  period_utc_to: string;
  apps: WireAppStatement[];
  payment: WirePaymentLeg[];
  total_credits_used: number;
  total_usd: number;
};

/** `"YYYY-MM"` month key → the from/to the statement endpoint expects. */
export function monthRange(monthKey: string): { from: string; to: string } {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function currentMonthKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The last `count` month keys, newest first, current month included. */
export function recentMonthKeys(count: number, now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    keys.push(currentMonthKey(d));
  }
  return keys;
}

export async function fetchModelStatement(
  monthKey: string,
): Promise<WireModelStatement> {
  const { from, to } = monthRange(monthKey);
  return accountScopedFetch<WireModelStatement>(
    `/api/account/statement?from_date=${from}&to_date=${to}`,
  );
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return `${MONTH_NAMES[month - 1] ?? monthKey} ${year}`;
}

/** Human label for a payment method wire value. */
export function paymentMethodLabel(method: string): string {
  if (method === "null") return "allowance";
  if (method === "byok") return "your own key";
  return method;
}

/**
 * Wire statement + the profile's credit position → the `MonthlyStatement`
 * shape every usage view renders. Only the model subject carries numbers;
 * tool/outcome land as `null` (the types' own "not charged" encoding) and the
 * column totals for those subjects stay 0.
 */
export function toMonthlyStatement(
  wire: WireModelStatement,
  monthKey: string,
  allowance: { included: number; used: number },
): MonthlyStatement {
  const apps: AppUsageEntry[] = wire.apps.map((app) => {
    const byok = app.by_model.every((line) => line.payment_method === "byok");
    const byModel: AppModelRow[] = app.by_model.map((line) => ({
      model: line.model,
      provider: line.provider,
      paymentMethod: line.payment_method,
      turns: line.turns,
      inputTokens: line.input_tokens,
      outputTokens: line.output_tokens,
      // No base-vs-markup split on the ledger — charged is the only real
      // number, so base mirrors it rather than inventing a markup.
      baseUsd: line.usd,
      chargedUsd: line.usd,
      ...(line.payment_method === "byok"
        ? { note: "paid by your own key" }
        : {}),
    }));
    return {
      id: app.app,
      name: app.app,
      native: app.app === "default",
      settings: {
        modelKey: byok ? "byok" : "managed",
        appByok: byok,
        managedMarkupPct: 0,
        note: "",
      },
      model: {
        baseUsd: app.usd,
        markupPct: 0,
        markupUsd: 0,
        chargedUsd: app.usd,
        billed: !byok,
        turns: app.turns,
        byModel,
      },
      tool: null,
      outcome: null,
      appTotalUsd: app.usd,
    };
  });

  const quota = wire.payment.find((leg) => leg.method === "null");
  const streamLegs = wire.payment.filter(
    (leg) => leg.method !== "null" && leg.method !== "byok",
  );
  const x402SettledUsd = streamLegs.reduce((sum, leg) => sum + leg.paid_usd, 0);
  const settledVia =
    streamLegs.length > 0
      ? streamLegs.map((leg) => paymentMethodLabel(leg.method)).join(" + ")
      : "allowance";

  const payment: UsagePayment = {
    settledVia,
    allowanceCredits: allowance,
    allowanceAppliedUsd: quota?.usd ?? 0,
    x402SettledUsd,
    onchainUsd: 0,
    onchainNote: "",
  };

  const { from, to } = monthRange(monthKey);
  return {
    period: {
      periodLabel: monthLabel(monthKey),
      from,
      to,
      issued: to,
    },
    summary: {
      modelUsd: wire.total_usd,
      toolUsd: 0,
      outcomeUsd: 0,
      computeUsd: 0,
      onchainUsd: 0,
      totalUsd: wire.total_usd,
      managedMarkupUsd: 0,
    },
    payment,
    apps,
    byApp: wire.apps.map((app) => ({
      app: app.app,
      modelUsd: app.usd,
      toolUsd: null,
      outcomeUsd: null,
      totalUsd: app.usd,
    })),
    columnTotals: {
      modelUsd: wire.total_usd,
      toolUsd: 0,
      outcomeUsd: 0,
      totalUsd: wire.total_usd,
    },
  };
}
