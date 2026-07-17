import { Suspense } from "react";
import { OperateView } from "@build/features/operate/operate-view";

export default function OperateTransactionsPage() {
  return (
    <Suspense fallback={null}>
      <OperateView kind="transactions" />
    </Suspense>
  );
}
