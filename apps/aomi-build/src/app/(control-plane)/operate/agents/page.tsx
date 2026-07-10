import { Suspense } from "react";
import { OperateView } from "@build/features/operate/operate-view";

export default function OperateAgentsPage() {
  return (
    <Suspense fallback={null}>
      <OperateView kind="agents" />
    </Suspense>
  );
}
