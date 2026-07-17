// =============================================================================
// useByok — BYOK provider keys + secret vault API
// =============================================================================
//
// Two responsibilities that travel together because of how the backend
// vault is laid out:
//
//   1. BYOK keys — locally-stored LLM provider keys (OpenAI, Anthropic…)
//      that are mirrored into the backend secret vault under a stable
//      `PROVIDER_KEY:` prefix.
//
//   2. Generic secret vault API — `ingestSecrets`, `clearSecrets`,
//      `deleteSecret`, `listSecrets`. Used by BYOK above, but also exposed
//      directly to apps that need to push or wipe per-app secrets.
//
// They're in the same hook because the BYOK actions internally call the
// vault API (e.g. `setByok` ingests under the `PROVIDER_KEY:` prefix). If
// they lived in separate hooks the BYOK side would have to call back into
// the vault side anyway, so the seam wouldn't buy anything.

import { useCallback, useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import type { AomiClient } from "@aomi-labs/client";

const BYOK_KEYS_STORAGE_KEY = "aomi_byok_keys";
const BYOK_SECRET_PREFIX = "PROVIDER_KEY:";

export type StoredByokKey = {
  apiKey: string;
  keyPrefix: string;
  label?: string;
};

export type ByokState = {
  byokKeys: Record<string, StoredByokKey>;
};

export type SecretsActions = {
  ingestSecrets: (
    secrets: Record<string, string>,
    app?: string,
  ) => Promise<Record<string, string>>;
  clearSecrets: (app?: string) => Promise<void>;
  deleteSecret: (name: string, app?: string) => Promise<void>;
  listSecrets: () => Promise<Record<string, string[]>>;
};

export type ByokActions = SecretsActions & {
  setByok: (
    provider: string,
    apiKey: string,
    label?: string,
  ) => Promise<void>;
  removeByok: (provider: string) => Promise<void>;
  getByokKeys: () => Record<string, StoredByokKey>;
  hasByok: (provider?: string) => boolean;
};

type UseByokOptions = {
  aomiClientRef: MutableRefObject<AomiClient>;
  clientIdRef: MutableRefObject<string | null>;
  /** Stable getter for the current control-session id (clientId + sessionId). */
  getControlSessionId: () => string;
};

/** Provider-internal: owns the BYOK state. Consumers should use the
 *  `useByok` slice reader exported from contexts/control-context.tsx. */
export function useByokImpl({
  aomiClientRef,
  clientIdRef,
  getControlSessionId,
}: UseByokOptions): {
  state: ByokState;
  actions: ByokActions;
} {
  const [byokKeys, setByokKeys] = useState<Record<string, StoredByokKey>>({});

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = globalThis.localStorage?.getItem(BYOK_KEYS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, StoredByokKey>;
        setByokKeys(parsed);
      }
    } catch {
      // localStorage not available or invalid JSON
    }
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      if (Object.keys(byokKeys).length > 0) {
        globalThis.localStorage?.setItem(
          BYOK_KEYS_STORAGE_KEY,
          JSON.stringify(byokKeys),
        );
      } else {
        globalThis.localStorage?.removeItem(BYOK_KEYS_STORAGE_KEY);
      }
    } catch {
      // localStorage not available
    }
  }, [byokKeys]);

  // Auto-ingest BYOK keys into backend vault whenever the local set
  // changes (or the clientId becomes available for the first time).
  useEffect(() => {
    const clientId = clientIdRef.current;
    if (!clientId) return;
    if (Object.keys(byokKeys).length === 0) return;

    const secrets: Record<string, string> = {};
    for (const [provider, entry] of Object.entries(byokKeys)) {
      secrets[`${BYOK_SECRET_PREFIX}${provider}`] = entry.apiKey;
    }

    void aomiClientRef.current
      .ingestSecrets(getControlSessionId(), clientId, secrets)
      .catch((err: unknown) => {
        console.error("Failed to auto-ingest BYOK keys:", err);
      });
    // clientIdRef is a ref; reading inside the effect is fine, but we
    // intentionally do NOT depend on it (it's stable across renders).
  }, [aomiClientRef, byokKeys, getControlSessionId]);

  // ---------------------------------------------------------------------------
  // Secret vault API
  // ---------------------------------------------------------------------------

  const ingestSecrets = useCallback(
    async (
      secrets: Record<string, string>,
      app?: string,
    ): Promise<Record<string, string>> => {
      const clientId = clientIdRef.current;
      if (!clientId) throw new Error("clientId not initialized");
      const { handles } = await aomiClientRef.current.ingestSecrets(
        getControlSessionId(),
        clientId,
        secrets,
        app,
      );
      return handles;
    },
    [aomiClientRef, clientIdRef, getControlSessionId],
  );

  const clearSecrets = useCallback(
    async (app?: string): Promise<void> => {
      const clientId = clientIdRef.current;
      if (!clientId) return;
      await aomiClientRef.current.clearSecrets?.(
        getControlSessionId(),
        clientId,
        app,
      );
    },
    [aomiClientRef, clientIdRef, getControlSessionId],
  );

  const deleteSecret = useCallback(
    async (name: string, app?: string): Promise<void> => {
      const clientId = clientIdRef.current;
      if (!clientId) return;
      await aomiClientRef.current.deleteSecret(
        getControlSessionId(),
        clientId,
        name,
        app,
      );
    },
    [aomiClientRef, clientIdRef, getControlSessionId],
  );

  const listSecrets = useCallback(async (): Promise<
    Record<string, string[]>
  > => {
    const { by_app } = await aomiClientRef.current.listSecrets(
      getControlSessionId(),
      clientIdRef.current ?? undefined,
    );
    return by_app;
  }, [aomiClientRef, clientIdRef, getControlSessionId]);

  // ---------------------------------------------------------------------------
  // BYOK API
  // ---------------------------------------------------------------------------

  const setByok = useCallback(
    async (
      provider: string,
      apiKey: string,
      label?: string,
    ): Promise<void> => {
      const trimmed = apiKey.trim();
      if (!trimmed) return;

      const entry: StoredByokKey = {
        apiKey: trimmed,
        keyPrefix: trimmed.slice(0, 7),
        label,
      };

      setByokKeys((prev) => ({ ...prev, [provider]: entry }));

      const clientId = clientIdRef.current;
      if (clientId) {
        try {
          await aomiClientRef.current.ingestSecrets(
            getControlSessionId(),
            clientId,
            { [`${BYOK_SECRET_PREFIX}${provider}`]: trimmed },
          );
        } catch (err) {
          console.error("Failed to ingest BYOK key:", err);
        }
      }
    },
    [aomiClientRef, clientIdRef, getControlSessionId],
  );

  const removeByok = useCallback(
    async (provider: string): Promise<void> => {
      const clientId = clientIdRef.current;
      if (clientId) {
        await aomiClientRef.current.deleteSecret(
          getControlSessionId(),
          clientId,
          `${BYOK_SECRET_PREFIX}${provider}`,
        );
      }
      setByokKeys((prev) => {
        const { [provider]: _, ...rest } = prev;
        return rest;
      });
    },
    [aomiClientRef, clientIdRef, getControlSessionId],
  );

  const getByokKeys = useCallback(
    () => byokKeys,
    [byokKeys],
  );

  const hasByok = useCallback(
    (provider?: string): boolean => {
      if (provider) return provider in byokKeys;
      return Object.keys(byokKeys).length > 0;
    },
    [byokKeys],
  );

  return {
    state: { byokKeys },
    actions: {
      setByok,
      removeByok,
      getByokKeys,
      hasByok,
      ingestSecrets,
      clearSecrets,
      deleteSecret,
      listSecrets,
    },
  };
}
