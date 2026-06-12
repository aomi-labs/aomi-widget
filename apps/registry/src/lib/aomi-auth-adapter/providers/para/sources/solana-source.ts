"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { WalletRegistryStore } from "../../../registry/store";
import type { SafeSolanaWalletState } from "../para-sol";

const SOLANA_AUTOCONNECT_GRACE_MS = 400;

export function useSolanaRegistrySource(
  store: WalletRegistryStore,
  opts: { solanaWallet: SafeSolanaWalletState },
): void {
  const pendingSolanaWallet = useSyncExternalStore(
    (callback) => store.subscribe(callback),
    () => store.getSnapshot().intents.pendingSolanaWallet,
    () => store.getSnapshot().intents.pendingSolanaWallet,
  );
  const snapshotKey = useMemo(
    () =>
      `${opts.solanaWallet.publicKey ?? ""}:${
        opts.solanaWallet.walletName ?? ""
      }`,
    [opts.solanaWallet.publicKey, opts.solanaWallet.walletName],
  );
  const previousKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (previousKeyRef.current === snapshotKey) return;
    previousKeyRef.current = snapshotKey;
    store.dispatch({
      type: "solana/changed",
      publicKey: opts.solanaWallet.publicKey ?? null,
      walletName: opts.solanaWallet.walletName ?? null,
      now: Date.now(),
    });
  }, [
    opts.solanaWallet.publicKey,
    opts.solanaWallet.walletName,
    snapshotKey,
    store,
  ]);

  const connectAttemptObservedRef = useRef(false);
  useEffect(() => {
    connectAttemptObservedRef.current = false;
  }, [pendingSolanaWallet]);

  useEffect(() => {
    if (!pendingSolanaWallet) return;

    if (
      opts.solanaWallet.publicKey &&
      opts.solanaWallet.walletName === pendingSolanaWallet
    ) {
      store.dispatch({
        type: "solana/connect-settled",
        walletName: pendingSolanaWallet,
        now: Date.now(),
      });
      return;
    }

    if (opts.solanaWallet.connecting) {
      connectAttemptObservedRef.current = true;
      return;
    }
    if (!opts.solanaWallet.connect) return;
    if (opts.solanaWallet.walletName !== pendingSolanaWallet) {
      if (connectAttemptObservedRef.current) {
        store.dispatch({
          type: "solana/connect-settled",
          walletName: pendingSolanaWallet,
          now: Date.now(),
        });
      }
      return;
    }

    if (connectAttemptObservedRef.current) {
      store.dispatch({
        type: "solana/connect-settled",
        walletName: pendingSolanaWallet,
        now: Date.now(),
      });
      return;
    }

    const timer = window.setTimeout(() => {
      connectAttemptObservedRef.current = true;
      void opts.solanaWallet
        .connect!()
        .catch((error) => {
          console.warn(
            "[aomi-auth-adapter] Solana wallet connect failed",
            error,
          );
        })
        .finally(() => {
          store.dispatch({
            type: "solana/connect-settled",
            walletName: pendingSolanaWallet,
            now: Date.now(),
          });
        });
    }, SOLANA_AUTOCONNECT_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [
    opts.solanaWallet.connect,
    opts.solanaWallet.connecting,
    opts.solanaWallet.publicKey,
    opts.solanaWallet.walletName,
    pendingSolanaWallet,
    store,
  ]);
}
