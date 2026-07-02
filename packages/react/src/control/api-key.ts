// =============================================================================
// useApiKey — apiKey state, persistence, setter
// =============================================================================
//
// Pulled out of the 978-line ControlContextProvider. Owns nothing complex —
// a single `string | null`, two effects for localStorage round-trip, and the
// setter. The thing that used to make this "interesting" in the old file was
// the imperative `callbacks.current.forEach((cb) => cb(next))` pub/sub layer,
// which had no external consumers and is now deleted entirely.

import { useCallback, useEffect, useState } from "react";

const API_KEY_STORAGE_KEY = "aomi_secret_key";

export type ApiKeyState = {
  apiKey: string | null;
};

export type ApiKeyActions = {
  setApiKey: (apiKey: string | null) => void;
};

/** Provider-internal: owns the apiKey state. Consumers should use the
 *  `useApiKey` slice reader exported from contexts/control-context.tsx. */
export function useApiKeyImpl(): {
  state: ApiKeyState;
  actions: ApiKeyActions;
} {
  const [apiKey, setApiKeyInternal] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = globalThis.localStorage?.getItem(API_KEY_STORAGE_KEY);
      if (stored) setApiKeyInternal(stored);
    } catch {
      // localStorage not available
    }
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      if (apiKey) {
        globalThis.localStorage?.setItem(API_KEY_STORAGE_KEY, apiKey);
      } else {
        globalThis.localStorage?.removeItem(API_KEY_STORAGE_KEY);
      }
    } catch {
      // localStorage not available
    }
  }, [apiKey]);

  const setApiKey = useCallback((next: string | null) => {
    setApiKeyInternal(next === "" ? null : next);
  }, []);

  return {
    state: { apiKey },
    actions: { setApiKey },
  };
}
