"use client";

/**
 * One shared /api/account overview for the settings surfaces.
 *
 * The session probe (aomi-session-bridge) seeds this store when its probe
 * succeeds, so opening Settings normally costs zero extra account fetches.
 * A consumer that mounts with an empty store (tests, direct embeds) triggers
 * a single deduplicated fetch instead of each component fetching on its own.
 */

import { useEffect, useSyncExternalStore } from "react";
import { settingsApiFetch } from "@portal/lib/settings-api";

export type AccountProfile = {
  user_id: string;
  public_key?: string;
  verified_email?: string | null;
};

export type AccountOverview = {
  user: AccountProfile;
};

let current: AccountOverview | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

/** Seed (or clear, with null) the shared overview — the session probe's job. */
export function seedAccountOverview(data: AccountOverview | null) {
  current = data;
  inflight = null;
  emit();
}

function loadOnce(): Promise<void> {
  if (current) return Promise.resolve();
  inflight ??= settingsApiFetch<AccountOverview>("/api/account")
    .then((data) => {
      current = data;
      emit();
    })
    .catch(() => {
      // Leave the store empty — consumers fall back to wallet-kit identity.
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

const subscribe = (callback: () => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};
const getSnapshot = () => current;
const getServerSnapshot = () => null;

export function useAccountOverview(): AccountOverview | null {
  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    if (!data) void loadOnce();
  }, [data]);
  return data;
}
