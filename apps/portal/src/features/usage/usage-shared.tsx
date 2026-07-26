"use client";

import type { ReactNode } from "react";
import type {
  AppModelRow,
  AppOutcomeItem,
  AppToolItem,
  AppUsageEntry,
  MonthlyStatement,
  UsagePeriod,
} from "./types";
import { ExternalLink } from "lucide-react";

/* ---------------------------------------------------------------------- */
/* Formatting                                                              */
/* ---------------------------------------------------------------------- */

export function usd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function formatTokens(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(n);
}

const MODEL_NAMES: Record<string, string> = {
  "claude-opus-4-8": "Opus 4.8",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5": "Haiku 4.5",
};

export function modelName(id: string): string {
  return MODEL_NAMES[id] ?? id;
}

export function truncateHex(value: string): string {
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function parseYMD(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}

export function formatShortDate(s: string): string {
  const { m, d } = parseYMD(s);
  return `${MONTHS[m - 1]} ${d}`;
}

export function formatPeriodRange(period: UsagePeriod): string {
  const from = parseYMD(period.from);
  const to = parseYMD(period.to);
  const issued = parseYMD(period.issued);
  const issuedStr = `${MONTHS[issued.m - 1]} ${issued.d}`;
  const range =
    from.y === to.y && from.m === to.m
      ? `${MONTHS[from.m - 1]} ${from.d}–${to.d}, ${to.y}`
      : `${MONTHS[from.m - 1]} ${from.d} – ${MONTHS[to.m - 1]} ${to.d}, ${to.y}`;
  return `${range} · issued ${issuedStr}`;
}

/** "Jul 2026" — compact month-pill label. */
export function monthShortLabel(period: UsagePeriod): string {
  const { y, m } = parseYMD(period.from);
  return `${MONTHS[m - 1]} ${y}`;
}

/** `byApp[].app` uses id-style keys for some apps ("default") and
 * name-style for others ("foo app") — match against either. */
export function findAppEntry(
  month: MonthlyStatement,
  key: string,
): AppUsageEntry | undefined {
  const norm = key.trim().toLowerCase();
  return month.apps.find(
    (a) => a.id === key || a.id.toLowerCase() === norm || a.name.toLowerCase() === norm,
  );
}

/* ---------------------------------------------------------------------- */
/* By-app matrix (frameless)                                               */
/* ---------------------------------------------------------------------- */

const MATRIX_COLS = "grid-cols-[1fr_96px_96px_96px_96px]";

export function MatrixTable({
  month,
  appId,
  framed = false,
}: {
  month: MonthlyStatement;
  /** When set (and not "all"), show only that app's row and hide the total. */
  appId?: string;
  /** Render as a self-contained bordered table (the statement page). */
  framed?: boolean;
}) {
  const showTotal = !appId || appId === "all";
  const rows = month.byApp.filter(
    (r) => showTotal || findAppEntry(month, r.app)?.id === appId,
  );

  // Framed: the table *is* the card — the header and total fills are clipped by
  // the rounded border, so the corners resolve instead of floating in a padded box.
  const pad = framed ? "px-4" : "";

  return (
    <div
      className={
        framed ? "overflow-hidden rounded-xl border border-aomi-border" : ""
      }
    >
      <div className="overflow-x-auto">
        <div className="min-w-[540px]">
          <div
            className={`grid ${MATRIX_COLS} items-center gap-2 border-b border-aomi-border text-[10px] font-medium uppercase tracking-wide text-aomi-muted ${pad} ${
              framed ? "bg-aomi-surface py-2.5" : "pb-2"
            }`}
          >
            <span>App</span>
            <span className="text-right">model</span>
            <span className="text-right">tool use</span>
            <span className="text-right">outcome</span>
            <span className="text-right">total</span>
          </div>

          <div className="flex flex-col divide-y divide-aomi-border">
            {rows.map((row) => {
              const entry = findAppEntry(month, row.app);
              const txns = entry?.outcome?.txns ?? 0;
              return (
                <div
                  key={row.app}
                  className={`grid ${MATRIX_COLS} items-center gap-2 py-3 ${pad} ${
                    framed ? "transition-colors hover:bg-aomi-surface/70" : ""
                  }`}
                >
                  <span className="truncate text-[13px]">{row.app}</span>
                  <MatrixCell
                    value={row.modelUsd}
                    tooltip={entry ? `${entry.model.turns} turns` : undefined}
                    chip={entry?.settings.appByok ? "app key" : undefined}
                  />
                  <MatrixCell
                    value={row.toolUsd}
                    tooltip={entry?.tool ? `${entry.tool.calls} calls` : undefined}
                  />
                  <MatrixCell
                    value={row.outcomeUsd}
                    tooltip={
                      entry?.outcome
                        ? `${txns} transaction${txns === 1 ? "" : "s"} · ${entry.outcome.items[0]?.bps ?? 0} bps`
                        : undefined
                    }
                  />
                  <span className="text-right font-mono text-[13px] font-semibold">
                    {usd(row.totalUsd)}
                  </span>
                </div>
              );
            })}
          </div>

          {showTotal && (
            <div
              className={`grid ${MATRIX_COLS} items-center gap-2 border-t border-aomi-border py-3 ${pad} ${
                framed ? "bg-aomi-surface" : ""
              }`}
            >
              <span className="text-[13px] font-semibold">Total</span>
              <span className="text-right font-mono text-[13px] font-semibold">
                {usd(month.columnTotals.modelUsd)}
              </span>
              <span className="text-right font-mono text-[13px] font-semibold">
                {usd(month.columnTotals.toolUsd)}
              </span>
              <span className="text-right font-mono text-[13px] font-semibold">
                {usd(month.columnTotals.outcomeUsd)}
              </span>
              <span className="text-right font-mono text-[13px] font-semibold">
                {usd(month.columnTotals.totalUsd)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MatrixCell({
  value,
  tooltip,
  chip,
}: {
  value: number | null;
  tooltip?: string;
  chip?: string;
}) {
  if (value === null) {
    return <span className="text-right text-[13px] text-aomi-muted">—</span>;
  }
  return (
    <div className="group relative flex justify-end">
      <span className="flex items-center gap-1.5 text-right font-mono text-[13px]">
        {usd(value)}
        {chip && (
          <span className="whitespace-nowrap rounded-full border border-aomi-border bg-aomi-surface-2 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-aomi-muted">
            {chip}
          </span>
        )}
      </span>
      {tooltip && (
        <span className="pointer-events-none absolute bottom-full right-0 z-20 mb-1.5 hidden whitespace-nowrap rounded-lg border border-aomi-overlay-border bg-aomi-surface-2 px-2.5 py-1.5 text-[11px] text-aomi-fg group-hover:block">
          {tooltip}
        </span>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Itemized building blocks                                                */
/* ---------------------------------------------------------------------- */

export const MODEL_COLS = "grid-cols-[1fr_140px_60px_90px_120px]";
export const OUTCOME_COLS =
  "grid-cols-[60px_minmax(160px,1fr)_90px_70px_150px_90px_140px]";

export function StatementSection({
  title,
  subtitle,
  total,
  children,
}: {
  title: string;
  subtitle: string;
  total: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-aomi-border bg-aomi-bg/40">
      <div className="flex items-center justify-between border-b border-aomi-border px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold">{title}</span>
          <span className="text-[11px] text-aomi-muted">{subtitle}</span>
        </div>
        <span className="font-mono text-[13px] font-semibold">{total}</span>
      </div>
      {children}
    </div>
  );
}

export function AppGroup({
  app,
  showModels = true,
  showTools = true,
}: {
  app: AppUsageEntry;
  showModels?: boolean;
  showTools?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 bg-aomi-surface-2/40 px-4 py-2">
        <span className="text-[13px] font-semibold">{app.name}</span>
        <SettingsChip app={app} />
      </div>
      <div className="flex flex-col divide-y divide-aomi-border">
        {showModels &&
          app.model.byModel.map((row) => (
            <ModelRow key={row.model} app={app} row={row} />
          ))}
        {showTools && app.tool && (
          <>
            <div className="bg-aomi-surface-2/20 px-4 py-1.5 text-[10px] font-medium uppercase tracking-wide text-aomi-muted">
              Tool calls
            </div>
            {app.tool.items.map((item) => (
              <ToolRow key={item.tool} item={item} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export function SettingsChip({ app }: { app: AppUsageEntry }) {
  if (app.native) return <Chip>native · base</Chip>;
  if (app.settings.appByok) return <Chip>app key · model free</Chip>;
  return <Chip accent>{`managed · +${app.settings.managedMarkupPct}%`}</Chip>;
}

export function Chip({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        accent ? "border-aomi-accent-outline bg-aomi-accent-tint text-aomi-accent" : "border-aomi-border bg-aomi-surface-2 text-aomi-muted"
      }`}
    >
      {children}
    </span>
  );
}

export function ModelRow({ app, row }: { app: AppUsageEntry; row: AppModelRow }) {
  const isByok = app.settings.appByok;
  const hasMarkup = !isByok && row.baseUsd !== row.chargedUsd;

  return (
    <>
      <div className={`grid ${MODEL_COLS} items-center gap-2 px-4 py-2.5`}>
        <span className="text-[13px]">{modelName(row.model)}</span>
        <span className="font-mono text-[11px] text-aomi-muted">
          in {formatTokens(row.inputTokens)} · out {formatTokens(row.outputTokens)}
        </span>
        <span className="text-right font-mono text-[13px] text-aomi-muted">{row.turns}</span>
        <span className={`text-right font-mono text-[13px] ${isByok ? "text-aomi-muted" : ""}`}>
          {usd(row.baseUsd)}
        </span>
        <span className="flex items-center justify-end gap-1.5">
          {isByok ? (
            <span className="text-[13px] text-aomi-success">free</span>
          ) : (
            <>
              <span className="font-mono text-[13px] font-medium">{usd(row.chargedUsd)}</span>
              {hasMarkup && <Chip accent>{`+${app.settings.managedMarkupPct}%`}</Chip>}
            </>
          )}
        </span>
      </div>
      {isByok && row.note && (
        <div className="-mt-1.5 px-4 pb-2 text-[11px] text-aomi-muted">{row.note}</div>
      )}
    </>
  );
}

export function ToolRow({ item }: { item: AppToolItem }) {
  return (
    <div className="grid grid-cols-[1fr_80px_80px_90px] items-center gap-2 px-4 py-2.5">
      <span className="font-mono text-[13px]">{item.tool}</span>
      <span className="text-right text-[13px] text-aomi-muted">{item.calls} calls</span>
      <span className="text-right text-[13px] text-aomi-muted">{item.unitCredits} cr</span>
      <span className="text-right font-mono text-[13px]">{usd(item.usd)}</span>
    </div>
  );
}

export function OutcomeTable({
  pairs,
}: {
  pairs: { app: AppUsageEntry; item: AppOutcomeItem }[];
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px] divide-y divide-aomi-border">
        <div
          className={`grid ${OUTCOME_COLS} gap-2 border-b border-aomi-border bg-aomi-surface-2/30 px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-aomi-muted`}
        >
          <span>Date</span>
          <span>App · action</span>
          <span className="text-right">Flow</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Fee</span>
          <span className="text-right">Chain</span>
          <span className="text-right">Tx</span>
        </div>
        {pairs.map(({ app, item }, i) => (
          <div
            key={`${app.id}-${i}`}
            className={`grid ${OUTCOME_COLS} items-center gap-2 px-4 py-2.5`}
          >
            <span className="text-[13px] text-aomi-muted">{formatShortDate(item.date)}</span>
            <span className="truncate text-[13px]">
              {app.name} · {item.action}
            </span>
            <span className="text-right font-mono text-[13px]">{item.flow}</span>
            <span className="text-right text-[13px] text-aomi-muted">{item.bps} bps</span>
            <span className="text-right font-mono text-[13px]">
              {item.feeToken}
              <span className="block text-[11px] text-aomi-muted">{usd(item.usd)}</span>
            </span>
            <span className="justify-self-end rounded-lg border border-aomi-border bg-aomi-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-aomi-muted">
              {item.chain}
            </span>
            <span className="flex items-center justify-end gap-1 font-mono text-[11px] text-aomi-accent">
              {truncateHex(item.tx)}
              <ExternalLink size={11} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Meter                                                                   */
/* ---------------------------------------------------------------------- */

export function Meter({ pct, over }: { pct: number; over?: boolean }) {
  // Flat fills (aomi reads flat): sky accent normally, pink once over allowance.
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-aomi-surface-2">
      <div
        className={`h-full rounded-full ${over ? "bg-aomi-pink" : "bg-aomi-accent"}`}
        style={{ width: `${Math.max(pct, 2)}%` }}
      />
    </div>
  );
}
