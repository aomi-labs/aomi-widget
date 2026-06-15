"use client";

import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import {
  Connection as SolanaConnection,
  Transaction as SolanaTransaction,
  VersionedTransaction,
} from "@solana/web3.js";
import type { AomiWalletOption, SvmWalletDescriptor } from "../../types";
import { SVM_WALLET_ALLOWLIST } from "../../catalog/svm-wallet-catalog";
import { canonicalWalletKey } from "../../catalog/wallet-branding";
import { DEFAULT_SVM_CLUSTER, DEFAULT_SVM_RPC_HTTP_URLS } from "./networks";

export type SafeSvmWalletState = {
  publicKey: string | undefined;
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  walletName: string | undefined;
  wallets: Array<{
    adapter: {
      name: string;
      readyState: SolanaWalletReadyState;
    };
    readyState: SolanaWalletReadyState;
  }>;
  select: ((walletName: SolanaWalletName) => void) | undefined;
  connect: (() => Promise<void>) | undefined;
  disconnect: (() => Promise<void>) | undefined;
  signTransaction:
    | ((
        tx: VersionedTransaction | SolanaTransaction,
      ) => Promise<VersionedTransaction | SolanaTransaction>)
    | undefined;
  signAllTransactions:
    | ((
        txs: Array<VersionedTransaction | SolanaTransaction>,
      ) => Promise<Array<VersionedTransaction | SolanaTransaction>>)
    | undefined;
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | undefined;
  sendTransaction:
    | ((
        tx: VersionedTransaction | SolanaTransaction,
        connection: SolanaConnection,
      ) => Promise<string>)
    | undefined;
};

export const DEFAULT_SVM_ENDPOINT =
  DEFAULT_SVM_RPC_HTTP_URLS[DEFAULT_SVM_CLUSTER];

type SolanaWalletReadyState =
  | "Installed"
  | "NotDetected"
  | "Loadable"
  | "Unsupported";
type SolanaWalletName = Parameters<
  ReturnType<typeof useSolanaWallet>["select"]
>[0];

export function useSafeSvmWallet(): SafeSvmWalletState {
  try {
    const wallet = useSolanaWallet();
    return {
      publicKey: wallet.publicKey?.toBase58(),
      connected: wallet.connected,
      connecting: wallet.connecting,
      disconnecting: wallet.disconnecting,
      walletName: wallet.wallet?.adapter?.name,
      wallets: wallet.wallets,
      select: wallet.select,
      connect: wallet.connect,
      disconnect: wallet.disconnect,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
      signMessage: wallet.signMessage,
      sendTransaction: wallet.sendTransaction,
    };
  } catch {
    return {
      publicKey: undefined,
      connected: false,
      connecting: false,
      disconnecting: false,
      walletName: undefined,
      wallets: [],
      select: undefined,
      connect: undefined,
      disconnect: undefined,
      signTransaction: undefined,
      signAllTransactions: undefined,
      signMessage: undefined,
      sendTransaction: undefined,
    };
  }
}

export function detectSvmTransport(
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

function isUsableWalletReadyState(readyState: SolanaWalletReadyState): boolean {
  return readyState === "Installed" || readyState === "Loadable";
}

function walletPriority(name: string): number {
  const normalized = name.toLowerCase();
  if (normalized.includes("phantom")) return 0;
  if (normalized.includes("solflare")) return 1;
  if (normalized.includes("backpack")) return 2;
  if (normalized.includes("glow")) return 3;
  return 10;
}

function pickPreferredSvmWallet(wallet: SafeSvmWalletState) {
  return [...wallet.wallets]
    .filter((candidate) => isUsableWalletReadyState(candidate.readyState))
    .sort((left, right) => {
      const installedDelta =
        Number(left.readyState === "Installed") -
        Number(right.readyState === "Installed");
      if (installedDelta !== 0) {
        return -installedDelta;
      }
      return (
        walletPriority(left.adapter.name) - walletPriority(right.adapter.name)
      );
    })[0];
}

export type SvmConnectAttempt =
  | { status: "connected" }
  | { status: "unavailable" }
  | {
      status: "selecting";
      walletName: string;
    };

export async function connectPreferredSvmWallet(
  wallet: SafeSvmWalletState,
): Promise<SvmConnectAttempt> {
  if (wallet.publicKey || wallet.connected) {
    return { status: "connected" };
  }

  if (!wallet.select || !wallet.connect) {
    return { status: "unavailable" };
  }

  if (wallet.walletName) {
    await wallet.connect();
    return { status: "connected" };
  }

  const selectedWallet = pickPreferredSvmWallet(wallet);
  if (!selectedWallet) {
    return { status: "unavailable" };
  }

  wallet.select(selectedWallet.adapter.name as SolanaWalletName);
  return { status: "selecting", walletName: selectedWallet.adapter.name };
}

export function getSvmCapabilitySnapshot(
  wallet: SafeSvmWalletState | undefined,
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

export function buildSvmWalletDescriptors(
  wallet: SafeSvmWalletState,
): SvmWalletDescriptor[] {
  return wallet.wallets
    .filter((entry) =>
      SVM_WALLET_ALLOWLIST.has(canonicalWalletKey(entry.adapter.name)),
    )
    .map((entry) => ({
      name: entry.adapter.name,
      installed: entry.readyState === "Installed",
      ready:
        entry.readyState === "Installed" || entry.readyState === "Loadable",
    }));
}

export function toSvmWalletOption(
  descriptor: SvmWalletDescriptor,
): AomiWalletOption {
  return {
    id: descriptor.name,
    label: descriptor.name,
    family: "solana",
    kind: "solana",
    status: descriptor.ready
      ? descriptor.installed
        ? "installed"
        : "available"
      : "unavailable",
    installed: descriptor.installed,
    ready: descriptor.ready,
  };
}

export type SafeSolanaWalletState = SafeSvmWalletState;
export type SolanaConnectAttempt = SvmConnectAttempt;
export const DEFAULT_SOLANA_ENDPOINT = DEFAULT_SVM_ENDPOINT;
export const useSafeSolanaWallet = useSafeSvmWallet;
export const detectSolanaTransport = detectSvmTransport;
export const connectPreferredSolanaWallet = connectPreferredSvmWallet;
export const getSolanaCapabilitySnapshot = getSvmCapabilitySnapshot;
export const buildSolanaWalletDescriptors = buildSvmWalletDescriptors;
export const toSolanaWalletOption = toSvmWalletOption;
