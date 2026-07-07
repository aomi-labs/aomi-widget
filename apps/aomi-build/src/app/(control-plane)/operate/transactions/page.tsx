import { Suspense } from "react";
import { OperatePlaceholder } from "@build/features/launch/components/deployments/operate-placeholder";

export default function OperateTransactionsPage() {
  return (
    <Suspense fallback={null}>
      <OperatePlaceholder
        title="Transactions"
        description="Global and project-scoped transaction views will land once the transaction indexer API is available."
      />
    </Suspense>
  );
}
