"use client";

import "@aomi-labs/widget-lib/providers/para";
import "@aomi-labs/widget-lib/providers/privy";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { AomiWalletKitProvider, useAomiWalletKit } from "@aomi-labs/widget-lib";

type Provider = "privy" | "para";

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
  const params = useSearchParams();
  const requestedProvider = normalizeProvider(params.get("provider"));
  const mode = params.get("mode") === "link" ? "link" : "login";
  const [provider, setProvider] = useState<Provider | null>(
    requestedProvider ?? null,
  );
  const request = useMemo(
    () => ({
      state: params.get("state") ?? "",
      codeChallenge: params.get("code_challenge") ?? "",
      redirectUri: params.get("redirect_uri") ?? "",
    }),
    [params],
  );

  if (!request.state || !request.codeChallenge || !request.redirectUri) {
    return <DeviceAuthLayout status="Invalid device auth request." />;
  }

  if (!provider) {
    return (
      <DeviceAuthLayout status="Choose a provider to continue.">
        <div className="mt-6 grid gap-3">
          <button
            className="bg-foreground text-background h-11 rounded-md px-4 text-sm font-medium"
            onClick={() => setProvider("privy")}
            type="button"
          >
            Continue with Privy
          </button>
          <button
            className="border-border h-11 rounded-md border px-4 text-sm font-medium"
            onClick={() => setProvider("para")}
            type="button"
          >
            Continue with Para
          </button>
        </div>
      </DeviceAuthLayout>
    );
  }

  return (
    <ProviderRuntime provider={provider}>
      <DeviceAuthProviderPanel
        mode={mode}
        provider={provider}
        request={request}
      />
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
          appDescription: "Aomi CLI account login",
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

function DeviceAuthProviderPanel({
  mode,
  provider,
  request,
}: {
  mode: "login" | "link";
  provider: Provider;
  request: {
    state: string;
    codeChallenge: string;
    redirectUri: string;
  };
}) {
  const walletKit = useAomiWalletKit();
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
      await walletKit.connectSocial?.("google");
      setStatus("Waiting for provider credential...");
      setExchangeRequested(true);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Authentication failed",
      );
      setPending(false);
    }
  }, [provider, walletKit]);

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
          walletKit.getAccountCredential?.(),
        );
        if (cancelled) return;
        if (mode === "link") {
          postCredentialToCli({
            credential,
            provider,
            redirectUri: request.redirectUri,
            state: request.state,
          });
          setComplete(true);
          setStatus("Account link complete. Returning to the CLI...");
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
        const grantResponse = await fetch("/api/aomi/device-auth/grant", {
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
        const redirect = new URL(request.redirectUri);
        redirect.searchParams.set("code", grant.code);
        redirect.searchParams.set("state", request.state);
        window.location.assign(redirect.toString());
      } catch (error) {
        if (cancelled) return;
        setStatus(
          error instanceof Error ? error.message : "Authentication failed",
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
    walletKit.getAccountCredential,
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

function postCredentialToCli(input: {
  credential: unknown;
  provider: Provider;
  redirectUri: string;
  state: string;
}) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = input.redirectUri;
  form.style.display = "none";

  for (const [name, value] of Object.entries({
    state: input.state,
    provider: input.provider,
    credential: JSON.stringify(input.credential),
  })) {
    const field = document.createElement("input");
    field.type = "hidden";
    field.name = name;
    field.value = value;
    form.appendChild(field);
  }

  document.body.appendChild(form);
  form.submit();
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

function normalizeProvider(value: string | null): Provider | null {
  return value === "privy" || value === "para" ? value : null;
}
