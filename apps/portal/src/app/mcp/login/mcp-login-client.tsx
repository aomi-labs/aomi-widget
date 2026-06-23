"use client";

import { useEffect, useState } from "react";
import { useAomiAuthAdapter } from "@aomi-labs/widget-lib";
import { useAomiSession } from "@portal/components/aomi-session-bridge";

export function McpLoginClient({ returnTo }: { returnTo: string }) {
  const adapter = useAomiAuthAdapter();
  const session = useAomiSession();
  const identity = adapter.identity;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (identity.isConnected && session.status === "ready") {
      window.location.href = `/api/auth/aomi/session?return_to=${encodeURIComponent(returnTo)}`;
    }
  }, [identity.isConnected, returnTo, session.status]);

  const isConnecting =
    identity.status === "booting" ||
    adapter.isSwitchingChain ||
    session.status === "establishing" ||
    isSubmitting;

  const signIn = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await adapter.connect();

      const credential = await adapter.getEmbeddedCredential?.();
      if (!credential) {
        throw new Error(
          "Sign-in completed, but Aomi could not read the provider credential yet. Try again in a moment.",
        );
      }

      const response = await fetch("/api/account/sessions/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          provider: credential.provider,
          provider_jwt: credential.providerJwt,
          application: "default",
          address: identity.address,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          body && typeof body.error === "string"
            ? body.error
            : "Could not establish an Aomi account session.";
        throw new Error(message);
      }

      window.location.href = `/api/auth/aomi/session?return_to=${encodeURIComponent(returnTo)}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="bg-background text-foreground flex h-full items-center justify-center px-6">
      <section className="border-input w-full max-w-md rounded-lg border p-8">
        <h1 className="text-xl font-semibold">Connect Aomi to Claude</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Sign in with your Aomi account to authorize Claude to use the Aomi MCP
          server.
        </p>
        <button
          type="button"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
          disabled={isConnecting || !adapter.canConnect}
          onClick={() => void signIn()}
        >
          {isConnecting ? "Connecting..." : "Sign in"}
        </button>
        {error ? (
          <p className="text-destructive mt-3 text-sm" role="alert">
            {error}
          </p>
        ) : null}
        {session.status === "error" ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground mt-3 text-sm"
            onClick={session.retry}
          >
            Retry account session
          </button>
        ) : null}
      </section>
    </main>
  );
}
