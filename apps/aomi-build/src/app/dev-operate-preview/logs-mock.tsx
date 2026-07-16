"use client";

// TEMPORARY design mock: Logs as a dense log viewer — one line per record,
// click to expand. Invocations (runtime traces) and system events share the
// stream. Privacy: user intents never shown; args/results/errors exposed.

import { useState } from "react";
import { Lock, X } from "lucide-react";

export type LogsFilter = {
  app: string | null;
  tool: string | null;
  errorsOnly: boolean;
};

export const EMPTY_LOGS_FILTER: LogsFilter = { app: null, tool: null, errorsOnly: false };

type LogRecord = {
  day: string;
  at: string;
  app: string;
  kind: "invocation" | "event";
  status: "ok" | "error" | "info";
  /** one-line scan summary (stands in for the SDK per-tool summarize hint) */
  summary: string;
  tool?: string;
  durationMs?: number;
  thread?: string;
  retries?: number;
  args?: string;
  result?: string;
  eventType?: string;
};

const RECORDS: LogRecord[] = [
  {
    day: "Jul 15", at: "17:47:58", app: "goal-digger", kind: "invocation", status: "ok",
    tool: "swap_quote", durationMs: 1840, thread: "thread_af92c1",
    summary: "ETH → USDC 0.25 · out 918.02",
    args: '{ "token_in": "ETH", "token_out": "USDC", "amount": "0.25", "slippage_bps": 50 }',
    result: '{ "route": "uniswap_v3", "amount_out": "918.02", "price_impact_bps": 12 }',
  },
  {
    day: "Jul 15", at: "17:45:12", app: "goal-digger", kind: "event", status: "info",
    eventType: "deployment", summary: "Activated release apps-141779906-r1dac12ad71-goal-digger",
  },
  {
    day: "Jul 15", at: "16:48:12", app: "goal-digger", kind: "invocation", status: "error",
    tool: "swap_quote", durationMs: 2140, thread: "thread_be44a0", retries: 3,
    summary: "SlippageExceeded: 340 bps > 50 bps · order $14.7k vs pool $48k",
    args: '{ "token_in": "ETH", "token_out": "PEPE", "amount": "4.0", "slippage_bps": 50 }',
    result: "SlippageExceeded: quote moved 340 bps > 50 bps limit (pool depth $48k, order $14.7k)",
  },
  {
    day: "Jul 15", at: "16:47:31", app: "goal-digger", kind: "invocation", status: "error",
    tool: "swap_quote", durationMs: 1980, thread: "thread_be44a0", retries: 2,
    summary: "SlippageExceeded: 290 bps > 50 bps",
    args: '{ "token_in": "ETH", "token_out": "PEPE", "amount": "4.0", "slippage_bps": 50 }',
    result: "SlippageExceeded: quote moved 290 bps > 50 bps limit",
  },
  {
    day: "Jul 15", at: "15:33:55", app: "geckoterminal", kind: "event", status: "info",
    eventType: "app_loaded", summary: "Cold start 890 ms · dylib 2.0 MB · SDK 3.0.2",
  },
  {
    day: "Jul 15", at: "14:10:03", app: "goal-digger", kind: "event", status: "info",
    eventType: "app_evicted", summary: "Evicted after 45m idle (memory pressure policy)",
  },
  {
    day: "Jul 15", at: "14:02:44", app: "goal-digger", kind: "invocation", status: "ok",
    tool: "swap_quote", durationMs: 920, thread: "thread_af92c1",
    summary: "ETH → USDC 1.2 · out 4402.11",
    args: '{ "token_in": "ETH", "token_out": "USDC", "amount": "1.2", "slippage_bps": 30 }',
    result: '{ "route": "uniswap_v2", "amount_out": "4402.11", "price_impact_bps": 8 }',
  },
  {
    day: "Jul 15", at: "13:31:19", app: "goal-digger", kind: "invocation", status: "error",
    tool: "rebalance_plan", durationMs: 1380, thread: "thread_af92c1",
    summary: "InsufficientBalance: needs 1.9 ETH, holds 1.42",
    args: '{ "target": { "ETH": 0.6, "USDC": 0.4 }, "max_trades": 3 }',
    result: "InsufficientBalance: plan requires 1.9 ETH, wallet holds 1.42 ETH",
  },
  {
    day: "Jul 15", at: "11:20:07", app: "goal-digger", kind: "invocation", status: "error",
    tool: "swap_quote", durationMs: 640, thread: "thread_90ff21",
    summary: "InsufficientBalance: holds 3,201 USDC, order 50,000",
    args: '{ "token_in": "USDC", "token_out": "ETH", "amount": "50000", "slippage_bps": 20 }',
    result: "InsufficientBalance: wallet holds 3,201.40 USDC, order requires 50,000",
  },
  {
    day: "Jul 15", at: "10:05:40", app: "goal-digger", kind: "invocation", status: "ok",
    tool: "rebalance_plan", durationMs: 1210, thread: "thread_90ff21",
    summary: "2 trades · est gas 0.0011 ETH",
    args: '{ "target": { "ETH": 0.5, "USDC": 0.5 }, "max_trades": 2 }',
    result: '{ "trades": 2, "est_gas": "0.0011 ETH" }',
  },
  {
    day: "Jul 15", at: "09:14:52", app: "goal-digger", kind: "invocation", status: "ok",
    tool: "swap_quote", durationMs: 1104, thread: "thread_90ff21",
    summary: "USDC → ETH 3000 · out 0.8164",
    args: '{ "token_in": "USDC", "token_out": "ETH", "amount": "3000", "slippage_bps": 20 }',
    result: '{ "route": "uniswap_v3", "amount_out": "0.8164", "price_impact_bps": 4 }',
  },
  {
    day: "Jul 14", at: "17:12:30", app: "playground-example", kind: "event", status: "error",
    eventType: "sdk_upgrade", summary: "Stranded on SDK 3.0.1 — rebuild queued by auto-heal",
  },
];

