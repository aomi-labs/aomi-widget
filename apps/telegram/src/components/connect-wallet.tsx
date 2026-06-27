"use client";

import { useEffect, useRef, useState } from "react";
import { useModal } from "@getpara/react-sdk";
import { useAccount, useChainId, useDisconnect, useEnsName } from "wagmi";
import { Providers, initAppKit } from "./providers";
import {
  restore,
  persist,
  clear,
  clearLsWhitelisted,
  clearSessionWhitelisted,
  clearIdb,
} from "@/lib/session-bridge";
import { getTelegramUserId, readyTelegramWebApp } from "@/lib/telegram-webapp";
import {
  CONNECT_CONTEXT_KEY,
  CONNECT_CONTEXT_TTL_MS,
  FORCE_NEW_MARKER_PREFIX,
  FORCE_NEW_MARKER_TTL_MS,
  POST_DISCONNECT_MODAL_DELAY_MS,
  RESTORED_SESSION_OPEN_DELAY_MS,
  RESULT_URI_FALLBACK_OPEN_DELAY_MS,
  WALLET_PERSIST_DELAY_MS,
} from "@/lib/constants";

type ConnectContext = {
  userId?: string;
  forceNewToken?: string;
  ts: number;
};

function forceNewMarkerKey(
  forceNewToken: string,
  userId: string | undefined,
): string {
  return `${FORCE_NEW_MARKER_PREFIX}:${forceNewToken}:${userId ?? "anon"}`;
}

function wasForceNewAppliedRecently(markerKey: string): boolean {
  try {
    const raw = window.localStorage.getItem(markerKey);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < FORCE_NEW_MARKER_TTL_MS;
  } catch {
    return false;
  }
}

function markForceNewApplied(markerKey: string) {
  try {
    window.localStorage.setItem(markerKey, String(Date.now()));
  } catch {
    // ignore
  }
}

function readConnectContext(): ConnectContext | null {
  try {
    const raw = window.localStorage.getItem(CONNECT_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConnectContext;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Number.isFinite(parsed.ts)) return null;
    if (Date.now() - parsed.ts > CONNECT_CONTEXT_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConnectContext(partial: {
  userId?: string;
  forceNewToken?: string;
}) {
  const current = readConnectContext();
  const next: ConnectContext = {
    userId: partial.userId ?? current?.userId,
    forceNewToken: partial.forceNewToken ?? current?.forceNewToken,
    ts: Date.now(),
  };

  if (!next.userId && !next.forceNewToken) return;

  try {
    window.localStorage.setItem(CONNECT_CONTEXT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function ConnectContent({
  tgUserId,
  restoredSession,
  hasResultUri,
}: {
  tgUserId: string | undefined;
  restoredSession: boolean;
  hasResultUri: boolean;
}) {
  const { openModal } = useModal();
  const { address, isConnected, connector } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const chainId = useChainId();
  const { data: ensName } = useEnsName({
    address: address as `0x${string}` | undefined,
  });
  const prevConnected = useRef(false);
  const closeTimer = useRef<number | null>(null);
  const [shouldOpen, setShouldOpen] = useState(false);

  useEffect(() => {
    // Check if we should force disconnect first
    const params = new URLSearchParams(window.location.search);
    const forceNew = params.get("force_new") === "true";
    const forceNewToken = params.get("force_new_token") || "legacy";
    const markerKey = forceNewMarkerKey(forceNewToken, tgUserId);
    const alreadyApplied = forceNew && wasForceNewAppliedRecently(markerKey);

    if (forceNew && isConnected && !alreadyApplied) {
      // Disconnect wallet session first to force fresh wallet selection
      console.log("[connect] Forcing disconnect before new connection");
      disconnectAsync().then(() => {
        // Wait for wallet state to settle, then open modal
        setTimeout(() => {
          console.log("[connect] Opening modal after disconnect");
          openModal({ step: "AUTH_MAIN" });
        }, POST_DISCONNECT_MODAL_DELAY_MS);
      });
    } else if (hasResultUri) {
      // Returning from an external wallet can include `result_uri`.
      // Reopening connect too early can create a second WC proposal and
      // force users to approve twice. Give wallet state time to hydrate first,
      // then only reopen as a fallback.
      const timer = window.setTimeout(() => {
        if (!isConnected) {
          console.log(
            "[connect] result_uri fallback reached, reopening connect modal",
          );
          setShouldOpen(true);
        }
      }, RESULT_URI_FALLBACK_OPEN_DELAY_MS);
      return () => window.clearTimeout(timer);
    } else if (restoredSession) {
      // A forced-new session was already cleared for this attempt token.
      // Give restored state a brief chance to hydrate before reopening connect UI.
      const timer = window.setTimeout(() => {
        setShouldOpen(true);
      }, RESTORED_SESSION_OPEN_DELAY_MS);
      return () => window.clearTimeout(timer);
    } else {
      // Open the WalletConnect modal immediately — it IS the UI
      setShouldOpen(true);
    }
  }, [
    openModal,
    tgUserId,
    restoredSession,
    hasResultUri,
    isConnected,
    disconnectAsync,
  ]);

  useEffect(() => {
    if (shouldOpen && !isConnected) {
      openModal({ step: "AUTH_MAIN" });
    }
  }, [openModal, shouldOpen, isConnected]);

  useEffect(() => {
    if (!isConnected) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("result_uri")) return;
    url.searchParams.delete("result_uri");
    const next = `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""}${url.hash}`;
    window.history.replaceState({}, "", next);
    console.log("[connect] stripped result_uri after successful connection");
  }, [isConnected]);

  useEffect(() => {
    console.log(
      "[connect] effect: isConnected=%s address=%s prevConnected=%s",
      isConnected,
      address,
      prevConnected.current,
    );
    // Persist + sendData on every fresh connect (rising edge)
    if (!isConnected || !address) {
      prevConnected.current = false;
      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      return;
    }
    if (prevConnected.current || closeTimer.current) return;
    prevConnected.current = true;

    const source =
      connector?.name?.toLowerCase().replace(/\s+/g, "") || "nonTG";
    const userId = tgUserId || `${source}-${address}`;
    console.log(
      "[connect] rising edge detected! address=%s chainId=%s userId=%s connector=%s",
      address,
      chainId,
      userId,
      connector?.name,
    );

    // Fire backup POST immediately — don't wait for the 2s IDB delay.
    // If the user closes the WebView, at least the server knows about the connection.
    console.log("[connect] POSTing to /api/sessions/wallet user_id=%s", userId);
    fetch("/api/sessions/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        address,
        chainId,
        source: "mini_app",
      }),
    })
      .then((r) => console.log("[connect] POST response: %s", r.status))
      .catch((e) => console.warn("[connect] POST failed:", e));

    // Delay so wallet state finishes writing all IDB entries before we snapshot.
    // Do not block Telegram close on this best-effort persistence step.
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      if (tgUserId) void persist(tgUserId);
      if (window.Telegram?.WebApp?.sendData) {
        console.log("[connect] calling sendData");
        window.Telegram.WebApp.sendData(
          JSON.stringify({ address, chainId, ensName: ensName ?? null }),
        );
        window.Telegram.WebApp.close();
      } else {
        console.log("[dev] connected:", address, chainId, ensName);
      }
    }, WALLET_PERSIST_DELAY_MS);
  }, [isConnected, address, chainId, connector?.name, ensName, tgUserId]);

  // The wallet modal covers the screen — just show a dark background
  return <main className="min-h-screen bg-black" />;
}

