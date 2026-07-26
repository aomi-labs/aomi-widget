"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { MonthlyStatement } from "./types";
import { useAccountOverview } from "@portal/lib/account-overview";
import { useUsageStatement } from "./use-usage-statement";
import { ArrowLeft, Check, ChevronDown, Loader2 } from "lucide-react";
import {
  AppGroup,
  MatrixTable,
  Meter,
  MODEL_COLS,
  formatPeriodRange,
  OutcomeTable,
  StatementSection,
  usd,
} from "./usage-shared";

type View = "byApp" | "itemized";
type Subject = "all" | "model" | "tool" | "onchain";

/** `"2026-07"` → `"Jul 2026"` for the month picker. */
function monthKeyShortLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const names = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${names[month - 1] ?? key} ${year}`;
}

const SUBJECTS: { id: Subject; label: string }[] = [
  { id: "all", label: "All" },
  { id: "model", label: "Models" },
  { id: "tool", label: "Tool calls" },
  { id: "onchain", label: "On-chain" },
];

/**
 * /statement — the full usage statement as its own page: month picker,
 * By app / Itemized views, and app + subject filters. Data is the live model
 * statement (`/api/account/statement`), one fetch per selected month; tool
 * and on-chain sections appear only when the ledger actually carries them.
 * Sums here are display-only aggregation of the rows being shown.
 */
export function StatementView() {
  const overview = useAccountOverview();
  const statement = useUsageStatement();
  const [view, setView] = useState<View>("byApp");
  const [appFilter, setAppFilter] = useState<string>("all");
  const [subject, setSubject] = useState<Subject>("all");

  const month = statement.month;

  const selectMonth = (key: string) => {
    statement.selectMonth(key);
    setAppFilter("all");
    setSubject("all");
  };

  if (!month) {
    return (
      <div className="h-screen overflow-y-auto">
        <div className="min-h-full bg-aomi-bg font-sans text-aomi-fg">
          <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
            <Link
              href="/"
              className="flex w-fit items-center gap-1.5 text-[13px] text-aomi-muted transition-colors hover:text-aomi-fg"
            >
              <ArrowLeft size={14} />
              Back to chat
            </Link>
            {statement.status === "error" ? (
              <p className="text-[13px] text-aomi-danger">
                {statement.error ?? "Couldn't load the statement."}{" "}
                <button
                  onClick={statement.retry}
                  className="underline underline-offset-2 hover:text-aomi-fg"
                >
                  Retry
                </button>
              </p>
            ) : (
              <p className="flex items-center gap-2 text-[13px] text-aomi-muted">
                <Loader2 size={14} className="animate-spin" />
                Loading statement…
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { period, summary, payment } = month;
  const identityLine = overview
    ? (overview.user.verified_email ?? overview.user.user_id)
    : "—";
  const identityKey = overview?.user.public_key;

  const over = payment.x402SettledUsd > 0;
  const showAllowance =
    statement.isCurrentMonth && payment.allowanceCredits.included > 0;
  const creditsPct = showAllowance
    ? Math.min(
        100,
        (payment.allowanceCredits.used / payment.allowanceCredits.included) * 100,
      )
    : 0;

  return (
    // The root layout pins html/body to the viewport with overflow:hidden, so
    // this page must own its scrolling — h-screen + overflow-y-auto, not
    // min-h-screen (which would clip everything below the fold).
    <div className="h-screen overflow-y-auto">
      <div className="min-h-full bg-aomi-bg font-sans text-aomi-fg">
        <div className="mx-auto flex max-w-4xl flex-col gap-7 px-6 py-8">
          {/* Header */}
          <header className="flex flex-col gap-5">
            <Link
              href="/"
              className="flex w-fit items-center gap-1.5 text-[13px] text-aomi-muted transition-colors hover:text-aomi-fg"
            >
              <ArrowLeft size={14} />
              Back to chat
            </Link>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="font-display text-3xl font-normal tracking-tight">
                  Usage statement
                </h1>
                <span className="text-[13px] text-aomi-muted">
                  {identityLine}
                  {identityKey && (
                    <>
                      {" · "}
                      <span className="font-mono">
                        {identityKey.slice(0, 6)}…{identityKey.slice(-4)}
                      </span>
                    </>
                  )}
                </span>
              </div>
              {/* Month picker */}
              <Dropdown
                value={statement.selectedKey}
                options={statement.monthKeys.map((key) => ({
                  id: key,
                  label: monthKeyShortLabel(key),
                }))}
                onChange={selectMonth}
              />
            </div>
          </header>

          {/* Subject tiles — a subject with no ledger rows shows "—" (absent),
              never $0.00 (a claim). */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatTile label="Total" value={usd(summary.totalUsd)} primary />
            <StatTile label="Models" value={usd(summary.modelUsd)} />
            <StatTile
              label="Tool calls"
              value={month.apps.some((a) => a.tool !== null) ? usd(summary.toolUsd) : "—"}
            />
            <StatTile
              label="On-chain fees"
              value={month.apps.some((a) => a.outcome !== null) ? usd(summary.onchainUsd) : "—"}
            />
          </div>

          {/* Payment strip — the credits meter reads the profile's live
              monthly position, so it only renders for the current month. */}
          <div className="flex flex-col gap-2.5 rounded-xl border border-aomi-border bg-aomi-bg px-4 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] text-aomi-muted">{formatPeriodRange(period)}</span>
              {showAllowance && (
                <span className="text-[13px] text-aomi-muted">
                  Credits {Math.round(payment.allowanceCredits.used)}/
                  {Math.round(payment.allowanceCredits.included)} · paid via{" "}
                  {payment.settledVia}
                </span>
              )}
            </div>
            {showAllowance && (
              <>
                <Meter pct={creditsPct} over={over} />
                <span className="text-[11px] text-aomi-muted">
                  {over
                    ? `${usd(payment.x402SettledUsd)} settled via x402 beyond your monthly allowance (${usd(
                        payment.allowanceAppliedUsd,
                      )} applied).`
                    : `Compute covered by your monthly allowance (${usd(
                        payment.allowanceAppliedUsd,
                      )} applied).`}
                </span>
              </>
            )}
          </div>

          {/* Controls: view toggle + filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-full border border-aomi-border bg-aomi-surface-2 p-[3px]">
              {(["byApp", "itemized"] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-full px-3.5 py-[5px] text-xs font-medium transition-colors ${
                    view === v
                      ? "bg-aomi-accent-strong text-aomi-on-accent"
                      : "text-aomi-muted hover:text-aomi-fg"
                  }`}
                >
                  {v === "byApp" ? "By app" : "Itemized"}
                </button>
              ))}
            </div>

            <Dropdown
              value={appFilter}
              options={[
                { id: "all", label: "All apps" },
                ...month.apps.map((app) => ({ id: app.id, label: app.name })),
              ]}
              onChange={setAppFilter}
            />
          </div>

          {view === "itemized" && (
            <div className="-mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] uppercase tracking-wide text-aomi-muted">Subject</span>
              {SUBJECTS.map((s) => (
                <FilterChip key={s.id} active={subject === s.id} onClick={() => setSubject(s.id)}>
                  {s.label}
                </FilterChip>
              ))}
            </div>
          )}

          {/* Content */}
          {view === "byApp" ? (
            <MatrixTable month={month} appId={appFilter} framed />
          ) : (
            <ItemizedContent month={month} appFilter={appFilter} subject={subject} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Itemized content with filters                                           */
/* ---------------------------------------------------------------------- */

function ItemizedContent({
  month,
  appFilter,
  subject,
}: {
  month: MonthlyStatement;
  appFilter: string;
  subject: Subject;
}) {
  const { summary, period } = month;

  const showModels = subject === "all" || subject === "model";
  const showTools = subject === "all" || subject === "tool";
  const showOnchain = subject === "all" || subject === "onchain";
  const filtersActive = appFilter !== "all" || subject !== "all";

  const visibleApps = month.apps.filter((a) => appFilter === "all" || a.id === appFilter);

  // Section A: apps that still have rows under the current subject filter.
  const computeApps = visibleApps.filter(
    (a) => (showModels && a.model.byModel.length > 0) || (showTools && a.tool !== null),
  );
  const sectionATotal = visibleApps.reduce(
    (s, a) =>
      s +
      (showModels ? a.model.chargedUsd : 0) +
      (showTools ? (a.tool?.chargedUsd ?? 0) : 0),
    0,
  );

  const outcomePairs = showOnchain
    ? visibleApps.flatMap((a) => (a.outcome?.items ?? []).map((item) => ({ app: a, item })))
    : [];
  const sectionBTotal = showOnchain
    ? visibleApps.reduce((s, a) => s + (a.outcome?.chargedUsd ?? 0), 0)
    : 0;

  const showSectionA = (showModels || showTools) && computeApps.length > 0;
  const showSectionB = showOnchain && outcomePairs.length > 0;

  if (!showSectionA && !showSectionB) {
    return (
      <div className="rounded-xl border border-aomi-border bg-aomi-surface px-4 py-10 text-center text-[13px] text-aomi-muted">
        No items match these filters.
      </div>
    );
  }

  // Footer recipients — only honest for the unfiltered month.
  const aomiTotal = month.apps.reduce(
    (s, a) => s + (a.native ? a.model.chargedUsd : a.settings.appByok ? 0 : a.model.baseUsd),
    0,
  );
  const appRecipients = month.apps
    .filter((a) => !a.native)
    .map((a) => ({
      name: a.name,
      amount: (a.tool?.chargedUsd ?? 0) + (a.outcome?.chargedUsd ?? 0),
    }))
    .filter((a) => a.amount > 0);

  return (
    <div className="flex flex-col gap-5">
      {showSectionA && (
        <StatementSection
          title="Compute · off-chain"
          subtitle="AI models + app tool calls, in credits"
          total={usd(sectionATotal)}
        >
          {showModels && (
            <div
              className={`grid ${MODEL_COLS} gap-2 border-b border-aomi-border bg-aomi-surface-2/30 px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-aomi-muted`}
            >
              <span>Model</span>
              <span>Detail</span>
              <span className="text-right">Turns</span>
              <span className="text-right">Base</span>
              <span className="text-right">Charged</span>
            </div>
          )}
          <div className="flex flex-col divide-y divide-aomi-border">
            {computeApps.map((app) => (
              <AppGroup key={app.id} app={app} showModels={showModels} showTools={showTools} />
            ))}
          </div>
        </StatementSection>
      )}

      {showSectionB && (
        <StatementSection
          title="On-chain fees"
          subtitle="paid in the flowed token, on your own transactions"
          total={usd(sectionBTotal)}
        >
          <OutcomeTable pairs={outcomePairs} />
        </StatementSection>
      )}

      {/* Total for what's displayed */}
      <div className="flex items-center justify-between rounded-xl border border-aomi-border bg-aomi-surface px-4 py-3.5">
        <span className="text-sm font-semibold">
          {filtersActive ? "Filtered total" : `Total · ${period.periodLabel}`}
        </span>
        <span className="font-mono text-base font-semibold">
          {usd(filtersActive ? sectionATotal + sectionBTotal : summary.totalUsd)}
        </span>
      </div>

      {/* Where your money went — whole-month rollup, hidden while filtered */}
      {!filtersActive && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-aomi-border bg-aomi-surface p-4">
          <span className="text-[13px] font-semibold">Where your money went</span>
          <div className="flex flex-col gap-2 text-[13px]">
            <div className="flex items-center justify-between">
              <span>Aomi — model compute on managed/native</span>
              <span className="font-mono">{usd(aomiTotal)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span>The apps — tool + outcome fees</span>
              <div className="flex flex-col gap-1 border-l border-aomi-border pl-3">
                {appRecipients.map((a) => (
                  <div key={a.name} className="flex items-center justify-between text-aomi-muted">
                    <span>{a.name}</span>
                    <span className="font-mono text-aomi-fg">{usd(a.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-aomi-muted">
              <span>Your model provider</span>
              <span>— (would show for BYOK)</span>
            </div>
          </div>
          <span className="text-[11px] text-aomi-muted">
            These tool and outcome fees also appear on the apps&apos; own builder statements as
            Aomi&apos;s take.
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Bits                                                                    */
/* ---------------------------------------------------------------------- */

function StatTile({
  label,
  value,
  primary,
}: {
  label: string;
  value: string;
  primary?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-aomi-border bg-aomi-surface px-4 py-3.5">
      <span className="text-[11px] text-aomi-muted">{label}</span>
      <span className={`font-mono font-semibold ${primary ? "text-xl" : "text-lg"}`}>{value}</span>
    </div>
  );
}

function Dropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-aomi-border px-3.5 py-[7px] text-xs font-medium text-aomi-fg transition-colors hover:bg-aomi-surface-2/60"
      >
        {current?.label}
        <ChevronDown
          size={12}
          className={`text-aomi-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          {/* click-away backdrop */}
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 cursor-default"
          />
          <div className="absolute right-0 top-full z-30 mt-1.5 min-w-[160px] overflow-hidden rounded-xl border border-aomi-overlay-border bg-aomi-raised p-1">
            {options.map((o) => {
              const selected = o.id === value;
              return (
                <button
                  key={o.id}
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 min-h-8 rounded-lg px-2.5 text-left text-xs transition-colors hover:bg-aomi-hover ${
                    selected ? "bg-aomi-accent-subtle font-medium text-aomi-fg" : "text-aomi-muted"
                  }`}
                >
                  {o.label}
                  {selected && <Check size={13} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-[5px] text-xs transition-colors ${
        active
          ? "border-transparent bg-aomi-accent-strong font-medium text-aomi-on-accent"
          : "border-aomi-border bg-aomi-surface-2 text-aomi-muted hover:text-aomi-fg"
      }`}
    >
      {children}
    </button>
  );
}
