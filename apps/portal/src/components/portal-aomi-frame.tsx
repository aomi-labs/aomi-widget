"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { createAccountBearerProvider } from "@aomi-labs/client";
import { AomiFrame, useAomiAuthAdapter } from "@aomi-labs/widget-lib";
import { type AomiClientOptions, usePerThreadControl } from "@aomi-labs/react";
import { RequiredSecretsGate } from "@portal/components/required-secrets-gate";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { Mppx, tempo } from "mppx/client";
import { useConfig, useWalletClient } from "wagmi";
import { getConnectorClient } from "wagmi/actions";
import { getBackendUrl } from "@portal/lib/settings-api";

function getRequestedAppFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);

  for (const key of ["aomi_app", "app"] as const) {
    const value = params.get(key)?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function usePortalClientOptions():
  | Omit<AomiClientOptions, "baseUrl">
  | undefined {
  const { getAccountCredential } = useAomiAuthAdapter();
  const wagmiConfig = useConfig();
  const walletClient = useWalletClient();
  const nativeFetch = useMemo(() => globalThis.fetch.bind(globalThis), []);
  const accountBearerProvider = useMemo(() => {
    if (!getAccountCredential) {
      return undefined;
    }
    return createAccountBearerProvider({
      baseUrl: "",
      getProviderCredential: async () => {
        const credential = await getAccountCredential();
        if (!credential) {
          throw new Error(
            "Wallet provider is connected without an exchangeable credential",
          );
        }
        return credential;
      },
      fetch: nativeFetch,
    });
  }, [getAccountCredential, nativeFetch]);

  useEffect(
    () => () => {
      accountBearerProvider?.dispose();
    },
    [accountBearerProvider],
  );

  const mppClientOptions = useMemo(() => {
    if (!wagmiConfig) {
      return undefined;
    }

    const mppx = Mppx.create({
      polyfill: false,
      methods: [
        tempo({
          getClient: (parameters) =>
            getConnectorClient(
              wagmiConfig,
              parameters as Parameters<typeof getConnectorClient>[1],
            ),
        }),
      ],
    });

    return { fetch: mppx.fetch };
  }, [wagmiConfig]);

  return useMemo(() => {
    const withDebugLogging = (
      fetchName: string,
      fetchImpl: typeof fetch,
    ): typeof fetch => {
      return async (input, init) => {
        const rawUrl =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        const normalizeLocalhostUrl = (value: string) => {
          try {
            const parsed = new URL(value, window.location.href);
            if (parsed.hostname === "localhost") {
              parsed.hostname = "127.0.0.1";
            }
            return parsed.toString();
          } catch {
            return value;
          }
        };
        const url = normalizeLocalhostUrl(rawUrl);
        const method =
          init?.method ?? (input instanceof Request ? input.method : "GET");
        const startedAt = Date.now();
        console.debug("[aomi][portal-fetch] start", {
          fetchName,
          method,
          url,
        });

        const pendingWarning = setTimeout(() => {
          console.debug("[aomi][portal-fetch] still pending", {
            fetchName,
            method,
            url,
            pendingMs: Date.now() - startedAt,
          });
        }, 5000);

        try {
          const normalizedInput =
            typeof input === "string"
              ? url
              : input instanceof URL
                ? new URL(url)
                : new Request(url, input);
          const response = await fetchImpl(normalizedInput, init);
          clearTimeout(pendingWarning);
          console.debug("[aomi][portal-fetch] response", {
            fetchName,
            method,
            url,
            status: response.status,
            ok: response.ok,
            durationMs: Date.now() - startedAt,
          });
          return response;
        } catch (error) {
          clearTimeout(pendingWarning);
          console.error("[aomi][portal-fetch] failed", {
            fetchName,
            method,
            url,
            durationMs: Date.now() - startedAt,
            error,
          });
          throw error;
        }
      };
    };

    const parseUrl = (input: RequestInfo | URL): URL | null => {
      try {
        if (typeof input === "string") {
          return new URL(input, window.location.href);
        }
        if (input instanceof URL) {
          return input;
        }
        return new URL(input.url, window.location.href);
      } catch {
        return null;
      }
    };

    const isChatPost = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = parseUrl(input);
      if (!url) return false;
      const method = (
        init?.method ?? (input instanceof Request ? input.method : "GET")
      ).toUpperCase();
      return method === "POST" && url.pathname === "/api/chat";
    };

    const rawFetch = withDebugLogging("native.fetch", nativeFetch);
    const baseFetch = mppClientOptions?.fetch;
    const connectorClient = walletClient?.data;
    const paymentFetch = (() => {
      if (!baseFetch) {
        return null;
      }
      if (!connectorClient) {
        return withDebugLogging("mppx.fetch", baseFetch);
      }

      const paymentClient = new x402Client();
      paymentClient.register(
        "eip155:*",
        new ExactEvmScheme(connectorClient as never),
      );

      return withDebugLogging(
        "wrapFetchWithPayment",
        wrapFetchWithPayment(baseFetch, paymentClient),
      );
    })();

    const routedFetch: typeof fetch = async (input, init) => {
      if (!isChatPost(input, init)) {
        return rawFetch(input, init);
      }

      const firstResponse = await rawFetch(input, init);
      if (firstResponse.status !== 402 || !paymentFetch) {
        return firstResponse;
      }

      console.debug(
        "[aomi][portal-fetch] retrying /api/chat with payment transport after 402",
      );
      return paymentFetch(input, init);
    };

    return {
      fetch: routedFetch,
      getAccountBearer: accountBearerProvider,
    };
  }, [
    accountBearerProvider,
    mppClientOptions,
    nativeFetch,
    walletClient?.data,
  ]);
}

function AppSelectUrlBootstrap() {
  const { onAppSelect } = usePerThreadControl().actions;
  const hasAppliedRequestedAppRef = useRef(false);

  useEffect(() => {
    if (hasAppliedRequestedAppRef.current) {
      return;
    }

    const requestedApp = getRequestedAppFromSearch(window.location.search);
    if (!requestedApp) {
      return;
    }

    onAppSelect(requestedApp);
    hasAppliedRequestedAppRef.current = true;
  }, [onAppSelect]);

  return null;
}

export function PortalAomiFrame() {
  const clientOptions = usePortalClientOptions();
  const backendUrl = getBackendUrl();

  return (
    <main className="bg-background relative h-full w-full overflow-hidden">
      <AomiFrame.Root
        width="100%"
        height="100%"
        backendUrl={backendUrl}
        walletPosition="footer"
        walletFamilies={["evm", "solana"]}
        className="rounded-none border-0 shadow-none"
        clientOptions={clientOptions}
      >
        <AppSelectUrlBootstrap />
        <AomiFrame.Header>
          <Link
            href="/settings"
            className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex items-center justify-center rounded-full p-2 transition-colors"
            aria-label="Open settings"
          >
            <Settings className="size-4" />
          </Link>
        </AomiFrame.Header>
        <AomiFrame.Composer
          withControl
          controlBarProps={{
            hideApiKey: true,
          }}
        />
        <RequiredSecretsGate />
      </AomiFrame.Root>
    </main>
  );
}
