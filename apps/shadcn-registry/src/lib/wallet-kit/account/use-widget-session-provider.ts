"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  createProviderCredentialAdapter,
  createSiweWidgetAuthAdapter,
  createSiwsWidgetAuthAdapter,
  createWidgetSessionProvider,
  type WidgetAuthAdapter,
  type WidgetSessionProvider,
} from "@aomi-labs/client";
import type { AuthRuntime, SvmWalletRuntime } from "../composer/types";
import type { EvmWalletRuntime } from "../runtime/evm/wallet-runtime";
import { utf8ToBase64 } from "./encoding";

export type WidgetAuthConfig =
  | { mode: "provider"; provider: string; environment: string }
  | { mode: "wallet" };

/**
 * Build (and dispose) the cross-origin widget session provider for the account
 * runtime. Live auth/EVM/SVM runtimes are mirrored through refs so the memoized
 * provider reads current signers without being rebuilt on every render; it is
 * only rebuilt when a flat identity/config primitive changes.
 */
export function useWidgetSessionProvider(input: {
  baseUrl?: string;
  widgetAuth?: WidgetAuthConfig;
  auth: AuthRuntime;
  evm: EvmWalletRuntime;
  svm?: SvmWalletRuntime;
}): WidgetSessionProvider | undefined {
  const { baseUrl, widgetAuth, auth, evm, svm } = input;
  const authStatus = auth.status;
  const authSubject = auth.subject;
  const hasAuthCredential = Boolean(auth.getCredential);
  const mode = widgetAuth?.mode;
  const provider =
    widgetAuth?.mode === "provider" ? widgetAuth.provider : undefined;
  const environment =
    widgetAuth?.mode === "provider" ? widgetAuth.environment : undefined;

  const authRef = useRef(auth);
  const evmRef = useRef(evm);
  const svmRef = useRef(svm);
  authRef.current = auth;
  evmRef.current = evm;
  svmRef.current = svm;

  const widgetSessionProvider = useMemo(() => {
    if (!widgetAuth || !baseUrl) return undefined;
    let adapter: WidgetAuthAdapter;
    if (widgetAuth.mode === "provider") {
      // Provider SDKs briefly report a connected account before their
      // exchangeable credential is ready. Do not expose a required bearer
      // source during that gap: catalog loaders would consume it immediately
      // and turn normal auth boot into "Widget auth identity is unavailable".
      if (authStatus !== "authenticated" || !hasAuthCredential) {
        return undefined;
      }
      const config = widgetAuth;
      adapter = createProviderCredentialAdapter({
        provider: config.provider,
        environment: config.environment,
        getCredential: async () => authRef.current.getCredential?.() ?? null,
        getSubject: () => authRef.current.subject ?? null,
        signOut: async () => authRef.current.logout?.(),
      });
    } else {
      const currentWalletAdapter = (): WidgetAuthAdapter => {
        const evmRuntime = evmRef.current;
        const connection = evmRuntime.activeEvmConnection;
        if (
          connection?.address &&
          connection.chainId &&
          evmRuntime.signMessageAsync
        ) {
          return createSiweWidgetAuthAdapter({
            getSigner: async () => ({
              address: connection.address,
              chainId: connection.chainId!,
              signMessage: async (message) =>
                evmRuntime.signMessageAsync!({ message }),
            }),
          });
        }
        const svmRuntime = svmRef.current;
        const identity = svmRuntime?.identity(Date.now());
        const signMessage = svmRuntime?.execution.signSolanaMessage;
        if (identity?.address && signMessage) {
          return createSiwsWidgetAuthAdapter({
            getSigner: async () => ({
              address: identity.address!,
              chainId:
                svmRuntime?.selectedNetwork?.cluster ??
                identity.cluster ??
                "solana:mainnet",
              signMessage: async (message) =>
                (
                  await signMessage({
                    message: utf8ToBase64(message),
                    cluster:
                      svmRuntime?.selectedNetwork?.cluster ?? identity.cluster,
                  })
                ).signature,
            }),
          });
        }
        throw new Error(
          "Connect an external wallet to authenticate the widget",
        );
      };
      adapter = {
        kind: "wallet",
        getFingerprint: () => currentWalletAdapter().getFingerprint(),
        exchange: (options) => currentWalletAdapter().exchange(options),
      };
    }
    return createWidgetSessionProvider({ baseUrl, adapter });
    // Refs supply live auth/evm/svm; the provider is only rebuilt when a flat
    // identity/config primitive below changes.
  }, [
    baseUrl,
    authStatus,
    authSubject,
    hasAuthCredential,
    mode,
    environment,
    provider,
  ]);

  useEffect(
    () => () => widgetSessionProvider?.dispose(),
    [widgetSessionProvider],
  );

  return widgetSessionProvider;
}
