import { Suspense } from "react";
import { OperateView } from "@build/features/operate/operate-view";

export default function OperateObservabilityPage() {
  return (
    <Suspense fallback={null}>
      <OperateView kind="observability" />
    </Suspense>
  );
}
