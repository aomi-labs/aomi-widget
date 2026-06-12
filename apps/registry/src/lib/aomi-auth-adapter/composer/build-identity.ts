"use client";

import {
  AOMI_AUTH_BOOTING_IDENTITY,
  AOMI_AUTH_DISCONNECTED_IDENTITY,
  formatAddress,
  formatAuthMethod,
} from "../identity";
import type { AomiAuthIdentity } from "../types";
import type { AuthRuntime, SolanaWalletRuntime } from "./types";

export function buildAdapterIdentity({
  auth,
  address,
  chainId,
  isBooting,
  isConnected,
  solana,
  aa,
  sponsorship,
  walletName,
}: {
  auth: AuthRuntime;
  address?: string;
  chainId?: number;
  isBooting: boolean;
  isConnected: boolean;
  solana?: SolanaWalletRuntime;
  aa: Pick<AomiAuthIdentity, "aaMode" | "SmartAccount4337" | "Delegation7702">;
  sponsorship: Pick<
    AomiAuthIdentity,
    "sponsored" | "sponsorProvider" | "sponsorAccount"
  >;
  walletName?: string;
}): AomiAuthIdentity {
  const svmAddress = solana?.wallet.publicKey;
  const solanaTransport = detectSolanaTransport(solana?.wallet.walletName);
  const solanaCapabilities = getSolanaCapabilitySnapshot(solana?.wallet);
  const baseSolana = {
    svmAddress,
    solanaCluster: solana?.config.cluster,
    solanaWalletName: solana?.wallet.walletName,
    solanaTransport: svmAddress ? solanaTransport : undefined,
    solanaCapabilities,
  };

  if (isBooting) {
    return {
      ...AOMI_AUTH_BOOTING_IDENTITY,
      chainId,
      ...baseSolana,
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
      ...baseSolana,
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
      ...baseSolana,
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
      solanaCluster: solana?.config.cluster,
      solanaWalletName: solana?.wallet.walletName,
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
    solanaCluster: solana?.config.cluster,
  };
}

function formatProvider(provider: AuthRuntime["provider"]): string {
  if (provider === "baseAccount") return "Base Account";
  return provider[0].toUpperCase() + provider.slice(1);
}

function detectSolanaTransport(
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

function getSolanaCapabilitySnapshot(
  wallet: SolanaWalletRuntime["wallet"] | undefined,
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
