"use client";

// Dense log viewer: one line per record, click to expand. Handles both
// record kinds — invocation traces (tool, args, result, duration) and
// control-plane events. The backend combines both record types on this
// surface. Privacy: user intents never reach it; args/results are operational
// payloads.

import { Lock, X } from "lucide-react";
import { clockLabel, dayLabel } from "./format";

type LogRow = Record<string, any>;

export type LogsPageFilter = {
  app: string | null;
  tool: string | null;
  errorsOnly: boolean;
};

export const EMPTY_LOGS_PAGE_FILTER: LogsPageFilter = {
  app: null,
  tool: null,
  errorsOnly: false,
};

const SELECT_CLS = "border-border bg-surface text-foreground h-8 rounded-md border px-2 text-xs";

const DOT: Record<string, string> = {
  ok: "bg-emerald-500",
  error: "bg-red-500",
  info: "bg-zinc-500",
};

function statusOf(row: LogRow): "ok" | "error" | "info" {
  if (row.status === "ok" || row.status === "error" || row.status === "info") return row.status;
  return /error|failed|revert/i.test(String(row.eventType ?? "")) ? "error" : "info";
}

function isInvocation(row: LogRow): boolean {
  return row.kind === "invocation" || (row.tool != null && row.args != null);
}

function pretty(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function ExpandedDetail({ row }: { row: LogRow }) {
  const status = statusOf(row);
  return (
    <div className="border-border bg-surface-subtle/60 grid gap-x-6 gap-y-2 border-t px-8 py-3 lg:grid-cols-2">
      <div>
        <div className="text-dim mb-1 text-[10px] uppercase tracking-wide">Arguments</div>
        <pre className="font-mono text-xs leading-5 whitespace-pre-wrap">{pretty(String(row.args ?? ""))}</pre>
      </div>
      <div>
        <div className="text-dim mb-1 text-[10px] uppercase tracking-wide">
          {status === "error" ? "Error" : "Result"}
        </div>
        <pre className={`font-mono text-xs leading-5 whitespace-pre-wrap ${status === "error" ? "text-red-500" : ""}`}>
          {pretty(String(row.result ?? ""))}
        </pre>
      </div>
      <div className="text-dim text-xs lg:col-span-2">
        {row.retries ? `${row.retries} retries · ` : ""}
        {row.threadId ? `${row.threadId} · ` : ""}
        {row.application}
      </div>
    </div>
  );
}

export function LogRows({
  rows,
  apps,
  tools,
  filter,
  onFilterChange,
  openId,
  onToggle,
}: {
  rows: LogRow[];
  apps: string[];
  tools: string[];
  filter: LogsPageFilter;
  onFilterChange: (next: LogsPageFilter) => void;
  openId: string | null;
  onToggle: (id: string | null) => void;
}) {
  const visible = rows.filter((row) => {
    if (filter.app && row.application !== filter.app) return false;
    if (filter.tool && (!isInvocation(row) || row.tool !== filter.tool)) return false;
    if (filter.errorsOnly && statusOf(row) !== "error") return false;
    return true;
  });
  const active = filter.app || filter.tool || filter.errorsOnly;

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="border-border bg-surface-subtle flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
        <select
          value={filter.app ?? ""}
          onChange={(event) => onFilterChange({ ...filter, app: event.target.value || null })}
          className={SELECT_CLS}
        >
          <option value="">All apps</option>
          {apps.map((app) => (
            <option key={app} value={app}>{app}</option>
          ))}
        </select>
        {tools.length ? (
          <select
            value={filter.tool ?? ""}
            onChange={(event) => onFilterChange({ ...filter, tool: event.target.value || null })}
            className={SELECT_CLS}
          >
            <option value="">All tools</option>
            {tools.map((tool) => (
              <option key={tool} value={tool}>{tool}</option>
            ))}
          </select>
        ) : null}
        <button
          type="button"
          onClick={() => onFilterChange({ ...filter, errorsOnly: !filter.errorsOnly })}
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
            onClick={() => onFilterChange(EMPTY_LOGS_PAGE_FILTER)}
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

      {/* Stream: one line per record */}
      <div className="border-border overflow-hidden rounded-md border">
        {visible.map((row, position) => {
          const rowId = `${row.eventType ?? "invocation"}-${row.id}`;
          const prev = position > 0 ? visible[position - 1] : null;
          const day = dayLabel(row.occurredAt);
          const showDay = !prev || dayLabel(prev.occurredAt) !== day;
          const expandable = isInvocation(row);
          const open = openId === rowId;
          const status = statusOf(row);
          return (
            <div key={rowId}>
              {showDay && day ? (
                <div className="border-border bg-surface-subtle text-dim border-b px-3 py-1 text-[10px] tracking-wide uppercase">
                  {day}
                </div>
              ) : null}
              <div
                onClick={expandable ? () => onToggle(open ? null : rowId) : undefined}
                className={`border-border grid grid-cols-[8px_66px_150px_1fr] items-baseline gap-x-3 border-b px-3 py-1.5 font-mono text-xs last:border-b-0 sm:grid-cols-[8px_66px_150px_60px_1fr_110px] ${
                  expandable ? "hover:bg-surface-subtle cursor-pointer" : ""
                } ${open ? "bg-surface-subtle" : "bg-surface"}`}
              >
                <span className={`size-2 self-center rounded-full ${DOT[status]}`} />
                <span className="text-dim">{clockLabel(row.occurredAt)}</span>
                <span className={expandable ? "text-foreground" : "text-dim"}>
                  {expandable ? row.tool : row.eventType}
                </span>
                <span className="text-dim hidden text-right sm:block">
                  {row.durationMs != null ? `${row.durationMs}ms` : ""}
                </span>
                <span
                  className={`min-w-0 truncate ${
                    status === "error" ? "text-red-500" : expandable ? "text-foreground" : "text-dim"
                  }`}
                  title={String(row.summary ?? "")}
                >
                  {row.retries ? `[retry ${row.retries}] ` : ""}
                  {row.summary}
                </span>
                <span className="text-dim hidden truncate text-right sm:block">{row.application}</span>
              </div>
              {open ? <ExpandedDetail row={row} /> : null}
            </div>
          );
        })}
        {!visible.length ? (
          <div className="text-dim bg-surface py-8 text-center text-sm">
            No records match these filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}
