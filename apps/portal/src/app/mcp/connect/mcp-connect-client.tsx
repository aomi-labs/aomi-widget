"use client";

import "@aomi-labs/widget-lib/providers/para";
import "@aomi-labs/widget-lib/providers/privy";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@aomi-labs/account/better-auth/client";
import { PortalProviderContinueButton } from "@portal/components/provider-login/continue-button";
import { PortalProviderPicker } from "@portal/components/provider-login/picker";
import { PortalEmbeddedProviderRuntime } from "@portal/components/provider-login/runtime";
import { PortalAuthShell } from "@portal/components/provider-login/shell";
import { usePortalProviderCredential } from "@portal/components/provider-login/use-provider-credential";
import { exchangeNewSessionProviderCredential } from "@portal/lib/provider-login/new-session-exchange";
import {
  PORTAL_PROVIDER_LABELS,
  type PortalEmbeddedProvider,
} from "@portal/lib/provider-login/types";
import { providerExchangeError } from "@portal/lib/provider-login/wait-for-credential";

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
 *    here with the full OAuth query. Sign in (shared Privy/Para surface),
 *    then resume the stashed authorize request.
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
    <PortalAuthShell title="Connect to Aomi">
      <p className="text-muted-foreground mt-3 text-sm">
        Nothing to authorize. Start the connection from your MCP client (for
        example `/mcp` in Claude Code), and it will send you here.
      </p>
    </PortalAuthShell>
  );
}

function SignInPanel({ clientName }: { clientName: string | null }) {
  const { data: session } = authClient.useSession();
  const [provider, setProvider] = useState<PortalEmbeddedProvider | null>(null);

  useEffect(() => {
    sessionStorage.setItem(STASH_KEY, window.location.search);
  }, []);

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
      <PortalAuthShell title={title}>
        <p className="text-muted-foreground mt-3 text-sm">
          Signed in. Preparing authorization...
        </p>
      </PortalAuthShell>
    );
  }

  if (!provider) {
    return (
      <PortalAuthShell title={title}>
        <p className="text-muted-foreground mt-3 text-sm">
          {clientName ?? "An MCP client"} wants to access your Aomi account.
          Sign in to continue.
        </p>
        <PortalProviderPicker
          onSelect={setProvider}
          order={["para", "privy"]}
        />
      </PortalAuthShell>
    );
  }

  return (
    <PortalEmbeddedProviderRuntime
      appDescription="Connect an MCP client to Aomi"
      provider={provider}
    >
      <ProviderSignIn provider={provider} title={title} />
    </PortalEmbeddedProviderRuntime>
  );
}

function ProviderSignIn({
  provider,
  title,
}: {
  provider: PortalEmbeddedProvider;
  title: string;
}) {
  const signIn = usePortalProviderCredential({
    completeStatus: "Signed in. Preparing authorization...",
    initialStatus: `Continue with ${PORTAL_PROVIDER_LABELS[provider]} to sign in.`,
    onCredential: resumeMcpAuthorizeAfterExchange,
    provider,
    workingStatus: "Creating Aomi session...",
    workingStatusTiming: "after_credential",
  });

  return (
    <PortalAuthShell title={title}>
      <p className="text-muted-foreground mt-3 min-h-10 text-sm">
        {signIn.status}
      </p>
      <div className="mt-6">
        <PortalProviderContinueButton
          complete={signIn.complete}
          disabled={signIn.pending || signIn.complete}
          onClick={() => void signIn.start()}
          pending={signIn.pending}
          provider={provider}
        />
      </div>
    </PortalAuthShell>
  );
}

async function resumeMcpAuthorizeAfterExchange(credential: unknown) {
  const exchange = await exchangeNewSessionProviderCredential(credential);
  if (!exchange.ok) {
    throw await providerExchangeError(exchange);
  }
  const query = sessionStorage.getItem(STASH_KEY) ?? window.location.search;
  sessionStorage.removeItem(STASH_KEY);
  window.location.replace(`/api/auth/mcp/authorize${query}`);
}

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
    <PortalAuthShell title={`${name} wants to connect`}>
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
    </PortalAuthShell>
  );
}
