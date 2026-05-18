"use client";

import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { type Config, type EIP712TypedData } from "@coinbase/cdp-core";
import {
  useEvmAddress,
  useIsSignedIn,
  useSignEvmTypedData,
  useSignOut,
} from "@coinbase/cdp-hooks";
import { CDPReactProvider } from "@coinbase/cdp-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type X402TypedDataParameter = {
  domain?: Record<string, unknown>;
  types?: Record<string, unknown>;
  primaryType?: string;
  message?: Record<string, unknown>;
};

type EIP712Field = {
  name: string;
  type: string;
};

type CoinbaseDedicatedWalletContextValue = {
  isConfigured: boolean;
  isConfigurationChecking: boolean;
  configurationError: string | null;
  isSignedIn: boolean;
  evmAddress?: string;
  fetchWithPayment: FetchLike | null;
  signOut: (() => Promise<void>) | null;
};

const CoinbaseDedicatedWalletContext =
  createContext<CoinbaseDedicatedWalletContextValue>({
    isConfigured: false,
    isConfigurationChecking: false,
    configurationError: null,
    isSignedIn: false,
    evmAddress: undefined,
    fetchWithPayment: null,
    signOut: null,
  });

type CoinbaseDedicatedWalletProviderProps = {
  children: ReactNode;
};

function toJsonSafeValue(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(toJsonSafeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, toJsonSafeValue(entry)]),
    );
  }
  return value;
}

function inferDomainFieldType(name: string): string {
  if (name === "chainId") return "uint256";
  if (name === "verifyingContract") return "address";
  if (name === "salt") return "bytes32";
  return "string";
}

function withEIP712DomainType(
  domain: Record<string, unknown>,
  types: Record<string, unknown>,
): Record<string, unknown> {
  if (types.EIP712Domain) return types;
  const domainFields: EIP712Field[] = Object.keys(domain).map((name) => ({
    name,
    type: inferDomainFieldType(name),
  }));
  return {
    EIP712Domain: domainFields,
    ...types,
  };
}

function CoinbaseDedicatedWalletBridge({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const { isSignedIn } = useIsSignedIn();
  const { evmAddress } = useEvmAddress();
  const { signEvmTypedData } = useSignEvmTypedData();
  const { signOut } = useSignOut();
  const [configurationError, setConfigurationError] = useState<string | null>(
    null,
  );
  const [isConfigurationChecking, setIsConfigurationChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkProjectConfiguration() {
      setIsConfigurationChecking(true);
      setConfigurationError(null);

      try {
        const serverCheck = await fetch(
          `/api/cdp-project-config?project_id=${encodeURIComponent(projectId)}`,
        );

        if (cancelled) return;

        if (!serverCheck.ok) {
          let detail = `Coinbase CDP project check failed with HTTP ${serverCheck.status}.`;
          try {
            const body = (await serverCheck.json()) as { error?: string };
            if (body.error) {
              detail = body.error;
            }
          } catch {
            // Keep the status-based message.
          }
          setConfigurationError(detail);
          return;
        }

        const response = await fetch(
          `https://api.cdp.coinbase.com/platform/v2/embedded-wallet-api/projects/${projectId}/config`,
          {
            credentials: "include",
            mode: "cors",
          },
        );

        if (cancelled) return;

        if (!response.ok) {
          let detail = `Coinbase CDP project check failed with HTTP ${response.status}.`;
          try {
            const body = (await response.json()) as { errorMessage?: string };
            if (body.errorMessage) {
              detail = body.errorMessage;
            }
          } catch {
            // Keep the status-based message.
          }
          setConfigurationError(detail);
        }
      } catch {
        if (!cancelled) {
          setConfigurationError(
            "Coinbase CDP could not load this project's browser configuration from this origin. Add http://localhost:3000 to the CDP project's allowed origins.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsConfigurationChecking(false);
        }
      }
    }

    void checkProjectConfiguration();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const fetchWithPayment = useMemo<FetchLike | null>(() => {
    if (!evmAddress) return null;

    const signer = {
      address: evmAddress,
      signTypedData: async (parameters: X402TypedDataParameter) => {
        if (!parameters.primaryType) {
          throw new Error("x402 payment typed data is missing primaryType.");
        }

        const safeDomain = (toJsonSafeValue(parameters.domain ?? {}) ??
          {}) as Record<string, unknown>;
        const safeTypes = (toJsonSafeValue(parameters.types ?? {}) ??
          {}) as Record<string, unknown>;

        const result = await signEvmTypedData({
          evmAccount: evmAddress,
          typedData: {
            domain: safeDomain as EIP712TypedData["domain"],
            types: withEIP712DomainType(
              safeDomain,
              safeTypes,
            ) as EIP712TypedData["types"],
            primaryType: parameters.primaryType,
            message: (toJsonSafeValue(parameters.message ?? {}) ??
              {}) as EIP712TypedData["message"],
          },
        });

        return result.signature;
      },
    };

    const paymentClient = new x402Client();
    paymentClient.register("eip155:*", new ExactEvmScheme(signer as never));
    return wrapFetchWithPayment(
      globalThis.fetch.bind(globalThis),
      paymentClient,
    ) as FetchLike;
  }, [evmAddress, signEvmTypedData]);

  const value = useMemo<CoinbaseDedicatedWalletContextValue>(
    () => ({
      isConfigured: !configurationError,
      isConfigurationChecking,
      configurationError,
      isSignedIn,
      evmAddress: evmAddress ?? undefined,
      fetchWithPayment: fetchWithPayment as FetchLike,
      signOut,
    }),
    [
      configurationError,
      evmAddress,
      fetchWithPayment,
      isConfigurationChecking,
      isSignedIn,
      signOut,
    ],
  );

  return (
    <CoinbaseDedicatedWalletContext.Provider value={value}>
      {children}
    </CoinbaseDedicatedWalletContext.Provider>
  );
}

export function CoinbaseDedicatedWalletProvider({
  children,
}: CoinbaseDedicatedWalletProviderProps) {
  const projectId = process.env.NEXT_PUBLIC_CDP_PROJECT_ID?.trim();

  const unconfiguredValue = useMemo<CoinbaseDedicatedWalletContextValue>(
    () => ({
      isConfigured: false,
      isConfigurationChecking: false,
      configurationError: null,
      isSignedIn: false,
      evmAddress: undefined,
      fetchWithPayment: null,
      signOut: null,
    }),
    [],
  );

  if (!projectId) {
    return (
      <CoinbaseDedicatedWalletContext.Provider value={unconfiguredValue}>
        {children}
      </CoinbaseDedicatedWalletContext.Provider>
    );
  }

  const config: Config = {
    projectId,
    ethereum: {
      createOnLogin: "eoa",
    },
  };

  return (
    <CDPReactProvider config={config} className="h-full">
      <CoinbaseDedicatedWalletBridge projectId={projectId}>
        {children}
      </CoinbaseDedicatedWalletBridge>
    </CDPReactProvider>
  );
}

export function useCoinbaseDedicatedWallet() {
  return useContext(CoinbaseDedicatedWalletContext);
}
