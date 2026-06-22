"use client";

import { useCallback } from "react";

const SETTINGS_SESSION_KEY = "aomi_settings_session_id";
const SECRET_STORAGE_KEY = "aomi_secret_key";
const DEFAULT_BACKEND_URL = "http://127.0.0.1:8080";

function normalizeBackendUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {
    // Fall through and return the raw string below.
  }
  return url;
}

function generateSessionId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `settings-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
  // Same-origin BFF proxy (Option 2): the browser calls `/api/*` on the portal,
  // which injects the AccountBearer from the session cookie and forwards
  // upstream (apps/portal/src/app/api/[...slug]/route.ts). An empty base makes
  // the client build same-origin relative URLs. Opt-in so existing deployments
  // that hit the backend directly are unchanged.
  if (process.env.NEXT_PUBLIC_AOMI_PROXY === "1") {
    return "";
  }
  return normalizeBackendUrl(
    process.env.NEXT_PUBLIC_BACKEND_URL ?? DEFAULT_BACKEND_URL,
  );
}

export function getSettingsSecret(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(SECRET_STORAGE_KEY);
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function setSettingsSecret(secret: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  const value = secret?.trim();
  if (value) {
    window.localStorage.setItem(SECRET_STORAGE_KEY, value);
  } else {
    window.localStorage.removeItem(SECRET_STORAGE_KEY);
  }
}

export async function settingsApiFetch<T>(
  path: string,
  options?: RequestInit & { secret?: string | null },
): Promise<T> {
  const { secret, ...requestInit } = options ?? {};
  const url = `${getBackendUrl()}${path}`;
  const headers = new Headers(requestInit.headers ?? {});
  headers.set("X-Session-Id", getSettingsSessionId());
  const resolvedSecret =
    secret === undefined ? getSettingsSecret() : secret?.trim() || null;
  if (resolvedSecret) {
    headers.set("Aomi-App-Key", resolvedSecret);
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

export function useAccountApiFetch() {
  return useCallback(
    async <T>(path: string, options?: RequestInit): Promise<T> => {
      void path;
      void options;
      throw new Error("Account settings require the portal account bridge.");
    },
    [],
  );
}
