"use client";

import {
  AOMI_SESSION_BOOTING_IDENTITY,
  AOMI_SESSION_DISCONNECTED_IDENTITY,
  formatAddress,
  formatAuthMethod,
} from "../identity";
import type { AomiSessionIdentity } from "../types";
import {
  detectSvmTransport,
  getSvmCapabilitySnapshot,
} from "../runtime/svm/wallet-runtime";
import type { AuthRuntime, SvmWalletRuntime } from "./types";

export function buildWalletKitIdentity({
  auth,
  address,
  chainId,
  isBooting,
  isConnected,
  svm,
  aa,
  sponsorship,
  walletName,
  walletSource,
}: {
  auth: AuthRuntime;
  address?: string;
  chainId?: number;
  isBooting: boolean;
  isConnected: boolean;
  svm?: SvmWalletRuntime;
  aa: Pick<AomiSessionIdentity, "aaMode" | "SmartAccount4337" | "Delegation7702">;
  sponsorship: Pick<
    AomiSessionIdentity,
    "sponsored" | "sponsorProvider" | "sponsorAccount"
  >;
  walletName?: string;
  walletSource?: AomiSessionIdentity["walletSource"];
}): AomiSessionIdentity {
  const svmAddress = svm?.wallet.publicKey;
  const solanaTransport = detectSvmTransport(svm?.wallet.walletName);
  const solanaCapabilities = getSvmCapabilitySnapshot(svm?.wallet);
  const baseSvm = {
    svmAddress,
    solanaCluster: svm?.config.cluster,
    solanaWalletName: svm?.wallet.walletName,
    solanaTransport: svmAddress ? solanaTransport : undefined,
    solanaCapabilities,
  };

  if (isBooting) {
    return {
      ...AOMI_SESSION_BOOTING_IDENTITY,
      chainId,
      ...baseSvm,
    };
  }

  if (isConnected && auth.primaryLabel) {
    return {
      status: "connected",
      isConnected: true,
      address,
      walletKind: "eoa",
      ...aa,
      ...sponsorship,
      chainId,
      sessionProvider: auth.sessionProvider,
      embeddedProvider: auth.embeddedProvider,
      walletSource:
        walletSource ??
        (address && auth.embeddedProvider ? "embedded" : undefined),
      walletProvider: auth.legacyWalletProvider,
      walletProviderSubject: auth.subject,
      authMethod: auth.authMethod,
      authProvider: auth.authMethod,
      authValue: auth.authValue,
      primaryLabel: auth.primaryLabel,
      secondaryLabel:
        formatAuthMethod(auth.authMethod) ?? formatProvider(auth.provider),
      ...baseSvm,
    };
  }

  if (isConnected && address) {
    return {
      status: "connected",
      isConnected: true,
      address,
      walletKind: "eoa",
      ...aa,
      ...sponsorship,
      chainId,
      sessionProvider: auth.sessionProvider,
      embeddedProvider: auth.embeddedProvider,
      walletSource:
        walletSource ?? (auth.embeddedProvider ? "embedded" : "injected"),
      walletProvider: auth.legacyWalletProvider,
      walletProviderSubject: auth.subject,
      authMethod: auth.authMethod ?? "wagmi",
      authProvider: auth.authMethod ?? "wagmi",
      authValue: auth.authValue,
      primaryLabel: formatAddress(address) ?? "Connected wallet",
      secondaryLabel:
        walletName ??
        formatAuthMethod(auth.authMethod ?? "wagmi") ??
        formatProvider(auth.provider),
      ...baseSvm,
    };
  }

  if (svmAddress) {
    return {
      status: "connected",
      isConnected: true,
      walletKind: undefined,
      aaMode: undefined,
      chainId,
      svmAddress,
      sessionProvider: auth.sessionProvider,
      walletSource: "injected",
      walletProvider: auth.legacyWalletProvider,
      walletProviderSubject: auth.subject,
      authMethod: auth.authMethod,
      authProvider: auth.authMethod,
      authValue: auth.authValue,
      primaryLabel: formatAddress(svmAddress) ?? "Connected Solana wallet",
      secondaryLabel: "Solana",
      solanaCluster: svm?.config.cluster,
      solanaWalletName: svm?.wallet.walletName,
      solanaTransport,
      solanaCapabilities,
    };
  }

  return {
    ...AOMI_SESSION_DISCONNECTED_IDENTITY,
    chainId,
    sessionProvider: auth.sessionProvider,
    walletProvider: auth.legacyWalletProvider,
    walletProviderSubject: auth.subject,
    authMethod: auth.authMethod,
    authProvider: auth.authMethod,
    authValue: auth.authValue,
    solanaCluster: svm?.config.cluster,
  };
}

function formatProvider(provider: AuthRuntime["provider"]): string {
  if (provider === "none") return "Wallet";
  if (provider === "baseAccount") return "Base Account";
  return provider[0].toUpperCase() + provider.slice(1);
}
