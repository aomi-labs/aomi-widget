"use client";

import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { useAomiRuntime, type AomiClientOptions } from "@aomi-labs/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useConfig, useConnect, useConnectors, useDisconnect, useSwitchChain } from "wagmi";
import { getConnectorClient } from "wagmi/actions";
import { base } from "wagmi/chains";
import { BasePaymentModal } from "./base-payment-modal";

type BasePaymentGateProps = {
  children: (props: {
    clientOptions: Omit<AomiClientOptions, "baseUrl">;
    paymentUi: ReactNode;
  }) => ReactNode;
  walletAppName: string;
};

type BasePaymentGateRenderProps = {
  render: BasePaymentGateProps["children"];
  clientOptions: Omit<AomiClientOptions, "baseUrl">;
  paymentUi: ReactNode;
};

type DedicatedWalletRecord = {
  address: string;
  source: "baseAccount";
  selectedAt: number;
};

type PendingPaymentRequest = {
  input: RequestInfo | URL;
  init?: RequestInit;
  originalResponse: Response;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
};

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const BASE_CHAIN_ID = base.id;
const DEDICATED_WALLET_STORAGE_KEY = "aomi_base_dedicated_wallet";

function shouldOpenPaymentModal(response: Response): boolean {
  if (response.status === 402) return true;
  const paymentState = response.headers.get("x-aomi-payment-state");
  return (
    paymentState === "quota_exhausted" || paymentState === "payment_required"
  );
}

function isChatRequest(input: RequestInfo | URL): boolean {
  const rawUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const url =
    rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
      ? new URL(rawUrl)
      : new URL(rawUrl, globalThis.location?.origin ?? "http://localhost");
  return url.pathname === "/api/chat";
}

function setPaymentMethodToCoinbase(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === "string") {
    const url = input.startsWith("http://") || input.startsWith("https://")
      ? new URL(input)
      : new URL(input, "http://_internal_/");
    if (url.searchParams.has("payment_method")) return input;
    url.searchParams.set("payment_method", "coinbase");
    if (input.startsWith("http://") || input.startsWith("https://")) {
      return url.toString();
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  if (input instanceof URL) {
    if (input.searchParams.has("payment_method")) return input;
    const url = new URL(input.href);
    url.searchParams.set("payment_method", "coinbase");
    return url;
  }

  const url = new URL(input.url);
  if (url.searchParams.has("payment_method")) return input.clone();
  url.searchParams.set("payment_method", "coinbase");
  return new Request(url.toString(), input.clone());
}

function cloneRequestInfo(
  input: RequestInfo | URL,
  init?: RequestInit,
): [RequestInfo | URL, RequestInit | undefined] {
  const nextInput = input instanceof Request ? input.clone() : input;
  let nextInit = init;
  if (init?.body instanceof ReadableStream) {
    nextInit = { ...init };
  }
  return [nextInput, nextInit];
}

function parseStoredDedicatedWallet(
  value: string | null,
): DedicatedWalletRecord | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as DedicatedWalletRecord;
    if (!parsed?.address) return null;
    return parsed;
  } catch {
    return null;
  }
}

function formatAddress(address?: string) {
  if (!address) return "No wallet selected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function BasePaymentRuntimeSync({
  dedicatedWallet,
}: {
  dedicatedWallet: DedicatedWalletRecord | null;
}) {
  const { addExtValue, removeExtValue } = useAomiRuntime();

  useEffect(() => {
    if (dedicatedWallet) {
      addExtValue("base_payment_wallet", dedicatedWallet);
      return;
    }
    removeExtValue("base_payment_wallet");
  }, [addExtValue, dedicatedWallet, removeExtValue]);

  return null;
}

function BasePaymentGateRender({
  render,
  clientOptions,
  paymentUi,
}: BasePaymentGateRenderProps) {
  return <>{render({ clientOptions, paymentUi })}</>;
}

