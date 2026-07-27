"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useUsageStatement } from "./use-usage-statement";
import { MatrixTable, Meter, usd } from "./usage-shared";

/**
 * Settings › Usage — the compact popup view: the subject summary with the
 * by-app matrix directly under it, rendered from the live model statement
 * (`/api/account/statement`). Tool and on-chain subjects show "—" until their
 * ledger writers exist — absent, not zero. The itemized full statement lives
 * on its own page at /statement.
 */
export function UsageSettings() {
  const statement = useUsageStatement();
  const month = statement.month;

  if (!month) {
    return (
      <div className="flex-1 overflow-y-auto px-[22px] py-5">
        {statement.status === "error" ? (
          <p className="text-[13px] text-aomi-danger">
            {statement.error ?? "Couldn't load usage."}
            <button
              onClick={statement.retry}
              className="ml-2 underline underline-offset-2 hover:text-aomi-fg"
            >
              Retry
            </button>
          </p>
        ) : (
          <p className="flex items-center gap-2 text-[13px] text-aomi-muted">
            <Loader2 size={14} className="animate-spin" />
            Loading usage…
          </p>
        )}
      </div>
    );
  }

  const { period, summary, payment } = month;
  const turns = month.apps.reduce((s, a) => s + a.model.turns, 0);
  // These subjects have no ledger writer yet — absent (—), never $0.00.
  const hasToolData = month.apps.some((a) => a.tool !== null);
  const hasOutcomeData = month.apps.some((a) => a.outcome !== null);

  const over = payment.x402SettledUsd > 0;
  const hasAllowance = payment.allowanceCredits.included > 0;
  const creditsPct = hasAllowance
    ? Math.min(
        100,
        (payment.allowanceCredits.used / payment.allowanceCredits.included) * 100,
      )
    : 0;

  return (
    <div className="flex-1 overflow-y-auto px-[22px] py-5">
      <div className="flex flex-col gap-7">
        {/* Summary card */}
        <div className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-aomi-border p-4">
            <span className="text-sm font-semibold">Usage</span>
            <span className="text-[13px] text-aomi-muted">{period.periodLabel}</span>
          </div>

          <div className="flex flex-col gap-3 p-4">
            <SummaryRow label="Models" detail={`${turns} turns`} amount={usd(summary.modelUsd)} />
            <SummaryRow
              label="Tool calls"
              detail={hasToolData ? "" : "no charges"}
              amount={hasToolData ? usd(summary.toolUsd) : "—"}
            />
            <SummaryRow
              label="On-chain fees"
              detail={hasOutcomeData ? "" : "no charges"}
              amount={hasOutcomeData ? usd(summary.onchainUsd) : "—"}
            />
            <div className="mt-1 flex items-center justify-between border-t border-aomi-border pt-3">
              <span className="text-sm font-semibold">Total</span>
              <span className="font-mono text-base font-semibold">{usd(summary.totalUsd)}</span>
            </div>
          </div>

          {/* Allowance position comes from the profile's monthly stats, so it's
              only exact for the current month — hidden elsewhere. */}
          {statement.isCurrentMonth && hasAllowance && (
            <div className="flex flex-col gap-2 border-t border-aomi-border p-4">
              <span className="text-[13px] text-aomi-muted">
                Credits {Math.round(payment.allowanceCredits.used)}/
                {Math.round(payment.allowanceCredits.included)} · paid via{" "}
                {payment.settledVia}
              </span>
              <Meter pct={creditsPct} over={over} />
              {over && (
                <span className="text-[11px] text-aomi-muted">
                  {usd(payment.x402SettledUsd)} settled via x402 beyond your
                  monthly allowance.
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-end border-t border-aomi-border p-4">
            <Link
              href="/statement"
              className="text-[13px] font-medium text-aomi-accent transition-opacity hover:opacity-80"
            >
              View full statement →
            </Link>
          </div>
        </div>

        {/* By app — frameless, right under the summary */}
        {month.apps.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">By app</span>
              <span className="text-[11px] text-aomi-muted">
                hover a value for the count behind it
              </span>
            </div>
            <MatrixTable month={month} />
          </div>
        ) : (
          <p className="text-[13px] text-aomi-muted">
            No usage this month yet.
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, detail, amount }: { label: string; detail: string; amount: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm">{label}</span>
        {detail && <span className="text-[11px] text-aomi-muted">{detail}</span>}
      </div>
      <span className="font-mono text-sm">{amount}</span>
    </div>
  );
}
