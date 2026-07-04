"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input } from "@aomi-labs/widget-lib";
import { settingsApiFetch } from "@portal/lib/settings-api";
import {
  settingsActionRowClass,
  settingsBodyTextClass,
  settingsCardStackClass,
  settingsCardTitleClass,
  settingsDescriptionClass,
  settingsInputClass,
  settingsLabelClass,
  settingsPageClass,
  settingsPrimaryButtonClass,
  settingsStatusClass,
  settingsSubTitleClass,
  settingsTableCardClass,
  settingsTitleClass,
} from "@portal/lib/settings-styles";

type BotRegistration = {
  id: string;
  platform: string;
  status: string;
  label?: string | null;
  default_app: string;
  platform_bot_id: string;
  platform_username?: string | null;
  webhook_url?: string | null;
  thread_mode: string;
  created_at: number;
  updated_at: number;
  disabled_at?: number | null;
};

type BotRegistrationsResponse = {
  bot_registrations: BotRegistration[];
};

type AppOption = string | { name?: string };

type CreateBotRegistrationResponse = {
  bot_registration: BotRegistration;
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

function formatTs(ts?: number | null): string {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString();
}

function displayBotName(bot: BotRegistration): string {
  if (bot.label?.trim()) {
    return bot.label;
  }
  if (bot.platform_username?.trim()) {
    return `@${bot.platform_username}`;
  }
  return bot.platform_bot_id;
}

function normalizeAppOptions(apps: AppOption[]): string[] {
  return [
    ...new Set(
      apps
        .map((app) => (typeof app === "string" ? app : app.name))
        .filter((app): app is string => Boolean(app?.trim()))
        .map((app) => app.toLowerCase()),
    ),
  ];
}

export function Bots() {
  const [bots, setBots] = useState<BotRegistration[]>([]);
  const [availableApps, setAvailableApps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);
  const [creating, setCreating] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [selectedApp, setSelectedApp] = useState("");
  const [threadMode, setThreadMode] = useState("single");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const ensureBoundSession = useCallback(async () => {
    await settingsApiFetch<{ thread_id: string; title?: string | null }>(
      "/api/threads",
      { method: "POST", body: JSON.stringify({}) },
    );
  }, []);

  const loadBots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureBoundSession();
      const data =
        await settingsApiFetch<BotRegistrationsResponse>("/api/account/bots");
      setBots(data.bot_registrations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bots");
    } finally {
      setLoading(false);
    }
  }, [ensureBoundSession]);

  const loadApps = useCallback(async () => {
    setLoadingApps(true);
    try {
      const data = await settingsApiFetch<AppOption[]>("/api/account/apps");
      const normalized = normalizeAppOptions(data ?? []);
      setAvailableApps(normalized);
      setSelectedApp((previous) => {
        if (previous && normalized.includes(previous)) {
          return previous;
        }
        if (normalized.includes("default")) {
          return "default";
        }
        return normalized[0] ?? "";
      });
    } catch {
      setAvailableApps([]);
      setSelectedApp("");
    } finally {
      setLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadBots(), loadApps()]);
  }, [loadApps, loadBots]);

  const canCreate = useMemo(
    () => selectedApp.length > 0 && tokenInput.trim().length > 0 && !creating,
    [creating, selectedApp, tokenInput],
  );

  const handleCreate = useCallback(async () => {
    if (!canCreate) return;

    setCreating(true);
    setStatus(null);
    try {
      await ensureBoundSession();
      const data = await settingsApiFetch<CreateBotRegistrationResponse>(
        "/api/account/bots",
        {
          method: "POST",
          body: JSON.stringify({
            platform: "telegram",
            default_app: selectedApp,
            label: labelInput.trim() || undefined,
            credential: tokenInput.trim(),
            thread_mode: threadMode,
          }),
        },
      );
      setBots((current) => [data.bot_registration, ...current]);
      setLabelInput("");
      setTokenInput("");
      setStatus({
        type: "success",
        text: "Bot registered and webhook activated.",
      });
    } catch (err) {
      setStatus({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to register bot",
      });
    } finally {
      setCreating(false);
    }
  }, [
    canCreate,
    ensureBoundSession,
    labelInput,
    selectedApp,
    threadMode,
    tokenInput,
  ]);

  return (
    <div className={settingsPageClass}>
      <div className="space-y-4">
        <h1 className={settingsTitleClass}>Bots</h1>
        <p className={settingsDescriptionClass}>
          Register Telegram bots that use your Aomi backend, selected app, and
          runtime session flow. Bot credentials are encrypted and never shown
          after registration.
        </p>
      </div>

      {status && (
        <div
          className={`${settingsStatusClass} ${
            status.type === "success"
              ? "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400"
              : "border-destructive/20 bg-destructive/10 text-destructive"
          }`}
        >
          {status.text}
        </div>
      )}

      {error && (
        <div
          className={`${settingsStatusClass} border-destructive/20 bg-destructive/10 text-destructive`}
        >
          Failed to load bots: {error}
        </div>
      )}

      <section className={`${settingsCardStackClass} space-y-5`}>
        <div className="space-y-2">
          <h2 className={settingsCardTitleClass}>Register Telegram Bot</h2>
          <p className={settingsBodyTextClass}>
            Create the bot in BotFather, paste its token here, and we will
            verify it with Telegram and activate the webhook automatically. This
            account owns the bot configuration; people who message the bot still
            use their own Aomi identity, wallets, and threads.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <div className="min-w-0 space-y-4">
            <label htmlFor="bot-label" className={settingsLabelClass}>
              Label (optional)
            </label>
            <Input
              id="bot-label"
              type="text"
              value={labelInput}
              onChange={(event) => setLabelInput(event.target.value)}
              placeholder="Trading assistant"
              className={settingsInputClass}
              disabled={creating}
            />
          </div>
          <div className="min-w-0 space-y-4">
            <label htmlFor="bot-token" className={settingsLabelClass}>
              Bot Token
            </label>
            <Input
              id="bot-token"
              type="password"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="Paste Telegram BotFather token"
              className={settingsInputClass}
              disabled={creating}
            />
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <div className="min-w-0 space-y-4">
            <label htmlFor="bot-app" className={settingsLabelClass}>
              Default App
            </label>
            <select
              id="bot-app"
              value={selectedApp}
              onChange={(event) => setSelectedApp(event.target.value)}
              className={`${settingsInputClass} w-full`}
              disabled={creating || loadingApps}
            >
              {availableApps.map((app) => (
                <option key={app} value={app}>
                  {app}
                </option>
              ))}
            </select>
            {loadingApps && (
              <p className={settingsBodyTextClass}>Loading apps...</p>
            )}
            {!loadingApps && availableApps.length === 0 && (
              <p className={settingsBodyTextClass}>
                No apps available for this account.
              </p>
            )}
          </div>
          <div className="min-w-0 space-y-4">
            <label htmlFor="bot-thread-mode" className={settingsLabelClass}>
              Thread Mode
            </label>
            <select
              id="bot-thread-mode"
              value={threadMode}
              onChange={(event) => setThreadMode(event.target.value)}
              className={`${settingsInputClass} w-full`}
              disabled={creating}
            >
              <option value="single">Single thread</option>
              <option value="multi">Multiple threads</option>
            </select>
            <p className={settingsBodyTextClass}>
              Single keeps the bot simple; multiple lets users switch threads
              with session commands. For a true single-chat Telegram experience,
              also disable threaded/topic mode for the bot in BotFather.
            </p>
          </div>
        </div>

        <div className={settingsActionRowClass}>
          <Button
            type="button"
            onClick={() => {
              void handleCreate();
            }}
            disabled={!canCreate}
            className={settingsPrimaryButtonClass}
          >
            {creating ? "Registering..." : "Register bot"}
          </Button>
        </div>
      </section>

      <section className={settingsCardStackClass}>
        <h2 className={settingsCardTitleClass}>Optional BotFather Commands</h2>
        <p className={settingsBodyTextClass}>
          The bot works without configuring commands, but this list makes the
          supported slash commands visible in Telegram.
        </p>
        <pre className="text-foreground border-input bg-muted/30 overflow-x-auto rounded-2xl border p-4 font-mono text-xs leading-6">
          {BOTFATHER_COMMANDS}
        </pre>
      </section>

      <div className="space-y-4">
        <h2 className={settingsSubTitleClass}>Registered Bots</h2>
        <div className={settingsTableCardClass}>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-center">
                <th className="px-3 py-2">Bot</th>
                <th className="px-3 py-2">Platform</th>
                <th className="px-3 py-2">App</th>
                <th className="px-3 py-2">Thread Mode</th>
                <th className="px-3 py-2">Webhook</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    className="text-muted-foreground px-3 py-4 text-center"
                    colSpan={7}
                  >
                    Loading bots...
                  </td>
                </tr>
              )}
              {!loading && bots.length === 0 && (
                <tr>
                  <td
                    className="text-muted-foreground px-3 py-4 text-center"
                    colSpan={7}
                  >
                    No bots registered yet.
                  </td>
                </tr>
              )}
              {!loading &&
                bots.map((bot) => (
                  <tr key={bot.id} className="border-border border-t">
                    <td className="text-foreground px-3 py-2">
                      <div>{displayBotName(bot)}</div>
                      {bot.platform_username && bot.label && (
                        <div className="text-muted-foreground text-xs">
                          @{bot.platform_username}
                        </div>
                      )}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {bot.platform}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {bot.default_app}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {bot.thread_mode}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {bot.webhook_url ? "Configured" : "Not configured"}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {bot.status}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {formatTs(bot.created_at)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
