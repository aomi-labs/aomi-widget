"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAomiAuthAdapter } from "@aomi-labs/widget-lib";
import { API_PATHS } from "@portal/lib/api-paths";

/**
 * Lifecycle of the portal's `aomi_session` cookie (Option 2, proxy-inject):
 *
 * - `anonymous`    — no wallet connected; nothing to exchange.
 * - `establishing` — connected; the provider-credential → session exchange is in flight.
 * - `ready`        — the exchange set the `aomi_session` cookie; `/api/account/*` will authenticate.
 * - `error`        — connected but the exchange failed (or there's no embedded credential to mint from).
 *
 * Account-scoped UI (settings) gates on `ready` so it never fires `/api/account/*`
 * before the cookie exists — otherwise the proxy forwards anonymous and the
 * backend 401s. Chat does not gate; it works anonymously.
 */
export type AomiSessionStatus =
  | "anonymous"
  | "establishing"
  | "ready"
  | "error";

type AomiSessionContextValue = {
  status: AomiSessionStatus;
  /** Re-run the exchange (e.g. after an `error`). */
  retry: () => void;
};

// Default for trees without a provider (e.g. the E2E wallet path, which mounts
// no bridge): treat as `ready` so the settings gate is a no-op there.
const AomiSessionContext = createContext<AomiSessionContextValue>({
  status: "ready",
  retry: () => {},
});

async function hasAccountSession(): Promise<boolean> {
  try {
    const response = await fetch("/api/account", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function useAomiSession(): AomiSessionContextValue {
  return useContext(AomiSessionContext);
}

/**
 * Establishes the portal's `aomi_session` cookie once the user is authenticated,
 * and publishes the lifecycle as session status for account-scoped UI to gate on.
 *
 * On login it POSTs the verified provider credential (Para/Privy) to the BFF
 * exchange route, which resolves the canonical user and sets an httpOnly
 * `aomi_session` cookie. After that, the same-origin `[...slug]` proxy injects
 * the AccountBearer from that cookie on every `/api/*` call — the browser holds
 * nothing. Mounted app-wide inside `WalletProviders`, so it covers chat *and*
 * settings (the bug it fixes: `/settings` loaded with no session, so
 * `/api/account*` 401'd).
 */
export function AomiSessionProvider({ children }: { children: ReactNode }) {
  const { identity, getEmbeddedCredential } = useAomiAuthAdapter();
  const { isConnected, address } = identity;

  const [status, setStatus] = useState<AomiSessionStatus>("anonymous");
  // The account key we've already established a session for; reset on disconnect.
  const establishedFor = useRef<string | null>(null);
  // Bumped by retry() to force the exchange effect to re-run.
  const [retryNonce, setRetryNonce] = useState(0);

  // The adapter returns a NEW `getEmbeddedCredential` identity every render, so
  // depending on it directly re-ran the exchange effect every render
  // (setStatus → re-render → re-run → "Maximum update depth" on connect). Hold
  // the latest getter in a ref and gate the effect on its *presence* instead.
  const getEmbeddedCredentialRef = useRef(getEmbeddedCredential);
  useEffect(() => {
    getEmbeddedCredentialRef.current = getEmbeddedCredential;
  }, [getEmbeddedCredential]);
  const hasEmbeddedCredential = Boolean(getEmbeddedCredential);

  const retry = useCallback(() => {
    establishedFor.current = null;
    setRetryNonce((nonce) => nonce + 1);
  }, []);

  useEffect(() => {
    if (!isConnected) {
      establishedFor.current = null;
      setStatus("anonymous");
      return;
    }
    const key = address ?? "connected";
    if (establishedFor.current === key) {
      setStatus("ready");
      return;
    }
    if (!hasEmbeddedCredential) {
      setStatus("error");
      return;
    }

    let cancelled = false;
    setStatus("establishing");
    void (async () => {
      try {
        const credential = await getEmbeddedCredentialRef.current?.();
        if (cancelled) return;
        if (!credential) {
          setStatus("error");
          return;
        }
        const response = await fetch(API_PATHS.bff.auth.exchange, {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            provider: credential.provider,
            provider_jwt: credential.providerJwt,
            // TMP(account-graph): the connected embedded wallet address. The
            // exchange bridges returning wallet-first users to their existing
            // sessions by this address (stopgap; superseded by the account-graph
            // refactor).
            address,
          }),
        });
        if (cancelled) return;
        if (response.ok) {
          establishedFor.current = key;
          setStatus("ready");
        } else if (response.status >= 500 && await hasAccountSession()) {
          establishedFor.current = key;
          setStatus("ready");
        } else {
          setStatus("error");
        }
      } catch {
        // Network/parse failure — surface as error; retry() (or an auth-state
        // change) re-runs the exchange.
        if (cancelled) return;
        if (await hasAccountSession()) {
          establishedFor.current = key;
          setStatus("ready");
        } else {
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isConnected, address, hasEmbeddedCredential, retryNonce]);

  return (
    <AomiSessionContext.Provider value={{ status, retry }}>
      {children}
    </AomiSessionContext.Provider>
  );
}
