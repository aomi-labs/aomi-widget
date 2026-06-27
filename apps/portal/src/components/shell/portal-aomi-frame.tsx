"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { AomiFrame } from "@aomi-labs/widget-lib";
import {
  type AomiClientOptions,
  useAomiRuntime,
  usePerThreadControl,
} from "@aomi-labs/react";
import { RequiredSecretsGate } from "@portal/components/shell/required-secrets-gate";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { Mppx, tempo } from "mppx/client";
import { useConfig, useWalletClient } from "wagmi";
import { getConnectorClient } from "wagmi/actions";
import { getBackendUrl } from "@portal/lib/settings-api";

type RequestedAppConfig = {
  app: string | null;
  applicationId: string | null;
  locked: boolean;
};

function getRequestedAppConfig(search: string): RequestedAppConfig {
  const params = new URLSearchParams(search);
  let app: string | null = null;

  for (const key of ["aomi_app", "app"] as const) {
    const value = params.get(key)?.trim();
    if (value) {
      app = value;
      break;
    }
  }

  return {
    app,
    applicationId:
      params.get("application_id")?.trim() ||
      params.get("applicationId")?.trim() ||
      null,
    locked:
      params.get("lock_app") === "1" ||
      params.get("lock_app") === "true" ||
      params.get("app_locked") === "1" ||
      params.get("app_locked") === "true",
  };
}

function useRequestedAppConfig(): RequestedAppConfig {
  const [config, setConfig] = useState<RequestedAppConfig>({
    app: null,
    applicationId: null,
    locked: false,
  });

  useEffect(() => {
    setConfig(getRequestedAppConfig(window.location.search));
  }, []);

  return config;
}

function usePortalClientOptions(
  lockedApp: string | null,
  lockedApplicationId: string | null,
): Omit<AomiClientOptions, "baseUrl"> | undefined {
  const wagmiConfig = useConfig();
  const walletClient = useWalletClient();
  const nativeFetch = useMemo(() => globalThis.fetch.bind(globalThis), []);

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
            // Keep requests same-origin as the page. Rewriting the host (e.g.
            // localhost → 127.0.0.1) drops the httpOnly `aomi_session` cookie,
            // which is host-scoped to wherever the user logged in — so the proxy
            // can't inject the AccountBearer and session routes 401.
            return new URL(value, window.location.href).toString();
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

    const withLockedAppScope = (
      input: RequestInfo | URL,
    ): RequestInfo | URL => {
      if (!lockedApp) {
        return input;
      }
      const url = parseUrl(input);
      if (
        !url ||
        !["/api/chat", "/api/system", "/api/session/model"].includes(
          url.pathname,
        )
      ) {
        return input;
      }
      url.searchParams.set("app", lockedApp);
      if (lockedApplicationId) {
        url.searchParams.set("application_id", lockedApplicationId);
      }
      if (typeof input === "string") {
        return url.toString();
      }
      if (input instanceof URL) {
        return url;
      }
      return new Request(url, input);
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
      const routedInput = withLockedAppScope(input);
      if (!isChatPost(routedInput, init)) {
        return rawFetch(routedInput, init);
      }

      const firstResponse = await rawFetch(routedInput, init);
      if (firstResponse.status !== 402 || !paymentFetch) {
        return firstResponse;
      }

      console.debug(
        "[aomi][portal-fetch] retrying /api/chat with payment transport after 402",
      );
      return paymentFetch(withLockedAppScope(input), init);
    };

    return {
      fetch: routedFetch,
    };
  }, [
    lockedApp,
    lockedApplicationId,
    mppClientOptions,
    nativeFetch,
    walletClient?.data,
  ]);
}

function AppSelectUrlBootstrap({
  requestedApp,
  requestedApplicationId,
  locked,
}: {
  requestedApp: string | null;
  requestedApplicationId: string | null;
  locked: boolean;
}) {
  const { createThread, currentThreadId } = useAomiRuntime();
  const { onAppSelect } = usePerThreadControl().actions;
  const hasAppliedRequestedAppRef = useRef(false);
  const hasStartedLockedThreadRef = useRef<string | null>(null);
  const isDisposedRef = useRef(false);
  const [lockedThreadId, setLockedThreadId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      isDisposedRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (hasAppliedRequestedAppRef.current) {
      return;
    }

    if (!requestedApp) {
      return;
    }

    if (!locked) {
      onAppSelect(requestedApp, { applicationId: requestedApplicationId });
      hasAppliedRequestedAppRef.current = true;
      return;
    }

    if (hasStartedLockedThreadRef.current === requestedApp) {
      return;
    }
    hasStartedLockedThreadRef.current = requestedApp;
    void createThread()
      .then((threadId) => {
        if (
          !isDisposedRef.current &&
          hasStartedLockedThreadRef.current === requestedApp
        ) {
          setLockedThreadId(threadId);
        }
      })
      .catch((error) => {
        console.error("[aomi][portal-frame] failed to create locked thread", {
          app: requestedApp,
          error,
        });
      });
  }, [createThread, locked, onAppSelect, requestedApp, requestedApplicationId]);

  useEffect(() => {
    if (
      hasAppliedRequestedAppRef.current ||
      !locked ||
      !requestedApp ||
      !lockedThreadId ||
      currentThreadId !== lockedThreadId
    ) {
      return;
    }

    onAppSelect(requestedApp, { applicationId: requestedApplicationId });
    hasAppliedRequestedAppRef.current = true;
  }, [
    currentThreadId,
    locked,
    lockedThreadId,
    onAppSelect,
    requestedApp,
    requestedApplicationId,
  ]);

  return null;
}

export function PortalAomiFrame() {
  const requestedApp = useRequestedAppConfig();
  const lockedApp = requestedApp.locked ? requestedApp.app : null;
  const lockedApplicationId = lockedApp ? requestedApp.applicationId : null;
  const clientOptions = usePortalClientOptions(lockedApp, lockedApplicationId);
  const backendUrl = getBackendUrl();

  return (
    <main className="bg-background relative h-full w-full overflow-hidden">
      <AomiFrame.Root
        width="100%"
        height="100%"
        backendUrl={backendUrl}
        applicationId={lockedApplicationId}
        walletPosition="footer"
        walletFamilies={["evm", "solana"]}
        className="rounded-none border-0 shadow-none"
        clientOptions={clientOptions}
      >
        <AppSelectUrlBootstrap
          requestedApp={requestedApp.app}
          requestedApplicationId={requestedApp.applicationId}
          locked={Boolean(lockedApp)}
        />
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
            hideApp: Boolean(lockedApp),
          }}
        />
        <RequiredSecretsGate />
      </AomiFrame.Root>
    </main>
  );
}
