"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useApiKey,
  useAuthEndpoints,
  useByok,
  type AomiAppDescriptor,
} from "@aomi-labs/react";
import { Button, Input } from "@aomi-labs/widget-lib";
import {
  settingsActionRowClass,
  settingsBodyTextClass,
  settingsCardStackClass,
  settingsCardTitleClass,
  settingsDescriptionClass,
  settingsInputClass,
  settingsPageClass,
  settingsPillClass,
  settingsPrimaryButtonClass,
  settingsStatusClass,
  settingsSubTitleClass,
  settingsTableCardClass,
  settingsTitleClass,
} from "@portal/lib/settings-styles";

type StoredEntry = {
  valuePrefix: string;
  addedAt: number;
};

const SECRETS_INDEX_STORAGE_KEY = "aomi_secrets_index";

type LocalIndex = Record<string, Record<string, StoredEntry>>;

function readIndex(): LocalIndex {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SECRETS_INDEX_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? (parsed as LocalIndex) : {};
  } catch {
    return {};
  }
}

function writeIndex(index: LocalIndex): void {
  if (typeof window === "undefined") return;
  try {
    if (Object.keys(index).length === 0) {
      window.localStorage.removeItem(SECRETS_INDEX_STORAGE_KEY);
    } else {
      window.localStorage.setItem(
        SECRETS_INDEX_STORAGE_KEY,
        JSON.stringify(index),
      );
    }
  } catch {
    // localStorage unavailable
  }
}

function buildValuePrefix(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}…`;
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-2)}`;
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString();
}