const APPS = ["goal-digger", "geckoterminal", "playground-example"];
const TOOLS = ["get_price", "swap_quote", "portfolio_overview", "set_goal", "rebalance_plan"];

const SELECT_CLS =
  "border-border bg-surface text-foreground h-8 rounded-md border px-2 text-xs";

const DOT: Record<LogRecord["status"], string> = {
  ok: "bg-emerald-500",
  error: "bg-red-500",
  info: "bg-zinc-500",
};

function pretty(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function ExpandedDetail({ row }: { row: LogRecord }) {
  return (
    <div className="border-border bg-surface-subtle/60 grid gap-x-6 gap-y-2 border-t px-8 py-3 lg:grid-cols-2">
      <div>
        <div className="text-dim mb-1 text-[10px] uppercase tracking-wide">Arguments</div>
        <pre className="font-mono text-xs leading-5 whitespace-pre-wrap">{pretty(row.args ?? "")}</pre>
      </div>
      <div>
        <div className="text-dim mb-1 text-[10px] uppercase tracking-wide">
          {row.status === "error" ? "Error" : "Result"}
        </div>
        <pre
          className={`font-mono text-xs leading-5 whitespace-pre-wrap ${row.status === "error" ? "text-red-500" : ""}`}
        >
          {pretty(row.result ?? "")}
        </pre>
      </div>
      <div className="text-dim text-xs lg:col-span-2">
        {row.retries ? `${row.retries} retries · ` : ""}
        {row.thread} · {row.app}
      </div>
    </div>
  );
}

export function LogsMock({
  filter,
  onChange,
}: {
  filter: LogsFilter;
  onChange: (next: LogsFilter) => void;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const rows = RECORDS.map((row, idx) => ({ row, idx })).filter(({ row }) => {
    if (filter.app && row.app !== filter.app) return false;
    if (filter.tool && (row.kind !== "invocation" || row.tool !== filter.tool)) return false;
    if (filter.errorsOnly && row.status !== "error") return false;
    return true;
  });
  const active = filter.app || filter.tool || filter.errorsOnly;

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="border-border bg-surface-subtle flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
        <select
          value={filter.app ?? ""}
          onChange={(e) => onChange({ ...filter, app: e.target.value || null })}
          className={SELECT_CLS}
        >
          <option value="">All apps</option>
          {APPS.map((app) => (
            <option key={app} value={app}>{app}</option>
          ))}
        </select>
        <select
          value={filter.tool ?? ""}
          onChange={(e) => onChange({ ...filter, tool: e.target.value || null })}
          className={SELECT_CLS}
        >
          <option value="">All tools</option>
          {TOOLS.map((tool) => (
            <option key={tool} value={tool}>{tool}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onChange({ ...filter, errorsOnly: !filter.errorsOnly })}
          className={`rounded-full border px-2.5 py-1 text-xs ${
            filter.errorsOnly
              ? "border-red-500/30 bg-red-500/10 text-red-500"
              : "border-border bg-surface text-dim"
          }`}
        >
          errors only
        </button>
        {active ? (
          <button
            type="button"
            onClick={() => onChange(EMPTY_LOGS_FILTER)}
            className="text-dim hover:text-foreground flex items-center gap-1 text-xs"
          >
            <X className="size-3" /> clear filters
          </button>
        ) : null}
        <span className="text-dim ml-auto flex items-center gap-1.5 text-xs">
          <Lock className="size-3" />
          user messages and intents are never shown
        </span>
      </div>

      {/* Stream: one line per record, click to expand */}
      <div className="border-border overflow-hidden rounded-md border">
        {rows.map(({ row, idx }, position) => {
          const prev = position > 0 ? rows[position - 1].row : null;
          const showDay = !prev || prev.day !== row.day;
          const expandable = row.kind === "invocation";
          const open = openIdx === idx;
          return (
            <div key={idx}>
              {showDay ? (
                <div className="border-border bg-surface-subtle text-dim border-b px-3 py-1 text-[10px] tracking-wide uppercase">
                  {row.day}
                </div>
              ) : null}
              <div
                onClick={expandable ? () => setOpenIdx(open ? null : idx) : undefined}
                className={`border-border grid grid-cols-[8px_66px_150px_1fr] items-baseline gap-x-3 border-b px-3 py-1.5 font-mono text-xs last:border-b-0 sm:grid-cols-[8px_66px_150px_60px_1fr_110px] ${
                  expandable ? "hover:bg-surface-subtle cursor-pointer" : ""
                } ${open ? "bg-surface-subtle" : "bg-surface"}`}
              >
                <span className={`size-2 self-center rounded-full ${DOT[row.status]}`} />
                <span className="text-dim">{row.at}</span>
                <span className={row.kind === "event" ? "text-dim" : "text-foreground"}>
                  {row.kind === "invocation" ? row.tool : row.eventType}
                </span>
                <span className="text-dim hidden text-right sm:block">
                  {row.durationMs != null ? `${row.durationMs}ms` : ""}
                </span>
                <span
                  className={`min-w-0 truncate ${
                    row.status === "error" ? "text-red-500" : row.kind === "event" ? "text-dim" : "text-foreground"
                  }`}
                  title={row.summary}
                >
                  {row.retries ? `[retry ${row.retries}] ` : ""}
                  {row.summary}
                </span>
                <span className="text-dim hidden truncate text-right sm:block">{row.app}</span>
              </div>
              {open ? <ExpandedDetail row={row} /> : null}
            </div>
          );
        })}
        {!rows.length ? (
          <div className="text-dim bg-surface py-8 text-center text-sm">
            No records match these filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}
