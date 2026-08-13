"use client";

import "@aomi-labs/widget-lib/providers/para";
import "@aomi-labs/widget-lib/providers/privy";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { AomiWalletKitProvider, useAomiWalletKit } from "@aomi-labs/widget-lib";
import { authClient } from "@aomi-labs/account/better-auth/client";
import {
  providerExchangeError,
  waitForProviderCredential,
} from "./provider-credential";

type Provider = "privy" | "para";

const providerLabels = { privy: "Privy", para: "Para" } as const;

const STASH_KEY = "aomi.mcp.authorize.query";

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  openid: "Confirm your Aomi identity",
  profile: "Read your basic profile",
  email: "Read your email address",
  offline_access: "Stay connected between sessions",
};

/**
 * One page, two phases of the MCP OAuth ceremony (better-auth `mcp` plugin):
 *
 * 1. `loginPage` — an unauthenticated `/api/auth/mcp/authorize` redirects
 *    here with the full OAuth query. Sign in (same provider mechanics as
 *    device-auth), then resume the stashed authorize request.
 * 2. `consentPage` — an authenticated authorize with `prompt=consent`
 *    redirects here with `consent_code` + `client_id` + `scope`. Approve or
 *    deny via `POST /api/auth/oauth2/consent`, then follow `redirectURI`
 *    back to the MCP client's callback.
 */
export function McpConnectClient({
  clientName,
}: {
  clientName: string | null;
}) {
  const params = useSearchParams();
  const consentCode = params.get("consent_code");
  const isAuthorizeRequest =
    params.get("response_type") === "code" && Boolean(params.get("client_id"));

  if (consentCode) {
    return (
      <ConsentPanel
        clientName={clientName}
        consentCode={consentCode}
        scopes={(params.get("scope") ?? "").split(" ").filter(Boolean)}
      />
    );
  }
  if (isAuthorizeRequest) {
    return <SignInPanel clientName={clientName} />;
  }
  return (
    <Shell title="Connect to Aomi">
      <p className="text-muted-foreground mt-3 text-sm">
        Nothing to authorize. Start the connection from your MCP client (for
        example `/mcp` in Claude Code), and it will send you here.
      </p>
    </Shell>
  );
}

// ─── Phase 1: sign in, then resume the authorize request ───────────────────

