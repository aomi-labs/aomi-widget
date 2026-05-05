"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { settingsApiFetch } from "@/lib/settings-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccountIdentity } from "@/lib/use-account-identity";

type OwnedApiKey = {
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

type ApiKeysResponse = {
  api_keys: OwnedApiKey[];
};

type CreateApiKeyResponse = {
  api_key: string;
  key: OwnedApiKey;
};

function formatTs(ts?: number | null): string {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString();
}

export function ApiKeySettings() {
  const identity = useAccountIdentity();
  const [apiKeys, setApiKeys] = useState<OwnedApiKey[]>([]);
  const [availableApps, setAvailableApps] = useState<string[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingHash, setDeletingHash] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [manualKeyInput, setManualKeyInput] = useState("");
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);

  const ensureBoundSession = useCallback(async () => {
    if (!identity.address) return;
    await settingsApiFetch<{ session_id: string; title?: string | null }>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ public_key: identity.address }),
    });
  }, [identity.address]);

  const loadApiKeys = useCallback(async () => {
    if (!identity.address) {
      setApiKeys([]);
      return;
    }

    setLoadingKeys(true);
    setStatus(null);
    try {
      await ensureBoundSession();
      const data = await settingsApiFetch<ApiKeysResponse>("/api/settings/api-keys");
      setApiKeys(data.api_keys ?? []);
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to load API keys",
      });
    } finally {
      setLoadingKeys(false);
    }
  }, [ensureBoundSession, identity.address]);

  const loadApps = useCallback(async () => {
    setLoadingApps(true);
    try {
      const path = identity.address
        ? `/api/control/apps?public_key=${encodeURIComponent(identity.address)}`
        : "/api/control/apps";
      const data = await settingsApiFetch<string[]>(path);
      const normalized = [...new Set((data ?? []).map((app) => app.toLowerCase()))];
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
  }, [identity.address]);

  useEffect(() => {
    void Promise.all([loadApiKeys(), loadApps()]);
  }, [loadApiKeys, loadApps]);

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
    setCreatedApiKey(null);
    try {
      await ensureBoundSession();
      const payload = {
        apps: selectedApps,
        label: labelInput.trim() || undefined,
        api_key: manualKeyInput.trim() || undefined,
      };
      const data = await settingsApiFetch<CreateApiKeyResponse>("/api/settings/api-keys", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setCreatedApiKey(data.api_key);
      setLabelInput("");
      setManualKeyInput("");
      await loadApiKeys();
      setStatus({ type: "success", text: "API key created." });
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create API key",
      });
    } finally {
      setCreating(false);
    }
  }, [
    canCreate,
    ensureBoundSession,
    labelInput,
    loadApiKeys,
    manualKeyInput,
    selectedApps,
  ]);

  const handleRemove = useCallback(
    async (key: OwnedApiKey) => {
      if (deletingHash) return;

      const shouldDelete = window.confirm(`Remove API key ${key.key_prefix}?`);
      if (!shouldDelete) return;

      setDeletingHash(key.key_hash);
      setStatus(null);
      try {
        await ensureBoundSession();
        await settingsApiFetch<{ revoked: boolean }>(
          `/api/settings/api-keys/${encodeURIComponent(key.key_hash)}`,
          { method: "DELETE" },
        );
        await loadApiKeys();
        setStatus({ type: "success", text: "API key removed." });
      } catch (error) {
        setStatus({
          type: "error",
          text: error instanceof Error ? error.message : "Failed to remove API key",
        });
      } finally {
        setDeletingHash(null);
      }
    },
    [deletingHash, ensureBoundSession, loadApiKeys],
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">API Keys</h3>
        <p className="text-sm text-muted-foreground">
          Manage your keys for authenticated API access. Newly generated keys are shown only once.
        </p>
        {!identity.address && (
          <p className="mt-2 text-sm text-muted-foreground">
            Connect a wallet account to manage owned API keys.
          </p>
        )}
      </div>

      {status && (
        <div
          className={`rounded-2xl p-3 text-sm ${
            status.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400"
              : "bg-destructive/10 border border-destructive/20 text-destructive"
          }`}
        >
          {status.text}
        </div>
      )}

      <div className="rounded-3xl border border-input bg-background p-5 space-y-4">
        <h4 className="text-base font-semibold text-foreground">Add API Key</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="api-key-label" className="block text-sm font-medium text-foreground">
              Label (optional)
            </label>
            <Input
              id="api-key-label"
              type="text"
              value={labelInput}
              onChange={(event) => setLabelInput(event.target.value)}
              placeholder="Trading bot key"
              className="rounded-full px-5 py-3 h-11"
            />
          </div>
          <div>
            <label htmlFor="manual-api-key-input" className="block text-sm font-medium text-foreground mb-2">
              API Key Value (optional)
            </label>
            <Input
              id="manual-api-key-input"
              type="password"
              value={manualKeyInput}
              onChange={(event) => setManualKeyInput(event.target.value)}
              placeholder="Leave empty to auto-generate"
              className="rounded-full px-5 py-3 h-11"
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Leave blank to create a secure generated key.
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Apps</p>
          {loadingApps && (
            <p className="text-sm text-muted-foreground">Loading apps...</p>
          )}
          {!loadingApps && availableApps.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No apps available for this session.
            </p>
          )}
          {!loadingApps && availableApps.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableApps.map((app) => {
                const selected = selectedApps.includes(app);
                return (
                  <button
                    key={app}
                    type="button"
                    onClick={() => toggleApp(app)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-input hover:bg-accent"
                    }`}
                  >
                    {app}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => {
              void handleCreate();
            }}
            disabled={!canCreate}
            className="rounded-full px-6"
          >
            {creating ? "Creating..." : "Create key"}
          </Button>
        </div>

        {createdApiKey && (
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">New key</p>
            <p className="text-sm font-mono break-all text-foreground">{createdApiKey}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(createdApiKey);
                }}
              >
                Copy key
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCreatedApiKey(null)}
              >
                Hide
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-input bg-background p-2 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="px-3 py-2">Key</th>
              <th className="px-3 py-2">Label</th>
              <th className="px-3 py-2">Apps</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last used</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingKeys && (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                  Loading API keys...
                </td>
              </tr>
            )}
            {!loadingKeys && apiKeys.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                  No API keys found.
                </td>
              </tr>
            )}
            {!loadingKeys &&
              apiKeys.map((key) => (
                <tr key={key.key_hash} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground font-mono">{key.key_prefix}</td>
                  <td className="px-3 py-2 text-muted-foreground">{key.label || "-"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{key.apps.join(", ")}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {key.is_active ? "Active" : "Inactive"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{formatTs(key.last_used_at)}</td>
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
                      {deletingHash === key.key_hash ? "Removing..." : "Remove"}
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
