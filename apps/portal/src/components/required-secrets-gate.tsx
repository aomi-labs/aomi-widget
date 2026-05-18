"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useControl, type AomiAppDescriptor } from "@aomi-labs/react";
import { Button, Input } from "@aomi-labs/widget-lib";

const FALLBACK_APP = "default";

export function RequiredSecretsGate() {
  const {
    state,
    getCurrentThreadApp,
    onAppSelect,
    ingestSecrets,
    listSecrets,
  } = useControl();
  const [savedNamesByApp, setSavedNamesByApp] = useState<Record<string, string[]>>(
    {},
  );
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentApp = getCurrentThreadApp();
  const descriptor = useMemo<AomiAppDescriptor | undefined>(
    () => state.appDescriptors.find((d) => d.name === currentApp),
    [state.appDescriptors, currentApp],
  );

  const refreshSaved = useCallback(async () => {
    if (!state.clientId) return;
    try {
      const by_app = await listSecrets();
      setSavedNamesByApp(by_app);
    } catch {
      // backend unreachable; gate stays open until fixed
    }
  }, [listSecrets, state.clientId]);

  useEffect(() => {
    void refreshSaved();
  }, [refreshSaved, currentApp]);

  useEffect(() => {
    setSlotValues({});
    setError(null);
  }, [currentApp]);

  const requiredSlots = useMemo(
    () => (descriptor?.secrets ?? []).filter((s) => s.required),
    [descriptor],
  );
  const filledNames = new Set(savedNamesByApp[currentApp] ?? []);
  const missingRequired = requiredSlots.filter((s) => !filledNames.has(s.name));

  const fallbackName = useMemo(() => {
    if (currentApp === FALLBACK_APP) {
      const next = state.authorizedApps.find((a) => a !== currentApp);
      return next ?? null;
    }
    return state.authorizedApps.includes(FALLBACK_APP) ? FALLBACK_APP : null;
  }, [currentApp, state.authorizedApps]);

  if (missingRequired.length === 0) {
    return null;
  }

  const canSave =
    !saving &&
    Boolean(state.clientId) &&
    missingRequired.every((s) => (slotValues[s.name] ?? "").trim().length > 0);

  const handleSaveAndContinue = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, string> = {};
      for (const slot of missingRequired) {
        payload[slot.name] = (slotValues[slot.name] ?? "").trim();
      }
      await ingestSecrets(payload, currentApp);
      await refreshSaved();
      setSlotValues({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save secrets");
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchApp = () => {
    if (fallbackName) {
      onAppSelect(fallbackName);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="bg-background border-input mx-4 w-full max-w-md space-y-5 rounded-3xl border p-6 shadow-xl">
        <div className="space-y-2">
          <h2 className="text-foreground text-lg font-semibold">
            {currentApp} requires API key
          </h2>
          <p className="text-muted-foreground text-sm">
            This app needs the following credentials before it can run. Values
            are stored in the backend vault scoped to this browser and to{" "}
            <code>{currentApp}</code>.
          </p>
        </div>

        <div className="space-y-4">
          {missingRequired.map((slot) => (
            <div key={slot.name} className="space-y-2">
              <label
                htmlFor={`gate-${currentApp}-${slot.name}`}
                className="text-foreground block text-sm font-mono font-medium"
              >
                {slot.name}
              </label>
              <Input
                id={`gate-${currentApp}-${slot.name}`}
                type="password"
                value={slotValues[slot.name] ?? ""}
                onChange={(event) =>
                  setSlotValues((prev) => ({
                    ...prev,
                    [slot.name]: event.target.value,
                  }))
                }
                placeholder="Paste the value from the provider's dashboard"
                autoComplete="off"
                className="h-11 rounded-full px-5 py-3"
              />
              <p className="text-muted-foreground text-xs">{slot.description}</p>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {fallbackName && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleSwitchApp}
              disabled={saving}
              className="rounded-full"
            >
              Switch to {fallbackName}
            </Button>
          )}
          <Button
            type="button"
            onClick={() => {
              void handleSaveAndContinue();
            }}
            disabled={!canSave}
            className="rounded-full px-6"
          >
            {saving ? "Saving…" : "Save and continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
