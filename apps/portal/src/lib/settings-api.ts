"use client";

const SETTINGS_SESSION_KEY = "aomi_settings_session_id";
const API_KEY_STORAGE_KEY = "aomi_api_key";
const CLIENT_ID_STORAGE_KEY = "aomi_client_id";

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `settings-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

export function getSettingsSessionId(): string {
  if (typeof window === "undefined") {
    return "settings-server";
  }

  const existing = window.localStorage.getItem(SETTINGS_SESSION_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const next = generateSessionId();
  window.localStorage.setItem(SETTINGS_SESSION_KEY, next);
  return next;
}

export function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";
}

export function getSettingsApiKey(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(API_KEY_STORAGE_KEY);
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function setSettingsApiKey(apiKey: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  const value = apiKey?.trim();
  if (value) {
    window.localStorage.setItem(API_KEY_STORAGE_KEY, value);
  } else {
    window.localStorage.removeItem(API_KEY_STORAGE_KEY);
  }
}

export async function settingsApiFetch<T>(
  path: string,
  options?: RequestInit & { apiKey?: string | null },
): Promise<T> {
  const { apiKey, ...requestInit } = options ?? {};
  const url = `${getBackendUrl()}${path}`;
  const headers = new Headers(requestInit.headers ?? {});
  headers.set("X-Session-Id", getSettingsSessionId());
  const resolvedApiKey = apiKey === undefined ? getSettingsApiKey() : apiKey?.trim() || null;
  if (resolvedApiKey) {
    headers.set("X-API-Key", resolvedApiKey);
  }
  if (!headers.has("Content-Type") && requestInit.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...requestInit,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function bindSettingsSession(options?: {
  publicKey?: string;
  chainId?: number | null;
}): Promise<void> {
  const clientId = getOrCreateSettingsClientId();
  await settingsApiFetch<{ session_id: string; title?: string | null }>(
    "/api/sessions",
    {
      method: "POST",
      body: JSON.stringify({
        client_id: clientId,
        public_key: options?.publicKey,
        chain_id: options?.chainId ?? undefined,
      }),
    },
  );
}
