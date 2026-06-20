"use client";

import { useEffect, useMemo, useRef } from "react";
import type { WalletRegistryStore } from "../../../registry/store";

type ParaAccountSnapshot = {
  isConnected: boolean;
  embedded: {
    wallets?: Array<{ address?: string; chainId?: number | string }>;
  };
  external: {
    evm?: {
      address?: string;
      chainId?: number | string;
    };
  };
};

function normalizeChainId(value: number | string | undefined): number | null {
  if (value === undefined) return null;
  const chainId =
    typeof value === "string" && /^0x/i.test(value)
      ? Number.parseInt(value, 16)
      : Number(value);
  return Number.isInteger(chainId) && chainId > 0 ? chainId : null;
}

export function useParaSessionSource(
  store: WalletRegistryStore,
  opts: { paraAccount: ParaAccountSnapshot },
): void {
  const embeddedWallet = opts.paraAccount.embedded.wallets?.[0] as
    | { address?: string; chainId?: number | string }
    | undefined;
  const embeddedEvmAddress =
    opts.paraAccount.external.evm?.address ?? embeddedWallet?.address ?? null;
  const chainId =
    normalizeChainId(opts.paraAccount.external.evm?.chainId) ??
    normalizeChainId(embeddedWallet?.chainId);
  const snapshotKey = useMemo(
    () =>
      `${opts.paraAccount.isConnected ? "up" : "down"}:${
        embeddedEvmAddress?.toLowerCase() ?? ""
      }:${chainId ?? ""}`,
    [chainId, embeddedEvmAddress, opts.paraAccount.isConnected],
  );
  const previousKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (previousKeyRef.current === snapshotKey) return;
    previousKeyRef.current = snapshotKey;
    store.dispatch({
      type: "provider/embedded-session-changed",
      up: opts.paraAccount.isConnected,
      providerId: "para",
      uid: "para-session",
      stableId: "para",
      walletName: "Para",
      embeddedEvmAddress,
      chainId,
      now: Date.now(),
    });
  }, [
    chainId,
    embeddedEvmAddress,
    opts.paraAccount.isConnected,
    snapshotKey,
    store,
  ]);
}
