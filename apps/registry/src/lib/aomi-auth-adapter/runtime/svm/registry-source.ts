"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { WalletRegistryStore } from "../../registry/store";
import type { SafeSvmWalletState } from "./wallet-runtime";

const SVM_AUTOCONNECT_GRACE_MS = 400;

export function useSvmRegistrySource(
  store: WalletRegistryStore,
  opts: { svmWallet: SafeSvmWalletState },
): void {
  const pendingSvmWallet = useSyncExternalStore(
    (callback) => store.subscribe(callback),
    () => store.getSnapshot().intents.pendingSvmWallet,
    () => store.getSnapshot().intents.pendingSvmWallet,
  );
  const snapshotKey = useMemo(
    () =>
      `${opts.svmWallet.publicKey ?? ""}:${opts.svmWallet.walletName ?? ""}`,
    [opts.svmWallet.publicKey, opts.svmWallet.walletName],
  );
  const previousKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (previousKeyRef.current === snapshotKey) return;
    previousKeyRef.current = snapshotKey;
    store.dispatch({
      type: "svm/changed",
      publicKey: opts.svmWallet.publicKey ?? null,
      walletName: opts.svmWallet.walletName ?? null,
      now: Date.now(),
    });
  }, [opts.svmWallet.publicKey, opts.svmWallet.walletName, snapshotKey, store]);

  const connectAttemptObservedRef = useRef(false);
  useEffect(() => {
    connectAttemptObservedRef.current = false;
  }, [pendingSvmWallet]);

  useEffect(() => {
    if (!pendingSvmWallet) return;

    if (
      opts.svmWallet.publicKey &&
      opts.svmWallet.walletName === pendingSvmWallet
    ) {
      store.dispatch({
        type: "svm/connect-settled",
        walletName: pendingSvmWallet,
        now: Date.now(),
      });
      return;
    }

    if (opts.svmWallet.connecting) {
      connectAttemptObservedRef.current = true;
      return;
    }
    if (!opts.svmWallet.connect) return;
    if (opts.svmWallet.walletName !== pendingSvmWallet) {
      if (connectAttemptObservedRef.current) {
        store.dispatch({
          type: "svm/connect-settled",
          walletName: pendingSvmWallet,
          now: Date.now(),
        });
      }
      return;
    }

    if (connectAttemptObservedRef.current) {
      store.dispatch({
        type: "svm/connect-settled",
        walletName: pendingSvmWallet,
        now: Date.now(),
      });
      return;
    }

    const timer = window.setTimeout(() => {
      connectAttemptObservedRef.current = true;
      void opts.svmWallet.connect!()
        .catch((error) => {
          console.warn("[aomi-auth-adapter] SVM wallet connect failed", error);
        })
        .finally(() => {
          store.dispatch({
            type: "svm/connect-settled",
            walletName: pendingSvmWallet,
            now: Date.now(),
          });
        });
    }, SVM_AUTOCONNECT_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [
    opts.svmWallet.connect,
    opts.svmWallet.connecting,
    opts.svmWallet.publicKey,
    opts.svmWallet.walletName,
    pendingSvmWallet,
    store,
  ]);
}

export const useSolanaRegistrySource = (
  store: WalletRegistryStore,
  opts: { solanaWallet: SafeSvmWalletState },
): void => useSvmRegistrySource(store, { svmWallet: opts.solanaWallet });
