"use client";

import { useCallback, useMemo, useState } from "react";
import { useByok } from "@aomi-labs/react";
import { Input } from "@aomi-labs/widget-lib";
import {
  SettingsEmpty,
  SettingsPanel,
  SettingsPill,
  SettingsRow,
  SettingsStatus,
} from "@portal/components/settings/settings-primitives";

const PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openrouter", label: "OpenRouter" },
] as const;

const inputClass =
  "border-border h-8 w-52 rounded-full border px-3 text-[12.5px] shadow-none sm:w-64";

export function Byok() {
  const { state, actions } = useByok();
  const { setByok, removeByok } = actions;
  const [selectedProvider, setSelectedProvider] =
    useState<(typeof PROVIDERS)[number]["id"]>("openai");
  const [byokInput, setByokInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState<string | null>(null);
  const [confirmDeleteProvider, setConfirmDeleteProvider] = useState<
    string | null
  >(null);
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
      setConfirmDeleteProvider(null);
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
    <SettingsPanel
      title="BYOK"
      description="Bring your own LLM provider keys. BYOK usage is recorded but does not consume Aomi credits."
    >
      {status ? (
        <SettingsStatus tone={status.type}>{status.text}</SettingsStatus>
      ) : null}

      <SettingsRow
        label="Provider"
        description="One active key per provider — saving replaces the previous value"
      >
        <div className="flex flex-wrap justify-end gap-1.5">
          {PROVIDERS.map((provider) => (
            <SettingsPill
              key={provider.id}
              tone={selectedProvider === provider.id ? "primary" : "default"}
              onClick={() => setSelectedProvider(provider.id)}
            >
              {provider.label}
            </SettingsPill>
          ))}
        </div>
      </SettingsRow>

      <SettingsRow label="Label" description="Optional name for this key">
        <Input
          value={labelInput}
          onChange={(event) => setLabelInput(event.target.value)}
          placeholder="Label (optional)"
          className={inputClass}
        />
      </SettingsRow>

      <SettingsRow
        label="API key"
        description="Your key, your billing — never shown again after save"
      >
        <Input
          value={byokInput}
          onChange={(event) => setByokInput(event.target.value)}
          placeholder="Paste provider key"
          type="password"
          autoComplete="off"
          className={inputClass}
        />
      </SettingsRow>

      <SettingsRow
        label="Save key"
        description="Synchronized with the backend vault"
      >
        <SettingsPill
          tone="primary"
          disabled={!canSave}
          onClick={() => void handleSave()}
        >
          {saving ? "Saving…" : "Save key"}
        </SettingsPill>
      </SettingsRow>

      {byokKeys.length === 0 ? (
        <SettingsEmpty
          title="No BYOK keys saved"
          description="Saved provider keys show up here with a masked preview."
        />
      ) : (
        byokKeys.map((key) => (
          <SettingsRow
            key={key.provider}
            label={key.label?.trim() ? key.label : key.provider}
            description="Your key, your billing — never shown again after save"
          >
            <span className="text-muted-foreground text-[12px] capitalize">
              {key.provider}
            </span>
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-mono text-xs">
              {key.keyPrefix}
            </span>
            <SettingsPill
              tone="danger"
              disabled={deletingProvider === key.provider}
              onClick={() => {
                if (confirmDeleteProvider === key.provider) {
                  void handleDelete(key.provider);
                } else {
                  setConfirmDeleteProvider(key.provider);
                }
              }}
            >
              {deletingProvider === key.provider
                ? "Removing…"
                : confirmDeleteProvider === key.provider
                  ? "Confirm?"
                  : "Delete"}
            </SettingsPill>
          </SettingsRow>
        ))
      )}
    </SettingsPanel>
  );
}
