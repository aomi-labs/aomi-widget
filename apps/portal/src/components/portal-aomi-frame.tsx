"use client";

import { useEffect, useMemo, useRef } from "react";
import { AomiFrame } from "@aomi-labs/widget-lib";
import {
  type AomiClientOptions,
  useControl,
} from "@aomi-labs/react";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { Mppx, tempo } from "mppx/client";
import { useConfig, useWalletClient } from "wagmi";
import { getConnectorClient } from "wagmi/actions";

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

function useSafeWagmiConfig() {
  try {
    return useConfig();
  } catch {
    return null;
  }
}

function useSafeWalletClient() {
  try {
    return useWalletClient();
  } catch {
    return null;
  }
}

function usePortalClientOptions(): Omit<AomiClientOptions, "baseUrl"> | undefined {
  const wagmiConfig = useSafeWagmiConfig();
  const walletClient = useSafeWalletClient();

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
  const requestedAppRef = useRef<string | null>(null);
  const hasAppliedRequestedAppRef = useRef(false);

  useEffect(() => {
    requestedAppRef.current = getRequestedAppFromSearch(window.location.search);
  }, []);

  useEffect(() => {
    const requestedApp = requestedAppRef.current;
    if (!requestedApp || hasAppliedRequestedAppRef.current) {
      return;
    }

    onAppSelect(requestedApp);
    hasAppliedRequestedAppRef.current = true;
  }, [onAppSelect]);

  return null;
}

export function PortalAomiFrame() {
  const clientOptions = usePortalClientOptions();

  return (
    <AomiFrame.Root
      height="100%"
      width="100%"
      walletPosition="footer"
      clientOptions={clientOptions}
    >
      <AppSelectUrlBootstrap />
      <AomiFrame.Header />
      <AomiFrame.Composer withControl />
    </AomiFrame.Root>
  );
}