export default function ConnectWallet() {
  const [ready, setReady] = useState(false);
  const [tgUserId, setTgUserId] = useState<string | undefined>();
  const [restoredSession, setRestoredSession] = useState(false);
  const [hasResultUri, setHasResultUri] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    readyTelegramWebApp();
    // Don't expand — keep the WebApp at compact height so the
    // Wallet modal fills the viewport without a huge gap at top.

    const params = new URLSearchParams(window.location.search);
    const isResultUriCallback = params.has("result_uri");
    const remembered = isResultUriCallback ? readConnectContext() : null;
    const userId = getTelegramUserId() || remembered?.userId;
    setTgUserId(userId);
    setHasResultUri(isResultUriCallback);
    const forceNew = params.get("force_new") === "true";
    const forceNewToken =
      params.get("force_new_token") || remembered?.forceNewToken || "legacy";
    writeConnectContext({
      userId,
      forceNewToken: forceNewToken === "legacy" ? undefined : forceNewToken,
    });
    console.log(
      "[connect] init: userId=%s forceNew=%s forceNewToken=%s hasResultUri=%s url=%s",
      userId,
      forceNew,
      forceNewToken,
      isResultUriCallback,
      window.location.href,
    );

    const init = async () => {
      if (forceNew) {
        const markerKey = forceNewMarkerKey(forceNewToken, userId);
        const alreadyApplied = wasForceNewAppliedRecently(markerKey);

        if (!alreadyApplied) {
          console.log("[connect] clearing session (force_new first apply)");
          if (userId) {
            await clear(userId);
          } else {
            clearLsWhitelisted();
            clearSessionWhitelisted();
            await clearIdb();
          }
          markForceNewApplied(markerKey);
          return false;
        }

        console.log(
          "[connect] force_new already applied for token, skipping clear",
        );
        const restored = userId ? await restore(userId) : false;
        console.log(
          "[connect] restore result after force_new token:",
          restored,
        );
        return restored;
      }
      const restored = userId ? await restore(userId) : false;
      console.log("[connect] restore result:", restored);
      return restored;
    };

    init().then((restored) => {
      setRestoredSession(restored);
      console.log("[connect] wallet providers ready");
      initAppKit();
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-white" />
      </main>
    );
  }

  return (
    <Providers>
      <ConnectContent
        tgUserId={tgUserId}
        restoredSession={restoredSession}
        hasResultUri={hasResultUri}
      />
    </Providers>
  );
}
