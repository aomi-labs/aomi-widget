"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

import { Providers, initAppKit } from "./providers";
import { restore } from "@/lib/session-bridge";
import { getTelegramUserId, readyTelegramWebApp } from "@/lib/telegram-webapp";

type Status = "loading" | "switching" | "done";

function SwitchContent({ restoreDone }: { restoreDone: boolean }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const [switchId, setSwitchId] = useState<string | null>(null);
  const [targetChainId, setTargetChainId] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const started = useRef(false);
  const [connectionSettled, setConnectionSettled] = useState(false);

  useEffect(() => {
    const url = new URLSearchParams(window.location.search);
    const sid = url.get("switch_id");
    if (sid) setSwitchId(sid);
  }, []);

  useEffect(() => {
    if (!switchId) return;
    (async () => {
      try {
        const resp = await fetch(
          `/api/operation/network?switch_id=${encodeURIComponent(switchId)}`,
        );
        const data = await resp.json();
        if (data.chainId) setTargetChainId(Number(data.chainId));
      } catch {
        // noop
      }
    })();
  }, [switchId]);

  useEffect(() => {
    if (!restoreDone) return;
    if (isConnected) {
      setConnectionSettled(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setConnectionSettled(true);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [restoreDone, isConnected]);

  useEffect(() => {
    if (!restoreDone || !switchId || !targetChainId) return;
    if (!connectionSettled) return;
    if (started.current) return;
    started.current = true;

    (async () => {
      setStatus("switching");

      if (!isConnected) {
        await fetch("/api/operation/network", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            switch_id: switchId,
            status: "failed",
            chain_id: targetChainId,
            error: "wallet_not_connected",
          }),
        }).catch(() => {});

        if (window.Telegram?.WebApp?.sendData) {
          window.Telegram.WebApp.sendData(
            JSON.stringify({
              switch_id: switchId,
              status: "failed",
              chainId: targetChainId,
              error: "wallet_not_connected",
            }),
          );
          window.Telegram.WebApp.close();
        }
        return;
      }

      try {
        if (chainId !== targetChainId) {
          await switchChainAsync({ chainId: targetChainId });
        }

        await fetch("/api/operation/network", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            switch_id: switchId,
            status: "switched",
            chain_id: targetChainId,
            address,
          }),
        });

        setStatus("done");
        if (window.Telegram?.WebApp?.sendData) {
          window.Telegram.WebApp.sendData(
            JSON.stringify({
              switch_id: switchId,
              status: "switched",
              chainId: targetChainId,
              address,
            }),
          );
          window.Telegram.WebApp.close();
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : "switch_failed";
        await fetch("/api/operation/network", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            switch_id: switchId,
            status: "failed",
            chain_id: targetChainId,
            address,
            error,
          }),
        }).catch(() => {});

        if (window.Telegram?.WebApp?.sendData) {
          window.Telegram.WebApp.sendData(
            JSON.stringify({
              switch_id: switchId,
              status: "failed",
              chainId: targetChainId,
              address,
              error,
            }),
          );
          window.Telegram.WebApp.close();
        }
      }
    })();
  }, [
    restoreDone,
    switchId,
    targetChainId,
    connectionSettled,
    isConnected,
    chainId,
    switchChainAsync,
    address,
  ]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-sm text-white">
      {status === "loading" && (
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-white" />
      )}
      {status !== "loading" && (
        <p className="max-w-[92vw] break-all px-4 text-center">
          Approve in your wallet...
        </p>
      )}
    </main>
  );
}

export default function SwitchNetwork() {
  const [ready, setReady] = useState(false);
  const [restoreDone, setRestoreDone] = useState(false);

  useEffect(() => {
    readyTelegramWebApp();
    const queryUserId = new URLSearchParams(window.location.search).get(
      "user_id",
    );
    const userId = getTelegramUserId() ?? queryUserId;
    const init = userId ? restore(userId) : Promise.resolve(false);
    init.then(() => {
      initAppKit();
      setReady(true);
      setRestoreDone(true);
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
      <SwitchContent restoreDone={restoreDone} />
    </Providers>
  );
}
