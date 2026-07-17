"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@aomi-labs/widget-lib";
import { settingsApiFetch } from "@portal/lib/settings-api";
import {
  SettingsConfirmPill,
  SettingsEmpty,
  SettingsPanel,
  SettingsPill,
  SettingsPromoCard,
  SettingsRow,
  SettingsSkeletonRows,
  SettingsStatus,
  SettingsTable,
} from "@portal/components/settings/settings-primitives";

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

type CreateAppKeyResponse = {
  app_key: string;
  key: OwnedAppKey;
};

type AppOption = string | { name?: string };

const inputClass =
  "border-border h-8 w-52 rounded-full border px-3 text-[12.5px] shadow-none sm:w-64";

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
  const [loadError, setLoadError] = useState<string | null>(null);

  const ensureBoundSession = useCallback(async () => {
    await settingsApiFetch<{ thread_id: string; title?: string | null }>(
      "/api/threads",
      { method: "POST", body: JSON.stringify({}) },
    );
  }, []);

  const loadAppKeys = useCallback(async () => {
    setLoadingKeys(true);
    setLoadError(null);
    setStatus(null);
    try {
      await ensureBoundSession();
      const data = await settingsApiFetch<AppKeysResponse>(
        "/api/account/app-keys",
      );
      setAppKeys(data.app_keys ?? []);
    } catch (error) {
      setAppKeys([]);
      setLoadError(
        error instanceof Error ? error.message : "Failed to load app keys",
      );
    } finally {
      setLoadingKeys(false);
    }
  }, [ensureBoundSession]);

  const loadApps = useCallback(async () => {
    setLoadingApps(true);
    try {
      const data = await settingsApiFetch<AppOption[]>("/api/account/apps");
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
  }, []);

  useEffect(() => {
    void Promise.all([loadAppKeys(), loadApps()]);
  }, [loadAppKeys, loadApps]);

  const canCreate = useMemo(
    () => !creating && selectedApps.length > 0,
    [creating, selectedApps.length],
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
      await ensureBoundSession();
      const payload = {
        apps: selectedApps,
        label: labelInput.trim() || undefined,
        app_key: manualKeyInput.trim() || undefined,
      };
      const data = await settingsApiFetch<CreateAppKeyResponse>(
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
    ensureBoundSession,
    labelInput,
    loadAppKeys,
    manualKeyInput,
    selectedApps,
  ]);

  const handleRemove = useCallback(
    async (key: OwnedAppKey) => {
      if (deletingHash) return;

      setDeletingHash(key.key_hash);
      setStatus(null);
      try {
        await ensureBoundSession();
        await settingsApiFetch<{ revoked: boolean }>(
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
    [deletingHash, ensureBoundSession, loadAppKeys],
  );

  return (
    <SettingsPanel
      title="App keys"
      description="API keys for your services. Send as AOMI-APP-KEY. Shown once."
    >
      {status ? (
        <SettingsStatus tone={status.type}>{status.text}</SettingsStatus>
      ) : null}

      {!loadingKeys && loadError ? (
        <SettingsPromoCard
          title="Account offline"
          description={loadError}
          action={
            <SettingsPill onClick={() => void loadAppKeys()}>Retry</SettingsPill>
          }
        />
      ) : null}

      <SettingsRow label="Label" description="Optional">
        <Input
          type="text"
          value={labelInput}
          onChange={(event) => setLabelInput(event.target.value)}
          placeholder="Trading bot"
          className={inputClass}
        />
      </SettingsRow>

      <SettingsRow label="Key value" description="Blank = auto-generate">
        <Input
          type="password"
          value={manualKeyInput}
          onChange={(event) => setManualKeyInput(event.target.value)}
          placeholder="Auto-generate"
          autoComplete="off"
          className={inputClass}
        />
      </SettingsRow>

      <SettingsRow
        label="Apps"
        description={
          loadingApps
            ? "Loading…"
            : availableApps.length === 0
              ? "No apps in this session"
              : "Apps this key can access"
        }
      >
        {availableApps.length > 0 ? (
          <div className="flex max-w-[280px] flex-wrap justify-end gap-1.5">
            {availableApps.map((app) => (
              <SettingsPill
                key={app}
                tone={selectedApps.includes(app) ? "primary" : "default"}
                onClick={() => toggleApp(app)}
              >
                {app}
              </SettingsPill>
            ))}
          </div>
        ) : null}
      </SettingsRow>

      <SettingsRow
        label="Create key"
        description={
          selectedApps.length > 0
            ? `Scoped to ${selectedApps.join(", ")}`
            : "Pick at least one app"
        }
      >
        <SettingsPill
          tone="primary"
          disabled={!canCreate}
          onClick={() => {
            void handleCreate();
          }}
        >
          {creating ? "Creating…" : "Create app key"}
        </SettingsPill>
      </SettingsRow>

      {createdAppKey ? (
        <SettingsStatus tone="success">
          <p className="font-medium">
            New app key. Copy it now; it will not be shown again.
          </p>
          <p className="mt-1 break-all font-mono">{createdAppKey}</p>
          <div className="mt-2 flex gap-2">
            <SettingsPill
              onClick={() => {
                void navigator.clipboard.writeText(createdAppKey);
              }}
            >
              Copy key
            </SettingsPill>
            <SettingsPill onClick={() => setCreatedAppKey(null)}>
              Hide
            </SettingsPill>
          </div>
        </SettingsStatus>
      ) : null}

      {loadingKeys ? <SettingsSkeletonRows count={4} /> : null}

      {!loadingKeys && !loadError && appKeys.length === 0 ? (
        <SettingsEmpty
          title="No app keys yet"
          description="Create a key above to call the API."
        />
      ) : null}

      {!loadingKeys && appKeys.length > 0 ? (
        <SettingsTable
          headers={["Key", "Label", "Apps", "Status", "Last used", ""]}
        >
          {appKeys.map((key) => (
            <tr key={key.key_hash} className="border-border/50 border-t">
              <td className="text-foreground px-3 py-2.5 font-mono">
                {key.key_prefix}
              </td>
              <td className="text-muted-foreground px-3 py-2.5">
                {key.label || "-"}
              </td>
              <td className="text-muted-foreground px-3 py-2.5">
                {key.apps.join(", ")}
              </td>
              <td className="text-muted-foreground px-3 py-2.5">
                {key.is_active ? "Active" : "Inactive"}
              </td>
              <td className="text-muted-foreground px-3 py-2.5">
                {formatTs(key.last_used_at)}
              </td>
              <td className="px-3 py-2.5 text-right">
                <SettingsConfirmPill
                  label="Remove"
                  confirmLabel="Confirm?"
                  busyLabel="Removing…"
                  busy={deletingHash === key.key_hash}
                  onConfirm={() => void handleRemove(key)}
                />
              </td>
            </tr>
          ))}
        </SettingsTable>
      ) : null}
    </SettingsPanel>
  );
}
