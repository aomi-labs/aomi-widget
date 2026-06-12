"use client";

import { useEffect, useMemo, useRef } from "react";
import type { WalletRegistryStore } from "../../../registry/store";

type ParaAccountSnapshot = {
  isConnected: boolean;
  embedded: {
    wallets?: Array<{ address?: string }>;
  };
  external: {
    evm?: {
      address?: string;
    };
  };
};

export function useParaSessionSource(
  store: WalletRegistryStore,
  opts: { paraAccount: ParaAccountSnapshot },
): void {
  const embeddedWallet = opts.paraAccount.embedded.wallets?.[0] as
    | { address?: string }
    | undefined;
  const embeddedEvmAddress =
    opts.paraAccount.external.evm?.address ??
    embeddedWallet?.address ??
    null;
  const snapshotKey = useMemo(
    () =>
      `${opts.paraAccount.isConnected ? "up" : "down"}:${
        embeddedEvmAddress?.toLowerCase() ?? ""
      }`,
    [embeddedEvmAddress, opts.paraAccount.isConnected],
  );
  const previousKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (previousKeyRef.current === snapshotKey) return;
    previousKeyRef.current = snapshotKey;
    store.dispatch({
      type: "para/session-changed",
      up: opts.paraAccount.isConnected,
      embeddedEvmAddress,
      now: Date.now(),
    });
  }, [embeddedEvmAddress, opts.paraAccount.isConnected, snapshotKey, store]);
}

