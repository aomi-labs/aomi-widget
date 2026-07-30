"use client";

import { Bot, Check, ExternalLink, MessageCircle, Plug } from "lucide-react";
import { useGitHubSession } from "@build/components/control-plane/github-session-context";
import {
  GitHubSignInPanel,
  LoadingPanel,
} from "@build/features/launch/components/deployments/ui/state-panels";
import { BotsView } from "@build/features/operate/bots-view";

export function IntegrationsView() {
  const { account } = useGitHubSession();

  if (account.loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <LoadingPanel label="Checking GitHub session..." />
      </div>
    );
  }

  if (!account.signedIn) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <GitHubSignInPanel error={null} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <p className="text-dim text-[12px] uppercase tracking-wide">Account</p>
        <div className="flex items-center gap-2">
          <Plug className="text-dim size-5" />
          <h1 className="font-display text-foreground text-2xl font-normal tracking-tight">
            Integrations
          </h1>
        </div>
        <p className="text-subtle max-w-2xl text-sm">
          Connect the channels where your users already work. Each integration
          is configured once and can be attached to one or more Aomi apps.
        </p>
      </div>

      <section aria-labelledby="telegram-heading" className="space-y-5">
        <div className="border-border bg-surface-subtle flex flex-col justify-between gap-4 rounded-xl border p-5 sm:flex-row sm:items-start">
          <div className="flex min-w-0 gap-3">
            <div className="bg-surface text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg border border-sky-500/20 shadow-sm">
              <MessageCircle
                className="size-5 text-sky-500"
                aria-hidden="true"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="telegram-heading"
                  className="text-foreground text-base font-medium"
                >
                  Telegram
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  <Check className="size-3" aria-hidden="true" />
                  Available now
                </span>
              </div>
              <p className="text-dim mt-1.5 max-w-2xl text-sm">
                Create and manage Telegram bots, choose their connected apps,
                and activate webhooks without leaving Aomi.
              </p>
            </div>
          </div>
          <a
            href="https://core.telegram.org/bots#how-do-i-create-a-bot"
            target="_blank"
            rel="noreferrer"
            className="text-dim hover:text-foreground inline-flex shrink-0 items-center gap-1 text-xs font-medium underline underline-offset-4"
          >
            BotFather guide
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </div>
        <BotsView embedded />
      </section>

      <section
        aria-labelledby="discord-heading"
        className="border-border bg-surface-1 overflow-hidden rounded-xl border"
      >
        <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-start">
          <div className="flex min-w-0 gap-3">
            <div className="bg-surface-subtle text-dim flex size-10 shrink-0 items-center justify-center rounded-lg border border-violet-500/15">
              <Bot className="size-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="discord-heading"
                  className="text-foreground text-base font-medium"
                >
                  Discord
                </h2>
                <span className="border-border text-dim rounded-full border px-2 py-0.5 text-[11px] font-medium">
                  Coming soon
                </span>
              </div>
              <p className="text-dim mt-1.5 max-w-2xl text-sm">
                Bring your Aomi apps to Discord with bot messages, commands, and
                deployment alerts.
              </p>
            </div>
          </div>
          <a
            href="https://discord.com/developers/docs/getting-started"
            target="_blank"
            rel="noreferrer"
            className="text-dim hover:text-foreground inline-flex shrink-0 items-center gap-1 text-xs font-medium underline underline-offset-4"
          >
            Developer docs
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </div>
        <div className="border-border bg-surface-subtle border-t px-5 py-3">
          <p className="text-dim text-xs">
            Discord setup is not available yet. No credentials are collected
            until the integration launches.
          </p>
        </div>
      </section>
    </div>
  );
}
