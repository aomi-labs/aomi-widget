import { Suspense } from "react";
import { ParaSolanaRuntimeDriver } from "../../../components/dev/para-solana-runtime-driver";

export default function ParaSolanaRuntimeDriverPage() {
  return (
    <Suspense fallback={null}>
      <ParaSolanaRuntimeDriver />
    </Suspense>
  );
}
