"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@aomi-labs/account/better-auth/client";
import { useAomiWalletKit } from "@aomi-labs/widget-lib";

export function OAuthDeviceClient() {
  const params = useSearchParams();
  const wallet = useAomiWalletKit();
  const { data: session } = authClient.useSession();
  const [code, setCode] = useState(params.get("user_code") ?? "");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    setPending(true);
    try {
      await wallet.connectSocial?.("google");
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const credential = await wallet
          .getAccountCredential?.()
          .catch(() => null);
        if (credential) {
          const response = await fetch("/api/auth/aomi/provider/exchange", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "include",
            body: JSON.stringify(credential),
          });
          if (!response.ok) throw new Error("Sign-in failed");
          window.location.reload();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error("Timed out waiting for sign-in");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sign-in failed");
      setPending(false);
    }
  }, [wallet]);

  const decide = useCallback(
    async (accept: boolean) => {
      setPending(true);
      const response = await fetch(
        `/api/auth/device/${accept ? "approve" : "deny"}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userCode: code.trim().toUpperCase() }),
        },
      );
      setStatus(
        response.ok
          ? accept
            ? "Device authorized. You can return to the CLI."
            : "Device request denied."
          : `Authorization failed (HTTP ${response.status})`,
      );
      setPending(false);
    },
    [code],
  );

  useEffect(() => setCode(params.get("user_code") ?? code), [params]);

  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Authorize Aomi CLI</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Confirm that the code shown by your CLI matches.
        </p>
        <input
          className="border-border mt-5 h-11 w-full rounded-md border px-3 font-mono uppercase"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        {status ? (
          <p className="text-muted-foreground mt-4 text-sm">{status}</p>
        ) : null}
        {session?.session ? (
          <div className="mt-6 grid gap-3">
            <button
              disabled={pending || !code.trim()}
              className="bg-foreground text-background h-11 rounded-md"
              onClick={() => void decide(true)}
            >
              Authorize device
            </button>
            <button
              disabled={pending}
              className="border-border h-11 rounded-md border"
              onClick={() => void decide(false)}
            >
              Deny
            </button>
          </div>
        ) : (
          <button
            disabled={pending}
            className="bg-foreground text-background mt-6 h-11 w-full rounded-md"
            onClick={() => void signIn()}
          >
            Sign in to continue
          </button>
        )}
      </section>
    </main>
  );
}
