"use client";

import { useMemo } from "react";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { Mppx, tempo } from "mppx/client";
import { useAccount, useConfig, useSwitchChain, useWalletClient } from "wagmi";
import { getConnectorClient } from "wagmi/actions";
import type { AomiClientOptions } from "@aomi-labs/react";
import {
  narrowAutoMethod,
  readExplicitMethod,
  type PaymentToggleFlags,
} from "./payment-fetch-utils";
import { useSettings } from "./use-settings";

export type RuntimeClientOptions = Omit<AomiClientOptions, "baseUrl">;

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

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

function useSafeSwitchChain() {
  try {
    return useSwitchChain();
  } catch {
    return null;
  }
}

function useSafeAccount() {
  try {
    return useAccount();
  } catch {
    return null;
  }
}

function supportsTempoSessionWallet(connectorName?: string): boolean {
  if (!connectorName) return true;

  // Tempo session auto-management needs a wallet/provider that can produce a
  // signed serialized transaction for channel-open credentials. External
  // injected wallets like MetaMask currently do not expose the RPC surface
  // mppx expects here (`eth_fillTransaction` / `eth_signTransaction`).
  return connectorName.toLowerCase().includes("para");
}

/**
 * Build a fetch that:
 *   1. Narrows Auto requests to `?payment_method=coinbase` when MPP is off and x402 is on
 *      (so the backend chain skips past the disabled tempo step).
 *   2. If the request explicitly sets `payment_method=tempo|coinbase`, hand it
 *      directly to the matching wrapper. The wrapper's own probe → sign → retry
 *      cycle then runs once (one 402 → 200), avoiding the dispatcher's own probe
 *      duplicating the challenge round-trip.
 *   3. Otherwise (Auto), issue a probe through plain `globalThis.fetch` and
 *      route the 402 retry to the wrapper whose scheme matches the response
 *      header (`Payment-Required` → x402, `WWW-Authenticate: Payment` → MPP).
 *
 * This replaces the previous wrapper-chain approach (`x402(mppx(fetch))`) which
 * caused mppx to throw `Missing WWW-Authenticate header.` on every x402 challenge.
 */
function buildPaymentAwareFetch({
  flags,
  mppFetch,
  x402Fetch,
}: {
  flags: PaymentToggleFlags;
  mppFetch: FetchLike | null;
  x402Fetch: FetchLike | null;
}): FetchLike {
  return async (input, init) => {
    const narrowed = narrowAutoMethod(input, flags);

    // Explicit-method short-circuit — hand straight to the wrapper so the
    // total network cost is one 402 (the wrapper's own probe) plus the signed
    // retry, instead of two 402s (dispatcher probe + wrapper probe).
    const explicit = readExplicitMethod(narrowed);
    if (explicit === "coinbase" && flags.x402Enabled && x402Fetch) {
      return x402Fetch(narrowed, init);
    }
    if (explicit === "tempo" && flags.mppEnabled && mppFetch) {
      return mppFetch(narrowed, init);
    }

    // Auto path — probe first, dispatch by response header.
    // Clone Request inputs before the probe so the wrapper retry can re-read the body.
    const probe = narrowed instanceof Request ? narrowed.clone() : narrowed;
    const initial = await globalThis.fetch(probe, init);
    if (initial.status !== 402) return initial;

    const paymentRequired = initial.headers.get("payment-required");
    if (paymentRequired && flags.x402Enabled && x402Fetch) {
      return x402Fetch(narrowed, init);
    }

    const wwwAuth = initial.headers.get("www-authenticate");
    if (wwwAuth && flags.mppEnabled && mppFetch) {
      return mppFetch(narrowed, init);
    }

    return initial;
  };
}

