"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { AomiFrame } from "@aomi-labs/widget-lib";
import { type AomiClientOptions, useControl } from "@aomi-labs/react";
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

function usePortalClientOptions(): Omit<AomiClientOptions, "baseUrl"> | undefined {
  const wagmiConfig = useConfig();
  const walletClient = useWalletClient();

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

    return {
      fetch: mppx.fetch,
    };
  }, [wagmiConfig]);

  return useMemo(() => {
    const baseFetch = mppClientOptions?.fetch;
    if (!baseFetch) {
      return undefined;
    }

    const connectorClient = walletClient?.data;
    if (!connectorClient) {
      return {
        fetch: baseFetch,
      };
    }

    const paymentClient = new x402Client();
    paymentClient.register(
      "eip155:*",
      new ExactEvmScheme(connectorClient as never),
    );

    return {
      fetch: wrapFetchWithPayment(baseFetch, paymentClient),
    };
  }, [mppClientOptions, walletClient?.data]);
}

function AppSelectUrlBootstrap() {
  const { onAppSelect } = useControl();
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
        className="rounded-none border-0 shadow-none"
        clientOptions={clientOptions}
      >
        <AppSelectUrlBootstrap />
        <AomiFrame.Header>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
