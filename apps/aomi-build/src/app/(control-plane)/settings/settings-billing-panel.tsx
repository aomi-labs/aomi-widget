import Link from "next/link";
import { ArrowRight, Gauge, KeyRound } from "lucide-react";

/**
 * Phase A honesty panel: Billing is not wired for invoices yet.
 * Teach the map — Usage = meter, Environment = keys — without fake chrome.
 */
export function SettingsBillingPanel() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <div className="text-sm font-medium text-foreground">
          Billing is not connected yet
        </div>
        <p className="mt-2 text-[13px] leading-5 text-dim">
          Plans, invoices, balance, and spend caps will live here when the
          account billing backend is wired. This page is not a secret vault and
          does not show live invoices today.
        </p>
        <p className="mt-3 text-[13px] leading-5 text-dim">
          <span className="text-foreground font-medium">Credits today:</span>{" "}
          see what your apps already spent under Operate → Usage. That meter is
          platform LLM/token usage — not partner tool fees (those settle in
          chat when priced tools exist).
        </p>
        <p className="mt-3 text-[13px] leading-5 text-dim">
          <span className="text-foreground font-medium">API keys:</span> builders
          set those on each project&apos;s Environment tab (Account → Secrets
          routes you there). Chat users never paste keys.
        </p>
      </div>

      <ul className="divide-border overflow-hidden rounded-lg border border-border bg-surface-1 divide-y">
        <li>
          <Link
            href="/operate/usage"
            className="hover:bg-accent-hover flex items-center justify-between gap-3 px-4 py-3 transition"
          >
            <div className="flex min-w-0 items-start gap-3">
              <Gauge className="text-dim mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="min-w-0">
                <div className="text-foreground text-sm font-medium">
                  Operate → Usage
                </div>
                <div className="text-dim mt-0.5 text-xs">
                  Credits and token totals by app and day
                </div>
              </div>
            </div>
            <ArrowRight className="text-dim size-4 shrink-0" aria-hidden />
          </Link>
        </li>
        <li>
          <Link
            href="/settings/secrets"
            className="hover:bg-accent-hover flex items-center justify-between gap-3 px-4 py-3 transition"
          >
            <div className="flex min-w-0 items-start gap-3">
              <KeyRound
                className="text-dim mt-0.5 size-4 shrink-0"
                aria-hidden
              />
              <div className="min-w-0">
                <div className="text-foreground text-sm font-medium">
                  Account → Secrets → Environment
                </div>
                <div className="text-dim mt-0.5 text-xs">
                  Builder API keys live on the project, not here
                </div>
              </div>
            </div>
            <ArrowRight className="text-dim size-4 shrink-0" aria-hidden />
          </Link>
        </li>
      </ul>
    </div>
  );
}
