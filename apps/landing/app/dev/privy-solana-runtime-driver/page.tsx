"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Wallet-driven dev harness: relies on browser-only providers (Privy + wagmi),
// so it must not be server-rendered or statically prerendered.
const PrivySolanaRuntimeDriver = dynamic(
  () =>
    import("../../../components/dev/privy-solana-runtime-driver").then(
      (m) => m.PrivySolanaRuntimeDriver,
    ),
  { ssr: false },
);

export default function PrivySolanaRuntimeDriverPage() {
  return (
    <Suspense fallback={null}>
      <PrivySolanaRuntimeDriver />
    </Suspense>
  );
}