export function usePaymentAwareClientOptions(
  clientOptions?: RuntimeClientOptions,
): RuntimeClientOptions | undefined {
  const wagmiConfig = useSafeWagmiConfig();
  const walletClient = useSafeWalletClient();
  const switchChain = useSafeSwitchChain();
  const account = useSafeAccount();
  const { settings } = useSettings();
  const mppSupported = supportsTempoSessionWallet(account?.connector?.name);

  const mppFetch = useMemo<FetchLike | null>(() => {
    if (!wagmiConfig || !mppSupported) return null;

    const mppx = Mppx.create({
      polyfill: false,
      methods: [
        tempo({
          getClient: async (parameters) => {
            const requestedChainId =
              typeof parameters?.chainId === "number"
                ? parameters.chainId
                : undefined;
            if (
              requestedChainId &&
              walletClient?.data?.chain?.id !== requestedChainId &&
              switchChain?.switchChainAsync
            ) {
              await switchChain.switchChainAsync({ chainId: requestedChainId });
            }

            return getConnectorClient(
              wagmiConfig,
              parameters as Parameters<typeof getConnectorClient>[1],
            );
          },
          // Auto-management cap (human units, default 6 decimals → 0.5 token).
          // Without `maxDeposit` (or `deposit`), mppx errors out the first
          // time it processes a tempo 402 with no cached channel:
          //   "No `action` in context and no `deposit` or `maxDeposit`
          //    configured. Either provide context with action/channelId/
          //    cumulativeAmount, or configure `deposit`/`maxDeposit` for
          //    auto-management."
          // The cap bounds how much a connected wallet can be auto-deposited
          // into a fresh Tempo channel; the server's suggested deposit is
          // honored only up to this ceiling.
          maxDeposit: "0.5",
        }),
      ],
    });

    return mppx.fetch as FetchLike;
  }, [
    mppSupported,
    switchChain?.switchChainAsync,
    wagmiConfig,
    walletClient?.data?.chain?.id,
  ]);

  const x402Fetch = useMemo<FetchLike | null>(() => {
    const connectorClient = walletClient?.data;
    const account = connectorClient?.account;
    if (!connectorClient || !account?.address) return null;

    // ExactEvmScheme expects a flat signer with `.address` and
    // `.signTypedData(...)`. wagmi's WalletClient keeps the account under
    // `.account`, so adapt it explicitly instead of passing the WalletClient
    // object through and hoping its shape matches.
    const signer = {
      address: account.address,
      signTypedData: async (
        parameters: Parameters<typeof connectorClient.signTypedData>[0],
      ) => {
        const requestedChainId = parameters.domain?.chainId;
        if (
          typeof requestedChainId === "number" &&
          connectorClient.chain?.id !== requestedChainId &&
          switchChain?.switchChainAsync
        ) {
          await switchChain.switchChainAsync({ chainId: requestedChainId });
        }
        return connectorClient.signTypedData(parameters);
      },
    };

    const paymentClient = new x402Client();
    paymentClient.register(
      "eip155:*",
      new ExactEvmScheme(signer as never),
    );

    // Wrap plain global fetch — never chain over mppFetch (the wrappers are
    // mutually exclusive: each only knows its own challenge header).
    return wrapFetchWithPayment(
      globalThis.fetch.bind(globalThis),
      paymentClient,
    ) as FetchLike;
  }, [switchChain?.switchChainAsync, walletClient?.data]);

  return useMemo(() => {
    if (clientOptions?.fetch) {
      return clientOptions;
    }
    if (!settings.mppEnabled && !settings.x402Enabled) {
      return clientOptions;
    }

    const flags: PaymentToggleFlags = {
      mppEnabled: settings.mppEnabled && Boolean(mppFetch),
      x402Enabled: settings.x402Enabled && Boolean(x402Fetch),
    };
    if (!flags.mppEnabled && !flags.x402Enabled) {
      // Toggle on but no usable wrapper (e.g. wallet not connected) — leave fetch alone.
      return clientOptions;
    }

    return {
      ...clientOptions,
      fetch: buildPaymentAwareFetch({
        flags,
        mppFetch: flags.mppEnabled ? mppFetch : null,
        x402Fetch: flags.x402Enabled ? x402Fetch : null,
      }),
    };
  }, [
    clientOptions,
    mppFetch,
    settings.mppEnabled,
    settings.x402Enabled,
    x402Fetch,
  ]);
}