export function Secrets() {
  const { state: authState } = useAuthEndpoints();
  const { state: apiKeyState } = useApiKey();
  const { ingestSecrets, deleteSecret, clearSecrets, listSecrets } =
    useByok().actions;

  const appsWithSecrets = useMemo<AomiAppDescriptor[]>(
    () => authState.appDescriptors.filter((d) => (d.secrets ?? []).length > 0),
    [authState.appDescriptors],
  );

  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [index, setIndex] = useState<LocalIndex>({});
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [clearingApp, setClearingApp] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setIndex(readIndex());
  }, []);

  // Reconcile localStorage mirror against the backend's source of truth on mount.
  useEffect(() => {
    if (!apiKeyState.clientId) return;
    void (async () => {
      try {
        const byApp = await listSecrets();
        setIndex((prev) => {
          const next: LocalIndex = {};
          for (const [app, names] of Object.entries(byApp)) {
            const appPrev = prev[app] ?? {};
            const appNext: Record<string, StoredEntry> = {};
            for (const name of names) {
              appNext[name] = appPrev[name] ?? {
                valuePrefix: "•••",
                addedAt: Date.now(),
              };
            }
            if (Object.keys(appNext).length > 0) next[app] = appNext;
          }
          writeIndex(next);
          return next;
        });
      } catch {
        // Backend unreachable — fall back to whatever localStorage had.
      }
    })();
  }, [listSecrets, apiKeyState.clientId]);

  useEffect(() => {
    if (selectedApp && !appsWithSecrets.some((a) => a.name === selectedApp)) {
      setSelectedApp(null);
    }
    if (!selectedApp && appsWithSecrets.length > 0) {
      setSelectedApp(appsWithSecrets[0]?.name ?? null);
    }
  }, [appsWithSecrets, selectedApp]);

  useEffect(() => {
    setSlotValues({});
  }, [selectedApp]);

  const activeDescriptor = useMemo<AomiAppDescriptor | undefined>(
    () => appsWithSecrets.find((d) => d.name === selectedApp),
    [appsWithSecrets, selectedApp],
  );
  const activeSlots = useMemo(
    () => activeDescriptor?.secrets ?? [],
    [activeDescriptor],
  );

  const requiredMissing = useMemo(
    () =>
      activeSlots
        .filter((s) => s.required && !(slotValues[s.name] ?? "").trim())
        .map((s) => s.name),
    [activeSlots, slotValues],
  );
  const hasAnyValue = activeSlots.some(
    (s) => (slotValues[s.name] ?? "").trim().length > 0,
  );
  const canSave =
    !saving &&
    Boolean(apiKeyState.clientId) &&
    hasAnyValue &&
    requiredMissing.length === 0;

  const handleSave = useCallback(async () => {
    if (!canSave || !selectedApp) return;
    const payload: Record<string, string> = {};
    for (const slot of activeSlots) {
      const v = (slotValues[slot.name] ?? "").trim();
      if (v.length > 0) payload[slot.name] = v;
    }
    if (Object.keys(payload).length === 0) return;

    setSaving(true);
    setStatus(null);
    try {
      await ingestSecrets(payload, selectedApp);
      const now = Date.now();
      setIndex((prev) => {
        const appPrev = prev[selectedApp] ?? {};
        const appNext = { ...appPrev };
        for (const [name, value] of Object.entries(payload)) {
          appNext[name] = {
            valuePrefix: buildValuePrefix(value),
            addedAt: now,
          };
        }
        const next = { ...prev, [selectedApp]: appNext };
        writeIndex(next);
        return next;
      });
      setSlotValues({});
      setStatus({
        type: "success",
        text: `Saved ${Object.keys(payload).length} secret${
          Object.keys(payload).length === 1 ? "" : "s"
        } for ${selectedApp}.`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save secrets",
      });
    } finally {
      setSaving(false);
    }
  }, [activeSlots, canSave, ingestSecrets, selectedApp, slotValues]);

  const handleRemove = useCallback(
    async (app: string, name: string) => {
      if (removing) return;
      const ok = window.confirm(`Remove ${name} from ${app}?`);
      if (!ok) return;
      const key = `${app}:${name}`;
      setRemoving(key);
      setStatus(null);
      try {
        await deleteSecret(name, app);
        setIndex((prev) => {
          const next = { ...prev };
          if (next[app]) {
            const appNext = { ...next[app] };
            delete appNext[name];
            if (Object.keys(appNext).length === 0) {
              delete next[app];
            } else {
              next[app] = appNext;
            }
          }
          writeIndex(next);
          return next;
        });
        setStatus({ type: "success", text: `Removed ${name} from ${app}.` });
      } catch (error) {
        setStatus({
          type: "error",
          text:
            error instanceof Error ? error.message : "Failed to remove secret",
        });
      } finally {
        setRemoving(null);
      }
    },
    [deleteSecret, removing],
  );

  const handleClearApp = useCallback(
    async (app: string) => {
      if (clearingApp) return;
      const ok = window.confirm(`Remove every secret stored for ${app}?`);
      if (!ok) return;
      setClearingApp(app);
      setStatus(null);
      try {
        await clearSecrets(app);
        setIndex((prev) => {
          const next = { ...prev };
          delete next[app];
          writeIndex(next);
          return next;
        });
        setStatus({ type: "success", text: `Cleared all secrets for ${app}.` });
      } catch (error) {
        setStatus({
          type: "error",
          text:
            error instanceof Error ? error.message : "Failed to clear secrets",
        });
      } finally {
        setClearingApp(null);
      }
    },
    [clearSecrets, clearingApp],
  );

  const savedApps = useMemo(
    () =>
      Object.entries(index)
        .filter(([, slots]) => Object.keys(slots).length > 0)
        .sort(([a], [b]) => a.localeCompare(b)),
    [index],
  );

  return (
    <div className={settingsPageClass}>
      <div className="space-y-4">
        <h1 className={settingsTitleClass}>Secrets</h1>
        <p className={settingsDescriptionClass}>
          API credentials for external services Aomi tools call on your behalf
          (e.g. <code>LIMITLESS_API_KEY</code>, <code>OKX_API_KEY</code>).
          Stored in the backend vault scoped to this browser and the chosen app;
          tools receive them as opaque <code>$SECRET:NAME</code> handles.
        </p>
        {!apiKeyState.clientId && (
          <p className={settingsBodyTextClass}>
            Waiting for client id to initialize…
          </p>
        )}
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

      <div className={`${settingsCardStackClass} space-y-6`}>
        <div className="space-y-4">
          <p className={settingsCardTitleClass}>App</p>
          {appsWithSecrets.length === 0 ? (
            <p className={settingsBodyTextClass}>
              No apps declare secret slots in this session.
            </p>
          ) : (
            <div className="flex min-w-0 flex-wrap gap-2">
              {appsWithSecrets.map((descriptor) => {
                const active = selectedApp === descriptor.name;
                return (
                  <button
                    key={descriptor.name}
                    type="button"
                    onClick={() => setSelectedApp(descriptor.name)}
                    className={`${settingsPillClass} ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-foreground hover:bg-accent"
                    }`}
                  >
                    {descriptor.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {activeDescriptor && (
          <>
            <h2 className={settingsCardTitleClass}>
              Add Secret for {activeDescriptor.name}
            </h2>
            <div className="min-w-0 space-y-5">
              {activeSlots.map((slot) => (
                <div key={slot.name} className="space-y-4">
                  <label
                    htmlFor={`slot-${activeDescriptor.name}-${slot.name}`}
                    className="text-foreground flex items-baseline gap-2 pl-2 text-sm font-medium"
                  >
                    <span className="font-mono tracking-[0.02em]">
                      {slot.name}
                    </span>
                    {slot.required ? (
                      <span className="text-destructive text-sm">required</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        optional
                      </span>
                    )}
                  </label>
                  <Input
                    id={`slot-${activeDescriptor.name}-${slot.name}`}
                    type="password"
                    value={slotValues[slot.name] ?? ""}
                    onChange={(event) =>
                      setSlotValues((prev) => ({
                        ...prev,
                        [slot.name]: event.target.value,
                      }))
                    }
                    placeholder={
                      index[activeDescriptor.name]?.[slot.name]
                        ? `${index[activeDescriptor.name][slot.name].valuePrefix} (set — paste a new value to rotate)`
                        : "Paste the value from the provider's dashboard"
                    }
                    autoComplete="off"
                    className={settingsInputClass}
                  />
                  <p className={settingsBodyTextClass}>{slot.description}</p>
                </div>
              ))}
              <div className={settingsActionRowClass}>
                <Button
                  type="button"
                  onClick={() => {
                    void handleSave();
                  }}
                  disabled={!canSave}
                  className={`${settingsPrimaryButtonClass} mb-2`}
                >
                  {saving ? "Saving..." : "Save secret"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="space-y-4">
        <h2 className={settingsSubTitleClass}>Saved Secrets</h2>
        {savedApps.length === 0 ? (
          <div className={settingsTableCardClass}>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-center">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Preview</th>
                  <th className="px-3 py-2">Added</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    className="text-muted-foreground px-3 py-4 text-center"
                    colSpan={4}
                  >
                    No secrets saved.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          savedApps.map(([app, slots]) => (
            <div key={app} className={settingsTableCardClass}>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-foreground font-medium">{app}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void handleClearApp(app);
                  }}
                  disabled={clearingApp === app}
                  className="text-muted-foreground hover:text-destructive"
                >
                  {clearingApp === app ? "Clearing..." : "Remove all"}
                </Button>
              </div>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-left">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Preview</th>
                    <th className="px-3 py-2">Added</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(slots)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([name, entry]) => {
                      const key = `${app}:${name}`;
                      return (
                        <tr key={name} className="border-border border-t">
                          <td className="text-foreground px-3 py-2 font-mono">
                            {name}
                          </td>
                          <td className="text-muted-foreground px-3 py-2 font-mono">
                            {entry.valuePrefix}
                          </td>
                          <td className="text-muted-foreground px-3 py-2">
                            {formatTs(entry.addedAt)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                void handleRemove(app, name);
                              }}
                              disabled={removing === key}
                              className="rounded-full"
                            >
                              {removing === key ? "Removing..." : "Remove"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