function SignInPanel({ clientName }: { clientName: string | null }) {
  const { data: session } = authClient.useSession();
  const [provider, setProvider] = useState<Provider | null>(null);

  // Stash the authorize query before any login flow rewrites the URL.
  useEffect(() => {
    sessionStorage.setItem(STASH_KEY, window.location.search);
  }, []);

  // Already signed in (or just finished): resume the authorize request —
  // it comes back here as a consent request.
  useEffect(() => {
    if (!session?.session) return;
    const query = sessionStorage.getItem(STASH_KEY) ?? window.location.search;
    sessionStorage.removeItem(STASH_KEY);
    window.location.replace(`/api/auth/mcp/authorize${query}`);
  }, [session?.session]);

  const title = clientName
    ? `Connect ${clientName} to Aomi`
    : "Connect to Aomi";

  if (session?.session) {
    return (
      <Shell title={title}>
        <p className="text-muted-foreground mt-3 text-sm">
          Signed in. Preparing authorization...
        </p>
      </Shell>
    );
  }

  if (!provider) {
    return (
      <Shell title={title}>
        <p className="text-muted-foreground mt-3 text-sm">
          {clientName ?? "An MCP client"} wants to access your Aomi account.
          Sign in to continue.
        </p>
        <div className="mt-6 grid gap-3">
          <button
            className="bg-foreground text-background h-11 rounded-md px-4 text-sm font-medium"
            onClick={() => setProvider("para")}
            type="button"
          >
            Continue with Para
          </button>
          <button
            className="border-border h-11 rounded-md border px-4 text-sm font-medium"
            onClick={() => setProvider("privy")}
            type="button"
          >
            Continue with Privy
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <ProviderRuntime provider={provider}>
      <ProviderSignIn provider={provider} title={title} />
    </ProviderRuntime>
  );
}

function ProviderRuntime({
  children,
  provider,
}: {
  children: ReactNode;
  provider: Provider;
}) {
  return (
    <AomiWalletKitProvider
      auth={{
        provider,
        methods: provider === "privy" ? ["google", "email"] : ["google"],
      }}
      providers={{
        para: {
          apiKey: process.env.NEXT_PUBLIC_PARA_API_KEY,
          environment:
            process.env.NEXT_PUBLIC_PARA_ENVIRONMENT === "PROD"
              ? "PROD"
              : "BETA",
          appName: "Aomi Labs",
          appDescription: "Connect an MCP client to Aomi",
        },
        privy: {
          appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
          appName: "Aomi Labs",
        },
      }}
    >
      {children}
    </AomiWalletKitProvider>
  );
}

function ProviderSignIn({
  provider,
  title,
}: {
  provider: Provider;
  title: string;
}) {
  const walletKit = useAomiWalletKit();
  const [status, setStatus] = useState(
    `Continue with ${providerLabels[provider]} to sign in.`,
  );
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [exchangeRequested, setExchangeRequested] = useState(false);
  const connectSocial = walletKit.connectSocial;
  const getAccountCredential = walletKit.getAccountCredential;

  const start = useCallback(async () => {
    setPending(true);
    setStatus(`Opening ${providerLabels[provider]}...`);
    try {
      await connectSocial?.("google");
      setStatus("Waiting for provider credential...");
      setExchangeRequested(true);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Authentication failed",
      );
      setPending(false);
    }
  }, [connectSocial, provider]);

  useEffect(() => {
    if (!exchangeRequested || complete || !pending) return;
    let cancelled = false;
    const run = async () => {
      try {
        const credential = await waitForProviderCredential(() =>
          getAccountCredential?.(),
        );
        if (cancelled) return;
        setStatus("Creating Aomi session...");
        const exchange = await fetch("/api/auth/aomi/provider/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(credential),
        });
        if (!exchange.ok) {
          throw await providerExchangeError(exchange);
        }
        setComplete(true);
        setStatus("Signed in. Preparing authorization...");
        const query =
          sessionStorage.getItem(STASH_KEY) ?? window.location.search;
        sessionStorage.removeItem(STASH_KEY);
        window.location.replace(`/api/auth/mcp/authorize${query}`);
      } catch (error) {
        if (cancelled) return;
        setStatus(
          error instanceof Error ? error.message : "Authentication failed",
        );
        setExchangeRequested(false);
        setPending(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [complete, exchangeRequested, getAccountCredential, pending]);

  return (
    <Shell title={title}>
      <p className="text-muted-foreground mt-3 min-h-10 text-sm">{status}</p>
      <div className="mt-6">
        <button
          className="bg-foreground text-background flex h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending || complete}
          onClick={() => void start()}
          type="button"
        >
          {complete ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          Continue with {providerLabels[provider]}
        </button>
      </div>
    </Shell>
  );
}

// ─── Phase 2: explicit consent ──────────────────────────────────────────────

function ConsentPanel({
  clientName,
  consentCode,
  scopes,
}: {
  clientName: string | null;
  consentCode: string;
  scopes: string[];
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const decide = useCallback(
    async (accept: boolean) => {
      setPending(true);
      setStatus(accept ? "Authorizing..." : "Denying...");
      try {
        const response = await fetch("/api/auth/oauth2/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ accept, consent_code: consentCode }),
        });
        const body = (await response.json().catch(() => null)) as {
          redirectURI?: string;
        } | null;
        if (!response.ok || typeof body?.redirectURI !== "string") {
          throw new Error(`Consent failed: HTTP ${response.status}`);
        }
        setStatus(
          accept ? "Authorized. Returning to your client..." : "Denied.",
        );
        window.location.assign(body.redirectURI);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Consent failed");
        setPending(false);
      }
    },
    [consentCode],
  );

  const name = clientName ?? "An MCP client";
  return (
    <Shell title={`${name} wants to connect`}>
      <p className="text-muted-foreground mt-3 text-sm">
        Allow {name} to access your Aomi account? It will be able to act as you
        by chatting with the Aomi agent and supervising the sessions you invoke
        from it.
      </p>
      <ul className="mt-5 grid gap-2">
        {scopes.map((scope) => (
          <li
            className="text-muted-foreground flex items-center gap-2 text-sm"
            key={scope}
          >
            <ShieldCheck className="text-foreground h-4 w-4 shrink-0" />
            {SCOPE_DESCRIPTIONS[scope] ?? scope}
          </li>
        ))}
      </ul>
      {status ? (
        <p className="text-muted-foreground mt-4 text-sm">{status}</p>
      ) : null}
      <div className="mt-6 grid gap-3">
        <button
          className="bg-foreground text-background flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          onClick={() => void decide(true)}
          type="button"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Authorize
        </button>
        <button
          className="border-border h-11 rounded-md border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          onClick={() => void decide(false)}
          type="button"
        >
          Deny
        </button>
      </div>
    </Shell>
  );
}

// ─── Shared shell (device-auth's visual language) ───────────────────────────

function Shell({ children, title }: { children?: ReactNode; title: string }) {
  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {children}
      </section>
    </main>
  );
}
