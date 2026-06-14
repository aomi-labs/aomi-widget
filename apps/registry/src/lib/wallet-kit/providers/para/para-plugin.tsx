"use client";

import { Environment } from "@getpara/react-sdk";
import type { AuthMethodId, WalletsConfig } from "../../config/types";
import { resolveAomiSvmConfig } from "../../catalog/svm-wallet-catalog";
import type { WalletProviderPlugin } from "../plugin-registry";
import { AomiParaProvider } from "./para";
import type { ParaSvmOptions } from "./para-svm";

function toParaEnvironment(value?: "PROD" | "BETA") {
  if (!value) return undefined;
  return value === "PROD" ? Environment.PROD : Environment.BETA;
}

function toParaOAuthMethods(
  methods: readonly AuthMethodId[] | undefined,
):
  | Array<"GOOGLE" | "APPLE" | "DISCORD" | "TWITTER" | "FARCASTER" | "TELEGRAM">
  | undefined {
  if (!methods) return undefined;
  const map = {
    google: "GOOGLE",
    apple: "APPLE",
    discord: "DISCORD",
    x: "TWITTER",
    farcaster: "FARCASTER",
    telegram: "TELEGRAM",
  } as const;
  return methods
    .map((method) => map[method as keyof typeof map])
    .filter((method): method is NonNullable<typeof method> => Boolean(method));
}

function toProviderSvmOptions(
  solana: WalletsConfig["solana"],
): ParaSvmOptions | undefined {
  if (solana === false) return { enabled: false };
  if (!solana) return undefined;
  return {
    networks: solana.networks,
    preferDirectSend: solana.preferDirectSend,
    wallets: resolveAomiSvmConfig(solana).wallets,
  };
}

export const paraPlugin: WalletProviderPlugin = {
  id: "para",
  render: (props) => {
    const para =
      props.providers?.para === false ? undefined : props.providers?.para;
    const auth =
      props.auth !== false && props.auth?.provider === "para"
        ? props.auth
        : undefined;
    const evmWallets =
      props.wallets?.evm === false ? undefined : props.wallets?.evm;
    return (
      <AomiParaProvider
        apiKey={para?.apiKey}
        environment={toParaEnvironment(para?.environment)}
        appName={para?.appName}
        appDescription={para?.appDescription}
        appUrl={para?.appUrl}
        networks={evmWallets?.chains}
        walletConnectProjectId={evmWallets?.walletConnectProjectId}
        oAuthMethods={toParaOAuthMethods(auth?.methods)}
        svm={toProviderSvmOptions(props.wallets?.solana)}
      >
        {props.children}
      </AomiParaProvider>
    );
  },
  detectSugar: (input) => {
    if (
      input.auth !== false &&
      input.auth?.provider === "para" &&
      "apiKey" in input.auth
    ) {
      return {
        children: input.children,
        providers: {
          para: {
            apiKey: input.auth.apiKey,
            environment: input.auth.environment,
            appName: input.auth.appName,
            appDescription: input.auth.appDescription,
          },
        },
        auth: { provider: "para", methods: input.auth.methods },
      };
    }
    return null;
  },
};
