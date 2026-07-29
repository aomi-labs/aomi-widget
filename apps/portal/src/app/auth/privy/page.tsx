import { Suspense } from "react";
import { PrivyDelegationClient } from "./privy-delegation-client";
import { PrivyDelegationShell } from "./privy-delegation-shell";

export const dynamic = "force-dynamic";

export default function PrivyDelegationPage() {
  return (
    <Suspense fallback={<PrivyDelegationShell status="Loading Privy..." />}>
      <PrivyDelegationClient />
    </Suspense>
  );
}
