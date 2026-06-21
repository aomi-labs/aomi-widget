"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input, useAomiAuthAdapter } from "@aomi-labs/widget-lib";
import { settingsApiFetch, useAccountApiFetch } from "@portal/lib/settings-api";
import {
  settingsActionRowClass,
  settingsBodyTextClass,
  settingsCardStackClass,
  settingsCardTitleClass,
  settingsDescriptionClass,
  settingsInputClass,
  settingsLabelClass,
  settingsPageClass,
  settingsPillClass,
  settingsPrimaryButtonClass,
  settingsStatusClass,
  settingsSubTitleClass,
  settingsTableCardClass,
  settingsTitleClass,
} from "./settings-styles";

type OwnedAppKey = {
  key_hash: string;
  key_prefix: string;
  owner_user_id?: string | null;
  label?: string | null;
  is_active: boolean;
  created_at: number;
  updated_at: number;
  last_used_at?: number | null;
  apps: string[];
};

type AppKeysResponse = {
  app_keys: OwnedAppKey[];
};

type AppOption = string | { name?: string };

type CreateAppKeyResponse = {
  app_key: string;
  key: OwnedAppKey;
};

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

function formatTs(ts?: number | null): string {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString();
}

export function AppKeys() {
  const { identity } = useAomiAuthAdapter();
  const accountApiFetch = useAccountApiFetch();
  const [appKeys, setAppKeys] = useState<OwnedAppKey[]>([]);
  const [availableApps, setAvailableApps] = useState<string[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingHash, setDeletingHash] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [manualKeyInput, setManualKeyInput] = useState("");
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [createdAppKey, setCreatedAppKey] = useState<string | null>(null);

  const loadAppKeys = useCallback(async () => {
    if (!identity.address) {
      setAppKeys([]);
      return;
    }

    setLoadingKeys(true);
    setStatus(null);
    try {
      const data = await accountApiFetch<AppKeysResponse>(
        "/api/account/app-keys",
      );
      setAppKeys(data.app_keys ?? []);
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to load app keys",
      });
    } finally {
      setLoadingKeys(false);
    }
  }, [accountApiFetch, identity.address]);

  const loadApps = useCallback(async () => {
    setLoadingApps(true);
    try {
      const data = await settingsApiFetch<AppOption[]>("/api/session/apps");
      const normalized = normalizeAppOptions(data ?? []);
      setAvailableApps(normalized);
      setSelectedApps((previous) => {
        const filtered = previous.filter((ns) => normalized.includes(ns));
        if (filtered.length > 0) {
          return filtered;
        }
        if (normalized.includes("default")) {
          return ["default"];
        }
        return normalized.length > 0 ? [normalized[0]] : [];
      });
    } catch {
      setAvailableApps([]);
      setSelectedApps([]);
    } finally {
      setLoadingApps(false);
    }
  }, [settingsApiFetch]);

  useEffect(() => {
    void Promise.all([loadAppKeys(), loadApps()]);
  }, [loadAppKeys, loadApps]);

  const canCreate = useMemo(
    () => Boolean(identity.address) && !creating && selectedApps.length > 0,
    [creating, identity.address, selectedApps.length],
  );

  const toggleApp = useCallback((app: string) => {
    setSelectedApps((current) =>
      current.includes(app)
        ? current.filter((item) => item !== app)
        : [...current, app],
    );
  }, []);

  const handleCreate = useCallback(async () => {
    if (!canCreate) return;

    setCreating(true);
    setStatus(null);
    setCreatedAppKey(null);
    try {
      const payload = {
        apps: selectedApps,
        label: labelInput.trim() || undefined,
        app_key: manualKeyInput.trim() || undefined,
      };
      const data = await accountApiFetch<CreateAppKeyResponse>(
        "/api/account/app-keys",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      setCreatedAppKey(data.app_key);
      setLabelInput("");
      setManualKeyInput("");
      await loadAppKeys();
      setStatus({ type: "success", text: "App key created." });
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to create app key",
      });
    } finally {
      setCreating(false);
    }
  }, [
    canCreate,
    accountApiFetch,
    labelInput,
    loadAppKeys,
    manualKeyInput,
    selectedApps,
  ]);

  const handleRemove = useCallback(
    async (key: OwnedAppKey) => {
      if (deletingHash) return;

      const shouldDelete = window.confirm(`Remove app key ${key.key_prefix}?`);
      if (!shouldDelete) return;

      setDeletingHash(key.key_hash);
      setStatus(null);
      try {
        await accountApiFetch<{ revoked: boolean }>(
          `/api/account/app-keys/${encodeURIComponent(key.key_hash)}`,
          { method: "DELETE" },
        );
        await loadAppKeys();
        setStatus({ type: "success", text: "App key removed." });
      } catch (error) {
        setStatus({
          type: "error",
          text:
            error instanceof Error ? error.message : "Failed to remove app key",
        });
      } finally {
        setDeletingHash(null);
      }
    },
    [accountApiFetch, deletingHash, loadAppKeys],
  );

  return (
    <div className={settingsPageClass}>
      <div className="space-y-4">
        <h1 className={settingsTitleClass}>App Keys</h1>
        <p className={settingsDescriptionClass}>
          Programmatic access keys for Aomi. Send as <code>Aomi-App-Key</code>{" "}
          to call <code>/api/chat</code> from your own services. Newly generated
          keys are shown only once.
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

      <div className={`${settingsCardStackClass} space-y-5`}>
        <h2 className={settingsCardTitleClass}>Add App Key</h2>
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="min-w-0 space-y-4">
            <label htmlFor="app-key-label" className={settingsLabelClass}>
              Label (optional)
            </label>
            <Input
              id="app-key-label"
              type="text"
              value={labelInput}
              onChange={(event) => setLabelInput(event.target.value)}
              placeholder="Trading bot"
              className={settingsInputClass}
            />
          </div>
          <div className="min-w-0 space-y-4">
            <label
              htmlFor="manual-app-key-input"
              className={settingsLabelClass}
            >
              App Key Value (optional)
            </label>
            <Input
              id="manual-app-key-input"
              type="password"
              value={manualKeyInput}
              onChange={(event) => setManualKeyInput(event.target.value)}
              placeholder="Leave empty to auto-generate"
              className={settingsInputClass}
            />
            <p className={settingsBodyTextClass}>
              Leave blank to create a secure generated key.
            </p>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <p className={settingsCardTitleClass}>Apps</p>
          {loadingApps && (
            <p className={settingsBodyTextClass}>Loading apps...</p>
          )}
          {!loadingApps && availableApps.length === 0 && (
            <p className={settingsBodyTextClass}>
              No apps available for this session.
            </p>
          )}
          {!loadingApps && availableApps.length > 0 && (
            <div className="flex min-w-0 flex-wrap gap-3">
              {availableApps.map((app) => {
                const selected = selectedApps.includes(app);
                return (
                  <button
                    key={app}
                    type="button"
                    onClick={() => toggleApp(app)}
                    className={`${settingsPillClass} ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-foreground hover:bg-accent"
                    }`}
                  >
                    {app}
                  </button>
                );
              })}
            </div>
          )}
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
            {creating ? "Creating..." : "Create app key"}
          </Button>
        </div>

        {createdAppKey && (
          <div className="space-y-4 rounded-3xl border border-green-500/20 bg-green-500/5 p-6">
            <p className={settingsLabelClass}>New app key</p>
            <p className="text-foreground break-all font-mono text-sm leading-7">
              {createdAppKey}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(createdAppKey);
                }}
              >
                Copy key
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCreatedAppKey(null)}
              >
                Hide
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className={settingsSubTitleClass}>Owned Keys</h2>
        <div className={settingsTableCardClass}>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-center">
                <th className="px-3 py-2">Key</th>
                <th className="px-3 py-2">Label</th>
                <th className="px-3 py-2">Apps</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Last used</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingKeys && (
                <tr>
                  <td
                    className="text-muted-foreground px-3 py-4 text-center"
                    colSpan={6}
                  >
                    Loading app keys...
                  </td>
                </tr>
              )}
              {!loadingKeys && appKeys.length === 0 && (
                <tr>
                  <td
                    className="text-muted-foreground px-3 py-4 text-center"
                    colSpan={6}
                  >
                    No app keys found.
                  </td>
                </tr>
              )}
              {!loadingKeys &&
                appKeys.map((key) => (
                  <tr key={key.key_hash} className="border-border border-t">
                    <td className="text-foreground px-3 py-2 font-mono">
                      {key.key_prefix}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {key.label || "-"}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {key.apps.join(", ")}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {key.is_active ? "Active" : "Inactive"}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {formatTs(key.last_used_at)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          void handleRemove(key);
                        }}
                        disabled={deletingHash === key.key_hash}
                        className="rounded-full"
                      >
                        {deletingHash === key.key_hash
                          ? "Removing..."
                          : "Remove"}
                      </Button>
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
