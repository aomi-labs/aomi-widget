// Aggregated fixture registry. One import hydrates every Operate mock page
// as if it were real backend data:
//
//   fixtures/
//     goal-digger/         SVM  · high activity, hot tool error, converting funnel
//     playground-example/  SVM + EVM · medium activity, cross-family bridge
//     geckoterminal/       EVM  · read-only market data, zero transactions, BYOK

import type { AppFixture, LogRecord, TxRecord } from "./types";
import { goalDigger } from "./goal-digger";
import { playgroundExample } from "./playground-example";
import { geckoterminal } from "./geckoterminal";

export type { AppFixture, ChainFamily, LogRecord, ToolStat, TxRecord } from "./types";

export const FIXTURES: AppFixture[] = [goalDigger, playgroundExample, geckoterminal];

export const APP_NAMES = FIXTURES.map((f) => f.meta.name);

export function appFixture(name: string): AppFixture | undefined {
  return FIXTURES.find((f) => f.meta.name === name);
}

/** All transactions across apps, newest first. */
export const ALL_TRANSACTIONS: TxRecord[] = FIXTURES.flatMap((f) => f.transactions).sort(
  (a, b) => b.ts - a.ts,
);

/** All log records across apps, newest first. */
export const ALL_LOGS: LogRecord[] = FIXTURES.flatMap((f) => f.logs).sort(
  (a, b) => b.ts - a.ts,
);

/** Union of tool names across apps, for the Logs filter. */
export const ALL_TOOLS: string[] = [
  ...new Set(FIXTURES.flatMap((f) => f.detail.tools.map((t) => t.tool))),
];

// ---------------------------------------------------------------------------
// Platform-level usage statement (across all apps of this builder)

export const USAGE_SUMMARY = [
  { label: "Gross revenue", value: "$183.25", sub: "collected from end users" },
  { label: "Platform fees", value: "−$28.33", sub: "revenue share", tone: "fee" as const },
  { label: "Service charges", value: "−$31.90", sub: "model usage & hosting", tone: "fee" as const },
  { label: "Net revenue", value: "+$123.02", sub: "Jul 1 – Jul 15", tone: "net" as const },
];

export const MODEL_DETAIL = [
  { model: "anthropic/claude-opus-4-8", base: "$8.21", upcharge: "$0.82", billed: "$9.03" },
  { model: "anthropic/claude-haiku-4-5", base: "$2.61", upcharge: "$0.26", billed: "$2.87" },
];
