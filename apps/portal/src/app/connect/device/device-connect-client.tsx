"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "@aomi-labs/account/better-auth/client";
import { useSearchParams } from "next/navigation";

export function DeviceConnectClient() {
  const params = useSearchParams();
  const userCode = params.get("user_code")?.trim() ?? "";
  const { data: session } = authClient.useSession();
  const [status, setStatus] = useState("Checking device code...");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!userCode) {
      setStatus("The device code is missing.");
      return;
    }
    if (!session?.session) {
      setStatus("Sign in to approve this device.");
      return;
    }
    void fetch(`/api/auth/device?user_code=${encodeURIComponent(userCode)}`, {
      credentials: "include",
    }).then(async (response) => {
      if (!response.ok) {
        setStatus("This device code is invalid or expired.");
        return;
      }
      const body = (await response.json()) as { status?: string };
      setReady(body.status === "pending");
      setStatus(
        body.status === "pending"
          ? "Approve the CLI to access your Aomi Agent sessions."
          : `This device request is already ${body.status ?? "complete"}.`,
      );
    });
  }, [session?.session, userCode]);

  const decide = useCallback(
    async (approve: boolean) => {
      setReady(false);
      setStatus(approve ? "Approving..." : "Denying...");
      const response = await fetch(
        `/api/auth/device/${approve ? "approve" : "deny"}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userCode }),
        },
      );
      setStatus(
        response.ok
          ? approve
            ? "Approved. You can return to the CLI."
            : "Denied. You can close this window."
          : "The device request could not be updated.",
      );
    },
    [userCode],
  );

  const returnTo = `/connect/device?user_code=${encodeURIComponent(userCode)}`;
  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Connect an Aomi device
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">{status}</p>
        {!session?.session && userCode ? (
          <a
            className="bg-foreground text-background mt-6 flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium"
            href={`/connect?return_to=${encodeURIComponent(returnTo)}`}
          >
            Sign in
          </a>
        ) : null}
        {ready ? (
          <div className="mt-6 grid gap-3">
            <button
              className="bg-foreground text-background h-11 rounded-md px-4 text-sm font-medium"
              onClick={() => void decide(true)}
              type="button"
            >
              Approve
            </button>
            <button
              className="border-border h-11 rounded-md border px-4 text-sm font-medium"
              onClick={() => void decide(false)}
              type="button"
            >
              Deny
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
