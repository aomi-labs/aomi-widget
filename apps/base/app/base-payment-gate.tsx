"use client";

import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { useAomiRuntime, type AomiClientOptions } from "@aomi-labs/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useConnect, useConnectors, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";
import { BasePaymentModal } from "./base-payment-modal";
import { useCoinbaseDedicatedWallet } from "./coinbase-dedicated-wallet-provider";

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
  source: "coinbase_cdp";
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

type BaseTypedDataParameter = {
  domain?: {
    chainId?: number;
  };
  types?: Record<string, Array<{ name: string; type: string }>>;
  primaryType?: string;
  message?: Record<string, unknown>;
};

type BaseProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

const DEDICATED_WALLET_STORAGE_KEY = "aomi_base_dedicated_wallet";
const BASE_MAINNET_HEX_CHAIN_ID = `0x${base.id.toString(16)}`;
const PAYMENT_FETCH_TIMEOUT_MS = 45_000;

function stringifyTypedDataForRpc(value: unknown): string {
  return JSON.stringify(value, (_key, entry) =>
    typeof entry === "bigint" ? entry.toString() : entry,
  );
}

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

function setPaymentMethodToCoinbase(
  input: RequestInfo | URL,
): RequestInfo | URL {
  if (typeof input === "string") {
    const url =
      input.startsWith("http://") || input.startsWith("https://")
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
  return [input instanceof Request ? input.clone() : input, init];
}

function withAbortSignal(
  init: RequestInit | undefined,
  signal: AbortSignal,
): RequestInit {
  return {
    ...(init ?? {}),
    signal,
  };
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

async function readX402ChallengeError(
  response: Response,
): Promise<string | null> {
  const paymentRequired = response.headers.get("payment-required");
  if (paymentRequired) return null;

  let detail = "Backend did not return a valid x402 Payment-Required header.";
  const contentType = response.headers.get("content-type") ?? "";
  const cloned = response.clone();

  try {
    if (contentType.includes("application/json")) {
      const body = (await cloned.json()) as {
        reason?: string;
        method?: string;
        type?: string;
      };
      if (body?.type === "payment-required") {
        const reason = body.reason?.trim();
        const method = body.method?.trim();
        if (reason && method) {
          detail = `${reason} (${method})`;
        } else if (reason) {
          detail = reason;
        }
      }
    } else {
      const text = (await cloned.text()).trim();
      if (text) {
        detail = `${detail} ${text}`;
      }
    }
  } catch {
    // Ignore parse failures and fall back to the generic message above.
  }

  return detail;
}

function parsePaymentRequiredHeader(
  headerValue: string | null,
): {
  error?: string;
  accepts?: Array<{
    amount?: string;
    asset?: string;
    network?: string;
    extra?: {
      name?: string;
    };
  }>;
} | null {
  if (!headerValue) return null;
  try {
    const binary = globalThis.atob(headerValue.trim());
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    return JSON.parse(new TextDecoder().decode(bytes)) as { error?: string };
  } catch {
    return null;
  }
}

function describeKnownX402Error(
  error: string,
  paymentRequired: ReturnType<typeof parsePaymentRequiredHeader>,
): string {
  const requirement = paymentRequired?.accepts?.[0];
  const assetName = requirement?.extra?.name?.trim() || "the payment asset";
  const network =
    requirement?.network === "eip155:84532"
      ? "Base Sepolia"
      : requirement?.network;

  if (error === "invalid_exact_evm_insufficient_balance") {
    if (network) {
      return `The selected wallet does not have enough ${assetName} on ${network} to pay this x402 request.`;
    }
    return `The selected wallet does not have enough ${assetName} to pay this x402 request.`;
  }

  if (error === "invalid_exact_evm_signature") {
    return "The connected Base Account could not produce an x402-compatible payment signature. Use the dedicated Coinbase wallet path for this payment.";
  }

  return error;
}

async function readX402PaymentError(response: Response): Promise<string> {
  const paymentRequired = parsePaymentRequiredHeader(
    response.headers.get("payment-required"),
  );
  const headerError = paymentRequired?.error?.trim();
  if (headerError) {
    return describeKnownX402Error(headerError, paymentRequired);
  }

  try {
    const text = (await response.clone().text()).trim();
    if (text) return text;
  } catch {
    // Ignore body read failures and use the generic message below.
  }

  return "The backend rejected the x402 payment.";
}

async function runPaymentFetchWithTimeout(
  fetcher: FetchLike,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort(
      new Error("The x402 payment took too long. Please try again."),
    );
  }, PAYMENT_FETCH_TIMEOUT_MS);

  try {
    return await fetcher(input, withAbortSignal(init, controller.signal));
  } catch (error) {
    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      if (reason instanceof Error) {
        throw reason;
      }
      throw new Error("The x402 payment took too long. Please try again.");
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
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
  const { address, isConnected } = useAccount();
  const connectors = useConnectors();
  const { connectAsync, isPending: isConnecting } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const dedicatedWalletClient = useCoinbaseDedicatedWallet();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"choice" | "dedicated">("choice");
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    "current" | "dedicated_pay" | "dedicated_connect" | null
  >(null);
  const [dedicatedWallet, setDedicatedWallet] =
    useState<DedicatedWalletRecord | null>(null);

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

  const persistDedicatedWallet = useCallback(
    (next: DedicatedWalletRecord | null) => {
      setDedicatedWallet(next);
      if (!next) {
        globalThis.localStorage?.removeItem(DEDICATED_WALLET_STORAGE_KEY);
        return;
      }
      globalThis.localStorage?.setItem(
        DEDICATED_WALLET_STORAGE_KEY,
        JSON.stringify(next),
      );
    },
    [],
  );

  const rejectPending = useCallback((message: string) => {
    const pending = pendingRequestRef.current;
    if (!pending) return;
    pendingRequestRef.current = null;
    pending.reject(new Error(message));
  }, []);

  const settlePending = useCallback(async (fetcher: FetchLike) => {
    const pending = pendingRequestRef.current;
    if (!pending) return;
    const challengeError = await readX402ChallengeError(
      pending.originalResponse,
    );
    if (challengeError) {
      throw new Error(challengeError);
    }
    const [nextInput, nextInit] = cloneRequestInfo(pending.input, pending.init);
    const response = await runPaymentFetchWithTimeout(
      fetcher,
      nextInput,
      nextInit,
    );
    if (response.status === 402) {
      throw new Error(await readX402PaymentError(response));
    }
    pendingRequestRef.current = null;
    pending.resolve(response);
  }, []);

  const buildBaseAccountX402Fetch = useCallback(
    async (expectedAddress?: string): Promise<FetchLike> => {
      if (!baseConnector) {
        throw new Error("Base Account connector is not available.");
      }

      const provider = (await baseConnector.getProvider?.({
        chainId: base.id,
      })) as BaseProvider | undefined;

      if (!provider?.request) {
        throw new Error("Base Account provider is unavailable.");
      }

      const accountsResult = await provider.request({
        method: "eth_requestAccounts",
      });
      const accounts = Array.isArray(accountsResult)
        ? (accountsResult as string[])
        : [];
      const signerAddress = accounts[0] ?? address;

      if (!signerAddress) {
        throw new Error("Connect a Base Account first, then try again.");
      }

      if (
        expectedAddress &&
        signerAddress.toLowerCase() !== expectedAddress.toLowerCase()
      ) {
        throw new Error(
          `Reconnect the wallet ${formatAddress(expectedAddress)} before paying.`,
        );
      }

      const signer = {
        address: signerAddress,
        signTypedData: async (parameters: BaseTypedDataParameter) => {
          const requestedChainId = parameters.domain?.chainId;
          if (
            typeof requestedChainId === "number" &&
            requestedChainId !== base.id &&
            switchChainAsync
          ) {
            await switchChainAsync({ chainId: requestedChainId });
          } else if (requestedChainId === base.id) {
            await provider
              .request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: BASE_MAINNET_HEX_CHAIN_ID }],
              })
              .catch(() => undefined);
          }

          const typedData = {
            domain: parameters.domain ?? {},
            types: parameters.types ?? {},
            primaryType: parameters.primaryType,
            message: parameters.message ?? {},
          };

          const signature = await provider.request({
            method: "eth_signTypedData_v4",
            params: [signerAddress, stringifyTypedDataForRpc(typedData)],
          });

          if (typeof signature !== "string") {
            throw new Error("Base Account returned an invalid x402 signature.");
          }
          return signature;
        },
      };

      const paymentClient = new x402Client();
      paymentClient.register("eip155:*", new ExactEvmScheme(signer as never));
      return wrapFetchWithPayment(
        globalThis.fetch.bind(globalThis),
        paymentClient,
      ) as FetchLike;
    },
    [address, baseConnector, switchChainAsync],
  );

  const maybePayWithDedicatedWallet = useCallback(
    async (
      requestInput: RequestInfo | URL,
      init: RequestInit | undefined,
    ): Promise<Response | null> => {
      if (
        !dedicatedWallet ||
        !dedicatedWalletClient.isConfigured ||
        dedicatedWalletClient.isConfigurationChecking ||
        !dedicatedWalletClient.isSignedIn ||
        !dedicatedWalletClient.fetchWithPayment ||
        !dedicatedWalletClient.evmAddress
      ) {
        return null;
      }

      if (
        dedicatedWalletClient.evmAddress.toLowerCase() !==
        dedicatedWallet.address.toLowerCase()
      ) {
        return null;
      }

      const [nextInput, nextInit] = cloneRequestInfo(requestInput, init);
      const response = await runPaymentFetchWithTimeout(
        dedicatedWalletClient.fetchWithPayment,
        nextInput,
        nextInit,
      );
      if (response.status === 402) {
        throw new Error(await readX402PaymentError(response));
      }
      return response;
    },
    [dedicatedWallet, dedicatedWalletClient],
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
      const fetcher = await buildBaseAccountX402Fetch();
      await settlePending(fetcher);
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
  }, [buildBaseAccountX402Fetch, ensureBaseConnection, settlePending]);

  const handlePrepareDedicatedWallet = useCallback(() => {
    setError(null);
    setModalMode("dedicated");
  }, []);

  const handlePayWithDedicatedWallet = useCallback(async () => {
    setError(null);
    setBusyAction("dedicated_pay");
    try {
      if (dedicatedWalletClient.isConfigurationChecking) {
        throw new Error(
          "Coinbase embedded wallet configuration is still loading.",
        );
      }
      if (
        !dedicatedWalletClient.isConfigured ||
        !dedicatedWalletClient.fetchWithPayment
      ) {
        throw new Error(
          dedicatedWalletClient.configurationError ??
            "Coinbase embedded wallet is not configured.",
        );
      }
      if (
        !dedicatedWalletClient.isSignedIn ||
        !dedicatedWalletClient.evmAddress
      ) {
        throw new Error("Sign in to the Coinbase embedded wallet first.");
      }

      const selectedWallet: DedicatedWalletRecord = {
        address: dedicatedWalletClient.evmAddress,
        source: "coinbase_cdp",
        selectedAt: Date.now(),
      };
      persistDedicatedWallet(selectedWallet);
      await settlePending(dedicatedWalletClient.fetchWithPayment);
      setModalOpen(false);
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Failed to pay with the dedicated wallet.",
      );
    } finally {
      setBusyAction(null);
    }
  }, [dedicatedWalletClient, persistDedicatedWallet, settlePending]);

  const clearDedicatedWallet = useCallback(() => {
    persistDedicatedWallet(null);
  }, [persistDedicatedWallet]);

  const closeModal = useCallback(() => {
    rejectPending("Payment required. Choose an x402 payment wallet to continue.");
    setModalOpen(false);
    setModalMode("choice");
    setError(null);
  }, [rejectPending]);

  const paymentFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const isChat = isChatRequest(input);
      const requestInput = isChat ? setPaymentMethodToCoinbase(input) : input;
      const [probeInput, probeInit] = cloneRequestInfo(requestInput, init);
      const response = await globalThis.fetch(probeInput, probeInit);

      if (!isChat || !shouldOpenPaymentModal(response)) {
        return response;
      }

      const dedicatedResponse = await maybePayWithDedicatedWallet(
        requestInput,
        init,
      ).catch((paymentError) => {
        setError(
          paymentError instanceof Error
            ? paymentError.message
            : "Dedicated wallet payment failed.",
        );
        return null;
      });
      if (dedicatedResponse) {
        return dedicatedResponse;
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
        setModalMode(
          dedicatedWallet &&
            (!dedicatedWalletClient.isSignedIn ||
              dedicatedWalletClient.evmAddress?.toLowerCase() !==
                dedicatedWallet.address.toLowerCase())
            ? "dedicated"
            : "choice",
        );
        setModalOpen(true);
      });
    },
    [dedicatedWallet, dedicatedWalletClient, maybePayWithDedicatedWallet],
  );

  const paymentUi = (
    <>
      <BasePaymentRuntimeSync dedicatedWallet={dedicatedWallet} />
      {dedicatedWallet ? (
        <div className="bg-background/90 fixed left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border px-3 py-1 text-xs shadow-sm backdrop-blur">
          <span>
            Dedicated x402 wallet: {formatAddress(dedicatedWallet.address)}
          </span>
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
        mode={modalMode}
        activeAccount={address}
        dedicatedWallet={dedicatedWallet}
        dedicatedWalletConfigured={dedicatedWalletClient.isConfigured}
        dedicatedWalletConfigurationChecking={
          dedicatedWalletClient.isConfigurationChecking
        }
        dedicatedWalletConfigurationError={
          dedicatedWalletClient.configurationError
        }
        dedicatedWalletSignedIn={dedicatedWalletClient.isSignedIn}
        dedicatedWalletAddress={dedicatedWalletClient.evmAddress}
        walletAppName={walletAppName}
        error={error}
        busyAction={busyAction}
        onUseCurrentAccount={() => void handleUseCurrentAccount()}
        onUseAnotherAddress={handlePrepareDedicatedWallet}
        onPayWithDedicatedWallet={() => void handlePayWithDedicatedWallet()}
        onBackToChoices={() => {
          setError(null);
          setModalMode("choice");
        }}
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
