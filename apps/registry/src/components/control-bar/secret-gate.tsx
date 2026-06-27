"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useApiKey,
  useAuthEndpoints,
  useByok,
  usePerThreadControl,
} from "@aomi-labs/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Renders an overlay over the chat panel when the currently selected app
 * declares required secrets that the user has not yet ingested. The user
 * must either fill the slots (which calls `ingestSecrets(payload, app)`)
 * or pick another app — there is no dismiss button.
 *
 * Mounted inside `Thread.tsx`'s `ThreadPrimitive.Root` so the absolute
 * positioning covers the chat area only (sidebar / header / composer
 * remain interactable).
 */
export function SecretGate() {
  const { state: authState } = useAuthEndpoints();
  const { state: apiKeyState } = useApiKey();
  const { ingestSecrets, listSecrets } = useByok().actions;
  const { getCurrentThreadApp, onAppSelect } = usePerThreadControl().actions;

  const currentApp = getCurrentThreadApp();
  const descriptor = useMemo(
    () => authState.appDescriptors.find((d) => d.name === currentApp),
    [authState.appDescriptors, currentApp],
  );
  const requiredSlots = useMemo(
    () => (descriptor?.secrets ?? []).filter((s) => s.required),
    [descriptor],
  );

  const [filled, setFilled] = useState<Set<string>>(new Set());
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [knownEmpty, setKnownEmpty] = useState(false);

  // Reconcile against the backend's source of truth whenever the app or
  // client id changes. Until we have a response, we render nothing — the
  // grey overlay only flashes when we know required slots are missing.
  useEffect(() => {
    if (!apiKeyState.clientId || requiredSlots.length === 0) {
      setFilled(new Set());
      setKnownEmpty(requiredSlots.length === 0);
      return;
    }
    let cancelled = false;
    setKnownEmpty(false);
    void (async () => {
      try {
        const byApp = await listSecrets();
        if (cancelled) return;
        const names = byApp[currentApp] ?? [];
        setFilled(new Set(names));
        setKnownEmpty(true);
      } catch {
        if (!cancelled) setKnownEmpty(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiKeyState.clientId, currentApp, requiredSlots.length, listSecrets]);

  const missing = useMemo(
    () => requiredSlots.filter((s) => !filled.has(s.name)),
    [requiredSlots, filled],
  );

  const canSave =
    !saving && missing.every((s) => (values[s.name] ?? "").trim().length > 0);

  const handleSave = useCallback(async () => {
    if (!canSave || missing.length === 0) return;
    const payload: Record<string, string> = {};
    for (const s of missing) {
      const v = (values[s.name] ?? "").trim();
      if (v.length > 0) payload[s.name] = v;
    }
    if (Object.keys(payload).length === 0) return;

    setSaving(true);
    setError(null);
    try {
      await ingestSecrets(payload, currentApp);
      setFilled((prev) => {
        const next = new Set(prev);
        for (const name of Object.keys(payload)) next.add(name);
        return next;
      });
      setValues({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save secrets");
    } finally {
      setSaving(false);
    }
  }, [canSave, currentApp, ingestSecrets, missing, values]);

  // Pick a fallback app that has no unfilled required slots. The "default"
  // app conventionally has none; any other already-satisfied app is also
  // acceptable. Falls back to "default" even if descriptor lookup fails.
  const handleSwitchAway = useCallback(() => {
    const candidate = authState.appDescriptors.find(
      (d) =>
        d.name !== currentApp && (d.secrets ?? []).every((s) => !s.required),
    );
    onAppSelect(candidate?.name ?? "default");
  }, [currentApp, onAppSelect, authState.appDescriptors]);

  if (!knownEmpty || missing.length === 0) return null;

  return (
    <div
      className="bg-background/85 absolute inset-0 z-30 flex items-center justify-center backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="secret-gate-title"
    >
      <div className="bg-card border-input mx-4 w-full max-w-md rounded-3xl border p-6 shadow-2xl">
        <h2
          id="secret-gate-title"
          className="text-foreground mb-2 text-lg font-semibold"
        >
          <span className="capitalize">{currentApp}</span> needs API access
        </h2>
        <p className="text-muted-foreground mb-5 text-sm">
          {missing.length === 1
            ? "Provide this credential to use "
            : `Provide these ${missing.length} credentials to use `}
          <span className="capitalize">{currentApp}</span>. Values are stored
          only in the runtime vault for this browser and are never logged.
        </p>

        <div className="space-y-3">
          {missing.map((slot) => (
            <div key={slot.name}>
              <label
                htmlFor={`secret-gate-${slot.name}`}
                className="text-foreground mb-1 block font-mono text-xs"
              >
                {slot.name}
              </label>
              <p className="text-muted-foreground mb-1.5 text-xs">
                {slot.description}
              </p>
              <Input
                id={`secret-gate-${slot.name}`}
                type="password"
                autoComplete="off"
                value={values[slot.name] ?? ""}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    [slot.name]: event.target.value,
                  }))
                }
                placeholder="Paste your key"
                className="h-10 rounded-full px-4"
              />
            </div>
          ))}
        </div>

        {error && <p className="text-destructive mt-3 text-sm">{error}</p>}

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSwitchAway}
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
            Switch to another app
          </button>
          <Button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={!canSave}
            className="rounded-full px-5"
          >
            {saving ? "Saving..." : "Save & continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
