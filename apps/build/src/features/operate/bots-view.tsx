"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGitHubSession } from "@build/components/control-plane/github-session-context";
import {
  GitHubSignInPanel,
  LoadingPanel,
} from "@build/features/launch/components/deployments/ui/state-panels";
import { API_PATHS } from "@build/lib/api-paths";
import { operateFetch } from "./client";

type BotSourceApp = {
  id: number;
  name: string;
};

type BotSource = {
  id: number;
  repositoryLink?: string | null;
  githubAccount?: string | null;
  apps?: BotSourceApp[];
};

type Bot = {
  id: string;
  platform: string;
  status: string;
  label?: string | null;
  defaultApp: string;
  platformBotId?: string;
  platformUsername?: string | null;
  webhookUrl?: string | null;
  threadMode: string;
  createdAt: number;
  source?: BotSource;
};

type BotsPayload = {
  sources?: BotSource[];
  bots?: Bot[];
};

type AppOption = {
  appSourceId: number;
  applicationId: number;
  name: string;
  sourceLabel: string;
};

const BOTFATHER_COMMANDS = [
  "start - Start the bot",
  "sessions - View and switch threads",
  "wallet - Connect or manage wallet",
  "tx - Review pending transactions",
  "sign - Sign selected transactions",
  "app - View or change app",
  "model - View or change model",
  "network - View or switch network",
  "settings - Open bot settings",
].join("\n");

function sourceLabel(source: BotSource) {
  return source.repositoryLink || source.githubAccount || `Source ${source.id}`;
}

function displayBotName(bot: Bot): string {
  if (bot.label?.trim()) return bot.label;
  if (bot.platformUsername?.trim()) return `@${bot.platformUsername}`;
  return bot.platformBotId ?? bot.id;
}

function formatTs(ts?: number | null): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString();
}

