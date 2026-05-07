"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteProviderKey,
  listProviderKeys,
  saveProviderKey,
} from "@/lib/provider-keys-api";

const PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openrouter", label: "OpenRouter" },
] as const;

type ProviderKeyEntry = {
  provider: string;
  key_prefix: string;
  label?: string | null;
  is_active: boolean;
};

export function ProviderKeysSettings() {
  const [selectedProvider, setSelectedProvider] = useState<(typeof PROVIDERS)[number]["id"]>("openai");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [providerKeys, setProviderKeys] = useState<ProviderKeyEntry[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadProviderKeys = useCallback(async () => {
    setLoadingKeys(true);
    setStatus(null);
    try {
      const keys = await listProviderKeys();
      setProviderKeys(keys);
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to load provider keys",
      });
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  useEffect(() => {
    void loadProviderKeys();
  }, [loadProviderKeys]);

  const canSave = useMemo(
    () => !saving && apiKeyInput.trim().length > 0,
    [apiKeyInput, saving],
  );

  const handleSave = useCallback(async () => {
    if (!canSave) return;

    setSaving(true);
    setStatus(null);
    try {
      await saveProviderKey(
        selectedProvider,
        apiKeyInput.trim(),
        labelInput.trim() || undefined,
      );
      setApiKeyInput("");
      setLabelInput("");
      await loadProviderKeys();
      setStatus({ type: "success", text: "Provider key saved." });
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save provider key",
      });
    } finally {
      setSaving(false);
    }
  }, [apiKeyInput, canSave, labelInput, loadProviderKeys, selectedProvider]);

  const handleDelete = useCallback(
    async (provider: string) => {
      setDeletingProvider(provider);
      setStatus(null);
      try {
        await deleteProviderKey(provider);
        await loadProviderKeys();
        setStatus({ type: "success", text: `${provider} key removed.` });
      } catch (error) {
        setStatus({
          type: "error",
          text: error instanceof Error ? error.message : "Failed to delete provider key",
        });
      } finally {
        setDeletingProvider(null);
      }
    },
    [loadProviderKeys],
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">BYOK</h2>
        <p className="text-sm text-muted-foreground">
          Store your own provider API keys for OpenAI, Anthropic, or
          OpenRouter. BYOK usage is recorded, but it does not consume Aomi
          credits.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Add or Update Key</h2>
          <p className="text-sm text-muted-foreground">
            One active key is stored per provider. Saving a new one replaces the previous value.
            Keys are stored in your browser and synchronized with the backend vault.
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
            className={`text-sm ${status.type === "error" ? "text-destructive" : "text-emerald-600"}`}
          >
            {status.text}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Stored Keys</h2>
          <p className="text-sm text-muted-foreground">
            Keys are fetched from the backend vault and mirrored in your browser&apos;s local storage.
          </p>
        </div>

        {loadingKeys ? (
          <p className="text-sm text-muted-foreground">Loading provider keys...</p>
        ) : providerKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No provider keys saved.</p>
        ) : (
          <div className="space-y-3">
            {providerKeys.map((key) => (
              <div
                key={key.provider}
                className="flex flex-col gap-3 rounded-xl border border-border/80 bg-background p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">{key.provider}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {key.key_prefix}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
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