export function BasePaymentGate({
  children,
  walletAppName,
}: BasePaymentGateProps) {
  const wagmiConfig = useConfig();
  const { address, isConnected } = useAccount();
  const connectors = useConnectors();
  const { connectAsync, isPending: isConnecting } = useConnect();
  const { disconnectAsync, isPending: isDisconnecting } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"current" | "dedicated" | null>(null);
  const [dedicatedWallet, setDedicatedWallet] = useState<DedicatedWalletRecord | null>(
    null,
  );

  const pendingRequestRef = useRef<PendingPaymentRequest | null>(null);

  const baseConnector = useMemo(
    () =>
      connectors.find((connector) => connector.id === "baseAccount") ??
      connectors.find((connector) => connector.type === "baseAccount") ??
      connectors[0],
    [connectors],
  );

  useEffect(() => {
    const stored = parseStoredDedicatedWallet(
      globalThis.localStorage?.getItem(DEDICATED_WALLET_STORAGE_KEY) ?? null,
    );
    if (stored) {
      queueMicrotask(() => setDedicatedWallet(stored));
    }
  }, []);

  const persistDedicatedWallet = useCallback((next: DedicatedWalletRecord | null) => {
    setDedicatedWallet(next);
    if (!next) {
      globalThis.localStorage?.removeItem(DEDICATED_WALLET_STORAGE_KEY);
      return;
    }
    globalThis.localStorage?.setItem(
      DEDICATED_WALLET_STORAGE_KEY,
      JSON.stringify(next),
    );
  }, []);

  const resolvePendingWithOriginal = useCallback(() => {
    const pending = pendingRequestRef.current;
    if (!pending) return;
    pendingRequestRef.current = null;
    pending.resolve(pending.originalResponse);
  }, []);

  const rejectPending = useCallback((message: string) => {
    const pending = pendingRequestRef.current;
    if (!pending) return;
    pendingRequestRef.current = null;
    pending.reject(new Error(message));
  }, []);

  const buildX402Fetch = useCallback(
    async (expectedAddress?: string): Promise<FetchLike> => {
      if (!baseConnector) {
        throw new Error("Base Account connector is not available.");
      }

      const connectorClient = await getConnectorClient(wagmiConfig, {
        connector: baseConnector,
      });

      if (!connectorClient.account?.address) {
        throw new Error("Connect a Base Account first, then try again.");
      }

      if (
        expectedAddress &&
        connectorClient.account.address.toLowerCase() !== expectedAddress.toLowerCase()
      ) {
        throw new Error(
          `Reconnect the dedicated wallet ${formatAddress(expectedAddress)} before paying.`,
        );
      }

      const signTypedData = (
        connectorClient as {
          signTypedData?: (parameters: unknown) => Promise<string>;
        }
      ).signTypedData;
      if (!signTypedData) {
        throw new Error("The connected Base Account cannot sign x402 payloads.");
      }

      const signer = {
        address: connectorClient.account.address,
        signTypedData: async (parameters: {
          domain?: { chainId?: number };
        }) => {
          const requestedChainId = parameters.domain?.chainId;
          if (
            typeof requestedChainId === "number" &&
            connectorClient.chain?.id !== requestedChainId &&
            switchChainAsync
          ) {
            await switchChainAsync({ chainId: requestedChainId });
          }
          return signTypedData(parameters);
        },
      };

      const paymentClient = new x402Client();
      paymentClient.register("eip155:*", new ExactEvmScheme(signer as never));
      return wrapFetchWithPayment(
        globalThis.fetch.bind(globalThis),
        paymentClient,
      ) as FetchLike;
    },
    [baseConnector, switchChainAsync, wagmiConfig],
  );

  const settlePendingWithPayment = useCallback(
    async (expectedAddress?: string) => {
      const pending = pendingRequestRef.current;
      if (!pending) return;

      const x402Fetch = await buildX402Fetch(expectedAddress);
      const [nextInput, nextInit] = cloneRequestInfo(pending.input, pending.init);
      const response = await x402Fetch(nextInput, nextInit);
      pendingRequestRef.current = null;
      pending.resolve(response);
    },
    [buildX402Fetch],
  );

  const ensureBaseConnection = useCallback(async () => {
    if (isConnected && address) {
      return address;
    }
    if (!connectAsync || !baseConnector) {
      throw new Error("Base Account connect is unavailable.");
    }
    const result = await connectAsync({ connector: baseConnector });
    const nextAddress =
      result.accounts?.[0] ??
      result.accounts?.find((accountValue) => Boolean(accountValue));
    if (!nextAddress) {
      throw new Error("Connect a Base Account first, then try again.");
    }
    return nextAddress;
  }, [address, baseConnector, connectAsync, isConnected]);

  const handleUseCurrentAccount = useCallback(async () => {
    setError(null);
    setBusyAction("current");
    try {
      await ensureBaseConnection();
      await settlePendingWithPayment();
      setModalOpen(false);
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Failed to complete the x402 payment.",
      );
    } finally {
      setBusyAction(null);
    }
  }, [ensureBaseConnection, settlePendingWithPayment]);

  const handleUseAnotherAddress = useCallback(async () => {
    setError(null);
    setBusyAction("dedicated");
    try {
      if (!connectAsync || !baseConnector) {
        throw new Error("Base Account connect is unavailable.");
      }

      if (isConnected && disconnectAsync) {
        await disconnectAsync();
      }

      const result = await connectAsync({ connector: baseConnector });
      const nextAddress =
        result.accounts?.[0] ??
        result.accounts?.find((accountValue) => Boolean(accountValue));
      if (!nextAddress) {
        throw new Error("Pick or create the dedicated Base wallet, then try again.");
      }

      const nextDedicatedWallet: DedicatedWalletRecord = {
        address: nextAddress,
        source: "baseAccount",
        selectedAt: Date.now(),
      };
      persistDedicatedWallet(nextDedicatedWallet);
      await settlePendingWithPayment(nextAddress);
      setModalOpen(false);
    } catch (switchError) {
      setError(
        switchError instanceof Error
          ? switchError.message
          : "Failed to switch to the dedicated x402 wallet.",
      );
    } finally {
      setBusyAction(null);
    }
  }, [
    baseConnector,
    connectAsync,
    disconnectAsync,
    isConnected,
    persistDedicatedWallet,
    settlePendingWithPayment,
  ]);

  const clearDedicatedWallet = useCallback(() => {
    persistDedicatedWallet(null);
  }, [persistDedicatedWallet]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setError(null);
    resolvePendingWithOriginal();
  }, [resolvePendingWithOriginal]);

  const paymentFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const isChat = isChatRequest(input);
      const requestInput = isChat ? setPaymentMethodToCoinbase(input) : input;
      const [probeInput, probeInit] = cloneRequestInfo(requestInput, init);
      const response = await globalThis.fetch(probeInput, probeInit);

      if (!isChat || !shouldOpenPaymentModal(response)) {
        return response;
      }

      const [pendingInput, pendingInit] = cloneRequestInfo(requestInput, init);
      return await new Promise<Response>((resolve, reject) => {
        pendingRequestRef.current = {
          input: pendingInput,
          init: pendingInit,
          originalResponse: response,
          resolve,
          reject,
        };
        setError(null);
        setModalOpen(true);
      });
    },
    [],
  );

  const paymentUi = (
    <>
      <BasePaymentRuntimeSync dedicatedWallet={dedicatedWallet} />
      {dedicatedWallet ? (
        <div className="fixed left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-background/90 px-3 py-1 text-xs shadow-sm backdrop-blur">
          <span>Dedicated x402 wallet: {formatAddress(dedicatedWallet.address)}</span>
          <button
            type="button"
            onClick={clearDedicatedWallet}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
      ) : null}
      <BasePaymentModal
        open={modalOpen}
        activeAccount={address}
        dedicatedWallet={dedicatedWallet}
        walletAppName={walletAppName}
        error={error}
        busyAction={busyAction}
        onUseCurrentAccount={() => void handleUseCurrentAccount()}
        onUseAnotherAddress={() => void handleUseAnotherAddress()}
        onClose={closeModal}
      />
    </>
  );

  useEffect(() => {
    return () => {
      rejectPending("The Base payment flow was interrupted.");
    };
  }, [rejectPending]);

  return (
    <BasePaymentGateRender
      render={children}
      clientOptions={{ fetch: paymentFetch }}
      paymentUi={paymentUi}
    />
  );
}
