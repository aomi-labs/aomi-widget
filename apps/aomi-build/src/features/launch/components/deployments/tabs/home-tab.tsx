"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  KeyRound,
  MessageSquare,
  Rocket,
} from "lucide-react";
import { deploymentLifecycleFromSource } from "@aomi-labs/deploy/lifecycle";
import { useProjectDetail } from "@build/features/launch/hooks/use-project-detail";
import { operateFetch } from "@build/features/operate/client";
import { chatAppUrl } from "@build/lib/chat-url";
import { BUILD_GLOSSARY } from "@build/lib/glossary";
import { EmptyPanel } from "../ui/state-panels";

type Detail = ReturnType<typeof useProjectDetail>;

type UsagePeek = {
  creditsUsed: number;
  tokens: number;
  available: boolean;
};

function numberValue(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function StatusCard({
  label,
  value,
  hint,
  actionHref,
  actionLabel,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  actionHref?: string;
  actionLabel?: string;
  tone?: "good" | "warn" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : tone === "warn"
        ? "border-amber-500/30 bg-amber-500/5"
        : "border-border bg-surface-2";

  return (
    <div className={`rounded-md border px-3 py-3 ${toneClass}`}>
      <div className="text-dim text-[11px] uppercase tracking-wide">{label}</div>
      <div className="text-foreground mt-1.5 text-sm font-medium">{value}</div>
      <p className="text-dim mt-1 text-xs leading-5">{hint}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="text-foreground mt-3 inline-flex text-xs font-medium underline underline-offset-2 hover:opacity-80"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function HomeTab({
  detail,
  tabBaseHref,
}: {
  detail: Detail;
  tabBaseHref?: string;
}) {
  const source = detail.source;
  const [usage, setUsage] = useState<UsagePeek | null>(null);

  useEffect(() => {
    detail.loadSecrets();
  }, [detail]);

  useEffect(() => {
    if (!source) return;
    let alive = true;
    operateFetch<{
      daily?: Array<Record<string, unknown>>;
    }>("usage", source.id)
      .then((payload) => {
        if (!alive) return;
        const daily = payload.daily ?? [];
        const totals = daily.reduce(
          (acc, row) => ({
            creditsUsed: acc.creditsUsed + numberValue(row.creditsUsed),
            tokens:
              acc.tokens +
              numberValue(row.inputTokens) +
              numberValue(row.outputTokens),
          }),
          { creditsUsed: 0, tokens: 0 },
        );
        setUsage({ ...totals, available: true });
      })
      .catch(() => {
        if (alive) setUsage({ creditsUsed: 0, tokens: 0, available: false });
      });
    return () => {
      alive = false;
    };
  }, [source]);

  const lifecycle = useMemo(
    () => (source ? deploymentLifecycleFromSource(source) : null),
    [source],
  );

  const secretCount = useMemo(() => {
    if (!detail.secretsByApp) return null;
    return Object.values(detail.secretsByApp).reduce(
      (sum, keys) => sum + keys.length,
      0,
    );
  }, [detail.secretsByApp]);

  if (!source || !lifecycle) {
    return <EmptyPanel>Project not found.</EmptyPanel>;
  }

  const tabHref = (tab: string) =>
    tabBaseHref ? `${tabBaseHref}?tab=${tab}` : `?tab=${tab}`;

  const isLive = lifecycle.kind === "live" && Boolean(lifecycle.chatApp);
  const chatUrl = isLive
    ? chatAppUrl(lifecycle.chatApp!, {
        locked: true,
        applicationId: lifecycle.chatApplicationId,
      })
    : null;

  const liveValue =
    lifecycle.kind === "live"
      ? "Live"
      : lifecycle.kind === "building" || lifecycle.kind === "build_ready"
        ? lifecycle.statusLabel
        : lifecycle.kind === "failed"
          ? lifecycle.statusLabel
          : "Not live";

  const liveTone =
    lifecycle.kind === "live"
      ? "good"
      : lifecycle.kind === "failed"
        ? "warn"
        : "warn";

  const envReady = secretCount !== null && secretCount > 0;
  const envLoading = detail.secretsByApp === null && !detail.secretsError;

  const nextAction =
    !isLive
      ? {
          href: tabHref("deployments"),
          label: "Deploy new version",
          copy: "Publish a deployment, then set keys and open chat.",
        }
      : !envReady
        ? {
            href: tabHref("environment"),
            label: "Open Environment",
            copy: "Add API keys so the live app can call tools.",
          }
        : chatUrl
          ? {
              href: chatUrl,
              label: "Open Chat",
              copy: "App is live and keys look set. Try it in chat.",
              external: true,
            }
          : {
              href: tabHref("chat"),
              label: "Open Chat tab",
              copy: "Continue in the Chat tab.",
            };

  return (
    <div className="divide-y divide-border">
      <div className="px-4 py-4">
        <div className="text-sm font-medium text-foreground">Project home</div>
        <p className="text-dim mt-1 max-w-2xl text-xs leading-5">
          {BUILD_GLOSSARY.project.meaning} Check live status, environment keys,
          and open chat from here.
        </p>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <StatusCard
          label="Live"
          value={liveValue}
          hint={
            isLive
              ? `${lifecycle.chatApp} is active.`
              : lifecycle.message || "Deploy and activate an app to go live."
          }
          tone={liveTone}
          actionHref={tabHref("deployments")}
          actionLabel="View deployments"
        />
        <StatusCard
          label="Environment"
          value={
            envLoading
              ? "Loading…"
              : detail.secretsError
                ? "Unavailable"
                : envReady
                  ? `${secretCount} key${secretCount === 1 ? "" : "s"} set`
                  : "Keys missing"
          }
          hint={BUILD_GLOSSARY.environment.meaning}
          tone={envReady ? "good" : "warn"}
          actionHref={tabHref("environment")}
          actionLabel="Open Environment"
        />
        <StatusCard
          label="Chat"
          value={isLive ? "Ready" : "Needs live app"}
          hint={
            isLive
              ? "Open the chat session for this app."
              : "Chat unlocks after a live deployment."
          }
          tone={isLive ? "good" : "neutral"}
          actionHref={isLive ? tabHref("chat") : tabHref("deployments")}
          actionLabel={isLive ? "Chat tab" : "Go to deployments"}
        />
        <StatusCard
          label="Usage"
          value={
            usage == null
              ? "Loading…"
              : !usage.available
                ? "—"
                : usage.creditsUsed > 0 || usage.tokens > 0
                  ? `${usage.creditsUsed.toFixed(2)} credits`
                  : "No traffic yet"
          }
          hint="Credits/tokens for this project. Not Billing."
          tone="neutral"
          actionHref="/operate/usage"
          actionLabel="Open Usage"
        />
      </div>

      <div className="border-border bg-surface-2/40 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">Next</div>
            <p className="text-dim mt-1 text-xs leading-5">{nextAction.copy}</p>
          </div>
          {"external" in nextAction && nextAction.external ? (
            <a
              href={nextAction.href}
              target="_blank"
              rel="noreferrer"
              className="bg-primary text-primary-foreground inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:opacity-90"
            >
              <MessageSquare className="size-3.5" aria-hidden />
              {nextAction.label}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : (
            <Link
              href={nextAction.href}
              className="bg-primary text-primary-foreground inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:opacity-90"
            >
              {nextAction.label === "Deploy new version" ? (
                <Rocket className="size-3.5" aria-hidden />
              ) : nextAction.label === "Open Environment" ? (
                <KeyRound className="size-3.5" aria-hidden />
              ) : (
                <MessageSquare className="size-3.5" aria-hidden />
              )}
              {nextAction.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
