"use client";

import { useMemo } from "react";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { Mppx, tempo } from "mppx/client";
import { useConfig, useWalletClient } from "wagmi";
import { getConnectorClient } from "wagmi/actions";
import type { AomiClientOptions } from "@aomi-labs/react";
import { useSettings } from "./use-settings";

export type RuntimeClientOptions = Omit<AomiClientOptions, "baseUrl">;

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

export function usePaymentAwareClientOptions(
  clientOptions?: RuntimeClientOptions,
): RuntimeClientOptions | undefined {
  const wagmiConfig = useSafeWagmiConfig();
  const walletClient = useSafeWalletClient();
  const { settings } = useSettings();

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
    if (clientOptions?.fetch) {
      return clientOptions;
    }

    const baseFetch = settings.mppEnabled
      ? (mppClientOptions?.fetch ?? null)
      : null;
    if (!baseFetch && !settings.x402Enabled) {
      return clientOptions;
    }

    const paymentFetch = baseFetch ?? globalThis.fetch.bind(globalThis);
    const connectorClient = walletClient?.data;
    if (!settings.x402Enabled || !connectorClient) {
      return {
        ...clientOptions,
        fetch: paymentFetch,
      };
    }

    const paymentClient = new x402Client();
    paymentClient.register(
      "eip155:*",
      new ExactEvmScheme(connectorClient as never),
    );

    return {
      ...clientOptions,
      fetch: wrapFetchWithPayment(paymentFetch, paymentClient),
    };
  }, [
    clientOptions,
    mppClientOptions,
    settings.mppEnabled,
    settings.x402Enabled,
    walletClient?.data,
  ]);
}
