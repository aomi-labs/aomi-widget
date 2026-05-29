import type { WalletFamily } from "./types";

export type WalletPreferences = {
  selectedFamily?: WalletFamily;
  selectedEvmChainId?: number;
  selectedSolanaNetworkId?: string;
};

const STORAGE_PREFIX = "aomi.wallet-preferences";

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}.${key}`;
}

export function loadWalletPreferences(key: string): WalletPreferences {
  try {
    const raw = globalThis.localStorage?.getItem(storageKey(key));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as WalletPreferences;
  } catch {
    return {};
  }
}

export function saveWalletPreferences(
  key: string,
  prefs: WalletPreferences,
): void {
  try {
    globalThis.localStorage?.setItem(storageKey(key), JSON.stringify(prefs));
  } catch {
    // localStorage unavailable or over quota — preferences are best-effort.
  }
}
