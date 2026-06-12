import type { PersistedRegistryV1, WalletRegistryState } from "./types";
import { REGISTRY_STORAGE_KEY } from "./types";

const LEGACY_ACTIVE_EVM_ADDRESS_KEY = "aomi.wallet.active-evm-address";
const LEGACY_DETACHED_PARA_EVM_ADDRESS_KEY =
  "aomi.wallet.detached-para-evm-address";

export type LoadPersistedOptions = {
  migrateDestructively?: boolean;
};

function isPersistedRegistryV1(value: unknown): value is PersistedRegistryV1 {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PersistedRegistryV1>;
  return (
    candidate.version === 1 &&
    typeof candidate.active === "object" &&
    candidate.active !== null &&
    Array.isArray(candidate.droppedAddresses) &&
    typeof candidate.paraDetached === "boolean"
  );
}

function readStorage(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Best effort: wallet preferences should never break rendering.
  }
}

function removeStorage(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // Best effort.
  }
}

function migrateLegacyKeys(
  storageKey: string,
  options: LoadPersistedOptions,
): PersistedRegistryV1 | null {
  const legacyActiveEvm = readStorage(LEGACY_ACTIVE_EVM_ADDRESS_KEY);
  const legacyDetachedPara = readStorage(LEGACY_DETACHED_PARA_EVM_ADDRESS_KEY);
  if (!legacyActiveEvm && !legacyDetachedPara) return null;

  const migrated: PersistedRegistryV1 = {
    version: 1,
    active: legacyActiveEvm
      ? { evm: { address: legacyActiveEvm.toLowerCase() } }
      : {},
    droppedAddresses: legacyDetachedPara
      ? [legacyDetachedPara.toLowerCase()]
      : [],
    paraDetached: !!legacyDetachedPara,
  };

  writeStorage(storageKey, JSON.stringify(migrated));
  if (options.migrateDestructively) {
    removeStorage(LEGACY_ACTIVE_EVM_ADDRESS_KEY);
    removeStorage(LEGACY_DETACHED_PARA_EVM_ADDRESS_KEY);
  }
  return migrated;
}

export function loadPersisted(
  storageKey = REGISTRY_STORAGE_KEY,
  options: LoadPersistedOptions = {},
): PersistedRegistryV1 | null {
  try {
    const raw = readStorage(storageKey);
    if (!raw) return migrateLegacyKeys(storageKey, options);
    const parsed: unknown = JSON.parse(raw);
    return isPersistedRegistryV1(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function toPersisted(state: WalletRegistryState): PersistedRegistryV1 {
  return {
    version: 1,
    active: {
      ...(state.activeByFamily.evm
        ? {
            evm: {
              address: state.activeByFamily.evm.address.toLowerCase(),
              stableId: state.activeByFamily.evm.stableId,
            },
          }
        : {}),
      ...(state.activeByFamily.solana
        ? {
            solana: {
              address: state.activeByFamily.solana.address,
              stableId: state.activeByFamily.solana.stableId,
            },
          }
        : {}),
    },
    droppedAddresses: state.intents.droppedAddresses.map((item) =>
      item.toLowerCase(),
    ),
    paraDetached: state.intents.paraDetached,
  };
}

export function savePersisted(
  state: WalletRegistryState,
  storageKey = REGISTRY_STORAGE_KEY,
): void {
  writeStorage(storageKey, JSON.stringify(toPersisted(state)));
}

