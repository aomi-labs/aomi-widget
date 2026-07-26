"use client";

import Link from "next/link";
import { usageFixture } from "./fixture";
import { MatrixTable, Meter, usd } from "./usage-shared";

/**
 * Settings › Usage — the compact popup view: the three-subject summary with
 * the by-app matrix directly under it. The itemized full statement lives on
 * its own page at /statement.
 */
export function UsageSettings() {
  // Newest month is the live one.
  const month = usageFixture.months[0];
  const { period, summary, payment } = month;

  const turns = month.apps.reduce((s, a) => s + a.model.turns, 0);
  const toolCalls = month.apps.reduce((s, a) => s + (a.tool?.calls ?? 0), 0);
  const txns = month.apps.reduce((s, a) => s + (a.outcome?.txns ?? 0), 0);

  const over = payment.x402SettledUsd > 0;
  const creditsPct = Math.min(
    100,
    (payment.allowanceCredits.used / payment.allowanceCredits.included) * 100,
  );

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
            <SummaryRow label="Tool calls" detail={`${toolCalls} calls`} amount={usd(summary.toolUsd)} />
            <SummaryRow
              label="On-chain fees"
              detail={`${txns} transactions`}
              amount={usd(summary.onchainUsd)}
            />
            <div className="mt-1 flex items-center justify-between border-t border-aomi-border pt-3">
              <span className="text-sm font-semibold">Total</span>
              <span className="font-mono text-base font-semibold">{usd(summary.totalUsd)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-aomi-border p-4">
            <span className="text-[13px] text-aomi-muted">
              Credits {payment.allowanceCredits.used}/{payment.allowanceCredits.included} · paid via{" "}
              {payment.settledVia}
            </span>
            <Meter pct={creditsPct} over={over} />
            {over && (
              <span className="text-[11px] text-aomi-muted">
                {usd(payment.x402SettledUsd)} billed via x402 beyond your{" "}
                {usd(payment.allowanceAppliedUsd)} monthly allowance.
              </span>
            )}
          </div>

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
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">By app</span>
            <span className="text-[11px] text-aomi-muted">
              hover a value for the count behind it
            </span>
          </div>
          <MatrixTable month={month} />
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, detail, amount }: { label: string; detail: string; amount: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm">{label}</span>
        <span className="text-[11px] text-aomi-muted">{detail}</span>
      </div>
      <span className="font-mono text-sm">{amount}</span>
    </div>
  );
}
