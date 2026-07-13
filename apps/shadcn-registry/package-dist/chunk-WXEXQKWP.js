"use client";

// src/lib/wallet-kit/providers/sources/embedded-session-source.ts
import { useEffect, useMemo, useRef } from "react";
function useEmbeddedSessionSource(store, snapshot) {
  const {
    chainId,
    embeddedEvmAddress,
    providerId,
    stableId,
    uid,
    up,
    walletName
  } = snapshot;
  const snapshotKey = useMemo(
    () => `${up ? "up" : "down"}:${providerId}:${uid}:${stableId}:${walletName}:${embeddedEvmAddress?.toLowerCase() ?? ""}:${chainId ?? ""}`,
    [chainId, embeddedEvmAddress, providerId, stableId, uid, up, walletName]
  );
  const previousKeyRef = useRef(null);
  useEffect(() => {
    if (previousKeyRef.current === snapshotKey) return;
    previousKeyRef.current = snapshotKey;
    store.dispatch({
      type: "provider/embedded-session-changed",
      up,
      providerId,
      uid,
      stableId,
      walletName,
      embeddedEvmAddress,
      chainId,
      now: Date.now()
    });
  }, [
    chainId,
    embeddedEvmAddress,
    providerId,
    stableId,
    store,
    snapshotKey,
    uid,
    up,
    walletName
  ]);
}

export {
  useEmbeddedSessionSource
};
//# sourceMappingURL=chunk-WXEXQKWP.js.map