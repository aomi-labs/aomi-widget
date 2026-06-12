"use client";

import {
  AOMI_AUTH_BOOTING_IDENTITY,
  AOMI_AUTH_DISCONNECTED_IDENTITY,
  formatAddress,
  formatAuthMethod,
} from "../identity";
import type { AomiAuthIdentity } from "../types";
import type { AuthRuntime, SvmWalletRuntime } from "./types";

export function buildAdapterIdentity({
  auth,
  address,
  chainId,
  isBooting,
  isConnected,
  svm,
  aa,
  sponsorship,
  walletName,
}: {
  auth: AuthRuntime;
  address?: string;
  chainId?: number;
  isBooting: boolean;
  isConnected: boolean;
  svm?: SvmWalletRuntime;
  aa: Pick<AomiAuthIdentity, "aaMode" | "SmartAccount4337" | "Delegation7702">;
  sponsorship: Pick<
    AomiAuthIdentity,
    "sponsored" | "sponsorProvider" | "sponsorAccount"
  >;
  walletName?: string;
}): AomiAuthIdentity {
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
      ...AOMI_AUTH_BOOTING_IDENTITY,
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
      walletProvider: auth.provider,
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
      walletProvider: auth.provider,
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
      walletProvider: auth.provider,
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
    ...AOMI_AUTH_DISCONNECTED_IDENTITY,
    chainId,
    walletProvider: auth.provider,
    walletProviderSubject: auth.subject,
    authMethod: auth.authMethod,
    authProvider: auth.authMethod,
    authValue: auth.authValue,
    solanaCluster: svm?.config.cluster,
  };
}

function formatProvider(provider: AuthRuntime["provider"]): string {
  if (provider === "baseAccount") return "Base Account";
  return provider[0].toUpperCase() + provider.slice(1);
}

function detectSvmTransport(
  walletName: string | undefined,
): "extension" | "embedded" | "mwa" {
  const normalized = walletName?.toLowerCase() ?? "";
  if (
    normalized.includes("mobile wallet adapter") ||
    normalized.includes("solana mobile") ||
    normalized.includes("mwa")
  ) {
    return "mwa";
  }
  return "extension";
}

function getSvmCapabilitySnapshot(
  wallet: SvmWalletRuntime["wallet"] | undefined,
) {
  if (!wallet?.publicKey) {
    return undefined;
  }
  return {
    canSignMessage: Boolean(wallet.signMessage),
    canSignTransaction: Boolean(wallet.signTransaction),
    canSignAllTransactions: Boolean(wallet.signAllTransactions),
    canSendTransaction: Boolean(wallet.sendTransaction),
    canSignAndSendTransaction: Boolean(wallet.sendTransaction),
  };
}
