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
import { getAddress } from "viem";
import { createSiweMessage } from "viem/siwe";

import { useAomiAuthAdapter } from "../aomi-auth-adapter";
import type { AomiSessionStatus } from "./session-provider";

/**
 * SIWE (Sign-In With Ethereum) session bridge for wallets that have no embedded
 * provider JWT to exchange — notably base's Coinbase/Base **smart account**. It
 * proves wallet ownership by signing a server-issued nonce, then lets the BFF
 * mint the session from that proof (see `createSiweExchangeRoute` in
 * `@aomi-labs/account`). Publishes the same `AomiSessionStatus` lifecycle as
 * `AomiSessionProvider` so account-scoped UI gates identically.
 *
 * Flow on connect: `GET nonce` → build EIP-4361 message → wallet `signMessage`
 * → `POST verify` (sets `aomi_session`). Thereafter the same-origin proxy
 * injects the AccountBearer from the cookie; the browser holds nothing.
 */
const NONCE_PATH = "/api/bff/auth/siwe/nonce";
const VERIFY_PATH = "/api/bff/auth/siwe/verify";

const STATEMENT = "Sign in to Aomi.";

type AomiSessionContextValue = {
  status: AomiSessionStatus;
  retry: () => void;
};

const WalletSiweSessionContext = createContext<AomiSessionContextValue>({
  status: "ready",
  retry: () => {},
});

export function useWalletSiweSession(): AomiSessionContextValue {
  return useContext(WalletSiweSessionContext);
}

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

export function AomiWalletSiweSessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const adapter = useAomiAuthAdapter();
  const { identity, signMessage } = adapter;
  const { isConnected, address, chainId } = identity;

  const [status, setStatus] = useState<AomiSessionStatus>("anonymous");
  const establishedFor = useRef<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  // `signMessage` is a new identity each render; hold it in a ref and gate the
  // effect on its presence so the effect doesn't re-run every render.
  const signMessageRef = useRef(signMessage);
  useEffect(() => {
    signMessageRef.current = signMessage;
  }, [signMessage]);
  const canSign = Boolean(signMessage);

  const retry = useCallback(() => {
    establishedFor.current = null;
    setRetryNonce((nonce) => nonce + 1);
  }, []);

  useEffect(() => {
    if (!isConnected || !address) {
      establishedFor.current = null;
      setStatus("anonymous");
      return;
    }
    const key = address;
    if (establishedFor.current === key) {
      setStatus("ready");
      return;
    }
    if (!canSign || typeof chainId !== "number") {
      setStatus("error");
      return;
    }

    let cancelled = false;
    setStatus("establishing");
    void (async () => {
      try {
        const nonceResponse = await fetch(NONCE_PATH, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled) return;
        if (!nonceResponse.ok) {
          setStatus("error");
          return;
        }
        const { nonce } = (await nonceResponse.json()) as { nonce?: string };
        if (cancelled) return;
        if (!nonce) {
          setStatus("error");
          return;
        }

        const message = createSiweMessage({
          address: getAddress(address),
          chainId,
          domain: window.location.host,
          nonce,
          uri: window.location.origin,
          version: "1",
          statement: STATEMENT,
          issuedAt: new Date(),
        });

        const signed = await signMessageRef.current?.({
          non_typed_data: message,
          description: STATEMENT,
        });
        if (cancelled) return;
        if (!signed?.signature) {
          setStatus("error");
          return;
        }

        const response = await fetch(VERIFY_PATH, {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ message, signature: signed.signature }),
        });
        if (cancelled) return;
        if (response.ok) {
          establishedFor.current = key;
          setStatus("ready");
        } else if (response.status >= 500 && (await hasAccountSession())) {
          establishedFor.current = key;
          setStatus("ready");
        } else {
          setStatus("error");
        }
      } catch {
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
  }, [isConnected, address, chainId, canSign, retryNonce]);

  return (
    <WalletSiweSessionContext.Provider value={{ status, retry }}>
      {children}
    </WalletSiweSessionContext.Provider>
  );
}
