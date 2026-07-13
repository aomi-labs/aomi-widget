import Link from "next/link";
import { ArrowRight, Gauge, KeyRound, MessageSquare } from "lucide-react";

import { resolveChatUrl } from "@build/lib/chat-url";

/**
 * Honest Billing panel: teach the map without fake methods or invoices.
 *
 * `GET /api/account/payment` exists on the backend but Build is GitHub-session
 * only today (no AccountBearer / BetterAuth bridge), so we do not fetch it.
 */
export function SettingsBillingPanel() {
  const chatUrl = resolveChatUrl();

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <div className="text-sm font-medium text-foreground">
          Payment methods
        </div>
        <p className="mt-2 text-[13px] leading-5 text-dim">
          BYOK and Tempo stream status live on your{" "}
          <span className="text-foreground font-medium">Chat account</span>,
          not in Build. Build uses GitHub for deploy/operate; it does not yet
          share the Chat account session needed to read payment methods here.
        </p>
        <p className="mt-3 text-[13px] leading-5 text-dim">
          Manage BYOK / Tempo in Chat when signed in. This page will not invent
          a second methods store.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <div className="text-sm font-medium text-foreground">
          Not available yet
        </div>
        <p className="mt-2 text-[13px] leading-5 text-dim">
          Balance, invoices, spend caps, and partner fee history will land here
          when Account billing is wired into Build. This is not a secret vault
          and does not show live invoices today.
        </p>
        <p className="mt-3 text-[13px] leading-5 text-dim">
          <span className="text-foreground font-medium">Credits today:</span>{" "}
          Operate → Usage meters platform LLM/token spend — not partner tool
          fees (those settle in chat when priced tools run).
        </p>
        <p className="mt-3 text-[13px] leading-5 text-dim">
          <span className="text-foreground font-medium">API keys:</span>{" "}
          builders set those on each project&apos;s Environment tab (Account →
          Secrets routes you there). Chat users never paste keys.
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
        <li>
          <a
            href={chatUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:bg-accent-hover flex items-center justify-between gap-3 px-4 py-3 transition"
          >
            <div className="flex min-w-0 items-start gap-3">
              <MessageSquare
                className="text-dim mt-0.5 size-4 shrink-0"
                aria-hidden
              />
              <div className="min-w-0">
                <div className="text-foreground text-sm font-medium">
                  Open Chat
                </div>
                <div className="text-dim mt-0.5 text-xs">
                  Sign in there to manage BYOK / Tempo and settle payments
                </div>
              </div>
            </div>
            <ArrowRight className="text-dim size-4 shrink-0" aria-hidden />
          </a>
        </li>
      </ul>
    </div>
  );
}
