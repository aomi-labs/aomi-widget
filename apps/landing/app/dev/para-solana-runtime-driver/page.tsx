"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Wallet-driven dev harness: relies on browser-only providers (Para/Privy +
// wagmi), so it must not be server-rendered or statically prerendered.
const ParaSolanaRuntimeDriver = dynamic(
  () =>
    import("../../../components/dev/para-solana-runtime-driver").then(
      (m) => m.ParaSolanaRuntimeDriver,
    ),
  { ssr: false },
);

export default function ParaSolanaRuntimeDriverPage() {
  return (
    <Suspense fallback={null}>
      <ParaSolanaRuntimeDriver />
    </Suspense>
  );
}
