"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@aomi-labs/widget-lib";
import { settingsApiFetch } from "@portal/lib/settings-api";
import {
  SettingsEmpty,
  SettingsPanel,
  SettingsPill,
  SettingsPromoCard,
  SettingsRow,
  SettingsSelect,
  SettingsSkeletonRows,
  SettingsStatus,
  SettingsTable,
} from "@portal/components/settings/settings-primitives";

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

const inputClass =
  "border-border h-8 w-52 rounded-full border px-3 text-[12.5px] shadow-none sm:w-64";

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
    <SettingsPanel
      title="Bots"
      description="Telegram bots on your Aomi backend. Token is encrypted and not shown again."
    >
      {status ? (
        <SettingsStatus tone={status.type}>{status.text}</SettingsStatus>
      ) : null}

      {error ? (
        <SettingsPromoCard
          title="Account offline"
          description={error}
          action={
            <SettingsPill onClick={() => void loadBots()}>Retry</SettingsPill>
          }
        />
      ) : null}

      <SettingsRow label="Label" description="Optional">
        <Input
          type="text"
          value={labelInput}
          onChange={(event) => setLabelInput(event.target.value)}
          placeholder="Trading assistant"
          disabled={creating}
          className={inputClass}
        />
      </SettingsRow>

      <SettingsRow
        label="Bot token"
        description="From BotFather. Verified and webhooked on register."
      >
        <Input
          type="password"
          value={tokenInput}
          onChange={(event) => setTokenInput(event.target.value)}
          placeholder="Paste BotFather token"
          autoComplete="off"
          disabled={creating}
          className={inputClass}
        />
      </SettingsRow>

      <SettingsRow
        label="Default app"
        description={
          loadingApps
            ? "Loading…"
            : availableApps.length === 0
              ? "No apps on this account"
              : "Default app for the bot"
        }
      >
        {availableApps.length > 0 ? (
          <SettingsSelect
            value={selectedApp}
            onChange={setSelectedApp}
            options={availableApps.map((app) => ({ value: app, label: app }))}
          />
        ) : null}
      </SettingsRow>

      <SettingsRow
        label="Thread mode"
        description="Single thread, or multiple with session commands"
      >
        <SettingsSelect
          value={threadMode}
          onChange={setThreadMode}
          options={[
            { value: "single", label: "Single thread" },
            { value: "multi", label: "Multiple threads" },
          ]}
        />
      </SettingsRow>

      <SettingsRow
        label="Register bot"
        description="Users keep their own Aomi identity"
      >
        <SettingsPill
          tone="primary"
          disabled={!canCreate}
          onClick={() => {
            void handleCreate();
          }}
        >
          {creating ? "Registering…" : "Register bot"}
        </SettingsPill>
      </SettingsRow>

      <details className="border-border/50 group border-b px-3 py-3.5">
        <summary className="text-foreground cursor-pointer list-none text-[13.5px] font-medium leading-5">
          How to set BotFather commands
          <span className="text-muted-foreground ml-2 text-[12px] group-open:hidden">
            Show
          </span>
          <span className="text-muted-foreground ml-2 hidden text-[12px] group-open:inline">
            Hide
          </span>
        </summary>
        <p className="text-muted-foreground mt-2 text-[12.5px] leading-4">
          Optional. Paste into BotFather /setcommands to show slash commands in
          Telegram.
        </p>
        <pre className="text-foreground border-border bg-muted/40 mt-2 overflow-x-auto rounded-xl border p-3 font-mono text-xs leading-6">
          {BOTFATHER_COMMANDS}
        </pre>
      </details>

      {loading ? <SettingsSkeletonRows count={3} /> : null}

      {!loading && !error && bots.length === 0 ? (
        <SettingsEmpty
          title="No bots yet"
          description="Paste a BotFather token above to register one."
        />
      ) : null}

      {!loading && bots.length > 0 ? (
        <SettingsTable
          headers={[
            "Bot",
            "App",
            "Thread mode",
            "Webhook",
            "Status",
            "Created",
          ]}
        >
          {bots.map((bot) => (
            <tr key={bot.id} className="border-border/50 border-t">
              <td className="text-foreground px-3 py-2.5">
                <div>{displayBotName(bot)}</div>
                {bot.platform_username && bot.label ? (
                  <div className="text-muted-foreground text-xs">
                    @{bot.platform_username}
                  </div>
                ) : null}
              </td>
              <td className="text-muted-foreground px-3 py-2.5">
                {bot.default_app}
              </td>
              <td className="text-muted-foreground px-3 py-2.5">
                {bot.thread_mode}
              </td>
              <td className="text-muted-foreground px-3 py-2.5">
                {bot.webhook_url ? "Configured" : "Not configured"}
              </td>
              <td className="text-muted-foreground px-3 py-2.5">
                {bot.status}
              </td>
              <td className="text-muted-foreground px-3 py-2.5">
                {formatTs(bot.created_at)}
              </td>
            </tr>
          ))}
        </SettingsTable>
      ) : null}
    </SettingsPanel>
  );
}
