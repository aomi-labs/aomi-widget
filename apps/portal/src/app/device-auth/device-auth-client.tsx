"use client";

import "@aomi-labs/widget-lib/providers/para";
import "@aomi-labs/widget-lib/providers/privy";

import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { PortalProviderContinueButton } from "@portal/components/provider-login/continue-button";
import { PortalProviderPicker } from "@portal/components/provider-login/picker";
import { PortalEmbeddedProviderRuntime } from "@portal/components/provider-login/runtime";
import { PortalAuthShell } from "@portal/components/provider-login/shell";
import { usePortalProviderCredential } from "@portal/components/provider-login/use-provider-credential";
import { exchangeNewSessionProviderCredential } from "@portal/lib/provider-login/new-session-exchange";
import {
  isPortalEmbeddedProvider,
  PORTAL_PROVIDER_LABELS,
  type PortalEmbeddedProvider,
} from "@portal/lib/provider-login/types";

type GrantResponse = {
  code?: unknown;
  state?: unknown;
  redirectUri?: unknown;
};

export function DeviceAuthClient() {
  const params = useSearchParams();
  const rawProvider = params.get("provider");
  const requestedProvider = isPortalEmbeddedProvider(rawProvider)
    ? rawProvider
    : null;
  const mode = params.get("mode") === "link" ? "link" : "login";
  const [provider, setProvider] = useState<PortalEmbeddedProvider | null>(
    requestedProvider,
  );
  const request = useMemo(
    () => ({
      state: params.get("state") ?? "",
      codeChallenge: params.get("code_challenge") ?? "",
      redirectUri: params.get("redirect_uri") ?? "",
      linkIntent: params.get("link_intent") ?? "",
    }),
    [params],
  );

  if (
    !request.state ||
    !request.codeChallenge ||
    !request.redirectUri ||
    (mode === "link" && !request.linkIntent) ||
    !isApprovedCliLoopbackRedirectUri(request.redirectUri)
  ) {
    return <DeviceAuthLayout status="Invalid device auth request." />;
  }

  if (!provider) {
    return (
      <DeviceAuthLayout status="Choose a provider to continue.">
        <PortalProviderPicker
          onSelect={setProvider}
          order={["privy", "para"]}
        />
      </DeviceAuthLayout>
    );
  }

  return (
    <PortalEmbeddedProviderRuntime
      appDescription="Aomi CLI account login"
      provider={provider}
    >
      <DeviceAuthProviderPanel
        mode={mode}
        provider={provider}
        request={request}
      />
    </PortalEmbeddedProviderRuntime>
  );
}

function DeviceAuthProviderPanel({
  mode,
  provider,
  request,
}: {
  mode: "login" | "link";
  provider: PortalEmbeddedProvider;
  request: {
    state: string;
    codeChallenge: string;
    redirectUri: string;
    linkIntent: string;
  };
}) {
  const signIn = usePortalProviderCredential({
    completeStatus:
      mode === "link"
        ? "Account link complete. Returning to the CLI..."
        : "Authentication complete. Returning to the CLI...",
    initialStatus: `Continue with ${PORTAL_PROVIDER_LABELS[provider]} to ${
      mode === "link" ? "link this login method." : "connect your CLI."
    }`,
    onCredential: async (credential) => {
      if (mode === "link") {
        await completeDeviceAuthLink({ credential, provider, request });
        return;
      }
      await completeDeviceAuthLogin({ credential, provider, request });
    },
    provider,
    waitOptions: { timeoutMs: 30_000, attemptTimeoutMs: null },
    workingStatus:
      mode === "link"
        ? "Preparing account link..."
        : "Creating Aomi session...",
    workingStatusTiming: "before_wait",
  });

  return (
    <DeviceAuthLayout status={signIn.status}>
      <div className="mt-6">
        <PortalProviderContinueButton
          complete={signIn.complete}
          disabled={signIn.pending || signIn.complete}
          onClick={() => void signIn.start()}
          pending={signIn.pending}
          provider={provider}
        />
      </div>
    </DeviceAuthLayout>
  );
}

function DeviceAuthLayout({
  children,
  status,
}: {
  children?: ReactNode;
  status: string;
}) {
  return (
    <PortalAuthShell title="Sign in to Aomi CLI">
      <p className="text-muted-foreground mt-3 min-h-10 text-sm">{status}</p>
      {children}
    </PortalAuthShell>
  );
}

async function completeDeviceAuthLogin(input: {
  credential: unknown;
  provider: PortalEmbeddedProvider;
  request: {
    state: string;
    codeChallenge: string;
    redirectUri: string;
  };
}) {
  const exchangeResponse = await exchangeNewSessionProviderCredential(
    input.credential,
  );
  if (!exchangeResponse.ok) {
    throw new Error(
      `Provider exchange failed: HTTP ${exchangeResponse.status}`,
    );
  }
  const grantResponse = await fetch("/api/aomi/device-auth/grant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      state: input.request.state,
      codeChallenge: input.request.codeChallenge,
      redirectUri: input.request.redirectUri,
      provider: input.provider,
    }),
  });
  const grant = (await grantResponse
    .json()
    .catch(() => null)) as GrantResponse | null;
  if (
    !grantResponse.ok ||
    typeof grant?.code !== "string" ||
    grant.state !== input.request.state
  ) {
    throw new Error(`Device auth grant failed: HTTP ${grantResponse.status}`);
  }
  redirectToCli({
    code: grant.code,
    redirectUri: input.request.redirectUri,
    state: input.request.state,
  });
}

async function completeDeviceAuthLink(input: {
  credential: unknown;
  provider: PortalEmbeddedProvider;
  request: {
    state: string;
    redirectUri: string;
    linkIntent: string;
  };
}) {
  const grantResponse = await fetch("/api/aomi/device-auth/link-grant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      linkIntent: input.request.linkIntent,
      state: input.request.state,
      redirectUri: input.request.redirectUri,
      provider: input.provider,
      credential: input.credential,
    }),
  });
  const grant = (await grantResponse
    .json()
    .catch(() => null)) as GrantResponse | null;
  if (
    !grantResponse.ok ||
    typeof grant?.code !== "string" ||
    grant.state !== input.request.state
  ) {
    throw new Error(`Device auth link failed: HTTP ${grantResponse.status}`);
  }
  redirectToCli({
    code: grant.code,
    redirectUri: input.request.redirectUri,
    state: input.request.state,
  });
}

function redirectToCli(input: {
  code: string;
  redirectUri: string;
  state: string;
}) {
  const redirect = new URL(input.redirectUri);
  redirect.searchParams.set("code", input.code);
  redirect.searchParams.set("state", input.state);
  window.location.assign(redirect.toString());
}

function isApprovedCliLoopbackRedirectUri(redirectUri: string): boolean {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    return false;
  }
  if (url.protocol !== "http:") return false;
  if (url.username || url.password) return false;
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) return false;
  if (!/^\d{1,5}$/.test(url.port)) return false;
  const port = Number(url.port);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) return false;
  return url.pathname === "/callback" && !url.search && !url.hash;
}
