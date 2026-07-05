"use client";

import { useCallback, useMemo, useState } from "react";
import { useByok } from "@aomi-labs/react";
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

const PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openrouter", label: "OpenRouter" },
] as const;

export function Byok() {
  const { state, actions } = useByok();
  const { setByok, removeByok } = actions;
  const [selectedProvider, setSelectedProvider] =
    useState<(typeof PROVIDERS)[number]["id"]>("openai");
  const [byokInput, setByokInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const byokKeys = useMemo(
    () =>
      Object.entries(state.byokKeys).map(([provider, entry]) => ({
        provider,
        keyPrefix: entry.keyPrefix,
        label: entry.label,
      })),
    [state.byokKeys],
  );

  const canSave = useMemo(
    () => !saving && byokInput.trim().length > 0,
    [byokInput, saving],
  );

  const handleSave = useCallback(async () => {
    if (!canSave) return;

    setSaving(true);
    setStatus(null);
    try {
      await setByok(
        selectedProvider,
        byokInput.trim(),
        labelInput.trim() || undefined,
      );
      setByokInput("");
      setLabelInput("");
      setStatus({ type: "success", text: "BYOK key saved." });
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to save BYOK key",
      });
    } finally {
      setSaving(false);
    }
  }, [byokInput, canSave, labelInput, selectedProvider, setByok]);

  const handleDelete = useCallback(
    async (provider: string) => {
      setDeletingProvider(provider);
      setStatus(null);
      try {
        await removeByok(provider);
        setStatus({ type: "success", text: `${provider} key removed.` });
      } catch (error) {
        setStatus({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Failed to delete BYOK key",
        });
      } finally {
        setDeletingProvider(null);
      }
    },
    [removeByok],
  );

  return (
    <div className={settingsPageClass}>
      <div className="space-y-4">
        <h1 className={settingsTitleClass}>BYOK</h1>
        <p className={settingsDescriptionClass}>
          Bring your own LLM provider keys for OpenAI, Anthropic, or OpenRouter.
          BYOK usage is recorded, but it does not consume Aomi credits.
        </p>
      </div>

      <section className={settingsCardStackClass}>
        <div className="space-y-2">
          <h2 className={settingsCardTitleClass}>Add or Update Key</h2>
          <p className={settingsBodyTextClass}>
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
                className={`${settingsPillClass} ${
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
            className={settingsInputClass}
          />
          <Input
            value={byokInput}
            onChange={(event) => setByokInput(event.target.value)}
            placeholder="Paste LLM provider key"
            type="password"
            autoComplete="off"
            className={settingsInputClass}
          />
        </div>

        <div className={settingsActionRowClass}>
          <Button
            onClick={() => void handleSave()}
            disabled={!canSave}
            className={settingsPrimaryButtonClass}
          >
            {saving ? "Saving..." : "Save Key"}
          </Button>
        </div>

        {status && (
          <p
            className={`${settingsStatusClass} ${
              status.type === "error"
                ? "border-destructive/20 bg-destructive/10 text-destructive"
                : "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400"
            }`}
          >
            {status.text}
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className={settingsSubTitleClass}>Stored Keys</h2>
          <p className={settingsBodyTextClass}>
            Keys are mirrored in local browser state and synchronized with the
            backend vault.
          </p>
        </div>

        <div className={settingsTableCardClass}>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-center">
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Preview</th>
                <th className="px-3 py-2">Label</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {byokKeys.length === 0 ? (
                <tr>
                  <td
                    className="text-muted-foreground px-3 py-4 text-center"
                    colSpan={4}
                  >
                    No BYOK keys saved.
                  </td>
                </tr>
              ) : (
                byokKeys.map((key) => (
                  <tr key={key.provider} className="border-border border-t">
                    <td className="text-foreground px-3 py-3 text-center font-medium capitalize">
                      {key.provider}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                        {key.keyPrefix}
                      </span>
                    </td>
                    <td className="text-muted-foreground px-3 py-3 text-center">
                      {key.label?.trim() ? key.label : "No label"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Button
                        variant="outline"
                        disabled={deletingProvider === key.provider}
                        onClick={() => void handleDelete(key.provider)}
                        className="rounded-full"
                      >
                        {deletingProvider === key.provider
                          ? "Removing..."
                          : "Delete"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
