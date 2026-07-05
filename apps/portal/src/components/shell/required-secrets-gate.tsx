"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useApiKey,
  useAuthEndpoints,
  useByok,
  usePerThreadControl,
  type AomiAppDescriptor,
} from "@aomi-labs/react";
import { Button, Input } from "@aomi-labs/widget-lib";

const FALLBACK_APP = "default";

export function RequiredSecretsGate() {
  const { state: authState } = useAuthEndpoints();
  const { state: apiKeyState } = useApiKey();
  const { ingestSecrets, listSecrets } = useByok().actions;
  const { getCurrentThreadApp, getCurrentThreadApplicationId, onAppSelect } =
    usePerThreadControl().actions;
  const [savedNamesByApp, setSavedNamesByApp] = useState<
    Record<string, string[]>
  >({});
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentApp = getCurrentThreadApp();
  const currentApplicationId = getCurrentThreadApplicationId();
  const descriptor = useMemo<AomiAppDescriptor | undefined>(
    () =>
      authState.appDescriptors.find(
        (d) =>
          d.name === currentApp &&
          (d.applicationId?.toString() ?? "") ===
            (currentApplicationId?.toString() ?? ""),
      ) ?? authState.appDescriptors.find((d) => d.name === currentApp),
    [authState.appDescriptors, currentApp, currentApplicationId],
  );
  const requiredSlots = useMemo(
    () => (descriptor?.secrets ?? []).filter((s) => s.required),
    [descriptor],
  );

  const refreshSaved = useCallback(async () => {
    if (!apiKeyState.clientId) return;
    if (requiredSlots.length === 0) return;
    try {
      const by_app = await listSecrets();
      setSavedNamesByApp(by_app);
    } catch {
      // backend unreachable; gate stays open until fixed
    }
  }, [listSecrets, apiKeyState.clientId]);

  useEffect(() => {
    void refreshSaved();
  }, [refreshSaved, currentApp]);

  useEffect(() => {
    setSlotValues({});
    setError(null);
  }, [currentApp]);

  const filledNames = new Set(savedNamesByApp[currentApp] ?? []);
  const missingRequired = requiredSlots.filter((s) => !filledNames.has(s.name));

  const fallbackDescriptor = useMemo(() => {
    if (currentApp === FALLBACK_APP) {
      return (
        authState.appDescriptors.find((a) => a.name !== currentApp) ?? null
      );
    }
    return (
      authState.appDescriptors.find((a) => a.name === FALLBACK_APP) ?? null
    );
  }, [currentApp, authState.appDescriptors]);

  if (missingRequired.length === 0) {
    return null;
  }

  const canSave =
    !saving &&
    Boolean(apiKeyState.clientId) &&
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
    if (fallbackDescriptor) {
      onAppSelect(fallbackDescriptor.name, {
        applicationId: fallbackDescriptor.applicationId,
      });
    }
  };

  return (
    <div className="bg-background/70 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-background border-input mx-4 w-full max-w-md space-y-5 rounded-3xl border p-8 shadow-xl">
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

        <div className="space-y-6">
          {missingRequired.map((slot) => (
            <div key={slot.name} className="space-y-3">
              <label
                htmlFor={`gate-${currentApp}-${slot.name}`}
                className="text-foreground block font-mono text-sm font-medium"
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
                className="bg-muted h-10 rounded-3xl border-2 px-5 text-sm"
              />
              <p className="text-muted-foreground text-xs">
                {slot.description}
              </p>
            </div>
          ))}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {fallbackDescriptor && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleSwitchApp}
              disabled={saving}
              className="rounded-full"
            >
              Switch to {fallbackDescriptor.label ?? fallbackDescriptor.name}
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