export function BotsView() {
  const { account } = useGitHubSession();
  const [payload, setPayload] = useState<BotsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [token, setToken] = useState("");
  const [threadMode, setThreadMode] = useState("single");
  const [selectedOption, setSelectedOption] = useState("");
  const [creating, setCreating] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (account.loading) {
      setLoading(true);
      setError(null);
      setPayload(null);
      return;
    }
    if (!account.signedIn) {
      setLoading(false);
      setError(null);
      setPayload(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    operateFetch<BotsPayload>("bots")
      .then((next) => {
        if (alive) setPayload(next);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [account.loading, account.signedIn]);

  const sources = useMemo(() => payload?.sources ?? [], [payload?.sources]);
  const bots = useMemo(() => payload?.bots ?? [], [payload?.bots]);

  const options = useMemo<AppOption[]>(
    () =>
      sources.flatMap((source) =>
        (source.apps ?? []).map((app) => ({
          appSourceId: source.id,
          applicationId: app.id,
          name: app.name,
          sourceLabel: sourceLabel(source),
        })),
      ),
    [sources],
  );

  const canCreate =
    selectedOption.length > 0 && token.trim().length > 0 && !creating;

  const handleCreate = useCallback(async () => {
    if (!canCreate) return;
    const [appSourceIdRaw, applicationIdRaw] = selectedOption.split(":");
    const appSourceId = Number(appSourceIdRaw);
    const applicationId = Number(applicationIdRaw);
    if (!Number.isFinite(appSourceId) || !Number.isFinite(applicationId))
      return;

    setCreating(true);
    setFormError(null);
    setFormStatus(null);
    try {
      const res = await fetch(API_PATHS.bff.operate.bots, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appSourceId,
          applicationId,
          credential: token.trim(),
          label: label.trim() || undefined,
          threadMode,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        bot?: Bot;
        error?: string;
      };
      if (!res.ok || !json.bot) {
        throw new Error(json.error || `Failed to register bot (${res.status})`);
      }
      const created = json.bot;
      setPayload((current) => ({
        sources: current?.sources ?? sources,
        bots: [created, ...(current?.bots ?? [])],
      }));
      setToken("");
      setLabel("");
      setFormStatus("Bot registered and webhook activated.");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to register bot",
      );
    } finally {
      setCreating(false);
    }
  }, [canCreate, selectedOption, token, label, threadMode, sources]);

  const handleRemove = useCallback(async (bot: Bot) => {
    if (!bot.source) return;
    setRemovingId(bot.id);
    setFormError(null);
    try {
      const params = new URLSearchParams({
        appSourceId: String(bot.source.id),
        botId: bot.id,
      });
      const res = await fetch(`${API_PATHS.bff.operate.bots}?${params}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error || `Failed to remove bot (${res.status})`);
      }
      setPayload((current) =>
        current
          ? {
              ...current,
              bots: (current.bots ?? []).filter((b) => b.id !== bot.id),
            }
          : current,
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to remove bot");
    } finally {
      setRemovingId(null);
    }
  }, []);

  if (account.loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <LoadingPanel label="Checking GitHub session..." />
      </div>
    );
  }

  if (!account.signedIn) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <GitHubSignInPanel error={null} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-display text-xl font-normal tracking-tight">
          Bots
        </h1>
        <p className="text-dim mt-1 max-w-2xl text-sm">
          Register Telegram bots that use your Aomi backend, selected app, and
          runtime session flow. Bot credentials are encrypted and never shown
          after registration.
        </p>
      </div>

      {formStatus ? (
        <div className="border-border bg-surface-subtle text-foreground rounded-md border px-3 py-2 text-sm">
          {formStatus}
        </div>
      ) : null}
      {formError ? (
        <div className="border-danger/30 bg-danger/5 text-danger rounded-md border px-3 py-2 text-sm">
          {formError}
        </div>
      ) : null}

      <section className="border-border bg-surface-1 space-y-4 rounded-md border p-4">
        <div>
          <h2 className="text-base font-medium">Register Telegram bot</h2>
          <p className="text-dim mt-1 text-sm">
            Create the bot in BotFather, paste its token here, and we will
            verify it with Telegram and activate the webhook automatically. This
            account owns the bot configuration; people who message the bot still
            use their own Aomi identity, wallets, and threads.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="text-dim">Label (optional)</span>
            <input
              type="text"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Trading assistant"
              disabled={creating}
              className="border-border bg-surface text-foreground h-9 w-full rounded-md border px-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-dim">Bot token</span>
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste Telegram BotFather token"
              disabled={creating}
              className="border-border bg-surface text-foreground h-9 w-full rounded-md border px-2"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="text-dim">App</span>
            <select
              value={selectedOption}
              onChange={(event) => setSelectedOption(event.target.value)}
              disabled={creating || options.length === 0}
              className="border-border bg-surface text-foreground h-9 w-full rounded-md border px-2"
            >
              <option value="">Select an app</option>
              {options.map((option) => (
                <option
                  key={`${option.appSourceId}:${option.applicationId}`}
                  value={`${option.appSourceId}:${option.applicationId}`}
                >
                  {option.name} ({option.sourceLabel})
                </option>
              ))}
            </select>
            {options.length === 0 ? (
              <span className="text-dim block text-xs">
                No deployed apps available for this account.
              </span>
            ) : null}
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-dim">Thread mode</span>
            <select
              value={threadMode}
              onChange={(event) => setThreadMode(event.target.value)}
              disabled={creating}
              className="border-border bg-surface text-foreground h-9 w-full rounded-md border px-2"
            >
              <option value="single">Single thread</option>
              <option value="multi">Multiple threads</option>
            </select>
            <span className="text-dim block text-xs">
              Single keeps the bot simple; multiple lets users switch threads
              with session commands.
            </span>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!canCreate}
            className="bg-foreground text-background disabled:bg-surface-3 disabled:text-dim h-9 rounded-md px-4 text-sm font-medium disabled:cursor-not-allowed"
          >
            {creating ? "Registering..." : "Register bot"}
          </button>
        </div>
      </section>

      <section className="border-border bg-surface-1 space-y-3 rounded-md border p-4">
        <h2 className="text-base font-medium">Optional BotFather commands</h2>
        <p className="text-dim text-sm">
          The bot works without configuring commands, but this list makes the
          supported slash commands visible in Telegram.
        </p>
        <pre className="border-border bg-surface text-foreground overflow-x-auto rounded-md border p-3 font-mono text-xs leading-6">
          {BOTFATHER_COMMANDS}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-medium">Registered bots</h2>
        {loading ? (
          <div className="border-border bg-surface-subtle text-dim rounded-md border px-4 py-10 text-center text-sm">
            Loading
          </div>
        ) : error ? (
          <div className="border-danger/30 bg-danger/5 text-danger rounded-md border px-4 py-3 text-sm">
            {error}
          </div>
        ) : bots.length === 0 ? (
          <div className="border-border bg-surface-subtle text-dim rounded-md border px-4 py-10 text-center text-sm">
            No bots registered yet.
          </div>
        ) : (
          <div className="border-border overflow-x-auto rounded-md border">
            <table className="divide-border min-w-full divide-y text-sm">
              <thead className="bg-surface-subtle text-dim text-left text-xs uppercase">
                <tr>
                  <th className="px-3 py-2">Bot</th>
                  <th className="px-3 py-2">App</th>
                  <th className="px-3 py-2">Thread mode</th>
                  <th className="px-3 py-2">Webhook</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-border bg-surface divide-y">
                {bots.map((bot) => (
                  <tr key={bot.id}>
                    <td className="px-3 py-2">
                      <div className="text-foreground">
                        {displayBotName(bot)}
                      </div>
                      {bot.platformUsername && bot.label ? (
                        <div className="text-dim text-xs">
                          @{bot.platformUsername}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-dim px-3 py-2">{bot.defaultApp}</td>
                    <td className="text-dim px-3 py-2">{bot.threadMode}</td>
                    <td className="text-dim px-3 py-2">
                      {bot.webhookUrl ? "Configured" : "Not configured"}
                    </td>
                    <td className="text-dim px-3 py-2">{bot.status}</td>
                    <td className="text-dim whitespace-nowrap px-3 py-2">
                      {formatTs(bot.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => void handleRemove(bot)}
                        disabled={removingId === bot.id || !bot.source}
                        className="border-border hover:bg-accent-hover text-dim h-7 rounded-md border px-2 text-xs disabled:opacity-50"
                      >
                        {removingId === bot.id ? "Removing..." : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
