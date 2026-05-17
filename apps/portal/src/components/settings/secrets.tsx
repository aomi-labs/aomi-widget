"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input, useAomiAuthAdapter } from "@aomi-labs/widget-lib";
import { settingsApiFetch } from "@portal/lib/settings-api";

type OwnedSecret = {
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

type SecretsResponse = {
  api_keys: OwnedSecret[];
};

type CreateSecretResponse = {
  api_key: string;
  key: OwnedSecret;
};

function formatTs(ts?: number | null): string {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString();
}

export function Secrets() {
  const { identity } = useAomiAuthAdapter();
  const [secrets, setSecrets] = useState<OwnedSecret[]>([]);
  const [availableApps, setAvailableApps] = useState<string[]>([]);
  const [loadingSecrets, setLoadingSecrets] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingHash, setDeletingHash] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [manualSecretInput, setManualSecretInput] = useState("");
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const ensureBoundSession = useCallback(async () => {
    if (!identity.address) return;
    await settingsApiFetch<{ session_id: string; title?: string | null }>(
      "/api/sessions",
      {
        method: "POST",
        body: JSON.stringify({ public_key: identity.address }),
      },
    );
  }, [identity.address]);

  const loadSecrets = useCallback(async () => {
    if (!identity.address) {
      setSecrets([]);
      return;
    }

    setLoadingSecrets(true);
    setStatus(null);
    try {
      await ensureBoundSession();
      const data = await settingsApiFetch<SecretsResponse>(
        "/api/settings/api-keys",
      );
      setSecrets(data.api_keys ?? []);
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to load secrets",
      });
    } finally {
      setLoadingSecrets(false);
    }
  }, [ensureBoundSession, identity.address]);

  const loadApps = useCallback(async () => {
    setLoadingApps(true);
    try {
      const path = identity.address
        ? `/api/control/apps?public_key=${encodeURIComponent(identity.address)}`
        : "/api/control/apps";
      const data = await settingsApiFetch<string[]>(path);
      const normalized = [
        ...new Set((data ?? []).map((app) => app.toLowerCase())),
      ];
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
    void Promise.all([loadSecrets(), loadApps()]);
  }, [loadSecrets, loadApps]);

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
    setCreatedSecret(null);
    try {
      await ensureBoundSession();
      const payload = {
        apps: selectedApps,
        label: labelInput.trim() || undefined,
        api_key: manualSecretInput.trim() || undefined,
      };
      const data = await settingsApiFetch<CreateSecretResponse>(
        "/api/settings/api-keys",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      setCreatedSecret(data.api_key);
      setLabelInput("");
      setManualSecretInput("");
      await loadSecrets();
      setStatus({ type: "success", text: "Secret created." });
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to create secret",
      });
    } finally {
      setCreating(false);
    }
  }, [
    canCreate,
    ensureBoundSession,
    labelInput,
    loadSecrets,
    manualSecretInput,
    selectedApps,
  ]);

  const handleRemove = useCallback(
    async (secret: OwnedSecret) => {
      if (deletingHash) return;

      const shouldDelete = window.confirm(
        `Remove secret ${secret.key_prefix}?`,
      );
      if (!shouldDelete) return;

      setDeletingHash(secret.key_hash);
      setStatus(null);
      try {
        await ensureBoundSession();
        await settingsApiFetch<{ revoked: boolean }>(
          `/api/settings/api-keys/${encodeURIComponent(secret.key_hash)}`,
          { method: "DELETE" },
        );
        await loadSecrets();
        setStatus({ type: "success", text: "Secret removed." });
      } catch (error) {
        setStatus({
          type: "error",
          text:
            error instanceof Error ? error.message : "Failed to remove secret",
        });
      } finally {
        setDeletingHash(null);
      }
    },
    [deletingHash, ensureBoundSession, loadSecrets],
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-foreground mb-4 text-lg font-semibold">Secrets</h3>
        <p className="text-muted-foreground text-sm">
          Manage your secrets for authenticated API access. Newly generated
          secrets are shown only once.
        </p>
        {!identity.address && (
          <p className="text-muted-foreground mt-2 text-sm">
            Connect a wallet account to manage owned secrets.
          </p>
        )}
      </div>

      {status && (
        <div
          className={`rounded-2xl p-3 text-sm ${
            status.type === "success"
              ? "border border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400"
              : "bg-destructive/10 border-destructive/20 text-destructive border"
          }`}
        >
          {status.text}
        </div>
      )}

      <div className="border-input bg-background space-y-4 rounded-3xl border p-5">
        <h4 className="text-foreground text-base font-semibold">Add Secret</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="secret-label"
              className="text-foreground block text-sm font-medium"
            >
              Label (optional)
            </label>
            <Input
              id="secret-label"
              type="text"
              value={labelInput}
              onChange={(event) => setLabelInput(event.target.value)}
              placeholder="Trading bot secret"
              className="h-11 rounded-full px-5 py-3"
            />
          </div>
          <div>
            <label
              htmlFor="manual-secret-input"
              className="text-foreground mb-2 block text-sm font-medium"
            >
              Secret Value (optional)
            </label>
            <Input
              id="manual-secret-input"
              type="password"
              value={manualSecretInput}
              onChange={(event) => setManualSecretInput(event.target.value)}
              placeholder="Leave empty to auto-generate"
              className="h-11 rounded-full px-5 py-3"
            />
            <p className="text-muted-foreground mt-2 text-sm">
              Leave blank to create a secure generated secret.
            </p>
          </div>
        </div>

        <div>
          <p className="text-foreground mb-2 text-sm font-medium">Apps</p>
          {loadingApps && (
            <p className="text-muted-foreground text-sm">Loading apps...</p>
          )}
          {!loadingApps && availableApps.length === 0 && (
            <p className="text-muted-foreground text-sm">
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
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
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
            {creating ? "Creating..." : "Create secret"}
          </Button>
        </div>

        {createdSecret && (
          <div className="space-y-2 rounded-2xl border border-green-500/20 bg-green-500/5 p-4">
            <p className="text-foreground text-sm font-medium">New secret</p>
            <p className="text-foreground break-all font-mono text-sm">
              {createdSecret}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(createdSecret);
                }}
              >
                Copy secret
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCreatedSecret(null)}
              >
                Hide
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="border-input bg-background overflow-x-auto rounded-3xl border p-2">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-left">
              <th className="px-3 py-2">Secret</th>
              <th className="px-3 py-2">Label</th>
              <th className="px-3 py-2">Apps</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last used</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingSecrets && (
              <tr>
                <td className="text-muted-foreground px-3 py-4" colSpan={6}>
                  Loading secrets...
                </td>
              </tr>
            )}
            {!loadingSecrets && secrets.length === 0 && (
              <tr>
                <td className="text-muted-foreground px-3 py-4" colSpan={6}>
                  No secrets found.
                </td>
              </tr>
            )}
            {!loadingSecrets &&
              secrets.map((secret) => (
                <tr key={secret.key_hash} className="border-border border-t">
                  <td className="text-foreground px-3 py-2 font-mono">
                    {secret.key_prefix}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">
                    {secret.label || "-"}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">
                    {secret.apps.join(", ")}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">
                    {secret.is_active ? "Active" : "Inactive"}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">
                    {formatTs(secret.last_used_at)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        void handleRemove(secret);
                      }}
                      disabled={deletingHash === secret.key_hash}
                      className="rounded-full"
                    >
                      {deletingHash === secret.key_hash
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
  );
}
