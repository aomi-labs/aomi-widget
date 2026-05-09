"use client";

import { useCallback, useMemo, useState } from "react";
import { useControl } from "@aomi-labs/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openrouter", label: "OpenRouter" },
] as const;

/**
 * BYOK provider-key management.
 *
 * Runtime requirement: must be mounted inside a tree that provides
 * `ControlContextProvider` from `@aomi-labs/react` (already provided by
 * `<AomiFrame.Root>`). See portal's `settings-runtime-provider.tsx` for a
 * standalone settings-route reference impl.
 */
export function ProviderKeysSettings() {
  const { state, setProviderKey, removeProviderKey } = useControl();
  const [selectedProvider, setSelectedProvider] =
    useState<(typeof PROVIDERS)[number]["id"]>("openai");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const providerKeys = useMemo(
    () =>
      Object.entries(state.providerKeys).map(([provider, entry]) => ({
        provider,
        keyPrefix: entry.keyPrefix,
        label: entry.label,
      })),
    [state.providerKeys],
  );

  const canSave = useMemo(
    () => !saving && apiKeyInput.trim().length > 0,
    [apiKeyInput, saving],
  );

  const handleSave = useCallback(async () => {
    if (!canSave) return;

    setSaving(true);
    setStatus(null);
    try {
      await setProviderKey(
        selectedProvider,
        apiKeyInput.trim(),
        labelInput.trim() || undefined,
      );
      setApiKeyInput("");
      setLabelInput("");
      setStatus({ type: "success", text: "Provider key saved." });
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to save provider key",
      });
    } finally {
      setSaving(false);
    }
  }, [apiKeyInput, canSave, labelInput, selectedProvider, setProviderKey]);

  const handleDelete = useCallback(
    async (provider: string) => {
      setDeletingProvider(provider);
      setStatus(null);
      try {
        await removeProviderKey(provider);
        setStatus({ type: "success", text: `${provider} key removed.` });
      } catch (error) {
        setStatus({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Failed to delete provider key",
        });
      } finally {
        setDeletingProvider(null);
      }
    },
    [removeProviderKey],
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">BYOK</h2>
        <p className="text-muted-foreground text-sm">
          Store your own provider API keys for OpenAI, Anthropic, or OpenRouter.
          BYOK usage is recorded, but it does not consume Aomi credits.
        </p>
      </div>

      <section className="border-border bg-card space-y-4 rounded-2xl border p-6">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Add or Update Key</h2>
          <p className="text-muted-foreground text-sm">
            One active key is stored per provider. Saving a new one replaces the
            previous value. Keys are stored in your browser and synchronized
            with the backend vault.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map((provider) => {
            const active = selectedProvider === provider.id;
            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => setSelectedProvider(provider.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:border-foreground/40"
                }`}
              >
                {provider.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3">
          <Input
            value={labelInput}
            onChange={(event) => setLabelInput(event.target.value)}
            placeholder="Label (optional)"
          />
          <Input
            value={apiKeyInput}
            onChange={(event) => setApiKeyInput(event.target.value)}
            placeholder="Paste provider API key"
            type="password"
            autoComplete="off"
          />
        </div>

        <Button onClick={() => void handleSave()} disabled={!canSave}>
          {saving ? "Saving..." : "Save Key"}
        </Button>

        {status && (
          <p
            className={`text-sm ${
              status.type === "error" ? "text-destructive" : "text-emerald-600"
            }`}
          >
            {status.text}
          </p>
        )}
      </section>

      <section className="border-border bg-card space-y-4 rounded-2xl border p-6">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Stored Keys</h2>
          <p className="text-muted-foreground text-sm">
            Keys are mirrored in local browser state and synchronized with the
            backend vault.
          </p>
        </div>

        {providerKeys.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No provider keys saved.
          </p>
        ) : (
          <div className="space-y-3">
            {providerKeys.map((key) => (
              <div
                key={key.provider}
                className="border-border/80 bg-background flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">
                      {key.provider}
                    </span>
                    <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                      {key.keyPrefix}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {key.label?.trim() ? key.label : "No label"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={deletingProvider === key.provider}
                  onClick={() => void handleDelete(key.provider)}
                >
                  {deletingProvider === key.provider ? "Removing..." : "Delete"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
