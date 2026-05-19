import { Suspense } from "react";
import { SolanaRuntimeDriver } from "../../../components/dev/solana-runtime-driver";

export default function SolanaRuntimeDriverPage() {
  return (
    <Suspense fallback={null}>
      <SolanaRuntimeDriver />
    </Suspense>
  );
}
