"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { usePrivyDelegation } from "@aomi-labs/widget-lib";
import { useSearchParams } from "next/navigation";
import { PrivyDelegationShell } from "./privy-delegation-shell";

export function PrivyDelegationClient() {
  const params = useSearchParams();
  const request = useMemo(
    () => ({
      appId: params.get("app_id")?.trim() ?? "",
      signerId: params.get("signer_id")?.trim() ?? "",
      state: params.get("state")?.trim() ?? "",
    }),
    [params],
  );

  if (!request.appId || !request.signerId || !request.state) {
    return <PrivyDelegationShell status="Invalid Privy delegation request." />;
  }

  // The root Portal layout already owns the sole PrivyProvider. Mounting a
  // second wallet kit here makes the Privy SDK initialize IndexedDB twice and
  // causes its contexts to update each other while React is rendering.
  return <PrivyDelegationPanel request={request} />;
}

function PrivyDelegationPanel({
  request,
}: {
  request: { appId: string; signerId: string; state: string };
}) {
  // The ceremony itself lives in the wallet kit, beside the PrivyProvider whose
  // context it reads. Driving it from here rather than re-implementing it keeps
  // this page on the same Privy install as the rest of Portal.
  const { start } = usePrivyDelegation();
  const [status, setStatus] = useState("Sign in with Privy to authorize Aomi.");
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);

  const connect = useCallback(async () => {
    setPending(true);
    setStatus("Opening Privy...");
    try {
      await start({ state: request.state, signerId: request.signerId });
      setComplete(true);
      setStatus("Delegation connected. You can return to Aomi.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Delegation failed.");
    } finally {
      setPending(false);
    }
  }, [request.signerId, request.state, start]);

  return (
    <PrivyDelegationShell status={status}>
      <div className="mt-6">
        <button
          className="bg-foreground text-background flex h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending || complete}
          onClick={() => void connect()}
          type="button"
        >
          {complete ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {complete ? "Delegation connected" : "Continue with Privy"}
        </button>
      </div>
    </PrivyDelegationShell>
  );
}
