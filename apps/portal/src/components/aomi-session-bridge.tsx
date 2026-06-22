"use client";

import { useEffect, useRef } from "react";
import { useAomiAuthAdapter } from "@aomi-labs/widget-lib";

/**
 * Establishes the portal's `aomi_session` cookie once the user is authenticated.
 *
 * This is the trigger the proxy-inject design (Option 2) needs: on login, POST
 * the verified provider credential (Para/Privy) to the BFF exchange route, which
 * resolves the canonical user and sets an httpOnly `aomi_session` cookie. After
 * that, the same-origin `[...slug]` proxy injects the AccountBearer from that
 * cookie on every `/api/*` call — the browser holds nothing.
 *
 * Mounted app-wide inside `WalletProviders`, so it covers chat *and* settings
 * (the bug it fixes: `/settings` loaded with no session, so `/api/account*`
 * 401'd). Renders nothing.
 */
export function AomiSessionBridge() {
  const { identity, getAccountCredential } = useAomiAuthAdapter();
  const { isConnected, address } = identity;

  // The account key we've already established a session for; reset on disconnect.
  const establishedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isConnected) {
      establishedFor.current = null;
      return;
    }
    const key = address ?? "connected";
    if (establishedFor.current === key) return;
    if (!getAccountCredential) return;

    let cancelled = false;
    void (async () => {
      try {
        const credential = await getAccountCredential();
        if (!credential || cancelled) return;
        const response = await fetch("/api/account/sessions/exchange", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            provider: credential.provider,
            provider_token: credential.providerToken,
            // TMP(account-graph): the connected embedded wallet address. The
            // exchange only honors it for env-allowlisted test wallets, to bridge
            // returning wallet-first users to their existing sessions.
            address,
          }),
        });
        if (response.ok && !cancelled) {
          establishedFor.current = key;
        }
      } catch {
        // Leave unestablished; the effect retries when the auth state changes.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isConnected, address, getAccountCredential]);

  return null;
}
