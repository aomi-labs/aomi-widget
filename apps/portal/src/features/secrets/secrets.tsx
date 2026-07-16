"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useApiKey,
  useAuthEndpoints,
  useByok,
  type AomiAppDescriptor,
} from "@aomi-labs/react";
import { Input } from "@aomi-labs/widget-lib";
import {
  SettingsEmpty,
  SettingsPanel,
  SettingsPill,
  SettingsRow,
  SettingsStatus,
} from "@portal/components/settings/settings-primitives";

type StoredEntry = {
  valuePrefix: string;
  addedAt: number;
};

const SECRETS_INDEX_STORAGE_KEY = "aomi_secrets_index";

type LocalIndex = Record<string, Record<string, StoredEntry>>;

const inputClass =
  "border-border h-8 w-52 rounded-full border px-3 text-[12.5px] shadow-none sm:w-64";

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
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmClearApp, setConfirmClearApp] = useState<string | null>(null);
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
      const key = `${app}:${name}`;
      setConfirmRemove(null);
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
      setConfirmClearApp(null);
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
    <SettingsPanel
      title="Secrets"
      description="API credentials for external services Aomi tools call on your behalf. Stored in the backend vault; tools receive them as opaque $SECRET:NAME handles."
    >
      {!apiKeyState.clientId ? (
        <SettingsStatus tone="error">
          Waiting for client id to initialize…
        </SettingsStatus>
      ) : null}

      {status ? (
        <SettingsStatus tone={status.type}>{status.text}</SettingsStatus>
      ) : null}

      <SettingsRow
        label="App"
        description={
          appsWithSecrets.length === 0
            ? "No apps declare secret slots in this session"
            : "Choose which app the secrets belong to"
        }
      >
        {appsWithSecrets.length > 0 ? (
          <div className="flex max-w-[280px] flex-wrap justify-end gap-1.5">
            {appsWithSecrets.map((descriptor) => (
              <SettingsPill
                key={descriptor.name}
                tone={selectedApp === descriptor.name ? "primary" : "default"}
                onClick={() => setSelectedApp(descriptor.name)}
              >
                {descriptor.name}
              </SettingsPill>
            ))}
          </div>
        ) : null}
      </SettingsRow>

      {activeDescriptor ? (
        <>
          {activeSlots.map((slot) => (
            <SettingsRow
              key={slot.name}
              label={slot.name}
              description={`${slot.required ? "Required" : "Optional"}${
                slot.description ? ` · ${slot.description}` : ""
              }`}
            >
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
                    ? `${index[activeDescriptor.name][slot.name].valuePrefix} (set — paste to rotate)`
                    : "Paste value"
                }
                autoComplete="off"
                className={inputClass}
              />
            </SettingsRow>
          ))}
          <SettingsRow
            label="Save secrets"
            description={`Encrypted and scoped to ${activeDescriptor.name}`}
          >
            <SettingsPill
              tone="primary"
              disabled={!canSave}
              onClick={() => {
                void handleSave();
              }}
            >
              {saving ? "Saving…" : "Save secrets"}
            </SettingsPill>
          </SettingsRow>
        </>
      ) : null}

      {savedApps.length === 0 ? (
        <SettingsEmpty
          title="No secrets saved"
          description="Saved secrets show up here with a masked preview."
        />
      ) : (
        savedApps.map(([app, slots]) => (
          <div key={app}>
            <SettingsRow
              label={app}
              description="Saved secrets for this app"
              className="bg-muted/20"
            >
              <SettingsPill
                tone="danger"
                disabled={clearingApp === app}
                onClick={() => {
                  if (confirmClearApp === app) {
                    void handleClearApp(app);
                  } else {
                    setConfirmClearApp(app);
                  }
                }}
              >
                {clearingApp === app
                  ? "Clearing…"
                  : confirmClearApp === app
                    ? "Confirm?"
                    : "Remove all"}
              </SettingsPill>
            </SettingsRow>
            {Object.entries(slots)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([name, entry]) => {
                const key = `${app}:${name}`;
                return (
                  <SettingsRow
                    key={name}
                    label={name}
                    description={`${entry.valuePrefix} · added ${formatTs(entry.addedAt)}`}
                  >
                    <SettingsPill
                      tone="danger"
                      disabled={removing === key}
                      onClick={() => {
                        if (confirmRemove === key) {
                          void handleRemove(app, name);
                        } else {
                          setConfirmRemove(key);
                        }
                      }}
                    >
                      {removing === key
                        ? "Removing…"
                        : confirmRemove === key
                          ? "Confirm?"
                          : "Remove"}
                    </SettingsPill>
                  </SettingsRow>
                );
              })}
          </div>
        ))
      )}
    </SettingsPanel>
  );
}
