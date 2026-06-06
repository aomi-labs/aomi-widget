"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Wallet-driven dev harness: relies on browser-only providers (wagmi/Solana),
// so it must not be server-rendered or statically prerendered.
const SolanaRuntimeDriver = dynamic(
  () =>
    import("../../../components/dev/solana-runtime-driver").then(
      (m) => m.SolanaRuntimeDriver,
    ),
  { ssr: false },
);

export default function SolanaRuntimeDriverPage() {
  return (
    <Suspense fallback={null}>
      <SolanaRuntimeDriver />
    </Suspense>
  );
}
