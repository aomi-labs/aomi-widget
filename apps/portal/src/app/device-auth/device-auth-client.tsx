"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAomiWalletKit } from "@aomi-labs/widget-lib";
import {
  classifyProviderInitializationFailure,
  normalizeDeviceAuthProvider,
  providerConfigurationFailure,
  providerFailureText,
  type DeviceAuthProvider,
} from "@portal/lib/device-auth-provider";

type GrantResponse = {
  code?: unknown;
  state?: unknown;
  redirectUri?: unknown;
};

const providerLabels = {
  privy: "Privy",
  para: "Para",
} as const;

export function DeviceAuthClient() {
  const router = useRouter();
  const params = useSearchParams();
  const provider = normalizeDeviceAuthProvider(params.get("provider"));
  const mode = params.get("mode") === "link" ? "link" : "login";
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
        <div className="mt-6 grid gap-3">
          <button
            className="bg-foreground text-background h-11 rounded-md px-4 text-sm font-medium"
            onClick={() => selectProvider(router, params, "privy")}
            type="button"
          >
            Continue with Privy
          </button>
          <button
            className="border-border h-11 rounded-md border px-4 text-sm font-medium"
            onClick={() => selectProvider(router, params, "para")}
            type="button"
          >
            Continue with Para
          </button>
        </div>
      </DeviceAuthLayout>
    );
  }

  const configurationFailure = providerConfigurationFailure(
    provider,
    providerConfiguration,
  );
  if (configurationFailure) {
    return (
      <DeviceAuthLayout status={providerFailureText(configurationFailure)} />
    );
  }

  return (
    <DeviceAuthProviderPanel
      mode={mode}
      provider={provider}
      request={request}
    />
  );
}

function DeviceAuthProviderPanel({
  mode,
  provider,
  request,
}: {
  mode: "login" | "link";
  provider: DeviceAuthProvider;
  request: {
    state: string;
    codeChallenge: string;
    redirectUri: string;
    linkIntent: string;
  };
}) {
  const walletKit = useAomiWalletKit();
  const connectSocial = walletKit.connectSocial;
  const getAccountCredential = walletKit.getAccountCredential;
  const [status, setStatus] = useState(
    `Continue with ${providerLabels[provider]} to ${
      mode === "link" ? "link this login method." : "connect your CLI."
    }`,
  );
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [exchangeRequested, setExchangeRequested] = useState(false);

  const startProviderLogin = useCallback(async () => {
    setPending(true);
    setStatus(`Opening ${providerLabels[provider]}...`);
    try {
      await connectSocial?.("google");
      setStatus("Waiting for provider credential...");
      setExchangeRequested(true);
    } catch (error) {
      setStatus(
        providerFailureText(
          classifyProviderInitializationFailure(
            provider,
            error,
            providerConfiguration,
          ),
        ),
      );
      setPending(false);
    }
  }, [connectSocial, provider]);

  useEffect(() => {
    if (!exchangeRequested || complete || !pending) return;
    let cancelled = false;
    const run = async () => {
      try {
        setStatus(
          mode === "link"
            ? "Preparing account link..."
            : "Creating Aomi session...",
        );
        const credential = await waitForCredential(() =>
          getAccountCredential?.(),
        );
        if (cancelled) return;
        if (mode === "link") {
          const grantResponse = await fetch(
            "/v1/account/device-auth/link-grant",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                linkIntent: request.linkIntent,
                state: request.state,
                redirectUri: request.redirectUri,
                provider,
                credential,
              }),
            },
          );
          const grant = (await grantResponse
            .json()
            .catch(() => null)) as GrantResponse | null;
          if (
            !grantResponse.ok ||
            typeof grant?.code !== "string" ||
            grant.state !== request.state
          ) {
            throw new Error(
              `Device auth link failed: HTTP ${grantResponse.status}`,
            );
          }
          setComplete(true);
          setStatus("Account link complete. Returning to the CLI...");
          redirectToCli({
            code: grant.code,
            redirectUri: request.redirectUri,
            state: request.state,
          });
          return;
        }
        const exchangeResponse = await fetch(
          "/api/auth/aomi/provider/exchange",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(credential),
          },
        );
        if (!exchangeResponse.ok) {
          throw new Error(
            `Provider exchange failed: HTTP ${exchangeResponse.status}`,
          );
        }
        const grantResponse = await fetch("/v1/account/device-auth/grant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            state: request.state,
            codeChallenge: request.codeChallenge,
            redirectUri: request.redirectUri,
            provider,
          }),
        });
        const grant = (await grantResponse
          .json()
          .catch(() => null)) as GrantResponse | null;
        if (
          !grantResponse.ok ||
          typeof grant?.code !== "string" ||
          grant.state !== request.state
        ) {
          throw new Error(
            `Device auth grant failed: HTTP ${grantResponse.status}`,
          );
        }
        setComplete(true);
        setStatus("Authentication complete. Returning to the CLI...");
        redirectToCli({
          code: grant.code,
          redirectUri: request.redirectUri,
          state: request.state,
        });
      } catch (error) {
        if (cancelled) return;
        setStatus(
          providerFailureText(
            classifyProviderInitializationFailure(
              provider,
              error,
              providerConfiguration,
            ),
          ),
        );
        setPending(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [
    complete,
    exchangeRequested,
    pending,
    mode,
    provider,
    request,
    getAccountCredential,
  ]);

  return (
    <DeviceAuthLayout status={status}>
      <div className="mt-6">
        <button
          className="bg-foreground text-background flex h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending || complete}
          onClick={() => void startProviderLogin()}
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
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sign in to Aomi CLI
        </h1>
        <p className="text-muted-foreground mt-3 min-h-10 text-sm">{status}</p>
        {children}
      </section>
    </main>
  );
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

async function waitForCredential(
  getCredential: () => Promise<unknown> | undefined,
): Promise<unknown> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30_000) {
    const credential = await getCredential();
    if (credential) return credential;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Provider did not return an exchangeable credential");
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

const providerConfiguration = {
  paraApiKey: process.env.NEXT_PUBLIC_PARA_API_KEY?.trim() ?? "",
  paraEnvironment: process.env.NEXT_PUBLIC_PARA_ENVIRONMENT?.trim() ?? "",
  privyAppId: process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() ?? "",
};

function selectProvider(
  router: ReturnType<typeof useRouter>,
  params: ReturnType<typeof useSearchParams>,
  provider: DeviceAuthProvider,
): void {
  const next = new URLSearchParams(params.toString());
  next.set("provider", provider);
  router.replace(`/device-auth?${next.toString()}`);
}
