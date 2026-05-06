"use client";

import { settingsApiFetch } from "./settings-api";

const CLIENT_ID_STORAGE_KEY = "aomi_client_id";
const BYOK_KEYS_STORAGE_KEY = "aomi_byok_keys";

type StoredProviderKey = {
  apiKey: string;
  keyPrefix: string;
  label?: string;
};

type ProviderKeyEntry = {
  provider: string;
  key_prefix: string;
  label?: string | null;
  is_active: boolean;
};

type ListProviderKeysResponse = {
  byok_keys: ProviderKeyEntry[];
};

type SaveProviderKeyResponse = {
  key: ProviderKeyEntry;
};

type DeleteProviderKeyResponse = {
  deleted: boolean;
};

function normalizeStoredProviderKeys(
  value: unknown,
): Record<string, StoredProviderKey> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const normalized: Record<string, StoredProviderKey> = {};
  for (const [provider, entry] of entries) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const candidate = entry as Partial<StoredProviderKey>;
    if (
      typeof candidate.apiKey !== "string" ||
      typeof candidate.keyPrefix !== "string"
    ) {
      continue;
    }

    normalized[provider] = {
      apiKey: candidate.apiKey,
      keyPrefix: candidate.keyPrefix,
      label: typeof candidate.label === "string" ? candidate.label : undefined,
    };
  }

  return normalized;
}

function generateClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getOrCreateSettingsClientId(): string {
  if (typeof globalThis.localStorage === "undefined") {
    return "settings-server";
  }

  const existing = globalThis.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const next = generateClientId();
  globalThis.localStorage.setItem(CLIENT_ID_STORAGE_KEY, next);
  return next;
}

function readStoredProviderKeys(): Record<string, StoredProviderKey> {
  if (typeof globalThis.localStorage === "undefined") {
    return {};
  }

  try {
    const raw = globalThis.localStorage.getItem(BYOK_KEYS_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return normalizeStoredProviderKeys(JSON.parse(raw));
  } catch {
    return {};
  }
}

function writeStoredProviderKeys(keys: Record<string, StoredProviderKey>): void {
  if (typeof globalThis.localStorage === "undefined") {
    return;
  }

  if (Object.keys(keys).length > 0) {
    globalThis.localStorage.setItem(BYOK_KEYS_STORAGE_KEY, JSON.stringify(keys));
    return;
  }

  globalThis.localStorage.removeItem(BYOK_KEYS_STORAGE_KEY);
}

function saveStoredProviderKey(provider: string, apiKey: string, label?: string): void {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return;
  }

  const normalizedProvider = provider.trim().toLowerCase();
  const keys = readStoredProviderKeys();
  keys[normalizedProvider] = {
    apiKey: trimmed,
    keyPrefix: trimmed.slice(0, 7),
    label,
  };
  writeStoredProviderKeys(keys);
}

function removeStoredProviderKey(provider: string): void {
  const normalizedProvider = provider.trim().toLowerCase();
  const keys = readStoredProviderKeys();
  if (!(normalizedProvider in keys)) {
    return;
  }

  const rest = { ...keys };
  delete rest[normalizedProvider];
  writeStoredProviderKeys(rest);
}

export async function bindProviderKeysSession(): Promise<void> {
  const clientId = getOrCreateSettingsClientId();
  await settingsApiFetch<unknown>(`/api/state?client_id=${encodeURIComponent(clientId)}`);
}

export async function listProviderKeys(): Promise<ProviderKeyEntry[]> {
  await bindProviderKeysSession();
  const data = await settingsApiFetch<ListProviderKeysResponse>("/api/settings/provider-keys");
  return data.byok_keys ?? [];
}

export async function saveProviderKey(
  provider: string,
  apiKey: string,
  label?: string,
): Promise<ProviderKeyEntry> {
  await bindProviderKeysSession();
  const data = await settingsApiFetch<SaveProviderKeyResponse>("/api/settings/provider-keys", {
    method: "POST",
    body: JSON.stringify({
      provider,
      api_key: apiKey,
      label,
    }),
  });

  saveStoredProviderKey(
    data.key.provider,
    apiKey,
    data.key.label ?? label ?? undefined,
  );

  return data.key;
}

export async function deleteProviderKey(provider: string): Promise<boolean> {
  await bindProviderKeysSession();
  const data = await settingsApiFetch<DeleteProviderKeyResponse>(
    `/api/settings/provider-keys/${encodeURIComponent(provider)}`,
    {
      method: "DELETE",
    },
  );

  if (data.deleted) {
    removeStoredProviderKey(provider);
  }

  return data.deleted;
}
